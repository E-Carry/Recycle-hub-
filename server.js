const express = require('express');
const { syncOrderStatus, syncPickupStatus } = require('./sync.js');
const { cancelPickup, blocker } = require('./cancel.js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { roleOf, hashPw, checkPw, sign, verify, cookies } = require('./auth');
const { feed, unread, partnerKey } = require('./notes');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UIDS_FILE = path.join(DATA_DIR, 'uids.json');

const ADMIN_EMAIL = 'recycle.hub.pvt.ltd@gmail.com';
// ADMIN_PASSWORD in .env (re)sets the admin password; it is stored hashed.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// All persistent data lives in SQLite (db.js). Legacy JSON in data/ is imported once.
const store = require('./db').open(process.env.DB_FILE || path.join(DATA_DIR, 'recyclehub.db'), DATA_DIR);
const getUsers = store.users;
const saveUsers = store.saveUsers;
const getAdminData = store.admin;
const saveAdminData = store.saveAdmin;

// Ensure the permanent admin exists. ADMIN_PASSWORD in .env sets its password
// (stored hashed; only rehashed when the env value no longer matches).
const initPermanentAdmin = () => {
    const users = getUsers();
    let admin = users.find(u => u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!ADMIN_PASSWORD && !(admin && admin.password)) {
        console.error('ADMIN_PASSWORD is not set in .env and no admin password is stored. Refusing to start.');
        process.exit(1);
    }
    if (!admin) {
        admin = {
            id: 'USR-RH-ADMIN-01',
            uid: 'RH-ADMIN-SPECIAL-01',
            fullName: 'Recycle Hub Admin',
            email: ADMIN_EMAIL,
            registeredAt: new Date().toISOString(),
            termsAgreed: true,
            agreedAt: new Date().toISOString()
        };
        users.unshift(admin);
        console.log(`Permanent Admin initialized: ${ADMIN_EMAIL}`);
    }
    const c = ADMIN_PASSWORD ? checkPw(ADMIN_PASSWORD, admin.password) : { ok: true, legacy: false };
    if (!c.ok || c.legacy) admin.password = hashPw(ADMIN_PASSWORD);
    admin.type = 'admin';
    admin.isAdmin = true;
    admin.isVerified = true;
    saveUsers(users);
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
app.use(express.json());

// ── Sessions ─────────────────────────────────────────────────────────
// Cookie rh_s = HMAC-signed lowercased email (auth.js). Identity for every
// partner/admin API comes from here, never from the request body or query.
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
    console.warn('SESSION_SECRET not set in .env: using a random per-boot secret (logins end on restart).');
    return crypto.randomBytes(32).toString('hex');
})();
const HOME = { admin: '/admin-dashboard.html', sourcing: '/sourcing-dashboard.html', industrial: '/industrial-dashboard.html' };
const role = (u) => roleOf(u, ADMIN_EMAIL);

// Lookup by email, UID or partner code (codes are case/space-insensitive).
const findUser = (key) => {
    const k = String(key || '').trim();
    if (!k) return null;
    const lo = k.toLowerCase(), code = k.toUpperCase().replace(/\s+/g, '-');
    return getUsers().find((u) => (u.email && u.email.toLowerCase() === lo)
        || (u.uid && u.uid.toUpperCase() === code)
        || (u.partnerCode && u.partnerCode.toUpperCase() === code)) || null;
};
const byEmail = (email) => getUsers().find((u) => u.email && u.email.toLowerCase() === email) || null;
const updateUser = (email, fn) => {
    const users = getUsers();
    const u = users.find((x) => x.email && x.email.toLowerCase() === email.toLowerCase());
    if (!u) throw new Error(`updateUser: no user ${email}`);
    fn(u);
    saveUsers(users);
    return u;
};
// Client-safe view of a user: never the password hash.
const pub = (u) => {
    const { password, ...rest } = u;
    return { ...rest, type: role(u), isAdmin: role(u) === 'admin', partnerCode: u.partnerCode || u.uid };
};

