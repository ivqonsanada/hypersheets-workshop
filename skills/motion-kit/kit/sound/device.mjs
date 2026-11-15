#!/usr/bin/env node
// Says what this computer can do for sound and which voice to use. Installs nothing.
//
//   node device.mjs            a short report, with the advice in Indonesian and English
//   node device.mjs --json     the same facts for a program to read
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect, recommend, tierFor } from "./lib/device.mjs";
import { registry } from "./lib/engines.mjs";

const KIT = dirname(fileURLToPath(import.meta.url));
const info = inspect();
const reg = registry();
const rec = { id: recommend(info, "id", reg), en: recommend(info, "en", reg) };

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ...info, recommend: rec }, null, 2));
  process.exit(0);
}

console.log(`Computer: ${info.os} ${info.osVersion} (${info.arch}), ${info.cpu}, ${info.cores} cores, ${info.ramGb} GB memory, ${info.freeGb ?? "?"} GB free disk.`);
console.log(`Node ${info.node}. ffmpeg: ${info.ffmpeg || "NOT FOUND (music, MP3 or phone recordings and the final measurement need it)"}.`);
console.log(`Line check: whisper-cli ${info.whisperProgram ? "found" : "not found"}, its model ${info.whisperModel ? "found" : "not found"}${info.whisperProgram && info.whisperModel ? "" : " (spoken lines will not be checked by listening)"}.`);
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
for (const [lang, label] of [["id", "Indonesian"], ["en", "English"]]) {
  const r = rec[lang];
  if (!r.voice) continue;
  const flag = r.voice === reg.tiers[lang].ringan ? "ringan" : r.voice;
  if (r.installed) console.log(`${label}, on this computer: ${r.name} is installed. Run: node "${join(KIT, "voice.mjs")}" <video folder> --engine ${flag}`);
  else {
    console.log(`${label}, on this computer: ${r.name}. To install it, run: node "${join(KIT, "install.mjs")}" ${r.voice}`);
    console.log(`  That downloads ${r.downloadText} from github.com into ${info.home}, and nothing else.`);
  }
  if (r.notice) console.log(`  ${r.notice[lang]}`);
}
const el = reg.voices.elevenlabs;
console.log(`\nA step up, in both languages: ${el.name}. Run: node "${join(KIT, "voice.mjs")}" <video folder> --engine bagus`);
console.log("  It lists each line to make on elevenlabs.io and the file name to save it under; nothing is installed and the kit never pays.");
console.log(`  ${el.notice.en}`);
console.log(`\nOn any computer, your own voice: record each line, save the files as video/voice/1.m4a, video/voice/2.m4a (the scene's number), then run: node "${join(KIT, "voice.mjs")}" <video folder> --engine sendiri`);
