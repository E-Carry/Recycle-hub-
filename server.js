const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UIDS_FILE = path.join(DATA_DIR, 'uids.json');
const ADMIN_DATA_FILE = path.join(DATA_DIR, 'admin-data.json');

const ADMIN_EMAIL = 'recycle.hub.pvt.ltd@gmail.com';
// Set ADMIN_PASSWORD in .env for any deployment; the fallback is the public demo password.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const getUsers = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading users.json:', err);
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const getAdminData = () => {
    try {
        if (!fs.existsSync(ADMIN_DATA_FILE)) return {};
        const data = fs.readFileSync(ADMIN_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading admin-data.json:', err);
        return {};
    }
};

const saveAdminData = (data) => {
    fs.writeFileSync(ADMIN_DATA_FILE, JSON.stringify(data, null, 2));
};

// Ensure permanent Admin exists in users.json
const initPermanentAdmin = () => {
    const users = getUsers();
    let admin = users.find(u => u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!admin) {
        admin = {
            id: 'USR-RH-ADMIN-01',
            uid: 'RH-ADMIN-SPECIAL-01',
            fullName: 'Recycle Hub Admin',
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            type: 'admin',
            isAdmin: true,
            isVerified: true,
            registeredAt: new Date().toISOString(),
            termsAgreed: true,
            agreedAt: new Date().toISOString()
        };
        users.unshift(admin);
        saveUsers(users);
        console.log(`Permanent Admin initialized: ${ADMIN_EMAIL}`);
    } else {
        // Ensure credentials and role are always synced
        admin.password = ADMIN_PASSWORD;
        admin.type = 'admin';
        admin.isAdmin = true;
        admin.isVerified = true;
        saveUsers(users);
    }
};

initPermanentAdmin();

const getNextUid = (users) => {
    let pool = [];
    try {
        if (fs.existsSync(UIDS_FILE)) {
            pool = JSON.parse(fs.readFileSync(UIDS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Error reading uids.json:', err);
    }
    const assignedUids = new Set(users.map(u => u.uid).filter(Boolean));
    for (const uid of pool) {
        if (!assignedUids.has(uid)) {
            return uid;
        }
    }
    // Dynamic generator if pre-generated UIDs run out
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let p1 = '', p2 = '';
    for (let i = 0; i < 4; i++) {
        p1 += chars.charAt(Math.floor(Math.random() * chars.length));
        p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `RHI-26-${p1}-${p2}`;
};

const app = express();
app.use(cors());
app.use(express.json());

// Serve static client assets from public/ ("/" -> public/index.html, the landing page)
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// Aliases for css and js backwards compatibility
app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));
// Fallback so root requests for design-system.css or particles.js resolve cleanly
app.use(express.static(path.join(PUBLIC_DIR, 'css')));
app.use(express.static(path.join(PUBLIC_DIR, 'js')));

// Rio AI LLM replies (OpenRouter). Public endpoint spending the site's key,
// so cap each IP at 15 requests/minute.
const rioLLM = require('./rio-llm');
const rioHits = new Map();
app.post('/api/rio/chat', async (req, res) => {
    const now = Date.now();
    const hits = (rioHits.get(req.ip) || []).filter((t) => now - t < 60000);
    if (hits.length >= 15) return res.status(429).json({ error: 'Too many requests' });
    hits.push(now);
    rioHits.set(req.ip, hits);
    if (rioHits.size > 5000) rioHits.clear();
    const r = await rioLLM.chat(req.body);
    res.status(r.status).json(r.body);
});

// In-memory store for OTPs
const otpStore = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = getUsers();
    if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Allocate UID
    const assignedUid = getNextUid(users);

    const newUser = {
        id: 'USR-' + Date.now(),
        uid: assignedUid,
        registeredAt: new Date().toISOString(),
        isVerified: false,
        type: req.body.type || 'sourcing',
        ...req.body
    };

    users.push(newUser);
    saveUsers(users);

    res.json({ 
        success: true, 
        message: 'Registration successful', 
        userId: newUser.id,
        uid: newUser.uid 
    });
});

// Login via Email (Sourcing Partner), Industrial Unique Partner Code, or Admin
app.post('/login', (req, res) => {
    const { email, password, identifier, otp } = req.body;
    const loginKey = (identifier || email || '').trim();

    if (!loginKey) {
        return res.status(400).json({ error: 'Email or Industrial Partner UID/Code is required' });
    }

    // 1. Direct check for Permanent Admin Login
    if (loginKey.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        if (otp) {
            if (otp === '123456' || otpStore[ADMIN_EMAIL] === otp) {
                delete otpStore[ADMIN_EMAIL];
                return res.json({
                    success: true,
                    message: 'Admin login successful via OTP',
                    redirect: 'admin-dashboard.html',
                    user: {
                        fullName: 'Recycle Hub Admin',
                        email: ADMIN_EMAIL,
                        uid: 'RH-ADMIN-SPECIAL-01',
                        type: 'admin',
                        isAdmin: true
                    }
                });
            } else {
                return res.status(400).json({ error: 'Invalid or expired OTP code' });
            }
        }

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid Admin password. Please check your credentials.' });
        }

        return res.json({
            success: true,
            message: 'Admin login successful',
            redirect: 'admin-dashboard.html',
            user: {
                fullName: 'Recycle Hub Admin',
                email: ADMIN_EMAIL,
                uid: 'RH-ADMIN-SPECIAL-01',
                type: 'admin',
                isAdmin: true
            }
        });
    }

    const users = getUsers();

    // 2. SOURCING PARTNER LOGIN: Any Email ID
    if (loginKey.includes('@')) {
        let user = users.find(u => u.email && u.email.toLowerCase() === loginKey.toLowerCase());
        if (!user) {
            // Auto-provision new Sourcing Partner
            const rawPrefix = loginKey.split('@')[0].replace(/[\._-]/g, ' ');
            const formattedName = rawPrefix.replace(/\b\w/g, l => l.toUpperCase()) || 'Sourcing Partner';
            user = {
                id: 'USR-' + Date.now(),
                uid: 'SRC-' + Math.floor(1000 + Math.random() * 9000),
                fullName: formattedName,
                email: loginKey.toLowerCase(),
                type: 'sourcing',
                password: password || 'demo123',
                isVerified: true,
                registeredAt: new Date().toISOString(),
                termsAgreed: true,
                agreedAt: new Date().toISOString()
            };
            users.push(user);
            saveUsers(users);
        }

        return res.json({
            success: true,
            message: `Welcome, ${user.fullName}! Logged in as Sourcing Partner`,
            redirect: 'sourcing-dashboard.html',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                uid: user.uid,
                type: 'sourcing',
                isAdmin: false
            }
        });
    }

    // 3. INDUSTRIAL PARTNER LOGIN: Any Unique Code + any password
    const cleanCode = loginKey.toUpperCase().replace(/\s+/g, '-');
    let user = users.find(u => 
        (u.uid && u.uid.toUpperCase() === cleanCode) ||
        (u.partnerCode && u.partnerCode.toUpperCase() === cleanCode)
    );

    if (!user) {
        // Auto-provision new Industrial Partner with unique code
        user = {
            id: 'USR-' + Date.now(),
            uid: cleanCode,
            partnerCode: cleanCode,
            fullName: `Industrial Partner [${cleanCode}]`,
            companyName: `Apex Industrial Plant (${cleanCode})`,
            email: `partner.${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@recyclehub-industry.com`,
            type: 'industrial',
            password: password || 'demo123',
            isVerified: true,
            registeredAt: new Date().toISOString(),
            termsAgreed: true,
            agreedAt: new Date().toISOString()
        };
        users.push(user);
        saveUsers(users);
    }

    return res.json({
        success: true,
        message: `Industrial partner verified code [${cleanCode}]. Access granted.`,
        redirect: 'industrial-dashboard.html',
        user: {
            id: user.id,
            fullName: user.fullName,
            companyName: user.companyName || user.fullName,
            email: user.email,
            uid: user.uid,
            partnerCode: user.partnerCode || user.uid,
            type: 'industrial',
            isAdmin: false
        }
    });
});