// Sliding-window rate limiter shared by login, OTP and Rio.
const hits = new Map();
const over = (key, n, ms) => {
    const now = Date.now();
    const h = (hits.get(key) || []).filter((t) => now - t < ms);
    h.push(now);
    hits.set(key, h);
    if (hits.size > 5000) hits.clear();
    return h.length > n;
};

app.use((req, res, next) => {
    const email = verify(cookies(req.headers.cookie).rh_s, SESSION_SECRET);
    req.user = email ? byEmail(email) : null;
    next();
});

// Role guard. No roles = any logged-in account.
const need = (...roles) => (req, res, next) => {
    if (req.user && (!roles.length || roles.includes(role(req.user)))) return next();
    res.status(req.user ? 403 : 401).json({ error: req.user ? 'This account cannot access that.' : 'Please log in.' });
};

// Dashboard pages: logged out -> login, wrong role -> own dashboard.
// Compares the decoded path so %-encoded names cannot slip past to express.static.
app.use((req, res, next) => {
    let p;
    try { p = decodeURIComponent(req.path); } catch { return res.status(400).end(); }
    const r = Object.keys(HOME).find((k) => HOME[k] === p);
    if (!r) return next();
    if (!req.user) return res.redirect('/login.html');
    if (role(req.user) !== r) return res.redirect(HOME[role(req.user)]);
    res.set('Cache-Control', 'no-store');
    next();
});

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
app.post('/api/rio/chat', async (req, res) => {
    if (over('rio:' + req.ip, 15, 60000)) return res.status(429).json({ error: 'Too many requests' });
    const r = await rioLLM.chat(req.body);
    res.status(r.status).json(r.body);
});

// ── One-time codes ───────────────────────────────────────────────────
// Keys: 'u:<email>' sign-in code, 'r:<email>' registration email check.
// 10 minute expiry, 5 wrong guesses burn the code.
const otps = new Map();
// email -> expiry. Set by /verify-otp, consumed by /register.
const verifiedEmails = new Map();
const OTP_TTL = 10 * 60 * 1000;
const takeOtp = (key, code) => {
    const o = otps.get(key);
    if (!o || o.exp < Date.now() || o.tries >= 5) { otps.delete(key); return false; }
    if (o.code !== String(code).trim()) { o.tries++; return false; }
    otps.delete(key);
    return true;
};

const mailReady = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Fields a client may never set on its own account.
const PRIVILEGED = ['id', 'uid', 'partnerCode', 'type', 'isAdmin', 'isVerified', 'registeredAt', 'password', 'email'];

