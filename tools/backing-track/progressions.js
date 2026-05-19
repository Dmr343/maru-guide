// ─────────────────────────────────────────────────────────────
// Backing Track — progresiones de fábrica (solo datos)
//
// Cada progresión usa el mismo modelo de acorde que el Intervalic
// Atlas: { root, quality, bars }. Calidades válidas:
//   major, minor, dom7, maj7, min7, m7b5
//
// Campos:
//   id, nombre, categoria, genero, tempo, chords[]
//
// `categoria` agrupa el menú desplegable (optgroups):
//   'estudio'       — localizar notas / recorrer el mástil.
//   'improvisacion' — sonar bien en loop y ofrecer buenas rutas.
//   'bailable'      — grooves de baile (cumbia, salsa, bachata).
//
// El orden de este arreglo es el orden dentro de cada grupo.
//
// Nota: las progresiones bailables son el esqueleto armónico; para
// que suenen de verdad a cumbia/salsa/bachata necesitan el patrón
// de percusión y bajo correspondiente (patterns.js).
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PROGRESSIONS = [

    // ═════════ ESTUDIO — localización de notas ═════════

    // Los 7 grados de Do mayor, los 4 tipos de acorde, solo notas
    // naturales. Caballito de batalla para localizar notas por cuerda.
    {
      id: 'armonizacionCmaj', nombre: 'Armonización de Do mayor',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
      ],
    },

    // Mismas 7 notas naturales, centro tonal menor. Entrena a oír
    // el mismo material desde otro reposo.
    {
      id: 'armonizacionAmin', nombre: 'Armonización de La menor',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Los 7 acordes diatónicos en orden de cuartas ascendentes:
    // el oído aprende el "tirón" de cada resolución.
    {
      id: 'circuloCuartasC', nombre: 'Círculo de cuartas en Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Un solo acorde sostenido: lienzo estable para recorrer una
    // cuerda entera de forma cromática, sin pensar en cambios.
    {
      id: 'cromaticaUnaCuerda', nombre: 'Cromática — una cuerda (Do sostenido)',
      categoria: 'estudio', genero: 'estudio', tempo: 66,
      chords: [
        { root: 'C', quality: 'maj7', bars: 8 },
      ],
    },

    // ═════════ IMPROVISACIÓN ═════════

    // Vamp dórico de dos acordes: mínima fricción, ideal para
    // escuchar cada nota contra el acorde.
    {
      id: 'modalDorian', nombre: 'Vamp dórico en Dm',
      categoria: 'improvisacion', genero: 'modal', tempo: 100,
      chords: [
        { root: 'D', quality: 'min7', bars: 2 },
        { root: 'G', quality: 'dom7', bars: 2 },
      ],
    },

    // Blues mayor clásico, 12 compases. Escuela de dominantes y de oído.
    {
      id: 'blues12A', nombre: 'Blues de 12 compases en A',
      categoria: 'improvisacion', genero: 'blues', tempo: 90,
      chords: [
        { root: 'A', quality: 'dom7', bars: 4 },
        { root: 'D', quality: 'dom7', bars: 2 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // ii–V–I: la 3ª y la 7ª se mueven por semitono entre acordes.
    {
      id: 'jazzIIVI', nombre: 'Jazz ii–V–I en C',
      categoria: 'improvisacion', genero: 'jazz', tempo: 120,
      chords: [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ],
    },

    // Doo-wop / años 50. Diatónico; los cambios piden chord tones.
    {
      id: 'popIviIVV', nombre: 'Pop I–vi–IV–V en C',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      chords: [
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
      ],
    },

    // i–♭VII–♭VI: vamp oscuro y modal. Rock, blues, psicodélico.
    {
      id: 'andaluzAm', nombre: 'Rock i–♭VII–♭VI en Am',
      categoria: 'improvisacion', genero: 'rock', tempo: 95,
      chords: [
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
      ],
    },

    // Color lídio: la alternancia introduce el ♯4 (F♯).
    {
      id: 'vampLidioC', nombre: 'Vamp lídio en C',
      categoria: 'improvisacion', genero: 'modal', tempo: 88,
      chords: [
        { root: 'C', quality: 'maj7', bars: 2 },
        { root: 'D', quality: 'major', bars: 2 },
      ],
    },

    // i–VI–III–VII en Em: rock/metal, diatónico, cambios fuertes.
    {
      id: 'metalEmin', nombre: 'Metal en Em',
      categoria: 'improvisacion', genero: 'metal', tempo: 140,
      chords: [
        { root: 'E', quality: 'minor', bars: 1 },
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
        { root: 'D', quality: 'major', bars: 1 },
      ],
    },

    // ── tempo bajo: espacio para frasear ──

    // Blues lento con "quick change" (IV en el compás 2). Tempo
    // bajo: espacio para bends, vibrato y silencios expresivos.
    {
      id: 'bluesLentoA', nombre: 'Blues lento en A',
      categoria: 'improvisacion', genero: 'blues', tempo: 56,
      chords: [
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'D', quality: 'dom7', bars: 2 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // I–vi con maj7/min7, lento y amplio. Sonido luminoso, mucho
    // aire para construir melodías sin apuro.
    {
      id: 'baladaCmajAm', nombre: 'Balada — vamp Cmaj7 / Am7',
      categoria: 'improvisacion', genero: 'balada', tempo: 64,
      chords: [
        { root: 'C', quality: 'maj7', bars: 2 },
        { root: 'A', quality: 'min7', bars: 2 },
      ],
    },

    // i–iv menor, lento. Color oscuro y melancólico; dórico o
    // eólico encima. Vamp lento para frasear con calma.
    {
      id: 'vampLentoMenor', nombre: 'Vamp lento — Am7 / Dm7',
      categoria: 'improvisacion', genero: 'modal', tempo: 66,
      chords: [
        { root: 'A', quality: 'min7', bars: 2 },
        { root: 'D', quality: 'min7', bars: 2 },
      ],
    },

    // ═════════ BAILABLE ═════════

    // Cumbia: i–iv–V7 en La menor. Esqueleto simple y muy bailable;
    // el carácter lo dará el patrón de percusión.
    {
      id: 'cumbiaAm', nombre: 'Cumbia en Am',
      categoria: 'bailable', genero: 'cumbia', tempo: 95,
      chords: [
        { root: 'A', quality: 'minor', bars: 2 },
        { root: 'D', quality: 'minor', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // Salsa: montuno I–vi–ii–V en Do. Ciclo con movimiento,
    // bueno para improvisar y para el groove de montuno.
    {
      id: 'salsaC', nombre: 'Salsa — montuno I–vi–ii–V en C',
      categoria: 'bailable', genero: 'salsa', tempo: 100,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Bachata: i–VI–III–VII en La menor, el loop de cuatro acordes
    // característico del género.
    {
      id: 'bachataAm', nombre: 'Bachata en Am',
      categoria: 'bailable', genero: 'bachata', tempo: 128,
      chords: [
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
      ],
    },

  ];

  function byId(id) {
    return PROGRESSIONS.find(p => p.id === id) || null;
  }
  function byGenero(genero) {
    return PROGRESSIONS.filter(p => p.genero === genero);
  }
  function byCategoria(categoria) {
    return PROGRESSIONS.filter(p => p.categoria === categoria);
  }
  // Clon de la lista de acordes de una progresión.
  function chordsOf(id) {
    const p = byId(id);
    return p ? p.chords.map(c => ({ root: c.root, quality: c.quality, bars: c.bars })) : [];
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryProgressions = { PROGRESSIONS, byId, byGenero, byCategoria, chordsOf };
})(typeof window !== 'undefined' ? window : globalThis);
