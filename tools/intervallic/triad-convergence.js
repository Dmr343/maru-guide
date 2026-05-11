// Módulo 5: Triad Convergence — 3 inversiones de cada tríada diatónica en str 1-2-3 / 2-3-4.
// IMPORTANTE: este módulo no usa validateVoicing — las 3 reglas no aplican aquí.
(function (G, W) {
  const TH = G.theory;
  const FB = G.fretboard;
  const S  = G.iclState;

  const NUM_FRETS = 22;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SPAN = 4;

  const QUALITY_COLOR = { major: '#2ecc71', minor: '#3498db', dim: '#f1c40f', aug: '#e67e22' };

  let svg, fretW;
  let stringSet = '321';
  let activeChordRoot = null;
  let elevatorTimer = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    svg = $('tc-fretboard');
    FB.fbInitBoard(svg, NUM_FRETS);
    fretW = FB.fbGetFretW(svg);

    $('tc-strings').addEventListener('change', e => { stringSet = e.target.value; redraw(); });
    $('tc-chord').addEventListener('change', e => { activeChordRoot = e.target.value; redraw(); });
    $('tc-elevator').addEventListener('click', runElevator);
    $('tc-scale-overlay').addEventListener('change', redraw);
    $('tc-from-prog').addEventListener('click', () => {
      const ch = W.IntervallicProgression.getChords();
      if (!ch.length) { alert('Sin progresión activa.'); return; }
      alert('Mostrando progresión en cuerdas ' + stringSet);
      // Just set the first chord as active
      if (ch[0] && ch[0].voicing) activeChordRoot = ch[0].voicing.root;
      redraw();
    });

    S.subscribe('*', () => { activeChordRoot = null; populateChordSelect(); redraw(); });
    populateChordSelect();
    redraw();
  }

  function onShow() { populateChordSelect(); redraw(); }

  function populateChordSelect() {
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const sel = $('tc-chord');
    sel.innerHTML = '<option value="">— todos —</option>';
    diatonic.forEach(c => {
      const o = document.createElement('option');
      o.value = c.chord.root;
      o.textContent = c.numeral + ' (' + (TH.chordName(c.chord.root, c.chord.quality) || c.chord.root) + ')';
      sel.appendChild(o);
    });
  }

  function getStrings() {
    // stringSet '321' → low=3, mid=2, high=1
    // stringSet '432' → low=4, mid=3, high=2
    return stringSet === '321' ? [3, 2, 1] : [4, 3, 2];
  }

  function noteFrets(stringNum, targetNote) {
    const open = FB.OPEN_NOTES[6 - stringNum];
    const oi = TH.CHROMATIC.indexOf(open);
    const ti = TH.CHROMATIC.indexOf(targetNote);
    const base = (ti - oi + 12) % 12;
    const out = [];
    for (let f = base; f <= NUM_FRETS; f += 12) out.push(f);
    return out;
  }

  // Para una tríada y un orden de notas [bass, mid, top] y un set de cuerdas,
  // devuelve todas las placements [low, mid, high] dentro del span.
  function placements(chordNotes, order, strings) {
    const [bass, mid, top] = order;
    const [sLow, sMid, sHigh] = strings;
    const lowFrets  = noteFrets(sLow, bass);
    const midFrets  = noteFrets(sMid, mid);
    const highFrets = noteFrets(sHigh, top);
    const out = [];
    lowFrets.forEach(fL => {
      midFrets.forEach(fM => {
        highFrets.forEach(fH => {
          const frets = [fL, fM, fH];
          const min = Math.min(...frets), max = Math.max(...frets);
          if (max - min <= SPAN) out.push({ low:fL, mid:fM, high:fH, span:max-min });
        });
      });
    });
    return out;
  }

  function inversionsFor(chord) {
    const [R, t3, t5] = chord.notes;
    return [
      { name: 'Root',    order: [R, t3, t5], intervals: ['R','3','5'] },
      { name: '1ra inv', order: [t3, t5, R], intervals: ['3','5','R'] },
      { name: '2da inv', order: [t5, R, t3], intervals: ['5','R','3'] },
    ];
  }

  function redraw() {
    const dots = FB.fbGetDotsGroup(svg); dots.innerHTML = '';
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const strings = getStrings();

    // Overlay escala
    if ($('tc-scale-overlay').checked) {
      const scale = new Set(TH.buildModeScale(st.key, st.mode));
      for (let s = 1; s <= 6; s++) {
        for (let f = 0; f <= NUM_FRETS; f++) {
          const n = FB.fbNoteAt(FB.OPEN_NOTES[6 - s], f);
          if (!scale.has(n)) continue;
          const cx = FB.fretX(f, fretW), cy = FB.stringY(6 - s);
          const c = document.createElementNS(SVG_NS, 'circle');
          c.setAttribute('cx', cx); c.setAttribute('cy', cy);
          c.setAttribute('r', 6); c.setAttribute('fill', '#666');
          c.setAttribute('fill-opacity', 0.2);
          dots.appendChild(c);
        }
      }
    }

    const filter = activeChordRoot;
    const drawList = filter
      ? diatonic.filter(c => c.chord.root === filter)
      : diatonic;

    drawList.forEach(ci => {
      const color = QUALITY_COLOR[ci.chord.quality] || '#888';
      inversionsFor(ci.chord).forEach(inv => {
        const places = placements(ci.chord.notes, inv.order, strings);
        places.forEach(pl => {
          drawTriad(dots, strings, pl, inv.intervals, color, ci.numeral);
        });
      });
    });

    drawInversionsPanel(diatonic);
  }

  function drawTriad(dots, strings, place, intervals, color, label) {
    const [sLow, sMid, sHigh] = strings;
    const positions = [
      { string: sLow,  fret: place.low,  interval: intervals[0] },
      { string: sMid,  fret: place.mid,  interval: intervals[1] },
      { string: sHigh, fret: place.high, interval: intervals[2] },
    ];
    positions.forEach(p => {
      const si = 6 - p.string;
      const cx = FB.fretX(p.fret, fretW), cy = FB.stringY(si);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', 9); c.setAttribute('fill', color);
      c.setAttribute('fill-opacity', 0.7);
      dots.appendChild(c);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', cx); t.setAttribute('y', cy + 3);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', 8);
      t.setAttribute('font-weight', 800); t.setAttribute('fill', '#000');
      t.textContent = p.interval;
      dots.appendChild(t);
    });
  }

  function drawInversionsPanel(diatonic) {
    const cont = $('tc-inversions');
    cont.innerHTML = '';
    if (!activeChordRoot) {
      cont.innerHTML = '<div class="empty-state">Elegí un acorde para ver sus 3 inversiones.</div>';
      return;
    }
    const ci = diatonic.find(c => c.chord.root === activeChordRoot);
    if (!ci) return;
    const strings = getStrings();
    inversionsFor(ci.chord).forEach(inv => {
      const places = placements(ci.chord.notes, inv.order, strings);
      const d = document.createElement('div');
      d.className = 'interp';
      d.innerHTML = `<div class="interp-name">${inv.name}</div>
        <div class="interp-meta">${inv.order.join(' – ')} · ${places.length} posicion${places.length === 1 ? '' : 'es'} en mástil</div>`;
      cont.appendChild(d);
    });
  }

  function runElevator() {
    if (!activeChordRoot) { alert('Elegí un acorde primero.'); return; }
    if (elevatorTimer) { clearInterval(elevatorTimer); elevatorTimer = null; return; }
    const st = S.get();
    const diatonic = TH.getDiatonicChords(st.key, st.mode);
    const ci = diatonic.find(c => c.chord.root === activeChordRoot);
    if (!ci) return;
    const strings = getStrings();
    const invs = inversionsFor(ci.chord);
    let step = 0;
    elevatorTimer = setInterval(() => {
      const inv = invs[step % 3];
      const places = placements(ci.chord.notes, inv.order, strings);
      const dots = FB.fbGetDotsGroup(svg); dots.innerHTML = '';
      const color = QUALITY_COLOR[ci.chord.quality] || '#888';
      if (places[Math.floor(step / 3) % Math.max(places.length, 1)]) {
        drawTriad(dots, strings, places[Math.floor(step / 3) % places.length], inv.intervals, color, ci.numeral);
        if (W.IntervallicAudio) {
          const pl = places[Math.floor(step / 3) % places.length];
          W.IntervallicAudio.playPositions([
            { string: strings[0], fret: pl.low },
            { string: strings[1], fret: pl.mid },
            { string: strings[2], fret: pl.high },
          ], { duration: 0.6, release: 0.2 });
        }
      }
      step++;
      if (step >= 9) { clearInterval(elevatorTimer); elevatorTimer = null; setTimeout(redraw, 800); }
    }, 800);
  }

  W.IntervallicTriadConvergence = { init, onShow };
})(window.GuitarShared, window);
