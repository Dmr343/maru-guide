// Fretboard rendering primitives — works as plain script (file:// safe).
// Reads window.GuitarShared.theory (must load theory.js first).
// Attaches all exports to window.GuitarShared.fretboard.
(function (G) {
  const { CHROMATIC } = G.theory;

  const OPEN_NOTES    = ['E','A','D','G','B','E'];
  const STRING_LABELS = ['E','A','D','G','B','e'];
  const FRET_MARKERS        = [3,5,7,9,12];
  const FRET_MARKERS_EXTRA  = [15,17,19,21];  // single dots for 22-fret boards
  const FRET_MARKERS_DOUBLE = [12,24];         // double dots
  const STRING_THICK  = [3.2,2.6,2.0,1.5,1.0,0.6];

  const FB_W      = 920;
  const FB_H      = 220;
  const FB_NUT    = 48;
  const FB_RIGHT  = FB_W - 16;
  const FB_STR_TOP = 28;
  const FB_STR_BOT = FB_H - 28;
  const FB_STR_GAP = (FB_STR_BOT - FB_STR_TOP) / 5;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function fbNoteAt(open, fret) {
    return CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
  }

  function fretX(fret, fretW) {
    return fret === 0 ? FB_NUT - 4 : FB_NUT + (fret - 0.5) * fretW;
  }

  function stringY(si) {
    return FB_STR_BOT - si * FB_STR_GAP;
  }

  function fbGetFretW(svgEl, numFrets) {
    return parseFloat(svgEl.dataset.fretW) || (FB_RIGHT - FB_NUT) / (numFrets || 12);
  }

  function fbGetDotsGroup(svgEl) {
    let dotsG = svgEl.querySelector('g[data-dots]');
    if (!dotsG) {
      dotsG = el('g');
      dotsG.dataset.dots = '1';
      svgEl.appendChild(dotsG);
    }
    return dotsG;
  }

  function fbInitBoard(svgEl, numFrets) {
    numFrets = numFrets || 12;
    const fretW = (FB_RIGHT - FB_NUT) / numFrets;
    svgEl.innerHTML = '';
    svgEl.dataset.fretW = fretW;
    svgEl.dataset.numFrets = numFrets;

    const defs = el('defs');
    defs.innerHTML = '<filter id="fbglow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svgEl.appendChild(defs);

    const g = el('g');
    g.appendChild(el('rect', { x: FB_NUT - 5, y: FB_STR_TOP - 8, width: 5, height: FB_STR_GAP * 5 + 16, fill: '#5a4820' }));

    for (let f = 1; f <= numFrets; f++) {
      const x = FB_NUT + f * fretW;
      g.appendChild(el('line', { x1: x, y1: FB_STR_TOP - 6, x2: x, y2: FB_STR_BOT + 6, stroke: '#1a1a1a', 'stroke-width': 2 }));
    }

    for (let f = 0; f <= numFrets; f++) {
      const x = f === 0 ? FB_NUT - 18 : FB_NUT + (f - 0.5) * fretW;
      const t = el('text', {
        x, y: 14, 'text-anchor': 'middle', 'font-size': 10,
        fill: FRET_MARKERS.includes(f) ? '#d4a847' : '#2a2a2a',
        'font-family': 'Trebuchet MS,sans-serif',
      });
      t.textContent = f === 0 ? '○' : f;
      g.appendChild(t);
    }

    OPEN_NOTES.forEach((_, si) => {
      const y = stringY(si);
      g.appendChild(el('line', { x1: FB_NUT - 4, y1: y, x2: FB_RIGHT, y2: y, stroke: '#3a2a10', 'stroke-width': STRING_THICK[si] }));
      const t = el('text', { x: 22, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-style': 'italic', 'font-weight': 700, fill: '#444', 'font-family': 'Trebuchet MS,sans-serif' });
      t.textContent = STRING_LABELS[si];
      g.appendChild(t);
    });

    [...FRET_MARKERS, ...FRET_MARKERS_EXTRA].forEach(f => {
      if (f > numFrets) return;
      if (FRET_MARKERS_DOUBLE.includes(f)) {
        [1, 3].forEach(si => {
          g.appendChild(el('circle', { cx: FB_NUT + (f - 0.5) * fretW, cy: stringY(si) - FB_STR_GAP * 0.5, r: 4, fill: '#1e1e1e' }));
        });
      } else {
        g.appendChild(el('circle', { cx: FB_NUT + (f - 0.5) * fretW, cy: stringY(2) - FB_STR_GAP * 0.5, r: 4, fill: '#1e1e1e' }));
      }
    });

    svgEl.appendChild(g);
    const dotsG = el('g');
    dotsG.dataset.dots = '1';
    svgEl.appendChild(dotsG);
  }

  // Convert chord strings[] → fretboard positions [{si, fret, d, note}]
  // strings: [e, B, G, D, A, E] high→low (index 0 = high e = si 5)
  function chordToFbPositions(chord) {
    const siMap = [5, 4, 3, 2, 1, 0];
    const positions = [];
    chord.strings.forEach((fret, idx) => {
      if (fret === 'x' || fret === null) return;
      const si = siMap[idx];
      const openNote = OPEN_NOTES[si];
      const noteName = fbNoteAt(openNote, fret);
      const degree = chord.notes ? chord.notes.indexOf(noteName) + 1 : 1;
      positions.push({ si, fret, d: degree > 0 ? degree : 1, note: noteName });
    });
    return positions;
  }

  function fbRenderChordDots(svgEl, chord, color) {
    const fretW = fbGetFretW(svgEl);
    const dotsG = fbGetDotsGroup(svgEl);
    dotsG.innerHTML = '';
    const positions = chordToFbPositions(chord);
    const col = color || '#3498db';
    positions.forEach(p => {
      const cx = fretX(p.fret, fretW), cy = stringY(p.si);
      const isRoot = p.d === 1;
      const r = isRoot ? 14 : 11;
      const c = el('circle', { cx, cy, r, fill: isRoot ? col : col + 'aa' });
      if (isRoot) {
        c.setAttribute('filter', 'url(#fbglow)');
        dotsG.appendChild(el('circle', { cx, cy, r: r + 4, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-opacity': 0.8 }));
      }
      dotsG.appendChild(c);
      const t = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: isRoot ? '#fff' : '#000', 'font-family': 'Trebuchet MS,sans-serif' });
      t.textContent = p.note;
      dotsG.appendChild(t);
    });
  }

  function fbDrawBarre(svgEl, capoFret, fromSi, toSi, color) {
    const fretW = fbGetFretW(svgEl);
    const dotsG = fbGetDotsGroup(svgEl);
    const x = FB_NUT + (capoFret - 0.5) * fretW;
    const y1 = stringY(Math.max(fromSi, toSi));
    const y2 = stringY(Math.min(fromSi, toSi));
    const line = el('line', {
      x1: x, y1, x2: x, y2,
      stroke: color || '#ffffff',
      'stroke-width': 3,
      'stroke-opacity': 0.35,
      'stroke-linecap': 'round',
    });
    line.dataset.barre = capoFret;
    dotsG.appendChild(line);
  }

  const FUNC_DOT_COLORS = { R: '#d4a847', '3': '#e67e22', '5': '#3498db', '7': '#2ecc71' };

  function fbRenderFunctionalDot(svgEl, si, fret, funcName, noteName) {
    const fretW = fbGetFretW(svgEl);
    const dotsG = fbGetDotsGroup(svgEl);
    const cx = fretX(fret, fretW), cy = stringY(si);
    const col = FUNC_DOT_COLORS[funcName] || '#888';
    const r = funcName === 'R' ? 14 : 11;
    if (funcName === 'R') {
      dotsG.appendChild(el('circle', { cx, cy, r: r + 4, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-opacity': 0.8 }));
    }
    const c = el('circle', { cx, cy, r, fill: col });
    if (funcName === 'R') c.setAttribute('filter', 'url(#fbglow)');
    dotsG.appendChild(c);
    const t = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#000', 'font-family': 'Trebuchet MS,sans-serif' });
    t.textContent = noteName;
    dotsG.appendChild(t);
  }

  // stringToSi: convierte número de cuerda (1-6) a índice interno (si=0..5).
  // si=0 → low E (string 6), si=5 → high e (string 1).
  function stringToSi(s) { return 6 - s; }

  // Intervalo → color de dot para voicings
  const INTERVAL_COLORS = {
    R: '#d4a847', '3': '#e67e22', 'b3': '#e67e22',
    '5': '#3498db', 'b5': '#3498db',
    '7': '#2ecc71', 'b7': '#2ecc71',
  };

  // Renderiza un VoicingApplied sobre el mástil principal.
  // voicingApplied: { positions:[{string,fret,interval}], mutedStrings:[], hasBarre, barre }
  function fbRenderVoicing(svgEl, voicingApplied, opts) {
    const fretW  = fbGetFretW(svgEl);
    const dotsG  = fbGetDotsGroup(svgEl);
    const alpha  = (opts && opts.alpha) ? opts.alpha : 1.0;
    dotsG.innerHTML = '';

    if (voicingApplied.hasBarre && voicingApplied.barre) {
      const b = voicingApplied.barre;
      fbDrawBarre(svgEl, b.fret, stringToSi(b.fromString), stringToSi(b.toString), '#ffffff');
    }

    (voicingApplied.positions || []).forEach(p => {
      const si  = stringToSi(p.string);
      const cx  = fretX(p.fret, fretW);
      const cy  = stringY(si);
      const col = INTERVAL_COLORS[p.interval] || '#888';
      const r   = p.interval === 'R' ? 14 : 11;
      if (p.interval === 'R') {
        dotsG.appendChild(el('circle', { cx, cy, r: r + 4, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-opacity': 0.8 * alpha }));
        const c = el('circle', { cx, cy, r, fill: col, 'fill-opacity': alpha });
        c.setAttribute('filter', 'url(#fbglow)');
        dotsG.appendChild(c);
      } else {
        dotsG.appendChild(el('circle', { cx, cy, r, fill: col, 'fill-opacity': alpha }));
      }
      const t = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#000', 'fill-opacity': alpha, 'font-family': 'Trebuchet MS,sans-serif' });
      t.textContent = p.interval;
      dotsG.appendChild(t);
    });
  }

  // Renderiza un mini-diagrama de acorde en un elemento SVG o div contenedor.
  // Muestra cuerdas desde rootString hasta 1, con X en cuerdas mudas.
  // containerEl: el SVG o div donde se pinta; w,h: dimensiones del mini.
  function fbRenderMiniDiagram(containerEl, voicingApplied, opts) {
    const o = opts || {};
    const W = o.width  || 80;
    const H = o.height || 100;
    const STRINGS = 6;
    const rootStr = voicingApplied.rootString || 6;
    const numStr  = rootStr;           // cuerdas 1..rootStr
    const FRET_SPAN = 4;               // número de trastes a mostrar
    const posMap  = {};
    let minFret = Infinity;
    (voicingApplied.positions || []).forEach(p => {
      posMap[p.string] = p;
      if (p.fret > 0 && p.fret < minFret) minFret = p.fret;
    });
    if (!isFinite(minFret)) minFret = 1;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    let svg = containerEl;
    if (containerEl.tagName.toLowerCase() !== 'svg') {
      svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      containerEl.appendChild(svg);
    }
    svg.innerHTML = '';

    const PAD_L = 14, PAD_T = 10;
    const strGap  = (W - PAD_L - 8) / Math.max(numStr - 1, 1);
    const fretGap = (H - PAD_T - 12) / FRET_SPAN;

    const col = (s) => PAD_L + (rootStr - s) * strGap;

    // Frets
    for (let f = 0; f <= FRET_SPAN; f++) {
      const y = PAD_T + f * fretGap;
      const line = document.createElementNS(SVG_NS, 'line');
      Object.entries({ x1: PAD_L, y1: y, x2: col(1), y2: y, stroke: f === 0 ? '#d4a847' : '#444', 'stroke-width': f === 0 ? 3 : 1 }).forEach(([k,v]) => line.setAttribute(k, v));
      svg.appendChild(line);
    }
    // Strings
    for (let s = 1; s <= rootStr; s++) {
      const x = col(s);
      const line = document.createElementNS(SVG_NS, 'line');
      Object.entries({ x1: x, y1: PAD_T, x2: x, y2: PAD_T + FRET_SPAN * fretGap, stroke: '#666', 'stroke-width': 1 }).forEach(([k,v]) => line.setAttribute(k, v));
      svg.appendChild(line);
      const p = posMap[s];
      const muted = (voicingApplied.mutedStrings || []).includes(s);
      if (muted || !p) {
        const t = document.createElementNS(SVG_NS, 'text');
        Object.entries({ x: col(s), y: PAD_T - 3, 'text-anchor': 'middle', 'font-size': 9, fill: '#888', 'font-family': 'sans-serif' }).forEach(([k,v]) => t.setAttribute(k, v));
        t.textContent = 'x';
        svg.appendChild(t);
      } else {
        const fretInDiag = p.fret - minFret + 1;
        if (fretInDiag >= 1 && fretInDiag <= FRET_SPAN) {
          const cx = col(s);
          const cy = PAD_T + (fretInDiag - 0.5) * fretGap;
          const dotColor = INTERVAL_COLORS[p.interval] || '#888';
          const circle = document.createElementNS(SVG_NS, 'circle');
          Object.entries({ cx, cy, r: 7, fill: dotColor }).forEach(([k,v]) => circle.setAttribute(k, v));
          svg.appendChild(circle);
          const t = document.createElementNS(SVG_NS, 'text');
          Object.entries({ x: cx, y: cy + 3, 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 700, fill: '#000', 'font-family': 'sans-serif' }).forEach(([k,v]) => t.setAttribute(k, v));
          t.textContent = p.interval;
          svg.appendChild(t);
        }
      }
    }
    // Fret label
    const label = document.createElementNS(SVG_NS, 'text');
    Object.entries({ x: 4, y: PAD_T + fretGap * 0.6, 'font-size': 7, fill: '#888', 'font-family': 'sans-serif' }).forEach(([k,v]) => label.setAttribute(k, v));
    label.textContent = minFret;
    svg.appendChild(label);
  }

  G.fretboard = {
    OPEN_NOTES, STRING_LABELS, FRET_MARKERS, FRET_MARKERS_EXTRA, STRING_THICK,
    FB_W, FB_H, FB_NUT, FB_RIGHT, FB_STR_TOP, FB_STR_BOT, FB_STR_GAP,
    fbNoteAt, fretX, stringY, stringToSi, fbGetFretW, fbGetDotsGroup,
    fbInitBoard, chordToFbPositions, fbRenderChordDots,
    fbDrawBarre, fbRenderFunctionalDot, fbRenderVoicing, fbRenderMiniDiagram,
    INTERVAL_COLORS,
  };
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
