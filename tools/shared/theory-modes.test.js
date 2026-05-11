// Tests for theory-modes.js — requires test-runner.js, theory.js, theory-modes.js loaded first.
(function (G) {
  const T = G.testRunner;
  const th = G.theory;

  T.describe('buildModeScale — modos nuevos', () => {
    T.it('A harmonic_minor', () => T.assertArrayEq(
      th.buildModeScale('A', 'harmonic_minor'), ['A','B','C','D','E','F','G#']));
    T.it('A melodic_minor', () => T.assertArrayEq(
      th.buildModeScale('A', 'melodic_minor'), ['A','B','C','D','E','F#','G#']));
    T.it('E phrygian', () => T.assertArrayEq(
      th.buildModeScale('E', 'phrygian'), ['E','F','G','A','B','C','D']));
    T.it('F lydian', () => T.assertArrayEq(
      th.buildModeScale('F', 'lydian'), ['F','G','A','B','C','D','E']));
    T.it('B locrian', () => T.assertArrayEq(
      th.buildModeScale('B', 'locrian'), ['B','C','D','E','F','G','A']));
    T.it('siempre 7 notas', () => {
      ['harmonic_minor','melodic_minor','phrygian','lydian','locrian'].forEach(m =>
        T.assertEq(th.buildModeScale('C', m).length, 7));
    });
  });

  T.describe('buildModeScale — modos que ya existían siguen funcionando', () => {
    T.it('C major',      () => T.assertArrayEq(th.buildModeScale('C', 'major'),      ['C','D','E','F','G','A','B']));
    T.it('A minor',      () => T.assertArrayEq(th.buildModeScale('A', 'minor'),      ['A','B','C','D','E','F','G']));
    T.it('G mixolydian', () => T.assertArrayEq(th.buildModeScale('G', 'mixolydian'), ['G','A','B','C','D','E','F']));
    T.it('A dorian',     () => T.assertArrayEq(th.buildModeScale('A', 'dorian'),     ['A','B','C','D','E','F#','G']));
  });

  T.describe('buildChord — tipos nuevos', () => {
    T.it('Bdim notas',  () => T.assertArrayEq(th.buildChord('B','dim').notes,  ['B','D','F']));
    T.it('Bdim intervals', () => T.assertArrayEq(th.buildChord('B','dim').intervals, ['1','b3','b5']));
    T.it('Cm7b5 notas', () => T.assertArrayEq(th.buildChord('C','m7b5').notes, ['C','D#','F#','A#']));
    T.it('Cm7b5 intervals', () => T.assertArrayEq(th.buildChord('C','m7b5').intervals, ['1','b3','b5','b7']));
    T.it('Caug notas',  () => T.assertArrayEq(th.buildChord('C','aug').notes,  ['C','E','G#']));
  });

  T.describe('buildChord — tipos existentes siguen funcionando', () => {
    T.it('C major', () => T.assertArrayEq(th.buildChord('C','major').notes, ['C','E','G']));
    T.it('A minor', () => T.assertArrayEq(th.buildChord('A','minor').notes, ['A','C','E']));
    T.it('G dom7',  () => T.assertArrayEq(th.buildChord('G','dom7').notes,  ['G','B','D','F']));
  });

  T.describe('getDiatonicChords — C mayor', () => {
    const chords = th.getDiatonicChords('C', 'major');
    T.it('devuelve 7 acordes', () => T.assertEq(chords.length, 7));
    T.it('I = Cmaj',   () => { T.assertEq(chords[0].chord.root, 'C');  T.assertEq(chords[0].chord.quality, 'major'); });
    T.it('ii = Dm',    () => { T.assertEq(chords[1].chord.root, 'D');  T.assertEq(chords[1].chord.quality, 'minor'); });
    T.it('iii = Em',   () => { T.assertEq(chords[2].chord.root, 'E');  T.assertEq(chords[2].chord.quality, 'minor'); });
    T.it('IV = Fmaj',  () => { T.assertEq(chords[3].chord.root, 'F');  T.assertEq(chords[3].chord.quality, 'major'); });
    T.it('V = Gmaj',   () => { T.assertEq(chords[4].chord.root, 'G');  T.assertEq(chords[4].chord.quality, 'major'); });
    T.it('vi = Am',    () => { T.assertEq(chords[5].chord.root, 'A');  T.assertEq(chords[5].chord.quality, 'minor'); });
    T.it('vii° = Bdim',() => { T.assertEq(chords[6].chord.root, 'B');  T.assertEq(chords[6].chord.quality, 'dim');   });
    T.it('numerales',  () => {
      const nums = chords.map(c => c.numeral);
      T.assertArrayEq(nums, ['I','ii','iii','IV','V','vi','vii°']);
    });
  });

  T.describe('getDiatonicChords — A menor natural', () => {
    const chords = th.getDiatonicChords('A', 'minor');
    T.it('i = Am',    () => { T.assertEq(chords[0].chord.root, 'A'); T.assertEq(chords[0].chord.quality, 'minor'); });
    T.it('ii° = Bdim',() => { T.assertEq(chords[1].chord.root, 'B'); T.assertEq(chords[1].chord.quality, 'dim');   });
    T.it('III = Cmaj',() => { T.assertEq(chords[2].chord.root, 'C'); T.assertEq(chords[2].chord.quality, 'major'); });
    T.it('iv = Dm',   () => { T.assertEq(chords[3].chord.root, 'D'); T.assertEq(chords[3].chord.quality, 'minor'); });
    T.it('v = Em',    () => { T.assertEq(chords[4].chord.root, 'E'); T.assertEq(chords[4].chord.quality, 'minor'); });
    T.it('VI = Fmaj', () => { T.assertEq(chords[5].chord.root, 'F'); T.assertEq(chords[5].chord.quality, 'major'); });
    T.it('VII = Gmaj',() => { T.assertEq(chords[6].chord.root, 'G'); T.assertEq(chords[6].chord.quality, 'major'); });
  });

  T.describe('getDiatonicChords — degrees y chord.root', () => {
    T.it('degree 1..7', () => {
      th.getDiatonicChords('G', 'major').forEach((c, i) =>
        T.assertEq(c.degree, i + 1));
    });
    T.it('chord.root es nota de la escala', () => {
      const scale = th.buildModeScale('D', 'major');
      th.getDiatonicChords('D', 'major').forEach((c, i) =>
        T.assertEq(c.chord.root, scale[i]));
    });
  });

})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
