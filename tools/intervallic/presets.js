// Progresiones famosas agrupadas por género para Interval Atlas.
// IIFE, file:// safe. Expone W.AtlasPresets.
//
// Formato: { id, name, genre, chords: [{root, quality, bars}, ...] }
(function (W) {

  const PRESETS = [
    // ─── Jazz ──────────────────────────────────────────────────────────────
    {
      id: 'jazz-ii-V-I-C', genre: 'jazz', name: 'ii–V–I en C',
      chords: [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ],
    },
    {
      id: 'jazz-ii-V-I-F', genre: 'jazz', name: 'ii–V–I en F',
      chords: [
        { root: 'G', quality: 'min7', bars: 1 },
        { root: 'C', quality: 'dom7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 2 },
      ],
    },
    {
      id: 'jazz-ii-V-I-Bb', genre: 'jazz', name: 'ii–V–I en B♭',
      chords: [
        { root: 'C', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'dom7', bars: 1 },
        { root: 'A#', quality: 'maj7', bars: 2 },
      ],
    },
    {
      id: 'jazz-autumn', genre: 'jazz', name: 'Autumn Leaves (A)',
      chords: [
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'G', quality: 'maj7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'F#', quality: 'm7b5', bars: 1 },
        { root: 'B', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'min7', bars: 2 },
      ],
    },
    {
      id: 'jazz-blues-F', genre: 'jazz', name: 'Blues mayor en F (12)',
      chords: [
        { root: 'F', quality: 'dom7', bars: 1 },
        { root: 'A#', quality: 'dom7', bars: 1 },
        { root: 'F', quality: 'dom7', bars: 1 },
        { root: 'F', quality: 'dom7', bars: 1 },
        { root: 'A#', quality: 'dom7', bars: 1 },
        { root: 'A#', quality: 'dom7', bars: 1 },
        { root: 'F', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'G', quality: 'min7', bars: 1 },
        { root: 'C', quality: 'dom7', bars: 1 },
        { root: 'F', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'dom7', bars: 1 },
      ],
    },
    {
      id: 'jazz-rhythm', genre: 'jazz', name: 'Rhythm Changes A (Bb)',
      chords: [
        { root: 'A#', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'min7', bars: 1 },
        { root: 'C', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'dom7', bars: 1 },
      ],
    },

    // ─── Pop / Rock ────────────────────────────────────────────────────────
    {
      id: 'pop-axis', genre: 'pop', name: 'Axis I–V–vi–IV (C)',
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
      ],
    },
    {
      id: 'pop-50s', genre: 'pop', name: '50s I–vi–IV–V (C)',
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },
    {
      id: 'pop-pachelbel', genre: 'pop', name: 'Pachelbel (D)',
      chords: [
        { root: 'D', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'B', quality: 'min7', bars: 1 },
        { root: 'F#', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
      ],
    },

    // ─── Blues ─────────────────────────────────────────────────────────────
    {
      id: 'blues-12-E', genre: 'blues', name: '12 bar blues en E',
      chords: [
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'B', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'B', quality: 'dom7', bars: 1 },
      ],
    },
    {
      id: 'blues-slow-A', genre: 'blues', name: 'Slow blues en A',
      chords: [
        { root: 'A', quality: 'dom7', bars: 4 },
        { root: 'D', quality: 'dom7', bars: 2 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 2 },
      ],
    },

    // ─── Bossa ─────────────────────────────────────────────────────────────
    {
      id: 'bossa-ii-V-I', genre: 'bossa', name: 'Bossa ii–V–I (Bb)',
      chords: [
        { root: 'C', quality: 'min7', bars: 2 },
        { root: 'F', quality: 'dom7', bars: 2 },
        { root: 'A#', quality: 'maj7', bars: 4 },
      ],
    },
    {
      id: 'bossa-girl-ipanema', genre: 'bossa', name: 'Garota de Ipanema (F)',
      chords: [
        { root: 'F', quality: 'maj7', bars: 2 },
        { root: 'G', quality: 'dom7', bars: 2 },
        { root: 'G', quality: 'min7', bars: 2 },
        { root: 'F', quality: 'maj7', bars: 2 },
      ],
    },

    // ─── Funk ──────────────────────────────────────────────────────────────
    {
      id: 'funk-vamp-Dm', genre: 'funk', name: 'Funk Im7–IV7 vamp (Dm)',
      chords: [
        { root: 'D', quality: 'min7', bars: 2 },
        { root: 'G', quality: 'dom7', bars: 2 },
      ],
    },
    {
      id: 'funk-jb', genre: 'funk', name: 'JB vamp (E7#9)',
      chords: [
        { root: 'E', quality: 'dom7', bars: 4 },
      ],
    },
  ];

  const GENRES = [
    { id: 'jazz',  label: 'Jazz' },
    { id: 'pop',   label: 'Pop / Rock' },
    { id: 'blues', label: 'Blues' },
    { id: 'bossa', label: 'Bossa' },
    { id: 'funk',  label: 'Funk' },
  ];

  function byId(id) { return PRESETS.find(p => p.id === id) || null; }
  function byGenre(genre) { return PRESETS.filter(p => p.genre === genre); }

  W.AtlasPresets = { PRESETS, GENRES, byId, byGenre };

})(typeof window !== 'undefined' ? window : globalThis);
