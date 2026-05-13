// Persistence — port de storage + migrations versionadas para Interval Atlas.
// IIFE, file:// safe. Sin acoplamiento a localStorage (inyectable).
(function (W) {

  // ─── Adapters ───────────────────────────────────────────────────────────
  function LocalStorageAdapter(ls) {
    ls = ls || (typeof localStorage !== 'undefined' ? localStorage : null);
    return {
      getItem(k)    { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } },
      setItem(k, v) { try { if (ls) ls.setItem(k, v); } catch (e) {} },
      removeItem(k) { try { if (ls) ls.removeItem(k); } catch (e) {} },
    };
  }

  function MemoryStorageAdapter() {
    const m = new Map();
    return {
      getItem(k)    { return m.has(k) ? m.get(k) : null; },
      setItem(k, v) { m.set(k, String(v)); },
      removeItem(k) { m.delete(k); },
      _map: m,
    };
  }

  // ─── Persistence ────────────────────────────────────────────────────────
  function Persistence(opts) {
    opts = opts || {};
    this._storage    = opts.storage;
    this._key        = opts.key;
    this._defaults   = opts.defaults != null ? opts.defaults : {};
    this._migrations = opts.migrations || [];
    this._deepKeys   = opts.deepKeys || [];
    this._version    = this._migrations.length;
  }

  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  Persistence.prototype.load = function () {
    const raw = this._storage.getItem(this._key);
    if (raw == null) return deepClone(this._defaults);

    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return deepClone(this._defaults); }

    // Default-array (favoritos): retorna el array tal cual si es válido.
    if (Array.isArray(this._defaults)) {
      return Array.isArray(parsed) ? parsed.slice() : deepClone(this._defaults);
    }

    if (!parsed || typeof parsed !== 'object') return deepClone(this._defaults);

    // Aplicar migrations
    let v = (typeof parsed.__v === 'number') ? parsed.__v : 0;
    let s = parsed;
    while (v < this._version) {
      s = this._migrations[v](s);
      v++;
    }

    // Shallow merge contra defaults, deep en deepKeys
    const out = Object.assign({}, this._defaults, s);
    for (const k of this._deepKeys) {
      out[k] = Object.assign({}, this._defaults[k] || {}, s[k] || {});
    }
    delete out.__v;
    return out;
  };

  Persistence.prototype.save = function (state) {
    let payload;
    if (Array.isArray(state)) {
      payload = state;  // arrays se guardan sin __v
    } else {
      payload = Object.assign({}, state, { __v: this._version });
    }
    try { this._storage.setItem(this._key, JSON.stringify(payload)); } catch (e) {}
  };

  Persistence.prototype.clear = function () {
    this._storage.removeItem(this._key);
  };

  W.Persistence            = Persistence;
  W.LocalStorageAdapter    = LocalStorageAdapter;
  W.MemoryStorageAdapter   = MemoryStorageAdapter;

})(typeof window !== 'undefined' ? window : globalThis);
