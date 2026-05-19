// ─────────────────────────────────────────────────────────────
// Backing Track — instruments factory
//
// Construye un instrumento Tone.js + su cadena de efectos a partir
// de un objeto preset (solo datos). El motor (engine.js) no conoce
// sonidos concretos: le pasa presets a esta fábrica y recibe
// instrumentos con una interfaz uniforme.
//
// Señal: instrumento → [efectos] → salida.  Soporta dos motores
// ('synth' y 'sampler') y los tipos del PRD. Libera todos los nodos
// con dispose(). IIFE + namespace global (file:// safe).
//
// createInstrument(preset) devuelve:
//   {
//     kind: 'melodic' | 'drumkit',
//     output,                                  // nodo a conectar
//     triggerNote(notes, duration, time, vel),  // melódico
//     triggerHit(lane, time, vel),              // batería/percusión
//     dispose()
//   }
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  function Tone() {
    const t = W.Tone;
    if (!t) throw new Error('Tone.js no está cargado (vendor/Tone.js)');
    return t;
  }

  const DRUM_TIPOS = ['bateria', 'percusion'];
  const MONO_TIPOS = ['bajo'];

  // Kit de batería por defecto, usado cuando el preset no define piezas.
  // Cada lane se mapea a un motor de síntesis y sus parámetros.
  const DEFAULT_KIT = {
    kick:   { engine: 'membrane', note: 'C1',
              options: { pitchDecay: 0.05, octaves: 4 } },
    snare:  { engine: 'noise', noise: 'white',
              options: { envelope: { attack: 0.001, decay: 0.2, sustain: 0 } } },
    hat:    { engine: 'noise', noise: 'white',
              options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
    cymbal: { engine: 'metal',
              options: { envelope: { attack: 0.001, decay: 0.6, release: 0.2 } } },
  };

  // ─── Construcción de efectos ───

  function buildEffect(spec) {
    const T = Tone();
    const amt = Number.isFinite(spec.cantidad) ? spec.cantidad : 0.3;
    switch (spec.tipo) {
      case 'reverb':
        // El reverb ya no se construye por instrumento: el motor lo
        // maneja como un bus compartido (un solo convolver + envíos).
        return null;
      case 'distortion':
        return new T.Distortion({ distortion: amt, wet: 1 });
      case 'chorus':
        return new T.Chorus({
          frequency: spec.frequency || 1.5,
          delayTime: spec.delayTime || 3.5,
          depth: amt,
        }).start();
      default:
        return null;
    }
  }

  function buildEffectChain(efectos) {
    if (!Array.isArray(efectos)) return [];
    return efectos.map(buildEffect).filter(Boolean);
  }

  // ─── Construcción de instrumentos melódicos ───

  function buildMelodicSynth(preset) {
    const T = Tone();
    const config = preset.config || {};
    if (MONO_TIPOS.indexOf(preset.tipo) >= 0) {
      // Bajo: monofónico, con filtro y envolvente de filtro.
      return new T.MonoSynth({
        oscillator: config.oscillator || { type: 'sawtooth' },
        envelope: config.envelope ||
          { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
        filter: config.filter || { type: 'lowpass', Q: 1 },
        filterEnvelope: config.filterEnvelope ||
          { attack: 0.02, decay: 0.3, sustain: 0.3,
            baseFrequency: 200, octaves: 3 },
      });
    }
    // Acordes / pad / lead: polifónico. maxPolyphony acotado: un
    // acorde/pad real necesita ~8-12 voces, no 32 — esto evita que
    // la RAM trepe asignando voces de más loop tras loop.
    const poly = new T.PolySynth(T.Synth);
    // Acotado (la mitad del default 32): suficiente para acordes/pads
    // con solapamiento de release, sin que la RAM trepe sin control.
    poly.maxPolyphony = 24;
    const opts = {};
    if (config.oscillator) opts.oscillator = config.oscillator;
    if (config.envelope) opts.envelope = config.envelope;
    if (Object.keys(opts).length) poly.set(opts);
    return poly;
  }

  function buildSampler(preset, onFallback) {
    const T = Tone();
    const config = preset.config || {};
    if (!config.urls || !Object.keys(config.urls).length) {
      // Sin samples definidos: no se puede usar el sampler.
      if (onFallback) onFallback('preset de sampler sin urls');
      return buildMelodicSynth(preset);
    }
    try {
      return new T.Sampler({
        urls: config.urls,
        baseUrl: config.baseUrl || '',
        release: config.release || 1,
        onerror: function (err) {
          console.warn('[backing-track] error al cargar samples de "' +
            (preset.id || preset.nombre || '?') + '": ' +
            (err && err.message ? err.message : err));
        },
      });
    } catch (err) {
      // Fallback claro: si el sampler no se puede crear, usar síntesis.
      if (onFallback) onFallback(err && err.message ? err.message : String(err));
      return buildMelodicSynth(preset);
    }
  }

  function createMelodic(preset) {
    const T = Tone();
    const isMono = MONO_TIPOS.indexOf(preset.tipo) >= 0;
    const instrument = (preset.motor === 'sampler')
      ? buildSampler(preset)
      : buildMelodicSynth(preset);

    const inputBus = new T.Gain();
    const outputGain = new T.Gain();
    instrument.connect(inputBus);
    const effects = buildEffectChain(preset.efectos);
    inputBus.chain.apply(inputBus, effects.concat([outputGain]));

    const isSampler = (preset.motor === 'sampler');

    return {
      kind: 'melodic',
      output: outputGain,
      triggerNote: function (notes, duration, time, velocity) {
        if (!notes || !notes.length) return;
        // El bajo es monofónico: toca solo la nota más grave.
        const payload = isMono ? notes[0] : notes;
        instrument.triggerAttackRelease(payload, duration, time, velocity);
      },
      triggerHit: function () { /* no aplica a instrumentos melódicos */ },
      voiceCount: function () {
        return (typeof instrument.activeVoices === 'number')
          ? instrument.activeVoices : 0;
      },
      // silence — corta las notas que estén sonando (release inmediato).
      // Evita que las notas largas (p. ej. del pad) sigan sonando tras
      // un Stop o se apilen al reconstruir el scheduling.
      silence: function () {
        try {
          if (typeof instrument.releaseAll === 'function') instrument.releaseAll();
          else if (typeof instrument.triggerRelease === 'function') instrument.triggerRelease();
        } catch (e) {}
      },
      // setConfig — actualiza en vivo los parámetros de síntesis sin
      // reconstruir el instrumento (oscilador, envolvente, filtro).
      setConfig: function (config) {
        if (!config || isSampler) return;
        const opts = {};
        if (config.oscillator) opts.oscillator = config.oscillator;
        if (config.envelope) opts.envelope = config.envelope;
        if (isMono && config.filter) opts.filter = config.filter;
        if (isMono && config.filterEnvelope) opts.filterEnvelope = config.filterEnvelope;
        try { instrument.set(opts); } catch (e) {}
      },
      dispose: function () {
        try { instrument.dispose(); } catch (e) {}
        effects.forEach(fx => { try { fx.dispose(); } catch (e) {} });
        try { inputBus.dispose(); } catch (e) {}
        try { outputGain.dispose(); } catch (e) {}
      },
    };
  }

  // ─── Construcción de kits de batería / percusión ───

  function buildPiece(spec) {
    const T = Tone();
    switch (spec.engine) {
      case 'membrane':
        return new T.MembraneSynth(spec.options || {});
      case 'metal':
        return new T.MetalSynth(spec.options || {});
      case 'sample':
        // Pieza de kit basada en un sample real (Sampler con una nota).
        return new T.Sampler({
          urls: { C3: spec.file },
          baseUrl: spec.baseUrl || '',
          onerror: function (err) {
            console.warn('[backing-track] sample de batería no cargó: ' +
              (err && err.message ? err.message : err));
          },
        });
      case 'noise':
      default:
        return new T.NoiseSynth(Object.assign(
          { noise: { type: spec.noise || 'white' } }, spec.options || {}));
    }
  }

  function createDrumkit(preset) {
    const T = Tone();
    const config = preset.config || {};
    const pieces = config.pieces || DEFAULT_KIT;

    const inputBus = new T.Gain();
    const outputGain = new T.Gain();
    const effects = buildEffectChain(preset.efectos);
    inputBus.chain.apply(inputBus, effects.concat([outputGain]));

    // Un synth por lane; todos van al bus de entrada del kit.
    const voices = {};
    Object.keys(pieces).forEach(lane => {
      const spec = pieces[lane] || {};
      const voice = buildPiece(spec);
      voice.connect(inputBus);
      voices[lane] = { voice: voice, spec: spec };
    });

    return {
      kind: 'drumkit',
      output: outputGain,
      triggerNote: function () { /* no aplica a un kit de batería */ },
      setConfig: function () { /* la edición de kit no aplica en v1 */ },
      voiceCount: function () { return 0; },   // golpes one-shot cortos
      silence: function () { /* los golpes de batería son one-shots cortos */ },
      triggerHit: function (lane, time, velocity) {
        const v = voices[lane];
        if (!v) return;   // lane sin pieza registrada: se ignora
        if (v.spec.engine === 'membrane' || v.spec.engine === 'sample') {
          // MembraneSynth y Sampler disparan con altura (nota fija).
          v.voice.triggerAttackRelease(v.spec.note || 'C3', '16n', time, velocity);
        } else {
          // NoiseSynth / MetalSynth: sin altura.
          v.voice.triggerAttackRelease('16n', time, velocity);
        }
      },
      dispose: function () {
        Object.keys(voices).forEach(lane => {
          try { voices[lane].voice.dispose(); } catch (e) {}
        });
        effects.forEach(fx => { try { fx.dispose(); } catch (e) {} });
        try { inputBus.dispose(); } catch (e) {}
        try { outputGain.dispose(); } catch (e) {}
      },
    };
  }

  // ─── WebAudioFont (instrumentos GM reales por CDN) ───

  const NOTE_INDEX = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };
  // Nota con octava ("C#3") → número MIDI (C4 = 60).
  function noteToMidi(name) {
    const m = /^([A-G]#?)(-?\d+)$/.exec(String(name));
    if (!m) return 60;
    return (NOTE_INDEX[m[1]] || 0) + (parseInt(m[2], 10) + 1) * 12;
  }

  // Construye un instrumento WebAudioFont: carga su soundfont GM desde
  // un CDN libre y lo reproduce con queueWaveTable.
  //
  // Cada instrumento tiene su PROPIO player (no uno compartido): así
  // sus voces se pueden cortar de forma aislada y, al hacer dispose,
  // el player y su pool de envolventes se liberan con él (un player
  // global acumulaba envolventes para siempre).
  //
  // Además se lleva registro de las voces activas para poder cortarlas
  // explícitamente — no alcanza con cancelQueue.
  function createWebAudioFont(preset) {
    const T = Tone();
    const rawCtx = T.getContext().rawContext;
    if (typeof W.WebAudioFontPlayer === 'undefined') {
      throw new Error('WebAudioFontPlayer no está cargado (vendor/)');
    }
    const player = new W.WebAudioFontPlayer();
    const cfg = preset.config || {};

    const inputBus = new T.Gain();
    const outputGain = new T.Gain();
    const effects = buildEffectChain(preset.efectos);
    inputBus.chain.apply(inputBus, effects.concat([outputGain]));

    let presetData = null;   // objeto del soundfont, una vez decodificado
    let voices = [];         // envolventes activas (devueltas por queueWaveTable)

    if (cfg.url && cfg.variable) {
      try {
        player.loader.startLoad(rawCtx, cfg.url, cfg.variable);
        player.loader.waitLoad(function () {
          presetData = W[cfg.variable] || null;
        });
      } catch (err) {
        console.warn('[backing-track] WebAudioFont: no se pudo cargar "' +
          (preset.id || '?') + '": ' + (err && err.message ? err.message : err));
      }
    }

    // Descarta del registro las voces que ya terminaron.
    function pruneVoices() {
      const now = rawCtx.currentTime;
      voices = voices.filter(function (env) {
        return env && (env.when + env.duration + 0.1 > now);
      });
    }

    // Corta de forma definitiva todas las voces activas: detiene el
    // buffer source y baja la ganancia a cero. cancelQueue por sí solo
    // no garantiza que las notas dejen de sonar.
    function stopAllVoices() {
      voices.forEach(function (env) {
        if (!env) return;
        try {
          if (env.audioBufferSourceNode) {
            env.audioBufferSourceNode.stop(0);
            env.audioBufferSourceNode.disconnect();
          }
        } catch (e) {}
        try {
          if (env.gain) {
            env.gain.cancelScheduledValues(0);
            env.gain.setValueAtTime(0.000001, rawCtx.currentTime);
          }
        } catch (e) {}
      });
      voices = [];
    }

    return {
      kind: 'melodic',
      output: outputGain,
      triggerNote: function (notes, duration, time, velocity) {
        if (!presetData || !notes || !notes.length) return;
        let durSec = Number(duration);          // ya viene en segundos
        if (!(durSec > 0)) durSec = 0.5;         // nunca duración inválida
        const vol = Number.isFinite(velocity) ? velocity : 0.8;
        pruneVoices();
        notes.forEach(function (n) {
          const env = player.queueWaveTable(rawCtx, inputBus.input,
            presetData, time, noteToMidi(n), durSec, vol);
          if (env) voices.push(env);
        });
      },
      triggerHit: function () { /* no aplica */ },
      setConfig: function () { /* WAF no se edita con sliders en v1 */ },
      voiceCount: function () { pruneVoices(); return voices.length; },
      silence: function () {
        try { player.cancelQueue(rawCtx); } catch (e) {}
        stopAllVoices();
      },
      dispose: function () {
        try { player.cancelQueue(rawCtx); } catch (e) {}
        stopAllVoices();
        effects.forEach(fx => { try { fx.dispose(); } catch (e) {} });
        try { inputBus.dispose(); } catch (e) {}
        try { outputGain.dispose(); } catch (e) {}
      },
    };
  }

  // createInstrument — punto de entrada de la fábrica.
  function createInstrument(preset) {
    preset = preset || {};
    if (preset.motor === 'webaudiofont') return createWebAudioFont(preset);
    if (DRUM_TIPOS.indexOf(preset.tipo) >= 0) return createDrumkit(preset);
    return createMelodic(preset);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.instruments = { createInstrument, DEFAULT_KIT };
})(typeof window !== 'undefined' ? window : globalThis);
