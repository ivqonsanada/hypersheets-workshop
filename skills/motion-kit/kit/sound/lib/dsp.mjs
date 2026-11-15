// Small signal tools on Float32Array, all at one sample rate unless a function says otherwise.
export const RATE = 48000;
export const toDb = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
export const fromDb = (d) => Math.pow(10, d / 20);

export function peak(x) {
  let m = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; }
  return m;
}

export function rms(x, from = 0, to = x.length) {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

export function scale(x, g) {
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g;
  return y;
}

// One biquad section, direct form 1; c = [b0, b1, b2, a1, a2] with a0 = 1.
export function biquad(x, c) {
  const [b0, b1, b2, a1, a2] = c;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// Audio EQ cookbook filters (R. Bristow-Johnson).
export function coef(kind, freq, q = 0.7071, gainDb = 0, rate = RATE) {
  const w = (2 * Math.PI * freq) / rate, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (kind === "lowpass") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (kind === "highpass") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (kind === "bandpass") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (kind === "peak") { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
  else if (kind === "lowshelf") {
    const r = 2 * Math.sqrt(A) * al;
    b0 = A * (A + 1 - (A - 1) * cs + r); b1 = 2 * A * (A - 1 - (A + 1) * cs); b2 = A * (A + 1 - (A - 1) * cs - r);
    a0 = A + 1 + (A - 1) * cs + r; a1 = -2 * (A - 1 + (A + 1) * cs); a2 = A + 1 + (A - 1) * cs - r;
  } else if (kind === "highshelf") {
    const r = 2 * Math.sqrt(A) * al;
    b0 = A * (A + 1 + (A - 1) * cs + r); b1 = -2 * A * (A - 1 + (A + 1) * cs); b2 = A * (A + 1 + (A - 1) * cs - r);
    a0 = A + 1 - (A - 1) * cs + r; a1 = 2 * (A - 1 - (A + 1) * cs); a2 = A + 1 - (A - 1) * cs - r;
  } else throw new Error(`unknown filter ${kind}`);
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

export const filter = (x, kind, freq, q, gainDb, rate) => biquad(x, coef(kind, freq, q, gainDb, rate));

// Windowed-sinc resampling for any ratio. `step` input samples per output sample.
export function resample(x, fromRate, toRate) {
  if (fromRate === toRate) return Float32Array.from(x);
  const step = fromRate / toRate;
  const cut = Math.min(1, toRate / fromRate) * 0.96;
  const half = Math.ceil(16 / cut);
  const n = Math.floor(x.length / step);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i * step, c = Math.floor(t);
    let s = 0;
    for (let k = c - half + 1; k <= c + half; k++) {
      if (k < 0 || k >= x.length) continue;
      const d = t - k, u = d / half;
      const win = 0.42 + 0.5 * Math.cos(Math.PI * u) + 0.08 * Math.cos(2 * Math.PI * u);
      const a = Math.PI * d * cut;
      s += x[k] * (a === 0 ? 1 : Math.sin(a) / a) * win * cut;
    }
    y[i] = s;
  }
  return y;
}

// Faster or slower playback (pitch and length change together), for small variations.
export const speed = (x, rate) => (rate === 1 ? x : resample(x, RATE * rate, RATE));

export function fade(x, inSec, outSec, rate = RATE) {
  const y = Float32Array.from(x);
  const a = Math.min(y.length, Math.round(inSec * rate)), b = Math.min(y.length, Math.round(outSec * rate));
  for (let i = 0; i < a; i++) y[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  for (let i = 0; i < b; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
  return y;
}

// Level over time: RMS in windows of `win` seconds, one value per hop.
export function envelope(x, win = 0.02, hop = 0.01, rate = RATE) {
  const w = Math.max(1, Math.round(win * rate)), h = Math.max(1, Math.round(hop * rate));
  const out = [];
  for (let i = 0; i + w <= x.length; i += h) out.push(rms(x, i, i + w));
  return out;
}

// First and last sample louder than `floorDb` below the peak, with a little room kept.
export function soundingRange(x, floorDb = -45, padIn = 0.002, padOut = 0.03, rate = RATE) {
  const th = peak(x) * fromDb(floorDb);
  let a = 0, b = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < th) a++;
  while (b > a && Math.abs(x[b]) < th) b--;
  return [Math.max(0, a - Math.round(padIn * rate)), Math.min(x.length, b + 1 + Math.round(padOut * rate))];
}

// Radix-2 FFT magnitude spectrum of a Hann-windowed frame (length a power of two).
export function spectrum(frame) {
  const n = frame.length, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      }
    }
  }
  const mag = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}
