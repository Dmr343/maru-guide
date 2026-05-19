// ─────────────────────────────────────────────────────────────
// Backing Track — librería de presets de fábrica (solo datos)
//
// Cada preset es un objeto serializable que la instruments factory
// (instruments.js) convierte en un instrumento Tone.js. Los presets
// de fábrica son inmutables: editarlos genera presets nuevos del
// usuario (ver storage.js).
//
// v1: todos los presets son sintetizados (motor 'synth'), para que
// el módulo funcione 100% offline sin archivos de sample. El motor
// 'sampler' está soportado por la fábrica para presets de usuario y
// futuras librerías con samples.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PRESETS = [
    // ─── Bajo (MonoSynth) ───
    {
      id: 'bajoRedondo', nombre: 'Bajo redondo', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.4 },
        filter: { type: 'lowpass', Q: 1 },
        filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.5,
          baseFrequency: 120, octaves: 2.5 },
      },
      efectos: [],
    },
    {
      id: 'bajoPunchy', nombre: 'Bajo punchy', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.18, sustain: 0.3, release: 0.2 },
        filter: { type: 'lowpass', Q: 3 },
        filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.2,
          baseFrequency: 200, octaves: 3 },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.08 }],
    },
    {
      id: 'bajoSubgrave', nombre: 'Bajo subgrave', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.4, sustain: 0.8, release: 0.6 },
        filter: { type: 'lowpass', Q: 0.5 },
        filterEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.7,
          baseFrequency: 80, octaves: 1.5 },
      },
      efectos: [],
    },

    // ─── Acordes (PolySynth) ───
    {
      id: 'acordesCalido', nombre: 'Acordes cálidos', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.4, sustain: 0.5, release: 0.8 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'acordesElectrico', nombre: 'Acordes eléctricos', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.35, release: 0.4 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.4 }, { tipo: 'reverb', cantidad: 0.15 }],
    },
    {
      id: 'acordesPercusivo', nombre: 'Acordes percusivos', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.5, sustain: 0.05, release: 0.3 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },

    // ─── Pad (PolySynth) ───
    {
      id: 'padCalido', nombre: 'Pad cálido', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.8, decay: 1, sustain: 0.9, release: 2 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.5 }],
    },
    {
      id: 'padAire', nombre: 'Pad de aire', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 1.2, decay: 1.5, sustain: 0.8, release: 3 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.6 }, { tipo: 'reverb', cantidad: 0.6 }],
    },

    // ─── Lead (PolySynth) ───
    {
      id: 'leadSuave', nombre: 'Lead suave', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'leadBrillante', nombre: 'Lead brillante', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.4 },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.12 }, { tipo: 'reverb', cantidad: 0.2 }],
    },

    // ─── Batería (kit Membrane/Noise/Metal) ───
    {
      id: 'bateriaAcustica', nombre: 'Batería acústica', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.05, octaves: 4 } },
          snare:  { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.2, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.8, release: 0.3 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'bateriaElectronica', nombre: 'Batería electrónica', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.02, octaves: 6 } },
          snare:  { engine: 'noise', noise: 'pink',
                    options: { envelope: { attack: 0.001, decay: 0.12, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.4, release: 0.2 } } },
        },
      },
      efectos: [],
    },

    // ─── Percusión (kit Membrane/Noise) ───
    {
      id: 'percLatina', nombre: 'Percusión latina', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'E3',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'C3',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },

    // ─── Más variedad sintetizada ───
    {
      id: 'bajoMoog', nombre: 'Bajo Moog', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.3 },
        filter: { type: 'lowpass', Q: 4 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3,
          baseFrequency: 150, octaves: 3.5 },
      },
      efectos: [],
    },
    {
      id: 'acordesVidrio', nombre: 'Acordes de vidrio', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.1, release: 0.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      id: 'padOscuro', nombre: 'Pad oscuro', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'fattriangle' },
        envelope: { attack: 1.5, decay: 1, sustain: 0.7, release: 2.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.55 }],
    },
    {
      id: 'leadCristal', nombre: 'Lead cristal', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.6 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.3 }, { tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'bateriaVintage', nombre: 'Batería vintage', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.08, octaves: 3 } },
          snare:  { engine: 'noise', noise: 'brown',
                    options: { envelope: { attack: 0.001, decay: 0.18, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 1, release: 0.4 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'bateriaLoFi', nombre: 'Batería lo-fi', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.1, octaves: 2 } },
          snare:  { engine: 'noise', noise: 'pink',
                    options: { envelope: { attack: 0.002, decay: 0.1, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'pink',
                    options: { envelope: { attack: 0.001, decay: 0.02, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.3, release: 0.15 } } },
        },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.1 }],
    },
    {
      id: 'bateriaPunchy', nombre: 'Batería punchy', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.03, octaves: 5 } },
          snare:  { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.15, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.045, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.7, release: 0.25 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'percAfricana', nombre: 'Percusión africana', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'D4',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.04, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'F3',
                      options: { pitchDecay: 0.05, octaves: 1.5 } },
          shaker:   { engine: 'noise', noise: 'brown',
                      options: { envelope: { attack: 0.001, decay: 0.06, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'percElectronica', nombre: 'Percusión electrónica', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'metal',
                      options: { envelope: { attack: 0.001, decay: 0.12, release: 0.05 } } },
          bongo_lo: { engine: 'membrane', note: 'E3',
                      options: { pitchDecay: 0.02, octaves: 4 } },
          conga:    { engine: 'membrane', note: 'C3',
                      options: { pitchDecay: 0.02, octaves: 5 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'percCajon', nombre: 'Percusión cajón', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
          bongo_lo: { engine: 'membrane', note: 'C2',
                      options: { pitchDecay: 0.06, octaves: 3 } },
          conga:    { engine: 'membrane', note: 'G2',
                      options: { pitchDecay: 0.05, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'brown',
                      options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },

    // ─── Exóticos / del mundo (aproximaciones sintetizadas) ───
    {
      // Tabla: tambores de mano afinados. El pitchDecay de MembraneSynth
      // recrea el "tun" con caída de altura característico.
      id: 'tabla', nombre: 'Tabla (India)', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'A4',
                      options: { pitchDecay: 0.06, octaves: 3 } },
          bongo_lo: { engine: 'membrane', note: 'D2',
                      options: { pitchDecay: 0.18, octaves: 4 } },
          conga:    { engine: 'membrane', note: 'E4',
                      options: { pitchDecay: 0.08, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      // Sitar: timbre brillante y zumbante por las cuerdas simpáticas;
      // la distorsión leve aporta ese carácter.
      id: 'sitar', nombre: 'Sitar (India)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.9, sustain: 0.15, release: 1.2 },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.18 }, { tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      // Sarod: cuerda profunda e introspectiva, más mate que el sitar.
      id: 'sarod', nombre: 'Sarod (India)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 0.01, decay: 0.7, sustain: 0.25, release: 1 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      // Bansuri: flauta de bambú; timbre suave y aireado.
      id: 'bansuri', nombre: 'Bansuri (India)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.12, decay: 0.3, sustain: 0.7, release: 0.6 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.45 }],
    },
    {
      // Lead árabe (oud/qanun): pulsado brillante de Medio Oriente.
      id: 'leadArabe', nombre: 'Lead árabe (oud)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.004, decay: 0.5, sustain: 0.1, release: 0.7 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
  ];

  function byId(id) {
    return PRESETS.find(p => p.id === id) || null;
  }
  function byTipo(tipo) {
    return PRESETS.filter(p => p.tipo === tipo);
  }
  // Clon profundo de un preset — punto de partida para editarlo sin
  // mutar el de fábrica.
  function clone(preset) {
    return preset ? JSON.parse(JSON.stringify(preset)) : null;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryPresets = { PRESETS, byId, byTipo, clone };
})(typeof window !== 'undefined' ? window : globalThis);
