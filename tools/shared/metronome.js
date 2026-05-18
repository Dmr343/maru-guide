// Metronome with Web Audio API — works as plain script (file:// safe).
// Attaches Metronome class to window.GuitarShared.metronome.
//
// Scheduling: lookahead loop. Cada ~25ms revisa qué clicks caen dentro de los
// próximos 100ms y los programa en la clock del AudioContext (ctx.currentTime).
// Esto elimina el jitter de setTimeout y mantiene el compás estable.
//
// Subdivisión: cada tiempo se parte en N clicks (1=negra, 2=corchea, 3=tresillo,
// 4=semicorchea, …). El primer click de cada tiempo es un "beat"; el resto son
// clicks de subdivisión (más suaves). subdivision=1 → comportamiento clásico.
(function (G) {
  const LOOKAHEAD_S       = 0.1;   // 100ms de ventana de scheduling
  const SCHEDULE_TICK_MS  = 25;    // cada cuánto corre el scheduler

  // Niveles de click: 0 = subdivisión (suave), 1 = beat, 2 = downbeat (acento).
  const CLICK_FREQ = [800, 500, 1500];
  const CLICK_PEAK = [0.012, 0.025, 0.09];

  class Metronome {
    constructor({
      bpm = 80,
      beatsPerChord = 4,
      beatsPerCompas = 4,
      subdivision = 1,
      onBeat,
      onTick,
      onChordChange,
      muted = false,
    } = {}) {
      this._bpm            = bpm;
      this._beatsPerChord  = beatsPerChord;
      this._beatsPerCompas = beatsPerCompas;
      this._subdivision    = Math.max(1, Math.floor(subdivision) || 1);
      this._onBeat         = onBeat        || (() => {});
      this._onTick         = onTick        || (() => {});
      this._onChordChange  = onChordChange || (() => {});
      this._muted          = !!muted;
      this._playing  = false;
      this._beats    = 0;
      this._tickInBeat = 0;
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
    get subdivision()    { return this._subdivision; }

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

    // Click programado en audioTime exacto. level: 0 subdivisión, 1 beat,
    // 2 downbeat. Acepta booleano por compat (true=downbeat, false=beat).
    _scheduleClick(audioTime, level) {
      if (this._muted) return;
      const lv = (level === true) ? 2 : (level === false ? 1 : (level | 0));
      try {
        const ctx  = this._getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = CLICK_FREQ[lv] != null ? CLICK_FREQ[lv] : 500;
        const peak = CLICK_PEAK[lv] != null ? CLICK_PEAK[lv] : 0.025;
        gain.gain.setValueAtTime(0.0001, audioTime);
        gain.gain.linearRampToValueAtTime(peak, audioTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.06);
        osc.start(audioTime);
        osc.stop(audioTime + 0.07);
      } catch (e) {}
    }

    // Shim para compatibilidad — programa un click inmediato. Lo usan tests
    // y código legacy. Internamente preferí _scheduleClick(audioTime, level).
    _playClick(accent) {
      const ctx = this._getAudioCtx();
      this._scheduleClick(ctx.currentTime, accent ? 2 : 1);
    }

    _scheduler() {
      if (!this._playing) return;
      const ctx = this._getAudioCtx();
      const sub = Math.max(1, this._subdivision);
      const secPerTick = (60 / this._bpm) / sub;
      while (this._nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
        const noteTime  = this._nextNoteTime;
        const isBeatStart = (this._tickInBeat === 0);
        let isDownbeat = false;
        let level = 0;  // subdivisión
        if (isBeatStart) {
          this._beats++;
          isDownbeat = ((this._beats - 1) % Math.max(1, this._beatsPerCompas)) === 0;
          level = isDownbeat ? 2 : 1;
        }
        this._scheduleClick(noteTime, level);

        // Disparar onBeat / onTick / onChordChange en wall-clock alineado al audio
        const delayMs   = Math.max(0, (noteTime - ctx.currentTime) * 1000);
        const beatNum   = this._beats;
        const tickInBeat = this._tickInBeat;
        const beatInBar = (beatNum - 1 + Math.max(1, this._beatsPerCompas))
                          % Math.max(1, this._beatsPerCompas);
        const isChordTrigger = isBeatStart && beatNum > 1
                          && (beatNum - 1) % this._beatsPerChord === 0;
        const tid = setTimeout(() => {
          this._onTick({
            beatNum, tickInBeat, beatInBar, isBeatStart, isDownbeat,
            subdivision: sub,
          });
          if (isBeatStart) {
            this._onBeat(beatNum);
            if (isChordTrigger) {
              this._chordIdx++;
              this._onChordChange(this._chordIdx);
            }
          }
        }, delayMs);
        this._pendingTimers.push(tid);

        this._nextNoteTime += secPerTick;
        this._tickInBeat = (this._tickInBeat + 1) % sub;
      }
      this._timer = setTimeout(() => this._scheduler(), SCHEDULE_TICK_MS);
    }

    start() {
      if (this._playing) return;
      this._playing    = true;
      this._beats      = 0;
      this._tickInBeat = 0;
      this._chordIdx   = 0;
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

    // Subdivisiones por tiempo (1=negra, 2=corchea, 3=tresillo, 4=semicorchea…).
    setSubdivision(n) {
      this._subdivision = Math.max(1, Math.min(16, Math.floor(n) || 1));
      if (this._tickInBeat >= this._subdivision) this._tickInBeat = 0;
    }

    // Resetea el contador interno de beats. El próximo beat scheduled será
    // detectado como downbeat. Usado por el transport al terminar el preroll.
    resetBeatCount() {
      this._beats = 0;
      this._tickInBeat = 0;
    }

    reset() {
      this.stop();
      this._beats      = 0;
      this._tickInBeat = 0;
      this._chordIdx   = 0;
    }
  }

  G.metronome = { Metronome };
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
