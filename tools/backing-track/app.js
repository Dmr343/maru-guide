// ─────────────────────────────────────────────────────────────
// Backing Track — app (glue de UI)
//
// Crea el motor, arma un proyecto por defecto y cablea la UI:
// transporte, progresión (constructor de acordes reutilizando el
// ProgressionModel del Intervalic Atlas), indicador de acorde y
// gestión de pistas. El panel de edición de presets y el modo
// arreglo llegan en issues posteriores (#59, #62).
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

  const TIPO_LABEL = {
    bajo: 'Bajo', acordes: 'Acordes', bateria: 'Batería',
    percusion: 'Percusión', pad: 'Pad', lead: 'Lead',
  };
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };
  // Calidades soportadas por el motor (las que resuelve theory.buildChord).
  const QUALITIES = [
    { v: 'major', label: 'Mayor' },
    { v: 'minor', label: 'menor' },
    { v: 'dom7',  label: 'Dominante 7' },
    { v: 'maj7',  label: 'Mayor 7' },
    { v: 'min7',  label: 'menor 7' },
  ];
  const ROOTS = (theory && theory.CHROMATIC) ||
    ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

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

  // ─── Opciones de <select> ───
  function fillSelect(sel, items, valueKey, labelFn) {
    sel.innerHTML = '';
    items.forEach(it => {
      const opt = document.createElement('option');
      opt.value = valueKey ? it[valueKey] : it;
      opt.textContent = labelFn ? labelFn(it) : (valueKey ? it[valueKey] : it);
      sel.appendChild(opt);
    });
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

  // ─── Tira de acordes (selección + indicador) ───
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
    const minus = mkBtn('track-btn', '−', () => model.changeActiveBars(-1));
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = String(chord.bars);
    const plus = mkBtn('track-btn', '+', () => model.changeActiveBars(1));
    stepper.appendChild(minus); stepper.appendChild(val); stepper.appendChild(plus);
    chordEditor.appendChild(stepper);

    chordEditor.appendChild(mkBtn('track-btn', '◀', () => {
      if (idx > 0) model.moveChord(idx, idx - 1);
    }));
    chordEditor.appendChild(mkBtn('track-btn', '▶', () => {
      if (idx < model.progression.length - 1) model.moveChord(idx, idx + 1);
    }));
    chordEditor.appendChild(mkBtn('track-btn', '✕', () => model.removeChordAt(idx)));
  }

  function mkBtn(cls, text, onClick) {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
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

    const presets = BT.factoryPresets.byTipo(track.tipo);
    const presetSel = makeSelect('track-preset', presets, track.presetId);
    presetSel.addEventListener('change',
      () => engine.updateTrack(track.id, { presetId: presetSel.value }));
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

    const up = mkBtn('track-btn', '▲', () => { engine.moveTrack(track.id, -1); renderTracks(); });
    up.title = 'Subir';
    row.appendChild(up);
    const down = mkBtn('track-btn', '▼', () => { engine.moveTrack(track.id, 1); renderTracks(); });
    down.title = 'Bajar';
    row.appendChild(down);
    const rm = mkBtn('track-btn', '✕', () => { engine.removeTrack(track.id); renderTracks(); });
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

  ctlLoop.addEventListener('change',
    () => engine.setLoop(ctlLoop.checked));

  // Progresión: cargar una de fábrica.
  progSelect.addEventListener('change', function () {
    const id = progSelect.value;
    if (!id) return;
    const prog = BT.factoryProgressions.byId(id);
    if (!prog) return;
    model.loadProgression(BT.factoryProgressions.chordsOf(id));
    engine.setTempo(prog.tempo || engine.getTempo());
    syncControls();
  });

  // Constructor de acordes.
  btnAddChord.addEventListener('click', function () {
    model.addChord({ root: newRoot.value, quality: newQuality.value, bars: 1 });
    model.setActiveChord(model.progression.length - 1);
    progSelect.value = '';   // pasó a ser personalizada
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
