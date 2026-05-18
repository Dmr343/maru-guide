// ─────────────────────────────────────────────────────────────
// Backing Track — motor (engine)
//
// Orquesta Tone.Transport, el scheduling real y la lista dinámica
// de pistas. Es el "código fijo" de la arquitectura motor/datos: no
// conoce sonidos concretos — recibe presets y patrones (datos) y los
// resuelve vía instruments.js, scheduler.js y voicing.js.
//
// Los eventos se agendan en tiempo MUSICAL (compás:pulso:semicorchea),
// de modo que cambiar el BPM del Transport reescala todo sin
// reprogramar nada.
//
// createEngine() devuelve un objeto con la API pública del motor.
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  function Tone() {
    const t = W.Tone;
    if (!t) throw new Error('Tone.js no está cargado (vendor/Tone.js)');
    return t;
  }
  function BT() { return W.BackingTrack || {}; }

  const STEPS_PER_BAR = 16;
  const DEFAULT_TEMPO = 100;

  // step (semicorcheas absolutas) → "compás:pulso:semicorchea" de Tone.
  function stepToBBS(step) {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const rest = step % STEPS_PER_BAR;
    return bar + ':' + Math.floor(rest / 4) + ':' + (rest % 4);
  }

  // Rol de pista → tipo de patrón que le corresponde.
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };

  function createEngine() {
    const transport = Tone().getTransport();
    const masterGain = new (Tone().Gain)(0.85).toDestination();

    // ─── Estado (datos) ───
    let progression = [];          // [{root,quality,bars}]
    let tempo = DEFAULT_TEMPO;
    let tracks = [];               // pistas (config, ver addTrack)
    let loopEnabled = true;
    let mode = 'practica';
    let trackCounter = 0;

    // ─── Runtime (audio) ───
    const runtime = {};            // trackId → { instrument, gain, presetId }
    let notePart = null;
    let chordPart = null;
    let playing = false;
    let activeChordIndex = -1;

    // ─── Listeners ───
    const listeners = { chord: [], state: [], transport: [] };
    function emit(kind, payload) {
      listeners[kind].forEach(fn => { try { fn(payload); } catch (e) {} });
    }

    // ─── Resolución de datos de fábrica ───
    function resolvePreset(id) {
      const fp = BT().factoryPresets;
      return (fp && fp.byId(id)) || null;
    }
    function resolvePattern(id) {
      const fp = BT().factoryPatterns;
      return (fp && fp.byId(id)) || null;
    }

    // ─── Instrumentos ───
    // El preset efectivo de una pista: su copia de trabajo editada
    // (customPreset) si existe, o el preset de fábrica por id.
    function effectivePreset(track) {
      return track.customPreset || resolvePreset(track.presetId);
    }

    function buildInstrument(track) {
      const preset = effectivePreset(track);
      if (!preset) return null;
      const instrument = BT().instruments.createInstrument(preset);
      const gain = new (Tone().Gain)(
        Number.isFinite(track.volumen) ? track.volumen : 0.8);
      instrument.output.connect(gain);
      gain.connect(masterGain);
      return { instrument, gain, preset: preset, sig: JSON.stringify(preset) };
    }

    function disposeRuntime(id) {
      const rt = runtime[id];
      if (!rt) return;
      try { rt.instrument.dispose(); } catch (e) {}
      try { rt.gain.dispose(); } catch (e) {}
      delete runtime[id];
    }

    // (Re)construye los instrumentos de todas las pistas. Reusa el
    // instrumento si el preset no cambió; lo reconstruye si cambió.
    function ensureInstruments() {
      Object.keys(runtime).forEach(id => {
        if (!tracks.find(t => t.id === id)) disposeRuntime(id);
      });
      tracks.forEach(track => {
        const rt = runtime[track.id];
        const preset = effectivePreset(track);
        if (rt && preset && rt.sig === JSON.stringify(preset)) {
          rt.gain.gain.value = Number.isFinite(track.volumen) ? track.volumen : 0.8;
          return;
        }
        if (rt) disposeRuntime(track.id);
        const built = buildInstrument(track);
        if (built) runtime[track.id] = built;
      });
    }

    // applyTrackPreset — instala una copia de trabajo del preset en la
    // pista. Si solo cambió la config de síntesis (mismo motor, mismos
    // efectos) y el instrumento ya existe, lo actualiza en vivo sin
    // reconstruir. Si cambió la estructura (efectos / motor), reconstruye.
    function applyTrackPreset(id, preset) {
      const track = tracks.find(t => t.id === id);
      if (!track || !preset) return;
      track.customPreset = preset;
      const rt = runtime[id];
      const fxSame = rt &&
        JSON.stringify(rt.preset.efectos || []) === JSON.stringify(preset.efectos || []);
      if (rt && rt.instrument.kind === 'melodic' &&
          rt.preset.motor === preset.motor && fxSame) {
        rt.instrument.setConfig(preset.config);   // actualización en vivo
        rt.preset = preset;
        rt.sig = JSON.stringify(preset);
      } else if (rt) {
        disposeRuntime(id);
        const built = buildInstrument(track);
        if (built) runtime[id] = built;
      }
      emit('state');
    }

    // getTrackPreset — copia del preset efectivo de una pista, como
    // punto de partida para editarlo.
    function getTrackPreset(id) {
      const track = tracks.find(t => t.id === id);
      if (!track) return null;
      const p = effectivePreset(track);
      return p ? JSON.parse(JSON.stringify(p)) : null;
    }

    // ─── Scheduling ───
    function patternsMap() {
      const map = {};
      tracks.forEach(t => {
        if (t.patternId && !map[t.patternId]) {
          const p = resolvePattern(t.patternId);
          if (p) map[t.patternId] = p;
        }
      });
      return map;
    }

    function disposeParts() {
      if (notePart) { try { notePart.dispose(); } catch (e) {} notePart = null; }
      if (chordPart) { try { chordPart.dispose(); } catch (e) {} chordPart = null; }
    }

    function dispatchEvent(time, ev) {
      const rt = runtime[ev.trackId];
      if (!rt) return;
      if (ev.type === 'hit') {
        rt.instrument.triggerHit(ev.lane, time, ev.velocity);
      } else {
        rt.instrument.triggerNote(
          ev.notes, ev.durationSteps + '*16n', time, ev.velocity);
      }
    }

    // Construye los Tone.Part a partir del scheduler. Devuelve el
    // largo del loop en compases.
    function rebuildSchedule() {
      disposeParts();
      const T = Tone();
      const result = BT().scheduler.schedule({
        progression: progression,
        tempo: tempo,
        tracks: tracks,
        patterns: patternsMap(),
      });

      const noteEvents = result.events.map(ev => ({
        time: stepToBBS(ev.step), ev: ev,
      }));
      notePart = new T.Part(function (time, value) {
        dispatchEvent(time, value.ev);
      }, noteEvents);
      notePart.start(0);

      // Part del indicador de acorde, sincronizado con el audio.
      const chordEvents = result.chords.map(c => ({
        time: stepToBBS(c.startStep), idx: c.index,
      }));
      chordPart = new T.Part(function (time, value) {
        T.getDraw().schedule(function () {
          activeChordIndex = value.idx;
          emit('chord', value.idx);
        }, time);
      }, chordEvents);
      chordPart.start(0);

      const totalBars = result.loopSteps / STEPS_PER_BAR;
      transport.loop = loopEnabled;
      transport.loopStart = 0;
      transport.loopEnd = totalBars + ':0:0';
      return totalBars;
    }

    function applyTransport() {
      transport.bpm.value = tempo;
    }

    // Si está sonando, reconstruye instrumentos y scheduling en vivo.
    function refreshIfPlaying() {
      if (!playing) return;
      ensureInstruments();
      rebuildSchedule();
    }

    // ─── API: progresión / tempo ───
    function loadProgression(chords) {
      progression = Array.isArray(chords)
        ? chords.map(c => ({ root: c.root, quality: c.quality, bars: c.bars }))
        : [];
      activeChordIndex = -1;
      refreshIfPlaying();
      emit('state');
    }
    function getProgression() {
      return progression.map(c => ({ root: c.root, quality: c.quality, bars: c.bars }));
    }

    function setTempo(bpm) {
      bpm = Math.round(Number(bpm));
      if (!Number.isFinite(bpm)) return;
      tempo = Math.max(40, Math.min(240, bpm));
      applyTransport();           // cambio en vivo, sin reprogramar
      emit('state');
    }
    function getTempo() { return tempo; }

    // ─── API: pistas ───
    function patternTipoFor(tipo) { return PATTERN_TIPO[tipo] || null; }

    function defaultsForTipo(tipo) {
      const fp = BT().factoryPresets, fpat = BT().factoryPatterns;
      const presets = fp ? fp.byTipo(tipo) : [];
      const ptipo = patternTipoFor(tipo);
      const pats = (fpat && ptipo) ? fpat.byTipo(ptipo) : [];
      return {
        presetId: presets[0] ? presets[0].id : null,
        patternId: pats[0] ? pats[0].id : null,
      };
    }

    function addTrack(cfg) {
      cfg = cfg || {};
      const tipo = cfg.tipo || 'bajo';
      const def = defaultsForTipo(tipo);
      const track = {
        id: 't' + (++trackCounter),
        tipo: tipo,
        presetId: cfg.presetId || def.presetId,
        patternId: cfg.patternId || def.patternId,
        enabled: cfg.enabled !== false,
        volumen: Number.isFinite(cfg.volumen) ? cfg.volumen : 0.8,
        voicing: cfg.voicing || 'close',
        inversion: Number.isFinite(cfg.inversion) ? cfg.inversion : 0,
        octave: Number.isFinite(cfg.octave)
          ? cfg.octave : (tipo === 'bajo' ? 2 : 3),
      };
      tracks.push(track);
      refreshIfPlaying();
      emit('state');
      return track.id;
    }

    function removeTrack(id) {
      tracks = tracks.filter(t => t.id !== id);
      disposeRuntime(id);
      refreshIfPlaying();
      emit('state');
    }

    function updateTrack(id, patch) {
      const track = tracks.find(t => t.id === id);
      if (!track || !patch) return;
      // Elegir un preset de fábrica descarta la copia de trabajo editada.
      if ('presetId' in patch) delete track.customPreset;
      Object.keys(patch).forEach(k => { track[k] = patch[k]; });
      // Cambio de volumen en vivo sin reprogramar.
      const rt = runtime[id];
      if (rt && 'volumen' in patch) {
        rt.gain.gain.value = Number.isFinite(track.volumen) ? track.volumen : 0.8;
      }
      refreshIfPlaying();
      emit('state');
    }

    function moveTrack(id, dir) {
      const i = tracks.findIndex(t => t.id === id);
      const j = i + (dir < 0 ? -1 : 1);
      if (i < 0 || j < 0 || j >= tracks.length) return;
      const tmp = tracks[i]; tracks[i] = tracks[j]; tracks[j] = tmp;
      emit('state');
    }

    function getTracks() {
      return tracks.map(t => Object.assign({}, t));
    }

    // ─── API: transporte ───
    function setMasterVolume(v) {
      masterGain.gain.value = Math.max(0, Math.min(1, Number(v) || 0));
      emit('state');
    }
    function getMasterVolume() { return masterGain.gain.value; }

    function setLoop(on) {
      loopEnabled = !!on;
      transport.loop = loopEnabled;
      emit('state');
    }
    function getLoop() { return loopEnabled; }

    function setMode(m) {
      mode = (m === 'arreglo') ? 'arreglo' : 'practica';
      emit('state');
    }
    function getMode() { return mode; }

    async function play() {
      if (playing) return;
      await Tone().start();
      ensureInstruments();
      rebuildSchedule();
      applyTransport();
      transport.position = 0;
      transport.start();
      playing = true;
      emit('transport', 'play');
    }

    function stop() {
      if (!playing) return;
      transport.stop();
      transport.position = 0;
      disposeParts();
      playing = false;
      activeChordIndex = -1;
      emit('chord', -1);
      emit('transport', 'stop');
    }

    function isPlaying() { return playing; }
    function getActiveChordIndex() { return activeChordIndex; }

    // ─── Persistencia (usada por storage.js, #60) ───
    function snapshot() {
      return {
        progression: getProgression(),
        tempo: tempo,
        loopEnabled: loopEnabled,
        mode: mode,
        tracks: getTracks(),
      };
    }
    function restore(state) {
      if (!state) return;
      const wasPlaying = playing;
      if (wasPlaying) stop();
      progression = Array.isArray(state.progression)
        ? state.progression.map(c => ({ root: c.root, quality: c.quality, bars: c.bars }))
        : [];
      tempo = Number.isFinite(state.tempo) ? state.tempo : DEFAULT_TEMPO;
      loopEnabled = state.loopEnabled !== false;
      mode = state.mode === 'arreglo' ? 'arreglo' : 'practica';
      Object.keys(runtime).forEach(disposeRuntime);
      tracks = Array.isArray(state.tracks)
        ? state.tracks.map(t => Object.assign({}, t)) : [];
      tracks.forEach(t => {
        const n = parseInt(String(t.id).replace(/\D/g, ''), 10);
        if (Number.isFinite(n) && n > trackCounter) trackCounter = n;
      });
      emit('state');
    }

    function dispose() {
      stop();
      Object.keys(runtime).forEach(disposeRuntime);
      try { masterGain.dispose(); } catch (e) {}
    }

    function on(kind, fn) {
      if (listeners[kind] && typeof fn === 'function') listeners[kind].push(fn);
    }

    return {
      loadProgression, getProgression,
      setTempo, getTempo,
      addTrack, removeTrack, updateTrack, moveTrack, getTracks,
      applyTrackPreset, getTrackPreset,
      setMasterVolume, getMasterVolume,
      setLoop, getLoop,
      setMode, getMode,
      play, stop, isPlaying, getActiveChordIndex,
      snapshot, restore, dispose,
      onChordChange: function (fn) { on('chord', fn); },
      onStateChange: function (fn) { on('state', fn); },
      onTransport: function (fn) { on('transport', fn); },
    };
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.createEngine = createEngine;
})(typeof window !== 'undefined' ? window : globalThis);
