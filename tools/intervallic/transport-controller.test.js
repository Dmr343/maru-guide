// Tests for TransportController — IIFE, sin DOM, sin Web Audio. Usa FakeClock
// y FakeModel inyectados.
(function (G, W) {
  const T = G.testRunner;
  const TC = W.TransportController;
  if (!TC) { console.error('TransportController not loaded'); return; }

  // FakeClock — interfaz mínima del puerto Clock. Tests llaman .tick() para
  // simular beats sin esperar tiempo real.
  function FakeClock() {
    return {
      onBeat: () => {},
      started: false, bpm: 100, muted: false, stopCount: 0,
      start()    { this.started = true; },
      stop()     { this.started = false; this.stopCount++; },
      setBpm(n)  { this.bpm = n; },
      setMuted(b){ this.muted = b; },
      tick(beat = 0) { if (this.started) this.onBeat(beat); },
      tickN(n)   { for (let i = 0; i < n; i++) this.tick(i % 4); },
    };
  }

  // FakeModel — implementa solo la interfaz que el controller usa.
  function FakeModel(initialChords) {
    const chords = (initialChords || []).map(c => Object.assign({}, c));
    let activeIdx = 0;
    return {
      get progression() { return chords; },
      get activeIdx() { return activeIdx; },
      getActive() { return chords[activeIdx] ? Object.assign({}, chords[activeIdx]) : null; },
      nextIdx() {
        if (chords.length <= 0) return 0;
        return (activeIdx + 1) % chords.length;
      },
      setActiveChord(idx) {
        if (idx >= 0 && idx < chords.length) activeIdx = idx;
      },
    };
  }

  function ctx(opts) {
    opts = opts || {};
    const clock = FakeClock();
    const model = FakeModel(opts.chords || [{ root: 'C', quality: 'maj7', bars: 1 }]);
    const events = { transport: [], beats: [] };
    const tc = new TC({
      clock, model,
      beatsPerCompas: 4,
      onTransportChange(s) { events.transport.push(Object.assign({}, s)); },
      onBeat(e)            { events.beats.push(Object.assign({}, e)); },
    });
    return { tc, clock, model, events };
  }

  T.describe('TransportController — transiciones básicas', () => {
    T.it('stopped → playing al togglePlay', () => {
      const { tc, clock } = ctx();
      T.assertEq(tc.getState().transport, 'stopped');
      tc.togglePlay();
      T.assertEq(tc.getState().transport, 'playing');
      T.assertEq(clock.started, true);
    });
    T.it('playing → paused al togglePlay (preserva chordBeatCount)', () => {
      const { tc, clock } = ctx();
      tc.togglePlay();
      clock.tick(0); clock.tick(1);  // 2 beats
      T.assertEq(tc.getState().chordBeatCount, 2);
      tc.togglePlay();
      T.assertEq(tc.getState().transport, 'paused');
      T.assertEq(clock.started, false);
      T.assertEq(tc.getState().chordBeatCount, 2, 'no resetea counter en pause');
    });
    T.it('paused → playing al togglePlay (resume, retoma counter)', () => {
      const { tc, clock } = ctx();
      tc.togglePlay();
      clock.tick(0); clock.tick(1);
      tc.togglePlay();  // pause
      tc.togglePlay();  // resume
      T.assertEq(tc.getState().transport, 'playing');
      T.assertEq(tc.getState().chordBeatCount, 2);
      T.assertEq(clock.started, true);
    });
    T.it('togglePlay con progresión vacía → no muta', () => {
      const { tc } = ctx({ chords: [] });
      tc.togglePlay();
      T.assertEq(tc.getState().transport, 'stopped');
    });
    T.it('onTransportChange se dispara en cada transición', () => {
      const { tc, clock, events } = ctx();
      tc.togglePlay();        // → playing
      tc.togglePlay();        // → paused
      tc.togglePlay();        // → playing
      const states = events.transport.map(s => s.transport);
      T.assertArrayEq(states, ['playing', 'paused', 'playing']);
    });
  });

  T.describe('TransportController — pre-roll', () => {
    T.it('con prerollEnabled=true → entra a preroll en lugar de playing', () => {
      const c = ctx();
      c.tc.setPrerollEnabled(true);
      c.tc.togglePlay();
      T.assertEq(c.tc.getState().transport, 'preroll');
      T.assertEq(c.tc.getState().prerollRemaining, 4);
    });
    T.it('cada tick decrementa prerollRemaining', () => {
      const c = ctx();
      c.tc.setPrerollEnabled(true);
      c.tc.togglePlay();
      c.clock.tick(0);
      T.assertEq(c.tc.getState().prerollRemaining, 3);
      c.clock.tick(1);
      T.assertEq(c.tc.getState().prerollRemaining, 2);
    });
    T.it('al llegar a 0 → transition a playing y chordBeatCount=0', () => {
      const c = ctx();
      c.tc.setPrerollEnabled(true);
      c.tc.togglePlay();
      c.clock.tickN(4);
      T.assertEq(c.tc.getState().transport, 'playing');
      T.assertEq(c.tc.getState().prerollRemaining, 0);
      T.assertEq(c.tc.getState().chordBeatCount, 0);
    });
    T.it('resume desde pause NO repite preroll', () => {
      const c = ctx();
      c.tc.setPrerollEnabled(true);
      c.tc.togglePlay();   // → preroll
      c.clock.tickN(4);    // → playing
      c.clock.tick(0);     // playing beat 1
      c.tc.pause();
      c.tc.togglePlay();   // resume
      T.assertEq(c.tc.getState().transport, 'playing');
      T.assertEq(c.tc.getState().prerollRemaining, 0);
    });
    T.it('stop durante preroll resetea prerollRemaining', () => {
      const c = ctx();
      c.tc.setPrerollEnabled(true);
      c.tc.togglePlay();
      c.clock.tick(0);
      T.assertEq(c.tc.getState().prerollRemaining, 3);
      c.tc.stop();
      T.assertEq(c.tc.getState().prerollRemaining, 0);
      T.assertEq(c.tc.getState().transport, 'stopped');
    });
    T.it('pause durante preroll → paused, preserva prerollRemaining', () => {
      const c = ctx();
      c.tc.setPrerollEnabled(true);
      c.tc.togglePlay();
      c.clock.tick(0);  // prerollRemaining=3
      c.tc.pause();
      T.assertEq(c.tc.getState().transport, 'paused');
      T.assertEq(c.tc.getState().prerollRemaining, 3);
    });
  });

  T.describe('TransportController — avance de chord', () => {
    T.it('bars=1: tras 4 ticks llama model.setActiveChord(nextIdx)', () => {
      const c = ctx({ chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
      ] });
      c.tc.togglePlay();
      c.clock.tickN(4);
      T.assertEq(c.model.activeIdx, 1);
    });
    T.it('bars=2: tras 8 ticks llama setActiveChord', () => {
      const c = ctx({ chords: [
        { root: 'C', quality: 'maj7', bars: 2 },
        { root: 'A', quality: 'min7', bars: 1 },
      ] });
      c.tc.togglePlay();
      c.clock.tickN(7);
      T.assertEq(c.model.activeIdx, 0, 'al beat 7 todavía no avanza');
      c.clock.tick(0);
      T.assertEq(c.model.activeIdx, 1, 'al beat 8 sí avanza');
    });
    T.it('onBeat emite isDownbeat=true en beat 1 y 5', () => {
      const c = ctx({ chords: [{ root:'C', quality:'maj7', bars: 2 }] });
      c.tc.togglePlay();
      c.clock.tickN(8);
      const downbeats = c.events.beats.filter(b => b.isDownbeat);
      T.assertEq(downbeats.length, 2);
      T.assertEq(downbeats[0].chordBeatCount, 1);
      T.assertEq(downbeats[1].chordBeatCount, 5);
    });
    T.it('onBeat emite activeIdx y chordBeatCount actualizados', () => {
      const c = ctx();
      c.tc.togglePlay();
      c.clock.tick(0);
      const last = c.events.beats[c.events.beats.length - 1];
      T.assertEq(last.chordBeatCount, 1);
      T.assertEq(last.activeIdx, 0);
    });
  });

  T.describe('TransportController — BPM', () => {
    T.it('setBpm propaga al clock', () => {
      const c = ctx();
      c.tc.setBpm(120);
      T.assertEq(c.tc.getState().bpm, 120);
      T.assertEq(c.clock.bpm, 120);
    });
    T.it('setBpm(10) clamp a 40', () => {
      const c = ctx();
      c.tc.setBpm(10);
      T.assertEq(c.tc.getState().bpm, 40);
    });
    T.it('setBpm(500) clamp a 220', () => {
      const c = ctx();
      c.tc.setBpm(500);
      T.assertEq(c.tc.getState().bpm, 220);
    });
  });

  T.describe('TransportController — muted', () => {
    T.it('setMuted(true) propaga al clock', () => {
      const c = ctx();
      c.tc.setMuted(true);
      T.assertEq(c.tc.getState().muted, true);
      T.assertEq(c.clock.muted, true);
    });
  });

  T.describe('TransportController — tap tempo', () => {
    T.it('computeBpmFromTaps con < 2 taps → null', () => {
      T.assertEq(TC.computeBpmFromTaps([]), null);
      T.assertEq(TC.computeBpmFromTaps([1000]), null);
    });
    T.it('computeBpmFromTaps con intervalos de 500ms → 120 bpm', () => {
      T.assertEq(TC.computeBpmFromTaps([0, 500]), 120);
    });
    T.it('clamp inferior a 40', () => {
      T.assertEq(TC.computeBpmFromTaps([0, 2000]), 40);
    });
    T.it('handleTap acumula timestamps y devuelve bpm a partir del 2°', () => {
      const c = ctx();
      // Mock Date.now con secuencia controlada
      const orig = Date.now;
      let t = 0;
      Date.now = () => t;
      try {
        t = 1000; T.assertEq(c.tc.handleTap(), null);
        t = 1500; const b = c.tc.handleTap(); T.assertEq(b, 120);
        T.assertEq(c.tc.getState().bpm, 120);
        T.assertEq(c.clock.bpm, 120, 'también propaga al clock');
      } finally { Date.now = orig; }
    });
  });

  T.describe('TransportController — stop', () => {
    T.it('stop() desde playing → stopped + resetea counters', () => {
      const { tc, clock } = ctx();
      tc.togglePlay();
      clock.tickN(3);
      tc.stop();
      T.assertEq(tc.getState().transport, 'stopped');
      T.assertEq(tc.getState().chordBeatCount, 0);
      T.assertEq(tc.getState().prerollRemaining, 0);
      T.assertEq(clock.started, false);
    });
    T.it('stop() desde stopped → no-op', () => {
      const { tc, events } = ctx();
      tc.stop();
      T.assertEq(events.transport.length, 0);
    });
    T.it('stop() desde paused → stopped y limpia', () => {
      const { tc, clock } = ctx();
      tc.togglePlay();
      clock.tick(0);
      tc.pause();
      tc.stop();
      T.assertEq(tc.getState().transport, 'stopped');
      T.assertEq(tc.getState().chordBeatCount, 0);
    });
  });

})((typeof window !== 'undefined' ? window : globalThis).GuitarShared,
   typeof window !== 'undefined' ? window : globalThis);
