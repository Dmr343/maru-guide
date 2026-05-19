// ─────────────────────────────────────────────────────────────
// Backing Track — librería de presets de fábrica (solo datos)
//
// Cada preset es un objeto serializable que la instruments factory
// (instruments.js) convierte en un instrumento Tone.js. Los presets
// de fábrica son inmutables: editarlos genera presets nuevos del
// usuario (ver storage.js).
//
// Motores:
//   'synth'        — sintetizado, 100% offline.
//   'sampler'      — samples reales por CDN libre (requiere internet).
//   'webaudiofont' — soundfonts GM por CDN libre (requiere internet).
//
// Orden del arreglo: agrupado por `tipo` (bajo · acordes · pad · lead ·
// bateria · percusion) y, dentro de cada tipo, primero los sintetizados
// (offline) y después los que cargan recursos de la web.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PRESETS = [

    // ═══════════════════ BAJO ═══════════════════

    // ── Sintetizados (MonoSynth) ──
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

    // ── Samples reales (CDN) ──
    {
      id: 'bajoElectricoReal', nombre: 'Bajo eléctrico real', tipo: 'bajo', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/',
        urls: { 'E1': 'E1.mp3', 'G1': 'G1.mp3', 'C#2': 'Cs2.mp3',
                'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A#2': 'As2.mp3' },
      },
      efectos: [],
    },

    // ── WebAudioFont (soundfonts GM por CDN) ──
    {
      id: 'wafContrabajo', nombre: 'Contrabajo', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0320_FluidR3_GM_sf2_file.js',
        variable: '_tone_0320_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },
    {
      id: 'wafBajoDedos', nombre: 'Bajo eléctrico (dedos)', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0330_FluidR3_GM_sf2_file.js',
        variable: '_tone_0330_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },
    {
      id: 'wafTuba', nombre: 'Tuba', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0580_FluidR3_GM_sf2_file.js',
        variable: '_tone_0580_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },

    // ═══════════════════ ACORDES ═══════════════════

    // ── Sintetizados (PolySynth) ──
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
    {
      id: 'acordesVidrio', nombre: 'Acordes de vidrio', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.1, release: 0.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'pianoReal', nombre: 'Piano real', tipo: 'acordes', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/piano/',
        urls: { 'C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3',
                'A4': 'A4.mp3', 'C5': 'C5.mp3' },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },

    // ── WebAudioFont (soundfonts GM por CDN) ──
    {
      // Piano de cola GM: ideal para comping y para el montuno de salsa.
      id: 'wafPiano', nombre: 'Piano de cola', tipo: 'acordes', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0000_FluidR3_GM_sf2_file.js',
        variable: '_tone_0000_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      // Piano eléctrico (Rhodes): comping cálido, soul y montunos suaves.
      id: 'wafPianoElectrico', nombre: 'Piano eléctrico', tipo: 'acordes', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0040_FluidR3_GM_sf2_file.js',
        variable: '_tone_0040_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },

    // ═══════════════════ PAD ═══════════════════

    // ── Sintetizados (PolySynth) ──
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
    {
      id: 'padOscuro', nombre: 'Pad oscuro', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'fattriangle' },
        envelope: { attack: 1.5, decay: 1, sustain: 0.7, release: 2.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.55 }],
    },

    // ═══════════════════ LEAD ═══════════════════

    // ── Sintetizados (PolySynth) ──
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
    {
      id: 'leadCristal', nombre: 'Lead cristal', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.6 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.3 }, { tipo: 'reverb', cantidad: 0.25 }],
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

    // ── Samples reales (CDN) ──
    {
      id: 'bansuriReal', nombre: 'Bansuri real (flauta)', tipo: 'lead', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/flute/',
        urls: { 'C4': 'C4.mp3', 'E4': 'E4.mp3', 'A4': 'A4.mp3',
                'C5': 'C5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3' },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },

    // ── WebAudioFont — guitarras ──
    {
      id: 'wafGuitarraNylon', nombre: 'Guitarra nylon', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0240_FluidR3_GM_sf2_file.js',
        variable: '_tone_0240_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.22 }],
    },
    {
      id: 'wafGuitarraAcustica', nombre: 'Guitarra acústica', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0250_FluidR3_GM_sf2_file.js',
        variable: '_tone_0250_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.22 }],
    },
    {
      id: 'wafGuitarraElectrica', nombre: 'Guitarra eléctrica', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0270_FluidR3_GM_sf2_file.js',
        variable: '_tone_0270_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'wafBanjo', nombre: 'Banjo', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1050_FluidR3_GM_sf2_file.js',
        variable: '_tone_1050_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      id: 'wafSitar', nombre: 'Sitar', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1040_FluidR3_GM_sf2_file.js',
        variable: '_tone_1040_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ── WebAudioFont — cuerdas ──
    {
      id: 'wafCuerdas', nombre: 'Cuerdas (ensemble)', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0480_FluidR3_GM_sf2_file.js',
        variable: '_tone_0480_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      id: 'wafViolin', nombre: 'Violín', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0400_FluidR3_GM_sf2_file.js',
        variable: '_tone_0400_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafViola', nombre: 'Viola', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0410_FluidR3_GM_sf2_file.js',
        variable: '_tone_0410_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafCello', nombre: 'Cello', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0420_FluidR3_GM_sf2_file.js',
        variable: '_tone_0420_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafArpa', nombre: 'Arpa', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0460_FluidR3_GM_sf2_file.js',
        variable: '_tone_0460_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },

    // ── WebAudioFont — bronces ──
    {
      id: 'wafTrompeta', nombre: 'Trompeta', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0560_FluidR3_GM_sf2_file.js',
        variable: '_tone_0560_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafTrombon', nombre: 'Trombón', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0570_FluidR3_GM_sf2_file.js',
        variable: '_tone_0570_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafCornoFrances', nombre: 'Corno francés', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0600_FluidR3_GM_sf2_file.js',
        variable: '_tone_0600_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.32 }],
    },

    // ── WebAudioFont — vientos de madera ──
    {
      id: 'wafFlauta', nombre: 'Flauta', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0730_FluidR3_GM_sf2_file.js',
        variable: '_tone_0730_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      id: 'wafClarinete', nombre: 'Clarinete', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0710_FluidR3_GM_sf2_file.js',
        variable: '_tone_0710_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.32 }],
    },
    {
      id: 'wafOboe', nombre: 'Oboe', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0680_FluidR3_GM_sf2_file.js',
        variable: '_tone_0680_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.34 }],
    },
    {
      id: 'wafSaxoAlto', nombre: 'Saxo alto', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0650_FluidR3_GM_sf2_file.js',
        variable: '_tone_0650_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafSaxoTenor', nombre: 'Saxo tenor', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0660_FluidR3_GM_sf2_file.js',
        variable: '_tone_0660_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafShanai', nombre: 'Shanai', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1110_FluidR3_GM_sf2_file.js',
        variable: '_tone_1110_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ── WebAudioFont — teclas y voz ──
    {
      id: 'wafOrgano', nombre: 'Órgano', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0190_FluidR3_GM_sf2_file.js',
        variable: '_tone_0190_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'wafAcordeon', nombre: 'Acordeón', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0210_FluidR3_GM_sf2_file.js',
        variable: '_tone_0210_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      id: 'wafCoro', nombre: 'Coro', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0520_FluidR3_GM_sf2_file.js',
        variable: '_tone_0520_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.5 }],
    },

    // ── WebAudioFont — láminas y del mundo ──
    {
      id: 'wafVibrafono', nombre: 'Vibráfono', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0110_FluidR3_GM_sf2_file.js',
        variable: '_tone_0110_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafMarimba', nombre: 'Marimba', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0120_FluidR3_GM_sf2_file.js',
        variable: '_tone_0120_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafKalimba', nombre: 'Kalimba', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1080_FluidR3_GM_sf2_file.js',
        variable: '_tone_1080_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafKoto', nombre: 'Koto', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1070_FluidR3_GM_sf2_file.js',
        variable: '_tone_1070_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafShamisen', nombre: 'Shamisen', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1060_FluidR3_GM_sf2_file.js',
        variable: '_tone_1060_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      // Steel drum: timbre tropical/caribeño metálico y resonante.
      id: 'wafSteelDrum', nombre: 'Steel drum', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1140_FluidR3_GM_sf2_file.js',
        variable: '_tone_1140_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ═══════════════════ BATERÍA ═══════════════════

    // ── Sintetizadas (kit Membrane/Noise/Metal) ──
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

    // ── Samples reales (CDN) ──
    {
      id: 'bateriaAcusticaReal', nombre: 'Batería acústica real', tipo: 'bateria', motor: 'sampler',
      config: {
        pieces: {
          kick:   { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
                    file: 'kick.mp3' },
          snare:  { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
                    file: 'snare.mp3' },
          hat:    { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
                    file: 'hihat.mp3' },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.8, release: 0.3 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'bateriaTechnoReal', nombre: 'Batería techno real', tipo: 'bateria', motor: 'sampler',
      config: {
        pieces: {
          kick:   { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/Techno/',
                    file: 'kick.mp3' },
          snare:  { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/Techno/',
                    file: 'snare.mp3' },
          hat:    { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/Techno/',
                    file: 'hihat.mp3' },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.4, release: 0.2 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'bateriaCR78Real', nombre: 'Batería CR-78 real (vintage)', tipo: 'bateria', motor: 'sampler',
      config: {
        pieces: {
          kick:   { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/',
                    file: 'kick.mp3' },
          snare:  { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/',
                    file: 'snare.mp3' },
          hat:    { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/',
                    file: 'hihat.mp3' },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.5, release: 0.2 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },

    // ═══════════════════ PERCUSIÓN ═══════════════════

    // ── Sintetizada (kit Membrane/Noise/Metal) ──
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
      // Merengue: tambora (lanes bongo/conga) + güira (shaker, ruido corto).
      id: 'percMerengue', nombre: 'Percusión merengue', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'D2',
                      options: { pitchDecay: 0.06, octaves: 3 } },
          conga:    { engine: 'membrane', note: 'G2',
                      options: { pitchDecay: 0.04, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.035, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },
    {
      // Cumbia: congas/llamador (membrana) + guacharaca (shaker, raspado).
      id: 'percCumbia', nombre: 'Percusión cumbia', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'C4',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'F3',
                      options: { pitchDecay: 0.04, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'A2',
                      options: { pitchDecay: 0.05, octaves: 1.5 } },
          shaker:   { engine: 'noise', noise: 'brown',
                      options: { envelope: { attack: 0.002, decay: 0.06, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },
    {
      // Salsa: congas + bongó (membrana), clave (metal, clic) y güiro (shaker).
      id: 'percSalsa', nombre: 'Percusión salsa', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'D4',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'metal',
                      options: { envelope: { attack: 0.001, decay: 0.12, release: 0.05 } } },
          conga:    { engine: 'membrane', note: 'E3',
                      options: { pitchDecay: 0.035, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.045, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.14 }],
    },
    {
      // Bachata: güira (shaker) + bongó (membrana, agudo y grave).
      id: 'percBachata', nombre: 'Percusión bachata', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'E4',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'D3',
                      options: { pitchDecay: 0.04, octaves: 1.5 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.1 }],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'percBongosReal', nombre: 'Percusión bongós real', tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'tom1.mp3' },
          bongo_lo: { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'tom2.mp3' },
          conga:    { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'tom3.mp3' },
          shaker:   { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'hihat.mp3' },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.15 }],
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
