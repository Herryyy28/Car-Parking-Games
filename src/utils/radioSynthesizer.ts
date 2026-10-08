/**
 * Procedural In-Cab Radio Synthesizer & Authentic Transit Soundscape.
 * Uses the Web Audio API with zero external dependencies.
 */

export type RadioStation = 'OFF' | 'LOFI' | 'SYNTHWAVE' | 'CITYPOP' | 'FUNK';

export interface StationInfo {
  id: RadioStation;
  name: string;
  tagline: string;
  genre: string;
  bpm: number;
  icon: string;
  color: string;
}

export const RADIO_STATIONS: StationInfo[] = [
  {
    id: 'OFF',
    name: 'Radio Off',
    tagline: 'Pure engine & ambient road sounds',
    genre: 'Mute',
    bpm: 0,
    icon: '🔇',
    color: '#64748b',
  },
  {
    id: 'LOFI',
    name: '94.2 Lofi Chillhop',
    tagline: 'Warm electric piano & mellow beats',
    genre: 'Chillhop / Study Beats',
    bpm: 76,
    icon: '☕',
    color: '#8b5cf6',
  },
  {
    id: 'SYNTHWAVE',
    name: '101.5 Neon Outrun',
    tagline: 'Pulsing 80s analog bass & retro synths',
    genre: 'Synthwave / Retrowave',
    bpm: 118,
    icon: '🌆',
    color: '#ec4899',
  },
  {
    id: 'CITYPOP',
    name: '88.9 Tokyo City Pop',
    tagline: 'Uplifting jazzy chords & groovy brass',
    genre: '80s City Pop / Groove',
    bpm: 112,
    icon: '🌸',
    color: '#06b6d4',
  },
  {
    id: 'FUNK',
    name: '97.7 Metro Funk Express',
    tagline: 'Slap basslines & syncopated rhythms',
    genre: 'Classic Funk & Disco',
    bpm: 120,
    icon: '🕺',
    color: '#f59e0b',
  },
];

