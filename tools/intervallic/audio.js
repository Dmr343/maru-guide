// Web Audio sintetizador minimalista. N osciladores triangle, env attack/release.
(function (W) {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // MIDI absoluto por cuerda abierta
  const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function playPositions(positions, opts) {
    const o = opts || {};
    const c = getCtx();
    const now = c.currentTime;
    const dur = o.duration || 1.2;
    const attack = o.attack || 0.05;
    const release = o.release || 0.5;
    const gain = o.gain || 0.12;

    const seen = new Set();
    positions.forEach(p => {
      const midi = OPEN_MIDI[p.string] + p.fret;
      if (seen.has(midi)) return;
      seen.add(midi);
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(midi);
      const g = c.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + attack);
      g.gain.setValueAtTime(gain, now + dur - release);
      g.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(g).connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });
  }

  function click(opts) {
    const o = opts || {};
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = o.accent ? 1400 : 900;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.005);
    g.gain.linearRampToValueAtTime(0, now + 0.06);
    osc.connect(g).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  W.IntervallicAudio = { playPositions, click, getCtx };
})(window);