app.post('/send-otp', async (req, res) => {
    const { email, identifier, uid } = req.body;
    const searchKey = (identifier || email || uid || '').trim();

    if (!searchKey) {
        return res.status(400).json({ error: 'Email or Industrial UID is required' });
    }

    const users = getUsers();
    const user = users.find(u => 
        (u.email && u.email.toLowerCase() === searchKey.toLowerCase()) || 
        (u.uid && u.uid.toUpperCase() === searchKey.toUpperCase())
    );

    const targetEmail = user ? user.email : (searchKey.includes('@') ? searchKey : null);
    
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[searchKey] = otp;
    if (user && user.email) otpStore[user.email] = otp;
    if (user && user.uid) otpStore[user.uid] = otp;
    if (searchKey.toLowerCase() === ADMIN_EMAIL.toLowerCase()) otpStore[ADMIN_EMAIL] = otp;

    if (targetEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: targetEmail,
            subject: 'Recycle-Hub Login OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #22d3ee;">Recycle-Hub Login Authentication</h2>
                    <p>Hello,</p>
                    <p>Your One-Time Password (OTP) for login is:</p>
                    <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">${otp}</h1>
                    <p>Please enter this code on the login page to proceed.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${targetEmail}`);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }

    // Setup simple expiration (10 mins)
    setTimeout(() => {
        delete otpStore[searchKey];
    }, 10 * 60 * 1000);

    res.json({ 
        success: true, 
        message: `OTP sent successfully. Demo Code: 123456 or ${otp}`, 
        demoOtp: '123456' 
    });
});

app.post('/verify-otp', (req, res) => {
    const { email, identifier, otp } = req.body;
    const key = (identifier || email || '').trim();

    if (!key || !otp) {
        return res.status(400).json({ error: 'Identifier and OTP are required' });
    }

    if (otp === '123456' || (otpStore[key] && otpStore[key] === otp)) {
        delete otpStore[key];
        res.json({ success: true, message: 'OTP verified successfully' });
    } else {
        res.status(400).json({ error: 'Invalid or expired OTP' });
    }
});

// ═════════════════════════════════════════════════════════════════════
// ADMIN WORKSPACE & DEVELOPER API ENDPOINTS
// ═════════════════════════════════════════════════════════════════════

// GET all Admin workspace data
app.get('/api/admin/data', (req, res) => {
    const adminData = getAdminData();
    const users = getUsers();

    // Map users with online status and verification details
    const mappedUsers = users.map(u => ({
        id: u.id || u.uid || 'USR-' + Math.random().toString(36).substr(2, 6),
        fullName: u.fullName || u.companyName || 'Anonymous Partner',
        email: u.email,
        uid: u.uid || 'N/A',
        type: u.type || 'sourcing',
        isVerified: u.isVerified !== undefined ? u.isVerified : (u.email === ADMIN_EMAIL || Boolean(u.termsAgreed)),
        registeredAt: u.registeredAt || u.agreedAt || '2026-08-01T00:00:00.000Z',
        activityStatus: u.email === ADMIN_EMAIL ? 'Active Now (Admin)' : (Math.random() > 0.4 ? 'Online' : 'Offline')
    }));

    res.json({
        success: true,
        data: {
            ...adminData,
            users: mappedUsers,
            adminEmail: ADMIN_EMAIL
        }
    });
});

// POST Store Item Update (Edit Price, Image, Stock) + Save Audit Log
app.post('/api/admin/store/update', (req, res) => {
    const { productId, name, pricePerTon, stockTons, image, description } = req.body;
    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    const adminData = getAdminData();
    const products = adminData.store || [];
    const prod = products.find(p => p.id === productId);

    if (!prod) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const oldPrice = `$${prod.pricePerTon}/ton`;
    const newPriceVal = parseFloat(pricePerTon) || prod.pricePerTon;
    const newPriceStr = `$${newPriceVal}/ton`;

    // Create Audit Log
    const newAuditLog = {
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        adminEmail: ADMIN_EMAIL,
        action: 'PRICE_AND_STOCK_UPDATE',
        productId: prod.id,
        productName: name || prod.name,
        oldPrice: oldPrice,
        newPrice: newPriceStr,
        details: `Price modified from ${oldPrice} to ${newPriceStr}. Stock set to ${stockTons || prod.stockTons} tons.`
    };

    // Update Product properties
    if (name) prod.name = name;
    prod.pricePerTon = newPriceVal;
    if (stockTons !== undefined) prod.stockTons = parseFloat(stockTons);
    if (image) prod.image = image;
    if (description) prod.description = description;
    prod.updatedAt = new Date().toISOString();

    if (!adminData.auditLogs) adminData.auditLogs = [];
    adminData.auditLogs.unshift(newAuditLog);

    saveAdminData(adminData);

    res.json({
        success: true,
        message: 'Product updated successfully & Audit Log generated',
        product: prod,
        auditLog: newAuditLog
    });
});

// POST Account Verification Toggle
app.post('/api/admin/users/verify', (req, res) => {
    const { email, isVerified } = req.body;
    if (!email) return res.status(400).json({ error: 'User email is required' });

    const users = getUsers();
    const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isVerified = Boolean(isVerified);
    saveUsers(users);

    res.json({
        success: true,
        message: `Account verification status updated for ${email}`,
        user: { email: user.email, isVerified: user.isVerified }
    });
});

// POST AI Codes Gen-X Generator
app.post('/api/admin/ai-genx', (req, res) => {
    const { title, language, prompt } = req.body;
    const adminData = getAdminData();
    if (!adminData.aiGenXCodes) adminData.aiGenXCodes = [];

    const newGenCode = {
        id: 'GEN-' + (adminData.aiGenXCodes.length + 1).toString().padStart(2, '0'),
        title: title || 'Custom AI Generated Recycling Rule',
        language: language || 'python',
        code: `# AI Gen-X Rule generated for prompt: "${prompt || 'System Auto-rule'}"\ndef process_recycle_rule(payload):\n    # Auto-generated logic by Recycle Hub AI Gen-X\n    if payload.get('purity', 0) > 0.90:\n        return {'status': 'APPROVED', 'tariff_discount': 0.05}\n    return {'status': 'REQUIRES_INSPECTION', 'tariff_discount': 0.00}`,
        generatedAt: new Date().toISOString()
    };

    adminData.aiGenXCodes.unshift(newGenCode);
    saveAdminData(adminData);

    res.json({
        success: true,
        message: 'AI Gen-X Code created successfully',
        genCode: newGenCode
    });
});

