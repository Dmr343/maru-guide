// Módulo 1: Chord ID — selección de notas en el mástil y identificación inversa.
(function (G, W) {
  const TH = G.theory;
  const FB = G.fretboard;
  const VT = G.voicingTemplates;
  const S  = G.iclState;

  const NUM_FRETS = 22;
  let selections = []; // [{string, fret, note}]
  let invMode = false;
  let svg, fretW;

  // Qualities to test, with their semitone signatures (relative to root).
  const QUALITIES = [
    { id: 'major',  intervals: ['1','3','5'],         semis: [0,4,7] },
    { id: 'minor',  intervals: ['1','b3','5'],        semis: [0,3,7] },
    { id: 'dim',    intervals: ['1','b3','b5'],       semis: [0,3,6] },
    { id: 'aug',    intervals: ['1','3','#5'],        semis: [0,4,8] },
    { id: 'sus2',   intervals: ['1','2','5'],         semis: [0,2,7] },
    { id: 'sus4',   intervals: ['1','4','5'],         semis: [0,5,7] },
    { id: 'dom7',   intervals: ['1','3','5','b7'],    semis: [0,4,7,10] },
    { id: 'maj7',   intervals: ['1','3','5','7'],     semis: [0,4,7,11] },
    { id: 'min7',   intervals: ['1','b3','5','b7'],   semis: [0,3,7,10] },
    { id: 'm7b5',   intervals: ['1','b3','b5','b7'],  semis: [0,3,6,10] },
    { id: 'dim7',   intervals: ['1','b3','b5','bb7'], semis: [0,3,6,9] },
    { id: 'mMaj7',  intervals: ['1','b3','5','7'],    semis: [0,3,7,11] },
  ];
  const QUALITY_NAME = {
    major: '', minor: 'm', dim: 'dim', aug: 'aug', sus2: 'sus2', sus4: 'sus4',
    dom7: '7', maj7: 'maj7', min7: 'm7', m7b5: 'm7b5', dim7: 'dim7', mMaj7: 'mMaj7',
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    svg = $('ci-fretboard');
    FB.fbInitBoard(svg, NUM_FRETS);
    svg.setAttribute('viewBox', '0 0 ' + FB.FB_W + ' ' + FB.FB_H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    fretW = FB.fbGetFretW(svg);
    buildClickGrid();
    redraw();

    $('ci-clear').addEventListener('click', () => { selections = []; redraw(); });
    $('ci-inv-mode').addEventListener('change', e => { invMode = e.target.checked; redraw(); });
    $('ci-import-to-shape').addEventListener('click', () => {
      W.IntervallicShapeLab && W.IntervallicShapeLab.importFromChordId &&
        W.IntervallicShapeLab.importFromChordId(selections.slice(), lastTopInterpretation);
      document.querySelector('.tab[data-tab="shape-lab"]').click();
    });
  }

  let lastTopInterpretation = null;

  function buildClickGrid() {
    const SVG_NS = 'http://www.w3.org/2000/svg';
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
        r.setAttribute('x', cx - w/2);
        r.setAttribute('y', y - h/2);
        r.setAttribute('width', w);
        r.setAttribute('height', h);
        r.setAttribute('fill', 'transparent');
        r.style.cursor = 'pointer';
        r.addEventListener('click', () => toggleSelection(s, f));
        g.appendChild(r);
      }
    }
    svg.appendChild(g);
  }

  function toggleSelection(string, fret) {
    const idx = selections.findIndex(x => x.string === string && x.fret === fret);
    if (idx >= 0) selections.splice(idx, 1);
    else {
      const note = FB.fbNoteAt(FB.OPEN_NOTES[6 - string], fret);
      selections.push({ string, fret, note });
    }
    redraw();
  }

  function redraw() {
    drawSelections();
    drawInterpretations();
    $('ci-sel-count').textContent = selections.length
      ? `${selections.length} nota${selections.length === 1 ? '' : 's'} seleccionada${selections.length === 1 ? '' : 's'}`
      : '';
  }

  function drawSelections() {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    let dots = svg.querySelector('g[data-dots]');
    if (!dots) dots = FB.fbGetDotsGroup(svg);
    dots.innerHTML = '';

    const interp = currentTopInterpretation();
    selections.forEach(sel => {
      const si = 6 - sel.string;
      const cx = FB.fretX(sel.fret, fretW);
      const cy = FB.stringY(si);
      let tone = null;
      let color = '#888';
      if (interp) {
        const sem = (TH.CHROMATIC.indexOf(sel.note) - TH.CHROMATIC.indexOf(interp.root) + 12) % 12;
        const i = interp.semis.indexOf(sem);
        tone = i >= 0 ? interp.intervals[i] : null;
      }
      if (tone === '1') color = '#d4a847';
      else if (tone === '3' || tone === 'b3') color = '#e67e22';
      else if (tone === '5' || tone === 'b5' || tone === '#5') color = '#3498db';
      else if (tone === '7' || tone === 'b7' || tone === 'bb7') color = '#2ecc71';
      else color = '#9b59b6';

      const isRoot = tone === '1';
      const r = isRoot ? 13 : 10;
      if (isRoot) {
        const halo = document.createElementNS(SVG_NS, 'circle');
        halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
        halo.setAttribute('r', r + 4); halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', color); halo.setAttribute('stroke-width', 2);
        halo.setAttribute('stroke-opacity', 0.8);
        dots.appendChild(halo);
      }
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', r); c.setAttribute('fill', color);
      if (isRoot) c.setAttribute('filter', 'url(#fbglow)');
      dots.appendChild(c);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', cx); t.setAttribute('y', cy + 4);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', 9);
      t.setAttribute('font-weight', 800); t.setAttribute('fill', isRoot ? '#fff' : '#000');
      t.setAttribute('font-family', 'Trebuchet MS,sans-serif');
      t.textContent = sel.note;
      dots.appendChild(t);
    });
  }

  function currentTopInterpretation() {
    if (selections.length < 2) return null;
    const interps = identifyAll();
    return interps[0] || null;
  }

  function identifyAll() {
    const selPcs = Array.from(new Set(selections.map(s => s.note)));
    if (selPcs.length < 2) return [];
    const selSet = new Set(selPcs);

    // Find lowest-MIDI note among selections
    const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
    const lowestSel = selections.slice().sort((a, b) =>
      (OPEN_MIDI[a.string] + a.fret) - (OPEN_MIDI[b.string] + b.fret))[0];

    const stateMode = S.get().mode;
    const stateKey  = S.get().key;
    const activeScale = new Set(TH.buildModeScale
      ? TH.buildModeScale(stateKey, stateMode)
      : TH.buildScale(stateKey, stateMode));

    const candidates = [];
    TH.CHROMATIC.forEach(root => {
      QUALITIES.forEach(q => {
        const ri = TH.CHROMATIC.indexOf(root);
        const expectedPcs = q.semis.map(s => TH.CHROMATIC[(ri + s) % 12]);
        const expectedSet = new Set(expectedPcs);
        const allInExpected = selPcs.every(n => expectedSet.has(n));
        const allExpectedPresent = expectedPcs.every(n => selSet.has(n));

        if (!allInExpected) return; // selected has notes not in this chord
        let score = 0;
        if (allExpectedPresent) score += 10; // exact / complete
        else score += 5;                      // partial (omitted)
        // Diatonic in active scale: small bonus
        if (expectedPcs.every(n => activeScale.has(n))) score += 1;
        // Prefer simpler qualities slightly
        if (q.id === 'major' || q.id === 'minor') score += 0.5;
        // Penalty: more semis & fewer matches
        if (!allExpectedPresent) score -= (expectedPcs.length - selPcs.length) * 0.5;

        // Compute slash chord (inversion mode)
        let slash = null;
        if (invMode && lowestSel && lowestSel.note !== root) {
          slash = lowestSel.note;
        }

        // Check if matches a catalog template
        const tplMatch = findTemplateMatch(selections, root, q);

        candidates.push({
          root, quality: q.id, intervals: q.intervals, semis: q.semis,
          expectedPcs, missing: expectedPcs.filter(n => !selSet.has(n)),
          extras: selPcs.filter(n => !expectedSet.has(n)),
          score, slash, tplMatch,
          name: root + QUALITY_NAME[q.id] + (slash ? '/' + slash : ''),
        });
      });
    });

    // Templates exactos primero: bonus +5 for tplMatch
    candidates.forEach(c => { if (c.tplMatch) c.score += 5; });

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  // Busca un template del catálogo cuyos (string, fret, interval) coincidan
  // exactamente con las posiciones seleccionadas (interpretadas como root/quality).
  function findTemplateMatch(sels, root, q) {
    const VE = G.voicingEngine;
    const templates = VT.getTemplatesForQuality(q.id);
    for (const tpl of templates) {
      // Encontrar rootFret aplicando el template a una raíz que coincida con alguna selección
      const rootSel = sels.find(s => s.string === tpl.rootString && s.note === root);
      if (!rootSel) continue;
      const va = VE.applyTemplate(tpl, root, rootSel.fret, tpl.rootString);
      // Comparar posiciones (no mudas) con sels
      const vaSet = new Set(va.positions.map(p => p.string + ':' + p.fret));
      const selSet = new Set(sels.map(s => s.string + ':' + s.fret));
      if (vaSet.size !== selSet.size) continue;
      let ok = true;
      vaSet.forEach(k => { if (!selSet.has(k)) ok = false; });
      if (ok) return tpl;
    }
    return null;
  }

  function drawInterpretations() {
    const cont = $('ci-results');
    if (selections.length < 2) {
      cont.className = 'empty-state';
      cont.textContent = 'Seleccioná 2 o más notas en el mástil.';
      $('ci-import-row').style.display = 'none';
      lastTopInterpretation = null;
      return;
    }
    cont.className = '';
    cont.innerHTML = '';
    const interps = identifyAll().slice(0, 5);
    if (!interps.length) {
      cont.innerHTML = '<div class="empty-state">No se identifica ningún acorde.</div>';
      $('ci-import-row').style.display = 'none';
      return;
    }
    lastTopInterpretation = interps[0];

    interps.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'interp' + (idx === 0 ? ' active' : '');
      const tones = selections.map(sel => {
        const sem = (TH.CHROMATIC.indexOf(sel.note) - TH.CHROMATIC.indexOf(it.root) + 12) % 12;
        const i = it.semis.indexOf(sem);
        return sel.note + (i >= 0 ? '=' + it.intervals[i] : '');
      }).join('  ');
      const missing = it.missing.length ? `Falta: ${it.missing.join(', ')}` : 'Completo';
      const scales = scalesContaining(it.expectedPcs);
      div.innerHTML = `
        <div class="interp-name">${it.name}</div>
        <div class="interp-meta">${missing} · ${scales.length} escalas${scales.length ? ': ' + scales.slice(0,3).join(', ') : ''}</div>
        ${it.tplMatch ? `<div class="interp-meta" style="color:#d4a847">✓ matchea ${it.tplMatch.name}</div>` : ''}
        <div class="interp-tones">${tones}</div>
      `;
      div.addEventListener('click', () => {
        lastTopInterpretation = it;
        document.querySelectorAll('#ci-results .interp').forEach(e => e.classList.remove('active'));
        div.classList.add('active');
        drawSelections();
      });
      cont.appendChild(div);
    });
    $('ci-import-row').style.display = 'block';
  }

  function scalesContaining(pcs) {
    const modes = ['major','minor','dorian','phrygian','lydian','mixolydian','locrian','harmonic_minor','melodic_minor'];
    const out = [];
    TH.CHROMATIC.forEach(root => {
      modes.forEach(mode => {
        const scale = new Set(TH.buildModeScale ? TH.buildModeScale(root, mode) : TH.buildScale(root, mode));
        if (pcs.every(p => scale.has(p))) {
          out.push(root + ' ' + mode.replace('_', ' '));
        }
      });
    });
    return out;
  }

  function onShow() { /* nothing — fretboard already rendered */ }

  W.IntervallicChordId = { init, onShow, getCurrentSelections: () => selections.slice() };
})(window.GuitarShared, window);
