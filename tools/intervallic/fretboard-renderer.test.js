// Tests for FretboardRenderer — testea computeDrawPlan SIN DOM,
// con stubs deterministas de geometría.
(function (G, W) {
  const T = G.testRunner;
  const FR = W.FretboardRenderer;
  if (!FR) { console.error('FretboardRenderer not loaded'); return; }
  const TH = G.theory;

  // Stubs deterministas de geometría
  const stubGeom = {
    fretStart: 0,
    fretW: 10,
    fretX: (rf, fw) => rf * fw,
    stringY: (si) => si * 10,
    openNotes: ['E','A','D','G','B','E'],
    noteAt: (open, fret) => {
      const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      return CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
    },
  };

  function defaultParams(over) {
    return Object.assign({
      chord: TH.buildChord('C','maj7'),
      nextChord: null,
      layers: { chordTones: true },
      hiddenIntervals: [],
      filter: { stringSet: [1,2,3,4,5,6], fretRange: [0,12], direction: 'all' },
      showNoteNames: false,
      numFrets: 22,
      geometry: stubGeom,
    }, over || {});
  }

  T.describe('FretboardRenderer — chord tones', () => {
    T.it('Cmaj7 genera cells con intervalos correctos', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const intervals = new Set(plan.cells.map(c => c.interval));
      ['1','3','5','7'].forEach(i =>
        T.assert(intervals.has(i), 'falta interval ' + i));
    });
    T.it('cells de chord tones tienen radius=12 y hasFill=true', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c => {
        T.assertEq(c.radius, 12);
        T.assertEq(c.hasFill, true);
      });
    });
    T.it('cell con interval "1" tiene halo', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const rootCells = plan.cells.filter(c => c.interval === '1');
      T.assert(rootCells.length > 0);
      rootCells.forEach(c => T.assert(c.halo, 'falta halo en root'));
    });
    T.it('cells no-root no tienen halo', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const others = plan.cells.filter(c => c.interval !== '1');
      others.forEach(c => T.assertEq(c.halo, null));
    });
    T.it('colorKey === interval', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c => T.assertEq(c.colorKey, c.interval));
    });
  });

  T.describe('FretboardRenderer — filtros', () => {
    T.it('stringSet excluye cuerdas no listadas', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        filter: { stringSet: [1, 2], fretRange: [0, 12], direction: 'all' },
      }));
      plan.cells.forEach(c => T.assert(c.string === 1 || c.string === 2,
        'cuerda fuera: ' + c.string));
    });
    T.it('fretRange limita los frets', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        filter: { stringSet: [1,2,3,4,5,6], fretRange: [0, 4], direction: 'all' },
      }));
      plan.cells.forEach(c => T.assert(c.fret >= 0 && c.fret <= 4));
    });
    T.it('direction=horizontal con focusString=3 deja solo string 3', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        filter: { stringSet: [1,2,3,4,5,6], fretRange: [0, 12], direction: 'horizontal', focusString: 3 },
      }));
      plan.cells.forEach(c => T.assertEq(c.string, 3));
    });
    T.it('hiddenIntervals excluye los listados', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        hiddenIntervals: ['5', '7'],
      }));
      plan.cells.forEach(c => T.assert(c.interval !== '5' && c.interval !== '7'));
    });
  });

  T.describe('FretboardRenderer — approach (ghost)', () => {
    T.it('approach del próximo acorde produce ring + sin fill', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('C','maj7'),
        nextChord: TH.buildChord('A','min7'),
        layers: { chordTones: true, approach: true },
      }));
      const approachCells = plan.cells.filter(c => c.kind === 'approach');
      T.assert(approachCells.length > 0, 'al menos una cell approach');
      approachCells.forEach(c => {
        T.assertEq(c.hasFill, false);
        T.assert(c.ring, 'falta ring en approach');
        T.assertEq(c.ring.dasharray, '2.2,1.8');
      });
    });
    T.it('approach radius=7 y alpha=0.55', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('C','maj7'),
        nextChord: TH.buildChord('A','min7'),
        layers: { chordTones: true, approach: true },
      }));
      const ap = plan.cells.find(c => c.kind === 'approach');
      T.assert(ap);
      T.assertEq(ap.radius, 7);
      T.assertEq(ap.fillAlpha, 0.55);
    });
    T.it('cross-ref: chord tone que persiste en próximo tiene crossRef.badge', () => {
      // Cmaj7 → Am7: C, E, G persisten. Sus crossRef debe tener nextInterval.
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('C','maj7'),
        nextChord: TH.buildChord('A','min7'),
        layers: { chordTones: true, approach: true },
      }));
      const cWith = plan.cells.filter(c => c.kind === 'chordTones' && c.crossRef);
      T.assert(cWith.length > 0, 'al menos un chord tone con crossRef');
      cWith.forEach(c => {
        T.assert(c.crossRef.badge.text, 'badge debe tener text');
        T.assert(c.crossRef.ring, 'crossRef debe tener ring');
      });
    });
  });

  T.describe('FretboardRenderer — showNoteNames', () => {
    T.it('showNoteNames=false → no hay nameLabel', () => {
      const plan = FR.computeDrawPlan(defaultParams({ showNoteNames: false }));
      plan.cells.forEach(c => T.assertEq(c.nameLabel, null));
    });
    T.it('showNoteNames=true → cada cell tiene nameLabel con pill + text', () => {
      const plan = FR.computeDrawPlan(defaultParams({ showNoteNames: true }));
      T.assert(plan.cells.length > 0);
      plan.cells.forEach(c => {
        T.assert(c.nameLabel, 'falta nameLabel');
        T.assert(c.nameLabel.pill);
        T.assert(c.nameLabel.text);
        T.assertEq(c.nameLabel.text.value, c.note);
      });
    });
  });

  T.describe('FretboardRenderer — sin chord activo', () => {
    T.it('chord=null devuelve plan vacío', () => {
      const plan = FR.computeDrawPlan(defaultParams({ chord: null }));
      T.assertEq(plan.cells.length, 0);
    });
  });

  T.describe('FretboardRenderer — geometry resuelve x/y', () => {
    T.it('x = fretX(fret - fretStart, fretW)', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const cell = plan.cells.find(c => c.fret === 3);
      if (cell) T.assertEq(cell.x, 3 * 10); // stub: 30
    });
    T.it('y = stringY(6 - string)', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const cell = plan.cells.find(c => c.string === 5);
      if (cell) T.assertEq(cell.y, 10); // stub: (6-5)*10
    });
  });

})((typeof window !== 'undefined' ? window : globalThis).GuitarShared,
   typeof window !== 'undefined' ? window : globalThis);
