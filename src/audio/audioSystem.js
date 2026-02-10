/**
 * Stereo Audio System for navigation and interaction sound cues
 * Uses Web Audio API with spatial panning
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;
  }

  /**
   * Play a synth tone with given parameters
   */
  _playTone({ freq = 440, type = 'sine', duration = 0.3, volume = 0.15, pan = 0, delay = 0 } = {}) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    panner.pan.setValueAtTime(pan, now);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Navigate sound — whoosh with stereo sweep
   */
  playNavigate() {
    // Rising tone left to right
    this._playTone({ freq: 200, type: 'sine', duration: 0.6, volume: 0.1, pan: -0.8, delay: 0 });
    this._playTone({ freq: 300, type: 'sine', duration: 0.5, volume: 0.08, pan: 0, delay: 0.1 });
    this._playTone({ freq: 500, type: 'sine', duration: 0.4, volume: 0.06, pan: 0.8, delay: 0.2 });

    // Low hum
    this._playTone({ freq: 80, type: 'triangle', duration: 0.8, volume: 0.12, pan: 0, delay: 0 });
  }

  /**
   * Arrival sound — crystalline chime
   */
  playArrive() {
    this._playTone({ freq: 800, type: 'sine', duration: 0.3, volume: 0.08, pan: -0.3, delay: 0 });
    this._playTone({ freq: 1200, type: 'sine', duration: 0.25, volume: 0.06, pan: 0.3, delay: 0.05 });
    this._playTone({ freq: 1600, type: 'sine', duration: 0.4, volume: 0.04, pan: 0, delay: 0.1 });
  }

  /**
   * Hover sound — subtle blip
   */
  playHover() {
    this._playTone({ freq: 600, type: 'sine', duration: 0.1, volume: 0.05, pan: 0 });
  }

  /**
   * Click sound — crisp tap
   */
  playClick() {
    this._playTone({ freq: 1000, type: 'square', duration: 0.05, volume: 0.08, pan: 0 });
    this._playTone({ freq: 1500, type: 'sine', duration: 0.1, volume: 0.04, pan: 0, delay: 0.03 });
  }
}
