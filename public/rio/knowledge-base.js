/**
 * KnowledgeBase v3.0 — Recycle Hub Rio AI
 * 100 Professional Customer FAQs — Permanent localStorage persistence.
 * Multi-layer semantic matching: bigram, token, substring scoring.
 */

class KnowledgeBase {
  constructor() {
    this.storageKey = 'rio_ai_knowledge_base';
    this.storageVersionKey = 'rio_ai_kb_version';
    this.SEED_VERSION = '3.0'; // Bump this when seed content changes
    this.entries = this.loadFromStorage();
  }

  // ── 100 Professional Customer FAQs — Recycle Hub Knowledge Base v3.0
  getDefaultSeed() {
    const now = new Date().toISOString();
    return [
      // ═══════════════════════════════════════════════════════════
      // SECTION 1: GENERAL INFORMATION (Q1–Q20)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_1',
        question: 'What is Recycle Hub?',
        answer: 'Recycle Hub is a web platform that helps people recycle unwanted materials such as paper, plastic, metals, books, electronic waste, cardboard, and other recyclable items. We collect these materials from your doorstep and supply them to authorised recycling industries, helping reduce waste and protect the environment.',
        category: 'General Information',
        tags: ['recycle hub', 'what', 'platform', 'web', 'paper', 'plastic', 'metals', 'books', 'electronic waste', 'cardboard', 'recyclable', 'doorstep', 'environment'],
        createdAt: now
      },
      {
        id: 'kb_2',
        question: 'What is the mission of Recycle Hub?',
        answer: 'Our mission is to make recycling simple, accessible, and rewarding while reducing landfill waste and promoting a cleaner, greener future.',
        category: 'General Information',
        tags: ['mission', 'recycle hub', 'simple', 'accessible', 'rewarding', 'landfill', 'cleaner', 'greener', 'future', 'goal'],
        createdAt: now
      },
      {
        id: 'kb_3',
        question: 'Who can use Recycle Hub?',
        answer: 'Anyone can use Recycle Hub, including households, students, offices, schools, shops, housing societies, and businesses with recyclable waste.',
        category: 'General Information',
        tags: ['who', 'use', 'households', 'students', 'offices', 'schools', 'shops', 'housing societies', 'businesses', 'recyclable waste', 'eligible'],
        createdAt: now
      },
      {
        id: 'kb_4',
        question: 'Is Recycle Hub available for businesses?',
        answer: 'Yes. Businesses and industries can both sell recyclable waste and purchase recyclable raw materials in bulk through our platform.',
        category: 'General Information',
        tags: ['businesses', 'industries', 'sell', 'purchase', 'raw materials', 'bulk', 'corporate', 'enterprise', 'available'],
        createdAt: now
      },
      {
        id: 'kb_5',
        question: 'Why should I recycle through Recycle Hub?',
        answer: 'Recycle Hub offers doorstep pickup, fair pricing, secure payments, professional service, and ensures your recyclable waste reaches authorised recycling facilities.',
        category: 'General Information',
        tags: ['why', 'recycle', 'doorstep pickup', 'fair pricing', 'secure payments', 'professional', 'authorised', 'facilities', 'benefits'],
        createdAt: now
      },
      {
        id: 'kb_6',
        question: 'Does Recycle Hub charge for pickup?',
        answer: 'Standard pickup is generally free if the minimum quantity requirement is met. Charges may apply for special pickup requests or remote locations.',
        category: 'General Information',
        tags: ['charge', 'pickup', 'free', 'minimum quantity', 'remote', 'cost', 'fee', 'standard'],
        createdAt: now
      },
      {
        id: 'kb_7',
        question: 'Is registration free?',
        answer: 'Yes. Creating an account on Recycle Hub is completely free.',
        category: 'General Information',
        tags: ['registration', 'free', 'account', 'creating', 'cost', 'signup', 'join'],
        createdAt: now
      },
      {
        id: 'kb_8',
        question: 'How do I contact customer support?',
        answer: 'You can contact us through the AI assistant, live chat, email, or customer support number available in the Contact Us section.',
        category: 'General Information',
        tags: ['contact', 'customer support', 'ai assistant', 'live chat', 'email', 'support number', 'help', 'reach'],
        createdAt: now
      },
      {
        id: 'kb_9',
        question: 'Is my personal information secure?',
        answer: 'Yes. Your personal information is securely stored and protected according to our privacy policy.',
        category: 'General Information',
        tags: ['personal information', 'secure', 'privacy', 'protected', 'data', 'safe', 'policy'],
        createdAt: now
      },
      {
        id: 'kb_10',
        question: 'Can I use Recycle Hub from my mobile?',
        answer: 'Yes. Recycle Hub works on smartphones, tablets, and computers.',
        category: 'General Information',
        tags: ['mobile', 'smartphone', 'tablet', 'computer', 'device', 'app', 'phone'],
        createdAt: now
      },
      {
        id: 'kb_11',
        question: 'Does Recycle Hub operate every day?',
        answer: 'Pickup availability depends on your location. You can check available pickup dates while booking through the app.',
        category: 'General Information',
        tags: ['operate', 'every day', 'availability', 'location', 'dates', 'booking', 'schedule'],
        createdAt: now
      },
      {
        id: 'kb_12',
        question: 'Why should I recycle instead of throwing waste away?',
        answer: 'Recycling conserves natural resources, reduces pollution, saves energy, and helps create a cleaner environment for future generations.',
        category: 'General Information',
        tags: ['why recycle', 'throwing waste', 'conserves', 'natural resources', 'pollution', 'energy', 'cleaner environment', 'benefit'],
        createdAt: now
      },
      {
        id: 'kb_13',
        question: 'Does Recycle Hub recycle everything?',
        answer: 'We accept only recyclable materials that comply with our collection guidelines. Not all materials may be accepted in every area.',
        category: 'General Information',
        tags: ['recycle everything', 'accept', 'recyclable materials', 'guidelines', 'collection', 'accept all'],
        createdAt: now
      },
      {
        id: 'kb_14',
        question: 'Is Recycle Hub environmentally friendly?',
        answer: 'Yes. We work with authorised recycling partners to ensure responsible recycling practices and environmental compliance.',
        category: 'General Information',
        tags: ['environmentally friendly', 'authorised', 'partners', 'responsible', 'practices', 'compliance', 'green', 'eco'],
        createdAt: now
      },
      {
        id: 'kb_15',
        question: 'Can I recycle regularly?',
        answer: 'Yes. You can schedule pickups as often as needed, including recurring weekly or monthly schedules.',
        category: 'General Information',
        tags: ['recycle regularly', 'schedule', 'recurring', 'weekly', 'monthly', 'frequent', 'regular'],
        createdAt: now
      },
      {
        id: 'kb_16',
        question: 'Can I recycle in bulk?',
        answer: 'Yes. Bulk recycling services are available for institutions, businesses, and housing societies with large volumes of recyclable waste.',
        category: 'General Information',
        tags: ['bulk', 'institutions', 'businesses', 'housing societies', 'large volumes', 'bulk recycling', 'big quantity'],
        createdAt: now
      },
      {
        id: 'kb_17',
        question: 'What makes Recycle Hub different?',
        answer: 'Recycle Hub stands out with doorstep collection, transparent pricing, AI-powered assistance via Rio AI, quick scheduling, and direct connections with authorised recycling industries.',
        category: 'General Information',
        tags: ['different', 'doorstep', 'transparent pricing', 'AI', 'rio ai', 'scheduling', 'industries', 'unique', 'special'],
        createdAt: now
      },
      {
        id: 'kb_18',
        question: 'Can schools partner with Recycle Hub?',
        answer: 'Yes. Schools can organise recycling drives, schedule bulk pickups, and partner with us for environmental education programmes.',
        category: 'General Information',
        tags: ['schools', 'partner', 'recycling drives', 'bulk pickups', 'education', 'programmes', 'institution'],
        createdAt: now
      },
      {
        id: 'kb_19',
        question: 'Does Recycle Hub provide recycling certificates?',
        answer: 'Certificates may be available for corporate and institutional recycling projects. Please contact our support team for details.',
        category: 'General Information',
        tags: ['certificate', 'corporate', 'institutional', 'projects', 'recycling certificate', 'document'],
        createdAt: now
      },
      {
        id: 'kb_20',
        question: 'Can I suggest improvements to Recycle Hub?',
        answer: 'Absolutely! We welcome your feedback and suggestions through our Feedback section in the app.',
        category: 'General Information',
        tags: ['suggest', 'improvements', 'feedback', 'suggestions', 'ideas', 'improve'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 2: REGISTRATION & ACCOUNT (Q21–Q30)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_21',
        question: 'How do I create an account?',
        answer: 'Click Sign Up, enter your name, email address, and mobile number, verify via OTP, and complete your profile to get started.',
        category: 'Registration & Account',
        tags: ['create account', 'sign up', 'register', 'email', 'mobile', 'OTP', 'profile', 'new user', 'join'],
        createdAt: now
      },
      {
        id: 'kb_22',
        question: 'Can I use Google login?',
        answer: 'Yes, Google Sign-In is available for quick and secure account access if enabled in your region.',
        category: 'Registration & Account',
        tags: ['google login', 'google sign in', 'social login', 'quick login', 'secure', 'oauth'],
        createdAt: now
      },
      {
        id: 'kb_23',
        question: 'I forgot my password. How do I reset it?',
        answer: 'Click Forgot Password on the login page. You will receive a reset link or OTP on your registered email address or mobile number.',
        category: 'Registration & Account',
        tags: ['forgot password', 'reset', 'password', 'login', 'reset link', 'OTP', 'email', 'mobile'],
        createdAt: now
      },
      {
        id: 'kb_24',
        question: 'Can I change my phone number?',
        answer: 'Yes. You can update your phone number from your profile settings after completing verification.',
        category: 'Registration & Account',
        tags: ['change phone number', 'update', 'mobile number', 'profile settings', 'verification'],
        createdAt: now
      },
      {
        id: 'kb_25',
        question: 'Can I update my address?',
        answer: 'Yes. You can add, edit, or remove pickup addresses from your profile at any time.',
        category: 'Registration & Account',
        tags: ['update address', 'add address', 'edit address', 'pickup address', 'profile', 'location'],
        createdAt: now
      },
      {
        id: 'kb_26',
        question: 'Can I have multiple pickup addresses?',
        answer: 'Yes. You can save multiple pickup addresses in your account for convenient scheduling.',
        category: 'Registration & Account',
        tags: ['multiple addresses', 'pickup addresses', 'save address', 'account', 'locations'],
        createdAt: now
      },
      {
        id: 'kb_27',
        question: 'Why can I not log in to my account?',
        answer: 'Please check your credentials and internet connection. If the problem persists, try resetting your password or contact customer support.',
        category: 'Registration & Account',
        tags: ['cannot login', 'cannot log in', 'login issue', 'credentials', 'password', 'internet', 'access', 'sign in failed'],
        createdAt: now
      },
      {
        id: 'kb_28',
        question: 'Can I delete my account?',
        answer: 'Yes. You can request account deletion by contacting customer support or using the account deletion option available in your profile settings.',
        category: 'Registration & Account',
        tags: ['delete account', 'remove account', 'close account', 'support', 'profile settings'],
        createdAt: now
      },
      {
        id: 'kb_29',
        question: 'Why do I need OTP verification?',
        answer: 'OTP verification helps protect your account from unauthorised access and confirms your identity during sensitive actions.',
        category: 'Registration & Account',
        tags: ['OTP', 'verification', 'protect', 'unauthorised', 'identity', 'security', 'one time password'],
        createdAt: now
      },
      {
        id: 'kb_30',
        question: 'Is email verification mandatory?',
        answer: 'Email verification may be required for account security, payment processing, and important notifications.',
        category: 'Registration & Account',
        tags: ['email verification', 'mandatory', 'required', 'security', 'payment', 'notifications'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 3: ACCEPTED MATERIALS (Q31–Q45)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_31',
        question: 'What plastic items do you collect?',
        answer: 'We collect plastic bottles, containers, packaging, household plastic items, and other recyclable plastics that meet our guidelines.',
        category: 'Accepted Materials',
        tags: ['plastic', 'bottles', 'containers', 'packaging', 'household', 'collect', 'recyclable'],
        createdAt: now
      },
      {
        id: 'kb_32',
        question: 'Do you collect newspapers?',
        answer: 'Yes. We collect old newspapers, magazines, and other paper-based waste for recycling.',
        category: 'Accepted Materials',
        tags: ['newspapers', 'paper', 'magazines', 'old newspapers', 'collect', 'waste'],
        createdAt: now
      },
      {
        id: 'kb_33',
        question: 'Do you collect cardboard?',
        answer: 'Yes. Cardboard boxes, cartons, and corrugated packaging are accepted for recycling.',
        category: 'Accepted Materials',
        tags: ['cardboard', 'boxes', 'cartons', 'corrugated', 'packaging', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_34',
        question: 'Do you collect books?',
        answer: 'Yes. Old books, textbooks, and printed materials are accepted for recycling or reuse.',
        category: 'Accepted Materials',
        tags: ['books', 'old books', 'textbooks', 'printed materials', 'collect', 'reuse'],
        createdAt: now
      },
      {
        id: 'kb_35',
        question: 'Can I recycle school notebooks?',
        answer: 'Yes. School notebooks, exercise books, and used stationery paper are accepted.',
        category: 'Accepted Materials',
        tags: ['notebooks', 'school', 'exercise books', 'stationery', 'paper', 'recycle'],
        createdAt: now
      },
      {
        id: 'kb_36',
        question: 'Do you collect aluminium cans?',
        answer: 'Yes. Aluminium cans, foil, and aluminium scrap are collected for metal recycling.',
        category: 'Accepted Materials',
        tags: ['aluminium', 'cans', 'foil', 'scrap', 'metal', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_37',
        question: 'Do you collect iron scrap?',
        answer: 'Yes. Iron and steel scrap, old tools, and metal components are accepted for industrial recycling.',
        category: 'Accepted Materials',
        tags: ['iron', 'scrap', 'steel', 'tools', 'metal components', 'industrial', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_38',
        question: 'Do you collect copper wires?',
        answer: 'Yes. Copper wires and copper scrap are accepted as high-value recyclable metals.',
        category: 'Accepted Materials',
        tags: ['copper', 'wires', 'copper scrap', 'metal', 'recyclable', 'high value'],
        createdAt: now
      },
      {
        id: 'kb_39',
        question: 'Do you collect brass items?',
        answer: 'Yes. Brass items and brass scrap are accepted for metal recycling.',
        category: 'Accepted Materials',
        tags: ['brass', 'brass items', 'brass scrap', 'metal', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_40',
        question: 'Do you collect old fans?',
        answer: 'Yes. Old fans and electrical appliances are accepted if they are recyclable. The metal and electronic components will be properly processed.',
        category: 'Accepted Materials',
        tags: ['fans', 'old fans', 'electrical appliances', 'recyclable', 'components', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_41',
        question: 'Can I recycle broken TVs?',
        answer: 'Yes. Broken or old televisions are accepted as electronic waste and processed through our e-waste recycling partners.',
        category: 'Accepted Materials',
        tags: ['broken TV', 'television', 'e-waste', 'electronic waste', 'recycle', 'old TV'],
        createdAt: now
      },
      {
        id: 'kb_42',
        question: 'Do you collect old mobile phones?',
        answer: 'Yes. Old, damaged, or unused mobile phones are accepted for e-waste recycling.',
        category: 'Accepted Materials',
        tags: ['mobile phones', 'old phones', 'damaged phones', 'e-waste', 'electronic waste', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_43',
        question: 'Can I recycle laptops?',
        answer: 'Yes. Old or broken laptops and computers are accepted for e-waste recycling.',
        category: 'Accepted Materials',
        tags: ['laptops', 'computers', 'old laptops', 'broken laptops', 'e-waste', 'electronic waste', 'recycle'],
        createdAt: now
      },
      {
        id: 'kb_44',
        question: 'Do you collect printers?',
        answer: 'Yes. Old or broken printers are collected as part of our e-waste recycling service.',
        category: 'Accepted Materials',
        tags: ['printers', 'old printers', 'e-waste', 'electronic waste', 'collect'],
        createdAt: now
      },
      {
        id: 'kb_45',
        question: 'Can I recycle vehicle parts?',
        answer: 'Yes. Recyclable vehicle components such as metal parts, batteries, and certain plastics are accepted. Contact us for specifics.',
        category: 'Accepted Materials',
        tags: ['vehicle parts', 'car parts', 'metal parts', 'batteries', 'auto parts', 'recycle'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 4: PICKUP SERVICE (Q46–Q60)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_46',
        question: 'How do I book a pickup?',
        answer: 'Select your recyclable materials, choose your pickup address, pick a convenient date and time slot, and confirm your booking. You will receive a confirmation notification.',
        category: 'Pickup Service',
        tags: ['book pickup', 'schedule pickup', 'how to book', 'date', 'time slot', 'confirmation', 'booking'],
        createdAt: now
      },
      {
        id: 'kb_47',
        question: 'Can I book a same-day pickup?',
        answer: 'Same-day pickup is available in select areas if slots are open. Check the app for availability in your location.',
        category: 'Pickup Service',
        tags: ['same day pickup', 'urgent pickup', 'today', 'slots', 'availability', 'quick pickup'],
        createdAt: now
      },
      {
        id: 'kb_48',
        question: 'Can I reschedule my pickup?',
        answer: 'Yes. You can reschedule your pickup through the app before the scheduled time. Go to your bookings and select Reschedule.',
        category: 'Pickup Service',
        tags: ['reschedule', 'pickup', 'change date', 'change time', 'bookings', 'modify'],
        createdAt: now
      },
      {
        id: 'kb_49',
        question: 'Can I cancel my pickup?',
        answer: 'Yes. You can cancel a scheduled pickup from the app. Cancellations should be made well in advance to avoid inconvenience.',
        category: 'Pickup Service',
        tags: ['cancel pickup', 'cancellation', 'cancel booking', 'advance notice'],
        createdAt: now
      },
      {
        id: 'kb_50',
        question: 'Will I receive pickup confirmation?',
        answer: 'Yes. You will receive a confirmation notification via SMS, email, or in-app notification after successfully booking a pickup.',
        category: 'Pickup Service',
        tags: ['pickup confirmation', 'SMS', 'email notification', 'in-app notification', 'booking confirmed'],
        createdAt: now
      },
      {
        id: 'kb_51',
        question: 'Can I track my pickup?',
        answer: 'Yes. You can track your pickup status through the app, including when the collector is on the way.',
        category: 'Pickup Service',
        tags: ['track pickup', 'pickup status', 'collector', 'on the way', 'real time', 'tracking'],
        createdAt: now
      },
      {
        id: 'kb_52',
        question: 'What if I miss the pickup?',
        answer: 'If you miss a scheduled pickup, you can reschedule it through the app at your convenience.',
        category: 'Pickup Service',
        tags: ['miss pickup', 'missed pickup', 'reschedule', 'not available', 'no one home'],
        createdAt: now
      },
      {
        id: 'kb_53',
        question: 'What if the collector arrives late?',
        answer: 'If your collector is late, you can track their status in the app. If there is a significant delay, please contact customer support.',
        category: 'Pickup Service',
        tags: ['late pickup', 'collector late', 'delayed', 'track', 'contact support', 'waiting'],
        createdAt: now
      },
      {
        id: 'kb_54',
        question: 'Can someone else hand over my materials?',
        answer: 'Yes. A family member, colleague, or anyone available at the pickup address can hand over the materials on your behalf.',
        category: 'Pickup Service',
        tags: ['someone else', 'hand over', 'family', 'colleague', 'behalf', 'pickup person'],
        createdAt: now
      },
      {
        id: 'kb_55',
        question: 'Should I separate materials before pickup?',
        answer: 'Yes. Separating materials by type (paper, plastic, metal, e-waste) helps speed up the collection process and ensures accurate pricing.',
        category: 'Pickup Service',
        tags: ['separate materials', 'segregate', 'sort', 'paper', 'plastic', 'metal', 'e-waste', 'before pickup'],
        createdAt: now
      },
      {
        id: 'kb_56',
        question: 'Do I need to clean recyclable items?',
        answer: 'Light cleaning is recommended for food containers and bottles. Heavily soiled items may affect pricing or acceptance.',
        category: 'Pickup Service',
        tags: ['clean', 'wash', 'recyclable items', 'food containers', 'bottles', 'soiled', 'recommended'],
        createdAt: now
      },
      {
        id: 'kb_57',
        question: 'Is weighing done at pickup?',
        answer: 'Yes. Materials are weighed at the time of pickup by our collector, and you will be informed of the weight and payment.',
        category: 'Pickup Service',
        tags: ['weighing', 'weight', 'at pickup', 'collector', 'payment calculation', 'measurement'],
        createdAt: now
      },
      {
        id: 'kb_58',
        question: 'Can I add more materials to my pickup?',
        answer: 'Yes. You can add or update materials before the pickup is confirmed. Contact the collector or update through the app.',
        category: 'Pickup Service',
        tags: ['add materials', 'update pickup', 'more items', 'before confirmed', 'modify'],
        createdAt: now
      },
      {
        id: 'kb_59',
        question: 'Can I schedule recurring pickups?',
        answer: 'Yes. You can set up regular recurring pickup schedules — weekly, biweekly, or monthly — for ongoing recycling needs.',
        category: 'Pickup Service',
        tags: ['recurring pickup', 'regular pickup', 'weekly', 'biweekly', 'monthly', 'schedule', 'repeat'],
        createdAt: now
      },
      {
        id: 'kb_60',
        question: 'Do I need to stay at home during pickup?',
        answer: 'Someone should be available at the pickup address. If unavailable, you can arrange for someone else to hand over the materials.',
        category: 'Pickup Service',
        tags: ['stay home', 'available', 'pickup address', 'hand over', 'present', 'at home'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 5: PRICING & PAYMENT (Q61–Q75)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_61',
        question: 'How are prices decided?',
        answer: 'Prices are determined based on current market rates, material type, quality, condition, and weight at the time of pickup.',
        category: 'Pricing & Payment',
        tags: ['prices', 'decided', 'market rates', 'material type', 'quality', 'weight', 'pricing', 'how calculated'],
        createdAt: now
      },
      {
        id: 'kb_62',
        question: 'Do prices change?',
        answer: 'Yes. Prices may vary based on fluctuating market rates and commodity prices. Always check the current rates before scheduling a pickup.',
        category: 'Pricing & Payment',
        tags: ['prices change', 'vary', 'market rates', 'fluctuating', 'commodity', 'current rates'],
        createdAt: now
      },
      {
        id: 'kb_63',
        question: 'Where can I check the current rates?',
        answer: 'You can view the latest material rates in the Price List section of the app or website.',
        category: 'Pricing & Payment',
        tags: ['check rates', 'current rates', 'price list', 'app', 'website', 'latest prices'],
        createdAt: now
      },
      {
        id: 'kb_64',
        question: 'When do I get paid?',
        answer: 'Payment is processed after successful pickup and material verification. It is typically credited within 24–48 hours.',
        category: 'Pricing & Payment',
        tags: ['when paid', 'payment', 'after pickup', 'verification', 'credited', '24 hours', '48 hours'],
        createdAt: now
      },
      {
        id: 'kb_65',
        question: 'What payment methods are available?',
        answer: 'We support UPI, bank transfer, digital wallet, and cash payment where available.',
        category: 'Pricing & Payment',
        tags: ['payment methods', 'UPI', 'bank transfer', 'wallet', 'cash', 'payment options', 'how to receive payment'],
        createdAt: now
      },
      {
        id: 'kb_66',
        question: 'Are there any hidden charges or commission?',
        answer: 'No. There are no hidden charges or commissions. Our pricing is completely transparent.',
        category: 'Pricing & Payment',
        tags: ['hidden charges', 'commission', 'transparent', 'no fees', 'no hidden costs', 'free'],
        createdAt: now
      },
      {
        id: 'kb_67',
        question: 'Can I see my payment history?',
        answer: 'Yes. Your full payment history is available in your account under the Transactions or Payment History section.',
        category: 'Pricing & Payment',
        tags: ['payment history', 'transactions', 'history', 'account', 'past payments', 'records'],
        createdAt: now
      },
      {
        id: 'kb_68',
        question: 'What if my payment fails or is delayed?',
        answer: 'If your payment fails or is delayed, please contact our customer support with your booking reference. We will resolve it promptly.',
        category: 'Pricing & Payment',
        tags: ['payment failed', 'payment delayed', 'contact support', 'booking reference', 'resolve', 'delayed payment'],
        createdAt: now
      },
      {
        id: 'kb_69',
        question: 'Can I receive payment directly in my bank account?',
        answer: 'Yes. You can link your bank account or UPI ID in your profile for direct payment transfers.',
        category: 'Pricing & Payment',
        tags: ['bank account', 'direct payment', 'UPI ID', 'link account', 'transfer', 'bank'],
        createdAt: now
      },
      {
        id: 'kb_70',
        question: 'Will I get an invoice?',
        answer: 'Yes. An invoice or receipt is generated for each pickup transaction and is available in your account.',
        category: 'Pricing & Payment',
        tags: ['invoice', 'receipt', 'transaction', 'generated', 'account', 'document'],
        createdAt: now
      },
      {
        id: 'kb_71',
        question: 'Is GST applicable on transactions?',
        answer: 'GST may apply depending on the type of transaction and applicable local regulations. Please refer to your invoice for tax details.',
        category: 'Pricing & Payment',
        tags: ['GST', 'tax', 'applicable', 'transactions', 'regulations', 'invoice', 'tax details'],
        createdAt: now
      },
      {
        id: 'kb_72',
        question: 'Can businesses receive GST invoices?',
        answer: 'Yes. Businesses can receive GST-compliant invoices for bulk recycling transactions. Contact our business support team.',
        category: 'Pricing & Payment',
        tags: ['businesses', 'GST invoice', 'bulk', 'compliance', 'business support', 'tax invoice'],
        createdAt: now
      },
      {
        id: 'kb_73',
        question: 'Is pricing transparent?',
        answer: 'Yes. All pricing is clearly listed and visible before you confirm your pickup. There are no surprises.',
        category: 'Pricing & Payment',
        tags: ['transparent pricing', 'visible', 'confirm pickup', 'no surprises', 'clear', 'listed'],
        createdAt: now
      },
      {
        id: 'kb_74',
        question: 'Can I negotiate prices?',
        answer: 'Bulk sellers may be able to discuss pricing with our sales team. For standard pickups, prices are set based on market rates.',
        category: 'Pricing & Payment',
        tags: ['negotiate price', 'bulk sellers', 'sales team', 'standard pickup', 'market rates', 'discuss'],
        createdAt: now
      },
      {
        id: 'kb_75',
        question: 'Are bulk orders discounted?',
        answer: 'Yes. Bulk recycling orders may qualify for better rates. Contact our team to discuss bulk pricing options.',
        category: 'Pricing & Payment',
        tags: ['bulk discount', 'bulk orders', 'better rates', 'discounted', 'bulk pricing', 'volume'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 6: INDUSTRIES & BUYERS (Q76–Q85)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_76',
        question: 'Can industries buy recycled materials from Recycle Hub?',
        answer: 'Yes. Industries and factories can purchase bulk quantities of sorted, verified recyclable raw materials through our platform.',
        category: 'Industries & Buyers',
        tags: ['industries', 'buy', 'recycled materials', 'factories', 'bulk', 'raw materials', 'purchase', 'buyers'],
        createdAt: now
      },
      {
        id: 'kb_77',
        question: 'Do you sell recyclable materials in bulk?',
        answer: 'Yes. We supply bulk quantities of sorted recyclable materials including paper, plastic, metals, and e-waste to industrial buyers.',
        category: 'Industries & Buyers',
        tags: ['sell bulk', 'bulk supply', 'sorted', 'paper', 'plastic', 'metals', 'e-waste', 'industrial'],
        createdAt: now
      },
      {
        id: 'kb_78',
        question: 'What materials are available for industrial purchase?',
        answer: 'Available materials include plastic, paper, metals (aluminium, copper, iron), e-waste, cardboard, books, and more depending on current stock.',
        category: 'Industries & Buyers',
        tags: ['available materials', 'industrial purchase', 'plastic', 'paper', 'metals', 'e-waste', 'cardboard', 'stock'],
        createdAt: now
      },
      {
        id: 'kb_79',
        question: 'Can factories request regular deliveries?',
        answer: 'Yes. Factories and industries can set up regular delivery schedules based on their material requirements.',
        category: 'Industries & Buyers',
        tags: ['factories', 'regular deliveries', 'delivery schedule', 'material requirements', 'recurring'],
        createdAt: now
      },
      {
        id: 'kb_80',
        question: 'Do industries need to register?',
        answer: 'Yes. Industrial buyers must register with a verified business profile to access bulk purchasing and delivery features.',
        category: 'Industries & Buyers',
        tags: ['industries register', 'business profile', 'verified', 'bulk purchasing', 'buyers registration'],
        createdAt: now
      },
      {
        id: 'kb_81',
        question: 'Can industries negotiate pricing?',
        answer: 'Yes. Industrial buyers can negotiate pricing for large and recurring orders with our dedicated business sales team.',
        category: 'Industries & Buyers',
        tags: ['negotiate price', 'industries', 'large orders', 'recurring', 'business sales team'],
        createdAt: now
      },
      {
        id: 'kb_82',
        question: 'Is material quality verified before supply?',
        answer: 'Yes. All materials are sorted, verified, and quality-checked before being supplied to industrial buyers.',
        category: 'Industries & Buyers',
        tags: ['quality verified', 'sorted', 'quality checked', 'before supply', 'materials', 'standards'],
        createdAt: now
      },
      {
        id: 'kb_83',
        question: 'Are deliveries to industries scheduled?',
        answer: 'Yes. Deliveries are scheduled based on your order and stock availability. You will receive delivery confirmations.',
        category: 'Industries & Buyers',
        tags: ['deliveries', 'industries', 'scheduled', 'order', 'stock', 'confirmation'],
        createdAt: now
      },
      {
        id: 'kb_84',
        question: 'Can buyers track deliveries?',
        answer: 'Yes. Industrial buyers can track their delivery status through the buyer portal in real time.',
        category: 'Industries & Buyers',
        tags: ['buyers', 'track deliveries', 'delivery status', 'buyer portal', 'real time', 'tracking'],
        createdAt: now
      },
      {
        id: 'kb_85',
        question: 'Do you provide contracts for industrial buyers?',
        answer: 'Yes. Long-term business partnerships and bulk supply agreements are available with formal contracts. Contact our business team.',
        category: 'Industries & Buyers',
        tags: ['contracts', 'industrial buyers', 'long term', 'business partnerships', 'supply agreements', 'formal'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 7: COMPLAINTS & SUPPORT (Q86–Q95)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_86',
        question: 'How do I report a problem?',
        answer: 'You can report a problem through the AI assistant (Rio AI), live chat, the Help section of the app, or by contacting customer support directly.',
        category: 'Complaints & Support',
        tags: ['report problem', 'complaint', 'AI assistant', 'live chat', 'help section', 'customer support', 'issue'],
        createdAt: now
      },
      {
        id: 'kb_87',
        question: 'What if my pickup was missed?',
        answer: 'If your pickup was missed without notice, please contact customer support. We will reschedule your pickup at the earliest convenience.',
        category: 'Complaints & Support',
        tags: ['pickup missed', 'missed', 'no show', 'reschedule', 'customer support', 'contact'],
        createdAt: now
      },
      {
        id: 'kb_88',
        question: 'My payment is delayed.',
        answer: 'We apologise for the delay. Please contact our support team with your booking reference number and we will investigate and resolve the issue promptly.',
        category: 'Complaints & Support',
        tags: ['payment delayed', 'delay', 'booking reference', 'support team', 'resolve', 'investigate'],
        createdAt: now
      },
      {
        id: 'kb_89',
        question: 'The collector behaved unprofessionally.',
        answer: 'We sincerely apologise for this experience. Please report the incident with details through the app or by contacting support so we can take immediate action.',
        category: 'Complaints & Support',
        tags: ['unprofessional', 'collector behaviour', 'report incident', 'complaint', 'action', 'apology'],
        createdAt: now
      },
      {
        id: 'kb_90',
        question: 'My materials were not fully collected.',
        answer: 'We apologise for the inconvenience. Please contact our customer support with your booking details and we will arrange a follow-up collection.',
        category: 'Complaints & Support',
        tags: ['not collected', 'partially collected', 'follow up', 'booking details', 'customer support', 'incomplete'],
        createdAt: now
      },
      {
        id: 'kb_91',
        question: 'I received the wrong payment amount.',
        answer: 'We will review your transaction and resolve any discrepancy. Please raise the issue through the app or contact support with your booking reference.',
        category: 'Complaints & Support',
        tags: ['wrong payment', 'incorrect amount', 'discrepancy', 'review', 'booking reference', 'resolve'],
        createdAt: now
      },
      {
        id: 'kb_92',
        question: 'Can I raise a complaint anytime?',
        answer: 'Yes. You can submit a complaint through the app or contact our support team at any time.',
        category: 'Complaints & Support',
        tags: ['raise complaint', 'anytime', 'submit', 'support team', 'complaint'],
        createdAt: now
      },
      {
        id: 'kb_93',
        question: 'How long does complaint resolution take?',
        answer: 'Most complaints are resolved within 24 to 72 hours. Complex cases may take longer, but you will be kept informed throughout.',
        category: 'Complaints & Support',
        tags: ['complaint resolution', 'how long', '24 hours', '72 hours', 'informed', 'timeline'],
        createdAt: now
      },
      {
        id: 'kb_94',
        question: 'Will I receive updates about my complaint?',
        answer: 'Yes. You will receive notifications and updates on your complaint status via SMS, email, or in-app notification.',
        category: 'Complaints & Support',
        tags: ['complaint updates', 'notifications', 'status', 'SMS', 'email', 'in-app'],
        createdAt: now
      },
      {
        id: 'kb_95',
        question: 'Can I rate the service after a pickup?',
        answer: 'Yes. After each pickup, you will be prompted to rate the service and provide feedback to help us improve.',
        category: 'Complaints & Support',
        tags: ['rate service', 'feedback', 'after pickup', 'rating', 'review', 'improve'],
        createdAt: now
      },

      // ═══════════════════════════════════════════════════════════
      // SECTION 8: AI ASSISTANT & SUSTAINABILITY (Q96–Q100)
      // ═══════════════════════════════════════════════════════════
      {
        id: 'kb_96',
        question: 'What is Rio AI?',
        answer: 'Rio AI is Recycle Hub\'s intelligent AI-powered assistant. It answers your questions, guides you through pickup scheduling, provides pricing information, and automatically escalates critical issues to our support team.',
        category: 'AI Assistant & Sustainability',
        tags: ['Rio AI', 'intelligent assistant', 'AI powered', 'questions', 'pickup scheduling', 'pricing', 'escalate', 'support'],
        createdAt: now
      },
      {
        id: 'kb_97',
        question: 'Can Rio AI book pickups?',
        answer: 'Yes. Rio AI can guide you step-by-step through the pickup booking process, helping you select materials, address, and time slots.',
        category: 'AI Assistant & Sustainability',
        tags: ['Rio AI', 'book pickup', 'guide', 'step by step', 'materials', 'address', 'time slots'],
        createdAt: now
      },
      {
        id: 'kb_98',
        question: 'Can Rio AI answer pricing questions?',
        answer: 'Yes. Rio AI can provide the latest available pricing information for different recyclable materials to help you plan your pickup.',
        category: 'AI Assistant & Sustainability',
        tags: ['Rio AI', 'pricing questions', 'latest pricing', 'recyclable materials', 'plan pickup'],
        createdAt: now
      },
      {
        id: 'kb_99',
        question: 'Why is recycling important?',
        answer: 'Recycling reduces pollution, conserves natural resources, saves energy, reduces landfill pressure, and supports a sustainable future for the planet.',
        category: 'AI Assistant & Sustainability',
        tags: ['recycling important', 'pollution', 'natural resources', 'energy', 'landfill', 'sustainable', 'future', 'planet'],
        createdAt: now
      },
      {
        id: 'kb_100',
        question: 'How can I contribute to a greener planet?',
        answer: 'You can contribute by separating recyclable waste at home, using Recycle Hub for responsible disposal, reducing unnecessary consumption, reusing items where possible, and encouraging others to recycle.',
        category: 'AI Assistant & Sustainability',
        tags: ['greener planet', 'contribute', 'separate waste', 'responsible disposal', 'reduce consumption', 'reuse', 'encourage', 'environment'],
        createdAt: now
      }
    ];
  }

  /**
   * Load from localStorage with version-based cache invalidation.
   * If the seed version has changed, re-seeds automatically.
   */
  loadFromStorage() {
    try {
      const storedVersion = localStorage.getItem(this.storageVersionKey);
      const data = localStorage.getItem(this.storageKey);

      if (data && storedVersion === this.SEED_VERSION) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length >= 100) {
          console.log(`[RioKB v${this.SEED_VERSION}] Loaded ${parsed.length} entries from localStorage.`);
          return parsed;
        }
      } else if (storedVersion !== this.SEED_VERSION) {
        console.log(`[RioKB] Version changed (${storedVersion} → ${this.SEED_VERSION}). Re-seeding.`);
      }
    } catch (e) {
      console.warn('[RioKB] Failed to load from localStorage. Re-seeding.', e);
    }
    const seed = this.getDefaultSeed();
    this.saveToStorage(seed);
    console.log(`[RioKB v${this.SEED_VERSION}] Seeded ${seed.length} professional FAQ entries.`);
    return seed;
  }

  saveToStorage(entries = this.entries) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
      localStorage.setItem(this.storageVersionKey, this.SEED_VERSION);
    } catch (e) {
      console.error('[RioKB] Failed to save to localStorage:', e);
    }
  }

  getAll() {
    return this.entries;
  }

  addEntry(entry) {
    const newEntry = {
      id: 'kb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      question: entry.question.trim(),
      answer: entry.answer.trim(),
      category: entry.category || 'General',
      tags: typeof entry.tags === 'string'
        ? entry.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : (entry.tags || []),
      createdAt: new Date().toISOString()
    };
    this.entries.unshift(newEntry);
    this.saveToStorage();
    return newEntry;
  }

  updateEntry(id, updatedFields) {
    const idx = this.entries.findIndex(item => item.id === id);
    if (idx !== -1) {
      this.entries[idx] = {
        ...this.entries[idx],
        ...updatedFields,
        question: updatedFields.question.trim(),
        answer: updatedFields.answer.trim(),
        tags: typeof updatedFields.tags === 'string'
          ? updatedFields.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
          : updatedFields.tags,
        updatedAt: new Date().toISOString()
      };
      this.saveToStorage();
      return this.entries[idx];
    }
    return null;
  }

  deleteEntry(id) {
    this.entries = this.entries.filter(item => item.id !== id);
    this.saveToStorage();
  }

  resetToDefault() {
    this.entries = this.getDefaultSeed();
    this.saveToStorage();
    return this.entries;
  }

  /**
   * Tokenize & normalize text into keywords.
   * Minimal stop-word list to preserve maximum semantic content.
   */
  tokenize(text) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'to', 'in', 'on', 'of', 'for', 'with',
      'this', 'that', 'they', 'them', 'their', 'which', 'will', 'would', 'could', 'should',
      'has', 'had', 'have', 'been', 'be', 'by', 'at', 'from', 'into', 'through',
      'some', 'any', 'more', 'very', 'just', 'also', 'if', 'it', 'its', 'my', 'your',
      'our', 'we', 'he', 'she', 'you', 'i', 'am', 'are', 'is', 'was', 'were', 'not'
    ]);

    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
  }

  /**
   * Extract adjacent word bigrams from raw text.
   * e.g. "schedule a pickup" → ["schedule a", "a pickup"]
   */
  _getBigrams(text) {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(words[i] + ' ' + words[i + 1]);
    }
    return bigrams;
  }

  /**
   * Multi-layer semantic matching:
   *   Layer 1 — Bigram phrase match     (+7.0) — highest fidelity
   *   Layer 2 — Exact token match       (+3.5 question / +4.0 tags)
   *   Layer 3 — Substring partial match (+2.0 / +2.5) — handles plurals & variations
   *   Layer 4 — Answer body bonus       (+0.8) — weak supplementary signal
   *
   * Threshold: 0.18 (permissive — maximises recall across natural language phrasings)
   */
  findBestMatch(userQuery) {
    if (!userQuery || this.entries.length === 0) return null;

    const queryTokens  = this.tokenize(userQuery);
    const queryLower   = userQuery.toLowerCase().trim();
    const queryBigrams = this._getBigrams(queryLower);

    if (queryTokens.length === 0) return null;

    let bestItem = null;
    let highestScore = 0;

    for (const item of this.entries) {
      const qTokens      = this.tokenize(item.question);
      const tagTokens    = item.tags.map(t => t.toLowerCase());
      const questionLower = item.question.toLowerCase();
      const answerLower   = item.answer.toLowerCase();

      let matchCount = 0;

      // Layer 1: Bigram phrase matching
      queryBigrams.forEach(bigram => {
        if (questionLower.includes(bigram)) matchCount += 7.0;
        if (answerLower.includes(bigram))   matchCount += 2.5;
        const bigramJoined = bigram.replace(' ', '');
        if (tagTokens.some(t => t.includes(bigram) || t.includes(bigramJoined))) matchCount += 4.0;
      });

      // Layer 2: Exact token match
      queryTokens.forEach(token => {
        if (token.length < 2) return;
        if (qTokens.includes(token))   matchCount += 3.5;
        if (tagTokens.includes(token)) matchCount += 4.0;
      });

      // Layer 3: Substring / partial match
      queryTokens.forEach(token => {
        if (token.length <= 3) return;
        if (questionLower.includes(token) && !qTokens.includes(token)) matchCount += 2.0;
        if (tagTokens.some(t => t.includes(token) && t !== token))     matchCount += 2.5;
        if (answerLower.includes(token))                                matchCount += 0.8;
      });

      const unionSize = new Set([...queryTokens, ...qTokens]).size;
      const score = matchCount / Math.max(unionSize, 1);

      if (score > highestScore) {
        highestScore = score;
        bestItem = item;
      }
    }

    if (highestScore >= 0.18) {
      return {
        entry: bestItem,
        confidence: Math.min(99, Math.round(highestScore * 45)),
        score: highestScore
      };
    }

    return null;
  }

  exportJSON() {
    return JSON.stringify(this.entries, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        this.entries = parsed.map((item, i) => ({
          id: item.id || 'kb_imp_' + Date.now() + '_' + i,
          question: item.question || '',
          answer: item.answer || '',
          category: item.category || 'General',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.createdAt || new Date().toISOString()
        }));
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error('[RioKB] Failed to import JSON:', e);
    }
    return false;
  }
}

// Global Instance — auto-loads v3.0 FAQ seed (100 professional entries) from localStorage
window.rioKB = new KnowledgeBase();
