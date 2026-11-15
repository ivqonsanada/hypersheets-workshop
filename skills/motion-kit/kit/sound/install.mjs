#!/usr/bin/env node
// Installs one voice (and the program that runs it) into the sound folder of this computer.
//
//   node install.mjs list                 every voice, its size and its licence
//   node install.mjs <voice>              for example: supertonic-ringan, kristin, kokoro, whisper
//   node install.mjs <voice> --from <folder>   take the files from a folder (a flash drive) instead of the internet
//
// It downloads only what engines.json names, checks each file against its SHA-256 there, and
// runs nothing it downloads. The folder is ~/.hypersheets/sound unless HS_SOUND_HOME says otherwise.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, copyFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { registry, soundHome, platformKey, runtimeProgram, installed, mb } from "./lib/engines.mjs";
import { args } from "./lib/project.mjs";

const a = args(process.argv.slice(2), ["from", "home"]);
const reg = registry();
const home = a.home || soundHome();
const what = a._[0];

function fail(sentence) { console.log(sentence); process.exit(1); }

function sha256(file) {
  return new Promise((ok, no) => {
    const h = createHash("sha256");
    createReadStream(file).on("data", (d) => h.update(d)).on("end", () => ok(h.digest("hex"))).on("error", no);
  });
}

async function fetchPart(part, dest) {
  if (a.from) {
    const local = join(a.from, part.file);
    if (!existsSync(local)) fail(`${part.file} is not in ${a.from}. Copy it there, or run this command without --from to download it.`);
    copyFileSync(local, dest);
    return;
  }
  let lastError = "";
  for (const url of [part.url, part.alt].filter(Boolean)) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok || !res.body) { lastError = `${url} answered ${res.status}`; continue; }
      let got = 0, shown = 0;
      const count = new TransformStream({ transform(chunk, ctl) { got += chunk.length; const pct = Math.floor((got / part.bytes) * 4); if (pct > shown) { shown = pct; console.log(`  ${Math.min(100, pct * 25)}% of ${mb(part.bytes)}`); } ctl.enqueue(chunk); } });
      await pipeline(Readable.fromWeb(res.body.pipeThrough(count)), createWriteStream(dest));
      return;
    } catch (e) { lastError = `${url}: ${e.message}`; }
  }
  fail(`The download of ${part.file} failed (${lastError}). Check the internet connection and run the same command again.`);
}

async function getPart(part) {
  const tmp = join(home, "tmp");
  mkdirSync(tmp, { recursive: true });
  const file = join(tmp, part.file);
  console.log(`${a.from ? "Copying" : "Downloading"} ${part.file} (${mb(part.bytes)})${a.from ? "" : ` from ${new URL(part.url).host}`}`);
  await fetchPart(part, file);
  const sum = await sha256(file);
  if (sum !== part.sha256) { rmSync(file, { force: true }); fail(`${part.file} does not match its checksum, so it was deleted. Run the same command again; if it fails again, the file at its source has changed and the kit needs an update.`); }
  if (part.unpack) {
    const to = join(home, part.unpack);
    mkdirSync(to, { recursive: true });
    const r = spawnSync("tar", ["-xjf", file, "-C", to], { encoding: "utf8" });
    if (r.status !== 0) fail(`This computer's tar could not unpack ${file} (${String(r.stderr || r.error || "").trim().split("\n").pop()}). Unpack it by hand into ${to} (7-Zip can), then run the same command again.`);
    rmSync(file, { force: true });
  } else {
    mkdirSync(join(home, part.to), { recursive: true });
    renameSync(file, join(home, part.to, part.file));
  }
}

const USE = { any: "", practice: " For practice and non-commercial use.", draft: " DRAFT ONLY, not for publishing.", plan: " What you may do with it depends on your ElevenLabs plan." };

function list() {
  const build = reg.runtime.builds[platformKey()];
  console.log(`Sound folder: ${home}\nProgram: ${reg.runtime.name} (${reg.runtime.licence}), ${build ? mb(build.bytes) : "no build for this computer"}${runtimeProgram(reg, home) ? ", installed" : ""}\n`);
  for (const [id, v] of Object.entries(reg.voices)) {
    const size = v.parts.reduce((s, p) => s + p.bytes, 0);
    const tiers = Object.entries(reg.tiers).flatMap(([lang, t]) => Object.entries(t).filter(([, vid]) => vid === id).map(([tier]) => `${tier} for ${lang}`));
    console.log(`${id}${size && installed(reg, id, home) ? " (installed)" : ""}: ${v.name}. ${v.says}. ${size ? mb(size) : "No download"}.${tiers.length ? ` Tier: ${tiers.join(", ")}.` : ""}${USE[v.use]}\n  ${v.licence}\n`);
  }
  console.log(`whisper: ${reg.whisper.name}, ${mb(reg.whisper.parts[0].bytes)}. Lets voice.mjs check each spoken line by listening to it. ${reg.whisper.licence}.`);
}

async function main() {
  if (!what || what === "list") return list();
  if (what === "whisper") {
    const p = reg.whisper.parts[0];
    if (existsSync(join(home, p.to, p.file)) && statSync(join(home, p.to, p.file)).size === p.bytes) return console.log(`The whisper model is already in ${join(home, p.to)}.`);
    await getPart(p);
    return console.log(`OK. The whisper model is in ${join(home, p.to)}. voice.mjs also needs the whisper-cli program (whisper.cpp) on this computer to use it.`);
  }
  const v = reg.voices[what];
  if (!v) fail(`There is no voice named "${what}". Run "node install.mjs list" to see the names.`);
  if (!v.parts.length) return console.log(`${v.name} needs no install.${USE[v.use]}`);
  if (installed(reg, what, home)) return console.log(`${v.name} is already installed in ${home}.`);
  const build = reg.runtime.builds[platformKey()];
  if (!build) fail(`There is no ${reg.runtime.name} build for this computer (${platformKey()}). Record your own voice instead: node voice.mjs <video folder> --engine sendiri.`);
  if (!runtimeProgram(reg, home)) await getPart({ ...build, url: reg.runtime.base + build.file, unpack: "runtime" });
  for (const part of v.parts) {
    const there = part.unpack ? existsSync(join(home, part.unpack, v.dir)) : existsSync(join(home, part.to, part.file));
    if (!there) await getPart(part);
  }
  rmSync(join(home, "tmp"), { recursive: true, force: true });
  if (!installed(reg, what, home)) fail(`The files were unpacked, but ${v.name} is still incomplete in ${home}. Delete that folder and run the same command again.`);
  console.log(`OK. ${v.name} is installed in ${home}.`);
  console.log(v.licence);
  if (v.notice) console.log(v.notice.en);
}

main();
