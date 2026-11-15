#!/usr/bin/env node
// Makes the spoken lines of one video: one WAV per scene in video/voice/, and
// video/voice/durations.json, which the video builder reads to give each scene enough time.
// kit/sound.mjs runs this and then the builder, which is the one command a video needs; this
// file can also be run by hand:
//
//   node voice.mjs <video folder> [--engine ringan|kokoro|bagus|sendiri|draft|<voice name>]
//                  [--speaker F1] [--speed 1] [--threads 2] [--lang id|en] [--fresh] [--no-check]
//                  [--as-written]   speak lines that hold digits or addresses without stopping
//
// Which voice speaks is the storyboard's "narrator" (--engine overrides it):
// ringan   a light voice that runs on this computer (see device.mjs and install.mjs).
// kokoro   a better English voice for a stronger computer.
// bagus    ElevenLabs on your own account: make each line there and save it as
//          my-voice/1.mp3, my-voice/2.mp3 (the scene's number), beside the storyboard; or set
//          ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your shell and this script fetches
//          the lines itself, into video/voice/.
// sendiri  your own voice: recordings saved under the same names in my-voice/.
//          (Files of those names in video/voice/ are read too, and win.)
// draft    the computer's own voice, for timing only, never for publishing.
//
// Scene numbers count from 1 in every name here: scene-1.wav, 1.mp3, durations.json's keys.
// It ends with 0 when the lines are made, 3 when it waits for files only the user can make,
// 4 when a voice would have to be downloaded first, and 1 for anything else to fix.
//
// When whisper-cli is on the computer, every line is listened to and compared with its text.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, peak, scale, fade, filter, resample, soundingRange, fromDb, toDb, rms } from "./lib/dsp.mjs";
import { integrated, truePeakDb, limit } from "./lib/loudness.mjs";
import { readWav, writeWav } from "./lib/wav.mjs";
import { decode, which, ffmpegPath } from "./lib/ffmpeg.mjs";
import { registry, installed, speak, whisper, mb, toDownload, macVoices, soundHome, downloadHost } from "./lib/engines.mjs";
import { inspect, recommend } from "./lib/device.mjs";
import { compare, advice, words, lint } from "./lib/text.mjs";
import { args, exitWith, openVideo, readJson } from "./lib/project.mjs";

const KIT = dirname(fileURLToPath(import.meta.url));
const VOICE_LUFS = -17;
const AUDIO = /^(\d+)\.(wav|m4a|mp3|aac|ogg|opus|flac|webm|mp4|3gp|amr|aiff?)$/i;
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const NOT_YET = "The voice cannot be made yet.";

// A raw take as a clean line: one channel, 48 kHz, rumble removed, silence cut from both ends,
// brought to one loudness. Returns the samples and what was noticed about the take.
export function tidy(x, rate) {
  let y = rate === RATE ? Float32Array.from(x) : resample(x, rate, RATE);
  const rawPeak = peak(y);
  let clipped = 0;
  for (let i = 0; i < y.length; i++) if (Math.abs(y[i]) >= 0.999) clipped++;
  y = filter(y, "highpass", 70, 0.7071);
  const [a, b] = soundingRange(y, -38, 0.03, 0.1);
  y = fade(y.subarray(a, b), 0.005, 0.04);
  // The quietest tenth of the take is the room: hiss, a fan, traffic.
  const frames = [];
  const hop = RATE / 20;
  for (let i = 0; i + hop <= y.length; i += hop) frames.push(rms(y, i, i + hop));
  frames.sort((p, q) => p - q);
  const noiseDb = frames.length ? toDb(frames[Math.floor(frames.length / 10)] / (peak(y) || 1)) : -Infinity;
  const level = integrated([y, y]);
  if (Number.isFinite(level)) y = scale(y, fromDb(VOICE_LUFS - level));
  if (truePeakDb([y]) > -2) y = limit([y], -2).channels[0];
  return { x: y, seconds: y.length / RATE, rawPeakDb: toDb(rawPeak), clipped, noiseDb };
}

function loadAny(file) {
  if (/\.wav$/i.test(file)) {
    const w = readWav(file);
    const mono = new Float32Array(w.channels[0].length);
    for (const ch of w.channels) for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / w.channels.length;
    return { x: mono, rate: w.rate };
  }
  const [l, r] = decode(file);
  const mono = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
  return { x: mono, rate: RATE };
}

