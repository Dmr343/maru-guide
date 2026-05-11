// Módulo 2: Diatonic Lab — escala, raíces diatónicas, triángulos, voicing activo.
(function (G, W) {
  const TH = G.theory;
  const FB = G.fretboard;
  const POS = G.positions;
  const VE = G.voicingEngine;
  const S  = G.iclState;

  const NUM_FRETS = 22;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const QUALITY_COLOR = {
    major: '#2ecc71', minor: '#3498db', dim: '#f1c40f', aug: '#e67e22',
  };

  let svg, fretW;
  let activeChordIdx = -1;
  let activeVoicing = null;
  let layers = { scale: true, roots: true, triangles: true, voicing: false };

  function $(id) { return document.getElementById(id); }

  function init() {
    svg = $('dl-fretboard');
    FB.fbInitBoard(svg, NUM_FRETS);
    fretW = FB.fbGetFretW(svg);

    ['scale','roots','triangles','voicing'].forEach(k => {
      const cb = $('dl-layer-' + k);
      cb.addEventListener('change', e => { layers[k] = e.target.checked; redraw(); });
    });
    $('dl-next-pos').addEventListener('click', () => {
      const st = S.get();
      const next = ((st.position.value || 0) + 1) % 5;
      S.set({ position: { type: 'standard', value: next } });
      $('g-pos').value = String(next);
    });

    S.subscribe('*', () => { activeChordIdx = -1; activeVoicing = null; redraw(); });
    redraw();
  }

  function onShow() { redraw(); }

  function getPosition() {
    const st = S.get();
    return POS.getScalePosition(st.key, st.mode, st.position.value || 0, { octaveShift: st.octaveShift || 0 });
  }

  function redraw() {
    drawFretboard();
    drawChordList();
  }

  function drawFretboard() {
    const st = S.get();
    const dots = FB.fbGetDotsGroup(svg);
    dots.innerHTML = '';

    if (!st.key) return;
    const pos = getPosition();
    if (!pos) return;
    const allNotes = POS.getAllScaleNotes(st.key, st.mode, NUM_FRETS);
    const inPos = new Set(pos.notes.map(n => n.string + ':' + n.fret));

    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const rootByPc = {};
    diatonic.forEach((c, i) => { rootByPc[c.chord.root] = { idx: i, ...c }; });

    // Capa 1: escala
    if (layers.scale) {
      allNotes.forEach(n => {
        const isInPos = inPos.has(n.string + ':' + n.fret);
        const isDiatonicRoot = !!rootByPc[n.note];
        if (isDiatonicRoot && layers.roots) return; // dibujamos roots aparte
        const si = 6 - n.string;
        const cx = FB.fretX(n.fret, fretW);
        const cy = FB.stringY(si);
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy);
        c.setAttribute('r', 8);
        c.setAttribute('fill', '#888');
        c.setAttribute('fill-opacity', isInPos ? 0.35 : 0.15);
        dots.appendChild(c);
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', cy + 3);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', 8);
        t.setAttribute('fill', '#ddd');
        t.setAttribute('fill-opacity', isInPos ? 0.7 : 0.3);
        t.textContent = n.note;
        dots.appendChild(t);
      });
    }

    // Capa 2: raíces diatónicas
    const rootPositions = {}; // chord idx → first position in current scale window for triangle
    if (layers.roots) {
      const diatonicNotes = pos.notes.filter(n => rootByPc[n.note]);
      diatonicNotes.forEach(n => {
        const ci = rootByPc[n.note];
        const color = QUALITY_COLOR[ci.chord.quality] || '#888';
        const si = 6 - n.string;
        const cx = FB.fretX(n.fret, fretW);
        const cy = FB.stringY(si);
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy);
        c.setAttribute('r', 12); c.setAttribute('fill', color);
        c.setAttribute('fill-opacity', 0.85);
        c.style.cursor = 'pointer';
        c.addEventListener('click', () => { activeChordIdx = ci.idx; computeVoicings(); redraw(); });
        dots.appendChild(c);
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', cy + 4);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', 9);
        t.setAttribute('font-weight', 800); t.setAttribute('fill', '#000');
        t.textContent = ci.numeral;
        dots.appendChild(t);

        if (!rootPositions[ci.idx]) {
          rootPositions[ci.idx] = { cx, cy, quality: ci.chord.quality };
        }
      });
    }

    // Capa 3: triángulos
    if (layers.triangles && layers.roots) {
      const byQ = { major: [], minor: [], dim: [], aug: [] };
      Object.values(rootPositions).forEach(p => byQ[p.quality] && byQ[p.quality].push(p));
      Object.entries(byQ).forEach(([q, pts]) => {
        if (pts.length < 2) return;
        const color = QUALITY_COLOR[q];
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const ln = document.createElementNS(SVG_NS, 'line');
            ln.setAttribute('x1', pts[i].cx); ln.setAttribute('y1', pts[i].cy);
            ln.setAttribute('x2', pts[j].cx); ln.setAttribute('y2', pts[j].cy);
            ln.setAttribute('stroke', color); ln.setAttribute('stroke-width', 1.5);
            ln.setAttribute('stroke-opacity', 0.35);
            dots.insertBefore(ln, dots.firstChild);
          }
        }
      });
    }

    // Capa 4: voicing activo
    if (layers.voicing && activeVoicing) {
      // Barre
      if (activeVoicing.hasBarre && activeVoicing.barre) {
        const b = activeVoicing.barre;
        const x = FB.fretX(b.fret, fretW);
        const y1 = FB.stringY(6 - b.fromString);
        const y2 = FB.stringY(6 - b.toString);
        const ln = document.createElementNS(SVG_NS, 'line');
        ln.setAttribute('x1', x); ln.setAttribute('x2', x);
        ln.setAttribute('y1', Math.min(y1,y2)); ln.setAttribute('y2', Math.max(y1,y2));
        ln.setAttribute('stroke', '#fff'); ln.setAttribute('stroke-width', 4);
        ln.setAttribute('stroke-opacity', 0.4); ln.setAttribute('stroke-linecap', 'round');
        dots.appendChild(ln);
      }
      activeVoicing.positions.forEach(p => {
        const si = 6 - p.string;
        const cx = FB.fretX(p.fret, fretW);
        const cy = FB.stringY(si);
        const color = FB.INTERVAL_COLORS[p.interval] || '#888';
        const r = p.interval === 'R' ? 14 : 11;
        if (p.interval === 'R') {
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
        t.textContent = p.interval;
        dots.appendChild(t);
      });
    }
  }

  function drawChordList() {
    const st = S.get();
    const cont = $('dl-chord-list');
    cont.innerHTML = '';
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    diatonic.forEach((c, i) => {
      const div = document.createElement('div');
      div.className = 'interp' + (i === activeChordIdx ? ' active' : '');
      const color = QUALITY_COLOR[c.chord.quality] || '#888';
      div.innerHTML = `
        <div class="interp-name" style="color:${color}">
          <span class="roman">${c.numeral}</span> · ${TH.chordName(c.chord.root, c.chord.quality) || c.chord.root + (c.chord.quality === 'major' ? '' : c.chord.quality)}
        </div>
        <div class="interp-meta">${c.chord.notes.join(' · ')}</div>
      `;
      div.addEventListener('click', () => { activeChordIdx = i; computeVoicings(); redraw(); });
      cont.appendChild(div);
    });
  }

  function computeVoicings() {
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    if (activeChordIdx < 0) { activeVoicing = null; drawVoicings([]); return; }
    const chord = diatonic[activeChordIdx].chord;
    const pos = getPosition();
    let voicings = VE.findApplicableTemplates(chord, pos, { topN: 5 });
    if (!voicings.length) {
      // No applicable — buscar en mástil cercano
      drawVoicingsEmpty(chord);
      return;
    }
    activeVoicing = voicings[0];
    layers.voicing = true;
    $('dl-layer-voicing').checked = true;
    drawVoicings(voicings);
  }

  function drawVoicings(voicings) {
    const cont = $('dl-voicings');
    if (!voicings.length) { cont.className='empty-state'; cont.textContent='Sin voicings.'; return; }
    cont.className = '';
    cont.innerHTML = '';
    voicings.forEach((va, idx) => {
      const card = document.createElement('div');
      card.className = 'voicing-card' + (idx === 0 ? ' active' : '');
      const diag = document.createElement('div');
      diag.style.minWidth = '70px';
      const meta = document.createElement('div');
      meta.className = 'vc-meta';
      const tones = va.positions.map(p => `${p.note}=${p.interval}`).join(', ');
      meta.innerHTML = `
        <div class="vc-name">${va.templateName}</div>
        <div>${va.hasBarre ? '🪢 cejilla' : '✋ sin cejilla'} · str ${va.rootString}↑</div>
        <div style="font-size:10px;color:var(--text-dim)">${tones}</div>
      `;
      const row = document.createElement('div');
      row.className = 'row';
      row.style.marginTop = '4px';
      const play = document.createElement('button');
      play.className = 'btn';
      play.textContent = '▶';
      play.addEventListener('click', e => { e.stopPropagation(); W.IntervallicAudio.playPositions(va.positions); });
      const add = document.createElement('button');
      add.className = 'btn';
      add.textContent = '+ progresión';
      add.addEventListener('click', e => {
        e.stopPropagation();
        W.IntervallicProgression.addChord({
          numeral: TH.getDiatonicChords(S.get().key, S.get().mode)[activeChordIdx].numeral,
          chordIdx: activeChordIdx,
          voicing: va,
          bars: 1,
        });
      });
      row.appendChild(play); row.appendChild(add);
      meta.appendChild(row);
      card.appendChild(diag);
      card.appendChild(meta);
      card.addEventListener('click', () => {
        activeVoicing = va;
        document.querySelectorAll('#dl-voicings .voicing-card').forEach(e => e.classList.remove('active'));
        card.classList.add('active');
        redraw();
      });
      cont.appendChild(card);
      FB.fbRenderMiniDiagram(diag, va, { width: 70, height: 86 });
    });
  }

  function drawVoicingsEmpty(chord) {
    const cont = $('dl-voicings');
    cont.className = '';
    cont.innerHTML = `
      <div class="empty-state">No hay voicings idiomáticos en esta posición.</div>
      <button class="btn" id="dl-jump-near">Saltar a posición más cercana</button>
    `;
    $('dl-jump-near').addEventListener('click', () => {
      const st = S.get();
      for (let i = 0; i < 5; i++) {
        const nextIdx = (st.position.value + i) % 5;
        const p = POS.getScalePosition(st.key, st.mode, nextIdx);
        const v = VE.findApplicableTemplates(chord, p, { topN: 1 });
        if (v.length) {
          S.set({ position: { type: 'standard', value: nextIdx } });
          $('g-pos').value = String(nextIdx);
          return;
        }
      }
    });
  }

  W.IntervallicDiatonicLab = { init, onShow };
})(window.GuitarShared, window);
