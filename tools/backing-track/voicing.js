// ─────────────────────────────────────────────────────────────
// Backing Track — voicing resolver
//
// Módulo profundo de lógica pura. El modelo de acorde del Intervalic
// Atlas ({ root, quality, bars }) es simbólico: NO almacena octavas.
// Este módulo traduce ese acorde a notas con octava concreta, listas
// para Tone.js, según el voicing y la inversión elegidos.
//
// Se apoya en GuitarShared.theory.buildChord para las notas del acorde.
// Sin estado, sin audio, sin DOM. IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const G = W.GuitarShared || {};
  const theory = G.theory;

  const CHROMATIC = (theory && theory.CHROMATIC) ||
    ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  // Voicings soportados (conjunto acotado, ver PRD #48).
  const VOICINGS = ['close', 'open'];

  // Número absoluto de semitonos en notación científica de altura:
  // octava*12 + clase de altura. Sirve para ordenar y transponer notas.
  function pitchNumber(pitchClass, octave) {
    return octave * 12 + pitchClass;
  }

  function numberToPitch(num) {
    const pc = ((num % 12) + 12) % 12;
    const octave = Math.floor(num / 12);
    return CHROMATIC[pc] + octave;
  }

  // Offsets ascendentes (en semitonos desde la fundamental) del acorde.
  // buildChord devuelve las notas en orden ascendente desde la fundamental;
  // derivamos el offset 0-11 de cada una. Las 5 calidades del Atlas
  // (major, minor, dom7, maj7, min7) caben todas dentro de una octava.
  function chordOffsets(root, quality) {
    if (!theory || !theory.buildChord) return [0, 4, 7];
    const built = theory.buildChord(root, quality);
    const rootPc = CHROMATIC.indexOf(root);
    return built.notes.map(n => {
      const pc = CHROMATIC.indexOf(n);
      return (((pc - rootPc) % 12) + 12) % 12;
    });
  }

  function clampInt(v, min, max) {
    v = Math.round(Number(v) || 0);
    return Math.max(min, Math.min(max, v));
  }

  // resolveChord — traduce un acorde simbólico { root, quality } a un
  // array de notas con octava (p. ej. ['C3','E3','G3','B3']), ascendente.
  //
  // opts:
  //   octave    octava base de la fundamental (entero, default 3)
  //   voicing   'close' (default) | 'open' (drop-2)
  //   inversion 0 (fundamental, default) | 1 | 2 | 3 — se acota al acorde
  function resolveChord(chord, opts) {
    chord = chord || {};
    opts = opts || {};
    const root = chord.root;
    if (CHROMATIC.indexOf(root) < 0) return [];

    const quality = chord.quality || 'major';
    const octave = Number.isFinite(opts.octave) ? opts.octave : 3;
    const voicing = VOICINGS.indexOf(opts.voicing) >= 0 ? opts.voicing : 'close';

    const offsets = chordOffsets(root, quality);
    const rootPc = CHROMATIC.indexOf(root);
    const rootNum = pitchNumber(rootPc, octave);

    // Posición fundamental: notas en orden ascendente desde la fundamental.
    let nums = offsets.map(o => rootNum + o);

    // Inversión: subir una octava las N notas más graves.
    const inversion = clampInt(opts.inversion, 0, nums.length - 1);
    for (let i = 0; i < inversion; i++) nums[i] += 12;
    nums.sort((a, b) => a - b);

    // Voicing abierto (drop-2): bajar una octava la 2ª nota desde arriba.
    if (voicing === 'open' && nums.length >= 2) {
      nums[nums.length - 2] -= 12;
      nums.sort((a, b) => a - b);
    }

    return nums.map(numberToPitch);
  }

  // resolveBass — la fundamental del acorde en una octava grave, como
  // nota única (el bajo es el ancla auditiva del cambio de acorde).
  function resolveBass(chord, octave) {
    chord = chord || {};
    const root = chord.root;
    if (CHROMATIC.indexOf(root) < 0) return null;
    const oct = Number.isFinite(octave) ? octave : 2;
    return root + oct;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.voicing = { resolveChord, resolveBass, VOICINGS };
})(typeof window !== 'undefined' ? window : globalThis);