app.post('/register', (req, res) => {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const type = b.type || 'sourcing';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !b.password) {
        return res.status(400).json({ error: 'A valid email and a password are required.' });
    }
    if (String(b.password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!['sourcing', 'industrial'].includes(type)) {
        return res.status(400).json({ error: 'Account type must be sourcing or industrial.' });
    }
    // Industrial signup proves the email first (send-otp purpose register, then verify-otp).
    // With mail unconfigured no code can be sent, so skip; new accounts start unverified anyway.
    if (type === 'industrial' && mailReady && !((verifiedEmails.get(email) || 0) > Date.now())) {
        return res.status(400).json({ error: 'Verify your email with the 6-digit code first.' });
    }

    const users = getUsers();
    if (users.find(u => u.email && u.email.toLowerCase() === email)) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const extra = Object.fromEntries(Object.entries(b).filter(([k]) => !PRIVILEGED.includes(k)));
    const newUser = {
        ...extra,
        id: 'USR-' + Date.now(),
        uid: getNextUid(users),
        email,
        type,
        password: hashPw(b.password),
        isVerified: false,
        registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    verifiedEmails.delete(email);

    res.json({
        success: true,
        message: 'Registration successful',
        userId: newUser.id,
        uid: newUser.uid
    });
});

// Login with email / UID / partner code plus either password or an emailed code.
app.post('/login', (req, res) => {
    const { identifier, email, password, otp } = req.body || {};
    if (!String(identifier || email || '').trim()) {
        return res.status(400).json({ error: 'Enter your email or partner code.' });
    }
    if (over('login:' + req.ip, 20, 15 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
    }

    const user = findUser(identifier || email);
    const bad = (msg) => res.status(401).json({ error: msg || 'Incorrect ID or password. New here? Register first.' });
    if (!user || !user.email) return bad();

    const key = user.email.toLowerCase();
    if (otp) {
        if (!takeOtp('u:' + key, otp)) return bad('That code is wrong or has expired. Request a new one.');
    } else {
        const c = checkPw(password, user.password);
        if (!c.ok) return bad();
        if (c.legacy) updateUser(key, (u) => { u.password = hashPw(password); });
    }

    // "Remember me": persistent 30-day cookie. Otherwise a browser-session cookie
    // whose token still expires after 12h.
    const ttl = req.body.remember ? 30 * 24 * 3600 : 12 * 3600;
    res.cookie('rh_s', sign(key, SESSION_SECRET, ttl), {
        httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/',
        ...(req.body.remember ? { maxAge: ttl * 1000 } : {})
    });
    const r = role(user);
    res.json({
        success: true,
        message: `Welcome back, ${user.fullName || user.companyName || user.email}`,
        redirect: HOME[r].slice(1),
        user: pub(user)
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('rh_s', { path: '/' });
    res.redirect('/login.html');
});

app.get('/api/me', need(), (req, res) => res.json({ success: true, user: pub(req.user) }));

// Profile edits. Only these fields; identity, role and password go elsewhere.
const EDITABLE = ['fullName', 'mobile', 'companyName', 'designation'];
const PREFS = ['emailUpdates', 'weeklyDigest', 'priceAlerts'];
app.patch('/api/me', need(), (req, res) => {
    const b = req.body || {};
    const u = updateUser(req.user.email, (u) => {
        for (const k of EDITABLE) if (typeof b[k] === 'string') u[k] = b[k].trim().slice(0, 120);
        if (b.prefs && typeof b.prefs === 'object') {
            u.prefs = { ...(u.prefs || {}) };
            for (const k of PREFS) if (typeof b.prefs[k] === 'boolean') u.prefs[k] = b.prefs[k];
        }
    });
    res.json({ success: true, user: pub(u) });
});

// Wrong current password is 400, not 401: the client treats 401 as "session ended".
app.post('/api/me/password', need(), (req, res) => {
    const { current, next } = req.body || {};
    if (!checkPw(current, req.user.password).ok) return res.status(400).json({ error: 'Current password is incorrect.' });
    if (String(next || '').length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    updateUser(req.user.email, (u) => { u.password = hashPw(next); });
    res.json({ success: true, message: 'Password updated.' });
});

app.get('/api/notifications', need(), (req, res) => {
    const items = feed(req.user, role(req.user), getAdminData());
    res.json({ success: true, items, unread: unread(items, req.user.notifSeenAt) });
});
app.post('/api/notifications/read', need(), (req, res) => {
    updateUser(req.user.email, (u) => { u.notifSeenAt = new Date().toISOString(); });
    res.json({ success: true });
});

// Email a 6-digit code. purpose 'register' targets an address that has no
// account yet; otherwise the code signs in an existing account. The reply never
// reveals the code or whether the account exists.
app.post('/send-otp', async (req, res) => {
    const { email, identifier, uid, purpose } = req.body || {};
    if (!mailReady) {
        return res.status(503).json({ error: 'Email codes are unavailable right now. Please use your password.' });
    }
    if (over('otp:' + req.ip, 5, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many code requests. Wait a few minutes and try again.' });
    }

    let to, key;
    if (purpose === 'register') {
        to = String(email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: 'Enter a valid email address.' });
        key = 'r:' + to;
    } else {
        const user = findUser(identifier || email || uid);
        if (!user || !user.email) return res.json({ success: true, message: 'If that account exists, we emailed it a 6-digit code.' });
        to = user.email;
        key = 'u:' + to.toLowerCase();
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    otps.set(key, { code: otp, exp: Date.now() + OTP_TTL, tries: 0 });
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: 'Your Recycle Hub verification code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a;">
                    <h2 style="color: #059669;">Recycle Hub</h2>
                    <p>Your one-time code is:</p>
                    <h1 style="background: #f1f5f9; padding: 10px 16px; display: inline-block; border-radius: 8px; letter-spacing: 4px;">${otp}</h1>
                    <p>It expires in 10 minutes. If you did not request it, ignore this email.</p>
                </div>
            `
        });
    } catch (error) {
        otps.delete(key);
        console.error('Error sending OTP email:', error.message);
        return res.status(502).json({ error: 'Could not send the email. Please try again shortly.' });
    }
    res.json({ success: true, message: 'If that account exists, we emailed it a 6-digit code.' });
});

// Registration email check (pairs with send-otp purpose 'register').
app.post('/verify-otp', (req, res) => {
    const email = String((req.body || {}).email || '').trim().toLowerCase();
    const { otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ error: 'Email and code are required.' });
    if (!takeOtp('r:' + email, otp)) return res.status(400).json({ error: 'That code is wrong or has expired.' });
    verifiedEmails.set(email, Date.now() + 30 * 60 * 1000);
    res.json({ success: true, message: 'Email verified' });
});

// ── Route guards (before the route handlers below) ───────────────────
app.use('/api/admin', need('admin'));
app.use('/api/sourcing', need('sourcing'));
app.use('/api/industrial', need('industrial'));
app.use(['/api/store/inquire-buy', '/api/tracking'], need());

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
    syncOrderStatus(adminData.industrialOrders, del);

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
    syncPickupStatus(adminData.sourcingPickups, slot);

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
    const { materialId, weightKg, pickupDate, timeSlot, address, notes } = req.body;
    const partnerEmail = req.user.email;
    const partnerName = req.user.fullName;

    if (!materialId || !weightKg || !pickupDate || !timeSlot || !address) {
        return res.status(400).json({ error: 'All pickup details are required (materialId, weightKg, pickupDate, timeSlot, address).' });
    }
    if (!(parseFloat(weightKg) > 0)) {
        return res.status(400).json({ error: 'Weight must be a positive number of kg.' });
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
    const email = req.user.email.toLowerCase();
    const pickups = (getAdminData().sourcingPickups || [])
        .filter(p => p.partnerEmail && p.partnerEmail.toLowerCase() === email)
        .map(p => ({ ...p, cancellable: !blocker(p) }));

    res.json({
        success: true,
        pickups: pickups
    });
});

// POST Cancel a pickup (free until 2h before the slot, see cancel.js)
app.post('/api/sourcing/pickups/:id/cancel', (req, res) => {
    const adminData = getAdminData();
    const r = cancelPickup(adminData, req.params.id, req.user.email);
    if (r.error) return res.status(r.code).json({ error: r.error });
    saveAdminData(adminData);
    res.json({ success: true, message: 'Pickup cancelled. No fee applies.', pickup: r.pickup });
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
    const { materialId, quantityTons, deliveryDestination, shippingMode } = req.body;
    const partnerUid = partnerKey(req.user);
    const companyName = req.user.companyName || req.user.fullName;
    const contactEmail = req.user.email;

    if (!materialId || !quantityTons || !deliveryDestination) {
        return res.status(400).json({ error: 'Order details missing: materialId, quantityTons, and deliveryDestination are required.' });
    }
    if (!(parseFloat(quantityTons) > 0)) {
        return res.status(400).json({ error: 'Quantity must be a positive number of tons.' });
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
        partnerUid,
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
    const adminData = getAdminData();
    const me = partnerKey(req.user);
    const orders = (adminData.industrialOrders || []).filter(o => String(o.partnerUid).toUpperCase() === me);

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
    const { itemId } = req.body;
    const buyerRole = role(req.user);
    const buyerEmail = req.user.email;

    if (!itemId) return res.status(400).json({ error: 'Item ID is required.' });

    const adminData = getAdminData();
    const items = adminData.secondHandStore || [];
    const item = items.find(i => i.id === itemId);

    if (!item) return res.status(404).json({ error: 'Store item not found.' });

    if (!(item.stock > 0)) return res.status(409).json({ error: 'This item is sold out.' });
    item.stock -= 1;

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
