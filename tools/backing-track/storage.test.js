// Tests para storage — IIFE, sin DOM. Usa un adapter en memoria,
// igual que persistence.test.js del Atlas usa MemoryStorageAdapter.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const BT = W.BackingTrack || {};
  if (!BT.createStorage || !BT.userLibrary) {
    console.error('storage / userLibrary no cargados'); return;
  }

  function memAdapter() {
    const m = {};
    return {
      _m: m,
      getItem: k => (k in m ? m[k] : null),
      setItem: (k, v) => { m[k] = String(v); },
      removeItem: k => { delete m[k]; },
    };
  }
  function fresh() {
    BT.userLibrary.replaceAll([]);
    return BT.createStorage({ storage: memAdapter() });
  }
  const SNAP = {
    progression: [{ root: 'C', quality: 'maj7', bars: 2 }],
    tempo: 120, loopEnabled: true, mode: 'practica',
    tracks: [{ id: 't1', tipo: 'bajo', presetId: 'bajoRedondo' }],
  };

  T.describe('storage — proyectos', () => {
    T.it('guarda y carga un proyecto', () => {
      const s = fresh();
      const id = s.saveProject('Mi blues', SNAP);
      const loaded = s.loadProject(id);
      T.assertEq(loaded.tempo, 120);
      T.assertEq(loaded.progression[0].root, 'C');
    });
    T.it('listProjects devuelve id y nombre', () => {
      const s = fresh();
      s.saveProject('Uno', SNAP);
      s.saveProject('Dos', SNAP);
      T.assertEq(s.listProjects().length, 2);
      T.assertEq(s.listProjects()[0].nombre, 'Uno');
    });
    T.it('guardar con un nombre existente reemplaza el proyecto', () => {
      const s = fresh();
      s.saveProject('Mismo', SNAP);
      s.saveProject('Mismo', Object.assign({}, SNAP, { tempo: 90 }));
      T.assertEq(s.listProjects().length, 1);
      T.assertEq(s.loadProject(s.listProjects()[0].id).tempo, 90);
    });
    T.it('borra un proyecto', () => {
      const s = fresh();
      const id = s.saveProject('Borrar', SNAP);
      s.deleteProject(id);
      T.assertEq(s.listProjects().length, 0);
    });
    T.it('loadProject de un id inexistente devuelve null', () => {
      T.assertEq(fresh().loadProject('no-existe'), null);
    });
  });

  T.describe('storage — librería de presets del usuario', () => {
    T.it('persiste y recupera la librería', () => {
      const s = fresh();
      BT.userLibrary.add({ nombre: 'Mi bajo', tipo: 'bajo', motor: 'synth', config: {} });
      s.saveLibrary();
      BT.userLibrary.replaceAll([]);   // simula recarga de la app
      T.assertEq(BT.userLibrary.getAll().length, 0);
      s.loadLibrary();
      T.assertEq(BT.userLibrary.getAll().length, 1);
      T.assertEq(BT.userLibrary.getAll()[0].nombre, 'Mi bajo');
    });
  });

  T.describe('storage — sesión actual', () => {
    T.it('guarda y recupera la sesión', () => {
      const s = fresh();
      s.saveSession(SNAP);
      T.assertEq(s.loadSession().tempo, 120);
    });
    T.it('loadSession sin sesión guardada devuelve null', () => {
      T.assertEq(fresh().loadSession(), null);
    });
    T.it('clearSession borra la sesión', () => {
      const s = fresh();
      s.saveSession(SNAP);
      s.clearSession();
      T.assertEq(s.loadSession(), null);
    });
  });

  T.describe('storage — exportar / importar', () => {
    T.it('exportAll produce JSON con librería y proyectos', () => {
      const s = fresh();
      BT.userLibrary.add({ nombre: 'P', tipo: 'pad', motor: 'synth', config: {} });
      s.saveProject('Proj', SNAP);
      const json = JSON.parse(s.exportAll());
      T.assertEq(json.library.length, 1);
      T.assertEq(json.projects.length, 1);
    });
    T.it('importAll restaura librería y proyectos', () => {
      const origen = fresh();
      BT.userLibrary.add({ nombre: 'X', tipo: 'lead', motor: 'synth', config: {} });
      origen.saveProject('Y', SNAP);
      const json = origen.exportAll();

      const destino = fresh();   // resetea userLibrary
      T.assertEq(destino.importAll(json), true);
      T.assertEq(BT.userLibrary.getAll().length, 1);
      T.assertEq(destino.listProjects().length, 1);
    });
    T.it('importAll con JSON inválido devuelve false', () => {
      T.assertEq(fresh().importAll('{no es json'), false);
    });
  });

  T.describe('storage — robustez y migración', () => {
    T.it('datos corruptos en una clave caen a un valor vacío', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_projects'] = '{roto';
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.listProjects().length, 0);
    });
    T.it('datos sin __v se aceptan (migración a v1)', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_projects'] = JSON.stringify({
        projects: [{ id: 'a', nombre: 'Viejo', data: SNAP }],
      });
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.listProjects().length, 1);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
