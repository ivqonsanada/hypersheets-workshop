#!/usr/bin/env node
// Mixes the sound of one video: sound effects from video/cues.json, the spoken lines in
// video/voice/ and the storyboard's music, into video/assets/audio/mix.wav.
//
//   node mix.mjs <video folder> [--palette soft|paper|pixel|bold] [--seed 1]
//                [--no-sfx] [--no-voice] [--no-music] [--music file] [--lufs -16] [--peak -1.5]
//   node mix.mjs <video folder> --check     says whether mix.wav still matches the timeline
//
// The video builder (kit/build.mjs) calls mixVideo() itself on every build, so nobody has to
// run this by hand; the command is here for looking at one mix closely.
// The same input gives the same file, byte for byte. Sound effects need only Node; ffmpeg is
// used to read music and voice files that are not 48 kHz WAV, and to measure the result.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, fromDb, toDb, peak, speed, resample } from "./lib/dsp.mjs";
import { integrated, truePeakDb, limit } from "./lib/loudness.mjs";
import { readWav, wavBuffer } from "./lib/wav.mjs";
import { decode, measure, ffmpegPath } from "./lib/ffmpeg.mjs";
import { hash32, rng } from "./lib/rng.mjs";
import { args, exitWith, openVideo, checkCues, sceneStarts, readJson, voiceTakes } from "./lib/project.mjs";

const KIT = dirname(fileURLToPath(import.meta.url));
const SFX = join(KIT, "sfx");

// Levels in dB, on top of the palette's own levelling (see dev/build-sfx.mjs).
const TYPE_DB = { land: 0, press: -1, cut: -3, marker: -2, whoosh: -2, type: -4, count: -3 };
const WEIGHT_DB = { 1: -6, 2: -3, 3: 0 };
const HITS = ["land", "press", "cut", "marker"];
const NEAR = 0.12; // two hits closer than this would blur into one bang
const VOICE_LEAD = 0.3; // a line starts this long after its scene, once the cover has lifted
const VOICE_LUFS = -17, MUSIC_LUFS = -22;
const DUCK = { music: -8, sfx: -3 }; // while someone is speaking
const r3 = (v) => Math.round(v * 1000) / 1000;
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

export function pickPalette(manifest, look, asked) {
  const has = (n) => n && manifest.palettes[n];
  if (asked) return has(asked) ? { name: asked, why: "asked for" } : null;
  if (has(look)) return { name: look, why: `look "${look}"` };
  if (has(manifest.aliases[look])) return { name: manifest.aliases[look], why: `look "${look}"` };
  return { name: manifest.default, why: look ? `no palette is set for look "${look}"` : "no look given" };
}

function loadPalette(manifest, name) {
  const out = {};
  for (const [type, list] of Object.entries(manifest.palettes[name])) {
    if (!Array.isArray(list)) continue;
    out[type] = list.map((e) => ({ ...e, x: readWav(join(SFX, e.file)).channels[0] }));
  }
  return out;
}

// One channel at 48 kHz from any audio file. WAV needs no ffmpeg.
function loadMono(file) {
  if (/\.wav$/i.test(file)) {
    const w = readWav(file);
    const mono = new Float32Array(w.channels[0].length);
    for (const ch of w.channels) for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / w.channels.length;
    return w.rate === RATE ? mono : resample(mono, w.rate, RATE);
  }
  const [l, r] = decode(file);
  const mono = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
  return mono;
}

function add(bus, x, at, gain) {
  const start = Math.round(at * RATE);
  const end = Math.min(bus.length, start + x.length);
  const cutShort = start + x.length > bus.length;
  const tail = Math.round(0.015 * RATE);
  for (let i = Math.max(0, start); i < end; i++) {
    let v = x[i - start] * gain;
    if (cutShort && end - i < tail) v *= (end - i) / tail;
    bus[i] += v;
  }
}

// 0 where nobody speaks, 1 where someone does, eased over a tenth of a second, one value per 10 ms.
export function speaking(voice) {
  const hop = RATE / 100, n = Math.ceil(voice.length / hop);
  const on = new Float32Array(n);
  const floor = fromDb(-48) ** 2;
  for (let h = 0; h < n; h++) {
    let s = 0;
    const to = Math.min(voice.length, (h + 2) * hop);
    for (let i = h * hop; i < to; i++) s += voice[i] * voice[i];
    if (s / (2 * hop) > floor) for (let k = Math.max(0, h - 12); k <= Math.min(n - 1, h + 25); k++) on[k] = 1;
  }
  const smooth = new Float32Array(n);
  let run = 0;
  for (let h = 0; h < n; h++) {
    run += on[h];
    if (h >= 12) run -= on[h - 12];
    smooth[h] = run / Math.min(h + 1, 12);
  }
  return smooth;
}

