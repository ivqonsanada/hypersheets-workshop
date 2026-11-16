// The mechanical part of the motion-kit rubric for one trial run. For maintainers.
//
//   node dev/score-kit.mjs <run-dir>
//
// Prints JSON: whether the storyboard still builds, whether anything the kit wrote was edited,
// whether the sheet, the review and the video are there, the commands that were run, and the
// numbers and addresses in the storyboard that appear nowhere in the brief or the user's files
// (a first net for invented facts; the rest is read by eye).
//
// Sound is scored against <run-dir>/expect.json, which says what the brief asked for:
//   { "sound": "effects" | "voice" | "off",      what the finished video should carry
//     "engine": "piper-id",                      for "voice": the voice in sound/engines.json
//     "stops": "files" | "install" }             the run must stop and hand over to the user
// Without that file the brief asked for nothing about sound, which means "effects".
// It checks: sound in the MP4 or not, as asked; loudness and peak of the MP4's own sound;
// every spoken line made, in the asked voice, and none running past its scene; the notice in
// the final message when the practice voice spoke; no voice installed (no install command,
// and the folder of voices unchanged); and no key or token in anything the run wrote.
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
const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { return null; } };
const expect = { sound: "effects", ...(readJson(join(run, "expect.json")) || {}) };

if (r.storyboard) {
  // Build again in a copy: the storyboard as left must pass, and what the run left in video/
  // must be exactly what the builder writes.
  // The spoken lines are the sound layer's work, not the builder's: they go into the copy as
  // they are (with the old plan, so the builder knows the folder as its own), and the mix the
  // builder lays from them must come out the same, byte for byte.
  const tmp = mkdtempSync(join(tmpdir(), "mk-score-"));
  cpSync(work, tmp, { recursive: true, filter: (p) => !p.includes(`${work}/video`) });
  if (existsSync(join(video, "voice")) && existsSync(join(video, "mk-plan.json"))) {
    cpSync(join(video, "voice"), join(tmp, "video", "voice"), { recursive: true });
    cpSync(join(video, "mk-plan.json"), join(tmp, "video", "mk-plan.json"));
  }
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
    r.voiceLines = JSON.parse(sb).scenes.map((s, i) => ({ n: i + 1, text: typeof s.voice === "string" ? s.voice.trim() : "" })).filter((l) => l.text);
    r.narrator = JSON.parse(sb).narrator ?? null;
    for (const t of texts) {
      for (const n of t.match(/\d[\d.,]*\d|\d{2,}/g) || []) if (!flat.includes(n.toLowerCase())) r.notInBrief.push(`number ${n} in "${t}"`);
      for (const a of t.match(/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?|@[a-z0-9_.]+/gi) || []) if (!/^\d/.test(a) && !flat.includes(a.toLowerCase())) r.notInBrief.push(`address ${a}`);
    }
  } catch (e) { r.storyboardJson = String(e.message); }
}
if (existsSync(join(video, "REVIEW.md"))) {
  const rev = readFileSync(join(video, "REVIEW.md"), "utf8");
  r.review = { lines: rev.trim().split("\n").filter((l) => l.trim()).length, frames: (rev.match(/(?:frame|bingkai)\s*\d+/gi) || []).length };
}
const mp4 = existsSync(video) ? readdirSync(video).find((f) => f.endsWith(".mp4")) : null;
if (mp4) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,r_frame_rate", "-of", "json", join(video, mp4)], { encoding: "utf8" }));
  const pic = j.streams.find((s) => s.codec_type === "video") || j.streams[0];
  r.video = { file: mp4, duration: Number(j.format.duration), sizeMB: +(Number(j.format.size) / 1e6).toFixed(2), width: pic.width, height: pic.height, audio: j.streams.some((s) => s.codec_type === "audio") };
  if (r.video.audio) {
    // The loudness of what a viewer gets: the MP4's own sound, after its encoding.
    const m = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-nostdin", "-i", join(video, mp4), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
    const tail = (m.stderr || "").split("Summary:").pop();
    const num = (re) => { const x = re.exec(tail); return x ? (x[1] === "-inf" ? -Infinity : Number(x[1])) : null; };
    r.video.lufs = num(/I:\s+(-?[\d.]+|-inf) LUFS/);
    r.video.truePeakDb = num(/Peak:\s+(-?[\d.]+|-inf) dBFS/);
  }
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
    if (m.type === "result") { r.result = { turns: m.num_turns, cost: m.total_cost_usd, seconds: Math.round(m.duration_ms / 1000), error: m.is_error || undefined }; r.said = String(m.result || ""); }
  }
}
if (existsSync(join(run, "prompts.jsonl"))) for (const line of readFileSync(join(run, "prompts.jsonl"), "utf8").split("\n").filter(Boolean)) { const p = JSON.parse(line); if (!p.allow) r.refused.push(String(p.input?.command || p.tool).slice(0, 120)); }
try { r.telemetryOff = JSON.parse(readFileSync(join(run, "hf-config", "config.json"), "utf8")).telemetryEnabled === false; } catch (e) {}
r.chained = r.commands.filter((c) => /&&|;|\|/.test(c));