class InCabRadioManager {
  private ctx: AudioContext | null = null;
  private currentStation: RadioStation = 'OFF';
  private isPlaying = false;
  private volume = 0.22;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private stepTimer: number | null = null;
  private beatStep = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getStation(): RadioStation {
    return this.currentStation;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setStation(station: RadioStation) {
    this.initCtx();
    this.currentStation = station;

    // Play subtle radio static tuning sound when changing stations
    if (station !== 'OFF') {
      this.playTuningStatic();
    }

    if (station === 'OFF') {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  public nextStation() {
    const list: RadioStation[] = ['OFF', 'LOFI', 'SYNTHWAVE', 'CITYPOP', 'FUNK'];
    const idx = list.indexOf(this.currentStation);
    const nextIdx = (idx + 1) % list.length;
    this.setStation(list[nextIdx]);
  }

  private startMusic() {
    this.stopMusic();
    this.isPlaying = true;
    this.beatStep = 0;
    this.scheduleNextBeat();
  }

  private stopMusic() {
    this.isPlaying = false;
    if (this.stepTimer !== null) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
  }

  private scheduleNextBeat() {
    if (!this.isPlaying || this.currentStation === 'OFF' || !this.ctx) return;

    const station = RADIO_STATIONS.find((s) => s.id === this.currentStation);
    const bpm = station ? station.bpm : 110;
    const stepIntervalMs = (60 / bpm / 4) * 1000; // 16th note interval

    this.playBeatStep(this.currentStation, this.beatStep);
    this.beatStep = (this.beatStep + 1) % 32;

    this.stepTimer = window.setTimeout(() => {
      this.scheduleNextBeat();
    }, stepIntervalMs);
  }

  private playBeatStep(station: RadioStation, step: number) {
    if (!this.ctx || !this.musicGain) return;

    const now = this.ctx.currentTime;

    switch (station) {
      case 'LOFI':
        this.renderLofiStep(step, now);
        break;
      case 'SYNTHWAVE':
        this.renderSynthwaveStep(step, now);
        break;
      case 'CITYPOP':
        this.renderCityPopStep(step, now);
        break;
      case 'FUNK':
        this.renderFunkStep(step, now);
        break;
    }
  }

  // Station 1: Lofi Chillhop (warm chords + subtle drum heartbeat)
  private renderLofiStep(step: number, now: number) {
    if (!this.ctx || !this.musicGain) return;

    // Kick on steps 0 and 10
    if (step === 0 || step === 10) {
      this.synthesizeDrum(now, 110, 35, 0.18, 'sine');
    }

    // Snare / Rimshot on steps 8 and 24
    if (step === 8 || step === 24) {
      this.synthesizeNoiseDrum(now, 0.12, 0.1);
    }

    // Hi-hat on every 2 steps with slight swing
    if (step % 2 === 0) {
      this.synthesizeNoiseDrum(now, 0.04, 0.03);
    }

    // Warm Rhodes electric chord on step 0 and 16
    if (step === 0) {
      // Dmaj9 (D, F#, A, C#)
      [293.66, 369.99, 440.0, 554.37].forEach((f) => this.synthesizeWarmKey(now, f, 0.9, 0.06));
      this.synthesizeBass(now, 146.83, 0.9); // Low D
    } else if (step === 16) {
      // Bm7 (B, D, F#, A)
      [246.94, 293.66, 369.99, 440.0].forEach((f) => this.synthesizeWarmKey(now, f, 0.9, 0.06));
      this.synthesizeBass(now, 123.47, 0.9); // Low B
    }
  }

  // Station 2: Synthwave Neon (16th driving bass + saw leads)
  private renderSynthwaveStep(step: number, now: number) {
    if (!this.ctx || !this.musicGain) return;

    // 4-on-the-floor kick
    if (step % 4 === 0) {
      this.synthesizeDrum(now, 160, 42, 0.15, 'triangle');
    }

    // Snare on 4 and 12 (8 and 24 of 32)
    if (step === 8 || step === 24) {
      this.synthesizeNoiseDrum(now, 0.15, 0.18);
    }

    // Driving 16th arp bassline
    const bassNotes = [110, 110, 110, 130.81, 110, 110, 146.83, 110];
    const note = bassNotes[step % 8];
    this.synthesizeSynthBass(now, note, 0.12);

    // Cosmic lead chord stabs
    if (step === 0 || step === 6 || step === 16 || step === 22) {
      [440, 554.37, 659.25].forEach((f) => this.synthesizeSawLead(now, f, 0.22));
    }
  }

  // Station 3: 80s City Pop (jazzy chords + punchy bass)
  private renderCityPopStep(step: number, now: number) {
    if (!this.ctx || !this.musicGain) return;

    // Disco Kick
    if (step % 4 === 0) {
      this.synthesizeDrum(now, 140, 45, 0.12, 'sine');
    }

    // Snappy Clap/Snare
    if (step === 8 || step === 24) {
      this.synthesizeNoiseDrum(now, 0.1, 0.16);
    }

    // Hi-hat groove
    if (step % 2 === 0) {
      this.synthesizeNoiseDrum(now, 0.03, step % 4 === 2 ? 0.06 : 0.03);
    }

    // Funk Bass
    const funkBass = [130.81, 0, 164.81, 196.0, 0, 130.81, 164.81, 220.0];
    const bNote = funkBass[step % 8];
    if (bNote > 0) {
      this.synthesizeBass(now, bNote, 0.18);
    }

    // Lush 9th Chords
    if (step === 4 || step === 12 || step === 20 || step === 28) {
      [329.63, 392.0, 493.88, 587.33].forEach((f) => this.synthesizeWarmKey(now, f, 0.25, 0.05));
    }
  }

  // Station 4: Classic Funk (syncopated bass & groove)
  private renderFunkStep(step: number, now: number) {
    if (!this.ctx || !this.musicGain) return;

    // Syncopated kick
    if (step === 0 || step === 6 || step === 16 || step === 22) {
      this.synthesizeDrum(now, 150, 40, 0.15, 'triangle');
    }

    // Crisp snare
    if (step === 8 || step === 24) {
      this.synthesizeNoiseDrum(now, 0.12, 0.18);
    }

    // Slap bass riff
    const slapNotes = [98.0, 0, 123.47, 98.0, 146.83, 0, 130.81, 110.0];
    const note = slapNotes[step % 8];
    if (note > 0) {
      this.synthesizeSynthBass(now, note, 0.16);
    }

    // Brass/Wah chord hit
    if (step === 2 || step === 14 || step === 18) {
      [392.0, 493.88, 587.33].forEach((f) => this.synthesizeSawLead(now, f, 0.12));
    }
  }

  // Helper synthesizers
  private synthesizeWarmKey(time: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    g.gain.setValueAtTime(gainVal, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private synthesizeBass(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    g.gain.setValueAtTime(0.12, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private synthesizeSynthBass(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);

    g.gain.setValueAtTime(0.14, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private synthesizeSawLead(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(400, time + duration);

    g.gain.setValueAtTime(0.08, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private synthesizeDrum(time: number, startFreq: number, endFreq: number, duration: number, type: OscillatorType) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    g.gain.setValueAtTime(0.25, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private synthesizeNoiseDrum(time: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    noise.start(time);
  }

  // Authentic Radio Tuning Hiss
  private playTuningStatic() {
    if (!this.ctx || !this.sfxGain) return;
    const duration = 0.18;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    source.start();
  }

  /* =========================================================================
   * Authentic Transit In-Cab SFX (Air brake hiss, hydraulic doors, wipers, etc.)
   * ========================================================================= */

  // 1. Air Brake Hiss (pssshhht) when stopping or starting
  public playAirBrakeHiss() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const duration = 0.35;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + duration);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    source.start();
  }

  // 2. Hydraulic Doors Opening / Closing (chhhk-clack)
  public playHydraulicDoors() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Pneumatic whoosh
    const duration = 0.28;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    source.start();

    // Solid door latch click at end
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.04);
      clickGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);
      osc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    }, 180);
  }

  // 3. Ticketing Fare Card Tap (beep-boop)
  public playFareCardTap() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // 4. Windshield Wiper Squeak (swish-sqk)
  public playWiperSqueak() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(1250, now + 0.12);
    osc.frequency.linearRampToValueAtTime(650, now + 0.24);

    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 5. Custom Horn Synthesizer
  public playCustomHorn(hornType: string) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    switch (hornType) {
      case 'AIR_HORN': {
        // Deep locomotive air horn (180 Hz & 225 Hz dual trumpet with valve hiss)
        [180, 225].forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(0.28, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now);
          osc.stop(now + 0.55);
        });
        // Air hiss tail
        this.playAirBrakeHiss();
        break;
      }

      case 'TRAM_BELL': {
        // European tram double ding (ding... ding!)
        [0, 0.14].forEach((delay) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1760, now + delay); // A6
          g.gain.setValueAtTime(0.3, now + delay);
          g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + delay);
          osc.stop(now + delay + 0.28);
        });
        break;
      }

      case 'LONDON_KLAXON': {
        // Vintage brass "AWOOGA" klaxon
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.38);

        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.42);

        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'PARTY_BOING': {
        // Party spring boing + fanfare
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.32);

        g.gain.setValueAtTime(0.26, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.36);

        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.36);
        break;
      }

      default: {
        // Standard Factory Car Horn
        [360, 440].forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(0.22, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now);
          osc.stop(now + 0.28);
        });
        break;
      }
    }
  }
}

export const inCabRadio = new InCabRadioManager();
