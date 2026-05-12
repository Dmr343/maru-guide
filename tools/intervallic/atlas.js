// Interval Atlas — mástil 22 trastes con etiquetas interválicas relativas al
// acorde activo. IIFE, file:// safe.
(function (G, W) {
  const TH  = G.theory;
  const FB  = G.fretboard;
  const POS = G.positions;

  const NUM_FRETS = 22;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LS_KEY = 'atlas_state';

  // Colores: chord tones (R/3/5/7) usan los de FB.INTERVAL_COLORS;
  // el resto (b2/2/4/b5/6/b6/b3) se pinta tenue.
  const INTERVAL_COLORS_FULL = {
    '1':  '#d4a847',
    'b2': '#5a3a40', '2':  '#7a5a30',
    'b3': '#e67e22', '3':  '#e67e22',
    '4':  '#6a7a40',
    'b5': '#3498db', '5':  '#3498db',
    'b6': '#5a3a6a', '6':  '#7a5a8a',
    'b7': '#2ecc71', '7':  '#2ecc71',
  };
  const CHORD_TONE_INTERVALS = new Set(['1','b3','3','b5','5','b7','7']);
  const GUIDE_TONE_INTERVALS = new Set(['b3','3','b7','7']);

  // Capas y prioridad de pintado (mayor número = se pinta encima).
  const LAYER_PRIORITY = {
    allNotes: 1,
    approach: 2,
    scale:    3,
    tensions: 4,
    guideTones: 5,
    chordTones: 6,
  };

  // Tensiones por calidad (offsets en semitonos desde la raíz).
  const TENSION_SEMIS = {
    '9': 14 % 12, '#9': 15 % 12, 'b9': 13 % 12,
    '11': 17 % 12, '#11': 18 % 12,
    '13': 21 % 12, 'b13': 20 % 12,
  };
  // En el mástil, las tensiones suenan en cualquier octava → solo importa el mod 12.
  // 14%12=2 (=9 = "2 una octava arriba"), pero en el mástil = pitch class del 9.
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

  // Mapa de calidad → modo asociado para la capa "scale".
  const SCALE_BY_QUALITY = {
    maj7: 'lydian',     // jónico/lidio según gusto; lidio brilla más
    major: 'major',
    min7: 'dorian',
    minor: 'minor',
    dom7: 'mixolydian',
    dim7: 'locrian',
    m7b5: 'locrian',
    dim: 'locrian',
    aug: 'lydian',
  };

  const QUALITY_LABEL = {
    major: '', minor: 'm', dim: 'dim', aug: 'aug',
    maj7: 'maj7', min7: 'm7', dom7: '7', dim7: 'dim7', m7b5: 'm7b5',
  };

  function chordName(c) { return c.root + (QUALITY_LABEL[c.quality] ?? c.quality); }

  // ──────────────── Estado ────────────────
  const DEFAULT_STATE = {
    progression: [{ root: 'C', quality: 'maj7', bars: 4 }],
    activeIdx: 0,
    layers: {
      chordTones: true, guideTones: false, scale: false,
      tensions: false, approach: false, allNotes: false,
    },
    filter: { direction: 'all', stringRange: [1, 6], fretRange: [0, 22], focusString: 3, focusFret: 5 },
    showNoteNames: false,
    parentKey: 'C',
    parentMode: 'major',
    bpm: 80,
    beatsPerChord: 4,
  };
  let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign({}, DEFAULT_STATE, parsed);
        state.layers = Object.assign({}, DEFAULT_STATE.layers, parsed.layers || {});
        state.filter = Object.assign({}, DEFAULT_STATE.filter, parsed.filter || {});
      }
    } catch (e) {}
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ──────────────── Cálculo de intervalos a renderizar ────────────────

  // Para el acorde activo, devuelve un map {pitchClass → intervalName} de
  // todo lo que las capas activas quieren mostrar, con prioridad.
  function computeRenderMap(chord, layers) {
    if (!chord) return new Map();
    const ri = TH.CHROMATIC.indexOf(chord.root);
    const map = new Map(); // pc → { interval, priority, kind }

    function consider(pcIndex, interval, kind) {
      const pc = TH.CHROMATIC[((ri + pcIndex) % 12 + 12) % 12];
      const priority = LAYER_PRIORITY[kind] || 0;
      const cur = map.get(pc);
      if (!cur || priority > cur.priority) {
        map.set(pc, { interval, priority, kind });
      }
    }

    // allNotes: las 12 notas con su intervalo
    if (layers.allNotes) {
      for (let s = 0; s < 12; s++) {
        consider(s, TH.INTERVAL_NAMES[s], 'allNotes');
      }
    }

    // scale
    if (layers.scale) {
      const mode = SCALE_BY_QUALITY[chord.quality] || 'major';
      const scaleNotes = TH.buildModeScale
        ? TH.buildModeScale(chord.root, mode)
        : TH.buildScale(chord.root, mode);
      scaleNotes.forEach(n => {
        const sem = (TH.CHROMATIC.indexOf(n) - ri + 12) % 12;
        consider(sem, TH.INTERVAL_NAMES[sem], 'scale');
      });
    }

    // tensions
    if (layers.tensions) {
      const ts = TENSIONS_BY_QUALITY[chord.quality] || [];
      ts.forEach(t => {
        const sem = TENSION_SEMIS[t];
        if (sem != null) consider(sem, t, 'tensions');
      });
    }

    // guideTones (3 y 7)
    if (layers.guideTones) {
      chord.intervals.forEach(intv => {
        if (GUIDE_TONE_INTERVALS.has(intv)) {
          const sem = intervalToSemi(intv);
          consider(sem, intv, 'guideTones');
        }
      });
    }

    // chordTones
    if (layers.chordTones) {
      chord.intervals.forEach(intv => {
        const sem = intervalToSemi(intv);
        consider(sem, intv, 'chordTones');
      });
    }

    // approach: ±1 semitono de cada chord tone
    if (layers.approach) {
      chord.intervals.forEach(intv => {
        const sem = intervalToSemi(intv);
        consider((sem + 1) % 12, '→' + intv, 'approach');
        consider((sem + 11) % 12, '→' + intv, 'approach');
      });
    }

    return map;
  }

  // Aplica el modo direccional a la lista de candidatos. Pure function.
  function applyDirection(candidates, filter) {
    const dir = filter.direction || 'all';
    if (dir === 'all') return candidates;
    if (dir === 'horizontal') {
      const focus = filter.focusString != null ? filter.focusString : 3;
      return candidates.filter(c => c.string === focus);
    }
    if (dir === 'vertical') {
      const focus = filter.focusFret != null ? filter.focusFret : 5;
      // Mostrar el traste ± 1 para mantener legibilidad
      return candidates.filter(c => Math.abs(c.fret - focus) <= 1);
    }
    if (dir === 'diagonal') {
      // 2 notas por cuerda máximo, ascendiendo: tomar las 2 con menor fret por cuerda
      const byString = {};
      candidates.forEach(c => { (byString[c.string] = byString[c.string] || []).push(c); });
      const out = [];
      // Para crear diagonal ascendente: cuerda 6 → frets más bajos, cuerda 1 → más altos
      Object.keys(byString).forEach(s => {
        byString[s].sort((a, b) => a.fret - b.fret);
        const sNum = Number(s);
        // ventana para esta cuerda: base + (6 - sNum) * 2 trastes aprox
        const base = filter.focusFret != null ? filter.focusFret : 5;
        const target = base + (6 - sNum) * 2;
        const closest = byString[s]
          .map(c => ({ c, d: Math.abs(c.fret - target) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 2)
          .map(x => x.c);
        out.push(...closest);
      });
      return out;
    }
    return candidates;
  }

  function intervalToSemi(name) {
    const i = TH.INTERVAL_NAMES.indexOf(name);
    if (i >= 0) return i;
    // tensions extendidos
    return TENSION_SEMIS[name] != null ? TENSION_SEMIS[name] : 0;
  }

  // ──────────────── Render ────────────────

  let svg, fretW;
  let metro = null;

  // Pseudo-voicing: una nota por chord tone, en strings 5..1, frets 0-12.
  // Usado solo para audio en cambios de acorde, no para didáctica.
  function makePseudoVoicing(chord) {
    const out = [];
    const usedStrings = new Set();
    chord.notes.forEach((note, idx) => {
      // intentar string 5-idx, 4, 3, 2, 1
      const preferred = [5 - idx, 4, 3, 2, 1].filter(s => s >= 1 && s <= 5);
      for (const s of preferred) {
        if (usedStrings.has(s)) continue;
        const open = FB.OPEN_NOTES[6 - s];
        const oi = TH.CHROMATIC.indexOf(open);
        const ti = TH.CHROMATIC.indexOf(note);
        let fret = (ti - oi + 12) % 12;
        if (fret < 0) fret += 12;
        out.push({ string: s, fret });
        usedStrings.add(s);
        break;
      }
    });
    return out;
  }

  function render() {
    if (!svg) return;
    const dots = FB.fbGetDotsGroup(svg);
    dots.innerHTML = '';
    const chord = activeChord();
    if (!chord) { drawInfo(); drawBar(); return; }

    const renderMap = computeRenderMap(chord, state.layers);

    // Filtros
    const stringSet = state.filter.stringSet || [1,2,3,4,5,6];
    const [fMin, fMax] = state.filter.fretRange;

    // Para "horizontal" o "vertical", el spec habla de iluminar al clickear.
    // En Fase 1 ignoramos eso — Fase 5 lo agregará. Por ahora pintamos todo.

    // Posiciones del guide-tone actual y previo (para voice leading)
    const cellPositions = []; // {string, fret, note, info}

    // Recolectar candidatos respetando capas, antes de aplicar dirección
    const candidates = [];
    for (let s = 1; s <= 6; s++) {
      if (!stringSet.includes(s)) continue;
      const open = FB.OPEN_NOTES[6 - s];
      for (let f = 0; f <= NUM_FRETS; f++) {
        if (f < fMin || f > fMax) continue;
        const note = FB.fbNoteAt(open, f);
        const info = renderMap.get(note);
        if (!info) continue;
        candidates.push({ string: s, fret: f, note, info });
      }
    }

    // Aplicar modo direccional
    const filtered = applyDirection(candidates, state.filter);
    filtered.forEach(c => {
      drawCell(dots, c.string, c.fret, c.note, c.info);
      cellPositions.push(c);
    });

    // Voice leading: si guideTones activo y existe prev chord con guide tones
    // compartidos, dibujar línea entre la nota actual y la previa en la misma pc.
    if (state.layers.guideTones && _prevChord) {
      const prevMap = computeRenderMap(_prevChord, { guideTones: true });
      const sharedPcs = new Set();
      prevMap.forEach((_, pc) => { if (renderMap.has(pc) && renderMap.get(pc).kind === 'guideTones') sharedPcs.add(pc); });
      sharedPcs.forEach(pc => {
        const cur = cellPositions.find(c => c.note === pc && c.info.kind === 'guideTones');
        // posición previa estimada: misma pc, en el mástil, cerca del cur
        if (!cur) return;
        const candidates = [];
        for (let s = 1; s <= 6; s++) {
          const open = FB.OPEN_NOTES[6 - s];
          for (let f = 0; f <= NUM_FRETS; f++) {
            if (FB.fbNoteAt(open, f) === pc) candidates.push({ string: s, fret: f });
          }
        }
        let best = null, bestD = 999;
        candidates.forEach(c => {
          const dx = Math.abs(c.string - cur.string) + Math.abs(c.fret - cur.fret) * 0.4;
          if (dx < bestD) { bestD = dx; best = c; }
        });
        if (!best) return;
        const x1 = FB.fretX(best.fret, fretW);
        const y1 = FB.stringY(6 - best.string);
        const x2 = FB.fretX(cur.fret, fretW);
        const y2 = FB.stringY(6 - cur.string);
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', `M${x1},${y1} Q${(x1+x2)/2},${(y1+y2)/2 - 14} ${x2},${y2}`);
        path.setAttribute('stroke', '#d4a847');
        path.setAttribute('stroke-width', 1.5);
        path.setAttribute('stroke-opacity', 0.6);
        path.setAttribute('stroke-dasharray', '3,2');
        path.setAttribute('fill', 'none');
        dots.insertBefore(path, dots.firstChild);
      });
    }

    drawInfo();
    drawBar();
  }

  let _prevChord = null;

  function drawCell(dots, string, fret, note, info) {
    const si = 6 - string;
    const cx = FB.fretX(fret, fretW);
    const cy = FB.stringY(si);
    const color = INTERVAL_COLORS_FULL[info.interval.replace(/^→/, '')] || '#888';
    const isChordTone = info.kind === 'chordTones';
    const isGuide = info.kind === 'guideTones';
    const isApproach = info.kind === 'approach';
    const isAll = info.kind === 'allNotes';
    const r = isChordTone ? 12 : isGuide ? 13 : 9;
    const alpha = isApproach ? 0.45 : (isAll ? 0.5 : 1.0);

    if (info.interval === '1' && isChordTone) {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
      halo.setAttribute('r', r + 4); halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', color); halo.setAttribute('stroke-width', 2);
      halo.setAttribute('stroke-opacity', 0.8 * alpha);
      dots.appendChild(halo);
    }
    if (isGuide) {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
      halo.setAttribute('r', r + 3); halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', '#fff'); halo.setAttribute('stroke-width', 1.5);
      halo.setAttribute('stroke-opacity', 0.7);
      dots.appendChild(halo);
    }
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy);
    c.setAttribute('r', r); c.setAttribute('fill', color);
    c.setAttribute('fill-opacity', alpha);
    dots.appendChild(c);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', cx); label.setAttribute('y', cy + 3);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', isApproach || isAll ? 7 : 9);
    label.setAttribute('font-weight', 800);
    label.setAttribute('fill', '#000');
    label.setAttribute('fill-opacity', alpha);
    label.setAttribute('font-family', 'Trebuchet MS,sans-serif');
    label.textContent = info.interval;
    dots.appendChild(label);

    if (state.showNoteNames) {
      const noteLbl = document.createElementNS(SVG_NS, 'text');
      noteLbl.setAttribute('x', cx); noteLbl.setAttribute('y', cy + r + 9);
      noteLbl.setAttribute('text-anchor', 'middle');
      noteLbl.setAttribute('font-size', 7);
      noteLbl.setAttribute('fill', '#aaa');
      noteLbl.setAttribute('font-family', 'Trebuchet MS,sans-serif');
      noteLbl.textContent = note;
      dots.appendChild(noteLbl);
    }
  }

  // ──────────────── UI bindings ────────────────

  function $(id) { return document.getElementById(id); }

  function activeChord() {
    const c = state.progression[state.activeIdx];
    if (!c) return null;
    return TH.buildChord(c.root, c.quality);
  }

  function drawBar() {
    const bar = $('atlas-bar');
    if (!bar) return;
    bar.innerHTML = '';
    state.progression.forEach((c, i) => {
      const ch = TH.buildChord(c.root, c.quality);
      const div = document.createElement('div');
      div.className = 'prog-chord' + (i === state.activeIdx ? ' active' : '');
      div.innerHTML = `<div class="pc-name">${chordName(ch)}</div>
        <div class="pc-bars">${c.bars}c</div>`;
      div.addEventListener('click', () => setActiveChord(i));
      const del = document.createElement('div');
      del.className = 'pc-del'; del.textContent = '×';
      del.addEventListener('click', e => {
        e.stopPropagation();
        state.progression.splice(i, 1);
        if (state.progression.length === 0) state.progression.push({ root:'C', quality:'maj7', bars: 4 });
        state.activeIdx = Math.max(0, Math.min(state.activeIdx, state.progression.length - 1));
        saveState(); render();
      });
      div.appendChild(del);
      bar.appendChild(div);
    });
  }

  function drawInfo() {
    const info = $('atlas-info');
    if (!info) return;
    const c = activeChord();
    if (!c) { info.className = 'empty-state'; info.textContent = '—'; return; }
    info.className = '';
    const tones = c.notes.map((n, i) => `${n}=${c.intervals[i]}`).join(' · ');
    const ts = TENSIONS_BY_QUALITY[c.quality] || [];
    info.innerHTML = `
      <div style="font-size:18px;font-weight:700;color:var(--gold);margin-bottom:4px">${chordName(c)}</div>
      <div style="font-size:11px;color:var(--text-mid);line-height:1.6">${tones}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:6px">Tensiones disponibles: ${ts.length ? ts.join(', ') : '—'}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Escala asociada: ${SCALE_BY_QUALITY[c.quality] || 'major'}</div>
    `;
  }

  function drawLegend() {
    const lg = $('atlas-legend');
    if (!lg) return;
    lg.innerHTML = '';
    const ints = ['1','b3','3','b5','5','b7','7'];
    ints.forEach(i => {
      const span = document.createElement('span');
      span.innerHTML = `<span class="legend-dot" style="background:${INTERVAL_COLORS_FULL[i]}"></span>${i}`;
      lg.appendChild(span);
    });
  }

  function setActiveChord(idx) {
    if (idx < 0 || idx >= state.progression.length) return;
    state.activeIdx = idx;
    saveState(); render();
  }

  function setLayer(name, enabled) {
    state.layers[name] = !!enabled;
    saveState(); render();
  }

  function setProgression(chords) {
    state.progression = chords.slice();
    state.activeIdx = 0;
    saveState(); render();
  }

  function getState() { return state; }

  // ──────────────── Init ────────────────
  function init() {
    loadState();
    svg = $('atlas-fretboard');
    if (svg) {
      FB.fbInitBoard(svg, NUM_FRETS);
      fretW = FB.fbGetFretW(svg);
      buildClickGrid();
    }

    // Capas
    bindLayer('atlas-l-chord', 'chordTones');
    bindLayer('atlas-l-guide', 'guideTones');
    bindLayer('atlas-l-scale', 'scale');
    bindLayer('atlas-l-tensions', 'tensions');
    bindLayer('atlas-l-approach', 'approach');
    bindLayer('atlas-l-all', 'allNotes');
    const cb = $('atlas-show-names');
    if (cb) {
      cb.checked = state.showNoteNames;
      cb.addEventListener('change', e => { state.showNoteNames = e.target.checked; saveState(); render(); });
    }
    // reflejar estado actual de layers en checkboxes
    Object.entries({
      'atlas-l-chord': 'chordTones',
      'atlas-l-guide': 'guideTones',
      'atlas-l-scale': 'scale',
      'atlas-l-tensions': 'tensions',
      'atlas-l-approach': 'approach',
      'atlas-l-all': 'allNotes',
    }).forEach(([id, key]) => {
      const el = $(id);
      if (el) el.checked = !!state.layers[key];
    });

    // Editor
    const add = $('atlas-add');
    if (add) add.addEventListener('click', () => {
      const root = $('atlas-new-root').value;
      const quality = $('atlas-new-quality').value;
      state.progression.push({ root, quality, bars: state.beatsPerChord === 8 ? 8 : 4 });
      saveState(); render();
    });

    // Nav
    const prev = $('atlas-prev');
    if (prev) prev.addEventListener('click', () => setActiveChord((state.activeIdx - 1 + state.progression.length) % state.progression.length));
    const nxt = $('atlas-next');
    if (nxt) nxt.addEventListener('click', () => setActiveChord((state.activeIdx + 1) % state.progression.length));
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft')  { prev && prev.click(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { nxt && nxt.click(); e.preventDefault(); }
    });

    // Transporte
    const playBtn = $('atlas-play');
    if (playBtn) playBtn.addEventListener('click', play);
    const stopBtn = $('atlas-stop');
    if (stopBtn) stopBtn.addEventListener('click', stop);
    const bpmInput = $('atlas-bpm');
    if (bpmInput) {
      bpmInput.value = state.bpm;
      bpmInput.addEventListener('change', e => {
        state.bpm = Math.max(40, Math.min(220, Number(e.target.value) || 80));
        if (metro) metro.setBPM(state.bpm);
        saveState();
      });
    }
    const bpcSel = $('atlas-bpc');
    if (bpcSel) {
      bpcSel.value = String(state.beatsPerChord);
      bpcSel.addEventListener('change', e => {
        state.beatsPerChord = Number(e.target.value) || 4;
        if (metro) metro.setBeatsPerChord(state.beatsPerChord);
        saveState();
      });
    }
    // Dirección (Fase 5 — stub: solo persistencia, render aún ignora)
    const dirSel = $('atlas-direction');
    if (dirSel) {
      dirSel.value = state.filter.direction;
      dirSel.addEventListener('change', e => {
        state.filter.direction = e.target.value;
        saveState(); render();
      });
    }

    // Filtros: fret range
    const fMin = $('atlas-fret-min'), fMax = $('atlas-fret-max');
    if (fMin) { fMin.value = state.filter.fretRange[0];
      fMin.addEventListener('change', e => { state.filter.fretRange[0] = Math.max(0, Math.min(22, Number(e.target.value) || 0)); saveState(); render(); });
    }
    if (fMax) { fMax.value = state.filter.fretRange[1];
      fMax.addEventListener('change', e => { state.filter.fretRange[1] = Math.max(0, Math.min(22, Number(e.target.value) || 22)); saveState(); render(); });
    }
    // Cuerdas (custom set, no rango contiguo)
    state.filter.stringSet = state.filter.stringSet || [1,2,3,4,5,6];
    for (let s = 1; s <= 6; s++) {
      const cb = $('atlas-s-' + s);
      if (cb) {
        cb.checked = state.filter.stringSet.includes(s);
        cb.addEventListener('change', e => {
          if (e.target.checked) state.filter.stringSet = Array.from(new Set([...state.filter.stringSet, s])).sort();
          else state.filter.stringSet = state.filter.stringSet.filter(x => x !== s);
          saveState(); render();
        });
      }
    }
    const reset = $('atlas-reset');
    if (reset) reset.addEventListener('click', () => {
      state.filter = Object.assign({}, DEFAULT_STATE.filter, { stringSet: [1,2,3,4,5,6] });
      ['atlas-fret-min'].forEach(i => { const el = $(i); if (el) el.value = 0; });
      const fmax = $('atlas-fret-max'); if (fmax) fmax.value = 22;
      for (let s = 1; s <= 6; s++) { const cb = $('atlas-s-' + s); if (cb) cb.checked = true; }
      const dir = $('atlas-direction'); if (dir) dir.value = 'all';
      saveState(); render();
    });

    // Form: reflejar acorde activo en los selects de "agregar"
    const newRoot = $('atlas-new-root');
    if (newRoot && state.progression[0]) newRoot.value = state.progression[state.activeIdx].root;
    const newQuality = $('atlas-new-quality');
    if (newQuality && state.progression[0]) newQuality.value = state.progression[state.activeIdx].quality;

    drawLegend();
    render();
  }

  function play() {
    if (metro && metro.playing) return;
    if (!state.progression.length) return;
    _prevChord = null;
    metro = new G.metronome.Metronome({
      bpm: state.bpm,
      beatsPerChord: state.beatsPerChord,
      onBeat: () => {},
      onChordChange: () => {
        _prevChord = activeChord();
        const nextIdx = (state.activeIdx + 1) % state.progression.length;
        state.activeIdx = nextIdx;
        const cur = activeChord();
        if (W.IntervallicAudio && cur) {
          W.IntervallicAudio.playPositions(makePseudoVoicing(cur), { duration: (60 / state.bpm) * state.beatsPerChord * 0.9 });
        }
        render();
      },
    });
    metro.start();
    // Reproducir primer acorde inmediatamente
    const cur = activeChord();
    if (W.IntervallicAudio && cur) {
      W.IntervallicAudio.playPositions(makePseudoVoicing(cur), { duration: (60 / state.bpm) * state.beatsPerChord * 0.9 });
    }
    render();
  }

  function stop() {
    if (metro) { metro.stop(); metro = null; }
    _prevChord = null;
    render();
  }

  function buildClickGrid() {
    let g = svg.querySelector('g[data-clickgrid]');
    if (g) g.remove();
    g = document.createElementNS(SVG_NS, 'g');
    g.dataset.clickgrid = '1';
    for (let s = 1; s <= 6; s++) {
      const si = 6 - s;
      const y = FB.stringY(si);
      for (let f = 0; f <= NUM_FRETS; f++) {
        const cx = FB.fretX(f, fretW);
        const r = document.createElementNS(SVG_NS, 'rect');
        const w = fretW * 0.9, h = FB.FB_STR_GAP * 0.8;
        r.setAttribute('x', cx - w/2); r.setAttribute('y', y - h/2);
        r.setAttribute('width', w); r.setAttribute('height', h);
        r.setAttribute('fill', 'transparent');
        r.style.cursor = 'pointer';
        r.addEventListener('click', () => {
          state.filter.focusString = s;
          state.filter.focusFret = f;
          saveState(); render();
        });
        g.appendChild(r);
      }
    }
    svg.appendChild(g);
  }

  function bindLayer(id, key) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', e => setLayer(key, e.target.checked));
  }

  W.IntervalAtlas = {
    init, setProgression, setActiveChord, setLayer,
    getState,
    // expuestos para testing
    _computeRenderMap: computeRenderMap,
    _TENSIONS_BY_QUALITY: TENSIONS_BY_QUALITY,
    _SCALE_BY_QUALITY: SCALE_BY_QUALITY,
    _LAYER_PRIORITY: LAYER_PRIORITY,
    _intervalToSemi: intervalToSemi,
    _applyDirection: applyDirection,
    _makePseudoVoicing: makePseudoVoicing,
  };
})(window.GuitarShared, window);