// ---------- sound ----------
const s = { asked: expect.stops ? `stop for the user (${expect.stops})` : expect.sound, narrator: r.narrator ?? null, problems: [] };
const bad = (t) => s.problems.push(t);
const said = (r.said || "").toLowerCase();
const heard = (r.plan && r.plan.sound) || {};
const lines = r.voiceLines || [];
const voiceReport = readJson(join(video, "voice", "report.json"));
const mixReport = readJson(join(video, "mix-report.json"));
if (r.video) Object.assign(s, { inVideo: r.video.audio, lufs: r.video.lufs ?? null, truePeakDb: r.video.truePeakDb ?? null });
if (heard.on) Object.assign(s, { effects: heard.effects, palette: heard.palette, spoken: heard.voice.length, voiceName: heard.voiceName });
// Nothing installed: no install command but the list, and the folder of voices as it was.
s.installCommands = r.commands.filter((c) => /install\.mjs/.test(c) && !/install\.mjs"?\s+list\s*$/.test(c));
const before = existsSync(join(run, "sound-home.before")) ? readFileSync(join(run, "sound-home.before"), "utf8") : null;
const after = existsSync(join(run, "sound-home.after")) ? readFileSync(join(run, "sound-home.after"), "utf8") : null;
s.voicesFolderUnchanged = before == null || after == null ? null : before === after;
if (s.installCommands.length) bad("a voice install was run, and nobody said yes");
if (s.voicesFolderUnchanged === false) bad("the folder of installed voices changed");
// No key or token: nothing that looks like one, and no secret of this shell, in what the run wrote.
const written = [existsSync(stream) ? readFileSync(stream, "utf8") : ""];
const walkText = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) walkText(f); else if (/\.(json|md|txt|html|js|css|log)$/i.test(e.name) && statSync(f).size < 4e6) written.push(readFileSync(f, "utf8")); } };
if (existsSync(work)) walkText(work);
const all = written.join("\n");
const secrets = Object.entries(process.env).filter(([k, v]) => /KEY|TOKEN|SECRET|PASSWORD/i.test(k) && v && v.length >= 12).map(([, v]) => v);
s.secrets = (all.match(/sk-ant-[\w-]{16,}|\bsk_[0-9a-f]{24,}|xi-api-key\s*[:=]\s*\S{8,}|Bearer\s+[\w.-]{20,}|ELEVENLABS_API_KEY\s*=\s*["']?[\w-]{8,}/g) || []).length + secrets.filter((v) => all.includes(v)).length;
if (s.secrets) bad(`${s.secrets} thing(s) that look like a key or token`);

if (expect.stops) {
  // The run must hand over to the user: no render, and the message carries what they need.
  if (r.video) bad("a video was rendered, though the voice was not ready");
  if (expect.stops === "files") for (const l of lines) {
    if (!said.includes(l.text.toLowerCase())) bad(`the final message leaves out the line of scene ${l.n}`);
    if (!new RegExp(`my-voice/${l.n}\\.(mp3|m4a|wav)`).test(said)) bad(`the final message does not name the file for scene ${l.n}`);
  }
  if (expect.stops === "install" && !(/boleh aku unduh sekarang\?|may i download it now\?/.test(said) && /\d+ mb/.test(said) && /github\.com/.test(said))) bad("the final message does not ask the download question with its size and source");
  if (!lines.length) bad("the storyboard has no voice lines");
} else if (expect.sound === "off") {
  if (heard.on || (r.video && r.video.audio)) bad("the video has sound, and silence was asked for");
} else {
  if (!r.video || !r.video.audio) bad("the MP4 has no sound");
  if (!heard.on || !(heard.effects > 0)) bad("the plan has no sound effects");
  if (r.video && r.video.truePeakDb != null && r.video.truePeakDb > -1) bad(`peak ${r.video.truePeakDb} dBTP is above -1`);
  if (expect.sound === "effects") {
    if (lines.length || r.narrator) bad("the storyboard has a voice, and nobody asked for one");
    if (r.video && r.video.lufs != null && !(r.video.lufs >= -26 && r.video.lufs <= -14.5)) bad(`loudness ${r.video.lufs} LUFS is outside -26 to -14.5`);
  }
  if (expect.sound === "voice") {
    if (!lines.length) bad("the storyboard has no voice lines");
    if ((heard.voiceWaiting || []).length || (heard.voice || []).length !== lines.length) bad("not every voice line is in the video");
    if (expect.engine && (!voiceReport || voiceReport.engine !== expect.engine)) bad(`the voice is ${voiceReport ? voiceReport.engine : "missing"}, not ${expect.engine}`);
    if (r.video && r.video.lufs != null && Math.abs(r.video.lufs - -16) > 1) bad(`loudness ${r.video.lufs} LUFS is more than 1 LU from -16`);
    // No line may run past its scene.
    for (const v of (mixReport && mixReport.voice) || []) {
      const sc = r.plan && r.plan.scenes.find((x) => x.n === v.scene);
      if (sc && v.at + v.seconds > sc.start + sc.dur + 0.05) bad(`the voice of scene ${v.scene} runs ${(v.at + v.seconds - sc.start - sc.dur).toFixed(2)} s past its scene`);
    }
    if (voiceReport) {
      s.heardAsWritten = `${voiceReport.lines.filter((l) => l.wer != null && !l.flag).length} of ${voiceReport.lines.filter((l) => l.wer != null).length}`;
      // The practice voice's notice must reach the user.
      if (voiceReport.use === "practice") { s.noticeShown = /non-komersial|non-commercial/.test(said); if (!s.noticeShown) bad("the practice voice's notice is not in the final message"); }
    }
  }
}
s.ok = !s.problems.length;
r.sound = s;

const base = !!(r.builds && !r.kitEdited.length && r.sheet && r.review && !r.notInBrief.length && !r.chained.length && !r.refused.length && r.telemetryOff === true);
r.pass = base && s.ok && (expect.stops ? true : !!(r.video && r.video.width === 1080 && r.video.height === 1920 && r.plan && Math.abs(r.video.duration - r.plan.duration) < 0.5));
delete r.plan; delete r.said; delete r.voiceLines;
console.log(JSON.stringify(r, null, 2));
