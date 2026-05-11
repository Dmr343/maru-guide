// Estado global del Intervallic Chord Lab. IIFE, file:// safe.
// Expone GuitarShared.iclState.
(function (G) {
  const KEY_STATE       = 'icl_state';
  const KEY_TEMPLATES   = 'icl_custom_templates';
  const KEY_PROGRESSIONS = 'icl_progressions';

  function _load(key) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function _save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  const DEFAULT = {
    key: 'A',
    mode: 'minor',
    position: { type: 'standard', value: 5 },
    octaveShift: 0,
    layers: { scale: true, diatonicRoots: true, triangles: true, activeVoicing: null },
  };

  let _state = Object.assign({}, DEFAULT);
  let _customTemplates = [];
  let _progressions    = [];
  const _subs = {};

  function loadSaved() {
    const s = _load(KEY_STATE);
    if (s) Object.assign(_state, s);
    _customTemplates = _load(KEY_TEMPLATES)    || [];
    _progressions    = _load(KEY_PROGRESSIONS) || [];
  }

  function get() { return Object.assign({}, _state); }

  function set(partial) {
    Object.assign(_state, partial);
    _save(KEY_STATE, _state);
    Object.keys(partial).forEach(k => {
      (_subs[k] || []).forEach(fn => { try { fn(_state[k], _state); } catch (e) {} });
    });
    (_subs['*'] || []).forEach(fn => { try { fn(_state); } catch (e) {} });
  }

  function subscribe(key, fn) {
    if (!_subs[key]) _subs[key] = [];
    _subs[key].push(fn);
    return () => { _subs[key] = _subs[key].filter(f => f !== fn); };
  }

  function getCustomTemplates() { return _customTemplates.slice(); }

  function saveCustomTemplate(tpl) {
    _customTemplates = _customTemplates.filter(t => t.id !== tpl.id);
    _customTemplates.push(tpl);
    _save(KEY_TEMPLATES, _customTemplates);
  }

  function removeCustomTemplate(id) {
    _customTemplates = _customTemplates.filter(t => t.id !== id);
    _save(KEY_TEMPLATES, _customTemplates);
  }

  function getProgressions() { return _progressions.slice(); }

  function saveProgression(prog) {
    if (!prog.id) prog.id = 'prog_' + Date.now();
    _progressions = _progressions.filter(p => p.id !== prog.id);
    _progressions.push(prog);
    _save(KEY_PROGRESSIONS, _progressions);
  }

  function removeProgression(id) {
    _progressions = _progressions.filter(p => p.id !== id);
    _save(KEY_PROGRESSIONS, _progressions);
  }

  G.iclState = {
    loadSaved, get, set, subscribe,
    getCustomTemplates, saveCustomTemplate, removeCustomTemplate,
    getProgressions, saveProgression, removeProgression,
  };

})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