export function duck(bus, act, db) {
  const g = fromDb(db), hop = RATE / 100;
  for (let i = 0; i < bus.length; i++) {
    const h = i / hop, a = Math.floor(h), f = h - a;
    const v = (act[a] || 0) * (1 - f) + (act[Math.min(act.length - 1, a + 1)] || 0) * f;
    bus[i] *= 1 - v * (1 - g);
  }
}

// ---------- the sound effects ----------
export function layCues(cues, palette, seed, bus) {
  const rand = rng(hash32(`${seed}|${JSON.stringify(cues.cues.map((q) => [q.t, q.type, q.until ?? null, q.weight ?? null]))}`));
  const order = cues.cues.map((q, i) => ({ ...q, n: i + 1, weight: q.weight || 2 })).sort((a, b) => a.t - b.t || a.n - b.n);
  const last = {};
  const pick = (type, list = palette[type]) => {
    let k = Math.floor(rand() * list.length);
    if (list.length > 1 && last[type] === k) k = (k + 1) % list.length;
    last[type] = k;
    return list[k];
  };
  // Of two hits too close together, the lighter one (or the later one) is turned down.
  const hits = order.filter((q) => HITS.includes(q.type));
  const turnedDown = new Map();
  for (let i = 0; i < hits.length; i++) {
    for (let j = i + 1; j < hits.length && hits[j].t - hits[i].t < NEAR; j++) {
      const loser = hits[j].weight > hits[i].weight ? hits[i] : hits[j];
      const winner = loser === hits[i] ? hits[j] : hits[i];
      if (!turnedDown.has(loser.n)) turnedDown.set(loser.n, winner.n);
    }
  }
  const report = [];
  for (const q of order) {
    const base = TYPE_DB[q.type] + WEIGHT_DB[q.weight];
    const row = { cue: q.n, t: q.t, type: q.type, scene: q.scene ?? null, weight: q.weight };
    if (q.type === "type" || q.type === "count") {
      const span = Math.max(0.08, (q.until ?? q.t + 0.4) - q.t);
      const every = q.type === "type" ? 0.095 : 0.07;
      const count = Math.max(2, Math.round(span / every));
      let played = 0;
      for (let k = 0; k <= count; k++) {
        const u = k / count;
        const jitter = q.type === "type" && k > 0 && k < count ? (rand() - 0.5) * 0.028 : 0;
        // A typist's rhythm has gaps; a counter's does not.
        if (q.type === "type" && k > 0 && k < count && rand() < 0.12) continue;
        const s = pick(q.type);
        const rate = q.type === "count" ? 1 + 0.6 * u : 0.94 + rand() * 0.12;
        const db = base + (q.type === "count" ? -4 + 4 * u : -3 * rand());
        add(bus, speed(s.x, rate), q.t + u * span + jitter, fromDb(db));
        played++;
      }
      row.sounds = palette[q.type].map((s) => s.file);
      row.ticks = played;
      row.until = r3(q.t + span);
      row.gainDb = r1(base);
    } else if (q.type === "whoosh") {
      // A whoosh with an end is centred on its move; one without swells into the next hit.
      const next = q.until == null ? order.find((h) => HITS.includes(h.type) && h.t > q.t && h.t <= q.t + 0.7) : null;
      const list = palette.whoosh;
      let s, at;
      if (q.until != null) {
        const span = q.until - q.t;
        s = list.reduce((a, b) => (Math.abs(b.seconds - span) < Math.abs(a.seconds - span) ? b : a));
        at = Math.max(q.t - 0.05, (q.t + q.until) / 2 - s.peak);
      } else if (next) {
        // The longest swell that still starts after its own cue; failing that, the shortest.
        const gap = next.t - q.t;
        const fits = list.filter((e) => e.peak <= gap + 0.05);
        s = fits.length ? fits.reduce((a, b) => (b.peak > a.peak ? b : a)) : list.reduce((a, b) => (b.peak < a.peak ? b : a));
        at = next.t - s.peak - 0.02;
        row.into = next.n;
      } else {
        s = list.reduce((a, b) => (b.seconds < a.seconds ? b : a));
        at = q.t;
      }
      add(bus, s.x, at, fromDb(base));
      Object.assign(row, { sound: s.file, at: r3(at), gainDb: r1(base) });
    } else {
      const s = pick(q.type);
      const down = turnedDown.has(q.n);
      const db = base + (down ? -9 : 0);
      add(bus, s.x, q.t, fromDb(db));
      Object.assign(row, { sound: s.file, at: r3(q.t), gainDb: r1(db) });
      if (down) row.note = `turned down 9 dB: within ${NEAR * 1000} ms of cue ${turnedDown.get(q.n)}`;
    }
    report.push(row);
  }
  return report.sort((a, b) => a.cue - b.cue);
}

