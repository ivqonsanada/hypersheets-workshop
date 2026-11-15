// The mechanical part of the motion-kit rubric for one trial run. For maintainers.
//
//   node dev/score-kit.mjs <run-dir>
//
// Prints JSON: whether the storyboard still builds, whether anything the kit wrote was edited,
// whether the sheet, the review and the video are there, the commands that were run, and the
// numbers and addresses in the storyboard that appear nowhere in the brief or the user's files
// (a first net for invented facts; the rest is read by eye).
import { readFileSync, existsSync, readdirSync, cpSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const run = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "..", "skills", "motion-kit", "kit");
const work = join(run, "work"), video = join(work, "video");
const r = { storyboard: existsSync(join(work, "storyboard.json")), builds: null, kitEdited: [], sheet: existsSync(join(video, "sheet.png")), review: null, video: null, commands: [], refused: [], notInBrief: [], telemetryOff: null };

if (r.storyboard) {
  // Build again in a copy: the storyboard as left must pass, and what the run left in video/
  // must be exactly what the builder writes.
  const tmp = mkdtempSync(join(tmpdir(), "mk-score-"));
  cpSync(work, tmp, { recursive: true, filter: (p) => !p.includes(`${work}/video`) });
  const b = spawnSync("node", [join(run, "plugin", "skills", "motion-kit", "kit", "build.mjs"), "storyboard.json"], { cwd: tmp, encoding: "utf8" });
  r.builds = b.status === 0;
  if (!r.builds) r.buildSays = b.stdout.trim().split("\n").slice(0, 6);
  if (r.builds && existsSync(video)) {
    const walk = (d, base = "") => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name), join(base, e.name)) : [join(base, e.name)]));
    for (const rel of walk(join(tmp, "video"))) {
      const mine = join(video, rel);
      if (!existsSync(mine)) r.kitEdited.push(`${rel} (missing)`);
      else if (!readFileSync(mine).equals(readFileSync(join(tmp, "video", rel)))) r.kitEdited.push(rel);
    }
    r.plan = JSON.parse(readFileSync(join(tmp, "video", "mk-plan.json"), "utf8"));
  }
  rmSync(tmp, { recursive: true, force: true });

  const sb = readFileSync(join(work, "storyboard.json"), "utf8");
  let brief = "";
  for (const f of readdirSync(run)) if (f === "prompt.txt") brief += readFileSync(join(run, f), "utf8");
  for (const f of readdirSync(work)) if (/\.(html?|css|txt|md)$/i.test(f) && f !== "storyboard.json") brief += "\n" + readFileSync(join(work, f), "utf8");
  const flat = brief.toLowerCase();
  try {
    const texts = [];
    const dig = (v) => { if (typeof v === "string") texts.push(v); else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (!["type", "file", "recipe", "look", "lang", "accent", "highlight"].includes(k)) dig(x); }); };
    dig(JSON.parse(sb).scenes);
    for (const t of texts) {
      for (const n of t.match(/\d[\d.,]*\d|\d{2,}/g) || []) if (!flat.includes(n.toLowerCase())) r.notInBrief.push(`number ${n} in "${t}"`);
      for (const a of t.match(/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?|@[a-z0-9_.]+/gi) || []) if (!/^\d/.test(a) && !flat.includes(a.toLowerCase())) r.notInBrief.push(`address ${a}`);
    }
  } catch (e) { r.storyboardJson = String(e.message); }
}
if (existsSync(join(video, "REVIEW.md"))) {
  const rev = readFileSync(join(video, "REVIEW.md"), "utf8");
  r.review = { lines: rev.trim().split("\n").filter((l) => l.trim()).length, frames: (rev.match(/frame\s*\d+/gi) || []).length };
}
const mp4 = existsSync(video) ? readdirSync(video).find((f) => f.endsWith(".mp4")) : null;
if (mp4) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=width,height,r_frame_rate", "-of", "json", join(video, mp4)], { encoding: "utf8" }));
  r.video = { file: mp4, duration: Number(j.format.duration), sizeMB: +(Number(j.format.size) / 1e6).toFixed(2), width: j.streams[0].width, height: j.streams[0].height };
}
const stream = join(run, "stream.jsonl");
if (existsSync(stream)) {
  for (const line of readFileSync(stream, "utf8").split("\n")) {
    if (!line.startsWith("{")) continue;
    const m = JSON.parse(line);
    if (m.type === "assistant") for (const c of m.message.content) {
      if (c.type === "tool_use" && c.name === "Bash") r.commands.push(String(c.input.command).replace(/\S*\/skills\/motion-kit\//g, "<kit>/").slice(0, 160));
      if (c.type === "tool_use" && ["Write", "Edit"].includes(c.name) && /\/video\/(?!REVIEW\.md)/.test(String(c.input.file_path))) r.kitEdited.push(`edited by hand: ${c.input.file_path.split("/work/")[1]}`);
    }
    if (m.type === "result") r.result = { turns: m.num_turns, cost: m.total_cost_usd, seconds: Math.round(m.duration_ms / 1000), error: m.is_error || undefined };
  }
}
if (existsSync(join(run, "prompts.jsonl"))) for (const line of readFileSync(join(run, "prompts.jsonl"), "utf8").split("\n").filter(Boolean)) { const p = JSON.parse(line); if (!p.allow) r.refused.push(String(p.input?.command || p.tool).slice(0, 120)); }
try { r.telemetryOff = JSON.parse(readFileSync(join(run, "hf-config", "config.json"), "utf8")).telemetryEnabled === false; } catch (e) {}
r.chained = r.commands.filter((c) => /&&|;|\|/.test(c));
r.pass = !!(r.builds && !r.kitEdited.length && r.sheet && r.review && r.video && r.plan && Math.abs(r.video.duration - r.plan.duration) < 0.5 && !r.notInBrief.length && !r.chained.length);
delete r.plan;
console.log(JSON.stringify(r, null, 2));
