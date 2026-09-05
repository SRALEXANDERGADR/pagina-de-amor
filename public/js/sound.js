/**
 * Motor de sonido: efectos generados con Web Audio API (sin archivos externos)
 * y una música de fondo ambiental generativa y suave.
 */
const LoveSound = (() => {
  let ctx = null;
  let musicNodes = null;
  let musicPlaying = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function envGain(node, start, peak, end, t0, attack, decay) {
    node.gain.setValueAtTime(start, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + attack);
    node.gain.exponentialRampToValueAtTime(Math.max(end, 0.0001), t0 + attack + decay);
  }

  function tone({ freq = 440, type = "sine", duration = 0.3, gain = 0.2, glideTo = null, delay = 0 }) {
    const c = getCtx();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    envGain(amp, 0.0001, gain, 0.0001, t0, duration * 0.15, duration * 0.85);
    osc.connect(amp).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function chord(freqs, opts = {}) {
    freqs.forEach((f, i) => tone({ ...opts, freq: f, delay: (opts.delay || 0) + i * (opts.stagger ?? 0.05) }));
  }

  return {
    // sobre / carta que se abre
    open() {
      chord([523.25, 659.25, 783.99], { type: "sine", duration: 0.5, gain: 0.16, stagger: 0.06 });
    },
    // click genérico suave
    click() {
      tone({ freq: 880, type: "sine", duration: 0.12, gain: 0.12 });
    },
    // vale canjeado
    redeem() {
      chord([392, 523.25, 659.25], { type: "triangle", duration: 0.35, gain: 0.14, stagger: 0.05 });
    },
    // giro de ruleta (tick corto, se puede repetir)
    tick() {
      tone({ freq: 700, type: "square", duration: 0.04, gain: 0.05 });
    },
    // el resultado de la ruleta
    reveal() {
      chord([440, 554.37, 659.25, 880], { type: "sine", duration: 0.6, gain: 0.15, stagger: 0.07 });
    },
    // botón "no" esquiva
    dodge() {
      tone({ freq: 300, type: "sawtooth", duration: 0.15, gain: 0.06, glideTo: 220 });
    },
    // gran respuesta "sí"
    celebrate() {
      chord([523.25, 659.25, 783.99, 1046.5], { type: "sine", duration: 0.8, gain: 0.18, stagger: 0.08 });
      setTimeout(() => chord([659.25, 830.61, 987.77], { type: "sine", duration: 0.7, gain: 0.14, stagger: 0.06 }), 220);
    },

    isMusicPlaying() { return musicPlaying; },

    toggleMusic() {
      if (musicPlaying) { this.stopMusic(); } else { this.startMusic(); }
      return musicPlaying;
    },

    startMusic() {
      const c = getCtx();
      const master = c.createGain();
      master.gain.value = 0.0001;
      master.connect(c.destination);
      master.gain.linearRampToValueAtTime(0.08, c.currentTime + 1.5);

      // pad ambiental: acordes suaves en loop lento
      const notes = [261.63, 329.63, 392.0, 523.25]; // C E G C
      const oscs = notes.map((f, i) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.value = 0.5 / notes.length;
        osc.connect(g).connect(master);
        osc.start();
        // leve vibrato/movimiento entre notas para que respire
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = 0.05 + i * 0.01;
        lfoGain.gain.value = 2;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start();
        return { osc, lfo };
      });

      musicNodes = { master, oscs };
      musicPlaying = true;
    },

    stopMusic() {
      if (!musicNodes) { musicPlaying = false; return; }
      const c = getCtx();
      const { master, oscs } = musicNodes;
      master.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.8);
      setTimeout(() => {
        oscs.forEach(({ osc, lfo }) => { try { osc.stop(); lfo.stop(); } catch (e) {} });
      }, 900);
      musicNodes = null;
      musicPlaying = false;
    }
  };
})();
