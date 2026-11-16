#!/usr/bin/env node
// Makes the contact sheet: one picture of the video's key frames, each with its number, its
// time and a sentence saying what it should show, in the video's language (lib/sheet.mjs).
//
//   node stills.mjs [folder that holds video/]
//
// It runs HyperFrames 0.9.51 through npx, and says so as it does:
//   1. npx hyperframes@0.9.51 telemetry disable   (sends nothing; saves the choice on this computer)
//   2. npx hyperframes@0.9.51 snapshot video …    (the frames the builder planned, into video/frames/)
//   3. npx hyperframes@0.9.51 snapshot video/.sheet …   (those frames laid out on one sheet)
// and writes video/sheet.png. It reads and writes only inside video/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sheetPage } from "./lib/sheet.mjs";

const HF = "hyperframes@0.9.51";
const dir = path.resolve(process.argv[2] || ".");
const video = path.join(dir, "video");
const planFile = path.join(video, "mk-plan.json");
if (!fs.existsSync(planFile)) {
  console.log("There is no video/mk-plan.json here. Run the build first: node build.mjs storyboard.json");
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));

function run(args, what) {
  console.log(`Running: npx ${args.join(" ")}`);
  const r = spawnSync("npx", args, { cwd: dir, encoding: "utf8", shell: process.platform === "win32", timeout: 600000, maxBuffer: 1 << 26 });
  if (r.status !== 0) {
    const tail = `${r.stdout || ""}\n${r.stderr || ""}`.trim().split("\n").slice(-12).join("\n");
    console.log(`\n${what} did not finish. HyperFrames said:\n${tail}\n\nIf it names a missing tool (Node.js 22, FFmpeg, Chrome), tell the user; do not try another version.`);
    process.exit(1);
  }
  return r.stdout || "";
}

// ---------- the frames ----------
run([HF, "telemetry", "disable"], "Turning off HyperFrames' usage data");
const frames = path.join(video, "frames");
fs.rmSync(frames, { recursive: true, force: true });
run([HF, "snapshot", "video", "--at", plan.stills.map((s) => s.t).join(","), "--no-end", "-o", "video/frames"], "The snapshot");
const pngs = fs.readdirSync(frames).filter((f) => /^frame-\d+.*\.png$/.test(f)).sort();
if (pngs.length !== plan.stills.length) {
  console.log(`HyperFrames wrote ${pngs.length} frames, not the ${plan.stills.length} planned. Run this again; if it repeats, tell the user.`);
  process.exit(1);
}

// ---------- the sheet: the frames side by side, each over its own sentence ----------
const sheet = path.join(video, ".sheet");
fs.rmSync(sheet, { recursive: true, force: true });
fs.mkdirSync(path.join(sheet, "assets"), { recursive: true });
pngs.forEach((f, i) => fs.copyFileSync(path.join(frames, f), path.join(sheet, "assets", `f${i + 1}.png`)));
const { html, n } = sheetPage(plan);
fs.writeFileSync(path.join(sheet, "index.html"), html);
fs.writeFileSync(path.join(sheet, "hyperframes.json"), JSON.stringify({ paths: { assets: "assets" } }) + "\n");
run([HF, "snapshot", "video/.sheet", "--at", "0", "--no-end", "-o", "video/.sheet/out"], "The contact sheet");
const made = fs.readdirSync(path.join(sheet, "out")).find((f) => /^frame-.*\.png$/.test(f));
fs.copyFileSync(path.join(sheet, "out", made), path.join(video, "sheet.png"));
fs.rmSync(sheet, { recursive: true, force: true });

console.log(`\nWrote video/sheet.png: ${n} frames. Open it with Read and compare each frame with its sentence:\n`);
for (const s of plan.stills) console.log(`FRAME ${s.n} (${s.t} s, scene ${s.scene}, ${s.type}): ${s.expect}`);
console.log(`\nIn every frame: each word whole, nothing cut at an edge, nothing on top of other words, no red strip that says DOES NOT FIT.`);
const waiting = (plan.sound && plan.sound.voiceWaiting) || [];
if (waiting.length) console.log(`\nThis video has "voice" lines that are not spoken yet. After REVIEW.md and before the render, run:\n  node "${path.join(path.dirname(fileURLToPath(import.meta.url)), "sound.mjs")}"`);
