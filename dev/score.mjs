// Mechanical part of the trial rubric for one run. For maintainers; learners never run this.
//
//   node dev/score.mjs <video-dir>
//
// Prints JSON: which locked parts changed against the template, the text put into every
// slot with its length and limit, leftover TODO- markers, emoji, and the video's duration.
// The frames are judged by eye from the stills that frames.sh extracts.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const videoDir = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, "..", "skills", "video-promo", "template");

const SLOT = /(<([a-z0-9]+)\b[^>]*\bdata-slot="([^"]+)"[^>]*\bdata-max="(\d+)"[^>]*>)([\s\S]*?)(<\/\2>)/g;
const blank = (html) => html.replace(SLOT, (_m, open, _t, _s, _x, _text, close) => open + "SLOT" + close);
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const emoji = /\p{Extended_Pictographic}/u;

const report = { lockedChanged: [], missingFiles: [], slots: [], overLimit: [], todo: [], emoji: [], dashes: [] };

for (const rel of ["index.html", ...readdirSync(join(template, "compositions")).map((f) => `compositions/${f}`)]) {
  const mine = join(videoDir, rel);
  if (!existsSync(mine)) { report.missingFiles.push(rel); continue; }
  const a = readFileSync(join(template, rel), "utf8");
  const b = readFileSync(mine, "utf8");
  if (blank(a) !== blank(b)) report.lockedChanged.push(rel);
  for (const m of b.matchAll(SLOT)) {
    const text = decode(m[5].trim());
    const max = Number(m[4]);
    const row = { file: rel, slot: m[3], text, len: [...text].length, max };
    report.slots.push(row);
    if (row.len > max) report.overLimit.push(`${rel}#${m[3]} ${row.len}/${max}`);
    if (text.includes("TODO-")) report.todo.push(`${rel}#${m[3]}`);
    if (emoji.test(text)) report.emoji.push(`${rel}#${m[3]}`);
    if (/[–—]|\s-\s/.test(text)) report.dashes.push(`${rel}#${m[3]}: ${text}`);
  }
}

report.pageCopied = existsSync(join(videoDir, "assets/page/index.html")) &&
  !readFileSync(join(videoDir, "assets/page/index.html"), "utf8").includes("PAGE MISSING");
// Scene 2 shows the copied page, and from v0.2 the video takes its colour from it, so every local
// stylesheet and picture the page links must be copied next to it (the skill's step 3).
report.pageFilesMissing = [];
if (report.pageCopied) {
  const page = readFileSync(join(videoDir, "assets/page/index.html"), "utf8");
  const refs = [
    ...[...page.matchAll(/<link\b[^>]*\brel=["']?stylesheet["']?[^>]*>/gi)].map((m) => /\bhref=["']([^"']+)["']/i.exec(m[0])?.[1]),
    ...[...page.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]),
  ];
  for (const ref of refs) {
    if (!ref || /^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue; // the internet, data: and anchors are not copied
    const file = decodeURIComponent(ref.split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
    if (!existsSync(join(videoDir, "assets/page", file))) report.pageFilesMissing.push(file);
  }
}
report.review = existsSync(join(videoDir, "REVIEW.md"));
report.frames = existsSync(join(videoDir, "frames")) ? readdirSync(join(videoDir, "frames")).filter((f) => f.endsWith(".png")).length : 0;

const mp4 = join(videoDir, "promo.mp4");
if (existsSync(mp4)) {
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=width,height,r_frame_rate", "-of", "json", mp4], { encoding: "utf8" });
  const j = JSON.parse(probe);
  report.video = { duration: Number(j.format.duration), sizeMB: +(Number(j.format.size) / 1e6).toFixed(2), width: j.streams[0].width, height: j.streams[0].height, fps: j.streams[0].r_frame_rate };
} else {
  report.video = null;
}

console.log(JSON.stringify(report, null, 2));
