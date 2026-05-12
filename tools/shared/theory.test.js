// Theory tests — plain script, depends on test-runner.js + theory.js loaded first.
(function (G) {
  const T = G.testRunner;
  const {
    CHROMATIC, buildScale, buildChord, intervalToFunction, intervalFromRoot, chordColor, cagedShapeFor,
    commonChordTones, pickScaleForChord, advanceChord,
  } = G.theory;

  T.describe('intervalFromRoot', () => {
    T.it('C → C = 1',      () => T.assertEq(intervalFromRoot('C','C'), '1'));
    T.it('C → E = 3',      () => T.assertEq(intervalFromRoot('C','E'), '3'));
    T.it('C → G = 5',      () => T.assertEq(intervalFromRoot('C','G'), '5'));
    T.it('C → B = 7',      () => T.assertEq(intervalFromRoot('C','B'), '7'));
    T.it('C → A# = b7',    () => T.assertEq(intervalFromRoot('C','A#'), 'b7'));
    T.it('C → D# = b3',    () => T.assertEq(intervalFromRoot('C','D#'), 'b3'));
    T.it('C → F# = b5',    () => T.assertEq(intervalFromRoot('C','F#'), 'b5'));
    T.it('A → C = b3',     () => T.assertEq(intervalFromRoot('A','C'), 'b3'));
    T.it('A → E = 5',      () => T.assertEq(intervalFromRoot('A','E'), '5'));
    T.it('A → G = b7',     () => T.assertEq(intervalFromRoot('A','G'), 'b7'));
    T.it('G → F = b7',     () => T.assertEq(intervalFromRoot('G','F'), 'b7'));
    T.it('nota inválida → null', () => T.assertEq(intervalFromRoot('X','C'), null));
  });


  T.describe('CHROMATIC', () => {
    T.it('has 12 notes', () => T.assertEq(CHROMATIC.length, 12));
    T.it('starts with C', () => T.assertEq(CHROMATIC[0], 'C'));
    T.it('ends with B',   () => T.assertEq(CHROMATIC[11], 'B'));
  });

  T.describe('buildScale — major / minor', () => {
    T.it('C major', () => T.assertArrayEq(buildScale('C', 'major'), ['C','D','E','F','G','A','B']));
    T.it('G major', () => T.assertArrayEq(buildScale('G', 'major'), ['G','A','B','C','D','E','F#']));
    T.it('A minor', () => T.assertArrayEq(buildScale('A', 'minor'), ['A','B','C','D','E','F','G']));
  });

  T.describe('buildScale — pentatónica', () => {
    T.it('G pent_major', () => T.assertArrayEq(buildScale('G', 'pent_major'), ['G','A','B','D','E']));
    T.it('E pent_minor', () => T.assertArrayEq(buildScale('E', 'pent_minor'), ['E','G','A','B','D']));
    T.it('5 notes',      () => T.assertEq(buildScale('A', 'pent_minor').length, 5));
  });

  T.describe('buildScale — modos', () => {
    T.it('G mixolydian', () => T.assertArrayEq(buildScale('G', 'mixolydian'), ['G','A','B','C','D','E','F']));
    T.it('A dorian',     () => T.assertArrayEq(buildScale('A', 'dorian'),     ['A','B','C','D','E','F#','G']));
    T.it('7 notes each', () => {
      T.assertEq(buildScale('D', 'mixolydian').length, 7);
      T.assertEq(buildScale('D', 'dorian').length, 7);
    });
  });

  T.describe('buildChord', () => {
    T.it('C major — notas', () => {
      const c = buildChord('C', 'major');
      T.assertArrayEq(c.notes, ['C','E','G']);
      T.assertArrayEq(c.intervals, ['1','3','5']);
    });
    T.it('D minor — notas', () => {
      const c = buildChord('D', 'minor');
      T.assertArrayEq(c.notes, ['D','F','A']);
      T.assertArrayEq(c.intervals, ['1','b3','5']);
    });
    T.it('G dom7 — notas', () => {
      const c = buildChord('G', 'dom7');
      T.assertArrayEq(c.notes, ['G','B','D','F']);
      T.assertArrayEq(c.intervals, ['1','3','5','b7']);
    });
    T.it('F maj7 — notas', () => {
      const c = buildChord('F', 'maj7');
      T.assertArrayEq(c.notes, ['F','A','C','E']);
      T.assertArrayEq(c.intervals, ['1','3','5','7']);
    });
    T.it('E min7 — notas', () => {
      const c = buildChord('E', 'min7');
      T.assertArrayEq(c.notes, ['E','G','B','D']);
      T.assertArrayEq(c.intervals, ['1','b3','5','b7']);
    });
    T.it('root / quality preservados', () => {
      const c = buildChord('A', 'minor');
      T.assertEq(c.root, 'A');
      T.assertEq(c.quality, 'minor');
    });
  });

  T.describe('intervalToFunction', () => {
    T.it("'1' → 'R'",    () => T.assertEq(intervalToFunction('1'),   'R'));
    T.it("'3' → '3'",    () => T.assertEq(intervalToFunction('3'),   '3'));
    T.it("'b3' → '3'",   () => T.assertEq(intervalToFunction('b3'),  '3'));
    T.it("'5' → '5'",    () => T.assertEq(intervalToFunction('5'),   '5'));
    T.it("'b5' → '5'",   () => T.assertEq(intervalToFunction('b5'),  '5'));
    T.it("'7' → '7'",    () => T.assertEq(intervalToFunction('7'),   '7'));
    T.it("'b7' → '7'",   () => T.assertEq(intervalToFunction('b7'),  '7'));
    T.it("'2' → null",   () => T.assertEq(intervalToFunction('2'),   null));
    T.it("'4' → null",   () => T.assertEq(intervalToFunction('4'),   null));
  });

  T.describe('chordColor', () => {
    T.it('roots distintas → colores distintos', () =>
      T.assert(chordColor('C', 'major') !== chordColor('G', 'major')));
    T.it('mayor vs menor → colores distintos', () =>
      T.assert(chordColor('A', 'major') !== chordColor('A', 'minor')));
    T.it('devuelve string hsl', () =>
      T.assert(chordColor('E', 'major').startsWith('hsl(')));
  });

  T.describe('commonChordTones', () => {
    T.it('G mayor → C mayor: tienen G y C... wait, G major (G B D), C major (C E G) → solo G en común', () => {
      const a = buildChord('G', 'major');
      const b = buildChord('C', 'major');
      const common = commonChordTones(a, b);
      T.assertEq(common.size, 1);
      T.assert(common.has('G'));
    });
    T.it('Em → C mayor: E y G en común', () => {
      const em = buildChord('E', 'minor'); // E G B
      const c  = buildChord('C', 'major'); // C E G
      const common = commonChordTones(em, c);
      T.assertEq(common.size, 2);
      T.assert(common.has('E'));
      T.assert(common.has('G'));
    });
    T.it('chord vs sí mismo: todas las notas en común', () => {
      const c = buildChord('A', 'minor');
      T.assertEq(commonChordTones(c, c).size, 3);
    });
    T.it('null inputs → set vacío', () => {
      T.assertEq(commonChordTones(null, buildChord('C','major')).size, 0);
      T.assertEq(commonChordTones(buildChord('C','major'), null).size, 0);
      T.assertEq(commonChordTones(null, null).size, 0);
    });
    T.it('returns a Set', () => {
      const r = commonChordTones(buildChord('C','major'), buildChord('G','major'));
      T.assert(r instanceof Set);
    });
  });

  T.describe('pickScaleForChord — escala default por calidad', () => {
    T.it('major → pent_major (auto)',     () => T.assertEq(pickScaleForChord('major', { scaleAuto:true }), 'pent_major'));
    T.it('minor → pent_minor (auto)',     () => T.assertEq(pickScaleForChord('minor', { scaleAuto:true }), 'pent_minor'));
    T.it('dom7 → mixolydian (auto)',      () => T.assertEq(pickScaleForChord('dom7',  { scaleAuto:true }), 'mixolydian'));
    T.it('maj7 → major (auto)',           () => T.assertEq(pickScaleForChord('maj7',  { scaleAuto:true }), 'major'));
    T.it('min7 → minor (auto)',           () => T.assertEq(pickScaleForChord('min7',  { scaleAuto:true }), 'minor'));
    T.it('user override gana sobre auto', () => T.assertEq(pickScaleForChord('major', { scaleAuto:false, scale:'dorian' }), 'dorian'));
    T.it('scaleAuto=true ignora override', () => T.assertEq(pickScaleForChord('major', { scaleAuto:true,  scale:'dorian' }), 'pent_major'));
    T.it('sin scale + sin auto → fallback default por calidad', () => T.assertEq(pickScaleForChord('major', { scaleAuto:false }), 'pent_major'));
    T.it('calidad desconocida → major', () => T.assertEq(pickScaleForChord('zzz', { scaleAuto:true }), 'major'));
  });

  T.describe('advanceChord — siempre +1 desde currentIdx (fix metro independence)', () => {
    T.it('0 → 1 con 4 acordes',         () => T.assertEq(advanceChord(0, 4), 1));
    T.it('3 → 0 wraps con 4 acordes',   () => T.assertEq(advanceChord(3, 4), 0));
    T.it('1 acorde solo → siempre 0',   () => T.assertEq(advanceChord(0, 1), 0));
    T.it('progresión vacía → 0',        () => T.assertEq(advanceChord(5, 0), 0));
    T.it('manual click a slot 2 → next es 3, no salto', () => T.assertEq(advanceChord(2, 4), 3));
  });

  T.describe('cagedShapeFor G mayor', () => {
    T.it('returns 5 shapes', () => T.assertEq(cagedShapeFor('G').length, 5));
    T.it('E-shape barre 3',  () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'E').barre, 3));
    T.it('A-shape barre 10', () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'A').barre, 10));
    T.it('G-shape barre 12', () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'G').barre, 12));
    T.it('C-shape barre 7',  () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'C').barre, 7));
    T.it('D-shape barre 5',  () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'D').barre, 5));
    T.it('cada shape tiene fretRange', () => {
      cagedShapeFor('G').forEach(s => {
        T.assert(Array.isArray(s.fretRange) && s.fretRange.length === 2);
      });
    });
  });
})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
