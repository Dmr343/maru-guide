// Cálculo de posiciones de escala en el mástil. IIFE, file:// safe.
// Expone GuitarShared.positions.
// Requiere: theory.js + theory-modes.js cargados antes.
(function (G) {
  const CHROMATIC = G.theory.CHROMATIC;

  // Afinación estándar: cuerda 1 (high e) ... cuerda 6 (low E).
  // openString[string] devuelve la nota abierta.
  const OPEN_NOTES = { 1: 'E', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E' };
  const STRINGS = [1, 2, 3, 4, 5, 6];

  const NUM_POSITIONS = 5;

  function noteAt(stringNum, fret) {
    const open = OPEN_NOTES[stringNum];
    return CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
  }

  function _scaleSet(root, mode) {
    const scale = G.theory.buildModeScale
      ? G.theory.buildModeScale(root, mode)
      : G.theory.buildScale(root, mode);
    return new Set(scale);
  }

  // Devuelve todas las (string, fret) con notas de la escala en
  // [fretStart, fretEnd] inclusive.
  function _notesInWindow(root, mode, fretStart, fretEnd) {
    const inScale = _scaleSet(root, mode);
    const out = [];
    STRINGS.forEach(s => {
      for (let f = fretStart; f <= fretEnd; f++) {
        const n = noteAt(s, f);
        if (inScale.has(n)) out.push({ string: s, fret: f, note: n });
      }
    });
    return out;
  }

  // Calcula los 5 trastes de arranque de las posiciones estándar.
  // Algoritmo: notas de la escala en cuerda 6 dentro de [0..11],
  // ordenadas ascendente, greedy keep con gap >= 2. Si quedan <5,
  // rellena con los candidatos saltados para alcanzar 5.
  function _positionStarts(root, mode) {
    const scale = _scaleSet(root, mode);
    const open6 = CHROMATIC.indexOf(OPEN_NOTES[6]);
    const candidates = [];
    for (let f = 0; f <= 11; f++) {
      const n = CHROMATIC[(open6 + f) % 12];
      if (scale.has(n)) candidates.push(f);
    }
    const kept = [];
    candidates.forEach(f => {
      if (!kept.length || f - kept[kept.length - 1] >= 2) kept.push(f);
    });
    if (kept.length < NUM_POSITIONS) {
      candidates.forEach(f => {
        if (kept.length < NUM_POSITIONS && !kept.includes(f)) kept.push(f);
      });
      kept.sort((a, b) => a - b);
    }
    return kept.slice(0, NUM_POSITIONS);
  }

  function _startFretFor(root, mode, idx) {
    const starts = _positionStarts(root, mode);
    if (idx < 0 || idx >= starts.length) return null;
    return starts[idx];
  }

  function getScalePosition(root, mode, idx, opts) {
    const o = opts || {};
    const shift = (o.octaveShift || 0) * 12;
    const startFret = _startFretFor(root, mode, idx);
    if (startFret === null) return null;
    const span = o.span || 5;
    const fretStart = startFret + shift;
    const fretEnd = fretStart + (span - 1);
    return {
      fretStart, fretEnd,
      notes: _notesInWindow(root, mode, fretStart, fretEnd),
    };
  }

  function getArbitraryPosition(root, mode, startFret, span) {
    const sp = span || 5;
    const fretEnd = startFret + (sp - 1);
    return {
      fretStart: startFret, fretEnd,
      notes: _notesInWindow(root, mode, startFret, fretEnd),
    };
  }

  // Devuelve TODAS las notas de la escala en el mástil hasta maxFret.
  function getAllScaleNotes(root, mode, maxFret) {
    const m = (maxFret == null) ? 22 : maxFret;
    return _notesInWindow(root, mode, 0, m);
  }

  G.positions = {
    OPEN_NOTES, STRINGS,
    noteAt,
    getScalePosition, getArbitraryPosition, getAllScaleNotes,
  };

})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
