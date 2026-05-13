// Tests for Persistence — storage port + migrations + round-trip.
// Usa MemoryStorageAdapter inyectado; cero dependencia de localStorage real.
(function (G, W) {
  const T = G.testRunner;
  const P = W.Persistence;
  const Mem = W.MemoryStorageAdapter;
  if (!P || !Mem) { console.error('Persistence not loaded'); return; }

  T.describe('Persistence — defaults', () => {
    T.it('load sin nada en storage devuelve defaults clonados', () => {
      const store = new P({ storage: Mem(), key: 'k', defaults: { bpm: 80, foo: 'bar' } });
      const s = store.load();
      T.assertEq(s.bpm, 80);
      T.assertEq(s.foo, 'bar');
    });
    T.it('defaults clonados — mutar el load no afecta el store', () => {
      const store = new P({ storage: Mem(), key: 'k', defaults: { layers: { a: 1 } } });
      const s1 = store.load();
      s1.layers.a = 999;
      const s2 = store.load();
      T.assertEq(s2.layers.a, 1);
    });
  });

  T.describe('Persistence — round-trip', () => {
    T.it('save + load preserva state', () => {
      const mem = Mem();
      const store = new P({ storage: mem, key: 'k', defaults: { bpm: 80 } });
      store.save({ bpm: 140, foo: 'bar' });
      const s = store.load();
      T.assertEq(s.bpm, 140);
      T.assertEq(s.foo, 'bar');
    });
    T.it('__v se inyecta al save pero no se filtra al load', () => {
      const mem = Mem();
      const store = new P({ storage: mem, key: 'k', defaults: {}, migrations: [s => s] });
      store.save({ x: 1 });
      const raw = JSON.parse(mem.getItem('k'));
      T.assertEq(raw.__v, 1, 'persistido con __v');
      const s = store.load();
      T.assertEq('__v' in s, false, 'no expuesto al caller');
    });
  });

  T.describe('Persistence — merge profundo (deepKeys)', () => {
    T.it('campos top-level del default se preservan', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify({ bpm: 140 }));
      const store = new P({
        storage: mem, key: 'k',
        defaults: { bpm: 80, prerollEnabled: false, hiddenIntervals: [] },
      });
      const s = store.load();
      T.assertEq(s.bpm, 140);
      T.assertEq(s.prerollEnabled, false, 'default preservado');
      T.assertArrayEq(s.hiddenIntervals, [], 'default array preservado');
    });
    T.it('deepKeys merge sub-campos', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify({ layers: { scale: true } }));
      const store = new P({
        storage: mem, key: 'k',
        defaults: { layers: { scale: false, tensions: false, allNotes: false } },
        deepKeys: ['layers'],
      });
      const s = store.load();
      T.assertEq(s.layers.scale, true);
      T.assertEq(s.layers.tensions, false, 'sub-campo ausente conserva default');
      T.assertEq(s.layers.allNotes, false);
    });
    T.it('sin deepKeys, sub-campo ausente se pierde', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify({ layers: { scale: true } }));
      const store = new P({
        storage: mem, key: 'k',
        defaults: { layers: { scale: false, tensions: false } },
      });
      const s = store.load();
      T.assertEq(s.layers.scale, true);
      T.assertEq(s.layers.tensions, undefined);
    });
  });

  T.describe('Persistence — migrations', () => {
    T.it('state sin __v aplica migration desde v0', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify({ parentKey: 'D' }));
      const store = new P({
        storage: mem, key: 'k', defaults: {},
        migrations: [
          (s) => { const o = Object.assign({}, s); o.diatonicKey = o.parentKey; delete o.parentKey; return o; },
        ],
      });
      const s = store.load();
      T.assertEq(s.diatonicKey, 'D');
      T.assert(!('parentKey' in s));
    });
    T.it('state v1 con 2 migrations queda en v2', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify({ __v: 1, x: 1 }));
      const store = new P({
        storage: mem, key: 'k', defaults: {},
        migrations: [
          (s) => s,             // v0 → v1 (skipped)
          (s) => Object.assign({}, s, { y: 2 }),  // v1 → v2
        ],
      });
      const s = store.load();
      T.assertEq(s.x, 1);
      T.assertEq(s.y, 2);
    });
    T.it('state ya en versión actual no muta', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify({ __v: 1, x: 999 }));
      const store = new P({
        storage: mem, key: 'k', defaults: {},
        migrations: [(s) => { throw new Error('no debería correr'); }],
      });
      const s = store.load();
      T.assertEq(s.x, 999);
    });
  });

  T.describe('Persistence — errores y recuperación', () => {
    T.it('JSON corrupto → defaults', () => {
      const mem = Mem();
      mem.setItem('k', '{not json');
      const store = new P({ storage: mem, key: 'k', defaults: { bpm: 80 } });
      T.assertEq(store.load().bpm, 80);
    });
    T.it('state no-objeto → defaults', () => {
      const mem = Mem();
      mem.setItem('k', JSON.stringify(42));
      const store = new P({ storage: mem, key: 'k', defaults: { bpm: 80 } });
      T.assertEq(store.load().bpm, 80);
    });
    T.it('setItem que lanza → no-op silencioso', () => {
      const throwing = {
        getItem: () => null,
        setItem: () => { throw new Error('quota'); },
        removeItem: () => {},
      };
      const store = new P({ storage: throwing, key: 'k', defaults: {} });
      let thrown = false;
      try { store.save({ x: 1 }); } catch (e) { thrown = true; }
      T.assert(!thrown, 'save no debe lanzar aunque storage falle');
    });
  });

  T.describe('Persistence — defaults array (favoritos)', () => {
    T.it('save + load array round-trip', () => {
      const mem = Mem();
      const store = new P({ storage: mem, key: 'favs', defaults: [] });
      store.save([{ id: 'a', name: 'F1' }]);
      const list = store.load();
      T.assertEq(list.length, 1);
      T.assertEq(list[0].id, 'a');
    });
    T.it('load sin nada → array vacío clonado', () => {
      const store = new P({ storage: Mem(), key: 'favs', defaults: [] });
      const list = store.load();
      T.assert(Array.isArray(list));
      T.assertEq(list.length, 0);
    });
    T.it('array no se guarda con __v contaminado', () => {
      const mem = Mem();
      const store = new P({ storage: mem, key: 'favs', defaults: [] });
      store.save([{ id: 'a' }]);
      const raw = JSON.parse(mem.getItem('favs'));
      T.assert(Array.isArray(raw));
      T.assert(!('__v' in raw));
    });
  });

  T.describe('Persistence — clear', () => {
    T.it('clear remueve el key', () => {
      const mem = Mem();
      const store = new P({ storage: mem, key: 'k', defaults: { bpm: 80 } });
      store.save({ bpm: 140 });
      T.assert(mem.getItem('k') != null);
      store.clear();
      T.assertEq(mem.getItem('k'), null);
    });
  });

  T.describe('LocalStorageAdapter', () => {
    T.it('atrapa excepciones de getItem (Safari privado)', () => {
      const ls = { getItem() { throw new Error('SecurityError'); } };
      const a = W.LocalStorageAdapter(ls);
      T.assertEq(a.getItem('k'), null);
    });
    T.it('atrapa excepciones de setItem (cuota llena)', () => {
      const ls = { setItem() { throw new Error('QuotaExceededError'); } };
      const a = W.LocalStorageAdapter(ls);
      let thrown = false;
      try { a.setItem('k', 'v'); } catch (e) { thrown = true; }
      T.assert(!thrown);
    });
    T.it('storage null → no-op', () => {
      const a = W.LocalStorageAdapter(null);
      T.assertEq(a.getItem('k'), null);
      a.setItem('k', 'v');  // no debe lanzar
      a.removeItem('k');
      T.assert(true);
    });
  });

})((typeof window !== 'undefined' ? window : globalThis).GuitarShared,
   typeof window !== 'undefined' ? window : globalThis);
