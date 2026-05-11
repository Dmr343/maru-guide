// Módulo 4: Progression Player — progresiones diatónicas con metrónomo + voice leading.
(function (G, W) {
  const TH = G.theory;
  const FB = G.fretboard;
  const POS = G.positions;
  const VE = G.voicingEngine;
  const S  = G.iclState;

  const NUM_FRETS = 22;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let svg, fretW;
  let chords = []; // [{numeral, chordIdx, voicing, bars}]
  let activeIdx = -1;
  let metro = null;
  let prevVoicing = null;
  let voiceLeadEnabled = true;

  function $(id) { return document.getElementById(id); }

  function init() {
    svg = $('pp-fretboard');
    FB.fbInitBoard(svg, NUM_FRETS);
    fretW = FB.fbGetFretW(svg);

    $('pp-play').addEventListener('click', play);
    $('pp-stop').addEventListener('click', stop);
    $('pp-clear').addEventListener('click', () => { chords = []; activeIdx = -1; redraw(); });
    $('pp-save').addEventListener('click', saveProgression);
    $('pp-load').addEventListener('click', loadProgressionPrompt);
    $('pp-vl').addEventListener('change', e => { voiceLeadEnabled = e.target.checked; });

    S.subscribe('*', drawNumeralBar);
    drawNumeralBar();
    redraw();
  }

  function onShow() { drawNumeralBar(); redraw(); }

  function drawNumeralBar() {
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const cont = $('pp-numerals');
    cont.innerHTML = '';
    diatonic.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = c.numeral;
      b.addEventListener('click', () => addByNumeral(i));
      cont.appendChild(b);
    });
  }

  function addByNumeral(chordIdx) {
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const chord = diatonic[chordIdx].chord;
    const pos = POS.getScalePosition(st.key, st.mode, st.position.value || 0, { octaveShift: st.octaveShift || 0 });
    const vs = VE.findApplicableTemplates(chord, pos, { topN: 1 });
    if (!vs.length) {
      // Try expanded window
      const wide = POS.getArbitraryPosition(st.key, st.mode, Math.max(0, pos.fretStart - 3), 11);
      const vs2 = VE.findApplicableTemplates(chord, wide, { topN: 1 });
      if (!vs2.length) return;
      addChord({ numeral: diatonic[chordIdx].numeral, chordIdx, voicing: vs2[0], bars: 1 });
      return;
    }
    addChord({ numeral: diatonic[chordIdx].numeral, chordIdx, voicing: vs[0], bars: 1 });
  }

  function addChord(c) { chords.push(c); redraw(); }

  function redraw() {
    drawBar();
    drawQueue();
    drawFretboard();
  }

  function drawBar() {
    const cont = $('pp-bar');
    cont.innerHTML = '';
    if (!chords.length) {
      cont.innerHTML = '<span class="empty-state" style="padding:6px">Sin acordes — agregalos arriba.</span>';
      return;
    }
    chords.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'prog-chord' + (i === activeIdx ? ' active' : '');
      d.innerHTML = `
        <div class="pc-name">${c.numeral}</div>
        <div class="pc-bars">${c.voicing ? c.voicing.templateName : ''}</div>
        <div class="pc-bars">${c.bars} c</div>
      `;
      const del = document.createElement('div');
      del.className = 'pc-del'; del.textContent = '×';
      del.addEventListener('click', e => { e.stopPropagation(); chords.splice(i, 1); if (activeIdx >= chords.length) activeIdx = chords.length - 1; redraw(); });
      d.appendChild(del);
      d.addEventListener('click', () => { activeIdx = i; redraw(); });
      cont.appendChild(d);
    });
  }

  function drawQueue() {
    const cont = $('pp-queue');
    if (!chords.length) { cont.className='empty-state'; cont.textContent='Agregá acordes desde Diatonic Lab o usando los numerales.'; return; }
    cont.className = '';
    cont.innerHTML = '';
    chords.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'interp' + (i === activeIdx ? ' active' : '');
      const tones = c.voicing ? c.voicing.positions.map(p => p.note+'='+p.interval).join(', ') : '';
      d.innerHTML = `<div class="interp-name">${c.numeral}</div>
        <div class="interp-meta">${c.voicing ? c.voicing.templateName : '—'} · ${c.bars}c</div>
        <div class="interp-tones">${tones}</div>`;
      cont.appendChild(d);
    });
  }

  function drawFretboard() {
    const dots = FB.fbGetDotsGroup(svg); dots.innerHTML = '';
    if (activeIdx < 0 || !chords[activeIdx]) return;
    const cur = chords[activeIdx].voicing;
    if (!cur) return;

    // Voice leading: notas comunes con prev
    let commonPcs = new Set();
    if (voiceLeadEnabled && prevVoicing) {
      const prevPcs = new Set(prevVoicing.positions.map(p => p.note));
      cur.positions.forEach(p => { if (prevPcs.has(p.note)) commonPcs.add(p.note); });
    }

    if (cur.hasBarre && cur.barre) {
      const b = cur.barre;
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
    cur.positions.forEach(p => {
      const si = 6 - p.string;
      const cx = FB.fretX(p.fret, fretW);
      const cy = FB.stringY(si);
      const color = FB.INTERVAL_COLORS[p.interval] || '#888';
      const r = p.interval === 'R' ? 14 : 11;
      const isCommon = commonPcs.has(p.note);
      if (p.interval === 'R' || isCommon) {
        const halo = document.createElementNS(SVG_NS, 'circle');
        halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
        halo.setAttribute('r', r + 4); halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', isCommon ? '#fff' : color);
        halo.setAttribute('stroke-width', isCommon ? 3 : 2);
        halo.setAttribute('stroke-opacity', 0.8);
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

    // Líneas de movimiento por grado conjunto desde prev (voice leading)
    if (voiceLeadEnabled && prevVoicing) {
      const OPEN_MIDI = { 6:40,5:45,4:50,3:55,2:59,1:64 };
      prevVoicing.positions.forEach(pp => {
        const pmidi = OPEN_MIDI[pp.string] + pp.fret;
        // encontrar nota del current con la menor distancia (no R-match)
        let best = null, bestD = 999;
        cur.positions.forEach(cp => {
          const cmidi = OPEN_MIDI[cp.string] + cp.fret;
          const d = Math.abs(cmidi - pmidi);
          if (d > 0 && d <= 2 && d < bestD) { best = cp; bestD = d; }
        });
        if (best) {
          const x1 = FB.fretX(pp.fret, fretW), y1 = FB.stringY(6 - pp.string);
          const x2 = FB.fretX(best.fret, fretW), y2 = FB.stringY(6 - best.string);
          const path = document.createElementNS(SVG_NS, 'path');
          const cy = (y1 + y2) / 2 - 8;
          path.setAttribute('d', `M${x1},${y1} Q${(x1+x2)/2},${cy} ${x2},${y2}`);
          path.setAttribute('stroke', '#d4a847');
          path.setAttribute('stroke-width', 1.5);
          path.setAttribute('stroke-opacity', 0.6);
          path.setAttribute('stroke-dasharray', '3,2');
          path.setAttribute('fill', 'none');
          dots.insertBefore(path, dots.firstChild);
        }
      });
    }
  }

  function play() {
    if (!chords.length) return;
    if (metro && metro.playing) return;
    const bpm = Number($('pp-bpm').value) || 80;
    const sig = Number($('pp-time-sig').value) || 4;
    const mode = $('pp-mode').value;
    const loop = mode === 'loop';
    const audio = mode !== 'metro';
    activeIdx = 0;
    prevVoicing = null;
    redraw();
    if (audio && chords[0].voicing) W.IntervallicAudio.playPositions(chords[0].voicing.positions);

    let beat = 0;
    let chordBeat = 0;
    const totalBeatsForChord = (i) => sig * (chords[i].bars || 1);

    metro = new G.metronome.Metronome({
      bpm,
      beatsPerChord: 999, // controlamos cambio manualmente
      onBeat: () => {
        beat++;
        chordBeat++;
        if (chordBeat >= totalBeatsForChord(activeIdx)) {
          chordBeat = 0;
          prevVoicing = chords[activeIdx].voicing;
          activeIdx++;
          if (activeIdx >= chords.length) {
            if (loop) activeIdx = 0;
            else { stop(); return; }
          }
          if (audio && chords[activeIdx].voicing) W.IntervallicAudio.playPositions(chords[activeIdx].voicing.positions);
          redraw();
        }
      },
    });
    metro.start();
  }

  function stop() {
    if (metro) metro.stop();
    metro = null;
  }

  function saveProgression() {
    const name = prompt('Nombre de la progresión:');
    if (!name) return;
    S.saveProgression({ name, chords: chords.map(c => ({ chordIdx: c.chordIdx, numeral: c.numeral, bars: c.bars, voicingId: c.voicing && c.voicing.templateId })) });
    alert('Guardada: ' + name);
  }

  function loadProgressionPrompt() {
    const all = S.getProgressions();
    if (!all.length) { alert('No hay progresiones guardadas.'); return; }
    const choice = prompt('Cargar progresión:\n' + all.map((p, i) => `${i + 1}. ${p.name}`).join('\n'));
    const i = Number(choice) - 1;
    if (!all[i]) return;
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const pos = POS.getScalePosition(st.key, st.mode, st.position.value || 0);
    chords = all[i].chords.map(c => {
      const chord = diatonic[c.chordIdx].chord;
      const vs = VE.findApplicableTemplates(chord, pos, { topN: 5 });
      const voicing = vs.find(v => v.templateId === c.voicingId) || vs[0] || null;
      return { numeral: c.numeral, chordIdx: c.chordIdx, bars: c.bars, voicing };
    });
    redraw();
  }

  W.IntervallicProgression = { init, onShow, addChord, getChords: () => chords.slice() };
})(window.GuitarShared, window);