// POST Update Delivery / Resolve AI Error
app.post('/api/admin/deliveries/update', (req, res) => {
    const { deliveryId, status, resolveAiError } = req.body;
    const adminData = getAdminData();
    const deliveries = adminData.deliveries || [];
    const del = deliveries.find(d => d.id === deliveryId);

    if (!del) return res.status(404).json({ error: 'Delivery not found' });

    if (status) del.status = status;
    if (resolveAiError) {
        del.isAiFlagged = false;
        del.status = 'In Transit (AI Resolved)';
        if (del.aiErrorDetails) del.aiErrorDetails.resolvedAt = new Date().toISOString();
    }

    saveAdminData(adminData);

    res.json({
        success: true,
        message: 'Delivery record updated',
        delivery: del
    });
});

// POST Update Pickup Slot
app.post('/api/admin/slots/update', (req, res) => {
    const { slotId, status, assignedTransport } = req.body;
    const adminData = getAdminData();
    const slots = adminData.pickupSlots || [];
    const slot = slots.find(s => s.id === slotId);

    if (!slot) return res.status(404).json({ error: 'Pickup slot not found' });

    if (status) slot.status = status;
    if (assignedTransport) slot.assignedTransport = assignedTransport;

    saveAdminData(adminData);

    res.json({
        success: true,
        message: 'Slot booking updated',
        slot: slot
    });
});

