// Metronome with Web Audio API — works as plain script (file:// safe).
// Attaches Metronome class to window.GuitarShared.metronome.
//
// Scheduling: lookahead loop. Cada ~25ms revisa qué clicks caen dentro de los
// próximos 100ms y los programa en la clock del AudioContext (ctx.currentTime).
// Esto elimina el jitter de setTimeout y mantiene el compás estable.
(function (G) {
  const LOOKAHEAD_S       = 0.1;   // 100ms de ventana de scheduling
  const SCHEDULE_TICK_MS  = 25;    // cada cuánto corre el scheduler

  class Metronome {
    constructor({
      bpm = 80,
      beatsPerChord = 4,
      beatsPerCompas = 4,
      onBeat,
      onChordChange,
      muted = false,
    } = {}) {
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
      this._nextNoteTime = 0;
      this._audioCtx  = null;
      this._pendingTimers = [];  // setTimeout ids para callbacks pendientes
    }

    get playing()        { return this._playing; }
    get chordIdx()       { return this._chordIdx; }
    get bpm()            { return this._bpm; }
    get muted()          { return this._muted; }
    get beatsPerCompas() { return this._beatsPerCompas; }

    setMuted(b) { this._muted = !!b; }

    _getAudioCtx() {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._audioCtx.state === 'suspended' && typeof this._audioCtx.resume === 'function') {
        this._audioCtx.resume();
      }
      return this._audioCtx;
    }

    // Click programado en audioTime exacto. Downbeat: 1500Hz, peak 0.09.
    // Beat normal: 500Hz, peak 0.025. Contraste fuerte para que el "1" salte.
    _scheduleClick(audioTime, accent) {
      if (this._muted) return;
      try {
        const ctx  = this._getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = accent ? 1500 : 500;
        const peak = accent ? 0.09 : 0.025;
        gain.gain.setValueAtTime(0.0001, audioTime);
        gain.gain.linearRampToValueAtTime(peak, audioTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.06);
        osc.start(audioTime);
        osc.stop(audioTime + 0.07);
      } catch (e) {}
    }

    // Shim para compatibilidad — programa un click inmediato. Lo usan tests
    // y código legacy. Internamente preferí _scheduleClick(audioTime, accent).
    _playClick(accent) {
      const ctx = this._getAudioCtx();
      this._scheduleClick(ctx.currentTime, accent);
    }

    _scheduler() {
      if (!this._playing) return;
      const ctx = this._getAudioCtx();
      const secPerBeat = 60 / this._bpm;
      while (this._nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
        this._beats++;
        const beatNum = this._beats;
        const isDownbeat = ((beatNum - 1) % Math.max(1, this._beatsPerCompas)) === 0;
        const noteTime = this._nextNoteTime;
        this._scheduleClick(noteTime, isDownbeat);
        // Disparar onBeat / onChordChange en wall-clock alineado al audio
        const delayMs = Math.max(0, (noteTime - ctx.currentTime) * 1000);
        const isChordTrigger = beatNum > 1 && (beatNum - 1) % this._beatsPerChord === 0;
        const tid = setTimeout(() => {
          this._onBeat(beatNum);
          if (isChordTrigger) {
            this._chordIdx++;
            this._onChordChange(this._chordIdx);
          }
        }, delayMs);
        this._pendingTimers.push(tid);
        this._nextNoteTime += secPerBeat;
      }
      this._timer = setTimeout(() => this._scheduler(), SCHEDULE_TICK_MS);
    }

    start() {
      if (this._playing) return;
      this._playing  = true;
      this._beats    = 0;
      this._chordIdx = 0;
      const ctx = this._getAudioCtx();
      // Pequeño offset para evitar click clipping al inicio
      this._nextNoteTime = ctx.currentTime + 0.05;
      this._scheduler();
    }

    stop() {
      this._playing = false;
      clearTimeout(this._timer);
      this._timer = null;
      this._pendingTimers.forEach(id => clearTimeout(id));
      this._pendingTimers = [];
    }

    setBPM(bpm) {
      this._bpm = Math.max(40, Math.min(220, bpm));
    }

    setBeatsPerChord(n) {
      this._beatsPerChord = Math.max(1, n);
    }

    setBeatsPerCompas(n) {
      this._beatsPerCompas = Math.max(1, n);
    }

    // Resetea el contador interno de beats. El próximo beat scheduled será
    // detectado como downbeat. Usado por el transport al terminar el preroll.
    resetBeatCount() {
      this._beats = 0;
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
