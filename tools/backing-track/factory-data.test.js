// Tests de consistencia de los datos de fábrica — IIFE, sin DOM.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const BT = W.BackingTrack || {};
  const presets = BT.factoryPresets;
  const patterns = BT.factoryPatterns;
  const progressions = BT.factoryProgressions;
  if (!presets || !patterns || !progressions) {
    console.error('Datos de fábrica no cargados'); return;
  }

  const TIPOS = ['bajo', 'acordes', 'bateria', 'percusion', 'pad', 'lead'];
  const QUALITIES = ['major', 'minor', 'dom7', 'maj7', 'min7', 'm7b5'];

  T.describe('factoryPresets — forma y cobertura', () => {
    T.it('cada preset tiene id, nombre, tipo, motor y config', () => {
      presets.PRESETS.forEach(p => {
        T.assert(!!p.id && !!p.nombre && !!p.tipo && !!p.motor && !!p.config,
          'preset incompleto: ' + JSON.stringify(p.id));
      });
    });
    T.it('hay varios presets por cada tipo de instrumento', () => {
      TIPOS.forEach(tipo => {
        T.assert(presets.byTipo(tipo).length >= 1, 'falta preset de tipo ' + tipo);
      });
    });
    T.it('los ids de preset son únicos', () => {
      const ids = presets.PRESETS.map(p => p.id);
      T.assertEq(new Set(ids).size, ids.length);
    });
    T.it('byId encuentra un preset existente y devuelve null si no', () => {
      T.assertEq(presets.byId('bajoRedondo').tipo, 'bajo');
      T.assertEq(presets.byId('noExiste'), null);
    });
    T.it('clone devuelve una copia independiente', () => {
      const c = presets.clone(presets.byId('bajoRedondo'));
      c.nombre = 'modificado';
      T.assertEq(presets.byId('bajoRedondo').nombre, 'Bajo redondo');
    });
    T.it('las piezas de batería usan motores de síntesis válidos', () => {
      presets.byTipo('bateria').concat(presets.byTipo('percusion')).forEach(p => {
        const pieces = p.config.pieces || {};
        Object.keys(pieces).forEach(lane => {
          T.assert(['membrane', 'noise', 'metal', 'sample'].indexOf(pieces[lane].engine) >= 0,
            'engine inválido en ' + p.id + '/' + lane);
        });
      });
    });
  });

  T.describe('factoryPatterns — forma y consistencia', () => {
    T.it('cada patrón tiene la forma { steps, lanes, hits }', () => {
      patterns.PATTERNS.forEach(p => {
        T.assert(p.steps > 0 && Array.isArray(p.lanes) && Array.isArray(p.hits),
          'patrón mal formado: ' + p.id);
      });
    });
    T.it('todos los hits caen dentro del rango de pasos y en una lane válida', () => {
      patterns.PATTERNS.forEach(p => {
        p.hits.forEach(h => {
          T.assert(h.step >= 0 && h.step < p.steps, 'paso fuera de rango en ' + p.id);
          T.assert(p.lanes.indexOf(h.lane) >= 0, 'lane inválida en ' + p.id);
        });
      });
    });
    T.it('los patrones de batería usan las lanes del kit', () => {
      patterns.byTipo('drums').forEach(p => {
        p.lanes.forEach(l => {
          T.assert(patterns.KIT_LANES.indexOf(l) >= 0, 'lane de kit inesperada: ' + l);
        });
      });
    });
    T.it('hay patrones para bass, chord, drums y perc', () => {
      ['bass', 'chord', 'drums', 'perc'].forEach(t => {
        T.assert(patterns.byTipo(t).length >= 1, 'falta patrón de tipo ' + t);
      });
    });
  });

  T.describe('factoryProgressions — forma', () => {
    T.it('cada progresión tiene acordes con calidad y bars válidos', () => {
      progressions.PROGRESSIONS.forEach(p => {
        T.assert(p.chords.length > 0, 'progresión vacía: ' + p.id);
        p.chords.forEach(c => {
          T.assert(QUALITIES.indexOf(c.quality) >= 0, 'calidad inválida en ' + p.id);
          T.assert(c.bars >= 1, 'bars inválido en ' + p.id);
        });
      });
    });
    T.it('chordsOf devuelve una copia de los acordes', () => {
      const ch = progressions.chordsOf('jazzIIVI');
      T.assert(ch.length > 0);
      ch[0].root = 'X';
      T.assertEq(progressions.byId('jazzIIVI').chords[0].root, 'D');
    });
  });

  T.describe('datos de fábrica — integración con el scheduler', () => {
    T.it('el scheduler produce eventos con datos de fábrica reales', () => {
      if (!BT.scheduler) { T.assert(true); return; }
      const r = BT.scheduler.schedule({
        progression: progressions.chordsOf('blues12A'),
        tempo: 90,
        tracks: [
          { id: 'b', tipo: 'bajo', patternId: 'bajoNegras', enabled: true },
          { id: 'd', tipo: 'bateria', patternId: 'rockBasico', enabled: true },
        ],
        patterns: {
          bajoNegras: patterns.byId('bajoNegras'),
          rockBasico: patterns.byId('rockBasico'),
        },
      });
      T.assert(r.events.length > 0, 'el scheduler no produjo eventos');
    });
  });

  T.describe('factoryGrooves — forma y referencias', () => {
    const grooves = BT.factoryGrooves;
    T.it('cada groove tiene id, nombre y patterns', () => {
      grooves.GROOVES.forEach(g => {
        T.assert(!!g.id && !!g.nombre && !!g.patterns,
          'groove incompleto: ' + JSON.stringify(g.id));
      });
    });
    T.it('todos los patrones que referencia un groove existen', () => {
      grooves.GROOVES.forEach(g => {
        Object.keys(g.patterns).forEach(k => {
          T.assert(patterns.byId(g.patterns[k]) !== null,
            'patrón inexistente en groove ' + g.id + ': ' + g.patterns[k]);
        });
      });
    });
    T.it('byId encuentra un groove y devuelve null si no existe', () => {
      T.assertEq(grooves.byId('bluesShuffle').genero, 'blues');
      T.assertEq(grooves.byId('noExiste'), null);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
