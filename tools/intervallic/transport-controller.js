// TransportController — máquina de estados del playback.
// IIFE, file:// safe. Sin DOM, sin localStorage, sin Web Audio directo.
// Dependencias inyectadas: Clock (puerto), ProgressionModel.
(function (W) {

  function TransportController(opts) {
    opts = opts || {};
    this._clock = opts.clock;
    this._model = opts.model;
    this._BPC   = opts.beatsPerCompas || 4;
    // Cuántos clicks de pre-roll antes de empezar. Separado del compás
    // para que se sienta corto sin afectar el cálculo de downbeat.
    this._prerollBeats = opts.prerollBeats != null ? opts.prerollBeats : 2;
    this._onTransportChange = opts.onTransportChange || function () {};
    this._onBeat            = opts.onBeat            || function () {};

    this._transport        = 'stopped';
    this._chordBeatCount   = 0;
    this._prerollRemaining = 0;
    this._bpm              = opts.bpm != null ? opts.bpm : 100;
    this._muted            = !!opts.muted;
    this._prerollEnabled   = !!opts.prerollEnabled;
    this._tapTimes         = [];

    if (this._clock) {
      const self = this;
      this._clock.onBeat = function (beat) { self._handleBeat(beat); };
    }
  }

  TransportController.prototype.getState = function () {
    return {
      transport: this._transport,
      chordBeatCount: this._chordBeatCount,
      prerollRemaining: this._prerollRemaining,
      bpm: this._bpm,
      muted: this._muted,
      prerollEnabled: this._prerollEnabled,
    };
  };

  TransportController.prototype._emit = function () {
    this._onTransportChange(this.getState());
  };

  TransportController.prototype.togglePlay = function () {
    if (this._transport === 'playing' || this._transport === 'preroll') {
      this.pause();
      return;
    }
    // stopped o paused → arrancar
    if (!this._model || !this._model.progression || this._model.progression.length === 0) return;
    if (this._transport === 'paused') {
      this._transport = 'playing';
      if (this._clock) this._clock.start();
      this._emit();
      return;
    }
    // stopped → playing (o preroll)
    this._chordBeatCount = 0;
    if (this._prerollEnabled) {
      this._transport = 'preroll';
      this._prerollRemaining = this._prerollBeats;
    } else {
      this._transport = 'playing';
    }
    if (this._clock) this._clock.start();
    this._emit();
  };

  TransportController.prototype.pause = function () {
    if (this._transport !== 'playing' && this._transport !== 'preroll') return;
    this._transport = 'paused';
    if (this._clock) this._clock.stop();
    this._emit();
  };

  TransportController.prototype.setBpm = function (n) {
    const v = Math.max(40, Math.min(220, Math.round(Number(n) || 0)));
    if (v === this._bpm) return;
    this._bpm = v;
    if (this._clock) this._clock.setBpm(v);
    this._emit();
  };

  TransportController.prototype.setMuted = function (b) {
    const v = !!b;
    if (v === this._muted) return;
    this._muted = v;
    if (this._clock) this._clock.setMuted(v);
    this._emit();
  };

  // Pure: dado array de timestamps en ms, devuelve BPM o null si insuficientes.
  TransportController.computeBpmFromTaps = function (timestamps) {
    if (!timestamps || timestamps.length < 2) return null;
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avg <= 0) return null;
    return Math.max(40, Math.min(220, Math.round(60000 / avg)));
  };

  const TAP_WINDOW_MS = 2000;
  const TAP_MAX_KEEP  = 4;

  TransportController.prototype.handleTap = function () {
    const now = Date.now();
    this._tapTimes = this._tapTimes.filter(t => now - t <= TAP_WINDOW_MS);
    this._tapTimes.push(now);
    if (this._tapTimes.length > TAP_MAX_KEEP) this._tapTimes.shift();
    const bpm = TransportController.computeBpmFromTaps(this._tapTimes);
    if (bpm != null) this.setBpm(bpm);
    return bpm;
  };

  TransportController.prototype.setPrerollEnabled = function (b) {
    this._prerollEnabled = !!b;
    this._emit();
  };

  TransportController.prototype.stop = function () {
    if (this._transport === 'stopped') return;
    if (this._clock) this._clock.stop();
    this._transport = 'stopped';
    this._chordBeatCount = 0;
    this._prerollRemaining = 0;
    this._emit();
  };

  TransportController.prototype._handleBeat = function (beat) {
    if (this._transport === 'preroll') {
      this._prerollRemaining--;
      if (this._prerollRemaining <= 0) {
        this._transport = 'playing';
        this._chordBeatCount = 0;
      }
      this._emit();
      return;
    }
    if (this._transport !== 'playing') return;
    this._chordBeatCount++;
    const isDownbeat = ((this._chordBeatCount - 1) % this._BPC) === 0;
    const active = this._model && this._model.getActive ? this._model.getActive() : null;
    const target = ((active && active.bars) || 1) * this._BPC;
    this._onBeat({
      beat,
      isDownbeat,
      chordBeatCount: this._chordBeatCount,
      activeIdx: this._model ? this._model.activeIdx : 0,
    });
    if (this._chordBeatCount >= target) {
      this._chordBeatCount = 0;
      if (this._model && this._model.setActiveChord) {
        this._model.setActiveChord(this._model.nextIdx());
      }
    }
  };

  W.TransportController = TransportController;

})(typeof window !== 'undefined' ? window : globalThis);
