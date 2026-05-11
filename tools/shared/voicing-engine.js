// Motor de voicings: aplica templates, valida las 3 reglas inviolables y
// encuentra templates aplicables para un acorde en una posición.
// IIFE, file:// safe. Expone GuitarShared.voicingEngine.
// Requiere: theory.js, theory-modes.js, positions.js, voicing-templates.js
(function (G) {
  const CHROMATIC = G.theory.CHROMATIC;
  const OPEN_NOTES = G.positions.OPEN_NOTES; // {1:'E',2:'B',3:'G',4:'D',5:'A',6:'E'}

  // MIDI absoluto de cada cuerda abierta (para comparar bajo).
  // Afinación estándar: E2(40), A2(45), D3(50), G3(55), B3(59), e4(64).
  const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

  function noteAt(stringNum, fret) {
    const open = OPEN_NOTES[stringNum];
    return CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
  }

  // applyTemplate — proyecta los fretOffsets del template a un rootFret concreto.
  // Si rootString se pasa y no coincide con template.rootString, prevalece la del
  // template (es la "fuente de verdad" del voicing).
  function applyTemplate(template, rootNote, rootFret, _rootString) {
    const positions = [];
    Object.keys(template.intervals).forEach(sKey => {
      const s = Number(sKey);
      const def = template.intervals[s];
      const fret = rootFret + def.fretOffset;
      positions.push({
        string: s,
        fret,
        interval: def.interval,
        note: noteAt(s, fret),
      });
    });
    positions.sort((a, b) => b.string - a.string); // 6→1 (bajo → agudo)

    const barre = template.hasBarre && template.barre
      ? {
          fret: rootFret + template.barre.fretOffset,
          fromString: template.barre.fromString,
          toString: template.barre.toString,
        }
      : null;

    return {
      templateId: template.id,
      templateName: template.name,
      root: rootNote,
      rootString: template.rootString,
      rootFret,
      positions,
      mutedStrings: template.mutedStrings.slice(),
      hasBarre: !!template.hasBarre,
      barre,
    };
  }

  // validateVoicing — verifica las 3 reglas inviolables.
  // Regla 1: la nota más grave (menor MIDI) es la raíz (interval 'R').
  // Regla 2: todas las cuerdas usadas son ≤ rootString.
  // Regla 3: al menos una nota en cuerdas 1, 2 o 3.
  // Bonus: mínimo 3 pitch-classes únicas (tríada). Cuenta pitch classes, no cuerdas.
  function validateVoicing(va) {
    const errors = [];
    if (!va || !va.positions || !va.positions.length) {
      return { valid: false, errors: ['voicing vacío'] };
    }

    // Regla 1
    let lowest = va.positions[0];
    let lowestMidi = OPEN_MIDI[lowest.string] + lowest.fret;
    va.positions.forEach(p => {
      const m = OPEN_MIDI[p.string] + p.fret;
      if (m < lowestMidi) { lowest = p; lowestMidi = m; }
    });
    if (lowest.interval !== 'R') {
      errors.push(`Regla 1: la nota más grave debe ser la raíz (es ${lowest.interval} en cuerda ${lowest.string})`);
    }

    // Regla 2
    const overRoot = va.positions.filter(p => p.string < va.rootString);
    // string < rootString significa más aguda (1=high e). Las "más graves" que la raíz violan.
    // String 6 = low E, string 1 = high e. rootString=6 → usadas pueden ser 1..6.
    // rootString=5 → usadas ≤ 5 (no debe haber nota en str 6).
    // Cuerdas con número MAYOR que rootString son más graves → violan.
    const tooLow = va.positions.filter(p => p.string > va.rootString);
    if (tooLow.length) {
      errors.push(`Regla 2: hay notas en cuerdas más graves que la raíz: ${tooLow.map(p=>'str'+p.string).join(', ')}`);
    }

    // Regla 3
    const inTreble = va.positions.some(p => p.string === 1 || p.string === 2 || p.string === 3);
    if (!inTreble) {
      errors.push('Regla 3: al menos una nota debe estar en cuerdas 1, 2 o 3');
    }

    // Bonus: mínimo 3 pitch classes únicas (tríada)
    const uniqPcs = new Set(va.positions.map(p => p.note));
    if (uniqPcs.size < 3) {
      errors.push(`Mínimo de tríada: solo ${uniqPcs.size} pitch class${uniqPcs.size===1?'':'es'} únicas`);
    }

    return { valid: errors.length === 0, errors };
  }

  // Busca el fret más cercano a targetFret donde aparece rootNote en stringNum.
  function _findRootFret(stringNum, rootNote, targetFret) {
    const open = OPEN_NOTES[stringNum];
    const oi = CHROMATIC.indexOf(open);
    const ri = CHROMATIC.indexOf(rootNote);
    const base = (ri - oi + 12) % 12; // 0..11
    const candidates = [base, base + 12, base + 24];
    let best = candidates[0];
    let bestDist = Math.abs(best - targetFret);
    candidates.forEach(c => {
      const d = Math.abs(c - targetFret);
      if (d < bestDist) { best = c; bestDist = d; }
    });
    return best;
  }

  // findApplicableTemplates — devuelve templates ya aplicados a la raíz, rankeados.
  // chord: { root, quality }
  // position: { fretStart, fretEnd }
  // opts: { topN (default 3), tolerance (default 2) }
  function findApplicableTemplates(chord, position, opts) {
    const o = opts || {};
    const topN = o.topN != null ? o.topN : 3;
    const tol = o.tolerance != null ? o.tolerance : 2;
    const minFret = position.fretStart - tol;
    const maxFret = position.fretEnd + tol;
    const center = (position.fretStart + position.fretEnd) / 2;

    const templates = G.voicingTemplates.getTemplatesForQuality(chord.quality);
    const applicable = [];

    templates.forEach(tpl => {
      const rootFret = _findRootFret(tpl.rootString, chord.root, center);
      if (rootFret < 0) return;
      const va = applyTemplate(tpl, chord.root, rootFret, tpl.rootString);
      // Verifica que TODAS las notas caigan en [minFret, maxFret]. Fret 0 (open) siempre OK.
      const outOfRange = va.positions.some(p => p.fret !== 0 && (p.fret < minFret || p.fret > maxFret));
      if (outOfRange) return;
      // Las reglas inviolables deben cumplirse — si un template las viola es un bug.
      const v = validateVoicing(va);
      if (!v.valid) return;
      applicable.push(va);
    });

    // Ranking: más cuerdas primero, CAGED-shape antes que tríada/spread.
    function isCaged(id) {
      return /^(e|a|d)-shape-/.test(id);
    }
    applicable.sort((a, b) => {
      const lenDiff = b.positions.length - a.positions.length;
      if (lenDiff !== 0) return lenDiff;
      const ca = isCaged(a.templateId) ? 0 : 1;
      const cb = isCaged(b.templateId) ? 0 : 1;
      return ca - cb;
    });

    return applicable.slice(0, topN);
  }

  G.voicingEngine = {
    applyTemplate,
    validateVoicing,
    findApplicableTemplates,
    OPEN_MIDI,
    noteAt,
  };

})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
