// A small 8-bit style synthesiser in the spirit of sfxr (DrPetter, 2007): one oscillator, a
// pitch slide, an optional jump, vibrato, a duty sweep and a punchy envelope. Written for this
// kit; no sfxr code is used. Everything is seeded, so a sound renders the same on any computer.
import { RATE, coef } from "../lib/dsp.mjs";
import { rng } from "../lib/rng.mjs";

const OVER = 8;

// p: { wave, freq, slide (octaves/s), duty, dutySweep (/s), vib: [depth octaves, Hz],
//      jump: [ratio, at s], attack, hold, decay (s), punch, lowpass, highpass (Hz), steps, seed }
export function chip(p) {
  const total = (p.attack || 0) + (p.hold || 0) + p.decay;
  const n = Math.round(total * RATE);
  const out = new Float32Array(n);
  const rand = rng(p.seed || 1);
  const noise = Float32Array.from({ length: 32 }, () => rand() * 2 - 1);
  let phase = 0, lp = 0, hpPrev = 0, hpOut = 0;
  const lpK = p.lowpass ? 1 - Math.exp((-2 * Math.PI * p.lowpass) / (RATE * OVER)) : 1;
  const hpK = p.highpass ? Math.exp((-2 * Math.PI * p.highpass) / (RATE * OVER)) : 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let f = p.freq * Math.pow(2, (p.slide || 0) * t);
    if (p.jump && t >= p.jump[1]) f *= p.jump[0];
    if (p.vib) f *= Math.pow(2, p.vib[0] * Math.sin(2 * Math.PI * p.vib[1] * t));
    f = Math.max(20, Math.min(f, 16000));
    const duty = Math.max(0.05, Math.min(0.95, (p.duty ?? 0.5) + (p.dutySweep || 0) * t));
    let acc = 0;
    for (let s = 0; s < OVER; s++) {
      phase += f / (RATE * OVER);
      if (phase >= 1) {
        phase -= 1;
        if (p.wave === "noise") for (let k = 0; k < 32; k++) noise[k] = rand() * 2 - 1;
      }
      let v;
      if (p.wave === "square") v = phase < duty ? 0.5 : -0.5;
      else if (p.wave === "saw") v = 1 - 2 * phase;
      else if (p.wave === "tri") v = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
      else if (p.wave === "sine") v = Math.sin(2 * Math.PI * phase);
      else v = noise[Math.floor(phase * 32) & 31];
      lp += (v - lp) * lpK;
      v = lp;
      if (hpK) { hpOut = hpK * (hpOut + v - hpPrev); hpPrev = v; v = hpOut; }
      acc += v;
    }
    let env;
    if (t < (p.attack || 0)) env = t / p.attack;
    else if (t < (p.attack || 0) + (p.hold || 0)) env = 1 + (p.punch || 0) * (1 - (t - (p.attack || 0)) / p.hold);
    else env = 1 - (t - (p.attack || 0) - (p.hold || 0)) / p.decay;
    let v = (acc / OVER) * Math.max(0, env);
    if (p.steps) v = Math.round(v * p.steps) / p.steps;
    out[i] = v;
  }
  return out;
}

// A whoosh from filtered noise: the band rises to its peak and falls away while the level
// swells and dies. p: { seconds, peakAt (0..1), from, top, to (Hz), q, tilt (dB, + is brighter), seed }
export function whoosh(p) {
  const n = Math.round(p.seconds * RATE), out = new Float32Array(n);
  const rand = rng(p.seed || 1);
  const at = Math.round(n * p.peakAt);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, c = null, low = 0;
  const tilt = Math.pow(10, (p.tilt || 0) / 20);
  for (let i = 0; i < n; i++) {
    if (i % 24 === 0) {
      const u = i < at ? i / at : (i - at) / (n - at);
      const f = i < at ? p.from * Math.pow(p.top / p.from, u * u) : p.top * Math.pow(p.to / p.top, u);
      c = coef("bandpass", f, p.q);
    }
    const white = rand() * 2 - 1;
    low += (white - low) * 0.12;
    const x = low + (white - low) * tilt;
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    const env = i < at ? Math.pow(Math.sin((Math.PI / 2) * (i / at)), 2.4) : Math.pow(1 - (i - at) / (n - at), 2.2);
    out[i] = y * env;
  }
  return out;
}
