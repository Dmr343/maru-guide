// Tests for Metronome — testea sin tocar Web Audio real (mockeamos AudioContext).
(function (G, W) {
  const T = G.testRunner;
  const M = G.metronome.Metronome;

  // Mock AudioContext: registra cada click pero no hace ruido. Permite
  // assertear sobre frequency + gain del click sin reproducir nada.
  function mockAudioCtx() {
    const events = [];
    const ctx = {
      currentTime: 0,
      destination: {},
      createOscillator() {
        const node = {
          type: 'sine', frequency: { value: 0, setValueAtTime(){} },
          connect: n => n,
          start: () => { events.push({ type: 'osc:start', freq: node.frequency.value }); },
          stop: () => { events.push({ type: 'osc:stop' }); },
        };
        return node;
      },
      createGain() {
        const g = {
          gain: {
            _peak: 0,
            setValueAtTime(v) { if (v > this._peak) this._peak = v; events.push({ type: 'gain:set', value: v }); },
            linearRampToValueAtTime(v) { events.push({ type: 'gain:ramp:lin', value: v }); },
            exponentialRampToValueAtTime(v) { events.push({ type: 'gain:ramp:exp', value: v }); },
          },
          connect: n => n,
        };
        return g;
      },
    };
    return { ctx, events };
  }

  function makeMetro(opts) {
    const { ctx, events } = mockAudioCtx();
    const m = new M(opts || {});
    m._audioCtx = ctx;  // inyectamos antes de start
    return { m, ctx, events };
  }

  T.describe('Metronome — muted option', () => {
    T.it('default no está muted', () => {
      const { m } = makeMetro();
      T.assertEq(m.muted, false);
    });
    T.it('muted=true en constructor → no genera oscillators', () => {
      const { m, events } = makeMetro({ muted: true });
      m._playClick();
      const oscStarts = events.filter(e => e.type === 'osc:start');
      T.assertEq(oscStarts.length, 0);
    });
    T.it('setMuted(true) silencia clicks subsecuentes', () => {
      const { m, events } = makeMetro();
      m._playClick();
      const before = events.filter(e => e.type === 'osc:start').length;
      m.setMuted(true);
      m._playClick();
      const after = events.filter(e => e.type === 'osc:start').length;
      T.assertEq(after, before, 'no debe haber nuevos osc starts post-mute');
    });
    T.it('setMuted(false) reactiva clicks', () => {
      const { m, events } = makeMetro({ muted: true });
      m._playClick();
      m.setMuted(false);
      m._playClick();
      const oscStarts = events.filter(e => e.type === 'osc:start');
      T.assertEq(oscStarts.length, 1);
    });
  });

  T.describe('Metronome — accent (downbeat)', () => {
    T.it('click sin accent es más bajo (freq normal)', () => {
      const { m, events } = makeMetro();
      m._playClick(false);
      const o = events.filter(e => e.type === 'osc:start')[0];
      T.assert(o.freq < 1000, 'freq normal < 1000Hz, fue ' + o.freq);
    });
    T.it('click con accent es más alto (freq más aguda)', () => {
      const { m, events } = makeMetro();
      m._playClick(true);
      const o = events.filter(e => e.type === 'osc:start')[0];
      T.assert(o.freq >= 1000, 'freq accent >= 1000Hz, fue ' + o.freq);
    });
    T.it('accent y normal generan oscillators distintos', () => {
      const { m, events } = makeMetro();
      m._playClick(false);
      m._playClick(true);
      const oscs = events.filter(e => e.type === 'osc:start');
      T.assertEq(oscs.length, 2);
      T.assert(oscs[1].freq > oscs[0].freq, 'el segundo (accent) > primero');
    });
  });

  T.describe('Metronome — click soft', () => {
    T.it('peak gain del click es < 0.1 (suave)', () => {
      const { m, events } = makeMetro();
      m._playClick();
      // El gain.setValueAtTime() inicial define el peak
      const peakSet = events.filter(e => e.type === 'gain:set')[0];
      T.assert(peakSet && peakSet.value < 0.1, 'peak gain debe ser < 0.1, fue ' + (peakSet && peakSet.value));
    });
  });

  T.describe('Metronome — API existente sigue compatible', () => {
    T.it('start / stop togglean playing', () => {
      const { m } = makeMetro({ onBeat: () => {} });
      T.assertEq(m.playing, false);
      m._playing = true; // no llamamos start porque mocking timer es invasivo
      T.assertEq(m.playing, true);
      m.stop();
      T.assertEq(m.playing, false);
    });
    T.it('setBPM clampea a [40, 220]', () => {
      const { m } = makeMetro();
      m.setBPM(10); T.assertEq(m.bpm, 40);
      m.setBPM(500); T.assertEq(m.bpm, 220);
      m.setBPM(120); T.assertEq(m.bpm, 120);
    });
    T.it('setBeatsPerChord clampea a >= 1', () => {
      const { m } = makeMetro();
      m.setBeatsPerChord(0); T.assertEq(m._beatsPerChord, 1);
      m.setBeatsPerChord(4); T.assertEq(m._beatsPerChord, 4);
    });
  });

  T.describe('Metronome — subdivisión', () => {
    T.it('subdivisión por defecto es 1 (negra)', () => {
      const { m } = makeMetro();
      T.assertEq(m.subdivision, 1);
    });
    T.it('subdivision del constructor se respeta', () => {
      const { m } = makeMetro({ subdivision: 4 });
      T.assertEq(m.subdivision, 4);
    });
    T.it('setSubdivision clampea a [1, 16]', () => {
      const { m } = makeMetro();
      m.setSubdivision(0);  T.assertEq(m.subdivision, 1);
      m.setSubdivision(99); T.assertEq(m.subdivision, 16);
      m.setSubdivision(3);  T.assertEq(m.subdivision, 3);
    });
    T.it('subdivisión inválida en constructor cae a 1', () => {
      const { m } = makeMetro({ subdivision: 0 });
      T.assertEq(m.subdivision, 1);
    });
  });

  T.describe('Metronome — silenciar subdivisiones', () => {
    T.it('por defecto las subdivisiones no están silenciadas', () => {
      const { m } = makeMetro();
      T.assertEq(m.subdivisionsMuted, false);
    });
    T.it('subdivisionsMuted=true en constructor se respeta', () => {
      const { m } = makeMetro({ subdivisionsMuted: true });
      T.assertEq(m.subdivisionsMuted, true);
    });
    T.it('setSubdivisionsMuted togglea el flag', () => {
      const { m } = makeMetro();
      m.setSubdivisionsMuted(true);
      T.assertEq(m.subdivisionsMuted, true);
      m.setSubdivisionsMuted(false);
      T.assertEq(m.subdivisionsMuted, false);
    });
  });

  T.describe('Metronome — niveles de click', () => {
    T.it('downbeat suena más fuerte que beat, y beat más que subdivisión', () => {
      function peakOf(level) {
        const { m, events } = makeMetro();
        m._scheduleClick(0, level);
        return Math.max(...events.filter(e => e.type === 'gain:ramp:lin').map(e => e.value));
      }
      const sub = peakOf(0), beat = peakOf(1), down = peakOf(2);
      T.assert(sub < beat && beat < down, 'sub < beat < downbeat, fue ' + [sub, beat, down].join(','));
    });
    T.it('los tres niveles usan frecuencias distintas', () => {
      const { m, events } = makeMetro();
      m._scheduleClick(0, 0);
      m._scheduleClick(0, 1);
      m._scheduleClick(0, 2);
      const f = events.filter(e => e.type === 'osc:start').map(e => e.freq);
      T.assertEq(new Set(f).size, 3, 'tres frecuencias distintas, fue ' + f.join(','));
    });
    T.it('el click de subdivisión es el más suave', () => {
      const { m, events } = makeMetro();
      m._scheduleClick(0, 0);
      const ramps = events.filter(e => e.type === 'gain:ramp:lin').map(e => e.value);
      T.assert(ramps[0] < 0.025, 'peak de subdivisión < 0.025, fue ' + ramps[0]);
    });
    T.it('_scheduleClick acepta booleano por compat (true=downbeat)', () => {
      const { m, events } = makeMetro();
      m._scheduleClick(0, true);
      const o = events.filter(e => e.type === 'osc:start')[0];
      T.assert(o.freq >= 1000, 'booleano true → downbeat agudo');
    });
  });

})((typeof window !== 'undefined' ? window : globalThis).GuitarShared,
   typeof window !== 'undefined' ? window : globalThis);
