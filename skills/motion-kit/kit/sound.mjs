#!/usr/bin/env node
// Makes a video's spoken lines and puts them in the video. The one extra command a video
// with a voice needs:
//
//   node sound.mjs [storyboard.json]
//
// It reads the storyboard's "voice" lines and its "narrator", makes each line with that voice
// (sound/voice.mjs), then runs the builder again (build.mjs), which gives every scene the time
// its line needs and lays voice, effects and music into the video's sound. A video without a
// voice never needs this command: the builder lays the sound effects on every build.
//
// It downloads nothing. When the voice is not on this computer it stops and prints the
// question to ask the user; only install.mjs downloads, and only after a yes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registry, installed, mb, toDownload, soundHome, downloadHost } from "./sound/lib/engines.mjs";
import { inspect } from "./sound/lib/device.mjs";
import { readJson } from "./sound/lib/project.mjs";
import { pickEngine } from "./sound/voice.mjs";

const KIT = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(process.argv[2] || "storyboard.json");
const dir = path.dirname(file), video = path.join(dir, "video");
const name = path.basename(file);
const RENDER = "npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4";
const NEXT = `Next, render:\n  ${RENDER}`;
const WAIT = "Do not render yet.";
const stop = (text) => { console.log(text); process.exit(1); };
const done = (text) => { console.log(text); process.exit(0); };
const tilde = (p) => (p.startsWith(os.homedir() + path.sep) ? "~" + p.slice(os.homedir().length) : p);
const nums = (a) => (a.length === 1 ? `scene ${a[0]}` : `scenes ${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

// ---------- what is there ----------
if (!fs.existsSync(file)) stop(`There is no ${name} in this folder. Write it and run the build first:\n  node "${path.join(KIT, "build.mjs")}" storyboard.json`);
const sb = readJson(file);
if (!sb || !Array.isArray(sb.scenes)) stop(`${name} cannot be read. Run the build, which says what to fix:\n  node "${path.join(KIT, "build.mjs")}" ${name}`);
if (!fs.existsSync(path.join(video, "mk-plan.json"))) stop(`The video is not built yet. Run the build first:\n  node "${path.join(KIT, "build.mjs")}" ${name}`);
const lines = sb.scenes.map((s, i) => ({ n: i + 1, text: s && typeof s.voice === "string" ? s.voice.trim() : "" })).filter((l) => l.text);
if (sb.sound === "off") done(`The storyboard says "sound": "off", so the video stays silent and there is nothing to make. ${NEXT}`);
if (!lines.length) done(`No scene has a "voice" line, so there is nothing to speak; the builder has already laid the video's other sound. ${NEXT}`);
if (!["id", "en"].includes(sb.lang)) stop(`The storyboard's "lang" must be "id" or "en". Run the build, which says what to fix:\n  node "${path.join(KIT, "build.mjs")}" ${name}`);

// ---------- which voice, and is it on this computer ----------
const narrator = typeof sb.narrator === "string" ? sb.narrator : "ringan";
const reg = registry();
const eng = pickEngine(narrator, sb.lang, reg, inspect(), false);
if (eng.need) {
  const v = reg.voices[eng.need];
  const size = mb(toDownload(reg, eng.need)), from = downloadHost(reg, eng.need), to = tilde(soundHome());
  const light = reg.tiers[sb.lang].ringan;
  const lighter = eng.need !== light && reg.voices[light] ? reg.voices[light] : null; // a bigger voice was asked for: name the light one too
  const ask = sb.lang === "id"
    ? `Suara ${v.name} belum ada di komputermu. Kalau kamu setuju, aku unduh ${size} dari ${from} ke folder ${to}, dan tidak mengunduh yang lain. Boleh aku unduh sekarang?`
    : `The voice ${v.name} is not on your computer yet. If you agree, I will download ${size} from ${from} into ${to}, and nothing else. May I download it now?`;
  stop([
    `The voice is not on this computer yet, and nothing may be downloaded without the user's yes.`,
    ``,
    `Ask the user exactly this, then stop and wait for the answer:`,
    ``,
    `  ${ask}`,
    ...(v.notice ? [``, `Say this with it, word for word:`, ``, `  ${v.notice[sb.lang]}`] : []),
    ...(lighter ? [``, `Tell the user this too: a lighter voice, ${lighter.name}, ${installed(reg, light) ? "is already on this computer" : `is a ${mb(toDownload(reg, light))} download`}, and they can have that one instead ("narrator": "ringan").`] : []),
    ``,
    `Only when the user answers yes, run this (timeout 600000):`,
    `  node "${path.join(KIT, "sound", "install.mjs")}" ${eng.need}`,
    `and then run this command again. If the user says no, two voices need no download: "narrator": "bagus" (ElevenLabs on their own account) and "narrator": "sendiri" (their own recordings).`,
    WAIT,
  ].join("\n"));
}
if (eng.problem) stop(`The voice cannot be made yet. Fix this in ${name}, then run this command again:\n\n1. ${eng.problem}`);

// ---------- the lines ----------
const v = spawnSync(process.execPath, [path.join(KIT, "sound", "voice.mjs"), video, "--engine", narrator, "--storyboard", file], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 570000 });
const said = (v.stdout || "").trim();
if (v.status === 3) {
  stop(`${said}\n\n${WAIT} Do not make these files yourself. Give the user the list above as it is: each line and the file name to save it under. Then stop. When the user says the files are saved, run this command again.`);
}
if (v.status !== 0) {
  const crash = said ? "" : `The voice script stopped without saying why (${String(v.stderr || v.error || "").trim().split("\n").pop() || "no message"}). Run this command again; if it stops again, tell the user.`;
  stop(`${said || crash}\n\n${WAIT}`);
}

