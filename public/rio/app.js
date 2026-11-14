/**
 * App.js - Main Application Orchestrator for Rio AI
 * Connects UI views, Chat Workspace, Knowledge Base Manager, Email Alert Inspector, and Voice Engine.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // State variables
  let currentTab = 'chat';

  // UI Elements
  const navBtns = document.querySelectorAll('.nav-btn');
  const viewSections = document.querySelectorAll('.view-section');
  const toastContainer = document.getElementById('toast-container');
  
  // Chat Elements
  const messagesList = document.getElementById('messages-list');
  const widgetMessagesList = document.getElementById('widget-messages-list');
  const chatInput = document.getElementById('chat-input');
  const widgetChatInput = document.getElementById('widget-chat-input');
  const btnSend = document.getElementById('btn-send');
  const widgetBtnSend = document.getElementById('widget-btn-send');
  const btnMic = document.getElementById('btn-mic');
  const btnClearChat = document.getElementById('btn-clear-chat');
  const btnManualAlert = document.getElementById('btn-manual-alert');

  const voiceDot = document.getElementById('voice-dot');
  const voiceStatusText = document.getElementById('voice-status-text');
  const voiceSubtext = document.getElementById('voice-subtext');
  const soundwaveAnim = document.getElementById('soundwave-anim');
  const chkAutoSpeak = document.getElementById('chk-auto-speak');

  // Customer Profile Elements
  const custNameInput = document.getElementById('cust-name-input');
  const custEmailInput = document.getElementById('cust-email-input');

  // KB Elements
  const kbFeedForm = document.getElementById('kb-feed-form');
  const kbEditId = document.getElementById('kb-edit-id');
  const kbQuestion = document.getElementById('kb-question');
  const kbAnswer = document.getElementById('kb-answer');
  const kbCategory = document.getElementById('kb-category');
  const kbTags = document.getElementById('kb-tags');
  const kbSaveBtn = document.getElementById('kb-save-btn');
  const kbCancelBtn = document.getElementById('kb-cancel-btn');
  const kbTableBody = document.getElementById('kb-table-body');
  const kbTotalCount = document.getElementById('kb-total-count');
  const kbSearchInput = document.getElementById('kb-search-input');
  const kbFilterCat = document.getElementById('kb-filter-cat');
  const btnExportKb = document.getElementById('btn-export-kb');
  const inputImportKb = document.getElementById('input-import-kb');
  const btnResetKb = document.getElementById('btn-reset-kb');

  // Email Alert Elements
  const emailConfigForm = document.getElementById('email-config-form');
  const cfgAdminEmail = document.getElementById('cfg-admin-email');
  const cfgEmailProvider = document.getElementById('cfg-email-provider');
  const providerExtraFields = document.getElementById('provider-extra-fields');
  const fieldsGmailScript = document.getElementById('fields-gmail-script');
  const fieldsEmailjs = document.getElementById('fields-emailjs');
  const fieldsWebhook = document.getElementById('fields-webhook');
  const cfgGmailScriptUrl = document.getElementById('cfg-gmail-script-url');
  const cfgEmailjsService = document.getElementById('cfg-emailjs-service');
  const cfgEmailjsTemplate = document.getElementById('cfg-emailjs-template');
  const cfgEmailjsKey = document.getElementById('cfg-emailjs-key');
  const cfgWebhookUrl = document.getElementById('cfg-webhook-url');
  const btnTestEmailDispatch = document.getElementById('btn-test-email-dispatch');
  
  const alertLogCount = document.getElementById('alert-log-count');
  const alertCountBadge = document.getElementById('alert-count-badge');
  const alertLogsTbody = document.getElementById('alert-logs-tbody');
  const btnClearAlertLogs = document.getElementById('btn-clear-alert-logs');

  const inspectorEmptyState = document.getElementById('inspector-empty-state');
  const inspectorContent = document.getElementById('inspector-content');
  const inspectorStatusBadge = document.getElementById('inspector-status-badge');
  const inspTo = document.getElementById('insp-to');
  const inspSubject = document.getElementById('insp-subject');
  const inspTime = document.getElementById('insp-time');
  const inspTextBody = document.getElementById('insp-text-body');

  // Voice Elements
  const voiceSelect = document.getElementById('voice-select');
  const voiceRate = document.getElementById('voice-rate');
  const voicePitch = document.getElementById('voice-pitch');
  const lblVoiceRate = document.getElementById('lbl-voice-rate');
  const lblVoicePitch = document.getElementById('lbl-voice-pitch');
  const btnTestVoiceSpeech = document.getElementById('btn-test-voice-speech');
  const btnToggleMicSandbox = document.getElementById('btn-toggle-mic-sandbox');
  const voiceSandboxIcon = document.getElementById('voice-sandbox-icon');
  const voiceSandboxStatus = document.getElementById('voice-sandbox-status');
  const voiceSandboxResult = document.getElementById('voice-sandbox-result');

  // Widget Launcher
  const rioWidgetLauncher = document.getElementById('rio-widget-launcher');
  const rioWidgetDrawer = document.getElementById('rio-widget-drawer');
  const btnCloseWidget = document.getElementById('btn-close-widget');
  const btnToggleWidget = document.getElementById('btn-toggle-widget');

  // --- INITIALIZATION ---
  function init() {
    initCursorSpotlight();
    setupTabNavigation();
    renderWelcomeMessage();
    renderKnowledgeBaseTable();
    loadEmailSettings();
    renderAlertLogs();
    initVoiceControls();
    setupEventListeners();
    init3DCursorCardTilt();
    initButtonRippleFX();
  }

  // Real-time Cursor Spotlight Tracker
  function initCursorSpotlight() {
    window.addEventListener('mousemove', (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    });
  }

  // Interactive Button Click Ripple Effect
  function initButtonRippleFX() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button:not(.rio-widget-launcher), .btn-primary, .btn-secondary, .chip-btn');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        pointer-events: none;
        width: ${Math.max(rect.width, rect.height) * 2}px;
        height: ${Math.max(rect.width, rect.height) * 2}px;
        left: ${e.clientX - rect.left - Math.max(rect.width, rect.height)}px;
        top: ${e.clientY - rect.top - Math.max(rect.width, rect.height)}px;
      `;

      if (window.getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
      }
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);

      if (window.gsap) {
        gsap.to(ripple, {
          scale: 1,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => ripple.remove()
        });
      } else {
        setTimeout(() => ripple.remove(), 500);
      }
    });
  }

  // 3D Cursor Card Tilt Motion Engine
  function init3DCursorCardTilt() {
    if (!window.gsap) return;

    document.querySelectorAll('.card, .sidebar-box').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = -((y - centerY) / centerY) * 7;
        const rotateY = ((x - centerX) / centerX) * 7;

        gsap.to(card, {
          rotateX: rotateX,
          rotateY: rotateY,
          transformPerspective: 1000,
          duration: 0.25,
          ease: "power1.out"
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.4,
          ease: "power2.out"
        });
      });
    });
  }

  // Toast Notification Helper with GSAP Entrance
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    if (window.gsap) {
      gsap.fromTo(toast, 
        { opacity: 0, x: 50, scale: 0.9 }, 
        { opacity: 1, x: 0, scale: 1, duration: 0.35, ease: "back.out(1.3)" }
      );
    }

    setTimeout(() => {
      if (window.gsap) {
        gsap.to(toast, {
          opacity: 0,
          x: 30,
          duration: 0.25,
          onComplete: () => toast.remove()
        });
      } else {
        toast.remove();
      }
    }, 4000);
  }

  // Navigation with GSAP View Transition
  function setupTabNavigation() {
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        viewSections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const targetView = document.getElementById(`view-${tab}`);
        targetView.classList.add('active');
        currentTab = tab;

        if (window.gsap) {
          gsap.fromTo(targetView, 
            { opacity: 0, y: 20, scale: 0.97 }, 
            { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.2)" }
          );
        }
      });
    });
  }

  // --- CHAT LOGIC ---
  function renderWelcomeMessage() {
    const welcomeText = `Welcome to **Recycle Hub Support**! I'm **Rio AI** — your intelligent, always-on support assistant.\n\nI can help you with:\n• 🗓️ **Pickup scheduling** and waste collection\n• ♻️ **Recycling guidelines** and material categories\n• 🌿 **Green Points & Rewards** management\n• 👤 **Account setup** and login assistance\n• 💳 **Billing, payments** and wallet queries\n• 🔧 **Technical issues** and incident reporting\n\nHow can I assist you with your recycling journey today?`;
    const msg = {
      id: 'msg_welcome',
      sender: 'bot',
      text: welcomeText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    appendMessageToUI(msg);
  }

  /**
   * Format raw text with markdown-like rendering:
   * - **bold** → <strong>
   * - • bullet lines → <li> list items
   * - \n → <br> or paragraph breaks
   */
  function formatMessageText(rawText) {
    // Bold
    let html = rawText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet points (lines starting with • or -)
    const lines = html.split('\n');
    const processed = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^[•\-]\s/.test(line.trim());

      if (isBullet) {
        if (!inList) {
          processed.push('<ul class="msg-list">');
          inList = true;
        }
        processed.push(`<li>${line.trim().replace(/^[•\-]\s/, '')}</li>`);
      } else {
        if (inList) {
          processed.push('</ul>');
          inList = false;
        }
        if (line.trim() === '') {
          processed.push('<br>');
        } else {
          processed.push(line);
        }
      }
    }
    if (inList) processed.push('</ul>');

    return processed.join('\n').replace(/\n(?!<)/g, '<br>');
  }

  function showTypingIndicator() {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper bot';
    wrapper.id = 'typing-indicator-wrapper';

    const avatarHtml = `<div class="brand-avatar" style="width:34px; height:34px;"><img src="assets/rio_logo.png" alt="Rio AI" class="rio-bird-avatar"></div>`;
    wrapper.innerHTML = `
      ${avatarHtml}
      <div class="msg-content">
        <div class="msg-bubble typing-bubble">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;

    messagesList.appendChild(wrapper);
    messagesList.scrollTop = messagesList.scrollHeight;

    // Also add to widget
    const widgetClone = wrapper.cloneNode(true);
    widgetClone.id = 'typing-indicator-widget';
    widgetMessagesList.appendChild(widgetClone);
    widgetMessagesList.scrollTop = widgetMessagesList.scrollHeight;

    if (window.gsap) {
      gsap.fromTo([wrapper, widgetClone],
        { opacity: 0, y: 10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' }
      );
    }
  }

  function removeTypingIndicator() {
    const main = document.getElementById('typing-indicator-wrapper');
    const widget = document.getElementById('typing-indicator-widget');
    if (main) main.remove();
    if (widget) widget.remove();
  }

  function appendMessageToUI(msg) {
    const isUser = msg.sender === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `msg-wrapper ${isUser ? 'user' : 'bot'}`;

    const formattedText = isUser
      ? msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
      : formatMessageText(msg.text);

    let alertBannerHtml = '';
    if (msg.flaggedAlert) {
      alertBannerHtml = `
        <div class="alert-banner">
          <i class="fa-solid fa-triangle-exclamation alert-banner-icon"></i>
          <div>
            <strong>Incident Flagged &amp; Email Dispatched</strong><br>
            Category: <em>${msg.flaggedAlert.category}</em> — Severity: <span class="sev-inline ${msg.flaggedAlert.severity.toLowerCase()}">${msg.flaggedAlert.severity}</span><br>
            Reported to: <em>${msg.flaggedAlert.recipient}</em> &nbsp;|&nbsp; Ref: <strong>${msg.flaggedAlert.alertId}</strong>
          </div>
        </div>
      `;
    }

    let confidencePill = '';
    if (msg.confidence && msg.confidence > 0) {
      const confColor = msg.confidence >= 70 ? 'var(--emerald)' : msg.confidence >= 40 ? 'var(--amber)' : 'var(--indigo-light)';
      confidencePill = `<span class="conf-pill" style="background: ${confColor}22; color: ${confColor}; border: 1px solid ${confColor}44;">KB Match: ${msg.confidence}%</span>`;
    }

    const listenBtnHtml = !isUser ? `
      <button class="btn-icon btn-speak-msg" style="width: 26px; height: 26px; font-size: 0.72rem; flex-shrink:0;" title="Listen with Rio Voice">
        <i class="fa-solid fa-volume-high"></i>
      </button>
    ` : '';

    const avatarHtml = isUser
      ? `<div class="msg-avatar"><i class="fa-solid fa-user" style="font-size:0.75rem;"></i></div>`
      : `<div class="brand-avatar" style="width:34px; height:34px;"><img src="assets/rio_logo.png" alt="Rio AI" class="rio-bird-avatar"></div>`;

    wrapper.innerHTML = `
      ${avatarHtml}
      <div class="msg-content">
        <div class="msg-bubble">
          <div class="msg-text">${formattedText}</div>
          ${alertBannerHtml}
        </div>
        <div class="msg-meta">
          <span class="msg-time">${msg.time}</span>
          ${confidencePill}
          ${listenBtnHtml}
        </div>
      </div>
    `;

    // Speak message listener
    const speakBtn = wrapper.querySelector('.btn-speak-msg');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        window.rioVoice.speak(msg.text);
      });
    }

    messagesList.appendChild(wrapper);
    const widgetClone = wrapper.cloneNode(true);
    widgetClone.querySelector('.btn-speak-msg') && widgetClone.querySelector('.btn-speak-msg').addEventListener('click', () => window.rioVoice.speak(msg.text));
    widgetMessagesList.appendChild(widgetClone);

    messagesList.scrollTop = messagesList.scrollHeight;
    widgetMessagesList.scrollTop = widgetMessagesList.scrollHeight;

    if (window.gsap) {
      gsap.fromTo([wrapper, widgetClone],
        { opacity: 0, y: 18, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
      );
    }
  }

  async function handleSendMessage(inputElement) {
    const text = inputElement.value.trim();
    if (!text) return;

    inputElement.value = '';

    const customerInfo = {
      name: custNameInput.value.trim() || 'App Customer',
      email: custEmailInput.value.trim() || 'customer@recyclehub.app'
    };

    // Render User Message immediately
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    appendMessageToUI(userMsg);

    // Show animated typing indicator while processing
    showTypingIndicator();

    // Small delay to simulate natural response time
    await new Promise(resolve => setTimeout(resolve, 650));

    // Process through Rio AI Engine
    const result = await window.rioEngine.processMessage(text, customerInfo);

    // Remove typing indicator & show bot response
    removeTypingIndicator();
    appendMessageToUI(result.botMsg);

    // If an alert was flagged, show toast & update alert tab
    if (result.flaggedAlert) {
      showToast(`🚨 Incident Flagged! Alert dispatched to ${result.flaggedAlert.recipient}`, 'error');
      renderAlertLogs();
    }

    // Auto Voice Response if enabled
    if (chkAutoSpeak.checked) {
      window.rioVoice.speak(result.botMsg.text);
    }
  }

  // --- KNOWLEDGE BASE MANAGER ---
  function renderKnowledgeBaseTable() {
    const entries = window.rioKB.getAll();
    const query = kbSearchInput.value.toLowerCase().trim();
    const selectedCat = kbFilterCat.value;

    kbTotalCount.textContent = entries.length;
    kbTableBody.innerHTML = '';

    const filtered = entries.filter(item => {
      const matchSearch = item.question.toLowerCase().includes(query) || 
                          item.answer.toLowerCase().includes(query) ||
                          item.tags.some(t => t.toLowerCase().includes(query));
      const matchCat = selectedCat === 'ALL' || item.category === selectedCat;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      kbTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No Knowledge Base entries found. Add a new query above!</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600; color: #fff; margin-bottom: 0.2rem;">${item.question}</div>
          <span class="tag-pill">${item.category}</span>
          ${item.tags.map(t => `<span class="tag-pill" style="opacity:0.7;">#${t}</span>`).join(' ')}
        </td>
        <td style="color: var(--text-main); font-size: 0.85rem;">
          ${item.answer.length > 120 ? item.answer.substring(0, 120) + '...' : item.answer}
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn-icon btn-edit-kb" style="width:28px; height:28px;" data-id="${item.id}" title="Edit Entry">
              <i class="fa-solid fa-pen-to-square" style="font-size: 0.75rem;"></i>
            </button>
            <button class="btn-icon btn-delete-kb" style="width:28px; height:28px; color: var(--accent-rose);" data-id="${item.id}" title="Delete Entry">
              <i class="fa-solid fa-trash-can" style="font-size: 0.75rem;"></i>
            </button>
          </div>
        </td>
      `;

      // Edit Event
      tr.querySelector('.btn-edit-kb').addEventListener('click', () => {
        kbEditId.value = item.id;
        kbQuestion.value = item.question;
        kbAnswer.value = item.answer;
        kbCategory.value = item.category;
        kbTags.value = item.tags.join(', ');
        kbSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Update Knowledge`;
        kbCancelBtn.style.display = 'inline-flex';
        kbQuestion.focus();
      });

      // Delete Event
      tr.querySelector('.btn-delete-kb').addEventListener('click', () => {
        if (confirm(`Delete KB item: "${item.question}"?`)) {
          window.rioKB.deleteEntry(item.id);
          renderKnowledgeBaseTable();
          showToast('Knowledge item deleted.', 'info');
        }
      });

      kbTableBody.appendChild(tr);
    });
  }

  kbFeedForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = kbEditId.value;
    const entryData = {
      question: kbQuestion.value,
      answer: kbAnswer.value,
      category: kbCategory.value,
      tags: kbTags.value
    };

    if (id) {
      window.rioKB.updateEntry(id, entryData);
      showToast('Knowledge entry updated successfully!', 'success');
    } else {
      window.rioKB.addEntry(entryData);
      showToast('New Knowledge data fed to Rio AI!', 'success');
    }

    resetKbForm();
    renderKnowledgeBaseTable();
  });

  function resetKbForm() {
    kbEditId.value = '';
    kbFeedForm.reset();
    kbSaveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Feed & Save Knowledge`;
    kbCancelBtn.style.display = 'none';
  }

  kbCancelBtn.addEventListener('click', resetKbForm);
  kbSearchInput.addEventListener('input', renderKnowledgeBaseTable);
  kbFilterCat.addEventListener('change', renderKnowledgeBaseTable);

  btnExportKb.addEventListener('click', () => {
    const jsonStr = window.rioKB.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rio_ai_kb_${Date.now()}.json`;
    a.click();
    showToast('Knowledge Base exported as JSON', 'success');
  });

  inputImportKb.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (window.rioKB.importJSON(event.target.result)) {
          renderKnowledgeBaseTable();
          showToast('Knowledge Base JSON imported successfully!', 'success');
        } else {
          showToast('Failed to import JSON. Check file format.', 'error');
        }
      };
      reader.readAsText(file);
    }
  });

  btnResetKb.addEventListener('click', () => {
    if (confirm('Reset Knowledge Base to initial default seed queries?')) {
      window.rioKB.resetToDefault();
      renderKnowledgeBaseTable();
      showToast('Knowledge Base reset to default seed.', 'info');
    }
  });

  // --- EMAIL ALERTS & DISPATCHER ---
  function loadEmailSettings() {
    const cfg = window.rioEmailAlerts.config;
    cfgAdminEmail.value = cfg.adminEmail || 'recycle.hub.pvt.ltd@gmail.com';
    cfgEmailProvider.value = cfg.emailProvider || 'gmail_script';
    if (cfgGmailScriptUrl) cfgGmailScriptUrl.value = cfg.gmailScriptUrl || '';
    cfgEmailjsService.value = cfg.emailJsServiceId || '';
    cfgEmailjsTemplate.value = cfg.emailJsTemplateId || '';
    cfgEmailjsKey.value = cfg.emailJsPublicKey || '';
    cfgWebhookUrl.value = cfg.webhookUrl || '';

    updateEmailProviderFields();
  }

  function updateEmailProviderFields() {
    const provider = cfgEmailProvider.value;
    if (provider === 'simulation') {
      providerExtraFields.style.display = 'none';
    } else if (provider === 'gmail_script') {
      providerExtraFields.style.display = 'block';
      if (fieldsGmailScript) fieldsGmailScript.style.display = 'block';
      if (fieldsEmailjs) fieldsEmailjs.style.display = 'none';
      if (fieldsWebhook) fieldsWebhook.style.display = 'none';
    } else if (provider === 'emailjs') {
      providerExtraFields.style.display = 'block';
      if (fieldsGmailScript) fieldsGmailScript.style.display = 'none';
      if (fieldsEmailjs) fieldsEmailjs.style.display = 'grid';
      if (fieldsWebhook) fieldsWebhook.style.display = 'none';
    } else if (provider === 'webhook') {
      providerExtraFields.style.display = 'block';
      if (fieldsGmailScript) fieldsGmailScript.style.display = 'none';
      if (fieldsEmailjs) fieldsEmailjs.style.display = 'none';
      if (fieldsWebhook) fieldsWebhook.style.display = 'block';
    }
  }

  cfgEmailProvider.addEventListener('change', updateEmailProviderFields);

  emailConfigForm.addEventListener('submit', (e) => {
    e.preventDefault();
    window.rioEmailAlerts.saveConfig({
      adminEmail: cfgAdminEmail.value.trim() || 'recycle.hub.pvt.ltd@gmail.com',
      emailProvider: cfgEmailProvider.value,
      gmailScriptUrl: cfgGmailScriptUrl ? cfgGmailScriptUrl.value.trim() : '',
      emailJsServiceId: cfgEmailjsService.value.trim(),
      emailJsTemplateId: cfgEmailjsTemplate.value.trim(),
      emailJsPublicKey: cfgEmailjsKey.value.trim(),
      webhookUrl: cfgWebhookUrl.value.trim()
    });
    showToast('Email Alert settings saved! Target Developer Mail: ' + (cfgAdminEmail.value.trim() || 'recycle.hub.pvt.ltd@gmail.com'), 'success');
  });

  btnTestEmailDispatch.addEventListener('click', async () => {
    const testPayload = {
      category: 'System Health Diagnostic',
      severity: 'HIGH',
      userQuery: 'Manual diagnostic report triggered from Rio AI Admin Console',
      diagnosticSummary: 'System administrator executed a diagnostic check to verify email gateway connectivity.',
      triggerKeywords: ['system_health', 'diagnostics'],
      customerInfo: { name: 'System Admin', email: 'admin@recyclehub.app' }
    };
    const res = await window.rioEmailAlerts.dispatchAlert(testPayload);
    renderAlertLogs();
    inspectAlert(res.payload);
    showToast(`Diagnostic report dispatched to recycle.hub.pvt.ltd@gmail.com!`, 'success');
  });

  function renderAlertLogs() {
    const logs = window.rioEmailAlerts.logs;
    alertLogCount.textContent = logs.length;
    alertCountBadge.textContent = logs.length;

    alertLogsTbody.innerHTML = '';

    if (logs.length === 0) {
      alertLogsTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No problem alerts flagged yet. Try typing an issue in Chat Workspace!</td></tr>`;
      return;
    }

    logs.forEach((log, index) => {
      const tr = document.createElement('tr');
      const sevClass = log.severity === 'CRITICAL' ? 'severity-critical' : log.severity === 'HIGH' ? 'severity-high' : 'severity-medium';
      
      tr.innerHTML = `
        <td>
          <span class="severity-pill ${sevClass}">${log.severity}</span>
          <div style="font-size:0.725rem; color:var(--text-dim); margin-top:0.2rem;">${log.timestamp}</div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--accent-cyan); font-size:0.8rem;">${log.category}</div>
          <div style="color:#fff; font-size:0.825rem;">"${log.userQuery}"</div>
        </td>
        <td>
          <button class="btn-secondary btn-inspect-alert" style="font-size:0.75rem; padding:0.3rem 0.6rem;" data-index="${index}">
            <i class="fa-solid fa-eye"></i> Inspect Mail
          </button>
        </td>
      `;

      tr.querySelector('.btn-inspect-alert').addEventListener('click', () => {
        inspectAlert(log);
      });

      alertLogsTbody.appendChild(tr);
    });
  }

  function inspectAlert(log) {
    inspectorEmptyState.style.display = 'none';
    inspectorContent.style.display = 'flex';

    inspectorStatusBadge.textContent = log.status || 'DISPATCHED';
    inspTo.textContent = log.recipient;
    inspSubject.textContent = log.subject;
    inspTime.textContent = log.timestamp;
    inspTextBody.textContent = log.textBody;
  }

  btnClearAlertLogs.addEventListener('click', () => {
    if (confirm('Clear all flagged incident logs?')) {
      window.rioEmailAlerts.clearLogs();
      renderAlertLogs();
      inspectorContent.style.display = 'none';
      inspectorEmptyState.style.display = 'block';
      showToast('Alert logs cleared.', 'info');
    }
  });

  // --- VOICE CONTROLS ---
  function initVoiceControls() {
    setTimeout(() => {
      populateVoiceList();
    }, 500);

    window.rioVoice.onStateChangeCallback = (state) => {
      if (state === 'speaking') {
        voiceDot.className = 'voice-status-dot active';
        voiceStatusText.textContent = 'Rio AI Speaking...';
        soundwaveAnim.classList.remove('paused');
      } else if (state === 'listening') {
        voiceDot.className = 'voice-status-dot active';
        voiceStatusText.textContent = 'Listening to Customer...';
        btnMic.classList.add('recording');
        soundwaveAnim.classList.remove('paused');
      } else {
        voiceDot.className = 'voice-status-dot';
        voiceStatusText.textContent = 'Voice Idle';
        btnMic.classList.remove('recording');
        soundwaveAnim.classList.add('paused');
      }
    };
  }

  function populateVoiceList() {
    const voices = window.rioVoice.getAvailableVoices();
    voiceSelect.innerHTML = '';
    if (voices.length === 0) {
      voiceSelect.innerHTML = `<option value="">System Default Voice</option>`;
      return;
    }

    voices.forEach(v => {
      const option = document.createElement('option');
      option.value = v.name;
      option.textContent = `${v.name} (${v.lang})`;
      if (window.rioVoice.selectedVoice && window.rioVoice.selectedVoice.name === v.name) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
  }

  voiceSelect.addEventListener('change', () => {
    window.rioVoice.setVoiceByName(voiceSelect.value);
  });

  voiceRate.addEventListener('input', () => {
    lblVoiceRate.textContent = voiceRate.value + 'x';
    window.rioVoice.rate = parseFloat(voiceRate.value);
  });

  voicePitch.addEventListener('input', () => {
    lblVoicePitch.textContent = voicePitch.value;
    window.rioVoice.pitch = parseFloat(voicePitch.value);
  });

  btnTestVoiceSpeech.addEventListener('click', () => {
    window.rioVoice.speak("Hello! I am Rio AI. Voice synthesis is fully operational and ready for your customer web application!");
  });

  // Microphone Sandbox Test
  let isSandboxMicActive = false;
  btnToggleMicSandbox.addEventListener('click', () => {
    if (!isSandboxMicActive) {
      isSandboxMicActive = true;
      btnToggleMicSandbox.innerHTML = `<i class="fa-solid fa-square"></i> Stop Voice Test`;
      voiceSandboxStatus.textContent = "Listening... Speak clearly into your mic.";
      voiceSandboxIcon.style.color = "var(--accent-rose)";

      window.rioVoice.startListening(
        (transcript, isFinal) => {
          voiceSandboxResult.textContent = `"${transcript}"`;
          if (isFinal) {
            voiceSandboxStatus.textContent = "Finished listening!";
            isSandboxMicActive = false;
            btnToggleMicSandbox.innerHTML = `<i class="fa-solid fa-microphone"></i> Start Voice Test`;
            voiceSandboxIcon.style.color = "var(--accent-cyan)";
          }
        },
        (state) => {}
      );
    } else {
      window.rioVoice.stopListening();
      isSandboxMicActive = false;
      btnToggleMicSandbox.innerHTML = `<i class="fa-solid fa-microphone"></i> Start Voice Test`;
      voiceSandboxStatus.textContent = "Microphone stopped.";
      voiceSandboxIcon.style.color = "var(--accent-cyan)";
    }
  });

  // Microphone Main Chat Button
  btnMic.addEventListener('click', () => {
    if (window.rioVoice.isListening) {
      window.rioVoice.stopListening();
    } else {
      window.rioVoice.startListening(
        (transcript, isFinal) => {
          chatInput.value = transcript;
          widgetChatInput.value = transcript;
          if (isFinal) {
            handleSendMessage(chatInput);
          }
        },
        () => {}
      );
    }
  });

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    btnSend.addEventListener('click', () => handleSendMessage(chatInput));
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMessage(chatInput);
    });

    widgetBtnSend.addEventListener('click', () => handleSendMessage(widgetChatInput));
    widgetChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMessage(widgetChatInput);
    });

    // Quick query chips
    document.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        chatInput.value = chip.dataset.query;
        handleSendMessage(chatInput);
      });
    });

    btnClearChat.addEventListener('click', () => {
      messagesList.innerHTML = '';
      widgetMessagesList.innerHTML = '';
      window.rioEngine.clearHistory();
      renderWelcomeMessage();
      showToast('Chat history cleared.', 'info');
    });

    btnManualAlert.addEventListener('click', () => {
      const issue = prompt("Describe the problem faced by customer to flag immediately via email alert:");
      if (issue) {
        chatInput.value = issue;
        handleSendMessage(chatInput);
      }
    });

    // Widget Toggling
    rioWidgetLauncher.addEventListener('click', () => {
      rioWidgetDrawer.classList.toggle('open');
    });
    btnCloseWidget.addEventListener('click', () => {
      rioWidgetDrawer.classList.remove('open');
    });
    btnToggleWidget.addEventListener('click', () => {
      rioWidgetDrawer.classList.toggle('open');
    });

    // Copy Code snippets
    document.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.copy;
        const codeText = document.getElementById(targetId).textContent;
        navigator.clipboard.writeText(codeText);
        showToast('Code snippet copied to clipboard!', 'success');
      });
    });
  }

  // Run initial state
  init();
});
