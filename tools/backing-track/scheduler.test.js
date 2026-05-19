// Tests para el event scheduler — IIFE, sin DOM ni audio.
// Depende de BackingTrack.voicing (cargá voicing.js antes).
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const BT = W.BackingTrack || {};
  const scheduler = BT.scheduler;
  if (!scheduler || !BT.voicing) {
    console.error('BackingTrack.scheduler / voicing not loaded'); return;
  }

  // Helpers para construir patrones planos.
  function mono(steps) {   // patrón de una sola lane
    return {
      steps: 16, lanes: ['main'],
      hits: steps.map(s => ({ lane: 'main', step: s, velocity: 0.8 })),
    };
  }
  function drumPattern(hits) {
    return { steps: 16, lanes: ['kick', 'snare'], hits: hits };
  }

  const PROG_2 = [
    { root: 'C', quality: 'maj7', bars: 1 },
    { root: 'A', quality: 'min7', bars: 1 },
  ];

  T.describe('scheduler.schedule — estructura del loop', () => {
    T.it('progresión vacía → loop de 0 pasos, sin eventos', () => {
      const r = scheduler.schedule({ progression: [], tracks: [] });
      T.assertEq(r.loopSteps, 0);
      T.assertEq(r.events.length, 0);
    });
    T.it('loopSteps = total de compases × 16', () => {
      const r = scheduler.schedule({ progression: PROG_2, tempo: 120, tracks: [] });
      T.assertEq(r.loopSteps, 32);
    });
    T.it('un acorde de 2 compases ocupa 32 pasos', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 2 }], tracks: [],
      });
      T.assertEq(r.loopSteps, 32);
      T.assertEq(r.chords[0].lengthSteps, 32);
    });
    T.it('stepSeconds a 120 BPM = 0.125 s', () => {
      const r = scheduler.schedule({ progression: PROG_2, tempo: 120, tracks: [] });
      T.assertEq(r.stepSeconds, 0.125);
    });
    T.it('expone la ubicación de cada acorde', () => {
      const r = scheduler.schedule({ progression: PROG_2, tracks: [] });
      T.assertEq(r.chords[0].startStep, 0);
      T.assertEq(r.chords[1].startStep, 16);
    });
  });

  T.describe('scheduler.schedule — pista de bajo', () => {
    const tracks = [{ id: 't1', tipo: 'bajo', patternId: 'p', enabled: true }];
    const patterns = { p: mono([0]) };

    T.it('emite una nota de bajo por acorde', () => {
      const r = scheduler.schedule({ progression: PROG_2, tempo: 120, tracks, patterns });
      T.assertEq(r.events.length, 2);
      T.assertEq(r.events[0].type, 'note');
      T.assertEq(r.events[0].step, 0);
      T.assertEq(r.events[1].step, 16);
    });
    T.it('el bajo toca la fundamental en octava grave', () => {
      const r = scheduler.schedule({ progression: PROG_2, tempo: 120, tracks, patterns });
      T.assertArrayEq(r.events[0].notes, ['C2']);
      T.assertArrayEq(r.events[1].notes, ['A2']);
    });
    T.it('el tiempo en segundos = step × stepSeconds', () => {
      const r = scheduler.schedule({ progression: PROG_2, tempo: 120, tracks, patterns });
      T.assertEq(r.events[1].time, 16 * 0.125);
    });
    T.it('un patrón con 2 hits dispara 2 notas por compás', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        tempo: 120, tracks, patterns: { p: mono([0, 8]) },
      });
      T.assertEq(r.events.length, 2);
      T.assertEq(r.events[0].durationSteps, 8);
      T.assertEq(r.events[1].durationSteps, 8);
    });
  });

  T.describe('scheduler.schedule — repetición por compás', () => {
    T.it('un acorde de 2 compases repite el patrón en cada compás', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 2 }],
        tempo: 120,
        tracks: [{ id: 't1', tipo: 'bajo', patternId: 'p', enabled: true }],
        patterns: { p: mono([0]) },
      });
      T.assertEq(r.events.length, 2);
      T.assertEq(r.events[0].step, 0);
      T.assertEq(r.events[1].step, 16);
    });
  });

  T.describe('scheduler.schedule — pista de acordes', () => {
    T.it('emite el voicing completo del acorde', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        tempo: 120,
        tracks: [{ id: 'c', tipo: 'acordes', patternId: 'p', enabled: true }],
        patterns: { p: mono([0]) },
      });
      T.assertArrayEq(r.events[0].notes, ['C3', 'E3', 'G3', 'B3']);
    });
  });

  T.describe('scheduler.schedule — pad sostenido', () => {
    T.it('emite una nota larga por acorde, sin patrón', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 2 }],
        tempo: 120,
        tracks: [{ id: 'pad', tipo: 'pad', enabled: true }],
        patterns: {},
      });
      T.assertEq(r.events.length, 1);
      T.assertEq(r.events[0].durationSteps, 32);
    });
  });

  T.describe('scheduler.schedule — batería', () => {
    T.it('emite un evento de golpe por hit y por lane', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        tempo: 120,
        tracks: [{ id: 'd', tipo: 'bateria', patternId: 'p', enabled: true }],
        patterns: { p: drumPattern([
          { lane: 'kick', step: 0, velocity: 1 },
          { lane: 'snare', step: 4, velocity: 0.8 },
        ]) },
      });
      T.assertEq(r.events.length, 2);
      T.assertEq(r.events[0].type, 'hit');
      T.assertEq(r.events[0].lane, 'kick');
      T.assertEq(r.events[1].lane, 'snare');
    });
  });

  T.describe('scheduler.schedule — pistas y robustez', () => {
    T.it('ignora las pistas deshabilitadas', () => {
      const r = scheduler.schedule({
        progression: PROG_2, tempo: 120,
        tracks: [{ id: 't1', tipo: 'bajo', patternId: 'p', enabled: false }],
        patterns: { p: mono([0]) },
      });
      T.assertEq(r.events.length, 0);
    });
    T.it('una pista sin patrón válido no emite eventos', () => {
      const r = scheduler.schedule({
        progression: PROG_2, tempo: 120,
        tracks: [{ id: 't1', tipo: 'bajo', patternId: 'inexistente', enabled: true }],
        patterns: {},
      });
      T.assertEq(r.events.length, 0);
    });
    T.it('conserva la velocity del hit del patrón', () => {
      const r = scheduler.schedule({
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        tempo: 120,
        tracks: [{ id: 't1', tipo: 'bajo', patternId: 'p', enabled: true }],
        patterns: { p: { steps: 16, lanes: ['main'],
          hits: [{ lane: 'main', step: 0, velocity: 0.42 }] } },
      });
      T.assertEq(r.events[0].velocity, 0.42);
    });
    T.it('cada evento referencia el índice de su acorde', () => {
      const r = scheduler.schedule({
        progression: PROG_2, tempo: 120,
        tracks: [{ id: 't1', tipo: 'bajo', patternId: 'p', enabled: true }],
        patterns: { p: mono([0]) },
      });
      T.assertEq(r.events[0].chordIndex, 0);
      T.assertEq(r.events[1].chordIndex, 1);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
