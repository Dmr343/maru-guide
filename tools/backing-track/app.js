// ─────────────────────────────────────────────────────────────
// Backing Track — app (glue de UI)
//
// Crea el motor, arma un proyecto por defecto y cablea la UI:
// transporte, indicador de acorde y gestión de pistas (agregar,
// quitar, silenciar, reordenar, elegir preset/patrón y volumen).
// El panel de edición de presets y el modo arreglo llegan en
// issues posteriores (#59, #62).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const BT = W.BackingTrack;
  const theory = W.GuitarShared && W.GuitarShared.theory;

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
  const tracksEl = el('tracks');
  const addTipo = el('add-tipo');
  const btnAdd = el('btn-add');

  const TIPO_LABEL = {
    bajo: 'Bajo', acordes: 'Acordes', bateria: 'Batería',
    percusion: 'Percusión', pad: 'Pad', lead: 'Lead',
  };
  // Rol de pista → tipo de patrón aplicable (pad no usa patrón).
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  const engine = BT.createEngine();

  // ─── Proyecto por defecto: progresión de blues + 3 pistas ───
  function loadDefaultProject() {
    const prog = BT.factoryProgressions.byId('blues12A');
    engine.loadProgression(BT.factoryProgressions.chordsOf('blues12A'));
    engine.setTempo(prog ? prog.tempo : 100);
    engine.addTrack({ tipo: 'bajo' });
    engine.addTrack({ tipo: 'acordes' });
    engine.addTrack({ tipo: 'bateria' });
  }

  // ─── Tira de acordes (indicador del acorde actual) ───
  function chordLabel(c) {
    if (theory && theory.chordName) return theory.chordName(c.root, c.quality);
    return c.root + (c.quality === 'major' ? '' : ' ' + c.quality);
  }
  function renderChords() {
    const prog = engine.getProgression();
    chordStrip.innerHTML = '';
    prog.forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = 'chord-chip';
      chip.dataset.idx = String(i);
      chip.textContent = chordLabel(c);
      chordStrip.appendChild(chip);
    });
  }
  function highlightChord(idx) {
    Array.prototype.forEach.call(chordStrip.children, chip => {
      chip.classList.toggle('active', Number(chip.dataset.idx) === idx);
    });
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

    // Silenciar / activar
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

    // Tipo
    const tipo = document.createElement('span');
    tipo.className = 'track-tipo';
    tipo.textContent = TIPO_LABEL[track.tipo] || track.tipo;
    row.appendChild(tipo);

    // Preset
    const presets = BT.factoryPresets.byTipo(track.tipo);
    const presetSel = makeSelect('track-preset', presets, track.presetId);
    presetSel.addEventListener('change', () => {
      engine.updateTrack(track.id, { presetId: presetSel.value });
    });
    row.appendChild(presetSel);

    // Patrón (el pad no usa patrón rítmico)
    const ptipo = PATTERN_TIPO[track.tipo];
    if (ptipo) {
      const pats = BT.factoryPatterns.byTipo(ptipo);
      const patSel = makeSelect('track-pattern', pats, track.patternId);
      patSel.addEventListener('change', () => {
        engine.updateTrack(track.id, { patternId: patSel.value });
      });
      row.appendChild(patSel);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'track-pattern';
      spacer.style.opacity = '0.4';
      spacer.textContent = '(sostenido)';
      row.appendChild(spacer);
    }

    // Volumen de la pista
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.className = 'track-vol';
    vol.min = '0'; vol.max = '100'; vol.step = '1';
    vol.value = String(Math.round((track.volumen != null ? track.volumen : 0.8) * 100));
    vol.title = 'Volumen de la pista';
    vol.addEventListener('input', () => {
      engine.updateTrack(track.id, { volumen: Number(vol.value) / 100 });
    });
    row.appendChild(vol);

    // Reordenar / quitar
    const up = document.createElement('button');
    up.className = 'track-btn'; up.textContent = '▲'; up.title = 'Subir';
    up.addEventListener('click', () => { engine.moveTrack(track.id, -1); renderTracks(); });
    row.appendChild(up);

    const down = document.createElement('button');
    down.className = 'track-btn'; down.textContent = '▼'; down.title = 'Bajar';
    down.addEventListener('click', () => { engine.moveTrack(track.id, 1); renderTracks(); });
    row.appendChild(down);

    const rm = document.createElement('button');
    rm.className = 'track-btn'; rm.textContent = '✕'; rm.title = 'Quitar';
    rm.addEventListener('click', () => { engine.removeTrack(track.id); renderTracks(); });
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

  ctlLoop.addEventListener('change', function () {
    engine.setLoop(ctlLoop.checked);
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
  loadDefaultProject();
  renderChords();
  renderTracks();
  syncControls();
  setStatus('Detenido');
})(typeof window !== 'undefined' ? window : globalThis);
