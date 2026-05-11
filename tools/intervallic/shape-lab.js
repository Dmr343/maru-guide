// Módulo 3: Shape Lab — definir templates manuales y biblioteca.
(function (G, W) {
  const FB = G.fretboard;
  const VE = G.voicingEngine;
  const VT = G.voicingTemplates;
  const S  = G.iclState;

  const NUM_FRETS = 22;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let svg, fretW;
  let root = null;       // {string, fret, note}
  let extras = [];       // [{string, fret, note, interval}]
  let muted = new Set(); // strings 1-6

  const INTERVAL_OPTIONS = ['R','b3','3','4','b5','5','b7','7','octava','b2','2','b6','6','#5'];

  function $(id) { return document.getElementById(id); }

  function init() {
    svg = $('sl-fretboard');
    FB.fbInitBoard(svg, NUM_FRETS);
    fretW = FB.fbGetFretW(svg);
    buildClickGrid();
    redraw();

    $('sl-clear').addEventListener('click', () => { root=null; extras=[]; muted=new Set(); redraw(); });
    $('sl-import').addEventListener('click', () => {
      const sels = W.IntervallicChordId.getCurrentSelections();
      if (!sels.length) { setFeedback('Identificá un acorde primero.', 'err'); return; }
      // Lowest = root
      const OPEN_MIDI = { 6:40,5:45,4:50,3:55,2:59,1:64 };
      const sorted = sels.slice().sort((a,b) => (OPEN_MIDI[a.string]+a.fret) - (OPEN_MIDI[b.string]+b.fret));
      root = sorted[0];
      extras = sorted.slice(1).map(s => ({ ...s, interval: '?' }));
      redraw();
    });
    $('sl-save').addEventListener('click', save);
    drawLibrary();
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
        r.addEventListener('click', () => handleClick(s, f));
        g.appendChild(r);
      }
    }
    svg.appendChild(g);
  }

  function handleClick(string, fret) {
    const note = FB.fbNoteAt(FB.OPEN_NOTES[6 - string], fret);
    if (!root) { root = { string, fret, note }; muted = makeMuted(string); redraw(); return; }
    // Si clicamos en una nota ya añadida → quitarla
    if (root.string === string && root.fret === fret) { root = null; extras = []; muted = new Set(); redraw(); return; }
    const idx = extras.findIndex(x => x.string === string && x.fret === fret);
    if (idx >= 0) { extras.splice(idx, 1); redraw(); return; }
    if (string > root.string) { setFeedback('Regla 2: no se puede agregar notas en cuerdas más graves que la raíz.', 'err'); return; }
    extras.push({ string, fret, note, interval: '?' });
    redraw();
  }

  function makeMuted(rootString) {
    const m = new Set();
    for (let s = rootString + 1; s <= 6; s++) m.add(s);
    return m;
  }

  function redraw() {
    const dots = FB.fbGetDotsGroup(svg); dots.innerHTML = '';
    if (root) {
      drawNote(dots, root, '#d4a847', 'R', true);
    }
    extras.forEach(e => drawNote(dots, e, intervalColor(e.interval), e.interval, false));
    drawMutedMarks(dots);
    drawEditor();
    validateLive();
  }

  function intervalColor(intv) {
    return FB.INTERVAL_COLORS[intv] || '#888';
  }

  function drawNote(dots, pos, color, label, isRoot) {
    const si = 6 - pos.string;
    const cx = FB.fretX(pos.fret, fretW);
    const cy = FB.stringY(si);
    const r = isRoot ? 13 : 10;
    if (isRoot) {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
      halo.setAttribute('r', r + 4); halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', color); halo.setAttribute('stroke-width', 2);
      dots.appendChild(halo);
    }
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy);
    c.setAttribute('r', r); c.setAttribute('fill', color);
    dots.appendChild(c);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', cx); t.setAttribute('y', cy + 4);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', 9);
    t.setAttribute('font-weight', 800); t.setAttribute('fill', '#000');
    t.textContent = label;
    dots.appendChild(t);
  }

  function drawMutedMarks(dots) {
    muted.forEach(s => {
      const si = 6 - s;
      const y = FB.stringY(si);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', 12); t.setAttribute('y', y + 4);
      t.setAttribute('font-size', 12); t.setAttribute('fill', '#e74c3c');
      t.textContent = '✕';
      dots.appendChild(t);
    });
  }

  function drawEditor() {
    const cont = $('sl-editor');
    if (!root) { cont.className = 'empty-state'; cont.textContent = 'Click la raíz primero.'; return; }
    cont.className = '';
    cont.innerHTML = '';
    const rootDiv = document.createElement('div');
    rootDiv.style.marginBottom = '6px';
    rootDiv.innerHTML = `<strong style="color:#d4a847">R</strong> · cuerda ${root.string} traste ${root.fret} (${root.note})`;
    cont.appendChild(rootDiv);

    extras.forEach((e, idx) => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px;font-size:12px';
      const sel = document.createElement('select');
      sel.className = 'compact';
      INTERVAL_OPTIONS.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt === 'octava' ? 'R' : opt;
        o.textContent = opt;
        if (opt === e.interval) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => { extras[idx].interval = sel.value; redraw(); });
      const lbl = document.createElement('span');
      lbl.textContent = `str ${e.string} f${e.fret} (${e.note})`;
      lbl.style.color = 'var(--text-mid)';
      const del = document.createElement('button');
      del.className = 'btn'; del.textContent = '×';
      del.style.padding = '2px 8px';
      del.addEventListener('click', () => { extras.splice(idx, 1); redraw(); });
      div.appendChild(sel); div.appendChild(lbl); div.appendChild(del);
      cont.appendChild(div);
    });
  }

  function buildVoicingApplied(quality) {
    if (!root) return null;
    const positions = [{ string: root.string, fret: root.fret, interval: 'R', note: root.note }]
      .concat(extras.map(e => ({ string: e.string, fret: e.fret, interval: e.interval, note: e.note })));
    return {
      templateName: 'custom',
      root: root.note,
      rootString: root.string,
      rootFret: root.fret,
      positions,
      mutedStrings: Array.from(muted),
      hasBarre: false, barre: null,
    };
  }

  function validateLive() {
    if (!root) { setFeedback(''); return; }
    const va = buildVoicingApplied();
    const v = VE.validateVoicing(va);
    if (v.valid) setFeedback('✓ Voicing válido (cumple las 3 reglas).', 'ok');
    else setFeedback('⚠ ' + v.errors.join(' · '), 'err');
  }

  function setFeedback(msg, type) {
    const el = $('sl-feedback');
    el.textContent = msg || '';
    el.style.color = type === 'err' ? '#e74c3c' : type === 'ok' ? '#2ecc71' : 'var(--text-dim)';
  }

  function save() {
    if (!root) { setFeedback('Definí al menos la raíz.', 'err'); return; }
    if (extras.some(e => e.interval === '?')) { setFeedback('Asigná intervalo a todas las notas.', 'err'); return; }
    const quality = $('sl-quality').value;
    const va = buildVoicingApplied(quality);
    const v = VE.validateVoicing(va);
    if (!v.valid) { setFeedback('No se puede guardar: ' + v.errors.join(' · '), 'err'); return; }
    const name = $('sl-name').value.trim() || `Custom ${Date.now() % 10000}`;
    const tpl = {
      id: 'custom-' + Date.now(),
      name,
      rootString: root.string,
      stringsUsed: [root.string].concat(extras.map(e => e.string)),
      mutedStrings: Array.from(muted),
      intervals: {
        [root.string]: { interval: 'R', fretOffset: 0 },
        ...Object.fromEntries(extras.map(e => [e.string, { interval: e.interval, fretOffset: e.fret - root.fret }])),
      },
      appliesTo: [quality],
      hasBarre: false, barre: null,
      custom: true,
    };
    S.saveCustomTemplate(tpl);
    setFeedback('✓ Guardado: ' + name, 'ok');
    drawLibrary();
  }

  function drawLibrary() {
    const cont = $('sl-library');
    cont.innerHTML = '';
    const customs = S.getCustomTemplates();
    if (customs.length) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px';
      h.textContent = 'Personalizados';
      cont.appendChild(h);
      customs.forEach(tpl => {
        const d = document.createElement('div');
        d.className = 'interp';
        d.innerHTML = `<div class="interp-name">${tpl.name}</div>
          <div class="interp-meta">str ${tpl.rootString}↑ · ${tpl.appliesTo.join(',')}</div>`;
        const del = document.createElement('button');
        del.className = 'btn danger'; del.textContent = 'Borrar';
        del.style.marginTop = '4px';
        del.addEventListener('click', () => { S.removeCustomTemplate(tpl.id); drawLibrary(); });
        d.appendChild(del);
        cont.appendChild(d);
      });
    }
    const h2 = document.createElement('div');
    h2.style.cssText = 'font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin:10px 0 4px';
    h2.textContent = 'Predefinidos';
    cont.appendChild(h2);
    VT.TEMPLATES.forEach(tpl => {
      const d = document.createElement('div');
      d.className = 'interp';
      d.innerHTML = `<div class="interp-name" style="font-size:12px">${tpl.name}</div>
        <div class="interp-meta">str ${tpl.rootString}↑ · ${tpl.appliesTo.join(',')}</div>`;
      cont.appendChild(d);
    });
  }

  function importFromChordId(sels, interp) {
    document.querySelector('.tab[data-tab="shape-lab"]').click();
    if (!sels || !sels.length) return;
    const OPEN_MIDI = { 6:40,5:45,4:50,3:55,2:59,1:64 };
    const sorted = sels.slice().sort((a,b) => (OPEN_MIDI[a.string]+a.fret) - (OPEN_MIDI[b.string]+b.fret));
    root = sorted[0];
    muted = makeMuted(root.string);
    extras = sorted.slice(1).map(s => {
      let interval = '?';
      if (interp) {
        const TH = G.theory;
        const sem = (TH.CHROMATIC.indexOf(s.note) - TH.CHROMATIC.indexOf(interp.root) + 12) % 12;
        const i = interp.semis.indexOf(sem);
        if (i >= 0) interval = interp.intervals[i];
      }
      return { ...s, interval };
    });
    if (interp) {
      $('sl-quality').value = interp.quality;
      $('sl-name').value = interp.name + ' (custom)';
    }
    redraw();
  }

  function onShow() { drawLibrary(); }

  W.IntervallicShapeLab = { init, onShow, importFromChordId };
})(window.GuitarShared, window);