// ---------- the master ----------
// Brings the mix to the target loudness without letting a peak pass the ceiling. Speech and
// music reach the target; sparse effects alone stop where their peaks would be crushed.
export function master(left, right, targetLufs, ceilingDb, sparse) {
  const before = integrated([left, right]);
  if (!Number.isFinite(before)) return { channels: [left, right], lufs: null, truePeakDb: null, gainDb: 0, limiterDb: 0, note: "The mix is silent." };
  const room = ceilingDb - truePeakDb([left, right]);
  const mostLimiting = sparse ? 3 : 8;
  let gain = Math.min(targetLufs - before, room + mostLimiting);
  let out, cut = 0;
  for (let round = 0; round < 3; round++) {
    const g = fromDb(gain);
    const scaled = [left, right].map((ch) => { const y = new Float32Array(ch.length); for (let i = 0; i < ch.length; i++) y[i] = ch[i] * g; return y; });
    const lim = limit(scaled, ceilingDb - 0.2);
    out = lim.channels; cut = lim.cutDb;
    const miss = targetLufs - integrated(out);
    if (Math.abs(miss) < 0.1 || gain + miss > room + mostLimiting) break;
    gain += miss;
  }
  const lufs = integrated(out);
  const note = lufs < targetLufs - 0.5 ? `Stopped ${r1(targetLufs - lufs)} LU under the target: these sounds are short and far apart, and louder would crush their peaks.` : null;
  return { channels: out, lufs, truePeakDb: truePeakDb(out), gainDb: gain, limiterDb: cut, note };
}

// The takes to lay, by scene number: with a storyboard, only those that still say its words.
function takes(v) {
  const out = {};
  const starts = sceneStarts(v.plan, v.cues);
  const known = v.storyboard && Array.isArray(v.storyboard.scenes) ? voiceTakes(v.video, v.storyboard) : null;
  for (const n of Object.keys(starts)) {
    const f = join(v.video, "voice", `scene-${n}.wav`);
    if (!existsSync(f)) continue;
    if (known && !known.ready[n]) { out[n] = { stale: true }; continue; }
    out[n] = { file: f };
  }
  return out;
}

function fingerprint(v, opts) {
  const voice = {};
  if (!opts.noVoice) for (const [n, t] of Object.entries(takes(v))) if (t.file) voice[n] = sha(readFileSync(t.file));
  return { cues: sha(readFileSync(v.cuesFile)), voice, music: opts.music && existsSync(opts.music) ? sha(readFileSync(opts.music)) : null };
}

