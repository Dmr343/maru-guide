// Tests para el step-grid / pattern model — IIFE, sin DOM ni audio.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const SG = W.BackingTrack && W.BackingTrack.stepGrid;
  if (!SG) { console.error('BackingTrack.stepGrid not loaded'); return; }

  T.describe('stepGrid.create', () => {
    T.it('crea un patrón vacío de 16 pasos por defecto', () => {
      const p = SG.create();
      T.assertEq(p.steps, 16);
      T.assertEq(p.hits.length, 0);
      T.assertArrayEq(p.lanes, ['main']);
    });
    T.it('respeta steps y lanes pedidos', () => {
      const p = SG.create({ steps: 8, lanes: ['kick', 'snare'] });
      T.assertEq(p.steps, 8);
      T.assertArrayEq(p.lanes, ['kick', 'snare']);
    });
    T.it('acota steps inválidos al default', () => {
      T.assertEq(SG.create({ steps: 0 }).steps, 16);
      T.assertEq(SG.create({ steps: -5 }).steps, 16);
    });
    T.it('siembra hits válidos y descarta los inválidos', () => {
      const p = SG.create({
        steps: 16, lanes: ['kick'],
        hits: [
          { lane: 'kick', step: 0, velocity: 1 },
          { lane: 'kick', step: 99, velocity: 1 },   // paso fuera de rango
          { lane: 'ghost', step: 4, velocity: 1 },   // lane inexistente
        ],
      });
      T.assertEq(p.hits.length, 1);
      T.assertEq(p.hits[0].step, 0);
    });
  });

  T.describe('stepGrid.toggle', () => {
    T.it('agrega un hit donde no había', () => {
      const p = SG.toggle(SG.create({ lanes: ['kick'] }), 'kick', 4, 0.9);
      T.assertEq(SG.isOn(p, 'kick', 4), true);
      T.assertEq(SG.hitAt(p, 'kick', 4).velocity, 0.9);
    });
    T.it('quita un hit existente', () => {
      let p = SG.create({ lanes: ['kick'] });
      p = SG.toggle(p, 'kick', 4);
      p = SG.toggle(p, 'kick', 4);
      T.assertEq(SG.isOn(p, 'kick', 4), false);
    });
    T.it('no muta el patrón original (operación pura)', () => {
      const original = SG.create({ lanes: ['kick'] });
      SG.toggle(original, 'kick', 4);
      T.assertEq(original.hits.length, 0);
    });
    T.it('lane o paso inválido devuelve el patrón sin cambios', () => {
      const p = SG.create({ lanes: ['kick'] });
      T.assertEq(SG.toggle(p, 'ghost', 4), p);
      T.assertEq(SG.toggle(p, 'kick', 99), p);
    });
  });

  T.describe('stepGrid.setVelocity', () => {
    T.it('ajusta la velocity de un hit existente', () => {
      let p = SG.toggle(SG.create({ lanes: ['kick'] }), 'kick', 0, 0.5);
      p = SG.setVelocity(p, 'kick', 0, 1);
      T.assertEq(SG.hitAt(p, 'kick', 0).velocity, 1);
    });
    T.it('crea el hit si no existía', () => {
      const p = SG.setVelocity(SG.create({ lanes: ['kick'] }), 'kick', 2, 0.7);
      T.assertEq(SG.hitAt(p, 'kick', 2).velocity, 0.7);
    });
    T.it('acota la velocity al rango 0..1', () => {
      let p = SG.setVelocity(SG.create({ lanes: ['kick'] }), 'kick', 0, 5);
      T.assertEq(SG.hitAt(p, 'kick', 0).velocity, 1);
      p = SG.setVelocity(p, 'kick', 1, -3);
      T.assertEq(SG.hitAt(p, 'kick', 1).velocity, 0);
    });
  });

  T.describe('stepGrid.resize', () => {
    T.it('cambia la cantidad de pasos', () => {
      T.assertEq(SG.resize(SG.create(), 8).steps, 8);
    });
    T.it('descarta los hits que quedan fuera del nuevo rango', () => {
      let p = SG.create({ steps: 16, lanes: ['kick'] });
      p = SG.toggle(p, 'kick', 2);
      p = SG.toggle(p, 'kick', 12);
      p = SG.resize(p, 8);
      T.assertEq(SG.isOn(p, 'kick', 2), true);
      T.assertEq(SG.isOn(p, 'kick', 12), false);
    });
  });

  T.describe('stepGrid.clearLane', () => {
    T.it('quita solo los hits de la lane indicada', () => {
      let p = SG.create({ lanes: ['kick', 'snare'] });
      p = SG.toggle(p, 'kick', 0);
      p = SG.toggle(p, 'snare', 4);
      p = SG.clearLane(p, 'kick');
      T.assertEq(SG.isOn(p, 'kick', 0), false);
      T.assertEq(SG.isOn(p, 'snare', 4), true);
    });
  });

  T.describe('stepGrid.hitsAt', () => {
    T.it('devuelve los hits de todas las lanes en un paso', () => {
      let p = SG.create({ lanes: ['kick', 'hat'] });
      p = SG.toggle(p, 'kick', 0);
      p = SG.toggle(p, 'hat', 0);
      p = SG.toggle(p, 'hat', 2);
      T.assertEq(SG.hitsAt(p, 0).length, 2);
      T.assertEq(SG.hitsAt(p, 2).length, 1);
      T.assertEq(SG.hitsAt(p, 5).length, 0);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
