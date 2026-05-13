// Interval Atlas tests — lógica pura (sin DOM).
(function (G, W) {
  const T = G.testRunner;
  const A = W.IntervalAtlas;
  if (!A) { return; }
  const TH = G.theory;

  function chord(root, quality) { return TH.buildChord(root, quality); }
  function pcsOf(map) { return Array.from(map.keys()).sort(); }

  T.describe('computeRenderMap — chord tones', () => {
    T.it('Cmaj7: chordTones produce C E G B', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { chordTones: true });
      T.assertArrayEq(pcsOf(m), ['B','C','E','G']);
    });
    T.it('Am7: chordTones produce A C E G', () => {
      const m = A._computeRenderMap(chord('A','min7'), { chordTones: true });
      T.assertArrayEq(pcsOf(m), ['A','C','E','G']);
    });
    T.it('intervalos correctos', () => {
      const m = A._computeRenderMap(chord('A','min7'), { chordTones: true });
      T.assertEq(m.get('A').interval, '1');
      T.assertEq(m.get('C').interval, 'b3');
      T.assertEq(m.get('E').interval, '5');
      T.assertEq(m.get('G').interval, 'b7');
    });
  });

  T.describe('computeRenderMap — prioridad de capas', () => {
    T.it('chordTones gana sobre scale para la misma pc', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { chordTones: true, scale: true });
      const e = m.get('E');
      T.assertEq(e.kind, 'chordTones');
      T.assertEq(e.interval, '3');
    });
    T.it('chordTones gana sobre allNotes', () => {
      const m = A._computeRenderMap(chord('C','major'), { chordTones: true, allNotes: true });
      T.assertEq(m.get('C').kind, 'chordTones');
      T.assertEq(m.get('E').kind, 'chordTones');
      T.assertEq(m.get('D').kind, 'allNotes');
    });
    T.it('approach NO sobrescribe chord tones del acorde actual', () => {
      // Si Cmaj7 → Am7 y A está en Am7, pero C (root actual) no está en Am7,
      // entonces C debe ser chordTone, A debe ser approach.
      const m = A._computeRenderMap(chord('C','maj7'), { chordTones: true, approach: true }, chord('A','min7'));
      T.assertEq(m.get('C').kind, 'chordTones');
      T.assertEq(m.get('A').kind, 'approach');
    });
  });

  T.describe('computeRenderMap — tensions', () => {
    T.it('Cmaj7: tensions incluyen 9 (D), #11 (F#), 13 (A)', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { tensions: true });
      T.assert(m.has('D'));   // 9
      T.assert(m.has('F#'));  // #11
      T.assert(m.has('A'));   // 13
      T.assertEq(m.get('D').interval, '9');
    });
    T.it('G7: tensions incluye b9 (Ab) y #9 (A#)', () => {
      const m = A._computeRenderMap(chord('G','dom7'), { tensions: true });
      T.assert(m.has('G#'));
      T.assert(m.has('A#'));
    });
  });

  T.describe('computeRenderMap — scale', () => {
    T.it('Cmaj7 → escala lidia (con F#)', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { scale: true });
      T.assert(m.has('F#'));   // lidio
      T.assert(!m.has('F'));   // no jónico
    });
    T.it('Am7 → escala dórica (con F#)', () => {
      const m = A._computeRenderMap(chord('A','min7'), { scale: true });
      T.assert(m.has('F#'));
      T.assert(!m.has('F'));
    });
    T.it('G7 → escala mixolidia (con F natural)', () => {
      const m = A._computeRenderMap(chord('G','dom7'), { scale: true });
      T.assert(m.has('F'));
      T.assert(!m.has('F#'));
    });
  });

  T.describe('computeRenderMap — approach (próximo acorde)', () => {
    T.it('sin nextChord → no se pinta approach', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { approach: true });
      // sin chord tones, nada se pinta
      T.assertEq(m.size, 0);
    });
    T.it('Cmaj7 → Am7: pinta las pc de Am7 con intervalos relativos a A', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { approach: true }, chord('A','min7'));
      T.assertArrayEq(pcsOf(m), ['A','C','E','G']);
      T.assertEq(m.get('A').interval, '1');
      T.assertEq(m.get('C').interval, 'b3');
      T.assertEq(m.get('E').interval, '5');
      T.assertEq(m.get('G').interval, 'b7');
    });
    T.it('approach lleva nextRoot en el extra', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { approach: true }, chord('A','min7'));
      T.assertEq(m.get('A').nextRoot, 'A');
    });
    T.it('chordTones del actual ganan sobre approach', () => {
      // Cmaj7 → Am7: C es chord tone de Cmaj7 (1) y también es b3 del próximo (Am7).
      // Debe priorizar chordTone.
      const m = A._computeRenderMap(chord('C','maj7'), { chordTones: true, approach: true }, chord('A','min7'));
      T.assertEq(m.get('C').kind, 'chordTones');
      T.assertEq(m.get('C').interval, '1');
      T.assertEq(m.get('E').kind, 'chordTones');
      T.assertEq(m.get('G').kind, 'chordTones');
      T.assertEq(m.get('B').kind, 'chordTones');
      // A no está en Cmaj7 → es approach
      T.assertEq(m.get('A').kind, 'approach');
    });
    T.it('cross-ref: chord tone que persiste lleva nextInterval', () => {
      // Cmaj7 → Am7: C/E/G persisten en Am7 con intervalos b3/5/b7. B no persiste.
      const m = A._computeRenderMap(chord('C','maj7'), { chordTones: true, approach: true }, chord('A','min7'));
      T.assertEq(m.get('C').nextInterval, 'b3');
      T.assertEq(m.get('E').nextInterval, '5');
      T.assertEq(m.get('G').nextInterval, 'b7');
      T.assert(!m.get('B').nextInterval, 'B no debería tener nextInterval');
    });
    T.it('cross-ref no aparece sin approach activo', () => {
      const m = A._computeRenderMap(chord('C','maj7'), { chordTones: true }, chord('A','min7'));
      T.assert(!m.get('C').nextInterval);
    });
  });

  T.describe('computeRenderMap — allNotes', () => {
    T.it('cubre las 12 pcs', () => {
      const m = A._computeRenderMap(chord('C','major'), { allNotes: true });
      T.assertEq(m.size, 12);
    });
    T.it('intervalo correcto para cada pc desde A', () => {
      const m = A._computeRenderMap(chord('A','minor'), { allNotes: true });
      T.assertEq(m.get('A').interval, '1');
      T.assertEq(m.get('C').interval, 'b3');
      T.assertEq(m.get('E').interval, '5');
      T.assertEq(m.get('G#').interval, '7');
    });
  });

  T.describe('TENSIONS_BY_QUALITY — completitud', () => {
    T.it('todas las calidades comunes están mapeadas', () => {
      ['maj7','min7','dom7','dim7','m7b5','major','minor','dim','aug']
        .forEach(q => T.assert(Array.isArray(A._TENSIONS_BY_QUALITY[q]), 'falta ' + q));
    });
  });

  T.describe('SCALE_BY_QUALITY', () => {
    T.it('maj7 → lydian', () => T.assertEq(A._SCALE_BY_QUALITY.maj7, 'lydian'));
    T.it('min7 → dorian', () => T.assertEq(A._SCALE_BY_QUALITY.min7, 'dorian'));
    T.it('dom7 → mixolydian', () => T.assertEq(A._SCALE_BY_QUALITY.dom7, 'mixolydian'));
    T.it('m7b5 → locrian', () => T.assertEq(A._SCALE_BY_QUALITY.m7b5, 'locrian'));
  });

  T.describe('setActiveChord', () => {
    T.it('cambia activeIdx dentro de rango', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 4 },
        { root: 'A', quality: 'min7', bars: 4 },
      ]);
      A.setActiveChord(1);
      T.assertEq(A.getState().activeIdx, 1);
    });
    T.it('idx fuera de rango → no cambia', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 4 }]);
      A.setActiveChord(0);
      A.setActiveChord(99);
      T.assertEq(A.getState().activeIdx, 0);
    });
  });

  T.describe('applyDirection', () => {
    const cells = [];
    for (let s = 1; s <= 6; s++) for (let f = 0; f <= 12; f++) cells.push({ string: s, fret: f, note: 'X', info: { interval: '1', kind: 'chordTones' } });

    T.it('all → no filtra', () => {
      T.assertEq(A._applyDirection(cells, { direction: 'all' }).length, cells.length);
    });
    T.it('horizontal → solo focusString', () => {
      const r = A._applyDirection(cells, { direction: 'horizontal', focusString: 3 });
      T.assert(r.every(c => c.string === 3));
    });
    T.it('vertical → focusFret ± 1', () => {
      const r = A._applyDirection(cells, { direction: 'vertical', focusFret: 5 });
      T.assert(r.every(c => Math.abs(c.fret - 5) <= 1));
    });
    T.it('diagonal → max 2 por cuerda', () => {
      const r = A._applyDirection(cells, { direction: 'diagonal', focusFret: 5 });
      const byString = {};
      r.forEach(c => byString[c.string] = (byString[c.string] || 0) + 1);
      Object.values(byString).forEach(n => T.assert(n <= 2, 'cuerda con ' + n + ' notas'));
    });
  });

  T.describe('slotWidth (DAW-style)', () => {
    T.it('1 compás = 70px', () => T.assertEq(A._slotWidth(1), 70));
    T.it('2 compases = 100px', () => T.assertEq(A._slotWidth(2), 100));
    T.it('4 compases = 160px', () => T.assertEq(A._slotWidth(4), 160));
    T.it('8 compases = 280px', () => T.assertEq(A._slotWidth(8), 280));
    T.it('clamps under 1', () => T.assertEq(A._slotWidth(0), 70));
    T.it('clamps over 8', () => T.assertEq(A._slotWidth(99), 280));
  });

  T.describe('addChord defaults', () => {
    T.it('bars omitido → 1', () => {
      A.setProgression([]);
      A._addChord({ root: 'C', quality: 'maj7' });
      T.assertEq(A.getState().progression[0].bars, 1);
    });
    T.it('bars explícito se respeta', () => {
      A.setProgression([]);
      A._addChord({ root: 'D', quality: 'min7', bars: 4 });
      T.assertEq(A.getState().progression[0].bars, 4);
    });
    T.it('bars clamp a 1-8', () => {
      A.setProgression([]);
      A._addChord({ root: 'C', quality: 'maj7', bars: 99 });
      T.assertEq(A.getState().progression[0].bars, 8);
      A.setProgression([]);
      A._addChord({ root: 'C', quality: 'maj7', bars: 0 });
      T.assertEq(A.getState().progression[0].bars, 1);
    });
    T.it('primer acorde activa idx 0', () => {
      A.setProgression([]);
      A._addChord({ root: 'C', quality: 'maj7' });
      T.assertEq(A.getState().activeIdx, 0);
    });
  });

  T.describe('moveChord', () => {
    T.it('mueve forward', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ]);
      A._moveChord(0, 2);
      const p = A.getState().progression;
      T.assertEq(p[0].root, 'D');
      T.assertEq(p[1].root, 'C');
      T.assertEq(p[2].root, 'G');
    });
    T.it('mueve backward', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ]);
      A._moveChord(2, 0);
      const p = A.getState().progression;
      T.assertEq(p[0].root, 'G');
      T.assertEq(p[1].root, 'C');
      T.assertEq(p[2].root, 'D');
    });
    T.it('mismo origen y destino no rompe', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      A._moveChord(0, 0);
      T.assertEq(A.getState().progression.length, 1);
    });
  });

  T.describe('removeChordAt', () => {
    T.it('remueve y baja activeIdx si era el último', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
      ]);
      A.setActiveChord(1);
      A._removeChordAt(1);
      T.assertEq(A.getState().progression.length, 1);
      T.assertEq(A.getState().activeIdx, 0);
    });
    T.it('progresión vacía → activeIdx 0', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      A._removeChordAt(0);
      T.assertEq(A.getState().progression.length, 0);
      T.assertEq(A.getState().activeIdx, 0);
    });
  });

  T.describe('changeActiveBars', () => {
    T.it('+1 sube bars con clamp a 8', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      A._changeActiveBars(1);
      T.assertEq(A.getState().progression[0].bars, 2);
      A._changeActiveBars(99);
      T.assertEq(A.getState().progression[0].bars, 8);
    });
    T.it('-1 baja bars con clamp a 1', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 2 }]);
      A._changeActiveBars(-1);
      T.assertEq(A.getState().progression[0].bars, 1);
      A._changeActiveBars(-99);
      T.assertEq(A.getState().progression[0].bars, 1);
    });
  });

  T.describe('paleta — glifos y colores muted', () => {
    T.it('maj7 → Δ', () => T.assertEq(A._QUALITY_GLYPH.maj7, 'Δ'));
    T.it('min7 → m7', () => T.assertEq(A._QUALITY_GLYPH.min7, 'm7'));
    T.it('dom7 → 7', () => T.assertEq(A._QUALITY_GLYPH.dom7, '7'));
    T.it('dim7 → °', () => T.assertEq(A._QUALITY_GLYPH.dim7, '°'));
    T.it('m7b5 → ø', () => T.assertEq(A._QUALITY_GLYPH.m7b5, 'ø'));
    T.it('todas las calidades tienen color muted', () => {
      ['major','minor','dom7','maj7','min7','dim','dim7','m7b5','aug'].forEach(q =>
        T.assert(typeof A._QUALITY_PALETTE_COLOR[q] === 'string', 'falta color ' + q));
    });
  });

  T.describe('setPaletteMode', () => {
    T.it('cambia entre libre y diatonic', () => {
      A._setPaletteMode('diatonic');
      T.assertEq(A.getState().paletteMode, 'diatonic');
      A._setPaletteMode('libre');
      T.assertEq(A.getState().paletteMode, 'libre');
    });
    T.it('valor inválido cae a libre', () => {
      A._setPaletteMode('foobar');
      T.assertEq(A.getState().paletteMode, 'libre');
    });
  });

  T.describe('computeBpmFromTaps', () => {
    T.it('menos de 2 taps → null', () => {
      T.assertEq(A._computeBpmFromTaps([]), null);
      T.assertEq(A._computeBpmFromTaps([1000]), null);
    });
    T.it('2 taps a 500ms = 120 BPM', () => {
      T.assertEq(A._computeBpmFromTaps([0, 500]), 120);
    });
    T.it('4 taps a 750ms = 80 BPM', () => {
      // 4 timestamps: 0, 750, 1500, 2250 → intervals 750, 750, 750 → avg 750 → 60000/750=80
      T.assertEq(A._computeBpmFromTaps([0, 750, 1500, 2250]), 80);
    });
    T.it('redondea intervalos no exactos', () => {
      // ~480ms → 125 BPM
      T.assertEq(A._computeBpmFromTaps([0, 480]), 125);
    });
    T.it('clamp inferior a 40', () => {
      // 2000ms entre taps = 30 BPM → clamp 40
      T.assertEq(A._computeBpmFromTaps([0, 2000]), 40);
    });
    T.it('clamp superior a 220', () => {
      // 100ms entre taps = 600 BPM → clamp 220
      T.assertEq(A._computeBpmFromTaps([0, 100]), 220);
    });
  });

  T.describe('makePseudoVoicing', () => {
    T.it('produce una posición por chord note', () => {
      const c = TH.buildChord('C','maj7');
      const v = A._makePseudoVoicing(c);
      T.assertEq(v.length, c.notes.length);
    });
    T.it('strings dentro de 1-5', () => {
      const c = TH.buildChord('A','min7');
      const v = A._makePseudoVoicing(c);
      v.forEach(p => T.assert(p.string >= 1 && p.string <= 5));
    });
  });

})(window.GuitarShared, window);