// Mixes one video folder. Returns { ok: false, problems } with one sentence per problem, or
// { ok: true, report, said } where `said` are the lines a person would read. `a` holds the
// command's flags (palette, seed, music, lufs, peak, out, no-sfx, no-voice, no-music, check).
export function mixVideo(videoDir, a = {}) {
  const v = openVideo(videoDir);
  if (a.storyboard && typeof a.storyboard === "object") v.storyboard = a.storyboard; // the builder hands over the one it just checked
  if (a.plan && typeof a.plan === "object") v.plan = a.plan;
  const problems = [...v.problems];
  if (!v.problems.length) problems.push(...checkCues(v.cues));
  const manifest = readJson(join(SFX, "palettes.json"));
  if (!manifest) problems.push(`The kit's sound folder is missing ${join(SFX, "palettes.json")}. Install the kit again.`);
  if (problems.length) return { ok: false, problems };

  const cues = v.cues;
  const musicRel = a["no-music"] ? null : a.music || (v.storyboard && v.storyboard.music) || null;
  const music = musicRel ? (isAbsolute(musicRel) ? musicRel : join(a.music ? process.cwd() : v.home, musicRel)) : null;
  const outFile = a.out || join(v.video, "assets", "audio", "mix.wav");
  const reportFile = join(v.video, "mix-report.json");

  if (a.check) {
    const old = readJson(reportFile);
    const now = fingerprint(v, { music, noVoice: a["no-voice"] });
    if (!old || !existsSync(outFile)) return { ok: false, problems: ["There is no mix yet. Run the video builder again; it lays the sound."] };
    if (JSON.stringify(old.inputs) !== JSON.stringify(now)) return { ok: false, problems: ["The mix was made for an older timeline, voice or music. Run the video builder again; it lays the sound."] };
    return { ok: true, said: ["The mix matches the timeline."] };
  }

  const pal = pickPalette(manifest, cues.look, a.palette);
  if (!pal) return { ok: false, problems: [`There is no palette named "${a.palette}". Use one of: ${Object.keys(manifest.palettes).join(", ")}.`] };
  if (music && !existsSync(music)) problems.push(`The music file ${music} is not there. Put it in the storyboard's folder, or remove "music" from the storyboard.`);
  if (music && existsSync(music) && !/\.wav$/i.test(music) && !ffmpegPath()) problems.push(`Reading ${music} needs ffmpeg, which is not installed. Install ffmpeg, or give the music as a 48 kHz WAV file.`);
  if (problems.length) return { ok: false, problems };

  const n = Math.round(cues.duration * RATE);
  const seed = a.seed != null ? String(a.seed) : "1";
  const sfx = new Float32Array(n), voice = new Float32Array(n);
  const report = { duration: cues.duration, palette: pal.name, paletteWhy: pal.why, seed, cues: [], voice: [], voiceLeftOut: [], music: null, warnings: [] };

  if (!a["no-sfx"]) report.cues = layCues(cues, loadPalette(manifest, pal.name), seed, sfx);

  const starts = sceneStarts(v.plan, cues);
  if (!a["no-voice"]) {
    const laid = takes(v);
    for (const [num, sc] of Object.entries(starts).sort((p, q) => p[0] - q[0])) {
      if (!laid[num]) continue;
      if (laid[num].stale) { report.voiceLeftOut.push(Number(num)); continue; } // says older words, or is in another voice
      const x = loadMono(laid[num].file);
      const level = integrated([x, x]);
      const g = Number.isFinite(level) ? fromDb(VOICE_LUFS - level) : 1;
      const at = sc.start + VOICE_LEAD;
      const seconds = x.length / RATE;
      add(voice, x, at, g);
      const row = { scene: Number(num), file: `voice/scene-${num}.wav`, at: r3(at), seconds: r3(seconds), gainDb: r1(toDb(g)) };
      const room = sc.dur != null ? sc.start + sc.dur : cues.duration;
      if (at + seconds > room + 0.05) {
        row.note = `runs ${r1(at + seconds - room)} s past the end of its scene`;
        report.warnings.push(`The voice of scene ${num} is ${r1(at + seconds - room)} s longer than its scene. Run the video builder again so the scene follows the voice.`);
      }
      report.voice.push(row);
    }
  }
  const spoken = report.voice.length > 0;
  const voiceReport = spoken ? readJson(join(v.video, "voice", "report.json")) : null;
  if (voiceReport) {
    report.voiceName = voiceReport.name;
    if (voiceReport.notice) report.voiceNotice = voiceReport.notice;
    if (voiceReport.use === "draft") report.warnings.push(`The spoken lines use ${voiceReport.name}, a draft voice that may not be published. Before publishing, set "narrator" in storyboard.json to "ringan", "bagus" or "sendiri" and make the spoken lines again.`);
  }
  const act = spoken ? speaking(voice) : null;
  if (spoken) duck(sfx, act, DUCK.sfx);

  const left = new Float32Array(n), right = new Float32Array(n);
  for (let i = 0; i < n; i++) { left[i] = sfx[i] + voice[i]; right[i] = left[i]; }

  if (music) {
    let [ml, mr] = /\.wav$/i.test(music) && readWav(music).rate === RATE
      ? ((w) => [w.channels[0], w.channels[w.channels.length > 1 ? 1 : 0]])(readWav(music))
      : decode(music, cues.duration + 1);
    const level = integrated([ml, mr]);
    const g = Number.isFinite(level) ? fromDb(MUSIC_LUFS - level) : 1;
    const len = ml.length, fadeIn = Math.round(0.4 * RATE), fadeOut = Math.round(1.2 * RATE), seam = Math.round(0.03 * RATE);
    const bl = new Float32Array(n), br = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = i % len;
      let e = g;
      if (len < n) e *= Math.min(1, k / seam, (len - k) / seam); // a short track repeats, eased at each seam
      if (i < fadeIn) e *= i / fadeIn;
      if (n - i < fadeOut) e *= (n - i) / fadeOut;
      bl[i] = ml[k] * e; br[i] = mr[k] * e;
    }
    if (spoken) { duck(bl, act, DUCK.music); duck(br, act, DUCK.music); }
    for (let i = 0; i < n; i++) { left[i] += bl[i]; right[i] += br[i]; }
    report.music = { file: musicRel, seconds: r3(len / RATE), repeats: len < n, gainDb: r1(toDb(g)), duckedDb: spoken ? DUCK.music : 0 };
  }

  const target = a.lufs != null ? Number(a.lufs) : -16, ceiling = a.peak != null ? Number(a.peak) : -1.5;
  const m = master(left, right, target, ceiling, !spoken && !music);
  const wav = wavBuffer(m.channels, RATE, 16);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, wav);

  const ff = measure(outFile);
  Object.assign(report, {
    target: { lufs: target, truePeakDb: ceiling },
    lufs: r1(ff ? ff.lufs : m.lufs),
    truePeakDb: r1(ff ? ff.truePeakDb : m.truePeakDb),
    measuredBy: ff ? "ffmpeg ebur128" : "this kit's own meter (ffmpeg not found)",
    ownMeter: { lufs: r1(m.lufs), truePeakDb: r1(m.truePeakDb) },
    masterGainDb: r1(m.gainDb),
    limiterDb: r1(m.limiterDb),
    note: m.note,
    inputs: fingerprint(v, { music, noVoice: a["no-voice"] }),
    sha256: sha(wav),
  });
  if (ff && ff.truePeakDb > ceiling + 0.05) report.warnings.push(`The loudest peak is ${ff.truePeakDb} dBTP, above the ${ceiling} dBTP ceiling. Run the mix again with --peak ${ceiling - 0.5}.`);
  const ordered = {};
  for (const k of ["duration", "palette", "paletteWhy", "seed", "target", "lufs", "truePeakDb", "measuredBy", "ownMeter", "masterGainDb", "limiterDb", "note", "warnings", "voiceName", "voiceNotice", "voice", "voiceLeftOut", "music", "cues", "inputs", "sha256"]) if (report[k] !== undefined) ordered[k] = report[k];
  writeFileSync(reportFile, JSON.stringify(ordered, null, 2) + "\n");

  const parts = [`${report.cues.length} sound effects (palette "${pal.name}", ${pal.why})`];
  if (spoken) parts.push(`${report.voice.length} spoken lines`);
  if (music) parts.push("music");
  const said = [`OK. ${parts.join(", ")}: ${report.lufs ?? "silent"} LUFS, peak ${report.truePeakDb ?? "none"} dBTP, ${cues.duration} seconds.`];
  if (m.note) said.push(m.note);
  for (const w of report.warnings) said.push(`Warning: ${w}`);
  if (report.voiceLeftOut.length) said.push(`Left out: the recording of scene ${report.voiceLeftOut.join(", ")}, which says older words or is in another voice than the storyboard asks for. Make the spoken lines again (kit/sound.mjs).`);
  said.push(`Wrote ${outFile} and ${reportFile}.`);
  return { ok: true, report: ordered, said, outFile, reportFile };
}

function main() {
  const a = args(process.argv.slice(2), ["palette", "seed", "music", "lufs", "peak", "out"]);
  const r = mixVideo(a._[0], a);
  if (!r.ok && a.check) { console.log(r.problems[0]); process.exit(1); }
  if (!r.ok) exitWith("The sound cannot be mixed yet.", r.problems);
  for (const line of r.said) console.log(line);
  if (!a.check) console.log("The video builder lays this mix by itself on every build; a mix made here by hand is replaced by the next build.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