// ═════════════════════════════════════════════════════════════════════
// SOURCING PARTNER API ENDPOINTS
// ═════════════════════════════════════════════════════════════════════

// GET live raw material prices & default benchmarks
app.get('/api/raw-materials/prices', (req, res) => {
    const adminData = getAdminData();
    res.json({
        success: true,
        prices: adminData.rawMaterialPrices || []
    });
});

// POST Schedule pickup for Sourcing Partner
app.post('/api/sourcing/schedule-pickup', (req, res) => {
    const { partnerEmail, partnerName, materialId, weightKg, pickupDate, timeSlot, address, notes } = req.body;

    if (!partnerEmail || !materialId || !weightKg || !pickupDate || !timeSlot || !address) {
        return res.status(400).json({ error: 'All pickup details are required (partnerEmail, materialId, weightKg, pickupDate, timeSlot, address).' });
    }

    const adminData = getAdminData();
    const prices = adminData.rawMaterialPrices || [];
    const material = prices.find(p => p.id === materialId || p.code === materialId);

    const weightNum = parseFloat(weightKg);
    const ratePerKg = material ? material.pricePerKg : 0.50;
    const payoutGross = parseFloat((weightNum * ratePerKg).toFixed(2));
    const gstRate = material ? material.gstRate : 18;
    const cgst = parseFloat(((payoutGross * (gstRate / 2)) / 100).toFixed(2));
    const sgst = parseFloat(((payoutGross * (gstRate / 2)) / 100).toFixed(2));
    const netPayout = parseFloat((payoutGross + cgst + sgst).toFixed(2));

    // Select available transport vehicle
    const transports = adminData.transports || [];
    const availableEV = transports.find(t => t.status.includes('Available')) || transports[0] || {
        id: 'RHT-01',
        name: 'EV Heavy Loader Alpha',
        driverName: 'Rajesh Kumar'
    };

    const pickupId = 'PKP-2026-' + Math.floor(1000 + Math.random() * 9000);
    const billNumber = 'GST-RH-2026-SRC-' + Math.floor(10000 + Math.random() * 90000);

    const newPickup = {
        id: pickupId,
        partnerEmail: partnerEmail.trim().toLowerCase(),
        partnerName: partnerName || 'Eco Sourcing Partner',
        materialId: material ? material.id : materialId,
        materialName: material ? material.name : 'Classified Scrap Material',
        weightKg: weightNum,
        ratePerKg: ratePerKg,
        payoutGross: payoutGross,
        gstRate: gstRate,
        cgst: cgst,
        sgst: sgst,
        igst: 0.00,
        netPayout: netPayout,
        billNumber: billNumber,
        pickupDate: pickupDate,
        timeSlot: timeSlot,
        address: address,
        notes: notes || '',
        status: 'Vehicle Dispatched',
        assignedTransport: availableEV.id,
        driverName: availableEV.driverName || 'Pritam Ghosh',
        driverPhone: '+91 98300 ' + Math.floor(10000 + Math.random() * 90000),
        etaMinutes: Math.floor(12 + Math.random() * 15),
        distanceKm: parseFloat((2.5 + Math.random() * 4).toFixed(1)),
        evBattery: availableEV.batteryFuel || 84,
        createdAt: new Date().toISOString()
    };

    if (!adminData.sourcingPickups) adminData.sourcingPickups = [];
    adminData.sourcingPickups.unshift(newPickup);

    // Also mirror to admin pickupSlots so Admin sees it immediately
    if (!adminData.pickupSlots) adminData.pickupSlots = [];
    adminData.pickupSlots.unshift({
        id: 'SLT-' + Math.floor(800 + Math.random() * 200),
        partnerName: newPickup.partnerName,
        partnerEmail: newPickup.partnerEmail,
        date: newPickup.pickupDate,
        timeSlot: newPickup.timeSlot,
        materialType: newPickup.materialName,
        estimatedWeightKg: newPickup.weightKg,
        address: newPickup.address,
        status: 'Vehicle Dispatched',
        assignedTransport: newPickup.assignedTransport,
        billNumber: newPickup.billNumber
    });

    // Mirror to audit logs
    if (!adminData.auditLogs) adminData.auditLogs = [];
    adminData.auditLogs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        adminEmail: 'system.event@recyclehub.in',
        action: 'SOURCING_PICKUP_SCHEDULED',
        productId: newPickup.materialId,
        productName: newPickup.materialName,
        oldPrice: 'N/A',
        newPrice: `$${newPickup.netPayout} (GST Bill #${newPickup.billNumber})`,
        details: `Sourcing Partner ${newPickup.partnerEmail} scheduled ${newPickup.weightKg} kg of ${newPickup.materialName}. Assigned EV ${newPickup.assignedTransport}.`
    });

    saveAdminData(adminData);

    res.json({
        success: true,
        message: 'Pickup scheduled successfully! Vehicle dispatched & GST Bill generated.',
        pickup: newPickup
    });
});

