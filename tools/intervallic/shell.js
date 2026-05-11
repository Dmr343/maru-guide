// SPA shell: tabs + controles globales sincronizados con iclState.
(function (G, W) {
  const S = G.iclState;
  const TABS = ['chord-id', 'diatonic-lab', 'shape-lab', 'progression', 'triads'];

  function $(id) { return document.getElementById(id); }

  function init() {
    // Tabs
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
        TABS.forEach(t => {
          const el = $('tab-' + t);
          if (el) el.classList.toggle('active', t === id);
        });
        W.IntervallicShell.dispatchTabChange(id);
      });
    });

    // Controles globales
    const st = S.get();
    $('g-root').value = st.key;
    $('g-mode').value = st.mode;
    $('g-pos').value = st.position.value;
    $('g-octave').value = String(st.octaveShift || 0);

    $('g-root').addEventListener('change', e => S.set({ key: e.target.value }));
    $('g-mode').addEventListener('change', e => S.set({ mode: e.target.value }));
    $('g-pos').addEventListener('change', e => S.set({ position: { type: 'standard', value: Number(e.target.value) } }));
    $('g-octave').addEventListener('change', e => S.set({ octaveShift: Number(e.target.value) }));

    S.subscribe('*', updateSummary);
    updateSummary();
  }

  function updateSummary() {
    const st = S.get();
    const sum = `${st.key} ${st.mode} · pos ${(st.position?.value ?? 0) + 1}${st.octaveShift ? ' +12' : ''}`;
    $('g-summary').textContent = sum;
  }

  function dispatchTabChange(id) {
    const handlers = {
      'chord-id': () => W.IntervallicChordId.onShow && W.IntervallicChordId.onShow(),
      'diatonic-lab': () => W.IntervallicDiatonicLab.onShow && W.IntervallicDiatonicLab.onShow(),
      'shape-lab': () => W.IntervallicShapeLab.onShow && W.IntervallicShapeLab.onShow(),
      'progression': () => W.IntervallicProgression.onShow && W.IntervallicProgression.onShow(),
      'triads': () => W.IntervallicTriadConvergence.onShow && W.IntervallicTriadConvergence.onShow(),
    };
    handlers[id] && handlers[id]();
  }

  W.IntervallicShell = { init, dispatchTabChange };
})(window.GuitarShared, window);
