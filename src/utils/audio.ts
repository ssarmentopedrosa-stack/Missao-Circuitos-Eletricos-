/**
 * Synthesizer sound effects using Web Audio API
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public sfxVolume: number = 0.8;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public get effectiveVolume(): number {
    return this.enabled ? Math.max(0, Math.min(1, this.sfxVolume)) : 0;
  }

  public playClick() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15 * this.effectiveVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01 * this.effectiveVolume, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  public playRadioChirp(filterType: 'space_helmet' | 'clean_studio' | 'vintage_radio' = 'space_helmet') {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    if (filterType === 'clean_studio') return; // Clean studio doesn't need radio chirp
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (filterType === 'vintage_radio') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.05);
        osc.frequency.linearRampToValueAtTime(700, now + 0.09);

        gain.gain.setValueAtTime(0.06 * this.effectiveVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.1);
      } else {
        // Space helmet futuristic high-frequency mic-click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(2200, now + 0.03);
        osc.frequency.exponentialRampToValueAtTime(1750, now + 0.07);

        gain.gain.setValueAtTime(0.09 * this.effectiveVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.08);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // fallback
    }
  }

  public playCommsEndBurst(filterType: 'space_helmet' | 'clean_studio' | 'vintage_radio' = 'space_helmet') {
    if (!this.enabled || this.effectiveVolume <= 0 || filterType === 'clean_studio') return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.03 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // fallback
    }
  }

  public playSuccess() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Arpeggio chime
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2 * this.effectiveVolume, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + i * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch {
      // fallback
    }
  }

  public playError() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.2 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01 * this.effectiveVolume, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // fallback
    }
  }

  public playPowerRestore() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

      gain.gain.setValueAtTime(0.01 * this.effectiveVolume, now);
      gain.gain.linearRampToValueAtTime(0.3 * this.effectiveVolume, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {
      // fallback
    }
  }

  public playTigraoBark() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Friendly sci-fi mascot chirp / bark
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.16);

      gain.gain.setValueAtTime(0.2 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01 * this.effectiveVolume, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // fallback
    }
  }

  public playAlert() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      [0, 0.2].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now + offset);
        osc.frequency.setValueAtTime(600, now + offset + 0.08);

        gain.gain.setValueAtTime(0.12 * this.effectiveVolume, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01 * this.effectiveVolume, now + offset + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch {
      // fallback
    }
  }

  public playFanfare() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = [
        { f: 523.25, t: 0 },
        { f: 659.25, t: 0.12 },
        { f: 783.99, t: 0.24 },
        { f: 1046.50, t: 0.36 },
        { f: 1318.51, t: 0.55 },
      ];
      chord.forEach(({ f, t }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.25 * this.effectiveVolume, now + t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + t + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + 0.6);
      });
    } catch {
      // fallback
    }
  }

  public playMissionStart() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.25);

      gain.gain.setValueAtTime(0.15 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01 * this.effectiveVolume, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // fallback
    }
  }

  public playWarning() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(550, now + 0.08);

      gain.gain.setValueAtTime(0.08 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // fallback
    }
  }

  public playCritical() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(450, now + 0.06);

      gain.gain.setValueAtTime(0.12 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // fallback
    }
  }

  public playCombo(comboMultiplier: number = 2) {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const baseFreq = 523.25; // C5
      const noteFreq = baseFreq * Math.pow(1.15, Math.min(comboMultiplier, 6));

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, now);
      osc.frequency.exponentialRampToValueAtTime(noteFreq * 1.5, now + 0.18);

      gain.gain.setValueAtTime(0.18 * this.effectiveVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // fallback
    }
  }

  public playSpeedBonus() {
    if (!this.enabled || this.effectiveVolume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      [880, 1100, 1320].forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.05);

        gain.gain.setValueAtTime(0.12 * this.effectiveVolume, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001 * this.effectiveVolume, now + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.12);
      });
    } catch {
      // fallback
    }
  }
}

export const sound = new SoundEngine();
