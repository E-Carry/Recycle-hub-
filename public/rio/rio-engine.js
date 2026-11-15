/**
 * RioEngine - Main AI Assistant Logic for Rio AI.
 * Handles problem flagging, automated diagnostic analysis, KB query retrieval, and conversational state.
 */

class RioEngine {
  constructor() {
    this.sessionHistory = [];
    
    // Problem & Anomaly Detection Rules
    this.problemRules = [
      {
        category: 'Payment & Wallet Failure',
        severity: 'CRITICAL',
        keywords: ['payment failed', 'failed to pay', 'money deducted', 'refund', 'wallet error', 'transaction failed', 'double charged', 'payment error'],
        diagnosticSummary: 'Customer experienced an urgent transaction or billing issue where funds may have been deducted or the payment gateway failed.'
      },
      {
        category: 'App Crash & Technical Bug',
        severity: 'HIGH',
        keywords: ['app crashed', 'app crash', 'broken', 'bug', 'screen frozen', 'white screen', 'error code', 'not working', 'stuck', 'failed to load'],
        diagnosticSummary: 'Technical app anomaly detected. Customer reported application freeze, unexpected error message, or broken UI workflow.'
      },
      {
        category: 'Account Lockout & Authentication',
        severity: 'HIGH',
        keywords: ['cannot login', "can't login", 'account locked', 'otp not received', 'password reset failed', 'access denied'],
        diagnosticSummary: 'User is unable to authenticate or access account credentials.'
      },
      {
        category: 'Service & Pickup Disruption',
        severity: 'MEDIUM',
        keywords: ["driver didn't show", 'pickup missed', 'late pickup', 'cancelled pickup', 'waste not collected'],
        diagnosticSummary: 'Customer reported a missed or delayed waste collection schedule.'
      },
      {
        category: 'Customer Frustration & Escalation',
        severity: 'HIGH',
        keywords: ['terrible', 'horrible', 'scam', 'talk to human', 'escalate', 'manager', 'complaint', 'bad service', 'frustrated'],
        diagnosticSummary: 'High customer sentiment frustration or explicit human support escalation request detected.'
      }
    ];

    // Conversational greeting patterns
    this.greetingPatterns = [
      'hi', 'hello', 'hey', 'greetings', 'hola', 'good morning', 'good afternoon',
      'good evening', 'howdy', 'sup', 'good day'
    ];

    // Bot identity queries
    this.identityPatterns = [
      'who are you', 'what is your name', 'your name', 'who created you',
      'what can you do', 'how do you work', 'how to use', 'what are you',
      'tell me about yourself', 'introduce yourself', 'about you'
    ];

    // Customer domain keywords — used to determine query relevance
    this.domainKeywords = [
      'recycle', 'recycling', 'waste', 'garbage', 'trash', 'segregate', 'segregation',
      'bin', 'bins', 'plastic', 'glass', 'metal', 'paper', 'cardboard', 'aluminum',
      'e-waste', 'ewaste', 'battery', 'pickup', 'pick up', 'schedule', 'driver',
      'collect', 'collection', 'book', 'booking', 'reward', 'rewards', 'point',
      'points', 'green point', 'green points', 'coin', 'coins', 'cash', 'upi',
      'paypal', 'coupon', 'coupons', 'redeem', 'redemption', 'payment', 'payments',
      'failed', 'deducted', 'charge', 'charges', 'refund', 'wallet', 'transaction',
      'account', 'profile', 'login', 'log in', 'signin', 'sign in', 'logout',
      'password', 'reset', 'otp', 'support', 'admin', 'issue', 'problem',
      'complaint', 'escalate', 'human', 'agent', 'service', 'app', 'crash',
      'freeze', 'bug', 'category', 'categories', 'seller', 'buyer', 'corporate',
      'factory', 'factories', 'hub', 'interface', 'quick pickup', 'store',
      'bulk', 'order', 'delivery', 'pricing', 'price', 'rate', 'earn', 'earning',
      'verify', 'verification', 'register', 'registration', 'invoice', 'terms'
    ];
  }

