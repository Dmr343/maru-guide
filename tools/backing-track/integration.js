// ─────────────────────────────────────────────────────────────
// Backing Track — integración con el Intervalic Atlas (opcional)
//
// El Atlas puede "enviar" una progresión al módulo: escribe la
// progresión en una clave de localStorage y abre esta página. Este
// módulo la lee al arrancar, la traduce al formato del motor y
// limpia la clave.
//
// Acoplamiento mínimo: el Atlas solo escribe un JSON en una clave
// conocida — no importa lógica de este módulo. El módulo funciona
// igual sin esta integración.
//
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const HANDOFF_KEY = 'backing_track_handoff';

  // El Atlas usa calidades que el motor no resuelve todas (dim7,
  // m7b5). Se mapean a la aproximación soportada más cercana.
  const QUALITY_MAP = {
    major: 'major', minor: 'minor',
    maj7: 'maj7', min7: 'min7', dom7: 'dom7', m7b5: 'm7b5',
    dim7: 'm7b5',   // dim7 puro no está soportado: m7b5 es lo más cercano
  };
  const VALID_ROOT = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  function clampBars(b) {
    b = Math.round(Number(b));
    if (!Number.isFinite(b) || b < 1) return 1;
    return Math.min(b, 8);
  }

  // translateAtlasProgression — progresión nativa del Atlas
  // ([{root,quality,bars}]) → formato del motor. Normaliza calidades
  // y compases; descarta acordes con root inválido.
  function translateAtlasProgression(progression) {
    if (!Array.isArray(progression)) return [];
    return progression
      .filter(c => c && VALID_ROOT.indexOf(c.root) >= 0)
      .map(c => ({
        root: c.root,
        quality: QUALITY_MAP[c.quality] || 'major',
        bars: clampBars(c.bars),
      }));
  }

  // readHandoff — lee la progresión que dejó el Atlas, la traduce y
  // limpia la clave. Devuelve la progresión traducida o null.
  function readHandoff() {
    let raw;
    try { raw = W.localStorage.getItem(HANDOFF_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { W.localStorage.removeItem(HANDOFF_KEY); } catch (e) {}
    let data;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    const prog = translateAtlasProgression(data && data.progression);
    return prog.length ? prog : null;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.integration = {
    translateAtlasProgression: translateAtlasProgression,
    readHandoff: readHandoff,
    HANDOFF_KEY: HANDOFF_KEY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
