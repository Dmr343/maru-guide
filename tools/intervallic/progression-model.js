// Modelo de progresión de acordes para Interval Atlas.
// IIFE, file:// safe. Sin DOM, sin localStorage, sin audio.
// Encapsula state.progression, state.activeIdx, state.loopRange, state.copiedChord
// y sostiene las invariantes desde un solo lugar.
//
// Uso:
//   const model = new ProgressionModel({
//     initialState: { progression, activeIdx, loopRange } | null,
//     onChange(snapshot) { saveState(); render(); }
//   });
//   model.addChord({ root: 'C', quality: 'maj7' });   // auto-dispara onChange
(function (W) {

  function ProgressionModel(opts) {
    opts = opts || {};
    this._onChange = opts.onChange || function () {};
    const init = opts.initialState || {};
    this._progression = (init.progression || []).map(normalizeChord);
    this._activeIdx = init.activeIdx != null ? init.activeIdx : 0;
    this._loopRange = init.loopRange || null;
    this._copiedChord = null;  // efímero, nunca persiste
    this._depth = 0;
    this._dirty = false;
    this._normalize();
  }

  // Notification batching: cualquier mutación llama _notify(). Si estamos
  // dentro de un batch (_depth > 0), solo marca _dirty y deja que el batch
  // dispare el onChange al final.
  ProgressionModel.prototype._notify = function () {
    if (this._depth > 0) { this._dirty = true; return; }
    this._onChange();
  };

  ProgressionModel.prototype.batch = function (fn) {
    this._depth++;
    try {
      fn(this);
    } finally {
      this._depth--;
      if (this._depth === 0 && this._dirty) {
        this._dirty = false;
        this._onChange();
      }
    }
  };

  ProgressionModel.prototype.clear = function () {
    if (this._progression.length === 0 && this._loopRange === null && this._activeIdx === 0) return;
    this._progression = [];
    this._activeIdx = 0;
    this._loopRange = null;
    this._notify();
  };

  ProgressionModel.prototype.loadProgression = function (chords) {
    this.batch(m => {
      m._progression = (chords || []).map(normalizeChord);
      m._activeIdx = 0;
      m._loopRange = null;
      m._normalize();
      m._dirty = true;
    });
  };

  ProgressionModel.prototype.getActive = function () {
    const c = this._progression[this._activeIdx];
    return c ? { ...c } : null;
  };

  ProgressionModel.prototype.snapshot = function () {
    return {
      progression: this._progression.map(c => ({ ...c })),
      activeIdx: this._activeIdx,
      loopRange: this._loopRange ? this._loopRange.slice() : null,
    };
  };

  ProgressionModel.prototype._normalize = function () {
    if (this._progression.length === 0) {
      this._activeIdx = 0;
      this._loopRange = null;
    } else {
      this._activeIdx = Math.max(0, Math.min(this._activeIdx, this._progression.length - 1));
      if (this._loopRange) {
        const n = this._progression.length;
        let a = Math.max(0, Math.min(this._loopRange[0], n - 1));
        let b = Math.max(0, Math.min(this._loopRange[1], n - 1));
        if (a > b) { const t = a; a = b; b = t; }
        this._loopRange = [a, b];
      }
    }
  };

  ProgressionModel.prototype.setLoopRange = function (a, b) {
    if (a === null || a === undefined) {
      if (this._loopRange === null) return;
      this._loopRange = null;
      this._onChange();
      return;
    }
    if (this._progression.length === 0) return;  // sin progresión, sin loop
    this._loopRange = [a, b];
    this._normalize();
    this._notify();
  };

  ProgressionModel.prototype.clearLoopRange = function () {
    if (this._loopRange === null) return;
    this._loopRange = null;
    this._notify();
  };

  ProgressionModel.prototype.nextIdx = function () {
    const n = this._progression.length;
    if (n <= 0) return 0;
    const def = (this._activeIdx + 1) % n;
    if (!this._loopRange) return def;
    const [lo, hi] = this._loopRange;
    if (this._activeIdx < lo || this._activeIdx >= hi) return lo;
    return def;
  };

  Object.defineProperty(ProgressionModel.prototype, 'progression', {
    get() { return this._progression; },
  });
  Object.defineProperty(ProgressionModel.prototype, 'activeIdx', {
    get() { return this._activeIdx; },
  });
  Object.defineProperty(ProgressionModel.prototype, 'loopRange', {
    get() { return this._loopRange ? this._loopRange.slice() : null; },
  });

  function clampBars(n) {
    const v = (typeof n === 'number') ? n : 1;
    return Math.max(1, Math.min(8, Math.floor(v)));
  }

  function normalizeChord(c) {
    return {
      root: c.root,
      quality: c.quality,
      bars: clampBars(c.bars),
    };
  }

  ProgressionModel.prototype.addChord = function (chord) {
    this._progression.push(normalizeChord(chord));
    this._normalize();
    this._notify();
  };

  // Semántica drop-on-target: el acorde aterriza EN destIdx, otros se corren.
  // moveChord(0, 2) sobre [C,A,G] → [A,G,C].
  ProgressionModel.prototype.moveChord = function (srcIdx, destIdx) {
    const n = this._progression.length;
    if (srcIdx === destIdx) return;
    if (srcIdx < 0 || srcIdx >= n) return;
    if (destIdx < 0 || destIdx >= n) return;
    const moved = this._progression.splice(srcIdx, 1)[0];
    const insertAt = Math.min(destIdx, this._progression.length);
    this._progression.splice(insertAt, 0, moved);
    // activeIdx sigue al acorde lógico
    if (this._activeIdx === srcIdx) {
      this._activeIdx = insertAt;
    } else if (srcIdx < this._activeIdx && this._activeIdx <= insertAt) {
      this._activeIdx--;
    } else if (insertAt <= this._activeIdx && this._activeIdx < srcIdx) {
      this._activeIdx++;
    }
    this._normalize();
    this._notify();
  };

  ProgressionModel.prototype.copyActiveChord = function () {
    const c = this._progression[this._activeIdx];
    if (!c) return false;
    this._copiedChord = { root: c.root, quality: c.quality, bars: c.bars };
    return true;
    // NO dispara onChange: el clipboard es efímero, no es estado renderizable
  };

  ProgressionModel.prototype.pasteAfterActive = function () {
    if (!this._copiedChord) return false;
    const insertAt = this._progression.length === 0 ? 0 : this._activeIdx + 1;
    const cloned = { ...this._copiedChord };
    this._progression.splice(insertAt, 0, cloned);
    this._activeIdx = insertAt;
    this._normalize();
    this._notify();
    return true;
  };

  ProgressionModel.prototype.changeActiveBars = function (delta) {
    const c = this._progression[this._activeIdx];
    if (!c) return;
    const next = clampBars(c.bars + delta);
    if (next === c.bars) return;
    c.bars = next;
    this._notify();
  };

  ProgressionModel.prototype.setActiveChord = function (idx) {
    if (idx < 0 || idx >= this._progression.length) return;
    if (idx === this._activeIdx) return;
    this._activeIdx = idx;
    this._notify();
  };

  ProgressionModel.prototype.editChordAt = function (idx, patch) {
    if (idx < 0 || idx >= this._progression.length) return;
    const cur = this._progression[idx];
    const next = {
      root:    patch.root    != null ? patch.root    : cur.root,
      quality: patch.quality != null ? patch.quality : cur.quality,
      bars:    patch.bars    != null ? clampBars(patch.bars) : cur.bars,
    };
    this._progression[idx] = next;
    this._notify();
  };

  ProgressionModel.prototype.removeChordAt = function (idx) {
    if (idx < 0 || idx >= this._progression.length) return;
    this._progression.splice(idx, 1);
    this._normalize();
    this._notify();
  };

  W.ProgressionModel = ProgressionModel;

})(typeof window !== 'undefined' ? window : globalThis);