  /**
   * Evaluates user input for critical problems needing email alert dispatch
   */
  detectProblem(userText) {
    const textLower = userText.toLowerCase().trim();
    // Generic words also appear in plain FAQ questions ("Can I recycle broken TVs?").
    // In a single informational question they are not an incident report.
    const WEAK = ['broken', 'bug', 'stuck', 'complaint', 'manager', 'refund', 'escalate'];
    const isQuestion = /^(can|could|how|what|which|when|where|will|would|do|does|is|are|should|may|am)\b/.test(textLower)
      && textLower.split(/[.!?]+\s+/).filter(Boolean).length === 1;
    const hits = (rule) => rule.keywords.filter(kw => textLower.includes(kw) && !(isQuestion && WEAK.includes(kw)));
    const matchedRule = this.problemRules.find(rule => hits(rule).length);

    if (matchedRule) {
      const foundKeywords = hits(matchedRule);
      return {
        isProblem: true,
        category: matchedRule.category,
        severity: matchedRule.severity,
        diagnosticSummary: matchedRule.diagnosticSummary,
        triggerKeywords: foundKeywords
      };
    }

    return { isProblem: false };
  }

  /**
   * Check if user is sending a greeting
   */
  isGreeting(userText) {
    const text = userText.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const words = text.split(/\s+/);
    return words.some(w => this.greetingPatterns.includes(w)) ||
           this.greetingPatterns.some(g => text === g || text.startsWith(g + ' '));
  }

  /**
   * Check if user is asking about bot identity
   */
  isIdentityQuery(userText) {
    const text = userText.toLowerCase().trim();
    return this.identityPatterns.some(p => text.includes(p));
  }

  /**
   * Check if query is relevant to Recycle Hub's domain
   */
  isDomainRelevant(userText) {
    const text = userText.toLowerCase();

    // Greetings and identity questions are always OK
    if (this.isGreeting(userText) || this.isIdentityQuery(userText)) return true;

    // Check against domain keywords
    return this.domainKeywords.some(kw => text.includes(kw));
  }

