// Measures every sound in a folder so palette picks rest on numbers, not on a guess:
//   node dev/analyze.mjs <folder with .ogg/.wav> > features.tsv
// Columns: file, seconds, attack ms (10% to 90% of the peak), decay ms (peak to -20 dB),
// centroid Hz, share of energy under 250 Hz and over 4 kHz, flatness (1 = noise, 0 = one tone).
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decode } from "../lib/ffmpeg.mjs";
import { RATE, peak, soundingRange, spectrum, envelope } from "../lib/dsp.mjs";

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ogg|wav|flac|mp3)$/i.test(name)) out.push(p);
  }
  return out;
}

export function features(x) {
  const [a, b] = soundingRange(x, -40, 0.001, 0.005);
  const s = x.subarray(a, b);
  const pk = peak(s);
  const env = envelope(s, 0.004, 0.001);
  const top = Math.max(...env);
  const iTop = env.indexOf(top);
  let i10 = 0; while (i10 < env.length && env[i10] < top * 0.1) i10++;
  let i90 = i10; while (i90 < env.length && env[i90] < top * 0.9) i90++;
  let iEnd = iTop; while (iEnd < env.length && env[iEnd] > top * 0.1) iEnd++;
  const N = 2048;
  const sum = new Float64Array(N / 2);
  let frames = 0;
  for (let o = 0; o + N <= s.length || frames === 0; o += N / 2) {
    const frame = new Float32Array(N);
    frame.set(s.subarray(o, Math.min(s.length, o + N)));
    const m = spectrum(frame);
    for (let k = 0; k < N / 2; k++) sum[k] += m[k] * m[k];
    frames++;
    if (o + N >= s.length) break;
  }
  let tot = 0, cen = 0, low = 0, high = 0, logSum = 0, bins = 0;
  for (let k = 1; k < N / 2; k++) {
    const f = (k * RATE) / N, e = sum[k];
    tot += e; cen += f * e;
    if (f < 250) low += e;
    if (f > 4000) high += e;
    if (f > 100 && f < 12000) { logSum += Math.log(e + 1e-20); bins++; }
  }
  let mid = 0;
  for (let k = 1; k < N / 2; k++) { const f = (k * RATE) / N; if (f > 100 && f < 12000) mid += sum[k]; }
  const flat = Math.exp(logSum / bins) / (mid / bins + 1e-20);
  return { seconds: s.length / RATE, attackMs: i90 - i10, decayMs: iEnd - iTop, centroid: cen / tot, low: low / tot, high: high / tot, flat, peak: pk };
}

if (process.argv[1] && process.argv[1].endsWith("analyze.mjs")) {
  const root = process.argv[2];
  console.log(["file", "sec", "attack_ms", "decay_ms", "centroid", "low", "high", "flat"].join("\t"));
  for (const f of walk(root)) {
    const [l, r] = decode(f);
    const mono = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
    const m = features(mono);
    console.log([relative(root, f), m.seconds.toFixed(3), m.attackMs, m.decayMs, Math.round(m.centroid), m.low.toFixed(2), m.high.toFixed(2), m.flat.toFixed(3)].join("\t"));
  }
}
