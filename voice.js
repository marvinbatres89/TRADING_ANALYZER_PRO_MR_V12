import { VOICE } from "./config.js";

class VoiceAssistant {
  constructor() {
    this.enabled = true;
    this.rate = VOICE.rate;
    this.voice = null;
    this.voices = [];
  }

  async init() {
    if (!("speechSynthesis" in window)) return;

    const load = () => {
      this.voices = window.speechSynthesis.getVoices() || [];

      this.voice =
        this.voices.find(v => /^es-SV$/i.test(v.lang)) ||
        this.voices.find(v => /^es-(MX|US|ES)$/i.test(v.lang)) ||
        this.voices.find(v => /^es/i.test(v.lang)) ||
        this.voices[0] ||
        null;
    };

    load();

    if (!this.voices.length) {
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 900);
        window.speechSynthesis.addEventListener("voiceschanged", () => {
          clearTimeout(timer);
          load();
          resolve();
        }, { once: true });
      });
      load();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) window.speechSynthesis?.cancel();
    return this.enabled;
  }

  speak(text, { replace = true, rate = this.rate } = {}) {
    return new Promise(resolve => {
      if (!this.enabled || !("speechSynthesis" in window) || !text) {
        resolve(false);
        return;
      }

      if (replace) window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(String(text));
      utterance.lang = this.voice?.lang || VOICE.lang;
      utterance.rate = Number(rate) || VOICE.rate;
      utterance.pitch = VOICE.pitch;
      utterance.volume = VOICE.volume;
      if (this.voice) utterance.voice = this.voice;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve(true);
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);

      // Respaldo por si Android no dispara onend.
      setTimeout(finish, Math.max(1800, String(text).length * 95));
    });
  }

  speakCountdownNumber(number) {
    if (!this.enabled || !("speechSynthesis" in window)) return;

    // Cancela solo el número anterior; evita que 0 se amontone con otra voz.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(String(number));
    utterance.lang = this.voice?.lang || VOICE.lang;
    utterance.rate = 1.03;
    utterance.pitch = VOICE.pitch;
    utterance.volume = VOICE.volume;
    if (this.voice) utterance.voice = this.voice;

    window.speechSynthesis.speak(utterance);
  }
}

export const voiceAssistant = new VoiceAssistant();
