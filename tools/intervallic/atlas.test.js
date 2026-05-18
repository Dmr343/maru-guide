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

  // NOTA: addChord/moveChord/removeChordAt/changeActiveBars/copy/paste/nextIdxFor
  // se testean en progression-model.test.js (son responsabilidad del modelo).

  T.describe('paleta — labels jazz y colores muted', () => {
    T.it('maj7 → Δ', () => T.assertEq(A._QUALITY_LABEL.maj7, 'Δ'));
    T.it('min7 → m7', () => T.assertEq(A._QUALITY_LABEL.min7, 'm7'));
    T.it('dom7 → 7', () => T.assertEq(A._QUALITY_LABEL.dom7, '7'));
    T.it('dim7 → °7', () => T.assertEq(A._QUALITY_LABEL.dim7, '°7'));
    T.it('m7b5 → ø', () => T.assertEq(A._QUALITY_LABEL.m7b5, 'ø'));
    T.it('dim → °', () => T.assertEq(A._QUALITY_LABEL.dim, '°'));
    T.it('major → "" (sin sufijo)', () => T.assertEq(A._QUALITY_LABEL.major, ''));
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

  // computeBpmFromTaps movida a TransportController.computeBpmFromTaps,
  // testeada en transport-controller.test.js.

  // copy/paste se testean en progression-model.test.js.

  T.describe('handleKeydown — atajos', () => {
    function mockEvent(key, opts) {
      let prevented = false;
      return {
        key,
        target: { tagName: opts && opts.tagName || 'BODY' },
        ctrlKey: !!(opts && opts.ctrl),
        metaKey: false, shiftKey: false, altKey: false,
        preventDefault() { prevented = true; },
        get prevented() { return prevented; },
      };
    }
    T.it('en INPUT → no captura', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      const e = mockEvent('ArrowRight', { tagName: 'INPUT' });
      T.assertEq(A._handleKeydown(e), undefined === undefined ? false : false);
    });
    T.it('ArrowRight avanza activeIdx', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
      ]);
      A.setActiveChord(0);
      A._handleKeydown(mockEvent('ArrowRight'));
      T.assertEq(A.getState().activeIdx, 1);
    });
    T.it('ArrowUp sube bars del activo', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      A.setActiveChord(0);
      A._handleKeydown(mockEvent('ArrowUp'));
      T.assertEq(A.getState().progression[0].bars, 2);
    });
    T.it('Delete remueve el activo', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
      ]);
      A.setActiveChord(1);
      A._handleKeydown(mockEvent('Delete'));
      T.assertEq(A.getState().progression.length, 1);
    });
    T.it('tecla "2" salta a acorde 2', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
      ]);
      A.setActiveChord(0);
      A._handleKeydown(mockEvent('2'));
      T.assertEq(A.getState().activeIdx, 1);
    });
    T.it('Ctrl+C copia y Ctrl+V pega', () => {
      A.setProgression([{ root: 'D', quality: 'min7', bars: 3 }]);
      A.setActiveChord(0);
      A._handleKeydown(mockEvent('c', { ctrl: true }));
      A._handleKeydown(mockEvent('v', { ctrl: true }));
      const p = A.getState().progression;
      T.assertEq(p.length, 2);
      T.assertEq(p[1].root, 'D');
    });
  });

  // nextIdxFor → ahora vive en progression-model.test.js como model.nextIdx().

  T.describe('presets', () => {
    T.it('AtlasPresets expone PRESETS y GENRES', () => {
      const W = (typeof window !== 'undefined' ? window : globalThis);
      T.assert(Array.isArray(W.AtlasPresets.PRESETS));
      T.assert(Array.isArray(W.AtlasPresets.GENRES));
    });
    T.it('todos los presets tienen estructura válida', () => {
      const W = (typeof window !== 'undefined' ? window : globalThis);
      W.AtlasPresets.PRESETS.forEach(p => {
        T.assert(typeof p.id === 'string', 'id falta en ' + JSON.stringify(p));
        T.assert(typeof p.name === 'string', 'name falta');
        T.assert(typeof p.genre === 'string', 'genre falta');
        T.assert(Array.isArray(p.chords) && p.chords.length > 0, 'chords vacío en ' + p.id);
        p.chords.forEach(c => {
          T.assert(typeof c.root === 'string', 'chord sin root en ' + p.id);
          T.assert(typeof c.quality === 'string', 'chord sin quality en ' + p.id);
          T.assert(typeof c.bars === 'number' && c.bars >= 1 && c.bars <= 8, 'bars fuera de 1-8 en ' + p.id);
        });
      });
    });
    T.it('cargar preset vía setProgression delega al modelo y queda como esperado', () => {
      const W = (typeof window !== 'undefined' ? window : globalThis);
      const preset = W.AtlasPresets.byId('jazz-ii-V-I-C');
      A.setProgression(preset.chords);
      const p = A.getState().progression;
      T.assertEq(p.length, 3);
      T.assertEq(p[0].root, 'D');
      T.assertEq(p[2].quality, 'maj7');
    });
  });

  T.describe('favoritos', () => {
    T.it('saveCurrentAsFavorite con progresión vacía → null', () => {
      A.setProgression([]);
      T.assertEq(A._saveCurrentAsFavorite('test'), null);
    });
    T.it('saveCurrentAsFavorite con progresión válida devuelve fav', () => {
      A.setProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 2 },
      ]);
      const fav = A._saveCurrentAsFavorite('Test');
      T.assert(fav && fav.id && fav.name === 'Test');
      T.assertEq(fav.chords.length, 2);
      T.assertEq(fav.chords[0].root, 'C');
      T.assertEq(fav.chords[1].bars, 2);
    });
  });

  T.describe('applyHiddenIntervals — filtra leyenda', () => {
    T.it('lista vacía → renderMap inalterado', () => {
      const m = A._computeRenderMap(TH.buildChord('C','maj7'), { chordTones: true });
      const out = A._applyHiddenIntervals(m, []);
      T.assertEq(out.size, m.size);
    });
    T.it('oculta "5" → excluye G de Cmaj7', () => {
      const m = A._computeRenderMap(TH.buildChord('C','maj7'), { chordTones: true });
      const out = A._applyHiddenIntervals(m, ['5']);
      T.assert(!out.has('G'));
      T.assert(out.has('C'));
      T.assert(out.has('E'));
      T.assert(out.has('B'));
    });
    T.it('oculta múltiples intervalos', () => {
      const m = A._computeRenderMap(TH.buildChord('C','maj7'), { chordTones: true });
      const out = A._applyHiddenIntervals(m, ['5', '7']);
      T.assertArrayEq(Array.from(out.keys()).sort(), ['C','E']);
    });
    T.it('toggleHiddenInterval togglea en el state', () => {
      A._toggleHiddenInterval('5');
      T.assert(A.getState().hiddenIntervals.includes('5'));
      A._toggleHiddenInterval('5');
      T.assert(!A.getState().hiddenIntervals.includes('5'));
    });
  });

  T.describe('toggleLegendInterval — extras vs ocultos', () => {
    T.it('intervalo ajeno al acorde va a extraIntervals', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      A._toggleLegendInterval('b6');
      T.assert(A.getState().extraIntervals.includes('b6'));
      A._toggleLegendInterval('b6');
      T.assert(!A.getState().extraIntervals.includes('b6'));
    });
    T.it('nota del acorde va a hiddenIntervals, no a extras', () => {
      A.setProgression([{ root: 'C', quality: 'maj7', bars: 1 }]);
      A.getState().hiddenIntervals = [];
      A.getState().extraIntervals = [];
      A._toggleLegendInterval('5');
      T.assert(A.getState().hiddenIntervals.includes('5'));
      T.assert(!A.getState().extraIntervals.includes('5'));
    });
  });

  // makePseudoVoicing eliminado junto con el audio de bloque del acorde.

})(window.GuitarShared, window);
