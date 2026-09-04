/**
 * Tigrão Voice & Audio System
 * Centralized voice engine for Tigrão (Astronaut Mascot)
 * Supports audio files with fallback to Brazilian Portuguese Web Speech API + Web Audio communicator effects.
 */

import { AudioSettings } from '../types';
import { sound } from './audio';

export interface SpeakOptions {
  audioSrc?: string;
  id?: string;
  onStart?: () => void;
  onEnd?: () => void;
  priority?: boolean;
}

export interface DialogueItem {
  text: string;
  audioSrc?: string;
  id?: string;
  delayAfter?: number;
}

export type VoiceStateListener = (state: {
  isSpeaking: boolean;
  currentText: string;
  currentId?: string;
}) => void;

class TigraoVoiceEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isSpeakingInternal: boolean = false;
  private currentTextInternal: string = '';
  private currentIdInternal?: string;
  private queue: Array<{ item: DialogueItem; onEnd?: () => void }> = [];
  private listeners: Set<VoiceStateListener> = new Set();
  private queueTimer: NodeJS.Timeout | null = null;
  private cachedPtVoice: SpeechSynthesisVoice | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  public settings: AudioSettings = {
    voiceVolume: 0.95,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    isMuted: false,
    voiceEnabled: true,
    musicEnabled: true,
    voiceFilter: 'space_helmet',
    voiceTone: 'energetic_young',
    selectedVoiceURI: undefined,
  };

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.refreshVoices();
      };
    }
  }

  public refreshVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    this.availableVoices = window.speechSynthesis.getVoices() || [];
    this.cachedPtVoice = null;
    return this.availableVoices;
  }

  public getAvailablePtVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0) {
      this.refreshVoices();
    }
    return this.availableVoices.filter(
      (v) =>
        v.lang.replace('_', '-').toLowerCase().startsWith('pt-br') ||
        v.lang.toLowerCase().startsWith('pt')
    );
  }

  public loadSettings() {
    try {
      const saved = localStorage.getItem('ARES3_AUDIO_SETTINGS');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }

  public saveSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.cachedPtVoice = null;
    try {
      localStorage.setItem('ARES3_AUDIO_SETTINGS', JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    sound.sfxVolume = this.settings.sfxVolume;
    sound.enabled = !this.settings.isMuted;
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.effectiveVoiceVolume;
    }
  }

  public get isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }

  public get currentText(): string {
    return this.currentTextInternal;
  }

  public get currentId(): string | undefined {
    return this.currentIdInternal;
  }

  public get effectiveVoiceVolume(): number {
    if (this.settings.isMuted || !this.settings.voiceEnabled) return 0;
    return Math.max(0, Math.min(1, this.settings.voiceVolume));
  }

  public addListener(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current state
    listener({
      isSpeaking: this.isSpeakingInternal,
      currentText: this.currentTextInternal,
      currentId: this.currentIdInternal,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener({
          isSpeaking: this.isSpeakingInternal,
          currentText: this.currentTextInternal,
          currentId: this.currentIdInternal,
        });
      } catch {
        // ignore listener errors
      }
    });
  }

  private findBestPtBrVoice(): SpeechSynthesisVoice | null {
    if (this.cachedPtVoice) return this.cachedPtVoice;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const voices = this.availableVoices.length > 0 ? this.availableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Check if user specifically picked a voice URI
    if (this.settings.selectedVoiceURI) {
      const chosen = voices.find((v) => v.voiceURI === this.settings.selectedVoiceURI);
      if (chosen) {
        this.cachedPtVoice = chosen;
        return chosen;
      }
    }

    const ptVoices = voices.filter(
      (v) =>
        v.lang.replace('_', '-').toLowerCase().startsWith('pt-br') ||
        v.lang.toLowerCase().startsWith('pt')
    );

    // Preference list for youthful, energetic and clear Portuguese voices
    const preferredNames = [
      'Luciano',
      'Daniel',
      'Antonio',
      'Felipe',
      'Google português do Brasil',
      'Microsoft Antonio',
      'Microsoft Daniel',
      'Luciana',
      'Maria',
      'Francisca',
      'pt-BR',
    ];

    for (const name of preferredNames) {
      const match = ptVoices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) {
        this.cachedPtVoice = match;
        return match;
      }
    }

    if (ptVoices.length > 0) {
      this.cachedPtVoice = ptVoices[0];
      return ptVoices[0];
    }

    return null;
  }

  /**
   * Pre-processes physics symbols for clear Brazilian Portuguese pronunciation
   */
  private sanitizeSpeechText(text: string): string {
    return text
      .replace(/Ω/g, ' ohms ')
      .replace(/kΩ/g, ' quilo-ohms ')
      .replace(/MΩ/g, ' mega-ohms ')
      .replace(/(\d+)\s*V\b/g, '$1 volts')
      .replace(/(\d+)\s*A\b/g, '$1 ampères')
      .replace(/(\d+)\s*mA\b/g, '$1 miliampères')
      .replace(/(\d+)\s*W\b/g, '$1 watts')
      .replace(/(\d+)\s*kW\b/g, '$1 quilowatts')
      .replace(/(\d+)\s*kWh\b/g, '$1 quilowatt-hora')
      .replace(/Req/g, 'resistência equivalente')
      .replace(/U\s*=\s*R\s*·\s*I/g, 'U é igual a R vezes I')
      .replace(/P\s*=\s*U\s*·\s*I/g, 'potência é igual a U vezes I')
      .replace(/Q\s*=\s*R\s*·\s*I²\s*·\s*t/g, 'Q é igual a R vezes I ao quadrado vezes o tempo')
      .replace(/([A-E])\)/g, 'alternativa $1')
      .replace(/[•★⚡💡]/g, '')
      .trim();
  }

  /**
   * Calculates pitch and rate dynamically based on the selected tone
   */
  private getToneParameters() {
    switch (this.settings.voiceTone) {
      case 'cheerful_kid':
        return { pitch: 1.35, rate: 1.15 };
      case 'heroic_cadet':
        return { pitch: 1.10, rate: 1.05 };
      case 'calm_mentor':
        return { pitch: 0.95, rate: 0.95 };
      case 'energetic_young':
      default:
        // Young, vibrant, energetic cadet companion
        return { pitch: 1.22, rate: 1.08 };
    }
  }

  /**
   * Speaks a single text dialogue with Tigrão's persona
   */
  public speak(text: string, options: SpeakOptions = {}): void {
    // Clear any previous ongoing speech to prevent overlap
    this.stop(false);

    if (!text || text.trim().length === 0) {
      if (options.onEnd) options.onEnd();
      return;
    }

    this.isSpeakingInternal = true;
    this.currentTextInternal = text;
    this.currentIdInternal = options.id;
    this.notifyListeners();

    if (options.onStart) {
      options.onStart();
    }

    // If voice is disabled or volume is 0, simulate timed reading without sound
    if (!this.settings.voiceEnabled || this.settings.isMuted || this.settings.voiceVolume <= 0) {
      const estimatedDurationMs = Math.max(1200, Math.min(6000, text.length * 50));
      this.queueTimer = setTimeout(() => {
        this.finishSpeaking(options.onEnd);
      }, estimatedDurationMs);
      return;
    }

    // Space filter communicator chirp
    sound.playRadioChirp(this.settings.voiceFilter);

    // Check if an audio file is specified and accessible
    if (options.audioSrc) {
      try {
        const audio = new Audio(options.audioSrc);
        this.currentAudioElement = audio;
        audio.volume = this.effectiveVoiceVolume;

        audio.onended = () => {
          this.currentAudioElement = null;
          sound.playCommsEndBurst(this.settings.voiceFilter);
          this.finishSpeaking(options.onEnd);
        };

        audio.onerror = () => {
          // Audio file failed/missing -> Fallback to Web Speech API
          this.currentAudioElement = null;
          this.speakWithSynthesis(text, options.onEnd);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay blocked or error -> Fallback to speech synthesis
            this.speakWithSynthesis(text, options.onEnd);
          });
        }
        return;
      } catch {
        // Fallback to speech synthesis
      }
    }

    // Standard high-quality Brazilian Web Speech API synthesis
    this.speakWithSynthesis(text, options.onEnd);
  }

  private speakWithSynthesis(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // Speech API not supported -> fallback timer
      const duration = Math.max(1500, Math.min(6000, text.length * 55));
      this.queueTimer = setTimeout(() => {
        this.finishSpeaking(onEnd);
      }, duration);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const spokenText = this.sanitizeSpeechText(text);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      this.currentUtterance = utterance;

      const voice = this.findBestPtBrVoice();
      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang = 'pt-BR';

      // Apply youthful energetic tone parameters
      const { pitch, rate } = this.getToneParameters();
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = this.effectiveVoiceVolume;

      utterance.onend = () => {
        this.currentUtterance = null;
        sound.playCommsEndBurst(this.settings.voiceFilter);
        this.finishSpeaking(onEnd);
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        this.finishSpeaking(onEnd);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.finishSpeaking(onEnd);
    }
  }

  private finishSpeaking(onEnd?: () => void) {
    this.isSpeakingInternal = false;
    this.currentTextInternal = '';
    this.currentIdInternal = undefined;
    this.notifyListeners();

    if (onEnd) {
      onEnd();
    }

    // Process next item in queue if available
    this.processQueue();
  }

  /**
   * Enqueues a sequential list of dialogues (plays sequentially without overlapping)
   */
  public speakSequence(items: DialogueItem[], onAllDone?: () => void): void {
    this.stop();
    if (!items || items.length === 0) {
      if (onAllDone) onAllDone();
      return;
    }

    const first = items[0];
    const rest = items.slice(1);

    this.queue = rest.map((item, idx) => ({
      item,
      onEnd: idx === rest.length - 1 ? onAllDone : undefined,
    }));

    this.speak(first.text, {
      id: first.id,
      audioSrc: first.audioSrc,
      onEnd: () => {
        if (rest.length === 0 && onAllDone) {
          onAllDone();
        } else {
          const delay = first.delayAfter ?? 250;
          this.queueTimer = setTimeout(() => {
            this.processQueue();
          }, delay);
        }
      },
    });
  }

  private processQueue() {
    if (this.queue.length === 0) return;
    const next = this.queue.shift();
    if (!next) return;

    this.speak(next.item.text, {
      id: next.item.id,
      audioSrc: next.item.audioSrc,
      onEnd: next.onEnd,
    });
  }

  /**
   * Skips currently spoken audio immediately and triggers the completion callback
   */
  public skip(): void {
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.currentUtterance = null;
    this.isSpeakingInternal = false;
    this.currentTextInternal = '';
    this.currentIdInternal = undefined;
    this.notifyListeners();

    // Clear remaining queue
    this.queue = [];
  }

  /**
   * Stops all voice audio, resets queues and clears speaking state
   */
  public stop(clearQueue: boolean = true): void {
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.currentUtterance = null;
    this.isSpeakingInternal = false;
    this.currentTextInternal = '';
    this.currentIdInternal = undefined;

    if (clearQueue) {
      this.queue = [];
    }

    this.notifyListeners();
  }
}

export const tigraoVoice = new TigraoVoiceEngine();

/**
 * React hook to observe Tigrão voice speaking state
 */
export function useTigraoVoice() {
  const [state, setState] = React.useState({
    isSpeaking: tigraoVoice.isSpeaking,
    currentText: tigraoVoice.currentText,
    currentId: tigraoVoice.currentId,
  });

  React.useEffect(() => {
    const unsubscribe = tigraoVoice.addListener((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    speak: (text: string, options?: SpeakOptions) => tigraoVoice.speak(text, options),
    speakSequence: (items: DialogueItem[], onAllDone?: () => void) => tigraoVoice.speakSequence(items, onAllDone),
    stop: () => tigraoVoice.stop(),
    skip: () => tigraoVoice.skip(),
  };
}
import React from 'react';
