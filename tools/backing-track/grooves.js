// ─────────────────────────────────────────────────────────────
// Backing Track — grooves de estilo (solo datos)
//
// Un groove es un "atajo de estilo": agrupa el patrón rítmico que le
// corresponde a cada tipo de pista (bajo, acordes, batería, percusión)
// más un tempo sugerido. Aplicar un groove pone de una vez el feel de
// blues, metal, modal, etc. en todas las pistas.
//
// Las claves de `patterns` son tipos de patrón (bass | chord | drums |
// perc); los valores son ids de patrones de patterns.js.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const GROOVES = [
    {
      id: 'bluesShuffle', nombre: 'Blues — shuffle', genero: 'blues', tempo: 92,
      patterns: { bass: 'bluesBass', chord: 'bluesComp',
                  drums: 'bluesShuffleDrums', perc: 'percBalada' },
    },
    {
      id: 'bluesLento', nombre: 'Blues — lento', genero: 'blues', tempo: 68,
      patterns: { bass: 'bajoNegras', chord: 'acordesBlancas',
                  drums: 'baladaSuave', perc: 'percBalada' },
    },
    {
      id: 'metalGalope', nombre: 'Metal — galope', genero: 'metal', tempo: 160,
      patterns: { bass: 'metalGalopeBass', chord: 'metalChug',
                  drums: 'metalDoblePedal' },
    },
    {
      id: 'metalMedio', nombre: 'Metal — medio tiempo', genero: 'metal', tempo: 124,
      patterns: { bass: 'bajoNegras', chord: 'acordesNegras',
                  drums: 'rockBasico' },
    },
    {
      id: 'modalVamp', nombre: 'Modal — vamp', genero: 'modal', tempo: 116,
      patterns: { bass: 'bajoRaiz', chord: 'acordesSostenido',
                  drums: 'modalGroove', perc: 'percLatina' },
    },
    {
      id: 'rockGroove', nombre: 'Rock', genero: 'rock', tempo: 120,
      patterns: { bass: 'bajoOctavas', chord: 'acordesNegras',
                  drums: 'rockBasico' },
    },
    {
      id: 'funkGroove', nombre: 'Funk', genero: 'funk', tempo: 104,
      patterns: { bass: 'bajoSincopado', chord: 'acordesSincopado',
                  drums: 'funkSeco', perc: 'percPop' },
    },
    {
      id: 'bossaGroove', nombre: 'Bossa', genero: 'bossa', tempo: 122,
      patterns: { bass: 'bajoOctavas', chord: 'acordesSincopado',
                  drums: 'bossa', perc: 'percSamba' },
    },
    {
      id: 'popGroove', nombre: 'Pop', genero: 'pop', tempo: 100,
      patterns: { bass: 'bajoNegras', chord: 'acordesNegras',
                  drums: 'popEstandar', perc: 'percPop' },
    },

    // ─── Grooves latinos ───
    // Para el sonido completo del género, además del groove conviene
    // elegir en la pista de percusión el preset latino correspondiente
    // (Percusión merengue / cumbia / salsa / bachata en presets.js).
    {
      id: 'merengue', nombre: 'Merengue', genero: 'latino', tempo: 132,
      patterns: { bass: 'bajoMerengue', chord: 'acordesContratiempo',
                  drums: 'merengueDrums', perc: 'percMerengue' },
    },
    {
      id: 'cumbia', nombre: 'Cumbia', genero: 'latino', tempo: 95,
      patterns: { bass: 'bajoCumbia', chord: 'acordesContratiempo',
                  drums: 'cumbiaDrums', perc: 'percCumbia' },
    },
    {
      id: 'salsa', nombre: 'Salsa', genero: 'latino', tempo: 100,
      patterns: { bass: 'bajoTumbao', chord: 'acordesMontuno',
                  drums: 'salsaCascara', perc: 'percSalsa' },
    },
    {
      id: 'bachata', nombre: 'Bachata', genero: 'latino', tempo: 128,
      patterns: { bass: 'bajoBachata', chord: 'acordesCorcheas',
                  drums: 'bachataDrums', perc: 'percBachata' },
    },
  ];

  function byId(id) {
    return GROOVES.find(g => g.id === id) || null;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryGrooves = { GROOVES, byId };
})(typeof window !== 'undefined' ? window : globalThis);
