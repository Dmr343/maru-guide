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
        return new T.Reverb({ decay: spec.decay || 2, wet: amt });
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
    // Acordes / pad / lead: polifónico.
    const poly = new T.PolySynth(T.Synth);
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
      triggerHit: function (lane, time, velocity) {
        const v = voices[lane];
        if (!v) return;   // lane sin pieza registrada: se ignora
        if (v.spec.engine === 'membrane') {
          v.voice.triggerAttackRelease(v.spec.note || 'C2', '16n', time, velocity);
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

  // createInstrument — punto de entrada de la fábrica.
  function createInstrument(preset) {
    preset = preset || {};
    if (DRUM_TIPOS.indexOf(preset.tipo) >= 0) return createDrumkit(preset);
    return createMelodic(preset);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.instruments = { createInstrument, DEFAULT_KIT };
})(typeof window !== 'undefined' ? window : globalThis);
