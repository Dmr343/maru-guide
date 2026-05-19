// ─────────────────────────────────────────────────────────────
// Backing Track — step-grid / pattern model
//
// Módulo profundo de lógica pura. Representa un patrón rítmico como
// una grilla de pasos (16 pasos por compás en 4/4, resolución de
// semicorcheas). Un patrón puede tener varias lanes (batería
// multi-lane: bombo/caja/hats...) o una sola (bajo, acordes).
//
// Las operaciones son puras: reciben un patrón y devuelven uno nuevo,
// nunca mutan la entrada. Sin estado global, sin audio, sin DOM.
// IIFE + namespace global (file:// safe).
//
// Forma de un patrón:
//   { steps: 16, lanes: ['main'], hits: [ {lane, step, velocity}, ... ] }
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const DEFAULT_STEPS = 16;
  const MAX_STEPS = 64;
  const DEFAULT_VELOCITY = 0.8;

  function clampSteps(n) {
    n = Math.round(Number(n));
    if (!Number.isFinite(n) || n < 1) return DEFAULT_STEPS;
    return Math.min(n, MAX_STEPS);
  }

  function clampVelocity(v) {
    v = Number(v);
    if (!Number.isFinite(v)) return DEFAULT_VELOCITY;
    return Math.max(0, Math.min(1, v));
  }

  function clone(p) {
    return {
      steps: p.steps,
      lanes: p.lanes.slice(),
      hits: p.hits.map(h => ({ lane: h.lane, step: h.step, velocity: h.velocity })),
    };
  }

  function validStep(pattern, step) {
    return Number.isInteger(step) && step >= 0 && step < pattern.steps;
  }
  function validLane(pattern, lane) {
    return pattern.lanes.indexOf(lane) >= 0;
  }
  function findHit(pattern, lane, step) {
    return pattern.hits.find(h => h.lane === lane && h.step === step) || null;
  }

  // create — patrón vacío. opts: { steps, lanes, hits }
  // hits opcional siembra el patrón (se validan; los inválidos se descartan).
  function create(opts) {
    opts = opts || {};
    const steps = clampSteps(opts.steps);
    const lanes = (Array.isArray(opts.lanes) && opts.lanes.length)
      ? opts.lanes.slice() : ['main'];
    const pattern = { steps, lanes, hits: [] };
    if (Array.isArray(opts.hits)) {
      opts.hits.forEach(h => {
        if (!h || !validLane(pattern, h.lane) || !validStep(pattern, h.step)) return;
        if (findHit(pattern, h.lane, h.step)) return;   // sin duplicados
        pattern.hits.push({
          lane: h.lane, step: h.step, velocity: clampVelocity(h.velocity),
        });
      });
    }
    return pattern;
  }

  // toggle — alterna un paso: si hay hit lo quita, si no lo agrega.
  // Lane/paso inválidos → devuelve el patrón sin cambios.
  function toggle(pattern, lane, step, velocity) {
    if (!validLane(pattern, lane) || !validStep(pattern, step)) return pattern;
    const next = clone(pattern);
    const existing = findHit(next, lane, step);
    if (existing) {
      next.hits = next.hits.filter(h => !(h.lane === lane && h.step === step));
    } else {
      next.hits.push({ lane, step, velocity: clampVelocity(velocity) });
    }
    return next;
  }

  // setVelocity — ajusta la velocity de un hit; si no existe, lo crea.
  function setVelocity(pattern, lane, step, velocity) {
    if (!validLane(pattern, lane) || !validStep(pattern, step)) return pattern;
    const next = clone(pattern);
    const existing = findHit(next, lane, step);
    if (existing) existing.velocity = clampVelocity(velocity);
    else next.hits.push({ lane, step, velocity: clampVelocity(velocity) });
    return next;
  }

  // resize — cambia la cantidad de pasos; descarta los hits que quedan fuera.
  function resize(pattern, newSteps) {
    const steps = clampSteps(newSteps);
    const next = clone(pattern);
    next.steps = steps;
    next.hits = next.hits.filter(h => h.step < steps);
    return next;
  }

  // clearLane — quita todos los hits de una lane.
  function clearLane(pattern, lane) {
    const next = clone(pattern);
    next.hits = next.hits.filter(h => h.lane !== lane);
    return next;
  }

  // ─── Consultas (no mutan) ───

  // hitAt — el hit en (lane, paso) o null.
  function hitAt(pattern, lane, step) {
    return findHit(pattern, lane, step);
  }

  // isOn — ¿hay un hit en (lane, paso)?
  function isOn(pattern, lane, step) {
    return !!findHit(pattern, lane, step);
  }

  // hitsAt — todos los hits en un paso, de todas las lanes.
  function hitsAt(pattern, step) {
    return pattern.hits
      .filter(h => h.step === step)
      .map(h => ({ lane: h.lane, step: h.step, velocity: h.velocity }));
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.stepGrid = {
    DEFAULT_STEPS, DEFAULT_VELOCITY, MAX_STEPS,
    create, toggle, setVelocity, resize, clearLane,
    hitAt, isOn, hitsAt,
  };
})(typeof window !== 'undefined' ? window : globalThis);
