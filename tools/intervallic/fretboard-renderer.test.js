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

  T.describe('FretboardRenderer — tracer bullet', () => {
    T.it('chord tones de Cmaj7 generan cells con intervalos correctos', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const intervals = new Set(plan.cells.map(c => c.interval));
      ['1','3','5','7'].forEach(i =>
        T.assert(intervals.has(i), 'falta interval ' + i));
    });
  });

})((typeof window !== 'undefined' ? window : globalThis).GuitarShared,
   typeof window !== 'undefined' ? window : globalThis);
