// AI Sound Reader (Text-to-Speech Engine menggunakan Web Speech Synthesis API)

export interface AISoundReaderState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
}

class AISoundReaderService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: ((state: AISoundReaderState) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.synth);
  }

  public subscribe(listener: (state: AISoundReaderState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(text = '') {
    const isPlaying = Boolean(this.synth?.speaking && !this.synth?.paused);
    const isPaused = Boolean(this.synth?.paused);
    this.listeners.forEach((l) =>
      l({
        isPlaying,
        isPaused,
        currentText: text,
      })
    );
  }

  public speak(text: string, onDone?: () => void): void {
    if (!this.synth) {
      console.warn('Speech synthesis tidak didukung pada browser ini.');
      return;
    }

    // Stop any current voice
    this.stop();

    const cleanText = text.trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID'; // Bahasa Indonesia
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Cari suara bahasa Indonesia jika ada
    const voices = this.synth.getVoices();
    const idVoice = voices.find(
      (v) => v.lang.includes('id') || v.name.toLowerCase().includes('indonesia')
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    utterance.onstart = () => {
      this.notify(cleanText);
    };

    utterance.onend = () => {
      this.notify('');
      if (onDone) onDone();
    };

    utterance.onerror = () => {
      this.notify('');
      if (onDone) onDone();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    this.notify(cleanText);
  }

  public pause(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.notify();
    }
  }

  public resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.notify();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      this.notify('');
    }
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }
}

export const aiSoundReader = new AISoundReaderService();
