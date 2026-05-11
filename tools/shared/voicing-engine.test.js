// Tests for voicing-engine.js
(function (G) {
  const T  = G.testRunner;
  const VE = G.voicingEngine;
  const VT = G.voicingTemplates;

  // Roots de test por quality (elegidos para tener templates aplicables).
  const TEST_ROOT_BY_QUALITY = {
    major: 'C', minor: 'A', dom7: 'G', maj7: 'C', min7: 'A',
    dim: 'B', m7b5: 'B', aug: 'C',
  };
  const TEST_FRET_BY_ROOTSTRING = { 6: 5, 5: 5, 4: 5, 3: 5 };

  T.describe('applyTemplate — Am e-shape-min rootFret=5', () => {
    const tpl = VT.TEMPLATES.find(t => t.id === 'e-shape-min');
    const va  = VE.applyTemplate(tpl, 'A', 5, 6);

    T.it('6 posiciones', () => T.assertEq(va.positions.length, 6));
    T.it('rootString = 6', () => T.assertEq(va.rootString, 6));
    T.it('rootFret = 5',   () => T.assertEq(va.rootFret, 5));
    T.it('hasBarre',       () => T.assert(va.hasBarre));
    T.it('barre fret 5',   () => T.assertEq(va.barre.fret, 5));

    function pos(s) { return va.positions.find(p => p.string === s); }
    T.it('str6 R en fret 5 = A',  () => { T.assertEq(pos(6).fret, 5); T.assertEq(pos(6).note, 'A'); T.assertEq(pos(6).interval, 'R'); });
    T.it('str5 5 en fret 7 = E',  () => { T.assertEq(pos(5).fret, 7); T.assertEq(pos(5).note, 'E'); T.assertEq(pos(5).interval, '5'); });
    T.it('str4 R en fret 7 = A',  () => { T.assertEq(pos(4).fret, 7); T.assertEq(pos(4).note, 'A'); T.assertEq(pos(4).interval, 'R'); });
    T.it('str3 b3 en fret 5 = C', () => { T.assertEq(pos(3).fret, 5); T.assertEq(pos(3).note, 'C'); T.assertEq(pos(3).interval, 'b3'); });
    T.it('str2 5 en fret 5 = E',  () => { T.assertEq(pos(2).fret, 5); T.assertEq(pos(2).note, 'E'); });
    T.it('str1 R en fret 5 = A',  () => { T.assertEq(pos(1).fret, 5); T.assertEq(pos(1).note, 'A'); });
  });

  T.describe('validateVoicing — los 3 reglas en templates predefinidos', () => {
    VT.TEMPLATES.forEach(tpl => {
      tpl.appliesTo.forEach(quality => {
        T.it(`${tpl.id} con quality=${quality} → valid`, () => {
          const root = TEST_ROOT_BY_QUALITY[quality];
          if (!root) throw new Error(`sin root de test para quality ${quality}`);
          const rootFret = TEST_FRET_BY_ROOTSTRING[tpl.rootString];
          const va = VE.applyTemplate(tpl, root, rootFret, tpl.rootString);
          const v  = VE.validateVoicing(va);
          T.assert(v.valid, `INVÁLIDO: ${v.errors.join(' | ')}`);
        });
      });
    });
  });

  T.describe('validateVoicing — violaciones explícitas', () => {
    T.it('Regla 1: bajo no es raíz → invalid', () => {
      const va = {
        rootString: 6,
        positions: [
          { string: 6, fret: 5, interval: '5', note: 'A' },
          { string: 1, fret: 5, interval: 'R', note: 'A' },
        ],
      };
      const v = VE.validateVoicing(va);
      T.assert(!v.valid);
      T.assert(v.errors.some(e => /Regla 1/.test(e)));
    });

    T.it('Regla 3: solo cuerdas graves → invalid', () => {
      const va = {
        rootString: 6,
        positions: [
          { string: 6, fret: 5, interval: 'R',  note: 'A' },
          { string: 5, fret: 7, interval: '5',  note: 'E' },
          { string: 4, fret: 7, interval: 'b3', note: 'C' },
        ],
      };
      const v = VE.validateVoicing(va);
      T.assert(!v.valid);
      T.assert(v.errors.some(e => /Regla 3/.test(e)));
    });

    T.it('Regla 2: nota en cuerda más grave que rootString → invalid', () => {
      const va = {
        rootString: 5,
        positions: [
          { string: 6, fret: 5, interval: '5', note: 'A' },
          { string: 5, fret: 0, interval: 'R', note: 'A' },
          { string: 2, fret: 0, interval: '3', note: 'C#' },
        ],
      };
      const v = VE.validateVoicing(va);
      T.assert(!v.valid);
      T.assert(v.errors.some(e => /Regla 2/.test(e)));
    });

    T.it('Tríada con <3 pitch classes únicas → invalid', () => {
      const va = {
        rootString: 6,
        positions: [
          { string: 6, fret: 5, interval: 'R', note: 'A' },
          { string: 1, fret: 5, interval: 'R', note: 'A' },
        ],
      };
      const v = VE.validateVoicing(va);
      T.assert(!v.valid);
    });
  });

  T.describe('findApplicableTemplates', () => {
    T.it('Am en posición 0 (frets 0-4) devuelve templates', () => {
      const chord = { root: 'A', quality: 'minor' };
      const position = { fretStart: 0, fretEnd: 4 };
      const res = VE.findApplicableTemplates(chord, position, { topN: 5 });
      T.assert(res.length > 0, 'sin templates aplicables');
    });

    T.it('Am en pos 0: ningún voicing tiene notas fuera de [-2, 6]', () => {
      const chord = { root: 'A', quality: 'minor' };
      const position = { fretStart: 0, fretEnd: 4 };
      const res = VE.findApplicableTemplates(chord, position, { topN: 5 });
      res.forEach(va => {
        va.positions.forEach(p => {
          T.assert(p.fret === 0 || (p.fret >= -2 && p.fret <= 6),
            `${va.templateId} str${p.string} fret ${p.fret} fuera`);
        });
      });
    });

    T.it('topN respeta el límite', () => {
      const chord = { root: 'C', quality: 'major' };
      const position = { fretStart: 0, fretEnd: 4 };
      const res = VE.findApplicableTemplates(chord, position, { topN: 2 });
      T.assert(res.length <= 2);
    });

    T.it('quality desconocida → array vacío', () => {
      const res = VE.findApplicableTemplates({ root: 'C', quality: 'foo' }, { fretStart: 0, fretEnd: 4 });
      T.assertEq(res.length, 0);
    });

    T.it('ranking: CAGED shapes ranquean antes que tríadas cuando empata #cuerdas', () => {
      const chord = { root: 'C', quality: 'major' };
      const position = { fretStart: 1, fretEnd: 5 };
      const res = VE.findApplicableTemplates(chord, position, { topN: 5 });
      // Si hay un a-shape (5 notas) y un triad-321 (3 notas), el a-shape va primero.
      if (res.length >= 2) {
        for (let i = 1; i < res.length; i++) {
          T.assert(res[i-1].positions.length >= res[i].positions.length,
            `cuerdas no descienden: ${res.map(r=>r.templateId+':'+r.positions.length).join(',')}`);
        }
      }
    });
  });

})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