  /**
   * Generate a professional, varied greeting response
   */
  _getGreetingResponse(customerName) {
    const name = customerName && customerName !== 'App Customer' ? `, ${customerName.split(' ')[0]}` : '';
    const greetings = [
      `Hello${name}! Welcome to **Recycle Hub Support**. I'm **Rio AI**, your dedicated support assistant.\n\nI can help you with:\n• 🗓️ **Waste pickup scheduling** and tracking\n• ♻️ **Recycling guidelines** and accepted materials\n• 🌿 **Green Points & Rewards** redemption\n• 👤 **Account management** for sellers and buyers\n• 💳 **Billing and payment** queries\n• 🔧 **Technical issues** and escalations\n\nWhat can I assist you with today?`,
      `Hi there${name}! Great to hear from you. I'm **Rio AI**, the intelligent support assistant for **Recycle Hub**.\n\nFeel free to ask me anything about our platform — from scheduling pickups and understanding our reward system, to resolving account or payment issues. How may I help you?`,
      `Good day${name}! I'm **Rio AI**, ready to assist you with all your **Recycle Hub** queries.\n\nWhether you need help with waste collection scheduling, your green point rewards, account settings, or reporting an issue — I'm here to provide fast and accurate support. What would you like to know?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Generate a professional bot identity response
   */
  _getIdentityResponse() {
    return `I'm **Rio AI** — the official AI-powered support assistant for **Recycle Hub**.\n\nBuilt on a neural knowledge engine, I'm trained on over **100 curated FAQs** covering every aspect of the Recycle Hub platform, including:\n\n• ♻️ Recycling categories and material guidelines\n• 🚚 Pickup scheduling and logistics\n• 🌿 Green Points reward system\n• 🏢 Seller and corporate buyer portals\n• 💳 Billing, payments, and wallet support\n• 🔧 Technical troubleshooting and escalation\n\nI can also automatically **flag critical issues** and dispatch real-time email alerts to our support team. How can I assist you today?`;
  }

  /**
   * Generate a professional off-topic rejection response (varied)
   */
  _getOffTopicResponse() {
    const responses = [
      `Thank you for reaching out! As a dedicated support assistant for **Recycle Hub**, my knowledge and capabilities are focused exclusively on platform-related topics.\n\nI'm well-equipped to assist you with:\n• Waste pickup scheduling and tracking\n• Recycling material categories and guidelines\n• Green Points, rewards, and redemption\n• Account management for sellers and buyers\n• Payment, billing, and wallet queries\n• Technical issues and incident escalation\n\nPlease feel free to ask any question related to the above, and I'll provide a thorough response immediately.`,

      `I appreciate your message! However, your query appears to fall outside the scope of **Recycle Hub** platform support, which is the domain I'm specifically trained to assist with.\n\nFor the best experience, please direct your question toward topics such as:\n• How to schedule or cancel a waste pickup\n• Understanding your green point rewards\n• Buyer/seller account setup and verification\n• Resolving payment or transaction issues\n• Reporting a technical bug or service disruption\n\nI'm here and ready to help with any of the above!`,

      `I'm afraid that's a topic outside my area of expertise. I'm **Rio AI**, a purpose-built support assistant for the **Recycle Hub** platform, and I'm optimized to handle queries related to our recycling services, logistics, accounts, and rewards ecosystem.\n\nIf you have any questions about our platform — whether it's about waste collection, the corporate buyer portal, your seller account, or an issue you're experiencing — please don't hesitate to ask. I'm always ready to assist!`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Generate a professional fallback when query is in-domain but no KB match found
   */
  _getNoMatchResponse() {
    const responses = [
      `I understand your concern and want to ensure you receive the most accurate assistance. While your question is relevant to **Recycle Hub**, I wasn't able to locate a precise answer in my current knowledge base.\n\nHere's what I recommend:\n• **Rephrase your question** with specific keywords (e.g., "schedule pickup", "green points redemption", "payment failed")\n• **Contact our support team** directly at **recycle.hub.pvt.ltd@gmail.com** for personalized assistance\n• **Browse the FAQ chips** on the left panel for common queries\n\nIf this is an urgent issue, please describe it clearly and I will immediately flag it and dispatch an alert to our team.`,

      `Your query is within the **Recycle Hub** support domain, however, I was unable to retrieve a definitive match from my knowledge base for your specific phrasing.\n\nThis may happen when a question uses phrasing different from our documented FAQs. I'd suggest:\n• Trying a more specific query (e.g., "How do I redeem green points?" instead of "How do points work?")\n• Reaching out to our support team at **recycle.hub.pvt.ltd@gmail.com**\n• Using the **Knowledge Base Manager** to add this as a new FAQ entry for future users\n\nI apologize for any inconvenience and am committed to improving my responses!`,

      `Thank you for your question. While it relates to the **Recycle Hub** platform, I wasn't able to find a matching answer in my trained knowledge base for this specific query.\n\nFor immediate assistance, I recommend contacting our support team at **recycle.hub.pvt.ltd@gmail.com**. Our team typically responds within **24 hours** and can address highly specific or account-related queries that may not be covered in the general FAQ database.\n\nAlternatively, if you're experiencing an urgent issue such as a payment failure or account lockout, please describe it in detail — I'll automatically escalate it to our engineering team.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Generate a professional "thanks / acknowledgement" response
   */
  _getThanksResponse() {
    const responses = [
      `You're very welcome! I'm glad I could help. If you have any further questions about **Recycle Hub**, please don't hesitate to ask. Have a great day! 🌿`,
      `Happy to assist! Feel free to reach out anytime you need help with the **Recycle Hub** platform. 😊`,
      `My pleasure! Is there anything else I can help you with today? I'm here whenever you need support.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Process incoming user message and generate Rio AI response
   */
  async processMessage(userMessageText, customerInfo = {}) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Record User Message
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: userMessageText,
      time: timestamp
    };
    this.sessionHistory.push(userMsg);

    // 2. Check for Problem Flagging & Email Alert Trigger
    const problemAssessment = this.detectProblem(userMessageText);
    let flaggedAlert = null;

    if (problemAssessment.isProblem) {
      const alertPayload = {
        category: problemAssessment.category,
        severity: problemAssessment.severity,
        userQuery: userMessageText,
        diagnosticSummary: problemAssessment.diagnosticSummary,
        triggerKeywords: problemAssessment.triggerKeywords,
        customerInfo: {
          name: customerInfo.name || 'App Customer',
          email: customerInfo.email || 'customer@example.com'
        },
        transcript: this.sessionHistory,
        technicalContext: {
          sessionId: customerInfo.sessionId || 'SESS-' + Date.now(),
          module: 'Web Assistant'
        }
      };

      const dispatchResult = await window.rioEmailAlerts.dispatchAlert(alertPayload);
      flaggedAlert = dispatchResult.payload;
    }

    // 3. Determine response strategy
    const textLower = userMessageText.toLowerCase().trim();
    let botResponseText = '';
    let kbMatch = null;

    // — Handle greetings
    if (this.isGreeting(userMessageText) && userMessageText.trim().split(/\s+/).length <= 5) {
      botResponseText = this._getGreetingResponse(customerInfo.name);
    }
    // — Handle identity questions
    else if (this.isIdentityQuery(userMessageText)) {
      botResponseText = this._getIdentityResponse();
    }
    // — Handle thanks / goodbye
    else if (['thanks', 'thank you', 'thank', 'bye', 'goodbye', 'ok thanks', 'okay thanks'].some(t => textLower === t || textLower.startsWith(t))) {
      botResponseText = this._getThanksResponse();
    }
    // — Handle all other queries
    else {
      const domainRelevant = this.isDomainRelevant(userMessageText);
      // The keyword domain gate alone rejected verbatim KB questions like
      // "When do I get paid?". A strong KB hit overrides it; 3.5 sits between
      // verbatim KB questions (raw score >= 4.3) and off-topic probes (<= 2.9).
      kbMatch = window.rioKB.findBestMatch(userMessageText);
      if (kbMatch && !domainRelevant && kbMatch.score < 3.5) kbMatch = null;

      if (!kbMatch && !domainRelevant && !problemAssessment.isProblem) {
        // Completely off-topic query
        botResponseText = this._getOffTopicResponse();
      } else {
        if (kbMatch) {
          botResponseText = kbMatch.entry.answer;
          if (flaggedAlert) {
            botResponseText += `\n\n📌 **Important**: I have flagged this issue (Reference: **${flaggedAlert.alertId}**). ${flaggedAlert.delivered ? 'A detailed incident report has been emailed to our support team, who will follow up with you.' : 'I could not reach the support inbox just now, so please email recycle.hub.pvt.ltd@gmail.com with this reference.'}`;
          }
        } else if (problemAssessment.isProblem) {
          // Problem detected but no exact KB match — use alert context
          botResponseText = `I understand you are experiencing an issue related to **${problemAssessment.category}**.\n\nI have logged this problem (Incident Reference: **${flaggedAlert.alertId}**). ${flaggedAlert.delivered ? 'A high-priority alert has been emailed to our support team, and a specialist will contact you as soon as possible.' : 'I could not reach the support inbox just now, so please email recycle.hub.pvt.ltd@gmail.com with this reference so a specialist can follow up.'}\n\nIn the meantime, please note down your incident reference number for follow-up purposes. Is there anything else I can assist you with?`;
        } else {
          // In-domain but no KB match
          botResponseText = this._getNoMatchResponse();
        }
      }
    }

    // 4. Record Bot Response
    const botMsg = {
      id: 'msg_' + (Date.now() + 1),
      sender: 'bot',
      text: botResponseText,
      time: timestamp,
      kbMatched: !!kbMatch,
      confidence: kbMatch ? kbMatch.confidence : 0,
      flaggedAlert: flaggedAlert
    };
    this.sessionHistory.push(botMsg);

    return { userMsg, botMsg, flaggedAlert };
  }

  getTranscript() {
    return this.sessionHistory;
  }

  clearHistory() {
    this.sessionHistory = [];
  }
}

window.rioEngine = new RioEngine();
