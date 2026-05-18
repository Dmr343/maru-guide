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
  const btnStop = el('btn-stop');
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

  const TIPO_LABEL = {
    bajo: 'Bajo', acordes: 'Acordes', bateria: 'Batería',
    percusion: 'Percusión', pad: 'Pad', lead: 'Lead',
  };
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };
  const MELODIC_TIPOS = ['bajo', 'acordes', 'pad', 'lead'];
  const QUALITIES = [
    { v: 'major', label: 'Mayor' },
    { v: 'minor', label: 'menor' },
    { v: 'dom7',  label: 'Dominante 7' },
    { v: 'maj7',  label: 'Mayor 7' },
    { v: 'min7',  label: 'menor 7' },
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

  // ─── Modelo de progresión (reutilizado del Atlas) ───
  const model = new ProgressionModel({
    onChange: function () {
      engine.loadProgression(model.progression);
      renderChords();
      renderEditor();
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

  // Presets disponibles para un tipo: de fábrica + de la librería del usuario.
  function presetsForTipo(tipo) {
    const fac = BT.factoryPresets.byTipo(tipo);
    const usr = BT.userLibrary.byTipo(tipo)
      .map(p => ({ id: p.id, nombre: '★ ' + p.nombre }));
    return fac.concat(usr);
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
  function loadDefaultProject() {
    const prog = BT.factoryProgressions.byId('blues12A');
    model.loadProgression(BT.factoryProgressions.chordsOf('blues12A'));
    engine.setTempo(prog ? prog.tempo : 100);
    progSelect.value = 'blues12A';
    engine.addTrack({ tipo: 'bajo' });
    engine.addTrack({ tipo: 'acordes' });
    engine.addTrack({ tipo: 'bateria' });
  }

  // ─── Tira de acordes ───
  function chordLabel(c) {
    if (theory && theory.chordName) return theory.chordName(c.root, c.quality);
    return c.root + (c.quality === 'major' ? '' : ' ' + c.quality);
  }
  function renderChords() {
    const prog = model.progression;
    chordStrip.innerHTML = '';
    prog.forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = 'chord-chip' + (i === model.activeIdx ? ' selected' : '');
      chip.dataset.idx = String(i);
      const name = document.createElement('span');
      name.textContent = chordLabel(c);
      const bars = document.createElement('span');
      bars.className = 'chip-bars';
      bars.textContent = '●'.repeat(c.bars);
      chip.appendChild(name);
      chip.appendChild(bars);
      chip.addEventListener('click', () => model.setActiveChord(i));
      chordStrip.appendChild(chip);
    });
  }
  function highlightChord(idx) {
    Array.prototype.forEach.call(chordStrip.children, chip => {
      chip.classList.toggle('active', Number(chip.dataset.idx) === idx);
    });
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

    const rootSel = document.createElement('select');
    fillSelect(rootSel, ROOTS);
    rootSel.value = chord.root;
    rootSel.addEventListener('change',
      () => model.editChordAt(idx, { root: rootSel.value }));
    chordEditor.appendChild(rootSel);

    const qSel = document.createElement('select');
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

    chordEditor.appendChild(mkBtn('track-btn', '◀', () => {
      if (idx > 0) model.moveChord(idx, idx - 1);
    }));
    chordEditor.appendChild(mkBtn('track-btn', '▶', () => {
      if (idx < model.progression.length - 1) model.moveChord(idx, idx + 1);
    }));
    chordEditor.appendChild(mkBtn('track-btn', '✕', () => model.removeChordAt(idx)));
  }

  // ─── Gestión de pistas ───
  function makeSelect(cls, options, selectedId) {
    const sel = document.createElement('select');
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

  function makeTrackRow(track) {
    const row = document.createElement('div');
    row.className = 'track ' + (track.enabled ? 'enabled' : 'disabled');
    row.dataset.id = track.id;

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

    // Preset (de fábrica o del usuario; "(editado)" si hay copia de trabajo).
    const presetOpts = presetsForTipo(track.tipo).slice();
    let selected = track.presetId;
    if (track.customPreset) {
      presetOpts.unshift({ id: '__custom', nombre: '(editado)' });
      selected = '__custom';
    }
    const presetSel = makeSelect('track-preset', presetOpts, selected);
    presetSel.addEventListener('change', () => {
      if (presetSel.value === '__custom') return;
      engine.updateTrack(track.id, { presetId: presetSel.value });
      if (editing && editing.trackId === track.id) closeEditor();
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

    const vol = document.createElement('input');
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

    const up = mkBtn('track-btn', '▲', () => { engine.moveTrack(track.id, -1); renderTracks(); });
    up.title = 'Subir';
    row.appendChild(up);
    const down = mkBtn('track-btn', '▼', () => { engine.moveTrack(track.id, 1); renderTracks(); });
    down.title = 'Bajar';
    row.appendChild(down);
    const rm = mkBtn('track-btn', '✕', () => {
      engine.removeTrack(track.id);
      if (editing && editing.trackId === track.id) closeEditor();
      renderTracks();
    });
    rm.title = 'Quitar';
    row.appendChild(rm);

    return { row, up, down };
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
    tracks.forEach((track, i) => {
      const { row, up, down } = makeTrackRow(track);
      up.disabled = (i === 0);
      down.disabled = (i === tracks.length - 1);
      tracksEl.appendChild(row);
    });
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
    const range = document.createElement('input');
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
    const sel = document.createElement('select');
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
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!current;
      const lbl = document.createElement('label');
      lbl.textContent = fx.label;
      lbl.style.minWidth = '80px';
      const range = document.createElement('input');
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

    const scratch = mkBtn('btn secondary', 'Desde cero', () => {
      editing.preset = blankPreset(track.tipo);
      applyEditing();
      renderPresetEditor();
    });
    actions.appendChild(scratch);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nombre del preset';
    nameInput.value = '';
    actions.appendChild(nameInput);

    const save = mkBtn('btn', 'Guardar como nuevo', () => {
      const nombre = nameInput.value.trim() || 'Mi sonido';
      const toSave = JSON.parse(JSON.stringify(editing.preset));
      toSave.nombre = nombre;
      toSave.tipo = track.tipo;
      const newId = BT.userLibrary.add(toSave);
      // La pista pasa a referenciar el preset guardado (deja de ser "editado").
      engine.updateTrack(editing.trackId, { presetId: newId });
      closeEditor();
      renderTracks();
    });
    actions.appendChild(save);

    actions.appendChild(mkBtn('btn secondary', 'Cerrar', closeEditor));
    presetEditorEl.appendChild(actions);
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

  // ─── Cableado de controles ───
  btnPlay.addEventListener('click', async function () {
    try {
      await engine.play();
      btnPlay.disabled = true;
      btnStop.disabled = false;
      setStatus('Sonando — modo práctica', 'playing');
    } catch (err) {
      setStatus('Error al iniciar el audio: ' + err.message, 'error');
    }
  });

  btnStop.addEventListener('click', function () {
    engine.stop();
    btnPlay.disabled = false;
    btnStop.disabled = true;
    setStatus('Detenido');
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
    renderTracks();
  });

  engine.onChordChange(highlightChord);
  engine.onTransport(function (ev) {
    if (ev === 'stop') {
      btnPlay.disabled = false;
      btnStop.disabled = true;
      setStatus('Detenido');
    }
  });
  // Si cambia la librería del usuario, refrescar los dropdowns de preset.
  BT.userLibrary.onChange(renderTracks);

  // ─── Arranque ───
  initProgSelect();
  fillSelect(newRoot, ROOTS);
  fillSelect(newQuality, QUALITIES, 'v', it => it.label);
  loadDefaultProject();
  renderChords();
  renderEditor();
  renderTracks();
  syncControls();
  setStatus('Detenido');
})(typeof window !== 'undefined' ? window : globalThis);
