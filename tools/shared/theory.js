// Music theory primitives — works as plain script (file:// safe).
// Attaches all exports to window.GuitarShared.theory.
// To consume: const { CHROMATIC, buildScale, ... } = window.GuitarShared.theory;
(function (G) {
  const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const MAJOR_STEPS           = [2,2,1,2,2,2,1];
  const MINOR_STEPS           = [2,1,2,2,1,2,2];
  const PENTATONIC_MAJOR_STEPS = [2,2,3,2,3];
  const PENTATONIC_MINOR_STEPS = [3,2,2,3,2];
  const MIXOLYDIAN_STEPS      = [2,2,1,2,2,1,2];
  const DORIAN_STEPS          = [2,1,2,2,2,1,2];

  const NOTE_HUES = {
    C:0, 'C#':30, D:60, 'D#':90, E:120, F:150,
    'F#':180, G:210, 'G#':240, A:270, 'A#':300, B:330,
  };

  function chordColor(root, quality) {
    const hue = NOTE_HUES[root] ?? 0;
    if (quality === 'major') return `hsl(${hue},75%,60%)`;
    if (quality === 'minor') return `hsl(${hue},60%,56%)`;
    if (quality === 'dim')   return `hsl(${hue},40%,52%)`;
    return `hsl(${hue},75%,60%)`;
  }

  function buildScale(root, scaleType) {
    const stepsMap = {
      major:      MAJOR_STEPS,
      minor:      MINOR_STEPS,
      pent_major: PENTATONIC_MAJOR_STEPS,
      pent_minor: PENTATONIC_MINOR_STEPS,
      mixolydian: MIXOLYDIAN_STEPS,
      dorian:     DORIAN_STEPS,
    };
    const steps = stepsMap[scaleType];
    if (!steps) return [];
    let cur = CHROMATIC.indexOf(root);
    const notes = [root];
    steps.slice(0, steps.length - 1).forEach(s => {
      cur = (cur + s) % 12;
      notes.push(CHROMATIC[cur]);
    });
    return notes;
  }

  const CHORD_SEMITONES = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dom7:  [0, 4, 7, 10],
    maj7:  [0, 4, 7, 11],
    min7:  [0, 3, 7, 10],
  };

  const CHORD_INTERVALS = {
    major: ['1', '3', '5'],
    minor: ['1', 'b3', '5'],
    dom7:  ['1', '3', '5', 'b7'],
    maj7:  ['1', '3', '5', '7'],
    min7:  ['1', 'b3', '5', 'b7'],
  };

  function buildChord(root, quality) {
    const ri = CHROMATIC.indexOf(root);
    const semitones = CHORD_SEMITONES[quality] || CHORD_SEMITONES.major;
    const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.major;
    const notes = semitones.map(s => CHROMATIC[(ri + s) % 12]);
    return { root, quality, notes, intervals };
  }

  // Nombre del intervalo cromático desde rootNote a targetNote.
  // Devuelve '1','b2','2','b3','3','4','b5','5','b6','6','b7','7'.
  const INTERVAL_NAMES = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
  function intervalFromRoot(rootNote, targetNote) {
    const ri = CHROMATIC.indexOf(rootNote);
    const ti = CHROMATIC.indexOf(targetNote);
    if (ri < 0 || ti < 0) return null;
    return INTERVAL_NAMES[(ti - ri + 12) % 12];
  }

  function intervalToFunction(interval) {
    if (interval === '1')                      return 'R';
    if (interval === '3' || interval === 'b3') return '3';
    if (interval === '5' || interval === 'b5') return '5';
    if (interval === '7' || interval === 'b7') return '7';
    return null;
  }

  // CAGED open-chord root index in CHROMATIC for each shape
  const CAGED_OPEN = { C: 0, A: 9, G: 7, E: 4, D: 2 };

  // Shape colors for Mode 1/2 (learning shapes): C=green A=blue G=yellow E=red D=purple
  const CAGED_COLORS = {
    C: '#2ecc71', A: '#3498db', G: '#f1c40f', E: '#e74c3c', D: '#9b59b6',
  };

  // Functional tone colors for Modes 3/4 (improvisation)
  const FUNC_COLORS = {
    R: '#d4a847', '3': '#e67e22', '5': '#3498db', '7': '#2ecc71',
  };

  function cagedShapeFor(root) {
    const ri = CHROMATIC.indexOf(root);
    return ['C', 'A', 'G', 'E', 'D'].map(shape => {
      const oi = CAGED_OPEN[shape];
      let barre = (ri - oi + 12) % 12;
      if (barre === 0) barre = 12;
      const fretRange = [barre, Math.min(barre + 4, 15)];
      return { shape, barre, fretRange };
    });
  }

  function fretsForCagedShape(shape, root) {
    const ri = CHROMATIC.indexOf(root);
    const oi = CAGED_OPEN[shape];
    let barre = (ri - oi + 12) % 12;
    if (barre === 0) barre = 12;
    return [barre, Math.min(barre + 4, 15)];
  }

  const QUALITY_LABELS = {
    major: 'Mayor', minor: 'Menor', dom7: '7', maj7: 'maj7', min7: 'm7',
  };

  const QUALITY_SUFFIX = {
    major: '', minor: 'm', dom7: '7', maj7: 'maj7', min7: 'm7',
  };

  function chordName(root, quality) {
    return root + (QUALITY_SUFFIX[quality] || '');
  }

  // Returns the set of note names shared between two chords. Used by Modo 4
  // to highlight "anchor" notes when navigating progressions.
  function commonChordTones(chordA, chordB) {
    if (!chordA || !chordB || !chordA.notes || !chordB.notes) return new Set();
    const inB = new Set(chordB.notes);
    return new Set(chordA.notes.filter(n => inB.has(n)));
  }

  // Default scale (for improvisation overlay) per chord quality.
  const DEFAULT_SCALE_BY_QUALITY = {
    major: 'pent_major',
    minor: 'pent_minor',
    dom7:  'mixolydian',
    maj7:  'major',
    min7:  'minor',
  };

  // Picks the scale to overlay over a chord. When opts.scaleAuto is true
  // (or no manual scale given), falls back to the calidad-based default.
  function pickScaleForChord(quality, opts) {
    const o = opts || {};
    if (!o.scaleAuto && o.scale) return o.scale;
    return DEFAULT_SCALE_BY_QUALITY[quality] || 'major';
  }

  // Advance to next chord in a progression. Always +1 from current
  // (not a stateful counter), so manual jumps don't desync auto-play.
  function advanceChord(currentIdx, totalChords) {
    if (!totalChords || totalChords <= 0) return 0;
    return ((currentIdx + 1) % totalChords + totalChords) % totalChords;
  }

  G.theory = {
    CHROMATIC, MAJOR_STEPS, MINOR_STEPS,
    PENTATONIC_MAJOR_STEPS, PENTATONIC_MINOR_STEPS,
    MIXOLYDIAN_STEPS, DORIAN_STEPS,
    CAGED_COLORS, FUNC_COLORS, QUALITY_LABELS, QUALITY_SUFFIX,
    INTERVAL_NAMES,
    chordColor, buildScale, buildChord, intervalToFunction, intervalFromRoot,
    cagedShapeFor, fretsForCagedShape, chordName,
    commonChordTones, pickScaleForChord, advanceChord,
  };
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