// ---------- the video again: scenes as long as their lines, the voice in the mix ----------
const b = spawnSync(process.execPath, [path.join(KIT, "build.mjs"), file], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26 });
if (b.status !== 0) stop(`${(b.stdout || "").trim() || `The builder stopped without saying why (${String(b.stderr || "").trim().split("\n").pop()}).`}\n\nThe spoken lines are made. After fixing the storyboard, run this command again. ${WAIT}`);

const plan = readJson(path.join(video, "mk-plan.json"));
const rep = readJson(path.join(video, "voice", "report.json")) || {};
const heard = (plan && plan.sound) || {};
if (!heard.on || (heard.voiceWaiting || []).length) stop(`The voice of ${nums(heard.voiceWaiting || lines.map((l) => l.n))} did not reach the video. Run this command again; if it says this again, tell the user. ${WAIT}`);

const rows = rep.lines || [];
const seconds = Math.round(rows.reduce((s, r) => s + r.seconds, 0) * 10) / 10;
const checked = rows.filter((r) => r.wer != null);
const out = [`OK. The video speaks now: ${rows.length} ${rows.length === 1 ? "line" : "lines"} by ${rep.name}, ${seconds} seconds of speech.`];
out.push(`It runs ${plan.duration} seconds: every scene lasts as long as its line. Sound: ${heard.effects ? `${heard.effects} sound effects (palette "${heard.palette}") under the voice` : "the voice"}${heard.music ? ", with music" : ""}; ${heard.lufs} LUFS, peak ${heard.truePeakDb} dBTP.`);
if (checked.length) out.push(`A listener (whisper) heard ${checked.filter((r) => !r.flag).length} of ${checked.length} lines as written.`);
else out.push(`Nothing listened to the lines to check them (whisper is not set up on this computer). Tell the user to listen to the video once with the sound on.`);
// A listener that writes a line a little differently is often only spelling it its own way
// ("Service" for "servis"), so the words stay as they are and the user's ears decide.
const unsure = rows.filter((r) => r.flag === "check");
if (unsure.length) {
  out.push("", `The listener wrote ${unsure.length === 1 ? "one line" : `${unsure.length} lines`} a little differently. Often that is only its spelling, so change nothing:`);
  for (const r of unsure) out.push(`  scene ${r.scene}: it wrote "${r.heard}"`);
  out.push(`Tell the user to listen to ${nums(unsure.map((r) => r.scene))} and to say if a word sounds wrong.`);
}
const notes = (rep.checks || []).filter((c) => !/may be misread/.test(c));
const theirs = ["sendiri", "elevenlabs"].includes(rep.engine); // files the user made: only they can make one again
if (notes.length && theirs) {
  out.push("", `Tell the user this about their ${notes.length === 1 ? "file" : "files"}; the video is made either way:`);
  for (const c of notes) out.push(`  - ${c}`);
} else for (const c of notes) out.push("", `Note: ${c} If you change that line, build and run this command again.`);
for (const w of heard.warnings || []) out.push("", `Note: ${w}`);
if (rep.notice) out.push("", `Tell the user this, word for word:`, ``, `  ${rep.notice}`);
out.push("", NEXT);
done(out.join("\n"));
