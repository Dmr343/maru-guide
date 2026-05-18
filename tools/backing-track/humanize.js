// ─────────────────────────────────────────────────────────────
// Backing Track — humanize
//
// Módulo profundo de lógica pura. Aplica micro-desplazamientos de
// timing y de velocity a una lista de eventos (la salida del
// scheduler), para que el acompañamiento no suene mecánico.
//
// Usa un PRNG con semilla: misma semilla + misma entrada → misma
// salida, de modo que el resultado es reproducible y testeable.
// No muta la entrada. Sin audio, sin DOM. IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const DEFAULT_TIME_RANGE = 0.02;      // ±20 ms de timing a intensidad 1
  const DEFAULT_VELOCITY_RANGE = 0.15;  // ±0.15 de velocity a intensidad 1

  // PRNG determinista (mulberry32): rápido y con buena distribución.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(v, fallback) {
    v = Number(v);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(0, Math.min(1, v));
  }

  // apply — devuelve una nueva lista de eventos con timing y velocity
  // humanizados.
  //
  // opts:
  //   amount         intensidad 0..1 (0 = sin cambios, default 0)
  //   seed           semilla del PRNG (entero, default 1)
  //   timeRange      desplazamiento máx. de timing en segundos (default 0.02)
  //   velocityRange  desplazamiento máx. de velocity (default 0.15)
  function apply(events, opts) {
    opts = opts || {};
    const list = Array.isArray(events) ? events : [];
    const amount = clamp01(opts.amount, 0);
    const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
    const timeRange = Number.isFinite(opts.timeRange)
      ? opts.timeRange : DEFAULT_TIME_RANGE;
    const velRange = Number.isFinite(opts.velocityRange)
      ? opts.velocityRange : DEFAULT_VELOCITY_RANGE;

    // Intensidad nula: clones sin cambios (sigue siendo operación pura).
    if (amount <= 0) return list.map(e => Object.assign({}, e));

    const rng = mulberry32(seed);
    return list.map(e => {
      const timeOffset = (rng() * 2 - 1) * timeRange * amount;
      const velOffset = (rng() * 2 - 1) * velRange * amount;
      const out = Object.assign({}, e);
      if (Number.isFinite(out.time)) {
        out.time = Math.max(0, out.time + timeOffset);
      }
      if (Number.isFinite(out.velocity)) {
        out.velocity = Math.max(0, Math.min(1, out.velocity + velOffset));
      }
      return out;
    });
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.humanize = { apply, DEFAULT_TIME_RANGE, DEFAULT_VELOCITY_RANGE };
})(typeof window !== 'undefined' ? window : globalThis);
