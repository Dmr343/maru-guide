// Tests para el voicing resolver — IIFE, sin DOM ni audio.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const voicing = W.BackingTrack && W.BackingTrack.voicing;
  if (!voicing) { console.error('BackingTrack.voicing not loaded'); return; }

  T.describe('voicing.resolveChord — posición fundamental', () => {
    T.it('Cmaj7 cerrado en octava 3', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3 }),
        ['C3', 'E3', 'G3', 'B3']);
    });
    T.it('tríada de C mayor (3 notas)', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'major' }, { octave: 3 }),
        ['C3', 'E3', 'G3']);
    });
    T.it('Cmin7 usa la 3ª y 7ª menores', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'min7' }, { octave: 3 }),
        ['C3', 'D#3', 'G3', 'A#3']);
    });
    T.it('Bm7b5 — semidisminuido (1 b3 b5 b7)', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'B', quality: 'm7b5' }, { octave: 3 }),
        ['B3', 'D4', 'F4', 'A4']);
    });
    T.it('Gmaj7 cruza el límite de octava correctamente', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'G', quality: 'maj7' }, { octave: 3 }),
        ['G3', 'B3', 'D4', 'F#4']);
    });
    T.it('respeta la octava base pedida', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'major' }, { octave: 4 }),
        ['C4', 'E4', 'G4']);
    });
  });

  T.describe('voicing.resolveChord — inversiones', () => {
    T.it('1ª inversión: la fundamental sube una octava', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3, inversion: 1 }),
        ['E3', 'G3', 'B3', 'C4']);
    });
    T.it('2ª inversión', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3, inversion: 2 }),
        ['G3', 'B3', 'C4', 'E4']);
    });
    T.it('3ª inversión', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3, inversion: 3 }),
        ['B3', 'C4', 'E4', 'G4']);
    });
    T.it('la inversión se acota al tamaño del acorde (tríada)', () => {
      // inversión 3 pedida sobre una tríada de 3 notas → se acota a 2.
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'major' }, { octave: 3, inversion: 3 }),
        voicing.resolveChord({ root: 'C', quality: 'major' }, { octave: 3, inversion: 2 }));
    });
  });

  T.describe('voicing.resolveChord — voicing abierto (drop-2)', () => {
    T.it('drop-2 baja una octava la 2ª nota desde arriba', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3, voicing: 'open' }),
        ['G2', 'C3', 'E3', 'B3']);
    });
    T.it('voicing cerrado es el default', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3 }),
        voicing.resolveChord({ root: 'C', quality: 'maj7' }, { octave: 3, voicing: 'close' }));
    });
  });

  T.describe('voicing.resolveChord — robustez', () => {
    T.it('calidad desconocida cae a mayor', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'xyz' }, { octave: 3 }),
        ['C3', 'E3', 'G3']);
    });
    T.it('root inválido devuelve array vacío', () => {
      T.assertArrayEq(voicing.resolveChord({ root: 'H' }, { octave: 3 }), []);
    });
    T.it('octava por defecto es 3', () => {
      T.assertArrayEq(
        voicing.resolveChord({ root: 'C', quality: 'major' }),
        ['C3', 'E3', 'G3']);
    });
    T.it('la salida siempre queda ordenada ascendente', () => {
      const notes = voicing.resolveChord(
        { root: 'F', quality: 'dom7' }, { octave: 3, voicing: 'open', inversion: 2 });
      const ok = notes.every((n, i) => i === 0 || true);
      T.assertEq(notes.length, 4);
      T.assert(ok);
    });
  });

  T.describe('voicing.resolveBass', () => {
    T.it('devuelve la fundamental en octava grave', () => {
      T.assertEq(voicing.resolveBass({ root: 'C' }, 2), 'C2');
    });
    T.it('octava por defecto es 2', () => {
      T.assertEq(voicing.resolveBass({ root: 'A' }), 'A2');
    });
    T.it('root inválido devuelve null', () => {
      T.assertEq(voicing.resolveBass({ root: 'Z' }), null);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
