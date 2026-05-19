// Tests para la integración con el Atlas — IIFE, sin DOM.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const integration = W.BackingTrack && W.BackingTrack.integration;
  if (!integration) { console.error('BackingTrack.integration no cargado'); return; }

  const tr = integration.translateAtlasProgression;

  T.describe('integration.translateAtlasProgression', () => {
    T.it('deja pasar las calidades soportadas', () => {
      const out = tr([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ]);
      T.assertEq(out.length, 3);
      T.assertEq(out[0].quality, 'maj7');
      T.assertEq(out[2].quality, 'dom7');
    });
    T.it('m7b5 pasa directo; dim7 (no soportado) se aproxima a m7b5', () => {
      const out = tr([
        { root: 'C', quality: 'dim7', bars: 1 },
        { root: 'E', quality: 'm7b5', bars: 1 },
      ]);
      T.assertEq(out[0].quality, 'm7b5');
      T.assertEq(out[1].quality, 'm7b5');
    });
    T.it('acota los compases al rango 1..8', () => {
      const out = tr([
        { root: 'C', quality: 'maj7', bars: 0 },
        { root: 'C', quality: 'maj7', bars: 99 },
      ]);
      T.assertEq(out[0].bars, 1);
      T.assertEq(out[1].bars, 8);
    });
    T.it('descarta acordes con root inválido', () => {
      const out = tr([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'H', quality: 'maj7', bars: 1 },
      ]);
      T.assertEq(out.length, 1);
    });
    T.it('calidad desconocida cae a major', () => {
      T.assertEq(tr([{ root: 'C', quality: 'xyz', bars: 1 }])[0].quality, 'major');
    });
    T.it('entrada no-array devuelve lista vacía', () => {
      T.assertEq(tr(null).length, 0);
    });
  });

  T.describe('integration.readHandoff', () => {
    // localStorage falso para correr sin navegador.
    function fakeLS(initial) {
      const m = initial || {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
        removeItem: k => { delete m[k]; },
        _m: m,
      };
    }

    T.it('lee y traduce la progresión dejada por el Atlas', () => {
      W.localStorage = fakeLS({
        backing_track_handoff: JSON.stringify({
          progression: [{ root: 'D', quality: 'min7', bars: 2 }],
        }),
      });
      const prog = integration.readHandoff();
      T.assertEq(prog.length, 1);
      T.assertEq(prog[0].root, 'D');
      T.assertEq(prog[0].bars, 2);
    });
    T.it('limpia la clave después de leerla', () => {
      const ls = fakeLS({
        backing_track_handoff: JSON.stringify({
          progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        }),
      });
      W.localStorage = ls;
      integration.readHandoff();
      T.assertEq(ls.getItem('backing_track_handoff'), null);
    });
    T.it('sin handoff devuelve null', () => {
      W.localStorage = fakeLS({});
      T.assertEq(integration.readHandoff(), null);
    });
    T.it('handoff con JSON corrupto devuelve null', () => {
      W.localStorage = fakeLS({ backing_track_handoff: '{roto' });
      T.assertEq(integration.readHandoff(), null);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
