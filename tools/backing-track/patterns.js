// ─────────────────────────────────────────────────────────────
// Backing Track — librería de patrones de fábrica (solo datos)
//
// Cada patrón es una grilla de pasos (16 pasos/compás, 4/4) con la
// forma { steps, lanes, hits:[{lane,step,velocity}] }, idéntica a la
// que produce step-grid.js. El campo `tipo` indica para qué clase de
// pista sirve el patrón (bass | chord | drums | perc).
//
// Sin lógica de motor, sin audio. IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const KIT_LANES = ['kick', 'snare', 'hat', 'cymbal'];
  const PERC_LANES = ['bongo_hi', 'bongo_lo', 'conga', 'shaker'];

  // Helpers de construcción (solo arman datos).
  function mono(steps, vel) {
    return steps.map(s => ({ lane: 'main', step: s, velocity: vel == null ? 0.85 : vel }));
  }
  function lane(name, steps, vel) {
    return steps.map(s => ({ lane: name, step: s, velocity: vel == null ? 0.8 : vel }));
  }

  const PATTERNS = [
    // ─── Bajo (lane única 'main') ───
    { id: 'bajoRaiz', nombre: 'Raíz', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0], 0.9) },
    { id: 'bajoNegras', nombre: 'Negras', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 4, 8, 12], 0.85) },
    { id: 'bajoOctavas', nombre: 'Octavas', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 8], 0.88) },
    { id: 'bajoSincopado', nombre: 'Sincopado', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 6, 8, 14], 0.82) },

    // ─── Acordes (lane única 'main') ───
    { id: 'acordesBlancas', nombre: 'Blancas', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 8], 0.7) },
    { id: 'acordesNegras', nombre: 'Negras', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 4, 8, 12], 0.65) },
    { id: 'acordesSincopado', nombre: 'Sincopado', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 3, 8, 11], 0.68) },
    { id: 'acordesSostenido', nombre: 'Sostenido', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0], 0.6) },

    // ─── Batería (lanes kick/snare/hat/cymbal) ───
    { id: 'rockBasico', nombre: 'Rock básico', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8], 0.95),
        lane('snare', [4, 12], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.55)) },
    { id: 'baladaSuave', nombre: 'Balada suave', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0], 0.8),
        lane('snare', [8], 0.6),
        lane('hat',   [0, 4, 8, 12], 0.45)) },
    { id: 'funkSeco', nombre: 'Funk seco', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 3, 10], 0.9),
        lane('snare', [4, 12], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },
    { id: 'metalDoblePedal', nombre: 'Metal doble pedal', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',   [0, 2, 4, 6, 8, 10, 12, 14], 0.95),
        lane('snare',  [4, 12], 0.9),
        lane('cymbal', [0, 8], 0.8)) },

    // ─── Percusión (lanes bongo/conga/shaker) ───
    { id: 'percLatina', nombre: 'Percusión latina', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('conga',    [0, 3, 6, 8, 11, 14], 0.7),
        lane('bongo_hi', [2, 10], 0.6),
        lane('shaker',   [0, 2, 4, 6, 8, 10, 12, 14], 0.4)) },
  ];

  function byId(id) {
    return PATTERNS.find(p => p.id === id) || null;
  }
  function byTipo(tipo) {
    return PATTERNS.filter(p => p.tipo === tipo);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryPatterns = { PATTERNS, byId, byTipo, KIT_LANES, PERC_LANES };
})(typeof window !== 'undefined' ? window : globalThis);
