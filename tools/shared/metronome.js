// Metronome with Web Audio API — works as plain script (file:// safe).
// Attaches Metronome class to window.GuitarShared.metronome.
(function (G) {
  class Metronome {
    constructor({ bpm = 80, beatsPerChord = 4, beatsPerCompas = 4, onBeat, onChordChange, muted = false } = {}) {
      this._bpm            = bpm;
      this._beatsPerChord  = beatsPerChord;
      this._beatsPerCompas = beatsPerCompas;
      this._onBeat         = onBeat        || (() => {});
      this._onChordChange  = onChordChange || (() => {});
      this._muted          = !!muted;
      this._playing  = false;
      this._beats    = 0;
      this._chordIdx = 0;
      this._timer    = null;
      this._startTime = 0;
      this._audioCtx  = null;
    }

    get playing()   { return this._playing; }
    get chordIdx()  { return this._chordIdx; }
    get bpm()       { return this._bpm; }
    get muted()     { return this._muted; }

    setMuted(b) { this._muted = !!b; }

    _getAudioCtx() {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return this._audioCtx;
    }

    // Click suave: 60ms total con envelope rápida. Por defecto offbeat ~440Hz;
    // accent (downbeat) ~880Hz (octava arriba, marca el "1").
    _playClick(accent) {
      if (this._muted) return;
      try {
        const ctx  = this._getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = accent ? 1000 : 600;
        const peak = accent ? 0.06 : 0.04;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } catch (e) {}
    }

    _tick() {
      if (!this._playing) return;
      this._beats++;
      const isDownbeat = ((this._beats - 1) % Math.max(1, this._beatsPerCompas)) === 0;
      this._playClick(isDownbeat);
      this._onBeat(this._beats);

      if (this._beats > 1 && (this._beats - 1) % this._beatsPerChord === 0) {
        this._chordIdx++;
        this._onChordChange(this._chordIdx);
      }

      const elapsed   = performance.now() - this._startTime;
      const nextDelay = (60000 / this._bpm) * (this._beats + 1) - elapsed;
      this._timer = setTimeout(() => this._tick(), Math.max(0, nextDelay));
    }

    start() {
      if (this._playing) return;
      this._playing   = true;
      this._beats     = 0;
      this._chordIdx  = 0;
      this._startTime = performance.now();
      this._tick();
    }

    stop() {
      this._playing = false;
      clearTimeout(this._timer);
    }

    setBPM(bpm) {
      this._bpm = Math.max(40, Math.min(220, bpm));
    }

    setBeatsPerChord(n) {
      this._beatsPerChord = Math.max(1, n);
    }

    reset() {
      this.stop();
      this._beats    = 0;
      this._chordIdx = 0;
    }
  }

  G.metronome = { Metronome };
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
