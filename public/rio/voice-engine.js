/**
 * VoiceEngine - Web Speech API wrapper for Rio AI Speech-to-Text and Text-to-Speech.
 * Provides voice synthesis, voice recognition, audio visualizer callbacks, and voice selection.
 */

class VoiceEngine {
  constructor() {
    this.isVoiceEnabled = true;
    this.isListening = false;
    this.isSpeaking = false;
    this.selectedVoice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    
    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;

    this.onResultCallback = null;
    this.onStateChangeCallback = null;
    this.onErrorCallback = null;

    this.initRecognition();
    this.initSynthesis();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.notifyStateChange('listening');
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (this.onResultCallback) {
          this.onResultCallback(transcript, event.results[0].isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Voice recognition error:', event.error);
        if (this.onErrorCallback) this.onErrorCallback(event.error);
        this.isListening = false;
        this.notifyStateChange('idle');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.notifyStateChange('idle');
      };
    } else {
      console.warn('Web Speech Recognition API is not supported in this browser.');
    }
  }

  initSynthesis() {
    if (!this.synthesis) return;

    // Load available browser voices
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        // Prefer natural / google / neural English voices if available
        this.selectedVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural')) && v.lang.startsWith('en'))
          || voices.find(v => v.lang.startsWith('en'))
          || voices[0];
      }
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  getAvailableVoices() {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices().filter(v => v.lang.startsWith('en') || v.lang.startsWith('es') || v.lang.startsWith('fr'));
  }

  setVoiceByName(name) {
    const voices = this.getAvailableVoices();
    const voice = voices.find(v => v.name === name);
    if (voice) {
      this.selectedVoice = voice;
    }
  }

  startListening(onResult, onStateChange) {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return false;
    }

    this.onResultCallback = onResult;
    this.onStateChangeCallback = onStateChange;

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition', e);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.notifyStateChange('idle');
    }
  }

  speak(text, onEnd) {
    if (!this.isVoiceEnabled || !this.synthesis || !text) return;

    this.stopSpeaking(); // Cancel any ongoing speech

    // Clean markdown symbols from text before speaking
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.notifyStateChange('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.notifyStateChange('idle');
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      console.warn('Speech synthesis error:', err);
      this.isSpeaking = false;
      this.notifyStateChange('idle');
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.notifyStateChange('idle');
    }
  }

  notifyStateChange(state) {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }
}

window.rioVoice = new VoiceEngine();
