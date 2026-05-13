// FretboardRenderer — convierte (chord + layers + filter) en un DrawPlan
// puro JSON-serializable. Otra función aplica el plan al SVG.
// IIFE, file:// safe. Sin DOM en computeDrawPlan.
(function (W) {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ─── Constantes internas ────────────────────────────────────────────────
  const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const INTERVAL_NAMES = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];

  // Tensiones: pitch class offset desde la raíz por nombre.
  const TENSION_SEMIS = {
    '9': 14 % 12, '#9': 15 % 12, 'b9': 13 % 12,
    '11': 17 % 12, '#11': 18 % 12,
    '13': 21 % 12, 'b13': 20 % 12,
  };
  const TENSIONS_BY_QUALITY = {
    maj7:  ['9', '#11', '13'],
    min7:  ['9', '11', '13'],
    dom7:  ['9', '#9', 'b9', '#11', '13', 'b13'],
    dim7:  ['9', '11', 'b13'],
    m7b5:  ['9', '11', 'b13'],
    major: ['9', '13'],
    minor: ['9', '11'],
    dim:   ['9', 'b13'],
    aug:   ['9', '#11'],
  };
  const SCALE_BY_QUALITY = {
    maj7: 'lydian', major: 'major',
    min7: 'dorian', minor: 'minor',
    dom7: 'mixolydian',
    dim7: 'locrian', m7b5: 'locrian', dim: 'locrian',
    aug:  'lydian',
  };
  const LAYER_PRIORITY = {
    allNotes:   1,
    scale:      2,
    tensions:   3,
    approach:   4,
    chordTones: 5,
  };
  const GUIDE_TONE_INTERVALS = new Set(['b3','3','b7','7']);

  // ─── computeRenderMap (puro, también exportado) ─────────────────────────
  function intervalToSemi(name) {
    const i = INTERVAL_NAMES.indexOf(name);
    if (i >= 0) return i;
    return TENSION_SEMIS[name] != null ? TENSION_SEMIS[name] : 0;
  }

  function computeRenderMap(chord, layers, nextChord, theoryAdapter) {
    if (!chord) return new Map();
    const ri = CHROMATIC.indexOf(chord.root);
    const map = new Map();

    function consider(pcIndex, interval, kind, extra) {
      const pc = CHROMATIC[((ri + pcIndex) % 12 + 12) % 12];
      const priority = LAYER_PRIORITY[kind] || 0;
      const cur = map.get(pc);
      if (!cur || priority > cur.priority) {
        map.set(pc, Object.assign({ interval, priority, kind }, extra || {}));
      }
    }
    function considerPc(pc, interval, kind, extra) {
      const priority = LAYER_PRIORITY[kind] || 0;
      const cur = map.get(pc);
      if (!cur || priority > cur.priority) {
        map.set(pc, Object.assign({ interval, priority, kind }, extra || {}));
      }
    }

    if (layers.allNotes) {
      for (let s = 0; s < 12; s++) consider(s, INTERVAL_NAMES[s], 'allNotes');
    }

    if (layers.scale && theoryAdapter && theoryAdapter.buildModeScale) {
      const mode = SCALE_BY_QUALITY[chord.quality] || 'major';
      const scaleNotes = theoryAdapter.buildModeScale(chord.root, mode);
      scaleNotes.forEach(n => {
        const sem = (CHROMATIC.indexOf(n) - ri + 12) % 12;
        consider(sem, INTERVAL_NAMES[sem], 'scale');
      });
    }

    if (layers.tensions) {
      const ts = TENSIONS_BY_QUALITY[chord.quality] || [];
      ts.forEach(t => {
        const sem = TENSION_SEMIS[t];
        if (sem != null) consider(sem, t, 'tensions');
      });
    }

    if (layers.approach && nextChord) {
      nextChord.notes.forEach((note, idx) => {
        considerPc(note, nextChord.intervals[idx], 'approach', { nextRoot: nextChord.root });
      });
    }

    if (layers.chordTones) {
      chord.intervals.forEach(intv => {
        const sem = intervalToSemi(intv);
        consider(sem, intv, 'chordTones');
      });
    }

    // Cross-reference: si una pc es chord tone del actual Y existe en el
    // próximo (con approach activo), guardar nextInterval como metadato.
    if (layers.approach && nextChord) {
      const nextPcMap = new Map();
      nextChord.notes.forEach((n, i) => nextPcMap.set(n, nextChord.intervals[i]));
      map.forEach((info, pc) => {
        if (info.kind === 'chordTones' && nextPcMap.has(pc)) {
          info.nextInterval = nextPcMap.get(pc);
          info.nextRoot = nextChord.root;
        }
      });
    }
    return map;
  }

  function applyHiddenIntervals(renderMap, hidden) {
    if (!hidden || !hidden.length) return renderMap;
    const hiddenSet = new Set(hidden);
    const filtered = new Map();
    renderMap.forEach((info, pc) => {
      if (hiddenSet.has(info.interval)) return;
      filtered.set(pc, info);
    });
    return filtered;
  }

  function applyDirection(candidates, filter) {
    const dir = filter.direction || 'all';
    if (dir === 'all') return candidates;
    if (dir === 'horizontal') {
      const focus = filter.focusString != null ? filter.focusString : 3;
      return candidates.filter(c => c.string === focus);
    }
    if (dir === 'vertical') {
      const focus = filter.focusFret != null ? filter.focusFret : 5;
      return candidates.filter(c => Math.abs(c.fret - focus) <= 1);
    }
    if (dir === 'diagonal') {
      const byString = {};
      candidates.forEach(c => { (byString[c.string] = byString[c.string] || []).push(c); });
      const out = [];
      Object.keys(byString).forEach(s => {
        byString[s].sort((a, b) => a.fret - b.fret);
        const sNum = Number(s);
        const base = filter.focusFret != null ? filter.focusFret : 5;
        const target = base + (6 - sNum) * 2;
        const closest = byString[s]
          .map(c => ({ c, d: Math.abs(c.fret - target) }))
          .sort((a, b) => a.d - b.d).slice(0, 2)
          .map(x => x.c);
        out.push(...closest);
      });
      return out;
    }
    return candidates;
  }

  // ─── computeDrawPlan (puro) ─────────────────────────────────────────────
  function computeDrawPlan(p, theoryAdapter) {
    const cells = [];
    if (!p.chord) return { cells };

    const renderMap = applyHiddenIntervals(
      computeRenderMap(p.chord, p.layers, p.nextChord, theoryAdapter),
      p.hiddenIntervals
    );

    const stringSet = (p.filter && p.filter.stringSet) || [1,2,3,4,5,6];
    const [fMin, fMax] = (p.filter && p.filter.fretRange) || [0, p.numFrets || 22];
    const geom = p.geometry;

    const candidates = [];
    for (let s = 1; s <= 6; s++) {
      if (!stringSet.includes(s)) continue;
      const open = geom.openNotes[6 - s];
      for (let f = fMin; f <= fMax; f++) {
        const note = geom.noteAt(open, f);
        const info = renderMap.get(note);
        if (!info) continue;
        candidates.push({ string: s, fret: f, note, info });
      }
    }
    const filtered = applyDirection(candidates, p.filter || {});

    filtered.forEach(c => {
      const cellPlan = buildCell(c, p, geom);
      if (cellPlan) cells.push(cellPlan);
    });

    return { cells };
  }

  // ─── buildCell (puro) ───────────────────────────────────────────────────
  function buildCell(c, p, geom) {
    const x = geom.fretX(c.fret - (geom.fretStart || 0), geom.fretW);
    const y = geom.stringY(6 - c.string);
    const kind = c.info.kind;
    const interval = c.info.interval;
    const colorKey = interval;  // usado para resolver paleta en applyDrawPlan
    const isChordTone = kind === 'chordTones';
    const isApproach  = kind === 'approach';
    const isAll       = kind === 'allNotes';
    const radius = isChordTone ? 12 : isApproach ? 7 : 9;
    const alpha  = isApproach ? 0.55 : (isAll ? 0.5 : 1.0);

    const cell = {
      string: c.string, fret: c.fret, note: c.note,
      x, y, kind, interval, colorKey,
      radius, fillAlpha: alpha, hasFill: !isApproach,
      label: {
        x, y: y + (isApproach ? 2.5 : 3),
        text: interval,
        size: isApproach ? 6.5 : (isAll ? 7 : 9),
        weight: isApproach ? 700 : 800,
        colorKey: isApproach ? colorKey : '_black',
        alpha: isApproach ? alpha + 0.2 : alpha,
      },
      halo: null,
      ring: null,
      crossRef: null,
      nameLabel: null,
    };

    if (interval === '1' && isChordTone) {
      cell.halo = { x, y, radius: radius + 4, colorKey, width: 2, alpha: 0.8 * alpha };
    }
    if (isApproach) {
      cell.ring = { x, y, radius, colorKey, width: 1.3, dasharray: '2.2,1.8', alpha };
    }

    // Cross-ref: chord tone que también es chord tone del próximo
    if (!isApproach && c.info.nextInterval) {
      const nextColorKey = c.info.nextInterval;
      const badgeX = x + radius + 3;
      const badgeY = y + radius + 2;
      const txtLen = c.info.nextInterval.length * 4 + 4;
      cell.crossRef = {
        ring: { x, y, radius: radius + 5, colorKey: nextColorKey, width: 1.3, dasharray: '2.2,1.8', alpha: 0.7 },
        badge: {
          x: badgeX - txtLen / 2, y: badgeY - 4.5,
          width: txtLen, height: 9, rx: 3,
          colorKey: nextColorKey,
          textX: badgeX, textY: badgeY + 2.5,
          text: c.info.nextInterval,
        },
      };
    }

    if (p.showNoteNames) {
      const txtW = c.note.length === 2 ? 16 : 11;
      const pillY = y + radius + 4;
      cell.nameLabel = {
        pill: {
          x: x - txtW / 2, y: pillY,
          width: txtW, height: 11, rx: 5,
          colorKey, alpha: 0.8 * alpha,
        },
        text: { x, y: pillY + 8.5, value: c.note, colorKey },
      };
    }
    return cell;
  }

  // ─── applyDrawPlan (impuro, toca SVG) ───────────────────────────────────
  function applyDrawPlan(svgEl, plan, deps) {
    if (!svgEl || !plan) return;
    const dots = deps.getDotsGroup(svgEl);
    dots.innerHTML = '';

    const colors = deps.INTERVAL_COLORS_FULL || {};
    const fallback = deps.fallbackColor || '#888';
    const font = deps.fontFamily || 'Trebuchet MS,sans-serif';

    function resolve(key) {
      if (key === '_black') return '#000';
      return colors[key] || fallback;
    }

    function appendCircle(attrs) {
      const c = document.createElementNS(SVG_NS, 'circle');
      Object.keys(attrs).forEach(k => c.setAttribute(k, attrs[k]));
      dots.appendChild(c);
    }
    function appendText(attrs, text) {
      const t = document.createElementNS(SVG_NS, 'text');
      Object.keys(attrs).forEach(k => t.setAttribute(k, attrs[k]));
      t.textContent = text;
      dots.appendChild(t);
    }
    function appendRect(attrs) {
      const r = document.createElementNS(SVG_NS, 'rect');
      Object.keys(attrs).forEach(k => r.setAttribute(k, attrs[k]));
      dots.appendChild(r);
    }

    plan.cells.forEach(cell => {
      const fill = resolve(cell.colorKey);

      // Halo (root)
      if (cell.halo) {
        appendCircle({
          cx: cell.halo.x, cy: cell.halo.y, r: cell.halo.radius,
          fill: 'none', stroke: resolve(cell.halo.colorKey),
          'stroke-width': cell.halo.width, 'stroke-opacity': cell.halo.alpha,
        });
      }

      // Ring (approach)
      if (cell.ring) {
        appendCircle({
          cx: cell.ring.x, cy: cell.ring.y, r: cell.ring.radius,
          fill: 'none', stroke: resolve(cell.ring.colorKey),
          'stroke-width': cell.ring.width, 'stroke-opacity': cell.ring.alpha,
          'stroke-dasharray': cell.ring.dasharray,
        });
      }

      // Fill (chord tone u other)
      if (cell.hasFill) {
        appendCircle({
          cx: cell.x, cy: cell.y, r: cell.radius,
          fill, 'fill-opacity': cell.fillAlpha,
        });
      }

      // Label
      if (cell.label) {
        appendText({
          x: cell.label.x, y: cell.label.y,
          'text-anchor': 'middle',
          'font-size': cell.label.size, 'font-weight': cell.label.weight,
          'font-family': font,
          fill: resolve(cell.label.colorKey),
          'fill-opacity': cell.label.alpha,
        }, cell.label.text);
      }

      // Cross-ref (badge del próximo acorde)
      if (cell.crossRef) {
        const xr = cell.crossRef;
        appendCircle({
          cx: xr.ring.x, cy: xr.ring.y, r: xr.ring.radius,
          fill: 'none', stroke: resolve(xr.ring.colorKey),
          'stroke-width': xr.ring.width, 'stroke-opacity': xr.ring.alpha,
          'stroke-dasharray': xr.ring.dasharray,
        });
        appendRect({
          x: xr.badge.x, y: xr.badge.y,
          width: xr.badge.width, height: xr.badge.height, rx: xr.badge.rx,
          fill: '#0e0e0e', stroke: resolve(xr.badge.colorKey),
          'stroke-width': 0.8, 'stroke-opacity': 0.7,
        });
        appendText({
          x: xr.badge.textX, y: xr.badge.textY,
          'text-anchor': 'middle', 'font-size': 6, 'font-weight': 700,
          'font-family': font, fill: resolve(xr.badge.colorKey),
        }, xr.badge.text);
      }

      // Name label (pill nombre nota)
      if (cell.nameLabel) {
        const nl = cell.nameLabel;
        appendRect({
          x: nl.pill.x, y: nl.pill.y,
          width: nl.pill.width, height: nl.pill.height, rx: nl.pill.rx,
          fill: '#0e0e0e', stroke: resolve(nl.pill.colorKey),
          'stroke-width': 1, 'stroke-opacity': nl.pill.alpha,
          'fill-opacity': 0.95,
        });
        appendText({
          x: nl.text.x, y: nl.text.y,
          'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 700,
          'font-family': font, fill: resolve(nl.text.colorKey),
        }, nl.text.value);
      }
    });
  }

  function render(svgEl, params, deps, theoryAdapter) {
    applyDrawPlan(svgEl, computeDrawPlan(params, theoryAdapter), deps);
  }

  W.FretboardRenderer = {
    computeDrawPlan, applyDrawPlan, render,
    // Expuestos puros para tests / consumidores
    computeRenderMap, applyHiddenIntervals, applyDirection,
    LAYER_PRIORITY, TENSIONS_BY_QUALITY, SCALE_BY_QUALITY,
    INTERVAL_NAMES, GUIDE_TONE_INTERVALS,
  };

})(typeof window !== 'undefined' ? window : globalThis);
