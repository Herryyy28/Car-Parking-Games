/**
 * Web Audio API procedural sound synthesizer for game audio.
 * Zero external audio file dependencies, instant playback, zero latency.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public soundEnabled = true;
  public vibrationEnabled = true;

  private initCtx() {
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

  private triggerHaptic(ms: number | number[] = 30) {
    if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignore haptics errors if unsupported
      }
    }
  }

  // Button Tap Click
  playClick() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic(15);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Vehicle Escape Acceleration
  playEscape() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic(45);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Vehicle Blocked / Bump Honk
  playBlocked() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic([30, 40, 50]);

    // Dual horn tone
    [240, 290].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      gain.gain.setValueAtTime(0.18, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.22);
    });
  }

  // Passenger Boarding Chime
  playPassengerBoard() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic(20);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Combo Celebration Trumpet Fanfare
  playCombo() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic([40, 60, 80]);

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      const time = this.ctx!.currentTime + idx * 0.08;

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(time);
      osc.stop(time + 0.25);
    });
  }

  // Booster Activation Sparkle
  playBooster() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic(60);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Level Complete Fanfare
  playWin() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic([60, 80, 100, 150]);

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.8);
    });
  }

  // Game Over Sad Tone
  playGameOver() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic([100, 80, 120]);

    const notes = [330, 311.13, 293.66, 261.63];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      const time = this.ctx!.currentTime + idx * 0.18;

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(time);
      osc.stop(time + 0.35);
    });
  }

  // Countdown clock tick
  playTick() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic(10);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // Danger zone warning sound (< 10 seconds remaining)
  playTimeWarning() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic([30, 30]);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(740, this.ctx.currentTime);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Playful car/bus horn beep
  playHonk() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic([40, 30, 60]);

    [360, 440].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      gain.gain.setValueAtTime(0.22, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.28);
    });
  }

  // Coin Collection Ding
  playCoin() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.triggerHaptic(20);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
}

export const sounds = new SoundManager();
