#!/usr/bin/env node
// Says what this computer can do for sound and which voice suits it. Installs nothing.
//
//   node device.mjs            a short report, with the advice in Indonesian and English
//   node device.mjs --json     the same facts for a program to read
//
// A voice is chosen in the storyboard ("narrator") and made by kit/sound.mjs; this report
// names the setting for each voice, and what installing one would download.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect, recommend, tierFor } from "./lib/device.mjs";
import { registry, downloadHost, toDownload, mb } from "./lib/engines.mjs";

const KIT = dirname(fileURLToPath(import.meta.url));
const SOUND = `node "${join(KIT, "..", "sound.mjs")}"`;
const info = inspect();
const reg = registry();
const rec = { id: recommend(info, "id", reg), en: recommend(info, "en", reg) };

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ...info, recommend: rec }, null, 2));
  process.exit(0);
}

console.log(`Computer: ${info.os} ${info.osVersion} (${info.arch}), ${info.cpu}, ${info.cores} cores, ${info.ramGb} GB memory, ${info.freeGb ?? "?"} GB free disk.`);
console.log(`Node ${info.node}. ffmpeg: ${info.ffmpeg || "NOT FOUND (music, MP3 or phone recordings and the final measurement need it)"}.`);
console.log(`Line check: whisper-cli ${info.whisperProgram ? "found" : "not found"}, its model ${info.whisperModel ? "found" : "not found"}${info.whisperProgram && info.whisperModel ? "" : " (spoken lines will not be checked by listening; the user listens instead)"}.`);
console.log(`Sound folder: ${info.home}. Speech program installed: ${info.runtimeInstalled ? "yes" : "no"}.`);
const have = Object.entries(info.voices).filter(([id, ok]) => ok && reg.voices[id].parts.length).map(([id]) => id);
console.log(`Voices installed: ${have.length ? have.join(", ") : "none"}.\n`);

const { weak, tight } = tierFor(info);
if (!info.runtimeBuild) {
  console.log(`ID: Belum ada program suara untuk komputer ini (${info.platform}): pakai ElevenLabs di akunmu sendiri, atau rekam suaramu sendiri.`);
  console.log(`EN: There is no speech program for this computer (${info.platform}): use ElevenLabs on your own account, or record your own voice.`);
} else if (tight) {
  console.log(`ID: Disk komputer ini hampir penuh (${info.freeGb} GB kosong), jadi pakai suara ringan.`);
  console.log(`EN: This computer's disk is nearly full (${info.freeGb} GB free), so use the light voice.`);
} else if (weak) {
  console.log(`ID: Komputer ini cocok dengan suara ringan (memori ${info.ramGb} GB, ${info.cores} inti): tetap jalan, hanya lebih lama.`);
  console.log(`EN: This computer suits the light voice (${info.ramGb} GB of memory, ${info.cores} cores): it works, only slower.`);
} else {
  console.log(`ID: Komputer ini kuat (memori ${info.ramGb} GB, ${info.cores} inti): semua suara lokal jalan lancar.`);
  console.log(`EN: This computer is strong (${info.ramGb} GB of memory, ${info.cores} cores): every local voice runs well.`);
}
console.log("");
console.log(`A voice is set in storyboard.json as "narrator" and made by: ${SOUND}\n`);
const light = (lang) => reg.tiers[lang].ringan;
for (const [lang, label] of [["id", "Indonesian"], ["en", "English"]]) {
  if (!info.runtimeBuild) continue;
  // The light voice first, then the better local one where this computer can carry it.
  const ids = [light(lang), ...(rec[lang].voice && rec[lang].voice !== light(lang) ? [rec[lang].voice] : [])];
  for (const id of ids) {
    const v = reg.voices[id], set = id === light(lang) ? "ringan" : id;
    const size = mb(toDownload(reg, id, info.home));
    if (info.voices[id]) console.log(`${label}, "narrator": "${set}": ${v.name}, already on this computer.`);
    else {
      console.log(`${label}, "narrator": "${set}": ${v.name}, not on this computer. Installing it needs the user's yes first; then: node "${join(KIT, "install.mjs")}" ${id}`);
      console.log(`  That downloads ${size} from ${downloadHost(reg, id)} into ${info.home}, and nothing else.`);
    }
    if (id !== light(lang)) console.log(`  A better voice than the light one, for a computer like this.`);
    if (v.notice) console.log(`  ${v.notice[lang]}`);
  }
}
const el = reg.voices.elevenlabs;
console.log(`\nBoth languages, "narrator": "bagus": ${el.name}. Nothing is installed and the kit never pays: ${SOUND} lists each line to make on elevenlabs.io and the file name to save it under.`);
console.log(`  ${el.notice.en}`);
console.log(`\nBoth languages, "narrator": "sendiri": the user's own recordings, one per spoken line, saved as my-voice/1.m4a, my-voice/2.m4a (the scene's number). ${SOUND} lists the lines to record.`);
