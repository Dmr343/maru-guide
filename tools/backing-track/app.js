// ─────────────────────────────────────────────────────────────
// Backing Track — app (glue de UI)
//
// Crea el motor, arma un proyecto por defecto (modo práctica) y
// cablea los controles de transporte. La gestión de pistas, el
// indicador de acorde definitivo y el modo arreglo se suman en
// issues posteriores (#57, #62).
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

  // ─── Render de la tira de acordes ───
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

  // ─── Sincronizar controles con el estado del motor ───
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
  syncControls();
  setStatus('Detenido');
})(typeof window !== 'undefined' ? window : globalThis);
