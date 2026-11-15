// The only place that starts ffmpeg: finding it, decoding any file to 48 kHz, and measuring.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { RATE } from "./dsp.mjs";

// Where a command lives on PATH, or null. Windows also tries .exe, .cmd and .bat.
export function which(cmd) {
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const p = join(dir, cmd + ext);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

export const ffmpegPath = () => process.env.HS_FFMPEG || which("ffmpeg");

export function ffmpegVersion() {
  const bin = ffmpegPath();
  if (!bin) return null;
  const r = spawnSync(bin, ["-version"], { encoding: "utf8" });
  const m = /ffmpeg version (\S+)/.exec(r.stdout || "");
  return m ? m[1] : null;
}

// Any audio file as stereo 48 kHz floats. `seconds` stops the decode early.
export function decode(file, seconds = 0) {
  const bin = ffmpegPath();
  if (!bin) throw new Error(`ffmpeg is not installed, and ${file} is not a 48 kHz WAV: install ffmpeg, or save the file as 48 kHz WAV.`);
  const args = ["-v", "error", "-nostdin", "-i", file, "-vn", "-ac", "2", "-ar", String(RATE), "-f", "f32le"];
  if (seconds > 0) args.push("-t", String(seconds));
  args.push("-");
  const r = spawnSync(bin, args, { maxBuffer: 1 << 30 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < 8) {
    throw new Error(`ffmpeg could not read ${file}: check that it is an audio file (${String(r.stderr || "").trim().split("\n").pop()}).`);
  }
  const all = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 8) * 2);
  const frames = all.length / 2;
  const left = new Float32Array(frames), right = new Float32Array(frames);
  for (let i = 0; i < frames; i++) { left[i] = all[2 * i]; right[i] = all[2 * i + 1]; }
  return [left, right];
}

// ffmpeg's own loudness reading of a file: { lufs, truePeakDb, lra }, or null without ffmpeg.
export function measure(file) {
  const bin = ffmpegPath();
  if (!bin) return null;
  const r = spawnSync(bin, ["-hide_banner", "-nostats", "-nostdin", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const tail = (r.stderr || "").split("Summary:").pop();
  const num = (re) => { const m = re.exec(tail); return m ? (m[1] === "-inf" ? -Infinity : Number(m[1])) : null; };
  const lufs = num(/I:\s+(-?[\d.]+|-inf) LUFS/);
  if (lufs === null) return null;
  return { lufs, truePeakDb: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/), lra: num(/LRA:\s+(-?[\d.]+|-inf) LU/) };
}
