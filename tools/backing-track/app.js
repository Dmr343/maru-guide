// ─────────────────────────────────────────────────────────────
// Backing Track — app (glue de UI)
//
// Crea el motor, arma un proyecto por defecto y cablea la UI:
// transporte, progresión (constructor de acordes reutilizando el
// ProgressionModel del Atlas), indicador de acorde, gestión de
// pistas y panel de edición de presets. La persistencia y el modo
// arreglo llegan en issues posteriores (#60, #62).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const BT = W.BackingTrack;
  const theory = W.GuitarShared && W.GuitarShared.theory;
  const ProgressionModel = W.ProgressionModel;

  const el = id => document.getElementById(id);
  const btnPlay = el('btn-play');
  const ctlTempo = el('ctl-tempo');
  const valTempo = el('val-tempo');
  const ctlVolume = el('ctl-volume');
  const valVolume = el('val-volume');
  const ctlLoop = el('ctl-loop');
  const statusEl = el('status');
  const chordStrip = el('chord-strip');
  const chordEditor = el('chord-editor');
  const progSelect = el('prog-select');
  const newRoot = el('new-root');
  const newQuality = el('new-quality');
  const btnAddChord = el('btn-add-chord');
  const btnClearProg = el('btn-clear-prog');
  const tracksEl = el('tracks');
  const addTipo = el('add-tipo');
  const btnAdd = el('btn-add');
  const presetEditorEl = el('preset-editor');
  const projName = el('proj-name');
  const btnSaveProj = el('btn-save-proj');
  const projSelect = el('proj-select');
  const btnLoadProj = el('btn-load-proj');
  const btnDelProj = el('btn-del-proj');
  const btnExport = el('btn-export');
  const btnImport = el('btn-import');
  const importFile = el('import-file');
  const modePractica = el('mode-practica');
  const modeArreglo = el('mode-arreglo');
  const arrangePanel = el('arrange-panel');
  const subdivSelect = el('subdiv-select');
  const beatMeter = el('beat-meter');
  const diagVoices = el('diag-voices');
  const nowChord = el('now-chord');
  const nextChord = el('next-chord');
  const configEl = el('config');
  const configToggle = el('config-toggle');

  const TIPO_LABEL = {
    bajo: 'Bajo', acordes: 'Acordes', bateria: 'Batería',
    percusion: 'Percusión', pad: 'Pad', lead: 'Lead',
  };
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };
  // Cuántas subdivisiones entran por compás de 4/4.
  const SUBDIV_COUNT = {
    redonda: 1, blanca: 2, negra: 4, corchea: 8, tresillo: 12, semicorchea: 16,
  };
  const MELODIC_TIPOS = ['bajo', 'acordes', 'pad', 'lead'];
  // Tipos polifónicos: comparten todos los presets entre sí (un sitar,
  // un pad o un lead se pueden usar en cualquier pista melódica).
  const POLY_TIPOS = ['acordes', 'lead', 'pad'];
  const QUALITIES = [
    { v: 'major', label: 'Mayor' },
    { v: 'minor', label: 'menor' },
    { v: 'dom7',  label: 'Dominante 7' },
    { v: 'maj7',  label: 'Mayor 7' },
    { v: 'min7',  label: 'menor 7' },
    { v: 'm7b5',  label: 'Semidisminuido (m7♭5)' },
  ];
  const ROOTS = (theory && theory.CHROMATIC) ||
    ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const OSC_TYPES = ['sine', 'triangle', 'sawtooth', 'square',
    'fatsawtooth', 'fattriangle', 'fatsquare', 'pulse'];
  const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];
  const EFFECTS = [
    { tipo: 'reverb', label: 'Reverb' },
    { tipo: 'distortion', label: 'Distorsión' },
    { tipo: 'chorus', label: 'Chorus' },
  ];

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  const engine = BT.createEngine();
  const storage = BT.createStorage();

  // ─── Modelo de progresión (reutilizado del Atlas) ───
  const model = new ProgressionModel({
    onChange: function () {
      // El acorde con foco es el punto de reinicio al editar en vivo.
      engine.setFocusChord(model.activeIdx);
      engine.loadProgression(model.progression);
      const lr = model.loopRange;
      engine.setLoopRange(lr ? lr[0] : null, lr ? lr[1] : null);
      renderChords();
      renderEditor();
      renderHeroChords(engine.getActiveChordIndex());
    },
  });

  // ─── Helpers de <select> ───
  function fillSelect(sel, items, valueKey, labelFn) {
    sel.innerHTML = '';
    items.forEach(it => {
      const opt = document.createElement('option');
      opt.value = valueKey ? it[valueKey] : it;
      opt.textContent = labelFn ? labelFn(it) : (valueKey ? it[valueKey] : it);
      sel.appendChild(opt);
    });
  }
  function mkBtn(cls, text, onClick) {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }
  // Crea un campo de formulario (select/input) con un name único —
  // los elementos sin id/name disparan un aviso de autofill del navegador.
  let _fldCount = 0;
  function fld(tag) {
    const e = document.createElement(tag);
    e.name = 'bt-' + tag + '-' + (++_fldCount);
    return e;
  }

  // Dropdown de preset de una pista, agrupado por origen: presets
  // sintetizados, presets con samples (requieren internet) y los del
  // usuario. Incluye "(editado)" si la pista tiene copia de trabajo.
  function makePresetSelect(track) {
    const sel = fld('select');
    sel.className = 'track-preset';
    const selId = track.customPreset ? '__custom' : track.presetId;

    function addOption(parent, id, nombre) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = nombre;
      if (id === selId) o.selected = true;
      parent.appendChild(o);
    }
    function addGroup(label, items) {
      if (!items.length) return;
      const g = document.createElement('optgroup');
      g.label = label;
      items.forEach(p => addOption(g, p.id, p.nombre));
      sel.appendChild(g);
    }

    if (track.customPreset) addOption(sel, '__custom', '(editado)');
    // Las pistas melódicas comparten el pool completo de presets;
    // bajo y batería/percusión usan solo los de su tipo.
    const pool = (POLY_TIPOS.indexOf(track.tipo) >= 0) ? POLY_TIPOS : [track.tipo];
    let fac = [], usr = [];
    pool.forEach(t => {
      fac = fac.concat(BT.factoryPresets.byTipo(t));
      usr = usr.concat(BT.userLibrary.byTipo(t));
    });
    const online = p => (p.motor === 'sampler' || p.motor === 'webaudiofont');
    addGroup('Sintetizados', fac.filter(p => !online(p)));
    addGroup('Reales (internet)', fac.filter(online));
    addGroup('Mis presets', usr);
    return sel;
  }

  function initProgSelect() {
    progSelect.innerHTML = '';
    const custom = document.createElement('option');
    custom.value = '';
    custom.textContent = '(personalizada)';
    progSelect.appendChild(custom);
    BT.factoryProgressions.PROGRESSIONS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre;
      progSelect.appendChild(opt);
    });
  }

  // ─── Proyecto por defecto ───
  function setupDefaultTracks() {
    engine.addTrack({ tipo: 'bajo' });
    engine.addTrack({ tipo: 'acordes' });
    engine.addTrack({ tipo: 'bateria' });
  }
  function loadDefaultProject() {
    const prog = BT.factoryProgressions.byId('blues12A');
    model.loadProgression(BT.factoryProgressions.chordsOf('blues12A'));
    engine.setTempo(prog ? prog.tempo : 100);
    progSelect.value = 'blues12A';
    setupDefaultTracks();
  }

  // ─── Tira de acordes ───
  function chordLabel(c) {
    if (theory && theory.chordName) return theory.chordName(c.root, c.quality);
    return c.root + (c.quality === 'major' ? '' : ' ' + c.quality);
  }
  // Shift+clic en un acorde marca / extiende / limpia el rango de loop
  // (mismo comportamiento que el Intervalic Atlas).
  function handleLoopClick(i) {
    const lr = model.loopRange;
    if (!lr) model.setLoopRange(i, i);
    else if (lr[0] === lr[1] && lr[0] !== i) model.setLoopRange(lr[0], i);
    else model.setLoopRange(null);
  }

  let dragChordSrc = null;   // índice del acorde que se está arrastrando

  function renderChords() {
    const prog = model.progression;
    const lr = model.loopRange;
    const lo = lr ? Math.min(lr[0], lr[1]) : -1;
    const hi = lr ? Math.max(lr[0], lr[1]) : -1;
    chordStrip.innerHTML = '';
    prog.forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = 'chord-chip' +
        (i === model.activeIdx ? ' selected' : '') +
        (lr && i >= lo && i <= hi ? ' in-loop' : '');
      chip.dataset.idx = String(i);
      chip.draggable = true;
      const name = document.createElement('span');
      name.textContent = chordLabel(c);
      const bars = document.createElement('span');
      bars.className = 'chip-bars';
      bars.textContent = '●'.repeat(c.bars);
      chip.appendChild(name);
      chip.appendChild(bars);
      chip.title = 'Clic: seleccionar · Shift+clic: marcar loop · arrastrar: reordenar';
      chip.addEventListener('click', (e) => {
        if (e.shiftKey) handleLoopClick(i);
        else model.setActiveChord(i);
      });
      // Reordenar por arrastre → model.moveChord(origen, destino).
      chip.addEventListener('dragstart', (e) => {
        dragChordSrc = i;
        chip.classList.add('dragging');
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        Array.prototype.forEach.call(chordStrip.children,
          ch => ch.classList.remove('drag-over'));
        dragChordSrc = null;
      });
      chip.addEventListener('dragover', (e) => {
        if (dragChordSrc === null) return;
        e.preventDefault();
        chip.classList.add('drag-over');
      });
      chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));
      chip.addEventListener('drop', (e) => {
        e.preventDefault();
        chip.classList.remove('drag-over');
        if (dragChordSrc !== null && dragChordSrc !== i) {
          model.moveChord(dragChordSrc, i);
        }
      });
      chordStrip.appendChild(chip);
    });
  }
  // Indicador del acorde sonando (callback de engine.onChordChange) +
  // actualización del acorde actual/siguiente del panel de toque.
  function highlightChord(idx) {
    Array.prototype.forEach.call(chordStrip.children, chip => {
      chip.classList.toggle('active', Number(chip.dataset.idx) === idx);
    });
    renderHeroChords(idx);
  }
  // Acorde grande "actual" + "siguiente" del panel de toque.
  function renderHeroChords(idx) {
    const prog = model.progression;
    if (!prog.length) {
      nowChord.textContent = '—';
      nextChord.textContent = '—';
      return;
    }
    const cur = (idx != null && idx >= 0) ? idx : (model.activeIdx || 0);
    nowChord.textContent = chordLabel(prog[cur % prog.length]);
    nextChord.textContent = chordLabel(prog[(cur + 1) % prog.length]);
  }

  // ─── Indicador de compás (metrónomo) ───
  // Agrupa los puntos en los 4 pulsos del compás de 4/4: cada grupo
  // tiene las subdivisiones de ese pulso.
  function buildBeatMeter(count) {
    beatMeter.innerHTML = '';
    const groups = (count >= 4 && count % 4 === 0) ? 4 : 1;
    const perGroup = count / groups;
    for (let g = 0; g < groups; g++) {
      const grp = document.createElement('div');
      grp.className = 'beat-group';
      for (let j = 0; j < perGroup; j++) {
        const globalIdx = g * perGroup + j;
        const isBeat = (groups === 1) || (j === 0);
        const dot = document.createElement('div');
        dot.className = 'beat-dot' +
          (globalIdx === 0 ? ' downbeat' : '') +
          (isBeat ? '' : ' sub');
        dot.textContent = isBeat
          ? String(groups === 1 ? globalIdx + 1 : g + 1) : '';
        grp.appendChild(dot);
      }
      beatMeter.appendChild(grp);
    }
  }
  // Recibe el 'tick' del motor (o null al detenerse): enciende el punto
  // de la subdivisión actual.
  function updateBarIndicator(tick) {
    let dots = beatMeter.querySelectorAll('.beat-dot');
    if (!tick) {
      dots.forEach(d => d.classList.remove('on'));
      return;
    }
    if (dots.length !== tick.count) {
      buildBeatMeter(tick.count);
      dots = beatMeter.querySelectorAll('.beat-dot');
    }
    dots.forEach((d, i) => d.classList.toggle('on', i === tick.index));
  }

  // ─── Editor del acorde activo ───
  function renderEditor() {
    const chord = model.getActive();
    if (!chord) { chordEditor.hidden = true; chordEditor.innerHTML = ''; return; }
    chordEditor.hidden = false;
    chordEditor.innerHTML = '';
    const idx = model.activeIdx;

    const lbl = document.createElement('span');
    lbl.className = 'editor-label';
    lbl.textContent = 'Editar acorde ' + (idx + 1) + ':';
    chordEditor.appendChild(lbl);

    const rootSel = fld('select');
    fillSelect(rootSel, ROOTS);
    rootSel.value = chord.root;
    rootSel.addEventListener('change',
      () => model.editChordAt(idx, { root: rootSel.value }));
    chordEditor.appendChild(rootSel);

    const qSel = fld('select');
    fillSelect(qSel, QUALITIES, 'v', it => it.label);
    qSel.value = chord.quality;
    qSel.addEventListener('change',
      () => model.editChordAt(idx, { quality: qSel.value }));
    chordEditor.appendChild(qSel);

    const barsLbl = document.createElement('span');
    barsLbl.className = 'editor-label';
    barsLbl.textContent = 'Compases';
    chordEditor.appendChild(barsLbl);

    const stepper = document.createElement('div');
    stepper.className = 'bars-stepper';
    stepper.appendChild(mkBtn('track-btn', '−', () => model.changeActiveBars(-1)));
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = String(chord.bars);
    stepper.appendChild(val);
    stepper.appendChild(mkBtn('track-btn', '+', () => model.changeActiveBars(1)));
    chordEditor.appendChild(stepper);

    // El reordenamiento de acordes se hace arrastrando los chips.
    const rm = mkBtn('track-btn danger', '✕', () => model.removeChordAt(idx));
    rm.title = 'Quitar acorde';
    chordEditor.appendChild(rm);
  }

  // ─── Gestión de pistas ───
  function makeSelect(cls, options, selectedId) {
    const sel = fld('select');
    sel.className = cls;
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.nombre;
      if (o.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  let dragTrackSrc = null;   // id de la pista que se está arrastrando

  // Mueve una pista al índice destino usando engine.moveTrack (±1) en
  // bucle — así el reordenamiento por arrastre no requiere tocar engine.js.
  function moveTrackTo(id, destIdx) {
    const tracks = engine.getTracks();
    const from = tracks.findIndex(t => t.id === id);
    if (from < 0) return;
    destIdx = Math.max(0, Math.min(destIdx, tracks.length - 1));
    const dir = destIdx > from ? 1 : -1;
    let steps = Math.abs(destIdx - from);
    while (steps-- > 0) engine.moveTrack(id, dir);
  }

  function makeTrackRow(track) {
    const row = document.createElement('div');
    row.className = 'track ' + (track.enabled ? 'enabled' : 'disabled');
    row.dataset.id = track.id;

    // Asa de arrastre para reordenar. draggable se activa solo al tomar
    // el asa, para no interferir con los sliders/selects de la fila.
    const handle = document.createElement('span');
    handle.className = 'track-drag';
    handle.textContent = '⠿';
    handle.title = 'Arrastrar para reordenar';
    handle.addEventListener('mousedown', () => { row.draggable = true; });
    row.addEventListener('dragstart', (e) => {
      dragTrackSrc = track.id;
      row.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('dragging');
      Array.prototype.forEach.call(tracksEl.children,
        r => r.classList.remove('drag-over'));
      dragTrackSrc = null;
    });
    row.addEventListener('dragover', (e) => {
      if (dragTrackSrc === null) return;
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (dragTrackSrc === null || dragTrackSrc === track.id) return;
      const dest = engine.getTracks().findIndex(t => t.id === track.id);
      if (dest >= 0) { moveTrackTo(dragTrackSrc, dest); refreshTracks(); }
    });
    row.appendChild(handle);

    const mute = document.createElement('button');
    mute.className = 'track-mute';
    mute.title = 'Silenciar / activar';
    mute.textContent = '♪';
    mute.addEventListener('click', () => {
      const enabled = !engine.getTracks().find(t => t.id === track.id).enabled;
      engine.updateTrack(track.id, { enabled: enabled });
      row.classList.toggle('enabled', enabled);
      row.classList.toggle('disabled', !enabled);
    });
    row.appendChild(mute);

    const tipo = document.createElement('span');
    tipo.className = 'track-tipo';
    tipo.textContent = TIPO_LABEL[track.tipo] || track.tipo;
    row.appendChild(tipo);

    // Preset, agrupado por origen (synth / samples / usuario).
    const presetSel = makePresetSelect(track);
    presetSel.addEventListener('change', () => {
      if (presetSel.value === '__custom') return;
      engine.updateTrack(track.id, { presetId: presetSel.value });
      if (editing && editing.trackId === track.id) closeEditor();
      refreshTracks();
    });
    row.appendChild(presetSel);

    const ptipo = PATTERN_TIPO[track.tipo];
    if (ptipo) {
      const pats = BT.factoryPatterns.byTipo(ptipo);
      const patSel = makeSelect('track-pattern', pats, track.patternId);
      patSel.addEventListener('change',
        () => engine.updateTrack(track.id, { patternId: patSel.value }));
      row.appendChild(patSel);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'track-pattern';
      spacer.style.opacity = '0.4';
      spacer.textContent = '(sostenido)';
      row.appendChild(spacer);
    }

    const vol = fld('input');
    vol.type = 'range';
    vol.className = 'track-vol';
    vol.min = '0'; vol.max = '100'; vol.step = '1';
    vol.value = String(Math.round((track.volumen != null ? track.volumen : 0.8) * 100));
    vol.title = 'Volumen de la pista';
    vol.addEventListener('input',
      () => engine.updateTrack(track.id, { volumen: Number(vol.value) / 100 }));
    row.appendChild(vol);

    // Editar sonido (solo pistas melódicas).
    if (MELODIC_TIPOS.indexOf(track.tipo) >= 0) {
      const gear = mkBtn('track-btn', '⚙', () => openEditor(track.id));
      gear.title = 'Editar sonido';
      row.appendChild(gear);
    }

    const rm = mkBtn('track-btn danger', '✕', () => {
      engine.removeTrack(track.id);
      if (editing && editing.trackId === track.id) closeEditor();
      refreshTracks();
    });
    rm.title = 'Quitar pista';
    row.appendChild(rm);

    return row;
  }

  function renderTracks() {
    const tracks = engine.getTracks();
    tracksEl.innerHTML = '';
    if (!tracks.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'Sin pistas. Agregá un instrumento para empezar.';
      tracksEl.appendChild(hint);
      return;
    }
    tracks.forEach(track => tracksEl.appendChild(makeTrackRow(track)));
  }

  // ─── Panel de edición de presets (niveles 2 y 3) ───
  let editing = null;   // { trackId, preset }

  function blankPreset(tipo) {
    return {
      id: 'desde-cero', nombre: 'Nuevo sonido', tipo: tipo, motor: 'synth',
      config: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
        filter: { type: 'lowpass', Q: 1 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.3,
          baseFrequency: 200, octaves: 3 },
      },
      efectos: [],
    };
  }

  function openEditor(trackId) {
    const preset = engine.getTrackPreset(trackId);
    if (!preset) return;
    if (!preset.config) preset.config = blankPreset('acordes').config;
    editing = { trackId: trackId, preset: preset };
    renderPresetEditor();
  }
  function closeEditor() {
    editing = null;
    presetEditorEl.hidden = true;
    presetEditorEl.innerHTML = '';
  }

  // Aplica la copia de trabajo al motor (preview en vivo).
  function applyEditing() {
    if (editing) engine.applyTrackPreset(editing.trackId, editing.preset);
  }

  function peParamRow(labelText, min, max, step, value, fmt, onInput) {
    const row = document.createElement('div');
    row.className = 'pe-row';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    const range = fld('input');
    range.type = 'range';
    range.min = String(min); range.max = String(max); range.step = String(step);
    range.value = String(value);
    const valEl = document.createElement('span');
    valEl.className = 'pe-val';
    valEl.textContent = fmt(value);
    range.addEventListener('input', () => {
      const v = Number(range.value);
      valEl.textContent = fmt(v);
      onInput(v);
      applyEditing();
    });
    row.appendChild(lbl); row.appendChild(range); row.appendChild(valEl);
    return row;
  }

  function peSelectRow(labelText, options, value, onChange) {
    const row = document.createElement('div');
    row.className = 'pe-row';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    const sel = fld('select');
    fillSelect(sel, options);
    sel.value = value;
    sel.addEventListener('change', () => { onChange(sel.value); applyEditing(); });
    row.appendChild(lbl); row.appendChild(sel);
    return row;
  }

  function peGroupLabel(text) {
    const d = document.createElement('div');
    d.className = 'pe-group-label';
    d.textContent = text;
    return d;
  }

  function renderPresetEditor() {
    if (!editing) { closeEditor(); return; }
    const track = engine.getTracks().find(t => t.id === editing.trackId);
    if (!track) { closeEditor(); return; }
    const cfg = editing.preset.config;
    const env = cfg.envelope || (cfg.envelope = {});
    presetEditorEl.hidden = false;
    presetEditorEl.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'pe-title';
    title.textContent = 'Editar sonido — ' + (TIPO_LABEL[track.tipo] || track.tipo);
    presetEditorEl.appendChild(title);
    const sub = document.createElement('div');
    sub.className = 'pe-sub';
    sub.textContent = 'Base: ' + (editing.preset.nombre || '—') +
      '. Los cambios afectan solo a esta pista hasta que guardes.';
    presetEditorEl.appendChild(sub);

    // Oscilador
    presetEditorEl.appendChild(peGroupLabel('Oscilador'));
    presetEditorEl.appendChild(peSelectRow('Forma de onda', OSC_TYPES,
      (cfg.oscillator && cfg.oscillator.type) || 'sine', v => {
        cfg.oscillator = { type: v };
      }));

    // Envolvente ADSR
    presetEditorEl.appendChild(peGroupLabel('Envolvente (ADSR)'));
    const secs = v => v.toFixed(2) + ' s';
    presetEditorEl.appendChild(peParamRow('Attack', 0, 2, 0.01,
      env.attack != null ? env.attack : 0.01, secs, v => { env.attack = v; }));
    presetEditorEl.appendChild(peParamRow('Decay', 0, 2, 0.01,
      env.decay != null ? env.decay : 0.2, secs, v => { env.decay = v; }));
    presetEditorEl.appendChild(peParamRow('Sustain', 0, 1, 0.01,
      env.sustain != null ? env.sustain : 0.5,
      v => Math.round(v * 100) + '%', v => { env.sustain = v; }));
    presetEditorEl.appendChild(peParamRow('Release', 0, 4, 0.01,
      env.release != null ? env.release : 0.3, secs, v => { env.release = v; }));

    // Filtro (solo el bajo es MonoSynth con filtro propio)
    if (track.tipo === 'bajo') {
      const filt = cfg.filter || (cfg.filter = { type: 'lowpass', Q: 1 });
      const fenv = cfg.filterEnvelope || (cfg.filterEnvelope = {});
      presetEditorEl.appendChild(peGroupLabel('Filtro'));
      presetEditorEl.appendChild(peSelectRow('Tipo', FILTER_TYPES,
        filt.type || 'lowpass', v => { filt.type = v; }));
      presetEditorEl.appendChild(peParamRow('Resonancia (Q)', 0, 12, 0.1,
        filt.Q != null ? filt.Q : 1, v => v.toFixed(1), v => { filt.Q = v; }));
      presetEditorEl.appendChild(peParamRow('Frecuencia base', 40, 1200, 10,
        fenv.baseFrequency != null ? fenv.baseFrequency : 200,
        v => Math.round(v) + ' Hz', v => { fenv.baseFrequency = v; }));
      presetEditorEl.appendChild(peParamRow('Octavas', 0, 6, 0.1,
        fenv.octaves != null ? fenv.octaves : 3, v => v.toFixed(1),
        v => { fenv.octaves = v; }));
    }

    // Efectos
    presetEditorEl.appendChild(peGroupLabel('Efectos'));
    EFFECTS.forEach(fx => {
      const current = (editing.preset.efectos || []).find(e => e.tipo === fx.tipo);
      const row = document.createElement('div');
      row.className = 'pe-row';
      const chk = fld('input');
      chk.type = 'checkbox';
      chk.checked = !!current;
      const lbl = document.createElement('label');
      lbl.textContent = fx.label;
      lbl.style.minWidth = '80px';
      const range = fld('input');
      range.type = 'range';
      range.min = '0'; range.max = '1'; range.step = '0.01';
      range.value = String(current ? current.cantidad : 0.3);
      range.disabled = !current;
      const valEl = document.createElement('span');
      valEl.className = 'pe-val';
      valEl.textContent = Math.round(Number(range.value) * 100) + '%';

      function rebuildEffects() {
        const list = [];
        Array.prototype.forEach.call(presetEditorEl.querySelectorAll('.pe-fx'), fxRow => {
          if (fxRow.dataset.on === '1') {
            list.push({ tipo: fxRow.dataset.tipo, cantidad: Number(fxRow.dataset.amt) });
          }
        });
        editing.preset.efectos = list;
        applyEditing();
      }
      row.className = 'pe-row pe-fx';
      row.dataset.tipo = fx.tipo;
      row.dataset.on = current ? '1' : '0';
      row.dataset.amt = String(current ? current.cantidad : 0.3);

      chk.addEventListener('change', () => {
        row.dataset.on = chk.checked ? '1' : '0';
        range.disabled = !chk.checked;
        rebuildEffects();
      });
      range.addEventListener('input', () => {
        row.dataset.amt = range.value;
        valEl.textContent = Math.round(Number(range.value) * 100) + '%';
        rebuildEffects();
      });

      row.appendChild(chk);
      row.appendChild(lbl);
      row.appendChild(range);
      row.appendChild(valEl);
      presetEditorEl.appendChild(row);
    });

    // Acciones: diseñar desde cero / guardar / cerrar
    const actions = document.createElement('div');
    actions.className = 'pe-actions';

    const scratch = mkBtn('btn btn-secondary', 'Desde cero', () => {
      editing.preset = blankPreset(track.tipo);
      applyEditing();
      renderPresetEditor();
    });
    actions.appendChild(scratch);

    const nameInput = fld('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nombre del preset';
    nameInput.value = '';
    actions.appendChild(nameInput);

    const save = mkBtn('btn btn-primary', 'Guardar como nuevo', () => {
      const nombre = nameInput.value.trim() || 'Mi sonido';
      const toSave = JSON.parse(JSON.stringify(editing.preset));
      toSave.nombre = nombre;
      toSave.tipo = track.tipo;
      const newId = BT.userLibrary.add(toSave);
      // La pista pasa a referenciar el preset guardado (deja de ser "editado").
      engine.updateTrack(editing.trackId, { presetId: newId });
      closeEditor();
      refreshTracks();
    });
    actions.appendChild(save);

    actions.appendChild(mkBtn('btn btn-secondary', 'Cerrar', closeEditor));
    presetEditorEl.appendChild(actions);
  }

  // ─── Modo arreglo ───
  const LANE_LABEL = {
    main: 'Notas', kick: 'Bombo', snare: 'Caja', hat: 'Hi-hat',
    cymbal: 'Platillo', bongo_hi: 'Bongó ↑', bongo_lo: 'Bongó ↓',
    conga: 'Conga', shaker: 'Shaker',
  };
  const VOICING_OPTS = [
    { id: 'close', nombre: 'Cerrado' },
    { id: 'open', nombre: 'Abierto (drop-2)' },
  ];
  const INVERSION_OPTS = [
    { id: '0', nombre: 'Fundamental' }, { id: '1', nombre: '1ª inversión' },
    { id: '2', nombre: '2ª inversión' }, { id: '3', nombre: '3ª inversión' },
  ];
  let hideIndicator = false;

  function cycleCell(pattern, lane, step) {
    const SG = BT.stepGrid;
    const hit = SG.hitAt(pattern, lane, step);
    if (!hit) return SG.setVelocity(pattern, lane, step, 0.4);
    if (hit.velocity < 0.55) return SG.setVelocity(pattern, lane, step, 0.7);
    if (hit.velocity < 0.85) return SG.setVelocity(pattern, lane, step, 1.0);
    return SG.toggle(pattern, lane, step);   // 1.0 → apagado
  }
  function cellClass(hit) {
    if (!hit) return '';
    if (hit.velocity < 0.55) return 'v1';
    if (hit.velocity < 0.85) return 'v2';
    return 'v3';
  }

  function makeStepGrid(track) {
    const SG = BT.stepGrid;
    const pattern = engine.getTrackPattern(track.id);
    const wrap = document.createElement('div');
    if (!pattern) {
      const note = document.createElement('div');
      note.className = 'empty-hint';
      note.textContent = '(acorde sostenido — sin patrón rítmico)';
      wrap.appendChild(note);
      return wrap;
    }
    pattern.lanes.forEach(lane => {
      const laneRow = document.createElement('div');
      laneRow.className = 'seq-lane';
      const label = document.createElement('span');
      label.className = 'seq-lane-label';
      label.textContent = LANE_LABEL[lane] || lane;
      laneRow.appendChild(label);
      const cells = document.createElement('div');
      cells.className = 'seq-cells';
      for (let s = 0; s < pattern.steps; s++) {
        const hit = SG.hitAt(pattern, lane, s);
        const cell = document.createElement('button');
        cell.className = 'seq-cell ' + cellClass(hit) +
          (s % 4 === 0 ? ' beat' : '');
        cell.addEventListener('click', function () {
          const fresh = engine.getTrackPattern(track.id);
          engine.setTrackPattern(track.id, cycleCell(fresh, lane, s));
          renderArrange();
        });
        cells.appendChild(cell);
      }
      laneRow.appendChild(cells);
      wrap.appendChild(laneRow);
    });
    return wrap;
  }

  function makeArrangeTrack(track) {
    const block = document.createElement('div');
    block.className = 'arrange-track';

    const head = document.createElement('div');
    head.className = 'arrange-track-head';
    const name = document.createElement('span');
    name.className = 'track-tipo';
    name.textContent = TIPO_LABEL[track.tipo] || track.tipo;
    head.appendChild(name);

    // Variante A / B del patrón.
    if (PATTERN_TIPO[track.tipo]) {
      const vt = document.createElement('div');
      vt.className = 'variant-toggle';
      ['A', 'B'].forEach(v => {
        const b = document.createElement('button');
        b.className = 'variant-btn' +
          ((track.variant || 'A') === v ? ' active' : '');
        b.textContent = v;
        b.addEventListener('click', function () {
          engine.setTrackVariant(track.id, v);
          renderArrange();
        });
        vt.appendChild(b);
      });
      head.appendChild(vt);
    }

    // Voicings (acordes / lead / pad) u octava (bajo).
    if (track.tipo === 'bajo') {
      head.appendChild(makeArrangeSelect(
        [{ id: '1', nombre: 'Oct. 1' }, { id: '2', nombre: 'Oct. 2' },
         { id: '3', nombre: 'Oct. 3' }],
        String(track.octave != null ? track.octave : 2),
        v => engine.updateTrack(track.id, { octave: Number(v) })));
    } else if (['acordes', 'lead', 'pad'].indexOf(track.tipo) >= 0) {
      head.appendChild(makeArrangeSelect(VOICING_OPTS,
        track.voicing || 'close',
        v => engine.updateTrack(track.id, { voicing: v })));
      head.appendChild(makeArrangeSelect(INVERSION_OPTS,
        String(track.inversion || 0),
        v => engine.updateTrack(track.id, { inversion: Number(v) })));
      head.appendChild(makeArrangeSelect(
        [{ id: '2', nombre: 'Oct. 2' }, { id: '3', nombre: 'Oct. 3' },
         { id: '4', nombre: 'Oct. 4' }],
        String(track.octave != null ? track.octave : 3),
        v => engine.updateTrack(track.id, { octave: Number(v) })));
    }

    block.appendChild(head);
    block.appendChild(makeStepGrid(track));
    return block;
  }

  function makeArrangeSelect(options, value, onChange) {
    const sel = fld('select');
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.nombre;
      if (o.id === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  function renderArrange() {
    const isArreglo = engine.getMode() === 'arreglo';
    modePractica.classList.toggle('active', !isArreglo);
    modeArreglo.classList.toggle('active', isArreglo);
    arrangePanel.hidden = !isArreglo;
    chordStrip.classList.toggle('hidden-indicator', isArreglo && hideIndicator);
    if (!isArreglo) return;

    arrangePanel.innerHTML = '';

    // Groove de estilo — aplica patrones + tempo a todas las pistas.
    const grLabel0 = document.createElement('div');
    grLabel0.className = 'section-label';
    grLabel0.textContent = 'Groove de estilo';
    arrangePanel.appendChild(grLabel0);
    const grRow = document.createElement('div');
    grRow.className = 'control-row';
    const grCap = document.createElement('label');
    grCap.textContent = 'Aplicar';
    const grSel = fld('select');
    const grPlaceholder = document.createElement('option');
    grPlaceholder.value = '';
    grPlaceholder.textContent = '(elegir un groove…)';
    grSel.appendChild(grPlaceholder);
    (BT.factoryGrooves ? BT.factoryGrooves.GROOVES : []).forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.nombre;
      grSel.appendChild(opt);
    });
    grSel.addEventListener('change', function () {
      if (grSel.value) applyGroove(grSel.value);
      // Es una acción, no un estado: vuelve al placeholder.
      grSel.value = '';
    });
    grRow.appendChild(grCap);
    grRow.appendChild(grSel);
    arrangePanel.appendChild(grRow);

    // Humanización (intensidad global).
    const humLabel = document.createElement('div');
    humLabel.className = 'section-label';
    humLabel.textContent = 'Humanización';
    arrangePanel.appendChild(humLabel);
    const humRow = document.createElement('div');
    humRow.className = 'control-row';
    const humCap = document.createElement('label');
    humCap.textContent = 'Intensidad';
    const humSlider = fld('input');
    humSlider.type = 'range';
    humSlider.min = '0'; humSlider.max = '100'; humSlider.step = '1';
    humSlider.value = String(Math.round(engine.getHumanize() * 100));
    const humVal = document.createElement('span');
    humVal.className = 'value';
    humVal.textContent = humSlider.value + '%';
    humSlider.addEventListener('input', function () {
      engine.setHumanize(Number(humSlider.value) / 100);
      humVal.textContent = humSlider.value + '%';
    });
    humRow.appendChild(humCap);
    humRow.appendChild(humSlider);
    humRow.appendChild(humVal);
    arrangePanel.appendChild(humRow);

    // Ocultar indicador de acorde (entrenamiento de oído).
    const hideRow = document.createElement('div');
    hideRow.className = 'control-row';
    const hideCap = document.createElement('label');
    hideCap.textContent = 'Ocultar acorde';
    const hideChk = fld('input');
    hideChk.type = 'checkbox';
    hideChk.checked = hideIndicator;
    hideChk.addEventListener('change', function () {
      hideIndicator = hideChk.checked;
      chordStrip.classList.toggle('hidden-indicator', hideIndicator);
    });
    hideRow.appendChild(hideCap);
    hideRow.appendChild(hideChk);
    const sp = document.createElement('span');
    sp.style.flex = '1';
    hideRow.appendChild(sp);
    arrangePanel.appendChild(hideRow);

    // Grooves y voicings por pista.
    const grLabel = document.createElement('div');
    grLabel.className = 'section-label';
    grLabel.textContent = 'Groove y voicings por pista';
    arrangePanel.appendChild(grLabel);
    const tracks = engine.getTracks();
    if (!tracks.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'Agregá pistas para editar sus grooves.';
      arrangePanel.appendChild(hint);
    } else {
      tracks.forEach(t => arrangePanel.appendChild(makeArrangeTrack(t)));
    }
  }

  function refreshTracks() {
    renderTracks();
    renderArrange();
  }

  // Aplica un groove de estilo: pone el patrón que le corresponde a
  // cada pista y el tempo sugerido, de un solo paso.
  function applyGroove(grooveId) {
    const groove = BT.factoryGrooves && BT.factoryGrooves.byId(grooveId);
    if (!groove) return;
    engine.getTracks().forEach(track => {
      const pt = PATTERN_TIPO[track.tipo];
      const pid = pt && groove.patterns[pt];
      if (pid) engine.updateTrack(track.id, { patternId: pid });
    });
    if (groove.tempo) engine.setTempo(groove.tempo);
    syncControls();
    refreshTracks();
  }

  // ─── Proyectos y persistencia ───
  function restoreSnapshot(snap) {
    if (!snap) return;
    if (editing) closeEditor();
    engine.restore(snap);
    model.loadProgression(snap.progression || []);
    // loadProgression resetea el loop; reponemos el rango guardado.
    if (Array.isArray(snap.loopRange)) {
      model.setLoopRange(snap.loopRange[0], snap.loopRange[1]);
    }
    syncControls();
    refreshTracks();
  }

  function refreshProjects() {
    const list = storage.listProjects();
    projSelect.innerHTML = '';
    if (!list.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(sin proyectos guardados)';
      projSelect.appendChild(opt);
      return;
    }
    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre;
      projSelect.appendChild(opt);
    });
  }

  function downloadJSON(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── Sincronizar controles de transporte ───
  function syncControls() {
    ctlTempo.value = String(engine.getTempo());
    valTempo.textContent = engine.getTempo() + ' BPM';
    const vol = Math.round(engine.getMasterVolume() * 100);
    ctlVolume.value = String(vol);
    valVolume.textContent = vol + '%';
    ctlLoop.checked = engine.getLoop();
  }

  // ─── Transporte: botón único Play / Detener ───
  function setConfigCollapsed(collapsed) {
    configEl.classList.toggle('collapsed', collapsed);
    configToggle.setAttribute('aria-expanded', String(!collapsed));
  }
  // Refleja el estado de reproducción en la UI (lo dispara onTransport).
  function setPlayUI(playing) {
    btnPlay.textContent = playing ? '■  Detener' : '▶  Play';
    btnPlay.classList.toggle('is-playing', playing);
    document.body.classList.toggle('playing', playing);   // agranda el panel
    setConfigCollapsed(playing);   // la configuración se pliega al tocar
    if (playing) setStatus('Sonando — ' + engine.getMode(), 'playing');
    else setStatus('Detenido');
  }

  btnPlay.addEventListener('click', async function () {
    if (engine.isPlaying()) { engine.stop(); return; }
    try {
      await engine.play();
    } catch (err) {
      setStatus('Error al iniciar el audio: ' + err.message, 'error');
    }
  });

  configToggle.addEventListener('click', function () {
    setConfigCollapsed(!configEl.classList.contains('collapsed'));
  });

  ctlTempo.addEventListener('input', function () {
    engine.setTempo(Number(ctlTempo.value));
    valTempo.textContent = engine.getTempo() + ' BPM';
  });

  ctlVolume.addEventListener('input', function () {
    const v = Number(ctlVolume.value);
    engine.setMasterVolume(v / 100);
    valVolume.textContent = v + '%';
  });

  ctlLoop.addEventListener('change', () => engine.setLoop(ctlLoop.checked));

  subdivSelect.addEventListener('change', function () {
    engine.setSubdivision(subdivSelect.value);
    buildBeatMeter(SUBDIV_COUNT[subdivSelect.value] || 4);
  });

  // Teclado: navegar acordes con ←→, ajustar compases con ↑↓, Esc detiene.
  function navChord(dir) {
    const n = model.progression.length;
    if (!n) return;
    model.setActiveChord((model.activeIdx + dir + n) % n);
  }
  document.addEventListener('keydown', function (e) {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'Escape': if (engine.isPlaying()) engine.stop(); break;
      case 'ArrowLeft':  navChord(-1); e.preventDefault(); break;
      case 'ArrowRight': navChord(1);  e.preventDefault(); break;
      case 'ArrowUp':    model.changeActiveBars(1);  e.preventDefault(); break;
      case 'ArrowDown':  model.changeActiveBars(-1); e.preventDefault(); break;
    }
  });

  progSelect.addEventListener('change', function () {
    const id = progSelect.value;
    if (!id) return;
    const prog = BT.factoryProgressions.byId(id);
    if (!prog) return;
    model.loadProgression(BT.factoryProgressions.chordsOf(id));
    engine.setTempo(prog.tempo || engine.getTempo());
    syncControls();
  });

  btnAddChord.addEventListener('click', function () {
    model.addChord({ root: newRoot.value, quality: newQuality.value, bars: 1 });
    model.setActiveChord(model.progression.length - 1);
    progSelect.value = '';
  });
  btnClearProg.addEventListener('click', function () {
    model.clear();
    progSelect.value = '';
  });

  btnAdd.addEventListener('click', function () {
    engine.addTrack({ tipo: addTipo.value });
    refreshTracks();
  });

  // Toggle de modo práctica / arreglo.
  modePractica.addEventListener('click', function () {
    engine.setMode('practica');
    renderArrange();
  });
  modeArreglo.addEventListener('click', function () {
    engine.setMode('arreglo');
    renderArrange();
  });

  // Proyectos
  btnSaveProj.addEventListener('click', function () {
    const nombre = projName.value.trim() || 'Proyecto';
    storage.saveProject(nombre, engine.snapshot());
    refreshProjects();
    projSelect.value = '';
    setStatus('Proyecto "' + nombre + '" guardado');
  });
  btnLoadProj.addEventListener('click', function () {
    const id = projSelect.value;
    if (!id) return;
    const snap = storage.loadProject(id);
    if (snap) { restoreSnapshot(snap); setStatus('Proyecto cargado'); }
  });
  btnDelProj.addEventListener('click', function () {
    const id = projSelect.value;
    if (!id) return;
    storage.deleteProject(id);
    refreshProjects();
  });

  // Exportar / importar
  btnExport.addEventListener('click', function () {
    downloadJSON('backing-track-respaldo.json', storage.exportAll());
  });
  btnImport.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', function () {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      const ok = storage.importAll(String(reader.result));
      if (ok) {
        refreshProjects();
        refreshTracks();
        setStatus('Librería y proyectos importados');
      } else {
        setStatus('Archivo JSON inválido', 'error');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  engine.onChordChange(highlightChord);
  engine.onTick(updateBarIndicator);
  // Diagnóstico: muestra cuántas voces suenan y el máximo de la
  // sesión. Si el máximo trepa sin parar loop tras loop, hay
  // acumulación; si se estabiliza, está sano.
  let voiceMax = 0;
  engine.onTick(function (tick) {
    if (!tick) { diagVoices.textContent = 'Voces activas: —'; voiceMax = 0; return; }
    const n = engine.getActiveVoices();
    if (n > voiceMax) voiceMax = n;
    diagVoices.textContent = 'Voces activas: ' + n + ' · máx ' + voiceMax;
  });
  // Autoguardado de la sesión: debounced, para no escribir en
  // localStorage en cada tick de un slider (eso traba el audio).
  let saveTimer = null;
  engine.onStateChange(function () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      storage.saveSession(engine.snapshot());
    }, 400);
  });
  engine.onTransport(function (ev) {
    if (ev === 'play') setPlayUI(true);
    else if (ev === 'stop') setPlayUI(false);
  });
  // Si cambia la librería del usuario, refrescar dropdowns y persistir.
  BT.userLibrary.onChange(function () {
    refreshTracks();
    storage.saveLibrary();
  });

  // ─── Arranque ───
  // El diagnóstico de voces solo se muestra en modo debug (?debug).
  if (/[?&]debug\b/.test(location.search)) diagVoices.hidden = false;
  initProgSelect();
  fillSelect(newRoot, ROOTS);
  fillSelect(newQuality, QUALITIES, 'v', it => it.label);

  storage.loadLibrary();              // librería de presets del usuario
  const handoff = BT.integration && BT.integration.readHandoff();
  const session = storage.loadSession();
  if (handoff) {
    // Progresión enviada desde el Intervalic Atlas: pistas por
    // defecto + la progresión recibida.
    setupDefaultTracks();
    model.loadProgression(handoff);
    progSelect.value = '';
  } else if (session && Array.isArray(session.tracks) && session.tracks.length) {
    restoreSnapshot(session);         // reabrir donde se dejó
  } else {
    loadDefaultProject();
  }
  refreshProjects();
  renderChords();
  renderEditor();
  renderHeroChords();
  refreshTracks();
  syncControls();
  subdivSelect.value = engine.getSubdivision();
  buildBeatMeter(SUBDIV_COUNT[engine.getSubdivision()] || 4);
  setStatus(handoff ? 'Progresión recibida del Intervalic Atlas' : 'Detenido');
})(typeof window !== 'undefined' ? window : globalThis);
