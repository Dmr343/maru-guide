// Interval Atlas — mástil 22 trastes con etiquetas interválicas relativas al
// acorde activo. IIFE, file:// safe.
(function (G, W) {
  const TH  = G.theory;
  const FB  = G.fretboard;
  const POS = G.positions;

  const NUM_FRETS = 22;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LS_KEY = 'atlas_state';

  // Colores con par bemol/natural diferenciado: el natural más brillante,
  // el bemol más oscuro/desaturado pero misma familia de hue.
  const INTERVAL_COLORS_FULL = {
    '1':  '#d4a847',                          // dorado raíz
    'b2': '#5a3a40', '2':  '#7a5a30',
    'b3': '#b35a14', '3':  '#ff9b3d',         // naranjas: b3 quemado, 3 brillante
    '4':  '#6a7a40',
    'b5': '#1e6da5', '5':  '#5fb8f0',         // azules: b5 profundo, 5 claro
    'b6': '#5a3a6a', '6':  '#7a5a8a',
    'b7': '#1e9650', '7':  '#7ce8a2',         // verdes: b7 oscuro, 7 lima
  };
  const CHORD_TONE_INTERVALS = new Set(['1','b3','3','b5','5','b7','7']);

  // Capas y prioridad de pintado (mayor número = se pinta encima).
  // approach = chord tones del PRÓXIMO acorde (sutil, hint visual de lo que viene).
  const LAYER_PRIORITY = {
    allNotes:   1,
    scale:      2,
    tensions:   3,
    approach:   4,
    chordTones: 5,
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

  // Glifo corto para la paleta (familia jazz: Δ, m, 7, °, ø)
  const QUALITY_GLYPH = {
    major: '',  maj7: 'Δ',
    minor: 'm', min7: 'm7',
    dom7:  '7',
    dim:   '°', dim7: '°',
    m7b5:  'ø',
    aug:   '+',
  };

  // Color muted por cualidad — solo para borde de paleta. NO compite con
  // los colores brillantes de los intervalos del mástil.
  const QUALITY_PALETTE_COLOR = {
    major: '#8a7333', maj7: '#8a7333',
    minor: '#5a6b7a', min7: '#5a6b7a',
    dom7:  '#7a4040',
    dim:   '#5a3a6a', dim7: '#5a3a6a',
    m7b5:  '#4a3a5a',
    aug:   '#6b5a3a',
  };

  function chordName(c) { return c.root + (QUALITY_LABEL[c.quality] ?? c.quality); }

  // ──────────────── Estado ────────────────
  const DEFAULT_STATE = {
    progression: [],
    activeIdx: 0,
    layers: {
      chordTones: true, scale: false, tensions: false,
      approach: false, allNotes: false,
    },
    filter: { direction: 'all', stringRange: [1, 6], fretRange: [0, 22], focusString: 3, focusFret: 5 },
    showNoteNames: false,
    parentKey: 'C',
    parentMode: 'major',
    bpm: 80,
    beatsPerChord: 4,
    filtersCollapsed: true,
    optionsCollapsed: false,
    paletteMode: 'libre',
    diatonicKey: 'C',
    diatonicMode: 'major',
    prerollEnabled: false,
    loopRange: null, // [startIdx, endIdx] inclusivo o null
    hiddenIntervals: [], // ej ['5','b5'] para ocultarlos del mástil
    metroMuted: false,
  };

  const LS_FAVS = 'atlas_favorites';
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

  // Para el acorde activo, devuelve un map {pitchClass → {interval, kind, ...}}.
  // nextChord (opcional): cuando layers.approach está activo, los chord tones
  // del próximo acorde se pintan sutilmente con su intervalo relativo a la
  // raíz del próximo (label tipo "1@A" para indicar contexto futuro).
  function computeRenderMap(chord, layers, nextChord) {
    if (!chord) return new Map();
    const ri = TH.CHROMATIC.indexOf(chord.root);
    const map = new Map();

    function consider(pcIndex, interval, kind, extra) {
      const pc = TH.CHROMATIC[((ri + pcIndex) % 12 + 12) % 12];
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
      for (let s = 0; s < 12; s++) {
        consider(s, TH.INTERVAL_NAMES[s], 'allNotes');
      }
    }

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

    if (layers.tensions) {
      const ts = TENSIONS_BY_QUALITY[chord.quality] || [];
      ts.forEach(t => {
        const sem = TENSION_SEMIS[t];
        if (sem != null) consider(sem, t, 'tensions');
      });
    }

    // approach: chord tones del próximo acorde, con intervalo relativo a su raíz.
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
    // próximo (con approach activo), guardar el intervalo del próximo
    // como metadato para que drawCell pueda dibujar un anillo extra.
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
  let _fretStart = 0;

  // Posición x de un fret absoluto en el mástil (considera fretStart actual).
  function xFor(absoluteFret) {
    return FB.fretX(absoluteFret - _fretStart, fretW);
  }

  function reinitBoard() {
    if (!svg) return;
    const [fMin, fMax] = state.filter.fretRange;
    _fretStart = Math.max(0, Math.min(22, fMin));
    const span = Math.max(1, Math.min(22, fMax - fMin));
    FB.fbInitBoard(svg, span, _fretStart);
    fretW = FB.fbGetFretW(svg);
    buildClickGrid();
  }

  function render() {
    if (!svg) return;
    const dots = FB.fbGetDotsGroup(svg);
    dots.innerHTML = '';
    const chord = activeChord();
    if (!chord) { drawInfo(); drawBar(); return; }

    const renderMap = applyHiddenIntervals(
      computeRenderMap(chord, state.layers, nextChord()),
      state.hiddenIntervals
    );

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

    drawInfo();
    drawBar();
  }

  let _prevChord = null;

  function drawCell(dots, string, fret, note, info) {
    const si = 6 - string;
    const cx = xFor(fret);
    const cy = FB.stringY(si);
    const color = INTERVAL_COLORS_FULL[info.interval.replace(/^→/, '')] || '#888';
    const isChordTone = info.kind === 'chordTones';
    const isApproach = info.kind === 'approach';
    const isAll = info.kind === 'allNotes';
    const r = isChordTone ? 12 : isApproach ? 7 : 9;
    const alpha = isApproach ? 0.55 : (isAll ? 0.5 : 1.0);

    if (info.interval === '1' && isChordTone) {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
      halo.setAttribute('r', r + 4); halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', color); halo.setAttribute('stroke-width', 2);
      halo.setAttribute('stroke-opacity', 0.8 * alpha);
      dots.appendChild(halo);
    }

    if (isApproach) {
      // Ghost: anillo dashed sin fill, label pequeño en el color del intervalo.
      const ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
      ring.setAttribute('r', r); ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', color); ring.setAttribute('stroke-width', 1.3);
      ring.setAttribute('stroke-opacity', alpha);
      ring.setAttribute('stroke-dasharray', '2.2,1.8');
      dots.appendChild(ring);
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', cx); label.setAttribute('y', cy + 2.5);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', 6.5);
      label.setAttribute('font-weight', 700);
      label.setAttribute('fill', color);
      label.setAttribute('fill-opacity', alpha + 0.2);
      label.setAttribute('font-family', 'Trebuchet MS,sans-serif');
      label.textContent = info.interval;
      dots.appendChild(label);
    } else {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', r); c.setAttribute('fill', color);
      c.setAttribute('fill-opacity', alpha);
      dots.appendChild(c);
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', cx); label.setAttribute('y', cy + 3);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', isAll ? 7 : 9);
      label.setAttribute('font-weight', 800);
      label.setAttribute('fill', '#000');
      label.setAttribute('fill-opacity', alpha);
      label.setAttribute('font-family', 'Trebuchet MS,sans-serif');
      label.textContent = info.interval;
      dots.appendChild(label);

      // Si la nota también es chord tone del próximo acorde: anillo dashed
      // exterior + badge mini con el intervalo en el próximo (sutil pero visible).
      if (info.nextInterval) {
        const nextColor = INTERVAL_COLORS_FULL[info.nextInterval] || '#888';
        const outerRing = document.createElementNS(SVG_NS, 'circle');
        outerRing.setAttribute('cx', cx); outerRing.setAttribute('cy', cy);
        outerRing.setAttribute('r', r + 5);
        outerRing.setAttribute('fill', 'none');
        outerRing.setAttribute('stroke', nextColor);
        outerRing.setAttribute('stroke-width', 1.3);
        outerRing.setAttribute('stroke-opacity', 0.7);
        outerRing.setAttribute('stroke-dasharray', '2.2,1.8');
        dots.appendChild(outerRing);

        // Badge con el intervalo del próximo, abajo a la derecha
        const badgeX = cx + r + 3;
        const badgeY = cy + r + 2;
        const txtLen = info.nextInterval.length * 4 + 4;
        const badgeBg = document.createElementNS(SVG_NS, 'rect');
        badgeBg.setAttribute('x', badgeX - txtLen / 2);
        badgeBg.setAttribute('y', badgeY - 4.5);
        badgeBg.setAttribute('width', txtLen);
        badgeBg.setAttribute('height', 9);
        badgeBg.setAttribute('rx', 3);
        badgeBg.setAttribute('fill', '#0e0e0e');
        badgeBg.setAttribute('stroke', nextColor);
        badgeBg.setAttribute('stroke-width', 0.8);
        badgeBg.setAttribute('stroke-opacity', 0.7);
        dots.appendChild(badgeBg);
        const badgeTxt = document.createElementNS(SVG_NS, 'text');
        badgeTxt.setAttribute('x', badgeX);
        badgeTxt.setAttribute('y', badgeY + 2.5);
        badgeTxt.setAttribute('text-anchor', 'middle');
        badgeTxt.setAttribute('font-size', 6);
        badgeTxt.setAttribute('font-weight', 700);
        badgeTxt.setAttribute('fill', nextColor);
        badgeTxt.setAttribute('font-family', 'Trebuchet MS,sans-serif');
        badgeTxt.textContent = info.nextInterval;
        dots.appendChild(badgeTxt);
      }
    }

    if (state.showNoteNames) {
      const txtW = note.length === 2 ? 16 : 11;
      const pillY = cy + r + 4;
      const pill = document.createElementNS(SVG_NS, 'rect');
      pill.setAttribute('x', cx - txtW / 2);
      pill.setAttribute('y', pillY);
      pill.setAttribute('width', txtW);
      pill.setAttribute('height', 11);
      pill.setAttribute('rx', 5);
      pill.setAttribute('fill', '#0e0e0e');
      pill.setAttribute('stroke', color);
      pill.setAttribute('stroke-width', 1);
      pill.setAttribute('stroke-opacity', 0.8 * alpha);
      pill.setAttribute('fill-opacity', 0.95);
      dots.appendChild(pill);
      const noteLbl = document.createElementNS(SVG_NS, 'text');
      noteLbl.setAttribute('x', cx);
      noteLbl.setAttribute('y', pillY + 8.5);
      noteLbl.setAttribute('text-anchor', 'middle');
      noteLbl.setAttribute('font-size', 8.5);
      noteLbl.setAttribute('font-weight', 700);
      noteLbl.setAttribute('fill', color);
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

  function nextChord() {
    if (!state.progression.length) return null;
    const i = (state.activeIdx + 1) % state.progression.length;
    if (i === state.activeIdx) return null; // un solo acorde, no hay "siguiente"
    const c = state.progression[i];
    return TH.buildChord(c.root, c.quality);
  }

  // Ancho del slot proporcional a bars. Base 70px + 30px por compás extra.
  function slotWidth(bars) {
    const b = Math.max(1, Math.min(8, bars || 1));
    return 70 + (b - 1) * 30;
  }

  function removeChordAt(idx) {
    const m = ensureModel(); if (!m) return;
    _prevChord = null;
    m.removeChordAt(idx);
  }

  function moveChord(srcIdx, destIdx) {
    const m = ensureModel(); if (!m) return;
    m.moveChord(srcIdx, destIdx);
  }

  let _dragSrcIdx = null;
  let _editPopover = null;

  // Edit inline: popover sobre un slot para editar root/quality sin borrar.
  function openEditPopover(idx, anchorEl) {
    closeEditPopover();
    const c = state.progression[idx];
    if (!c) return;
    const pop = document.createElement('div');
    pop.className = 'edit-popover';
    pop.innerHTML = `
      <div class="edit-popover-title">Editar acorde #${idx + 1}</div>
      <select class="ep-root">
        ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
          .map(r => `<option ${r === c.root ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <select class="ep-quality">
        <option value="maj7" ${c.quality==='maj7'?'selected':''}>maj7</option>
        <option value="min7" ${c.quality==='min7'?'selected':''}>m7</option>
        <option value="dom7" ${c.quality==='dom7'?'selected':''}>7</option>
        <option value="dim7" ${c.quality==='dim7'?'selected':''}>dim7</option>
        <option value="m7b5" ${c.quality==='m7b5'?'selected':''}>m7b5</option>
      </select>
      <div class="edit-popover-actions">
        <button class="btn ep-cancel">Cancelar</button>
        <button class="btn primary ep-save">Guardar</button>
      </div>
    `;
    document.body.appendChild(pop);
    const r = anchorEl.getBoundingClientRect();
    pop.style.left = Math.max(8, r.left) + 'px';
    pop.style.top  = (r.bottom + 6) + 'px';
    _editPopover = pop;

    const save = () => {
      const newRoot = pop.querySelector('.ep-root').value;
      const newQ    = pop.querySelector('.ep-quality').value;
      if (model) model.editChordAt(idx, { root: newRoot, quality: newQ });
      closeEditPopover();
    };
    pop.querySelector('.ep-save').addEventListener('click', save);
    pop.querySelector('.ep-cancel').addEventListener('click', closeEditPopover);
    pop.addEventListener('keydown', e => {
      if (e.key === 'Enter') { save(); e.preventDefault(); }
      if (e.key === 'Escape') { closeEditPopover(); e.preventDefault(); }
    });
    setTimeout(() => {
      const onDocClick = ev => {
        if (!_editPopover) return;
        if (!_editPopover.contains(ev.target)) {
          closeEditPopover();
          document.removeEventListener('mousedown', onDocClick);
        }
      };
      document.addEventListener('mousedown', onDocClick);
    }, 0);
  }

  function closeEditPopover() {
    if (_editPopover) {
      _editPopover.remove();
      _editPopover = null;
    }
  }

  // Copiar / pegar delegan al modelo (clipboard interno).
  function copyActiveChord() {
    const m = ensureModel(); return m ? m.copyActiveChord() : false;
  }

  // Switch único de atajos de teclado. Devuelve true si manejó la tecla.
  function handleKeydown(e) {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return false;

    // Modificadores (Ctrl+C, Ctrl+V)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'c' || e.key === 'C') {
        if (copyActiveChord()) e.preventDefault();
        return true;
      }
      if (e.key === 'v' || e.key === 'V') {
        if (pasteAfterActive()) e.preventDefault();
        return true;
      }
      return false;
    }

    switch (e.key) {
      case ' ':
      case 'Spacebar':
        togglePlay(); e.preventDefault(); return true;
      case 'ArrowLeft':
        setActiveChord((state.activeIdx - 1 + Math.max(1, state.progression.length)) % Math.max(1, state.progression.length));
        e.preventDefault(); return true;
      case 'ArrowRight':
        setActiveChord((state.activeIdx + 1) % Math.max(1, state.progression.length));
        e.preventDefault(); return true;
      case 'ArrowUp':
        changeActiveBars(+1); e.preventDefault(); return true;
      case 'ArrowDown':
        changeActiveBars(-1); e.preventDefault(); return true;
      case 't': case 'T':
        handleTap(); e.preventDefault(); return true;
      case 'Delete': case 'Backspace':
        if (state.progression.length) {
          removeChordAt(state.activeIdx);
          e.preventDefault();
        }
        return true;
      case 'Escape':
        if (_editPopover) closeEditPopover();
        else if ($('atlas-presets-modal') && $('atlas-presets-modal').style.display === 'flex') closePresetsModal();
        else if (transport && transport.getState().transport === 'playing') pause();
        else clearProgression();
        e.preventDefault(); return true;
    }

    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (idx < state.progression.length) setActiveChord(idx);
      e.preventDefault();
      return true;
    }
    return false;
  }

  function pasteAfterActive() {
    const m = ensureModel(); if (!m) return false;
    _prevChord = null;
    return m.pasteAfterActive();
  }

  function drawBar() {
    const bar = $('atlas-bar');
    if (!bar) return;
    bar.innerHTML = '';
    state.progression.forEach((c, i) => {
      const ch = TH.buildChord(c.root, c.quality);
      const div = document.createElement('div');
      div.className = 'prog-chord' + (i === state.activeIdx ? ' active' : '');
      div.style.width = slotWidth(c.bars) + 'px';
      div.setAttribute('draggable', 'true');
      div.title = 'Click: quitar · arrastrar: reordenar · ↑↓: ± compás';
      const qCol = QUALITY_PALETTE_COLOR[c.quality] || '#5a5a5a';
      div.style.borderLeft = '3px solid ' + qCol;
      div.innerHTML = `<div class="pc-name">${chordName(ch)}</div>
        <div class="pc-bars-vis" aria-label="${c.bars} compás${c.bars===1?'':'es'}">${'●'.repeat(c.bars)}</div>`;

      // Visual: highlight si está dentro del loop range activo
      if (state.loopRange) {
        const [a, b] = state.loopRange;
        const lo = Math.min(a, b), hi = Math.max(a, b);
        if (i >= lo && i <= hi) div.classList.add('in-loop');
      }

      // Click simple → quitar; shift-click → setear loop range
      let _clickTimer = null;
      div.addEventListener('click', e => {
        if (e.shiftKey) {
          // Loop region: 1° shift-click setea start, 2° setea end, 3° limpia.
          if (!model) return;
          const lr = model.loopRange;
          if (!lr) model.setLoopRange(i, i);
          else if (lr[0] === lr[1] && lr[0] !== i) model.setLoopRange(lr[0], i);
          else model.setLoopRange(null);
          return;
        }
        if (_clickTimer) return;
        _clickTimer = setTimeout(() => {
          _clickTimer = null;
          removeChordAt(i);
        }, 220);
      });
      div.addEventListener('dblclick', e => {
        if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; }
        e.preventDefault();
        e.stopPropagation();
        openEditPopover(i, div);
      });

      // Drag-to-reorder
      div.addEventListener('dragstart', e => {
        _dragSrcIdx = i;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(i)); } catch (_) {}
        div.classList.add('dragging');
      });
      div.addEventListener('dragend', () => {
        _dragSrcIdx = null;
        div.classList.remove('dragging');
        document.querySelectorAll('.prog-chord.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
      div.addEventListener('dragover', e => {
        if (_dragSrcIdx === null) return;
        e.preventDefault();
        div.classList.add('drag-over');
      });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
      div.addEventListener('drop', e => {
        e.preventDefault();
        div.classList.remove('drag-over');
        if (_dragSrcIdx === null) return;
        moveChord(_dragSrcIdx, i);
        _dragSrcIdx = null;
      });

      bar.appendChild(div);
    });
  }

  // Renderiza la paleta (modo Libre o Diatónico). Se llama en init y al
  // cambiar de modo, tónica o modo. Independiente de la progresión.
  function renderPalette() {
    const paneLibre = $('atlas-palette-libre');
    const paneDiat  = $('atlas-palette-diatonic');
    const isDiat = state.paletteMode === 'diatonic';
    if (paneLibre) paneLibre.style.display = isDiat ? 'none' : '';
    if (paneDiat)  paneDiat.style.display  = isDiat ? '' : 'none';
    document.querySelectorAll('.mode-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.mode === state.paletteMode));
    if (isDiat) renderDiatonicChips();
  }

  function renderDiatonicChips() {
    const cont = $('atlas-diat-chips');
    if (!cont) return;
    cont.innerHTML = '';
    const key = state.diatonicKey || 'C';
    const mode = state.diatonicMode || 'major';
    let diatonic;
    try { diatonic = TH.getDiatonicChords(key, mode); } catch (e) { return; }
    diatonic.forEach(d => {
      const q = d.chord.quality;
      const color = QUALITY_PALETTE_COLOR[q] || '#5a5a5a';
      const glyph = QUALITY_GLYPH[q] || '';
      const name = chordName(d.chord);
      const notes = d.chord.notes.join(' · ');
      const btn = document.createElement('button');
      btn.className = 'diat-chip';
      btn.style.borderLeftColor = color;
      btn.title = `${d.numeral} — ${name}\nNotas: ${notes}`;
      btn.innerHTML = `
        <div class="diat-chip-row">
          <span class="diat-chip-roman">${d.numeral}</span>
          <span class="diat-chip-glyph">${glyph}</span>
        </div>
        <div class="diat-chip-name">${name}</div>
        <div class="diat-chip-notes">${notes}</div>
      `;
      btn.addEventListener('click', () =>
        addChord({ root: d.chord.root, quality: q, bars: 1 }));
      cont.appendChild(btn);
    });
  }

  function setPaletteMode(mode) {
    state.paletteMode = mode === 'diatonic' ? 'diatonic' : 'libre';
    saveState();
    renderPalette();
  }

  // ─── UI de presets ─────────────────────────────────────────────────────
  let _presetsActiveGenre = null;

  function openPresetsModal() {
    if (!W.AtlasPresets) return;
    const modal = $('atlas-presets-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    if (!_presetsActiveGenre) _presetsActiveGenre = W.AtlasPresets.GENRES[0].id;
    renderPresetsModal();
  }

  function closePresetsModal() {
    const modal = $('atlas-presets-modal');
    if (modal) modal.style.display = 'none';
  }

  function renderPresetsModal() {
    const tabs = $('atlas-presets-tabs');
    const list = $('atlas-presets-list');
    if (!tabs || !list || !W.AtlasPresets) return;
    tabs.innerHTML = '';
    W.AtlasPresets.GENRES.forEach(g => {
      const b = document.createElement('button');
      b.className = 'modal-tab' + (g.id === _presetsActiveGenre ? ' active' : '');
      b.textContent = g.label;
      b.addEventListener('click', () => { _presetsActiveGenre = g.id; renderPresetsModal(); });
      tabs.appendChild(b);
    });
    list.innerHTML = '';
    const items = W.AtlasPresets.byGenre(_presetsActiveGenre);
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      const summary = p.chords.map(c =>
        c.root + (QUALITY_LABEL[c.quality] ?? c.quality)).join(' · ');
      card.innerHTML = `
        <div class="preset-card-name">${p.name}</div>
        <div class="preset-card-chords">${summary}</div>
      `;
      card.addEventListener('click', () => {
        loadPreset(p.id);
        closePresetsModal();
      });
      list.appendChild(card);
    });
  }

  // ─── UI de favoritos ───────────────────────────────────────────────────
  function renderFavorites() {
    const cont = $('atlas-favorites');
    if (!cont) return;
    const list = loadFavorites();
    if (!list.length) { cont.innerHTML = ''; return; }
    const wrap = document.createElement('div');
    wrap.className = 'fav-list';
    list.forEach(f => {
      const item = document.createElement('div');
      item.className = 'fav-item';
      const name = document.createElement('span');
      name.className = 'fav-item-name';
      name.textContent = '★ ' + f.name + '  (' + f.chords.length + ')';
      name.addEventListener('click', () => loadFavoriteIntoProg(f.id));
      const del = document.createElement('span');
      del.className = 'fav-item-del';
      del.textContent = '✕';
      del.title = 'Borrar favorito';
      del.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('¿Borrar "' + f.name + '"?')) {
          deleteFavorite(f.id);
          renderFavorites();
        }
      });
      item.appendChild(name);
      item.appendChild(del);
      wrap.appendChild(item);
    });
    cont.innerHTML = '';
    cont.appendChild(wrap);
  }

  function promptSaveFavorite() {
    if (!state.progression.length) {
      alert('Agregá acordes antes de guardar como favorito.');
      return;
    }
    const name = prompt('Nombre del favorito:', 'Mi progresión');
    if (!name) return;
    saveCurrentAsFavorite(name.trim());
    renderFavorites();
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
    const hidden = new Set(state.hiddenIntervals || []);
    ints.forEach(i => {
      const btn = document.createElement('button');
      const isHidden = hidden.has(i);
      btn.className = 'legend-toggle' + (isHidden ? ' off' : '');
      btn.title = isHidden ? `Mostrar ${i}` : `Ocultar ${i}`;
      btn.innerHTML = `<span class="legend-dot" style="background:${INTERVAL_COLORS_FULL[i]}"></span>${i}`;
      btn.addEventListener('click', () => toggleHiddenInterval(i));
      lg.appendChild(btn);
    });
    // Botón "mostrar todos" si hay algo oculto
    if (hidden.size > 0) {
      const reset = document.createElement('button');
      reset.className = 'legend-toggle reset';
      reset.textContent = 'Mostrar todos';
      reset.addEventListener('click', () => {
        state.hiddenIntervals = [];
        saveState(); render(); drawLegend();
      });
      lg.appendChild(reset);
    }
  }

  function toggleHiddenInterval(interval) {
    const hidden = new Set(state.hiddenIntervals || []);
    if (hidden.has(interval)) hidden.delete(interval);
    else hidden.add(interval);
    state.hiddenIntervals = Array.from(hidden);
    saveState(); render(); drawLegend();
  }

  // Pure: dado el render map y la lista de hidden, filtra las celdas
  // cuyo intervalo está oculto. También filtra el nextInterval del cross-ref.
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

  function addChord(c) {
    const m = ensureModel(); if (!m) return;
    m.addChord({
      root: c.root || 'C',
      quality: c.quality || 'maj7',
      bars: c.bars,
    });
  }

  // ─── Favoritos ───────────────────────────────────────────────────────────
  function loadFavorites() {
    try {
      const raw = localStorage.getItem(LS_FAVS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveFavorites(list) {
    try { localStorage.setItem(LS_FAVS, JSON.stringify(list)); } catch (e) {}
  }
  function saveCurrentAsFavorite(name) {
    if (!state.progression.length) return null;
    const list = loadFavorites();
    const fav = {
      id: 'fav_' + Date.now(),
      name: name || ('Progresión ' + (list.length + 1)),
      chords: state.progression.map(c => ({ root: c.root, quality: c.quality, bars: c.bars })),
    };
    list.push(fav);
    saveFavorites(list);
    return fav;
  }
  function loadFavoriteIntoProg(favId) {
    const fav = loadFavorites().find(f => f.id === favId);
    const m = ensureModel();
    if (!fav || !m) return false;
    m.loadProgression(fav.chords);
    return true;
  }
  function deleteFavorite(favId) {
    const list = loadFavorites().filter(f => f.id !== favId);
    saveFavorites(list);
  }

  // ─── Presets ─────────────────────────────────────────────────────────────
  function loadPreset(presetId) {
    const m = ensureModel();
    if (!W.AtlasPresets || !m) return false;
    const p = W.AtlasPresets.byId(presetId);
    if (!p) return false;
    m.loadProgression(p.chords);
    return true;
  }

  function changeActiveBars(delta) {
    const m = ensureModel(); if (m) m.changeActiveBars(delta);
  }

  function setActiveChord(idx) {
    const m = ensureModel(); if (m) m.setActiveChord(idx);
  }

  function setLayer(name, enabled) {
    state.layers[name] = !!enabled;
    saveState(); render();
  }

  function setProgression(chords) {
    const m = ensureModel(); if (!m) return;
    m.loadProgression(chords);
  }

  function getState() { return state; }

  // ──────────────── Init ────────────────
  let model = null;  // ProgressionModel — source of truth para progression/activeIdx/loopRange

  function syncStateFromModel() {
    if (!model) return;
    const snap = model.snapshot();
    state.progression = snap.progression;
    state.activeIdx = snap.activeIdx;
    state.loopRange = snap.loopRange;
  }

  // Lazy-init del modelo. Se llama desde init() y desde cualquier mutador.
  // Permite usar el atlas en entorno de tests sin DOM.
  function ensureModel() {
    if (model) return model;
    if (!W.ProgressionModel) return null;
    model = new W.ProgressionModel({
      initialState: {
        progression: state.progression,
        activeIdx: state.activeIdx,
        loopRange: state.loopRange,
      },
      onChange() {
        syncStateFromModel();
        saveState();
        render();
      },
    });
    syncStateFromModel();
    return model;
  }

  function init() {
    loadState();
    ensureModel();
    svg = $('atlas-fretboard');
    if (svg) reinitBoard();

    // Capas
    bindLayer('atlas-l-chord', 'chordTones');
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
      'atlas-l-scale': 'scale',
      'atlas-l-tensions': 'tensions',
      'atlas-l-approach': 'approach',
      'atlas-l-all': 'allNotes',
    }).forEach(([id, key]) => {
      const el = $(id);
      if (el) el.checked = !!state.layers[key];
    });

    // Editor — modo Libre
    const add = $('atlas-add');
    if (add) add.addEventListener('click', () => {
      const root = $('atlas-new-root').value;
      const quality = $('atlas-new-quality').value;
      addChord({ root, quality, bars: 1 });
    });

    // Tabs de paleta
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => setPaletteMode(tab.dataset.mode));
    });

    // Editor — modo Diatónico
    const diatKey = $('atlas-diat-key');
    if (diatKey) {
      diatKey.value = state.diatonicKey || 'C';
      diatKey.addEventListener('change', e => {
        state.diatonicKey = e.target.value;
        saveState(); renderPalette();
      });
    }
    const diatMode = $('atlas-diat-mode');
    if (diatMode) {
      diatMode.value = state.diatonicMode || 'major';
      diatMode.addEventListener('change', e => {
        state.diatonicMode = e.target.value;
        saveState(); renderPalette();
      });
    }

    // Nav
    const prev = $('atlas-prev');
    if (prev) prev.addEventListener('click', () => setActiveChord((state.activeIdx - 1 + state.progression.length) % state.progression.length));
    const nxt = $('atlas-next');
    if (nxt) nxt.addEventListener('click', () => setActiveChord((state.activeIdx + 1) % state.progression.length));
    const clearProg = $('atlas-clear-prog');
    if (clearProg) clearProg.addEventListener('click', clearProgression);
    document.addEventListener('keydown', handleKeydown);

    // Transporte
    const playBtn = $('atlas-play');
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    const bpmInput = $('atlas-bpm');
    if (bpmInput) {
      bpmInput.value = state.bpm;
      bpmInput.addEventListener('change', e => {
        const v = Math.max(40, Math.min(220, Number(e.target.value) || 80));
        state.bpm = v;
        const tc = ensureTransport(); if (tc) tc.setBpm(v);
        saveState();
      });
    }
    const tapBtn = $('atlas-tap');
    if (tapBtn) tapBtn.addEventListener('click', handleTap);
    const prerollCb = $('atlas-preroll');
    if (prerollCb) {
      prerollCb.checked = !!state.prerollEnabled;
      prerollCb.addEventListener('change', e => {
        state.prerollEnabled = e.target.checked;
        const tc = ensureTransport(); if (tc) tc.setPrerollEnabled(state.prerollEnabled);
        saveState();
      });
    }
    const muteCb = $('atlas-mute-click');
    if (muteCb) {
      muteCb.checked = !!state.metroMuted;
      muteCb.addEventListener('change', e => {
        state.metroMuted = e.target.checked;
        const tc = ensureTransport(); if (tc) tc.setMuted(state.metroMuted);
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
      fMin.addEventListener('change', e => {
        const v = Math.max(0, Math.min(22, Number(e.target.value) || 0));
        state.filter.fretRange[0] = Math.min(v, state.filter.fretRange[1]);
        saveState(); reinitBoard(); render();
      });
    }
    if (fMax) { fMax.value = state.filter.fretRange[1];
      fMax.addEventListener('change', e => {
        const v = Math.max(0, Math.min(22, Number(e.target.value) || 22));
        state.filter.fretRange[1] = Math.max(v, state.filter.fretRange[0]);
        saveState(); reinitBoard(); render();
      });
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
    const filtersBlock = $('atlas-filters-block');
    if (filtersBlock) {
      filtersBlock.open = !state.filtersCollapsed;
      filtersBlock.addEventListener('toggle', () => {
        state.filtersCollapsed = !filtersBlock.open;
        saveState();
      });
    }
    const optionsBlock = $('atlas-options-block');
    if (optionsBlock) {
      optionsBlock.open = !state.optionsCollapsed;
      optionsBlock.addEventListener('toggle', () => {
        state.optionsCollapsed = !optionsBlock.open;
        saveState();
      });
    }
    const reset = $('atlas-reset');
    if (reset) reset.addEventListener('click', () => {
      state.filter = Object.assign({}, DEFAULT_STATE.filter, { stringSet: [1,2,3,4,5,6] });
      ['atlas-fret-min'].forEach(i => { const el = $(i); if (el) el.value = 0; });
      const fmax = $('atlas-fret-max'); if (fmax) fmax.value = 22;
      for (let s = 1; s <= 6; s++) { const cb = $('atlas-s-' + s); if (cb) cb.checked = true; }
      const dir = $('atlas-direction'); if (dir) dir.value = 'all';
      saveState(); reinitBoard(); render();
    });

    // Form: reflejar acorde activo en los selects de "agregar"
    const newRoot = $('atlas-new-root');
    if (newRoot && state.progression[0]) newRoot.value = state.progression[state.activeIdx].root;
    const newQuality = $('atlas-new-quality');
    if (newQuality && state.progression[0]) newQuality.value = state.progression[state.activeIdx].quality;

    // Presets y favoritos
    const presetsBtn = $('atlas-presets-btn');
    if (presetsBtn) presetsBtn.addEventListener('click', openPresetsModal);
    const presetsClose = $('atlas-presets-close');
    if (presetsClose) presetsClose.addEventListener('click', closePresetsModal);
    const presetsModal = $('atlas-presets-modal');
    if (presetsModal) presetsModal.addEventListener('click', e => {
      if (e.target === presetsModal) closePresetsModal();
    });
    const favSave = $('atlas-fav-save');
    if (favSave) favSave.addEventListener('click', promptSaveFavorite);

    drawLegend();
    renderPalette();
    renderFavorites();
    render();
  }

  const BEATS_PER_COMPAS = 4;

  // Adapter sobre G.metronome.Metronome para que sea reemplazable en tests.
  // Lazy: crea el Metronome cuando se llama start(), lo destruye en stop().
  function MetronomeClock() {
    let m = null;
    const self = {
      onBeat: () => {},
      _bpm: 100, _muted: false,
      start() {
        if (m) m.stop();
        m = new G.metronome.Metronome({
          bpm: self._bpm,
          beatsPerChord: 99999,
          beatsPerCompas: BEATS_PER_COMPAS,
          muted: self._muted,
          onBeat: (beat) => self.onBeat(beat),
        });
        m.start();
      },
      stop()       { if (m) { m.stop(); m = null; } },
      setBpm(n)    { self._bpm = n; if (m) m.setBPM(n); },
      setMuted(b)  { self._muted = b; if (m) m.setMuted(b); },
    };
    return self;
  }

  let transport = null;  // TransportController lazy-creado en ensureTransport

  function ensureTransport() {
    if (transport) return transport;
    if (!W.TransportController) return null;
    const m = ensureModel();
    if (!m) return null;
    const clock = MetronomeClock();
    transport = new W.TransportController({
      clock,
      model: m,
      beatsPerCompas: BEATS_PER_COMPAS,
      bpm: state.bpm,
      muted: state.metroMuted,
      prerollEnabled: state.prerollEnabled,
      onTransportChange(s) {
        setPlayingUI(s.transport, s.prerollRemaining);
      },
      onBeat(e) {
        pulseActiveChord(e);
      },
    });
    return transport;
  }

  function togglePlay() {
    const tc = ensureTransport(); if (!tc) return;
    // Sync settings desde la UI viva (defensa contra drift entre state/controller/DOM).
    const prerollCb = $('atlas-preroll');
    if (prerollCb) tc.setPrerollEnabled(prerollCb.checked);
    const muteCb = $('atlas-mute-click');
    if (muteCb) tc.setMuted(muteCb.checked);
    tc.togglePlay();
  }
  function pause() {
    const tc = ensureTransport(); if (tc) tc.pause();
  }
  function stop() {
    const tc = ensureTransport(); if (tc) tc.stop();
  }
  function handleTap() {
    const tc = ensureTransport(); if (!tc) return;
    const bpm = tc.handleTap();
    if (bpm != null) {
      state.bpm = bpm;
      const inp = $('atlas-bpm');
      if (inp) inp.value = bpm;
      saveState();
    }
    const btn = $('atlas-tap');
    if (btn) {
      btn.classList.add('tap-pulse');
      setTimeout(() => btn.classList.remove('tap-pulse'), 120);
    }
  }

  function pulseActiveChord(e) {
    const bar = $('atlas-bar');
    if (!bar) return;
    const cells = bar.querySelectorAll('.prog-chord');
    const target = cells[e.activeIdx];
    if (!target) return;
    target.classList.add('beat');
    setTimeout(() => target.classList.remove('beat'), 90);
    if (e.isDownbeat) {
      target.classList.add('downbeat');
      setTimeout(() => target.classList.remove('downbeat'), 140);
    }
  }

  function setPlayingUI(t, prerollRemaining) {
    const btn = $('atlas-play');
    if (!btn) return;
    btn.classList.remove('playing', 'paused');
    if (t === 'playing') {
      btn.textContent = '❚❚ Pausa';
      btn.classList.add('playing');
    } else if (t === 'paused') {
      btn.textContent = '▶ Reanudar';
      btn.classList.add('paused');
    } else if (t === 'preroll') {
      btn.classList.add('playing');
      btn.textContent = '◷ ' + (prerollRemaining != null ? prerollRemaining : BEATS_PER_COMPAS);
    } else {
      btn.textContent = '▶ Play';
    }
  }

  function clearProgression() {
    if (transport) transport.stop();
    if (model) model.clear();
    else { saveState(); render(); }
  }

  function buildClickGrid() {
    let g = svg.querySelector('g[data-clickgrid]');
    if (g) g.remove();
    g = document.createElementNS(SVG_NS, 'g');
    g.dataset.clickgrid = '1';
    const [fMin, fMax] = state.filter.fretRange;
    for (let s = 1; s <= 6; s++) {
      const si = 6 - s;
      const y = FB.stringY(si);
      for (let f = fMin; f <= fMax; f++) {
        const cx = xFor(f);
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
    // Acceso al modelo para tests integrales y tools externos.
    _ensureModel: ensureModel,
    _getModel: () => model,
    // expuestos para testing (solo lo que sigue siendo responsabilidad de atlas).
    // El CRUD de progresión ya no se testea acá — vive en progression-model.test.js.
    _computeRenderMap: computeRenderMap,
    _TENSIONS_BY_QUALITY: TENSIONS_BY_QUALITY,
    _SCALE_BY_QUALITY: SCALE_BY_QUALITY,
    _LAYER_PRIORITY: LAYER_PRIORITY,
    _intervalToSemi: intervalToSemi,
    _applyDirection: applyDirection,
    _slotWidth: slotWidth,
    _setPaletteMode: setPaletteMode,
    _QUALITY_GLYPH: QUALITY_GLYPH,
    _QUALITY_PALETTE_COLOR: QUALITY_PALETTE_COLOR,
    _handleKeydown: handleKeydown,
    _saveCurrentAsFavorite: saveCurrentAsFavorite,
    _loadFavorites: loadFavorites,
    _applyHiddenIntervals: applyHiddenIntervals,
    _toggleHiddenInterval: toggleHiddenInterval,
  };
})(window.GuitarShared, window);
