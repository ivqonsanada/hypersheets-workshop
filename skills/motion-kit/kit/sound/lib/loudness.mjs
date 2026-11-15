// Loudness and peaks measured the way broadcast does it (ITU-R BS.1770-4), at 48 kHz, plus a
// look-ahead limiter. ffmpeg's ebur128 is the referee: mix.mjs checks these numbers against it.
import { biquad, toDb, fromDb, RATE } from "./dsp.mjs";

const SHELF = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
const HIGHPASS = [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621];
export const kWeight = (x) => biquad(biquad(x, SHELF), HIGHPASS);

// Mean square of each 400 ms block, 100 ms apart, summed over channels.
function blocks(channels) {
  const size = Math.round(0.4 * RATE), hop = Math.round(0.1 * RATE);
  const k = channels.map(kWeight);
  const out = [];
  for (let start = 0; start + size <= k[0].length; start += hop) {
    let sum = 0;
    for (const ch of k) {
      let s = 0;
      for (let i = start; i < start + size; i++) s += ch[i] * ch[i];
      sum += s / size;
    }
    out.push(sum);
  }
  return out;
}
const lufs = (meanSquare) => -0.691 + 10 * Math.log10(meanSquare);

// Integrated loudness in LUFS, with both gates. -Infinity when nothing passes the gate.
export function integrated(channels) {
  const loud = blocks(channels).filter((z) => z > 0 && lufs(z) > -70);
  if (!loud.length) return -Infinity;
  const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length;
  const rel = lufs(mean(loud)) - 10;
  const kept = loud.filter((z) => lufs(z) > rel);
  return kept.length ? lufs(mean(kept)) : -Infinity;
}

// How loud a short sound is at its loudest: the highest K-weighted level over any 50 ms.
export function shortLevel(x) {
  const k = kWeight(x), w = Math.min(k.length, Math.round(0.05 * RATE));
  let run = 0, best = 0;
  for (let i = 0; i < k.length; i++) {
    run += k[i] * k[i];
    if (i >= w) run -= k[i - w] * k[i - w];
    if (i >= w - 1 && run > best) best = run;
  }
  return best > 0 ? 10 * Math.log10(best / w) : -Infinity;
}

// 48 taps for each of the three points between two samples (4x oversampling). Shorter filters
// read bright sounds up to 0.4 dB too low.
const HALF = 24;
const TAPS = [1, 2, 3].map((p) => {
  const row = [];
  for (let k = -HALF + 1; k <= HALF; k++) {
    const d = k - p / 4, a = Math.PI * d, u = d / (HALF + 0.5);
    row.push((Math.sin(a) / a) * (0.42 + 0.5 * Math.cos(Math.PI * u) + 0.08 * Math.cos(2 * Math.PI * u)));
  }
  return row;
});

// The highest level the waveform reaches at or between samples, per sample, over all channels.
// Between-sample points are worked out only near samples above `floor`: quieter stretches
// cannot hold a peak that matters, and skipping them keeps a long mix fast.
export function peakTrace(channels, floor = 0) {
  const n = channels[0].length, out = new Float32Array(n);
  for (const x of channels) {
    for (let i = 0; i < n; i++) {
      let m = Math.abs(x[i]);
      const near = Math.max(m, Math.abs(x[i + 1] || 0), Math.abs(x[i - 1] || 0), Math.abs(x[i + 2] || 0));
      if (near > floor) {
        for (const row of TAPS) {
          let s = 0;
          for (let j = 0; j < 2 * HALF; j++) { const k = i + j - HALF + 1; if (k >= 0 && k < n) s += x[k] * row[j]; }
          const a = Math.abs(s);
          if (a > m) m = a;
        }
      }
      if (m > out[i]) out[i] = m;
      if (i + 1 < n && m > out[i + 1]) out[i + 1] = m;
    }
  }
  return out;
}

export function truePeakDb(channels) {
  let top = 0;
  for (const x of channels) for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > top) top = a; }
  const t = peakTrace(channels, top / 2);
  let m = 0;
  for (let i = 0; i < t.length; i++) if (t[i] > m) m = t[i];
  return toDb(m);
}

// Turns down only the moments that would pass the ceiling: sees 3 ms ahead, lets go over 80 ms.
// Returns the limited channels and the deepest cut in dB (0 when nothing was touched).
export function limit(channels, ceilingDb) {
  const ceil = fromDb(ceilingDb), n = channels[0].length;
  const trace = peakTrace(channels, ceil / 2);
  const look = Math.round(0.003 * RATE);
  const need = new Float32Array(n);
  let touched = false;
  for (let i = 0; i < n; i++) { need[i] = trace[i] > ceil ? ceil / trace[i] : 1; if (need[i] < 1) touched = true; }
  if (!touched) return { channels, cutDb: 0 };
  // The lowest gain needed in the next `look` samples, then its average over the last `look`.
  const ahead = new Float32Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tail > head && need[queue[tail - 1]] >= need[i]) tail--;
    queue[tail++] = i;
    while (queue[head] > i + look) head++;
    ahead[i] = need[queue[head]];
  }
  const gain = new Float32Array(n);
  const release = 1 - Math.exp(-1 / (0.08 * RATE));
  let run = 0, prev = 1, deepest = 1;
  for (let i = 0; i < n; i++) {
    run += ahead[i];
    if (i >= look) run -= ahead[i - look];
    const avg = run / Math.min(i + 1, look);
    const g = Math.min(avg, prev + (1 - prev) * release);
    gain[i] = g; prev = g;
    if (g < deepest) deepest = g;
  }
  const out = channels.map((x) => {
    const y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = x[i] * gain[i];
    return y;
  });
  return { channels: out, cutDb: toDb(deepest) };
}
