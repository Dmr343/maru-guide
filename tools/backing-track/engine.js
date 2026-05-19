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

  // Subdivisiones del metrónomo (indicador de compás). interval es la
  // notación de Tone para el Tone.Loop; count es cuántas entran por
  // compás de 4/4.
  const SUBDIVISIONS = {
    redonda:     { interval: '1n', count: 1 },
    blanca:      { interval: '2n', count: 2 },
    negra:       { interval: '4n', count: 4 },
    corchea:     { interval: '8n', count: 8 },
    tresillo:    { interval: '8t', count: 12 },
    semicorchea: { interval: '16n', count: 16 },
  };

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
    // El grafo de audio se crea recién en el primer Play (tras el
    // gesto del usuario / Tone.start), para no tocar el AudioContext
    // antes de tiempo — eso disparaba warnings al cargar la página.
    let masterGain = null;
    let sharedReverb = null;
    let masterVol = 0.85;

    // Crea el grafo de audio una sola vez. masterGain → destino, y un
    // único bus de reverb compartido (un convolver) al que cada pista
    // le envía una porción de su señal — mucho más liviano que un
    // reverb por instrumento.
    function ensureAudioGraph() {
      if (masterGain) return;
      const T = Tone();
      masterGain = new T.Gain(masterVol).toDestination();
      sharedReverb = new T.Reverb({ decay: 3, wet: 1 });
      sharedReverb.connect(masterGain);
    }

    // Nivel de envío al reverb que pide un preset (su efecto 'reverb').
    function reverbAmountOf(preset) {
      const fx = (preset && preset.efectos) || [];
      const r = fx.filter(function (e) { return e && e.tipo === 'reverb'; })[0];
      return (r && Number.isFinite(r.cantidad)) ? r.cantidad : 0;
    }

    // ─── Estado (datos) ───
    let progression = [];          // [{root,quality,bars}]
    let tempo = DEFAULT_TEMPO;
    let tracks = [];               // pistas (config, ver addTrack)
    let loopEnabled = true;
    let mode = 'practica';
    let humanizeAmount = 0;        // 0..1 — intensidad de humanización
    let loopRangeIdx = null;       // [a,b] índices de acorde, o null (loop completo)
    let subdivision = 'negra';     // subdivisión del indicador de compás
    let trackCounter = 0;
    let tickCounter = -1;          // cuenta de subdivisiones del indicador

    // ─── Runtime (audio) ───
    const runtime = {};            // trackId → { instrument, gain, presetId }
    let notePart = null;
    let chordPart = null;
    let tickLoop = null;           // Tone.Loop por pulso para el indicador
    let playing = false;
    let activeChordIndex = -1;
    let loopStartBBS = '0:0:0';    // posición de inicio del loop (tiempo musical)

    // ─── Listeners ───
    const listeners = { chord: [], state: [], transport: [], tick: [] };
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
      // Envío al bus de reverb compartido, con el nivel del preset.
      const reverbSend = new (Tone().Gain)(reverbAmountOf(preset));
      gain.connect(reverbSend);
      reverbSend.connect(sharedReverb);
      return {
        instrument: instrument, gain: gain, reverbSend: reverbSend,
        preset: preset, sig: JSON.stringify(preset),
      };
    }

    function disposeRuntime(id) {
      const rt = runtime[id];
      if (!rt) return;
      try { rt.instrument.dispose(); } catch (e) {}
      try { rt.gain.dispose(); } catch (e) {}
      try { rt.reverbSend.dispose(); } catch (e) {}
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

    // ─── Patrones ───
    // El patrón efectivo de una pista: la variante editada activa
    // (track.patterns[track.variant]) si existe, o el patrón de
    // fábrica por id.
    function effectivePattern(track) {
      if (track.patterns && track.variant && track.patterns[track.variant]) {
        return track.patterns[track.variant];
      }
      return resolvePattern(track.patternId);
    }

    function getTrackPattern(id) {
      const track = tracks.find(t => t.id === id);
      if (!track) return null;
      const p = effectivePattern(track);
      return p ? JSON.parse(JSON.stringify(p)) : null;
    }

    // setTrackPattern — guarda una variante editada del patrón en la
    // pista (variante A o B según track.variant).
    function setTrackPattern(id, pattern) {
      const track = tracks.find(t => t.id === id);
      if (!track || !pattern) return;
      if (!track.patterns) track.patterns = { A: null, B: null };
      track.patterns[track.variant || 'A'] = pattern;
      refreshIfPlaying();
      emit('state');
    }

    function setTrackVariant(id, variant) {
      const track = tracks.find(t => t.id === id);
      if (!track) return;
      track.variant = (variant === 'B') ? 'B' : 'A';
      refreshIfPlaying();
      emit('state');
    }

    function disposeParts() {
      if (notePart) { try { notePart.dispose(); } catch (e) {} notePart = null; }
      if (chordPart) { try { chordPart.dispose(); } catch (e) {} chordPart = null; }
      if (tickLoop) { try { tickLoop.dispose(); } catch (e) {} tickLoop = null; }
    }

    // silenceAll — corta las notas que estén sonando en todos los
    // instrumentos. Evita que notas largas (pad, bajo sostenido) sigan
    // sonando tras un Stop o se apilen al reconstruir el scheduling.
    function silenceAll() {
      Object.keys(runtime).forEach(function (id) {
        const rt = runtime[id];
        if (rt && rt.instrument && rt.instrument.silence) rt.instrument.silence();
      });
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
      silenceAll();          // corta notas colgadas antes de reprogramar
      const T = Tone();

      // Cada pista usa su patrón efectivo (variante editada o de
      // fábrica), registrado bajo una clave sintética propia.
      const patterns = {};
      const schedTracks = tracks.map(t => {
        const pat = effectivePattern(t);
        if (!pat) return t;
        const pid = '__p_' + t.id;
        patterns[pid] = pat;
        return Object.assign({}, t, { patternId: pid });
      });

      const result = BT().scheduler.schedule({
        progression: progression,
        tempo: tempo,
        tracks: schedTracks,
        patterns: patterns,
      });

      // Humanización: micro-offsets de timing/velocity sobre los
      // eventos. Con humanización activa se agenda en segundos
      // (tiempo absoluto); sin ella, en tiempo musical (el BPM
      // reescala solo).
      let events = result.events;
      const humanized = humanizeAmount > 0 && BT().humanize;
      if (humanized) {
        events = BT().humanize.apply(events,
          { amount: humanizeAmount, seed: 1 });
      }
      const noteEvents = events.map(ev => ({
        time: humanized ? ev.time : stepToBBS(ev.step), ev: ev,
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

      // Loop del indicador de compás, a la subdivisión elegida. Usa un
      // contador (no lee la posición) → no se saltea pulsos.
      const sub = SUBDIVISIONS[subdivision] || SUBDIVISIONS.negra;
      tickLoop = new T.Loop(function (time) {
        tickCounter++;
        const idx = ((tickCounter % sub.count) + sub.count) % sub.count;
        T.getDraw().schedule(function () {
          emit('tick', { index: idx, count: sub.count });
        }, time);
      }, sub.interval);
      tickLoop.start(0);

      // Ventana de loop: rango de acordes [a,b] o el loop completo.
      const totalBars = result.loopSteps / STEPS_PER_BAR;
      let startStep = 0, endStep = result.loopSteps;
      if (loopRangeIdx && result.chords.length) {
        const n = result.chords.length;
        const a = Math.max(0, Math.min(loopRangeIdx[0], n - 1));
        const b = Math.max(0, Math.min(loopRangeIdx[1], n - 1));
        const lo = Math.min(a, b), hi = Math.max(a, b);
        startStep = result.chords[lo].startStep;
        endStep = result.chords[hi].startStep + result.chords[hi].lengthSteps;
      }
      loopStartBBS = stepToBBS(startStep);
      transport.loop = loopEnabled;
      transport.loopStart = loopStartBBS;
      transport.loopEnd = stepToBBS(endStep);
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
      // Con humanización los eventos van en segundos: hay que
      // reprogramarlos al cambiar el tempo.
      if (playing && humanizeAmount > 0) rebuildSchedule();
      emit('state');
    }
    function getTempo() { return tempo; }

    function setHumanize(amount) {
      amount = Number(amount);
      humanizeAmount = Number.isFinite(amount)
        ? Math.max(0, Math.min(1, amount)) : 0;
      refreshIfPlaying();
      emit('state');
    }
    function getHumanize() { return humanizeAmount; }

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
      // Elegir otro patrón de fábrica descarta las variantes editadas.
      if ('patternId' in patch) { delete track.patterns; track.variant = 'A'; }
      Object.keys(patch).forEach(k => { track[k] = patch[k]; });
      // Cambio de volumen en vivo sin reprogramar.
      const rt = runtime[id];
      if (rt && 'volumen' in patch) {
        rt.gain.gain.value = Number.isFinite(track.volumen) ? track.volumen : 0.8;
      }
      // El volumen solo ajusta una ganancia: no hace falta reprogramar
      // el scheduling (reconstruirlo en cada tick del slider traba el
      // audio). El resto de los cambios sí requieren reprogramar.
      const onlyVolume = Object.keys(patch).every(k => k === 'volumen');
      if (!onlyVolume) refreshIfPlaying();
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
      masterVol = Math.max(0, Math.min(1, Number(v) || 0));
      if (masterGain) masterGain.gain.value = masterVol;
      emit('state');
    }
    function getMasterVolume() { return masterVol; }

    function setLoop(on) {
      loopEnabled = !!on;
      transport.loop = loopEnabled;
      emit('state');
    }
    function getLoop() { return loopEnabled; }

    // setLoopRange — acota el loop a un rango de acordes [a,b].
    // setLoopRange(null) vuelve al loop completo.
    function setLoopRange(a, b) {
      if (a == null) loopRangeIdx = null;
      else loopRangeIdx = [a, (b == null ? a : b)];
      refreshIfPlaying();
      emit('state');
    }
    function getLoopRange() {
      return loopRangeIdx ? loopRangeIdx.slice() : null;
    }

    // setSubdivision — subdivisión del indicador de compás
    // ('redonda' | 'blanca' | 'negra' | 'corchea' | 'tresillo' | 'semicorchea').
    function setSubdivision(id) {
      if (SUBDIVISIONS[id]) subdivision = id;
      refreshIfPlaying();
      emit('state');
    }
    function getSubdivision() { return subdivision; }

    function setMode(m) {
      mode = (m === 'arreglo') ? 'arreglo' : 'practica';
      emit('state');
    }
    function getMode() { return mode; }

    async function play() {
      if (playing) return;
      await Tone().start();
      ensureAudioGraph();
      ensureInstruments();
      rebuildSchedule();
      applyTransport();
      transport.position = loopStartBBS;   // arranca al inicio del loop
      tickCounter = -1;                    // el indicador arranca en el pulso 1
      transport.start();
      playing = true;
      emit('transport', 'play');
    }

    function stop() {
      if (!playing) return;
      transport.stop();
      transport.position = loopStartBBS;
      disposeParts();
      silenceAll();          // corta las notas que sigan sonando
      playing = false;
      activeChordIndex = -1;
      emit('chord', -1);
      emit('tick', null);    // limpia el indicador de compás
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
        humanize: humanizeAmount,
        loopRange: getLoopRange(),
        subdivision: subdivision,
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
      humanizeAmount = Number.isFinite(state.humanize) ? state.humanize : 0;
      loopRangeIdx = Array.isArray(state.loopRange) ? state.loopRange.slice() : null;
      subdivision = SUBDIVISIONS[state.subdivision] ? state.subdivision : 'negra';
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
      try { sharedReverb.dispose(); } catch (e) {}
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
      getTrackPattern, setTrackPattern, setTrackVariant,
      setHumanize, getHumanize,
      setMasterVolume, getMasterVolume,
      setLoop, getLoop,
      setLoopRange, getLoopRange,
      setSubdivision, getSubdivision,
      setMode, getMode,
      play, stop, isPlaying, getActiveChordIndex,
      snapshot, restore, dispose,
      onChordChange: function (fn) { on('chord', fn); },
      onStateChange: function (fn) { on('state', fn); },
      onTransport: function (fn) { on('transport', fn); },
      onTick: function (fn) { on('tick', fn); },
    };
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.createEngine = createEngine;
})(typeof window !== 'undefined' ? window : globalThis);
