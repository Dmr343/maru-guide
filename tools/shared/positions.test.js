// Tests for positions.js — requires test-runner.js, theory.js, theory-modes.js, positions.js.
(function (G) {
  const T = G.testRunner;
  const P = G.positions;

  T.describe('getScalePosition — C mayor', () => {
    T.it('posición 0 arranca en fret 0', () => {
      const p = P.getScalePosition('C', 'major', 0);
      T.assertEq(p.fretStart, 0);
      T.assertEq(p.fretEnd, 4);
    });
    T.it('posición 0 contiene las 7 pitch classes de C mayor', () => {
      const p = P.getScalePosition('C', 'major', 0);
      const pcs = new Set(p.notes.map(n => n.note));
      ['C','D','E','F','G','A','B'].forEach(n =>
        T.assert(pcs.has(n), `falta ${n}`));
    });
    T.it('posición 0 no incluye notas fuera de C mayor', () => {
      const p = P.getScalePosition('C', 'major', 0);
      const scale = new Set(['C','D','E','F','G','A','B']);
      p.notes.forEach(n => T.assert(scale.has(n.note), `nota extraña: ${n.note}`));
    });
    T.it('posición 0 todas las notas dentro de [0,4]', () => {
      const p = P.getScalePosition('C', 'major', 0);
      p.notes.forEach(n => T.assert(n.fret >= 0 && n.fret <= 4));
    });
    T.it('hay 5 posiciones', () => {
      for (let i = 0; i < 5; i++) {
        T.assert(P.getScalePosition('C', 'major', i) !== null, `idx ${i} null`);
      }
      T.assertEq(P.getScalePosition('C', 'major', 5), null);
    });
    T.it('fretStart ascendente entre posiciones', () => {
      const starts = [0,1,2,3,4].map(i => P.getScalePosition('C','major',i).fretStart);
      for (let i = 1; i < starts.length; i++) {
        T.assert(starts[i] > starts[i-1], `no asciende en ${i}: ${starts}`);
      }
    });
  });

  T.describe('getScalePosition — octaveShift', () => {
    T.it('octaveShift 1 desplaza 12 trastes', () => {
      const a = P.getScalePosition('C', 'major', 0);
      const b = P.getScalePosition('C', 'major', 0, { octaveShift: 1 });
      T.assertEq(b.fretStart, a.fretStart + 12);
      T.assertEq(b.fretEnd, a.fretEnd + 12);
    });
    T.it('octaveShift conserva las pitch classes', () => {
      const a = P.getScalePosition('C', 'major', 0);
      const b = P.getScalePosition('C', 'major', 0, { octaveShift: 1 });
      const ap = new Set(a.notes.map(n => n.note));
      const bp = new Set(b.notes.map(n => n.note));
      ap.forEach(n => T.assert(bp.has(n), `falta ${n} en octava arriba`));
    });
  });

  T.describe('getScalePosition — A menor', () => {
    T.it('posición 0 arranca en fret 0', () => {
      const p = P.getScalePosition('A', 'minor', 0);
      T.assertEq(p.fretStart, 0);
    });
    T.it('contiene las 7 pitch classes de A menor', () => {
      const p = P.getScalePosition('A', 'minor', 0);
      const pcs = new Set(p.notes.map(n => n.note));
      ['A','B','C','D','E','F','G'].forEach(n =>
        T.assert(pcs.has(n), `falta ${n}`));
    });
  });

  T.describe('getArbitraryPosition', () => {
    T.it('ventana de 5 trastes desde startFret=7 en C mayor', () => {
      const p = P.getArbitraryPosition('C', 'major', 7, 5);
      T.assertEq(p.fretStart, 7);
      T.assertEq(p.fretEnd, 11);
      p.notes.forEach(n => T.assert(n.fret >= 7 && n.fret <= 11));
    });
    T.it('span personalizado', () => {
      const p = P.getArbitraryPosition('C', 'major', 3, 3);
      T.assertEq(p.fretEnd, 5);
    });
    T.it('span default = 5', () => {
      const p = P.getArbitraryPosition('C', 'major', 3);
      T.assertEq(p.fretEnd, 7);
    });
  });

  T.describe('getAllScaleNotes', () => {
    T.it('devuelve notas en todas las cuerdas', () => {
      const all = P.getAllScaleNotes('C', 'major', 12);
      const strings = new Set(all.map(n => n.string));
      T.assertEq(strings.size, 6);
    });
    T.it('todas las notas son de la escala', () => {
      const all = P.getAllScaleNotes('C', 'major', 12);
      const scale = new Set(['C','D','E','F','G','A','B']);
      all.forEach(n => T.assert(scale.has(n.note), `nota extraña: ${n.note}`));
    });
  });

  T.describe('noteAt — afinación estándar', () => {
    T.it('cuerda 6 abierta = E', () => T.assertEq(P.noteAt(6, 0), 'E'));
    T.it('cuerda 5 fret 3 = C',   () => T.assertEq(P.noteAt(5, 3), 'C'));
    T.it('cuerda 1 fret 5 = A',   () => T.assertEq(P.noteAt(1, 5), 'A'));
    T.it('cuerda 3 fret 4 = B',   () => T.assertEq(P.noteAt(3, 4), 'B'));
  });

})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
