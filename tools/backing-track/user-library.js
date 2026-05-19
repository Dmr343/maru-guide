// ─────────────────────────────────────────────────────────────
// Backing Track — librería de presets del usuario
//
// Guarda los presets que el usuario crea o edita. Es global: crece
// con el tiempo y está disponible para cualquier pista. En esta
// etapa vive en memoria; storage.js (#60) le suma la persistencia
// en localStorage vía replaceAll / getAll.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  let presets = [];
  let counter = 0;
  const listeners = [];

  function clone(p) { return JSON.parse(JSON.stringify(p)); }
  function notify() { listeners.forEach(fn => { try { fn(); } catch (e) {} }); }

  // add — guarda un preset nuevo. Le asigna un id propio (prefijo
  // 'user-') y marca origen 'usuario'. Devuelve el id.
  function add(preset) {
    const p = clone(preset || {});
    p.id = 'user-' + (++counter);
    p.origen = 'usuario';
    presets.push(p);
    notify();
    return p.id;
  }

  function remove(id) {
    const n = presets.length;
    presets = presets.filter(p => p.id !== id);
    if (presets.length !== n) notify();
  }

  function byId(id) {
    const p = presets.find(x => x.id === id);
    return p ? clone(p) : null;
  }

  function byTipo(tipo) {
    return presets.filter(p => p.tipo === tipo).map(clone);
  }

  function getAll() {
    return presets.map(clone);
  }

  // replaceAll — reemplaza la librería entera (lo usa storage.js al
  // cargar desde localStorage o al importar un JSON).
  function replaceAll(list) {
    presets = Array.isArray(list) ? list.map(clone) : [];
    presets.forEach(p => {
      const n = parseInt(String(p.id).replace(/\D/g, ''), 10);
      if (Number.isFinite(n) && n > counter) counter = n;
    });
    notify();
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.userLibrary = {
    add, remove, byId, byTipo, getAll, replaceAll, onChange,
  };
})(typeof window !== 'undefined' ? window : globalThis);
