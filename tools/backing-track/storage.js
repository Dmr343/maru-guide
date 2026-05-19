// ─────────────────────────────────────────────────────────────
// Backing Track — storage (persistencia)
//
// Persiste en localStorage tres cosas independientes:
//   1. La librería de presets del usuario (BackingTrack.userLibrary).
//   2. Los proyectos / sesiones nombrados por el usuario.
//   3. La sesión actual (autoguardado, para reabrir donde se dejó).
//
// Más exportar / importar todo como JSON y migraciones versionadas.
//
// createStorage({ storage }) recibe un adapter de almacenamiento
// (getItem/setItem/removeItem); por defecto usa localStorage. El
// adapter inyectable hace el módulo testeable sin navegador — igual
// que MemoryStorageAdapter en tools/intervallic/persistence.test.js.
//
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const VERSION = 1;
  const LIB_KEY = 'backing_track_library';
  const PROJ_KEY = 'backing_track_projects';
  const SESSION_KEY = 'backing_track_session';

  // migrate — lleva datos de versiones viejas al formato actual.
  // Hoy solo asegura __v; es el punto de extensión para el futuro.
  function migrate(data) {
    data = data || {};
    if (!data.__v || data.__v < 1) data.__v = 1;
    return data;
  }

  function localStorageAdapter() {
    return {
      getItem: function (k) {
        try { return W.localStorage.getItem(k); } catch (e) { return null; }
      },
      setItem: function (k, v) {
        try { W.localStorage.setItem(k, v); } catch (e) {}
      },
      removeItem: function (k) {
        try { W.localStorage.removeItem(k); } catch (e) {}
      },
    };
  }

  function createStorage(opts) {
    opts = opts || {};
    const adapter = opts.storage || localStorageAdapter();
    let projCounter = 0;

    function readJSON(key, fallback) {
      const raw = adapter.getItem(key);
      if (!raw) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    }
    function writeJSON(key, value) {
      adapter.setItem(key, JSON.stringify(value));
    }
    function userLib() { return W.BackingTrack && W.BackingTrack.userLibrary; }

    // ─── Librería de presets del usuario ───
    function saveLibrary() {
      const ul = userLib();
      writeJSON(LIB_KEY, { __v: VERSION, presets: ul ? ul.getAll() : [] });
    }
    function loadLibrary() {
      const data = migrate(readJSON(LIB_KEY, { __v: VERSION, presets: [] }));
      const presets = Array.isArray(data.presets) ? data.presets : [];
      const ul = userLib();
      if (ul) ul.replaceAll(presets);
      return presets;
    }

    // ─── Proyectos ───
    function readProjects() {
      const data = migrate(readJSON(PROJ_KEY, { __v: VERSION, projects: [] }));
      return Array.isArray(data.projects) ? data.projects : [];
    }
    function writeProjects(list) {
      writeJSON(PROJ_KEY, { __v: VERSION, projects: list });
    }
    function listProjects() {
      return readProjects().map(p => ({ id: p.id, nombre: p.nombre }));
    }
    // saveProject — guarda (o reemplaza, si el nombre ya existe) un
    // proyecto. snapshot es lo que devuelve engine.snapshot().
    function saveProject(nombre, snapshot) {
      const list = readProjects();
      nombre = (nombre || 'Proyecto').trim() || 'Proyecto';
      const existing = list.find(p => p.nombre === nombre);
      const id = existing ? existing.id
        : 'proj-' + Date.now() + '-' + (++projCounter);
      const project = { id: id, nombre: nombre, data: snapshot };
      if (existing) list[list.indexOf(existing)] = project;
      else list.push(project);
      writeProjects(list);
      return id;
    }
    function loadProject(id) {
      const p = readProjects().find(x => x.id === id);
      return p ? p.data : null;
    }
    function deleteProject(id) {
      writeProjects(readProjects().filter(p => p.id !== id));
    }

    // ─── Sesión actual (autoguardado) ───
    function saveSession(snapshot) {
      writeJSON(SESSION_KEY, { __v: VERSION, session: snapshot });
    }
    function loadSession() {
      const data = migrate(readJSON(SESSION_KEY, null) || {});
      return data.session || null;
    }
    function clearSession() {
      adapter.removeItem(SESSION_KEY);
    }

    // ─── Exportar / importar ───
    function exportAll() {
      return JSON.stringify({
        __v: VERSION,
        library: userLib() ? userLib().getAll() : [],
        projects: readProjects(),
      }, null, 2);
    }
    function importAll(json) {
      let data;
      try { data = JSON.parse(json); } catch (e) { return false; }
      data = migrate(data);
      if (Array.isArray(data.library) && userLib()) {
        userLib().replaceAll(data.library);
        saveLibrary();
      }
      if (Array.isArray(data.projects)) writeProjects(data.projects);
      return true;
    }

    return {
      VERSION: VERSION,
      saveLibrary: saveLibrary, loadLibrary: loadLibrary,
      saveProject: saveProject, loadProject: loadProject,
      listProjects: listProjects, deleteProject: deleteProject,
      saveSession: saveSession, loadSession: loadSession, clearSession: clearSession,
      exportAll: exportAll, importAll: importAll,
    };
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.createStorage = createStorage;
})(typeof window !== 'undefined' ? window : globalThis);
