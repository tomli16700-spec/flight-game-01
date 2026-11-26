// Skylark Canyon Run — all sound is synthesised with WebAudio.
// No audio files are shipped; every effect is a few oscillators and a gain
// envelope. The context is created on the first user gesture, as browsers
// require, and the engine hum follows the throttle while flying.

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.muted = false;
  }

  // Call from any user gesture (key, click, touch). Safe to call often.
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short tone with a pitch slide and a decay. The building block for
  // every effect except the engine hum.
  blip(startFreq, endFreq, seconds, type, volume) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + seconds);
    gain.gain.setValueAtTime(volume || 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.05);
  }

  ringChime() {
    this.blip(880, 1320, 0.35, 'sine', 0.3);
    this.blip(1320, 1760, 0.3, 'triangle', 0.15);
  }

  starBlip() {
    this.blip(660, 990, 0.18, 'triangle', 0.22);
  }

  fuelBlip() {
    this.blip(440, 660, 0.22, 'sine', 0.22);
  }

  warningBeep() {
    this.blip(520, 480, 0.15, 'square', 0.12);
  }

  // A crash is filtered noise, not a tone.
  crashThud() {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const length = Math.floor(this.context.sampleRate * 0.5);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    this.blip(160, 40, 0.5, 'sawtooth', 0.3);
  }

  fanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.blip(freq, freq, 0.4, 'triangle', 0.25), i * 130);
    });
  }

  // The engine hum starts when flight starts and tracks the throttle.
  startEngine() {
    if (!this.context) return;
    this.stopEngine();
    this.engineOsc = this.context.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 70;
    this.engineFilter = this.context.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0.05;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  setEngine(throttle, speedKnots) {
    if (!this.engineOsc || !this.context) return;
    const now = this.context.currentTime;
    const freq = 55 + throttle * 75 + speedKnots * 0.08;
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.1);
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.04 + throttle * 0.05, now, 0.1);
  }

  stopEngine() {
    if (!this.engineOsc) return;
    try {
      this.engineOsc.stop();
    } catch (error) {
      // Already stopped; nothing to do.
    }
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }
}
