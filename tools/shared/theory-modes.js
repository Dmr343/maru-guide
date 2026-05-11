// Extends GuitarShared.theory with modes, dim/m7b5 chords, and diatonic chord generation.
// Must load AFTER theory.js. Compatible with file://.
(function (G) {
  const CHROMATIC = G.theory.CHROMATIC;

  const MODE_STEPS = {
    harmonic_minor: [2,1,2,2,1,3,1],
    melodic_minor:  [2,1,2,2,2,2,1],
    phrygian:       [1,2,2,2,1,2,2],
    lydian:         [2,2,2,1,2,2,1],
    locrian:        [1,2,2,1,2,2,2],
  };

  const EXTENDED_SEMITONES = {
    dim:  [0,3,6],
    m7b5: [0,3,6,10],
    aug:  [0,4,8],
    dim7: [0,3,6,9],
  };
  const EXTENDED_INTERVALS = {
    dim:  ['1','b3','b5'],
    m7b5: ['1','b3','b5','b7'],
    aug:  ['1','3','#5'],
    dim7: ['1','b3','b5','bb7'],
  };

  const origBuildScale = G.theory.buildScale;
  function buildModeScale(root, mode) {
    if (MODE_STEPS[mode]) {
      let cur = CHROMATIC.indexOf(root);
      const notes = [root];
      MODE_STEPS[mode].slice(0, MODE_STEPS[mode].length - 1).forEach(s => {
        cur = (cur + s) % 12;
        notes.push(CHROMATIC[cur]);
      });
      return notes;
    }
    return origBuildScale(root, mode);
  }

  const origBuildChord = G.theory.buildChord;
  function buildChord(root, quality) {
    if (EXTENDED_SEMITONES[quality]) {
      const ri = CHROMATIC.indexOf(root);
      return {
        root, quality,
        notes:     EXTENDED_SEMITONES[quality].map(s => CHROMATIC[(ri + s) % 12]),
        intervals: EXTENDED_INTERVALS[quality],
      };
    }
    return origBuildChord(root, quality);
  }

  function _qualityFromIntervals(thirdSemi, fifthSemi) {
    if (thirdSemi === 4 && fifthSemi === 7) return 'major';
    if (thirdSemi === 3 && fifthSemi === 7) return 'minor';
    if (thirdSemi === 3 && fifthSemi === 6) return 'dim';
    if (thirdSemi === 4 && fifthSemi === 8) return 'aug';
    return 'major';
  }

  const NUMERALS = ['I','II','III','IV','V','VI','VII'];
  function _numeral(i, quality) {
    const n = NUMERALS[i];
    if (quality === 'dim' || quality === 'minor') return n.toLowerCase() + (quality === 'dim' ? '°' : '');
    if (quality === 'aug') return n + '+';
    return n;
  }

  function getDiatonicChords(root, mode) {
    const scale = buildModeScale(root, mode);
    return scale.map((note, i) => {
      const third = scale[(i + 2) % 7];
      const fifth  = scale[(i + 4) % 7];
      const ri = CHROMATIC.indexOf(note);
      const thirdSemi = (CHROMATIC.indexOf(third) - ri + 12) % 12;
      const fifthSemi = (CHROMATIC.indexOf(fifth) - ri + 12) % 12;
      const quality   = _qualityFromIntervals(thirdSemi, fifthSemi);
      return { degree: i + 1, numeral: _numeral(i, quality), chord: buildChord(note, quality) };
    });
  }

  Object.assign(G.theory, {
    buildModeScale,
    buildChord,
    getDiatonicChords,
    MODE_STEPS,
    EXTENDED_SEMITONES,
    EXTENDED_INTERVALS,
  });

})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
