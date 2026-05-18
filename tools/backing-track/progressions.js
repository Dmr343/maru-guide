// ─────────────────────────────────────────────────────────────
// Backing Track — progresiones de fábrica (solo datos)
//
// Cada progresión usa el mismo modelo de acorde que el Intervalic
// Atlas: { root, quality, bars }. Calidades válidas: major, minor,
// dom7, maj7, min7. Permiten abrir el módulo y tocar sin configurar
// nada.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PROGRESSIONS = [
    {
      id: 'blues12A', nombre: 'Blues de 12 compases en A', genero: 'blues',
      tempo: 90,
      chords: [
        { root: 'A', quality: 'dom7', bars: 4 },
        { root: 'D', quality: 'dom7', bars: 2 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },
    {
      id: 'modalDorian', nombre: 'Vamp dórico en Dm', genero: 'modal',
      tempo: 110,
      chords: [
        { root: 'D', quality: 'min7', bars: 2 },
        { root: 'G', quality: 'dom7', bars: 2 },
      ],
    },
    {
      id: 'popIVvi', nombre: 'Pop I–V–vi–IV en C', genero: 'pop',
      tempo: 100,
      chords: [
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
      ],
    },
    {
      id: 'jazzIIVI', nombre: 'Jazz ii–V–I en C', genero: 'jazz',
      tempo: 130,
      chords: [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ],
    },
    {
      id: 'metalEmin', nombre: 'Metal en Em', genero: 'metal',
      tempo: 140,
      chords: [
        { root: 'E', quality: 'minor', bars: 1 },
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
        { root: 'D', quality: 'major', bars: 1 },
      ],
    },
  ];

  function byId(id) {
    return PROGRESSIONS.find(p => p.id === id) || null;
  }
  function byGenero(genero) {
    return PROGRESSIONS.filter(p => p.genero === genero);
  }
  // Clon de la lista de acordes de una progresión.
  function chordsOf(id) {
    const p = byId(id);
    return p ? p.chords.map(c => ({ root: c.root, quality: c.quality, bars: c.bars })) : [];
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryProgressions = { PROGRESSIONS, byId, byGenero, chordsOf };
})(typeof window !== 'undefined' ? window : globalThis);
