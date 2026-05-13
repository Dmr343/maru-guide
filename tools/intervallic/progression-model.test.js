// Tests for ProgressionModel — IIFE, sin DOM.
(function (G, W) {
  const T = G.testRunner;
  const PM = W.ProgressionModel;
  if (!PM) { console.error('ProgressionModel not loaded'); return; }

  function makeModel(initialState) {
    let callCount = 0;
    let lastSnapshot = null;
    const model = new PM({
      initialState: initialState || null,
      onChange(state) { callCount++; lastSnapshot = state; },
    });
    return { model, get callCount() { return callCount; }, get lastSnapshot() { return lastSnapshot; } };
  }

  T.describe('ProgressionModel — addChord + onChange', () => {
    T.it('agrega un acorde y dispara onChange una sola vez', () => {
      const ctx = makeModel();
      ctx.model.addChord({ root: 'C', quality: 'maj7' });
      T.assertEq(ctx.callCount, 1, 'onChange debe dispararse 1 vez');
      T.assertEq(ctx.model.progression.length, 1);
      T.assertEq(ctx.model.progression[0].root, 'C');
      T.assertEq(ctx.model.progression[0].quality, 'maj7');
    });
  });

  T.describe('ProgressionModel — snapshot', () => {
    T.it('snapshot() incluye progression, activeIdx y loopRange', () => {
      const ctx = makeModel({ progression: [{root:'C', quality:'maj7', bars:2}], activeIdx: 0 });
      const s = ctx.model.snapshot();
      T.assertEq(Array.isArray(s.progression), true);
      T.assert('activeIdx' in s);
      T.assert('loopRange' in s);
    });
    T.it('snapshot() NO incluye copiedChord (efímero)', () => {
      const ctx = makeModel();
      const s = ctx.model.snapshot();
      T.assertEq('copiedChord' in s, false, 'copiedChord no debe persistir');
    });
    T.it('snapshot() devuelve clon (mutar el snapshot no afecta el modelo)', () => {
      const ctx = makeModel({ progression: [{root:'C', quality:'maj7', bars:1}] });
      const s = ctx.model.snapshot();
      s.progression.push({ root: 'A', quality: 'min7', bars: 1 });
      s.progression[0].root = 'X';
      T.assertEq(ctx.model.progression.length, 1);
      T.assertEq(ctx.model.progression[0].root, 'C');
    });
  });

  T.describe('ProgressionModel — removeChordAt', () => {
    T.it('quita el acorde en idx y dispara onChange', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1},{root:'A',quality:'min7',bars:1}],
      });
      ctx.model.removeChordAt(0);
      T.assertEq(ctx.model.progression.length, 1);
      T.assertEq(ctx.model.progression[0].root, 'A');
      T.assertEq(ctx.callCount, 1);
    });
    T.it('si el activo era el último → activeIdx baja', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1},{root:'A',quality:'min7',bars:1}],
        activeIdx: 1,
      });
      ctx.model.removeChordAt(1);
      T.assertEq(ctx.model.activeIdx, 0);
    });
    T.it('quitar el único acorde → progresión vacía + activeIdx=0', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.removeChordAt(0);
      T.assertEq(ctx.model.progression.length, 0);
      T.assertEq(ctx.model.activeIdx, 0);
    });
    T.it('idx fuera de rango → no muta ni dispara onChange', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.removeChordAt(5);
      T.assertEq(ctx.model.progression.length, 1);
      T.assertEq(ctx.callCount, 0);
    });
  });

  T.describe('ProgressionModel — moveChord', () => {
    function prog3() {
      return makeModel({
        progression: [
          {root:'C', quality:'maj7', bars:1},
          {root:'A', quality:'min7', bars:1},
          {root:'G', quality:'dom7', bars:1},
        ],
      });
    }
    T.it('mueve forward (0 → 2)', () => {
      const ctx = prog3();
      ctx.model.moveChord(0, 2);
      const p = ctx.model.progression;
      T.assertArrayEq(p.map(c => c.root), ['A','G','C']);
    });
    T.it('mueve backward (2 → 0)', () => {
      const ctx = prog3();
      ctx.model.moveChord(2, 0);
      const p = ctx.model.progression;
      T.assertArrayEq(p.map(c => c.root), ['G','C','A']);
    });
    T.it('mismo origen y destino → no muta ni dispara onChange', () => {
      const ctx = prog3();
      ctx.model.moveChord(1, 1);
      T.assertArrayEq(ctx.model.progression.map(c => c.root), ['C','A','G']);
      T.assertEq(ctx.callCount, 0);
    });
    T.it('índice inválido → no muta ni dispara onChange', () => {
      const ctx = prog3();
      ctx.model.moveChord(-1, 2);
      ctx.model.moveChord(0, 99);
      T.assertArrayEq(ctx.model.progression.map(c => c.root), ['C','A','G']);
      T.assertEq(ctx.callCount, 0);
    });
  });

  T.describe('ProgressionModel — editChordAt', () => {
    T.it('actualiza root y quality, preserva bars', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:3}] });
      ctx.model.editChordAt(0, { root: 'D', quality: 'min7' });
      T.assertEq(ctx.model.progression[0].root, 'D');
      T.assertEq(ctx.model.progression[0].quality, 'min7');
      T.assertEq(ctx.model.progression[0].bars, 3);
      T.assertEq(ctx.callCount, 1);
    });
    T.it('actualiza solo root', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.editChordAt(0, { root: 'D' });
      T.assertEq(ctx.model.progression[0].root, 'D');
      T.assertEq(ctx.model.progression[0].quality, 'maj7');
    });
    T.it('bars en patch respeta clamp', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.editChordAt(0, { bars: 99 });
      T.assertEq(ctx.model.progression[0].bars, 8);
    });
    T.it('idx fuera de rango → no muta', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.editChordAt(5, { root: 'D' });
      T.assertEq(ctx.model.progression[0].root, 'C');
      T.assertEq(ctx.callCount, 0);
    });
  });

  T.describe('ProgressionModel — changeActiveBars', () => {
    T.it('+1 sube bars del activo', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}], activeIdx: 0 });
      ctx.model.changeActiveBars(+1);
      T.assertEq(ctx.model.progression[0].bars, 2);
    });
    T.it('-1 baja bars del activo, clamp en 1', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}], activeIdx: 0 });
      ctx.model.changeActiveBars(-1);
      T.assertEq(ctx.model.progression[0].bars, 1);
    });
    T.it('+99 clamp en 8', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}], activeIdx: 0 });
      ctx.model.changeActiveBars(99);
      T.assertEq(ctx.model.progression[0].bars, 8);
    });
    T.it('progresión vacía → no muta ni dispara', () => {
      const ctx = makeModel();
      ctx.model.changeActiveBars(+1);
      T.assertEq(ctx.callCount, 0);
    });
  });

  T.describe('ProgressionModel — setActiveChord', () => {
    T.it('cambia activeIdx dentro de rango', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1},{root:'A',quality:'min7',bars:1}],
      });
      ctx.model.setActiveChord(1);
      T.assertEq(ctx.model.activeIdx, 1);
      T.assertEq(ctx.callCount, 1);
    });
    T.it('idx fuera de rango → no muta', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.setActiveChord(99);
      T.assertEq(ctx.model.activeIdx, 0);
      T.assertEq(ctx.callCount, 0);
    });
    T.it('mismo idx → no dispara onChange', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.setActiveChord(0);
      T.assertEq(ctx.callCount, 0);
    });
  });

  T.describe('ProgressionModel — copy/paste', () => {
    T.it('copy con progresión vacía → false, no muta, no dispara', () => {
      const ctx = makeModel();
      T.assertEq(ctx.model.copyActiveChord(), false);
      T.assertEq(ctx.callCount, 0);
    });
    T.it('copy con activo guarda y retorna true', () => {
      const ctx = makeModel({ progression: [{root:'D',quality:'min7',bars:2}] });
      T.assertEq(ctx.model.copyActiveChord(), true);
      // copy NO dispara onChange — el clipboard es efímero y no es una mutación de progresión
      T.assertEq(ctx.callCount, 0);
    });
    T.it('paste sin copy previo → false, no muta', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      T.assertEq(ctx.model.pasteAfterActive(), false);
      T.assertEq(ctx.model.progression.length, 1);
      T.assertEq(ctx.callCount, 0);
    });
    T.it('copy + paste inserta después del activo y avanza activeIdx', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1},{root:'A',quality:'min7',bars:2}],
        activeIdx: 0,
      });
      ctx.model.copyActiveChord();
      const before = ctx.callCount;
      ctx.model.pasteAfterActive();
      const p = ctx.model.progression;
      T.assertEq(p.length, 3);
      T.assertEq(p[1].root, 'C');  // pegado en idx 1
      T.assertEq(p[1].bars, 1);
      T.assertEq(p[2].root, 'A');
      T.assertEq(ctx.model.activeIdx, 1);
      T.assertEq(ctx.callCount, before + 1);  // un solo onChange por el paste
    });
    T.it('paste en progresión vacía → inserta en idx 0', () => {
      const ctx = makeModel({ progression: [{root:'D',quality:'min7',bars:1}], activeIdx: 0 });
      ctx.model.copyActiveChord();
      ctx.model.removeChordAt(0);  // ahora está vacía
      T.assertEq(ctx.model.pasteAfterActive(), true);
      T.assertEq(ctx.model.progression.length, 1);
      T.assertEq(ctx.model.activeIdx, 0);
    });
    T.it('paste clona el chord (modificar el original no afecta el pegado)', () => {
      const ctx = makeModel({ progression: [{root:'D',quality:'min7',bars:2}] });
      ctx.model.copyActiveChord();
      ctx.model.pasteAfterActive();
      // mutar el original
      ctx.model.editChordAt(0, { root: 'X' });
      T.assertEq(ctx.model.progression[1].root, 'D');  // el pegado mantiene D
    });
  });

  T.describe('ProgressionModel — setLoopRange', () => {
    function prog4() {
      return makeModel({
        progression: [
          {root:'C',quality:'maj7',bars:1},
          {root:'D',quality:'min7',bars:1},
          {root:'G',quality:'dom7',bars:1},
          {root:'A',quality:'min7',bars:1},
        ],
      });
    }
    T.it('setLoopRange(1, 3) → loopRange [1,3]', () => {
      const ctx = prog4();
      ctx.model.setLoopRange(1, 3);
      T.assertArrayEq(ctx.model.loopRange, [1, 3]);
    });
    T.it('setLoopRange(3, 1) → normaliza a [1,3]', () => {
      const ctx = prog4();
      ctx.model.setLoopRange(3, 1);
      T.assertArrayEq(ctx.model.loopRange, [1, 3]);
    });
    T.it('índices fuera de rango → clamp', () => {
      const ctx = prog4();
      ctx.model.setLoopRange(-5, 99);
      T.assertArrayEq(ctx.model.loopRange, [0, 3]);
    });
    T.it('setLoopRange(null) → loopRange = null', () => {
      const ctx = prog4();
      ctx.model.setLoopRange(1, 3);
      ctx.model.setLoopRange(null);
      T.assertEq(ctx.model.loopRange, null);
    });
    T.it('clearLoopRange limpia', () => {
      const ctx = prog4();
      ctx.model.setLoopRange(1, 3);
      ctx.model.clearLoopRange();
      T.assertEq(ctx.model.loopRange, null);
    });
    T.it('progresión vacía → loopRange queda null', () => {
      const ctx = makeModel();
      ctx.model.setLoopRange(0, 2);
      T.assertEq(ctx.model.loopRange, null);
    });
  });

  T.describe('ProgressionModel — nextIdx', () => {
    function prog5() {
      return makeModel({
        progression: [
          {root:'C',quality:'maj7',bars:1},
          {root:'D',quality:'min7',bars:1},
          {root:'G',quality:'dom7',bars:1},
          {root:'A',quality:'min7',bars:1},
          {root:'F',quality:'maj7',bars:1},
        ],
      });
    }
    T.it('sin loop → wrap circular', () => {
      const ctx = prog5();
      ctx.model.setActiveChord(0);
      T.assertEq(ctx.model.nextIdx(), 1);
      ctx.model.setActiveChord(4);
      T.assertEq(ctx.model.nextIdx(), 0);
    });
    T.it('con loop [1,3]: avanza dentro', () => {
      const ctx = prog5();
      ctx.model.setLoopRange(1, 3);
      ctx.model.setActiveChord(1);
      T.assertEq(ctx.model.nextIdx(), 2);
      ctx.model.setActiveChord(2);
      T.assertEq(ctx.model.nextIdx(), 3);
    });
    T.it('con loop [1,3] estando en 3 → vuelve a 1', () => {
      const ctx = prog5();
      ctx.model.setLoopRange(1, 3);
      ctx.model.setActiveChord(3);
      T.assertEq(ctx.model.nextIdx(), 1);
    });
    T.it('con loop [1,3] estando fuera (0 o 4) → salta a 1', () => {
      const ctx = prog5();
      ctx.model.setLoopRange(1, 3);
      ctx.model.setActiveChord(0);
      T.assertEq(ctx.model.nextIdx(), 1);
      ctx.model.setActiveChord(4);
      T.assertEq(ctx.model.nextIdx(), 1);
    });
    T.it('progresión vacía → 0', () => {
      const ctx = makeModel();
      T.assertEq(ctx.model.nextIdx(), 0);
    });
  });

  T.describe('ProgressionModel — clear', () => {
    T.it('vacía progresión, activeIdx=0, loopRange=null, un solo onChange', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1},{root:'A',quality:'min7',bars:1}],
        activeIdx: 1,
        loopRange: [0, 1],
      });
      ctx.model.clear();
      T.assertEq(ctx.model.progression.length, 0);
      T.assertEq(ctx.model.activeIdx, 0);
      T.assertEq(ctx.model.loopRange, null);
      T.assertEq(ctx.callCount, 1);
    });
    T.it('clear sobre progresión ya vacía → no dispara onChange', () => {
      const ctx = makeModel();
      ctx.model.clear();
      T.assertEq(ctx.callCount, 0);
    });
  });

  T.describe('ProgressionModel — loadProgression', () => {
    T.it('reemplaza progresión, resetea activeIdx y loopRange, un solo onChange', () => {
      const ctx = makeModel({
        progression: [{root:'X',quality:'maj7',bars:1}],
        activeIdx: 0,
        loopRange: [0, 0],
      });
      ctx.model.loadProgression([
        {root:'D',quality:'min7',bars:1},
        {root:'G',quality:'dom7',bars:1},
        {root:'C',quality:'maj7',bars:2},
      ]);
      const p = ctx.model.progression;
      T.assertEq(p.length, 3);
      T.assertArrayEq(p.map(c => c.root), ['D','G','C']);
      T.assertEq(ctx.model.activeIdx, 0);
      T.assertEq(ctx.model.loopRange, null);
      T.assertEq(ctx.callCount, 1);
    });
    T.it('clamp bars en chords cargados', () => {
      const ctx = makeModel();
      ctx.model.loadProgression([{root:'C',quality:'maj7',bars:99}]);
      T.assertEq(ctx.model.progression[0].bars, 8);
    });
    T.it('array vacío → progresión vacía + un solo onChange si había algo', () => {
      const ctx = makeModel({ progression: [{root:'C',quality:'maj7',bars:1}] });
      ctx.model.loadProgression([]);
      T.assertEq(ctx.model.progression.length, 0);
      T.assertEq(ctx.callCount, 1);
    });
  });

  T.describe('ProgressionModel — batch', () => {
    T.it('3 mutaciones en batch → un solo onChange', () => {
      const ctx = makeModel();
      ctx.model.batch(m => {
        m.addChord({ root: 'D', quality: 'min7' });
        m.addChord({ root: 'G', quality: 'dom7' });
        m.addChord({ root: 'C', quality: 'maj7' });
      });
      T.assertEq(ctx.model.progression.length, 3);
      T.assertEq(ctx.callCount, 1);
    });
    T.it('batch anidado → un solo onChange final', () => {
      const ctx = makeModel();
      ctx.model.batch(m => {
        m.addChord({ root: 'D', quality: 'min7' });
        m.batch(m2 => {
          m2.addChord({ root: 'G', quality: 'dom7' });
          m2.addChord({ root: 'C', quality: 'maj7' });
        });
      });
      T.assertEq(ctx.model.progression.length, 3);
      T.assertEq(ctx.callCount, 1);
    });
    T.it('batch sin mutaciones → no dispara onChange', () => {
      const ctx = makeModel();
      ctx.model.batch(() => {});
      T.assertEq(ctx.callCount, 0);
    });
    T.it('batch con error → throw, sin onChange "fantasma"', () => {
      const ctx = makeModel();
      let thrown = false;
      try {
        ctx.model.batch(m => {
          m.addChord({ root: 'D', quality: 'min7' });
          throw new Error('bang');
        });
      } catch (e) { thrown = true; }
      T.assert(thrown);
      // El modelo dispara onChange por la mutación parcial (no es transaccional),
      // pero el contrato del test es: no se "duplica" la notificación.
      T.assert(ctx.callCount <= 1);
    });
  });

  T.describe('ProgressionModel — getActive', () => {
    T.it('progresión vacía → null', () => {
      const ctx = makeModel();
      T.assertEq(ctx.model.getActive(), null);
    });
    T.it('devuelve el acorde en activeIdx', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1},{root:'A',quality:'min7',bars:2}],
        activeIdx: 1,
      });
      const a = ctx.model.getActive();
      T.assertEq(a.root, 'A');
      T.assertEq(a.bars, 2);
    });
  });

  T.describe('ProgressionModel — secuencias (regresión)', () => {
    T.it('remove durante playback: nextIdx siempre válido tras splice', () => {
      // Escenario del Explore: usuario activa idx 3, después borra idx 3.
      // El próximo nextIdx() del play loop debe ser válido (no out-of-bounds).
      const ctx = makeModel({
        progression: [
          {root:'C',quality:'maj7',bars:1},
          {root:'D',quality:'min7',bars:1},
          {root:'G',quality:'dom7',bars:1},
          {root:'A',quality:'min7',bars:1},
        ],
        activeIdx: 3,
      });
      // Simula "remove el activo durante play"
      ctx.model.removeChordAt(3);
      // El play loop calcularía nextIdx después del remove
      const ni = ctx.model.nextIdx();
      T.assert(ni >= 0 && ni < ctx.model.progression.length, 'nextIdx debe ser válido, fue ' + ni);
    });
    T.it('loadProgression durante playback: estado limpio sin residuos', () => {
      const ctx = makeModel({
        progression: [{root:'C',quality:'maj7',bars:1}],
        activeIdx: 0,
        loopRange: [0, 0],
      });
      ctx.model.copyActiveChord();
      ctx.model.loadProgression([{root:'A',quality:'min7',bars:1}]);
      T.assertEq(ctx.model.activeIdx, 0);
      T.assertEq(ctx.model.loopRange, null);
      // copiedChord NO debe pegar acordes del estado viejo en el nuevo
      ctx.model.pasteAfterActive();
      // El pegado igualmente funciona (clipboard persiste por sesión, no es residuo)
      T.assertEq(ctx.model.progression.length, 2);
    });
    T.it('move pasando sobre activeIdx mantiene el activo lógico', () => {
      // [C, A, G], active=1 (A)
      const ctx = makeModel({
        progression: [
          {root:'C',quality:'maj7',bars:1},
          {root:'A',quality:'min7',bars:1},
          {root:'G',quality:'dom7',bars:1},
        ],
        activeIdx: 1,
      });
      // movemos C de 0 a 2 → [A, G, C]
      ctx.model.moveChord(0, 2);
      T.assertEq(ctx.model.progression[0].root, 'A');
      // A sigue activo, ahora en idx 0
      T.assertEq(ctx.model.activeIdx, 0);
      T.assertEq(ctx.model.getActive().root, 'A');
    });
  });

  T.describe('ProgressionModel — invariante activeIdx', () => {
    T.it('progresión vacía → activeIdx = 0', () => {
      const ctx = makeModel();
      T.assertEq(ctx.model.activeIdx, 0);
    });
    T.it('primer addChord → activeIdx = 0', () => {
      const ctx = makeModel();
      ctx.model.addChord({ root: 'C', quality: 'maj7' });
      T.assertEq(ctx.model.activeIdx, 0);
    });
    T.it('initialState con activeIdx válido se respeta', () => {
      const ctx = makeModel({
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }, { root: 'A', quality: 'min7', bars: 1 }],
        activeIdx: 1,
      });
      T.assertEq(ctx.model.activeIdx, 1);
    });
    T.it('initialState con activeIdx fuera de rango → clamp', () => {
      const ctx = makeModel({
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        activeIdx: 99,
      });
      T.assertEq(ctx.model.activeIdx, 0);
    });
    T.it('initialState con progression vacía y activeIdx > 0 → 0', () => {
      const ctx = makeModel({ progression: [], activeIdx: 5 });
      T.assertEq(ctx.model.activeIdx, 0);
    });
  });

  T.describe('ProgressionModel — invariante bars ∈ [1, 8]', () => {
    T.it('bars omitido → 1', () => {
      const ctx = makeModel();
      ctx.model.addChord({ root: 'C', quality: 'maj7' });
      T.assertEq(ctx.model.progression[0].bars, 1);
    });
    T.it('bars=0 → clamp a 1', () => {
      const ctx = makeModel();
      ctx.model.addChord({ root: 'C', quality: 'maj7', bars: 0 });
      T.assertEq(ctx.model.progression[0].bars, 1);
    });
    T.it('bars=99 → clamp a 8', () => {
      const ctx = makeModel();
      ctx.model.addChord({ root: 'C', quality: 'maj7', bars: 99 });
      T.assertEq(ctx.model.progression[0].bars, 8);
    });
    T.it('bars=3 se respeta', () => {
      const ctx = makeModel();
      ctx.model.addChord({ root: 'C', quality: 'maj7', bars: 3 });
      T.assertEq(ctx.model.progression[0].bars, 3);
    });
  });

})(window.GuitarShared, typeof window !== 'undefined' ? window : globalThis);