// What whisper hears in a line, or null when it cannot run.
function listen(w, x, lang, tmp, threads) {
  writeWav(tmp, [resample(x, RATE, 16000)], 16000, 16);
  const r = spawnSync(w.program, ["-m", w.model, "-l", lang, "-f", tmp, "-nt", "-np", "-t", String(threads)], { encoding: "utf8", maxBuffer: 1 << 24 });
  rmSync(tmp, { force: true });
  if (r.status !== 0) return null;
  return r.stdout.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

// Files the learner made, by scene number: video/voice/3.mp3 wins over my-voice/3.m4a.
function dropIns(folders) {
  const found = {};
  for (const dir of folders) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = AUDIO.exec(f);
      if (m && !found[Number(m[1])]) found[Number(m[1])] = join(dir, f);
    }
  }
  return found;
}

// One line from ElevenLabs, on the learner's own key. The key is read from the environment,
// sent only to elevenlabs.io (or this computer, for tests), and never printed or stored.
async function elevenLabs(text, voiceId, model, file) {
  const key = process.env.ELEVENLABS_API_KEY;
  const base = process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io";
  const host = new URL(base);
  const ours = host.protocol === "https:" && (host.hostname === "elevenlabs.io" || host.hostname.endsWith(".elevenlabs.io"));
  const local = host.hostname === "127.0.0.1" || host.hostname === "localhost";
  if (!ours && !local) return "ELEVENLABS_API_BASE must be an https address at elevenlabs.io. Unset it to use the default.";
  const clean = (s) => String(s).split(key).join("***").slice(0, 200);
  try {
    const res = await fetch(`${base}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" }, body: JSON.stringify({ text, model_id: model }),
    });
    if (!res.ok) {
      let said = "";
      try { const j = await res.json(); said = j.detail && (j.detail.message || (Array.isArray(j.detail) && j.detail[0] && j.detail[0].msg) || j.detail.status) || ""; } catch (e) {}
      const hint = res.status === 401 ? "Check the key in ELEVENLABS_API_KEY." : res.status === 404 ? "Check the voice ID in ELEVENLABS_VOICE_ID." : res.status === 429 || /quota/i.test(said) ? "The account is out of credits or too busy: wait, or make the lines on elevenlabs.io." : "Make the line on elevenlabs.io instead and save it under the name shown.";
      return `ElevenLabs answered ${res.status}${said ? ` (${clean(said)})` : ""}. ${hint}`;
    }
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    return null;
  } catch (e) {
    return `ElevenLabs could not be reached (${clean(e.message)}). Check the internet connection, or make the line on elevenlabs.io and save it under the name shown.`;
  }
}

// How a line of advice names another voice: by the storyboard's own setting.
const SET = (tier) => `"narrator": "${tier}" in storyboard.json`;
const NO_DOWNLOAD = `Two voices need no download: ${SET("bagus")} (ElevenLabs on the user's own account) and ${SET("sendiri")} (the user's own recordings).`;

// Which voice speaks. Returns { id }, or { problem } as one sentence; a voice that would have
// to be downloaded first also comes back as { need: its name in engines.json }.
export function pickEngine(ask, lang, reg, info, haveFiles) {
  if (ask === "sendiri" || (!ask && haveFiles)) return { id: "sendiri" };
  if (ask === "draft") return process.platform === "darwin" ? { id: "say" } : { problem: `Only a Mac has a draft voice. Set ${SET("ringan")} instead.` };
  let id = ask;
  if (!ask || ask === "ringan" || ask === "bagus") {
    id = ask ? reg.tiers[lang][ask] : recommend(info, lang, reg).voice;
    if (!id) return { problem: `There is no speech program for this computer (${info.platform}). ${NO_DOWNLOAD}` };
    // No choice made and that voice is absent: any installed voice for this language will do.
    if (!ask && !installed(reg, id)) {
      const other = Object.keys(reg.voices).find((k) => ["any", "practice"].includes(reg.voices[k].use) && reg.voices[k].parts.length && reg.voices[k].lang.includes(lang) && installed(reg, k));
      if (other) id = other;
    }
  }
  const v = reg.voices[id];
  if (!v) return { problem: `There is no voice named "${ask}". Set "narrator" in storyboard.json to "ringan", "kokoro", "bagus" or "sendiri".` };
  if (!v.lang.includes(lang)) return { problem: `${v.name} does not speak "${lang}". Set ${SET("ringan")} and the kit picks a voice that does.` };
  if (v.kind === "say" && process.platform !== "darwin") return { problem: `The system voice exists only on a Mac. Set ${SET("ringan")} instead.` };
  if (v.parts.length && !reg.runtime.builds[info.platform]) return { problem: `There is no speech program for this computer (${info.platform}). ${NO_DOWNLOAD}` };
  if (!installed(reg, id)) return { need: id, problem: `${v.name} is not on this computer. Installing it downloads ${mb(toDownload(reg, id))} from ${downloadHost(reg, id)} into ${soundHome()}, and that needs the user's yes first. ${NO_DOWNLOAD}` };
  return { id };
}

async function main() {
  const a = args(process.argv.slice(2), ["engine", "voice", "tier", "speaker", "speed", "threads", "lang", "storyboard"]);
  const v = openVideo(a._[0]);
  const problems = [...v.problems];
  const sb = a.storyboard ? readJson(a.storyboard) : v.storyboard;
  if (!sb || !Array.isArray(sb.scenes)) problems.push(`There is no readable storyboard at ${a.storyboard || v.storyboardFile}. Give its path with --storyboard.`);
  if (problems.length) exitWith(NOT_YET, problems);

  const lang = a.lang || sb.lang || (v.plan && v.plan.lang);
  if (!["id", "en"].includes(lang)) exitWith(NOT_YET, [`The storyboard's "lang" is ${JSON.stringify(lang)}. Set it to "id" or "en", or pass --lang.`]);
  const lines = sb.scenes.map((s, i) => ({ n: i + 1, text: typeof s.voice === "string" ? s.voice.trim() : "" })).filter((l) => l.text);
  if (!lines.length) exitWith(NOT_YET, ['No scene in the storyboard has a "voice" line. Add "voice": "one spoken sentence" to each scene that should speak, and build again.']);
  const unclear = lines.flatMap((l) => lint(l.text, lang).map((what) => `Scene ${l.n}'s "voice" line ${what}`));
  if (unclear.length && !a["as-written"]) exitWith(NOT_YET, unclear);

  const reg = registry(), info = inspect();
  const out = join(v.video, "voice");
  mkdirSync(out, { recursive: true });
  const shown = (file) => relative(v.home, file);
  let files = dropIns([out, join(v.home, "my-voice")]);
  const own = sb.narrator || "ringan";
  const ask = a.engine || a.voice || a.tier || sb.narrator || null;
  const eng = pickEngine(ask, lang, reg, info, Object.keys(files).length > 0);
  if (eng.need) { console.log(`${NOT_YET} ${eng.problem}`); process.exit(4); }
  if (eng.problem) exitWith(NOT_YET, [eng.problem]);
  const fromFiles = eng.id === "sendiri" || eng.id === "elevenlabs";
  const voice = reg.voices[eng.id] || null;

  let speaker = voice && voice.speaker != null ? voice.speaker : 0, speakerName = null;
  if (a.speaker != null && voice && !fromFiles) {
    if (voice.kind === "say") {
      if (!macVoices().includes(a.speaker)) exitWith(NOT_YET, [`This Mac has no system voice named "${a.speaker}". Leave --speaker out to use ${voice.voiceFor[lang]}.`]);
      speakerName = a.speaker;
    } else if (voice.speakers && voice.speakers[a.speaker] != null) speaker = voice.speakers[a.speaker];
    else if (/^\d+$/.test(a.speaker)) speaker = Number(a.speaker);
    else exitWith(NOT_YET, [`${voice.name} has no speaker "${a.speaker}". Use one of: ${Object.keys(voice.speakers || { 0: 0 }).join(", ")}.`]);
  }
  if (voice && voice.kind === "say" && !macVoices().includes(speakerName || voice.voiceFor[lang])) {
    exitWith(NOT_YET, [`This Mac does not have the ${voice.voiceFor[lang]} voice. Add it in System Settings, Accessibility, Spoken Content, System voice, Manage voices; then run the same command again.`]);
  }
  const speed = a.speed ? Number(a.speed) : 1, threads = a.threads ? Number(a.threads) : 2;
  const setup = { engine: eng.id, speaker: speakerName || speaker, speed };
  const hard = [], soft = [];

  // ElevenLabs with a key: fetch every line that has no file yet, or whose words have changed.
  let fetched = 0;
  if (eng.id === "elevenlabs" && process.env.ELEVENLABS_API_KEY) {
    const voiceId = a.speaker || process.env.ELEVENLABS_VOICE_ID;
    const model = process.env.ELEVENLABS_MODEL || voice.model;
    const madeFile = join(out, ".elevenlabs.json");
    const made = readJson(madeFile) || {};
    if (!voiceId) hard.push("ELEVENLABS_API_KEY is set but no voice is chosen. Pick a voice on elevenlabs.io, copy its Voice ID, and set it in your shell as ELEVENLABS_VOICE_ID.");
    else if (!ffmpegPath()) hard.push("ElevenLabs sends MP3 files, and reading them needs ffmpeg, which is not installed. Install ffmpeg, then run the same command again.");
    else {
      for (const line of lines) {
        const key = createHash("sha256").update(JSON.stringify([line.text, voiceId, model])).digest("hex").slice(0, 16);
        const mine = join(out, `${line.n}.mp3`);
        // A file the learner made is never replaced; one fetched here is, when its words changed.
        const fetchedBefore = files[line.n] === mine && made[line.n];
        if (files[line.n] && !fetchedBefore) continue;
        if (fetchedBefore && made[line.n] === key && !a.fresh) continue;
        const error = await elevenLabs(line.text, voiceId, model, mine);
        if (error) { hard.push(`Scene ${line.n}: ${error}`); break; }
        made[line.n] = key; fetched++;
      }
      writeFileSync(madeFile, JSON.stringify(made, null, 2) + "\n");
      files = dropIns([out, join(v.home, "my-voice")]);
    }
  }

  if (fromFiles && !hard.length) {
    const missing = lines.filter((l) => !files[l.n]);
    if (missing.length) {
      const how = eng.id === "elevenlabs"
        ? `Make ${missing.length === 1 ? "this line" : `these ${missing.length} lines`} on elevenlabs.io (Text to Speech: paste the line, pick a voice, download), save each file under the name shown, then run the same command again. (Someone with an ElevenLabs API key can set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in their own shell before starting, and the lines are fetched for them; a key is never typed into a chat.)`
        : `Record ${missing.length === 1 ? "this line" : `these ${missing.length} lines`} (a phone's voice recorder is fine; any audio format), save each file under the name shown, then run the same command again.`;
      console.log(`The voice is not ready. ${how}\n`);
      for (const l of missing) console.log(`${shown(join(v.home, "my-voice", `${l.n}.${eng.id === "elevenlabs" ? "mp3" : "m4a"}`))}\n  ${l.text}\n`);
      if (voice && voice.notice) console.log(voice.notice[lang]);
      process.exit(3);
    }
  }
  if (hard.length) exitWith("The voice is not ready.", hard);

  const old = readJson(join(out, "report.json"));
  const w = a["no-check"] ? { program: null, model: null } : whisper(reg, which);
  const canListen = !!(w.program && w.model);
  const rows = [];
  let spent = 0, spoke = 0;

  for (const line of lines) {
    const file = join(out, `scene-${line.n}.wav`);
    const key = createHash("sha256").update(JSON.stringify([line.text, setup, lang])).digest("hex").slice(0, 16);
    const before = old && old.lines ? old.lines.find((r) => r.scene === line.n) : null;
    let row;
    if (!a.fresh && !fromFiles && before && before.key === key && existsSync(file)) {
      row = before; // the same words in the same voice: keep the take
    } else {
      let take;
      if (fromFiles) {
        const src = files[line.n];
        if (!/\.wav$/i.test(src) && !ffmpegPath()) { hard.push(`Reading ${shown(src)} needs ffmpeg, which is not installed. Install ffmpeg, or save the file as WAV.`); continue; }
        try { take = loadAny(src); } catch (e) { hard.push(e.message); continue; }
      } else {
        const tmp = join(out, `.take-${line.n}.wav`);
        const r = speak(reg, eng.id, line.text, tmp, { lang, speaker, speakerName, speed, threads });
        if (!r.ok) { rmSync(tmp, { force: true }); hard.push(`${voice.name} could not speak scene ${line.n} (${r.error || "no sound came out"}). Run the same command again; if it fails again, set another "narrator" in storyboard.json.`); continue; }
        spent += r.seconds;
        take = loadAny(tmp);
        rmSync(tmp, { force: true });
      }
      const t = tidy(take.x, take.rate);
      if (t.seconds < 0.2) { hard.push(`Scene ${line.n} came out silent. ${fromFiles ? `Make ${shown(files[line.n])} again, with the voice clearly heard.` : "Run the same command again."}`); continue; }
      writeWav(file, [t.x], RATE, 16);
      spoke += t.seconds;
      row = { scene: line.n, text: line.text, key, file: `voice/scene-${line.n}.wav`, seconds: r2(t.seconds), lufs: r1(integrated([t.x, t.x])), truePeakDb: r1(truePeakDb([t.x])), wordsPerSecond: r1(words(line.text, lang).length / t.seconds) };
      if (fromFiles) {
        row.source = shown(files[line.n]);
        if (t.clipped > 20) soft.push(`Scene ${line.n} is too loud at its source and distorted. Record it again a little further from the microphone.`);
        else if (t.rawPeakDb < -30) soft.push(`Scene ${line.n} is very quiet at its source, so its hiss was turned up with it. Record it again closer to the microphone.`);
        if (t.noiseDb > -32) soft.push(`Scene ${line.n} has a noisy room behind the voice. Record it again somewhere quieter, with fans and music off.`);
      }
      if (canListen) {
        const heard = listen(w, t.x, lang, join(out, `.listen-${line.n}.wav`), threads);
        if (heard != null) {
          const c = compare(line.text, heard, lang);
          Object.assign(row, { heard, wer: r2(c.wer), cer: r2(c.cer) });
          row.flag = c.cer >= 0.35 ? "wrong" : c.cer >= 0.15 || (c.wer >= 0.2 && c.cer >= 0.08) ? "check" : null;
        }
      }
    }
    if (row.flag === "wrong") hard.push(`Scene ${row.scene} does not say its line: a listener heard "${row.heard}". ${fromFiles ? `Make ${row.source} again so it says exactly: "${row.text}"` : advice(row.text, row.heard, lang)}`);
    else if (row.flag === "check") soft.push(`Scene ${row.scene} may be misread (${Math.round(row.wer * 100)}% of its words differ). ${fromFiles ? `Listen to ${row.source}; if a word is unclear, make it again.` : advice(row.text, row.heard, lang)}`);
    if (row.wordsPerSecond > 4.3) soft.push(`Scene ${row.scene} is spoken very fast (${row.wordsPerSecond} words a second). ${fromFiles ? "Make it again more slowly." : "Say it in fewer words."}`);
    rows.push(row);
  }

  // Keys are scene numbers, from 1, like every file name beside it.
  const durations = {};
  for (const r of rows) durations[String(r.scene)] = r.seconds;
  writeFileSync(join(out, "durations.json"), JSON.stringify(durations, null, 2) + "\n");
  const notice = voice && voice.notice ? voice.notice[lang] : null;
  const report = {
    engine: eng.id, narrator: ask === own ? own : null, name: voice ? voice.name : "your own voice", speaker: fromFiles ? null : setup.speaker, speed, lang,
    use: voice ? voice.use : "any", notice, licence: voice ? voice.licence : "Your own recordings: yours to publish.",
    checkedBy: canListen ? "whisper-cli" : null, checks: soft, lines: rows,
  };
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  rmSync(join(out, "NOT-FOR-PUBLISHING.txt"), { force: true });
  if (notice) writeFileSync(join(out, "NOTICE.txt"), `${notice}\n\nVoice: ${voice.name}. ${voice.licence}\nSource: ${voice.source}\n`);
  else rmSync(join(out, "NOTICE.txt"), { force: true });

  if (hard.length) exitWith("The voice is not ready.", hard);
  const checked = rows.filter((r) => r.wer != null);
  const who = voice && voice.speakers && !fromFiles ? ` (${Object.keys(voice.speakers).find((k) => voice.speakers[k] === speaker) || speaker})` : "";
  console.log(`OK. ${rows.length} lines, voice: ${report.name}${who}, ${r1(rows.reduce((s, r) => s + r.seconds, 0))} seconds of speech.`);
  for (const r of rows) console.log(`  scene ${r.scene}: ${r.seconds} s${r.wer != null ? `, heard ${r.flag ? "differently" : "correctly"}` : ""}`);
  if (fetched) console.log(`Fetched ${fetched} ${fetched === 1 ? "line" : "lines"} from ElevenLabs with your key.`);
  if (spent > 0 && spoke > 0) console.log(`Speaking took ${r1(spent)} s for ${r1(spoke)} s of speech.`);
  if (!canListen && !a["no-check"]) console.log(`The lines were not checked by listening (${w.program ? "the whisper model is not on this computer" : "whisper-cli is not on this computer"}). Ask the user to listen to each line.`);
  else if (checked.length) console.log(`A listener (whisper) heard ${checked.filter((r) => !r.flag).length} of ${checked.length} lines as written.`);
  for (const s of soft) console.log(`Check: ${s}`);
  if (notice) console.log(notice);
  console.log(`Wrote ${out}. Build the video again: each scene then lasts as long as its line, and the mix carries the voice.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