// GET Sourcing Pickups & GST Bills
app.get('/api/sourcing/pickups', (req, res) => {
    const { email } = req.query;
    const adminData = getAdminData();
    let pickups = adminData.sourcingPickups || [];

    if (email) {
        const userPickups = pickups.filter(p => p.partnerEmail && p.partnerEmail.toLowerCase() === email.trim().toLowerCase());
        if (userPickups.length > 0) {
            pickups = userPickups;
        } else {
            // Auto-populate with demo pickups customized for the partner so the dashboard is immediately rich with data
            const partnerName = email.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' (Sourcing Hub)';
            pickups = pickups.map(p => ({
                ...p,
                partnerEmail: email.trim(),
                partnerName: partnerName
            }));
        }
    }

    res.json({
        success: true,
        pickups: pickups
    });
});

// GET Live EV Tracking Telemetry
app.get('/api/tracking/:vehicleId', (req, res) => {
    const { vehicleId } = req.params;
    const adminData = getAdminData();
    const transports = adminData.transports || [];
    const vehicle = transports.find(t => t.id.toLowerCase() === vehicleId.toLowerCase()) || transports[0];

    // Calculate dynamic telemetry
    const now = Date.now();
    const progress = (Math.sin(now / 5000) + 1) / 2; // 0 to 1 smooth oscillation
    const remainingKm = parseFloat((5.5 * (1 - progress * 0.7)).toFixed(1));
    const etaMins = Math.max(1, Math.round(remainingKm * 3.2));
    const currentSpeed = Math.round(38 + Math.sin(now / 2000) * 8);

    res.json({
        success: true,
        telemetry: {
            vehicleId: vehicle ? vehicle.id : vehicleId,
            vehicleName: vehicle ? vehicle.name : 'CyberHauler EV-03',
            type: vehicle ? vehicle.type : 'Electric Cargo Hauler',
            driverName: vehicle ? vehicle.driverName : 'Rajesh Kumar',
            driverPhone: '+91 98300 44211',
            status: 'En Route to Partner Location',
            batteryLevel: Math.max(20, Math.round(85 - progress * 6)),
            speedKmH: currentSpeed,
            distanceRemainingKm: remainingKm,
            etaMinutes: etaMins,
            coordinates: {
                lat: 22.5726 + (progress * 0.02),
                lng: 88.3639 + (progress * 0.015)
            },
            currentCheckpoint: progress < 0.25 ? 'Dispatched from Hub Depot' : (progress < 0.6 ? 'NH Checkpoint Weighbridge' : (progress < 0.85 ? 'Approaching Partner Sector Gate' : 'Arrived at Loading Dock')),
            waypoints: [
                { name: 'Central Depot Yard 4', completed: true, time: '09:15 AM' },
                { name: 'Weighbridge Automated Scan', completed: progress > 0.35, time: '09:28 AM' },
                { name: 'Highway Transit Sector 3', completed: progress > 0.65, time: '09:42 AM' },
                { name: 'Partner Gate & Dock Entry', completed: progress > 0.9, time: 'Expected ~09:55 AM' }
            ]
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// INDUSTRIAL PARTNER API ENDPOINTS
// ═════════════════════════════════════════════════════════════════════

// GET Industrial Raw Material Catalog
app.get('/api/industrial/inventory', (req, res) => {
    const adminData = getAdminData();
    res.json({
        success: true,
        inventory: adminData.store || []
    });
});

// POST Place Industrial Purchase Order & Generate GST Tax Invoice
app.post('/api/industrial/order', (req, res) => {
    const { partnerUid, companyName, contactEmail, materialId, quantityTons, deliveryDestination, shippingMode } = req.body;

    if (!partnerUid || !materialId || !quantityTons || !deliveryDestination) {
        return res.status(400).json({ error: 'Order details missing: partnerUid, materialId, quantityTons, and deliveryDestination are required.' });
    }

    const adminData = getAdminData();
    const inventory = adminData.store || [];
    const product = inventory.find(p => p.id === materialId);

    if (!product) {
        return res.status(404).json({ error: 'Specified raw material product not found in active inventory.' });
    }

    const qty = parseFloat(quantityTons);
    if (product.stockTons < qty) {
        return res.status(400).json({ error: `Insufficient stock. Requested ${qty} tons but only ${product.stockTons} tons available.` });
    }

    // Deduct stock in real-time
    product.stockTons = parseFloat((product.stockTons - qty).toFixed(1));
    product.updatedAt = new Date().toISOString();

    const ratePerTon = product.pricePerTon;
    const subtotal = parseFloat((qty * ratePerTon).toFixed(2));
    const gstRate = 18;
    const cgst = parseFloat(((subtotal * (gstRate / 2)) / 100).toFixed(2));
    const sgst = parseFloat(((subtotal * (gstRate / 2)) / 100).toFixed(2));
    const freightCharge = shippingMode === 'self' ? 0.00 : parseFloat((180 + (qty * 12)).toFixed(2));
    const totalAmount = parseFloat((subtotal + cgst + sgst + freightCharge).toFixed(2));

    const orderId = 'ORD-IND-2026-' + Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = 'TAX-RH-2026-IND-' + Math.floor(10000 + Math.random() * 90000);

    const transports = adminData.transports || [];
    const assignedEV = transports[Math.floor(Math.random() * transports.length)] || { id: 'RHT-01', name: 'EV Heavy Loader' };

    const newOrder = {
        id: orderId,
        partnerUid: partnerUid.toUpperCase(),
        companyName: companyName || `Industrial Partner [${partnerUid}]`,
        contactEmail: contactEmail || 'procurement@industrial-partner.com',
        materialId: product.id,
        materialName: product.name,
        category: product.category,
        quantityTons: qty,
        ratePerTon: ratePerTon,
        subtotal: subtotal,
        gstRate: gstRate,
        cgst: cgst,
        sgst: sgst,
        igst: 0.00,
        freightCharge: freightCharge,
        totalAmount: totalAmount,
        invoiceNumber: invoiceNumber,
        paymentStatus: 'Paid (Escrow Secured)',
        deliveryStatus: 'Order Confirmed - Queue for Dispatch',
        assignedTransport: assignedEV.id,
        shippingMode: shippingMode || 'EV Heavy Loader Dedicated Freight',
        dispatchOrigin: 'Haldia Scrap Hub Yard 2',
        deliveryDestination: deliveryDestination,
        orderedAt: new Date().toISOString(),
        hsnCode: product.category === 'Metals' ? '72044900' : (product.category === 'Plastics' ? '39159042' : '85492100')
    };

    if (!adminData.industrialOrders) adminData.industrialOrders = [];
    adminData.industrialOrders.unshift(newOrder);

    // Record in transactions ledger
    if (!adminData.transactions) adminData.transactions = [];
    adminData.transactions.unshift({
        id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
        orderId: newOrder.id,
        customer: newOrder.companyName,
        email: newOrder.contactEmail,
        material: newOrder.materialName,
        quantityTons: newOrder.quantityTons,
        amount: newOrder.totalAmount,
        currency: 'USD',
        status: 'Paid',
        paymentMethod: 'Recycle-Hub Escrow Credit Line',
        timestamp: new Date().toISOString()
    });

    // Record in deliveries
    if (!adminData.deliveries) adminData.deliveries = [];
    adminData.deliveries.unshift({
        id: 'DEL-' + Math.floor(500 + Math.random() * 400),
        orderId: newOrder.id,
        transportId: assignedEV.id,
        driver: assignedEV.driverName || 'Rajesh Kumar',
        origin: newOrder.dispatchOrigin,
        destination: newOrder.deliveryDestination,
        eta: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        status: 'Preparing for Loading',
        weightKg: Math.round(newOrder.quantityTons * 1000),
        isAiFlagged: false
    });

    // Record in audit logs for Admin
    if (!adminData.auditLogs) adminData.auditLogs = [];
    adminData.auditLogs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        adminEmail: 'system.orders@recyclehub.in',
        action: 'INDUSTRIAL_ORDER_PLACED',
        productId: product.id,
        productName: product.name,
        oldPrice: 'Stock: ' + (product.stockTons + qty) + 'T',
        newPrice: 'Stock: ' + product.stockTons + 'T',
        details: `Industrial partner ${newOrder.companyName} ordered ${qty}T of ${product.name}. Total: $${totalAmount} (Invoice #${invoiceNumber}).`
    });

    saveAdminData(adminData);

    res.json({
        success: true,
        message: 'Industrial purchase order confirmed! Inventory updated and GST Tax Invoice generated.',
        order: newOrder,
        remainingStockTons: product.stockTons
    });
});

// GET Industrial Orders & Invoices
app.get('/api/industrial/orders', (req, res) => {
    const { partnerUid } = req.query;
    const adminData = getAdminData();
    let orders = adminData.industrialOrders || [];

    if (partnerUid) {
        orders = orders.filter(o => o.partnerUid.toUpperCase() === partnerUid.trim().toUpperCase());
    }

    res.json({
        success: true,
        orders: orders
    });
});

// ═════════════════════════════════════════════════════════════════════
// RECYCLE HUB STORE (SECOND-HAND & REFURBISHED GOODS)
// ═════════════════════════════════════════════════════════════════════

// GET Store products (Books, Electronics, Furniture, Equipment)
app.get('/api/store/items', (req, res) => {
    const { category, search } = req.query;
    const adminData = getAdminData();
    let items = adminData.secondHandStore || [];

    if (category && category !== 'all') {
        items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
        const q = search.toLowerCase();
        items = items.filter(i => 
            i.title.toLowerCase().includes(q) || 
            i.description.toLowerCase().includes(q) || 
            i.categoryLabel.toLowerCase().includes(q)
        );
    }

    res.json({
        success: true,
        items: items
    });
});

// POST Inquire or Instant Buy Second-Hand Item
app.post('/api/store/inquire-buy', (req, res) => {
    const { itemId, buyerRole, buyerEmail, buyerName, deliveryAddress, notes } = req.body;

    if (!itemId) return res.status(400).json({ error: 'Item ID is required.' });

    const adminData = getAdminData();
    const items = adminData.secondHandStore || [];
    const item = items.find(i => i.id === itemId);

    if (!item) return res.status(404).json({ error: 'Store item not found.' });

    // Decrement stock if available
    if (item.stock > 0) {
        item.stock -= 1;
    }

    const receiptId = 'STORE-TXN-' + Math.floor(1000 + Math.random() * 9000);

    // Audit log
    if (!adminData.auditLogs) adminData.auditLogs = [];
    adminData.auditLogs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        adminEmail: 'store.bot@recyclehub.in',
        action: 'CIRCULAR_STORE_PURCHASE',
        productId: item.id,
        productName: item.title,
        oldPrice: `$${item.originalPrice}`,
        newPrice: `$${item.price}`,
        details: `${buyerRole || 'Partner'} (${buyerEmail || 'Anonymous'}) purchased/reserved "${item.title}". Circular CO2 saved: ${item.co2SavedKg}kg.`
    });

    saveAdminData(adminData);

    res.json({
        success: true,
        message: `Order reserved successfully for ${item.title}! Confirmation code: ${receiptId}`,
        receiptId: receiptId,
        item: item
    });
});

// ═════════════════════════════════════════════════════════════════════
// ADMIN REAL-TIME SYNC & MONITORING API
// ═════════════════════════════════════════════════════════════════════

// GET live aggregated activity stream for Admin Dashboard
app.get('/api/admin/live-activities', (req, res) => {
    const adminData = getAdminData();
    const pickups = adminData.sourcingPickups || [];
    const orders = adminData.industrialOrders || [];
    const auditLogs = adminData.auditLogs || [];
    const transports = adminData.transports || [];

    res.json({
        success: true,
        summary: {
            totalPickups: pickups.length,
            totalOrders: orders.length,
            activeFleet: transports.filter(t => t.status.includes('Transit') || t.status.includes('Available')).length,
            rawMaterialTypes: (adminData.rawMaterialPrices || []).length,
            secondHandStock: (adminData.secondHandStore || []).reduce((acc, i) => acc + i.stock, 0)
        },
        recentPickups: pickups.slice(0, 10),
        recentOrders: orders.slice(0, 10),
        auditLogs: auditLogs.slice(0, 15),
        fleet: transports
    });
});

// POST Admin update raw material standard price
app.post('/api/admin/update-raw-material-price', (req, res) => {
    const { materialId, pricePerKg, pricePerTon } = req.body;
    if (!materialId) return res.status(400).json({ error: 'Material ID is required.' });

    const adminData = getAdminData();
    const prices = adminData.rawMaterialPrices || [];
    const mat = prices.find(p => p.id === materialId || p.code === materialId);

    if (!mat) return res.status(404).json({ error: 'Raw material price entry not found.' });

    const oldPriceKg = mat.pricePerKg;
    if (pricePerKg !== undefined) mat.pricePerKg = parseFloat(pricePerKg);
    if (pricePerTon !== undefined) mat.pricePerTon = parseFloat(pricePerTon);
    else if (pricePerKg !== undefined) mat.pricePerTon = parseFloat((mat.pricePerKg * 1000).toFixed(0));

    // Audit log
    if (!adminData.auditLogs) adminData.auditLogs = [];
    adminData.auditLogs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        adminEmail: ADMIN_EMAIL,
        action: 'PRICE_CHANGE',
        productId: mat.id,
        productName: mat.name,
        oldPrice: `$${oldPriceKg}/kg`,
        newPrice: `$${mat.pricePerKg}/kg ($${mat.pricePerTon}/ton)`,
        details: `Default procurement benchmark updated for ${mat.name}. Sourcing & Industrial dashboards refreshed.`
    });

    saveAdminData(adminData);

    res.json({
        success: true,
        message: `Price updated for ${mat.name}. New price: $${mat.pricePerKg}/kg ($${mat.pricePerTon}/ton)`,
        material: mat
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin Permanent Access Email: ${ADMIN_EMAIL}`);
});
