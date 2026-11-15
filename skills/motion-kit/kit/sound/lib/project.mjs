// Reads what the video builder leaves behind: video/cues.json, video/mk-plan.json and the
// storyboard next to the video folder. Problems come back as sentences that say what to do.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const CUE_TYPES = ["land", "whoosh", "type", "press", "count", "cut", "marker"];

export function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch (e) { return null; }
}

// Flags as --name value or --name (true); everything else is a positional argument.
export function args(argv, valued = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const [name, inline] = a.slice(2).split("=");
    if (inline !== undefined) out[name] = inline;
    else if (valued.includes(name)) out[name] = argv[++i];
    else out[name] = true;
  }
  return out;
}

export function exitWith(title, problems) {
  console.log(`${title} Fix ${problems.length === 1 ? "this" : `these ${problems.length} things`}, then run the same command again:\n`);
  problems.forEach((p, i) => console.log(`${i + 1}. ${p}`));
  process.exit(1);
}

export function openVideo(dirArg) {
  const video = resolve(dirArg || "video");
  const problems = [];
  if (!existsSync(video)) problems.push(`There is no folder ${video}. Build the video first, then give this command its video folder.`);
  const cuesFile = join(video, "cues.json");
  const cues = existsSync(cuesFile) ? readJson(cuesFile) : null;
  const plan = readJson(join(video, "mk-plan.json"));
  const storyboardFile = join(dirname(video), "storyboard.json");
  const storyboard = existsSync(storyboardFile) ? readJson(storyboardFile) : null;
  return { video, home: dirname(video), cuesFile, cues, plan, storyboardFile, storyboard, problems };
}

// Every reason a cues.json cannot be mixed, each as one sentence.
export function checkCues(c) {
  const out = [];
  if (!c || typeof c !== "object" || !Array.isArray(c.cues)) return ["video/cues.json is missing or broken. Run the video builder again; it writes that file."];
  if (!(c.duration > 0)) out.push(`cues.json "duration" must be the video's length in seconds, and it is ${JSON.stringify(c.duration)}. Run the video builder again.`);
  c.cues.forEach((q, i) => {
    const tag = `cues.json cue ${i + 1}`;
    if (!CUE_TYPES.includes(q.type)) out.push(`${tag} has type ${JSON.stringify(q.type)}. Use one of: ${CUE_TYPES.join(", ")}.`);
    if (!(q.t >= 0) || q.t > c.duration) out.push(`${tag} has "t": ${JSON.stringify(q.t)}, which is outside the video's ${c.duration} seconds. Give a time inside the video.`);
    if (q.until != null && !(q.until > q.t)) out.push(`${tag} has "until": ${JSON.stringify(q.until)}, which is not after its "t": ${JSON.stringify(q.t)}. Make "until" later than "t", or remove it.`);
    if (q.weight != null && ![1, 2, 3].includes(q.weight)) out.push(`${tag} has "weight": ${JSON.stringify(q.weight)}. Use 1 (quiet), 2 or 3 (loud), or leave it out.`);
  });
  return out;
}

// Which spoken lines have a take that still says the storyboard's words, in the voice the
// storyboard asks for. Scene numbers count from 1 here and in every file of video/voice/:
// scene-1.wav, 1.mp3, and the keys of durations.json.
//   ready    { "<scene number>": { file, seconds } }
//   waiting  [scene numbers whose line has no take yet, or whose take says older words]
export function voiceTakes(video, storyboard) {
  const scenes = storyboard && Array.isArray(storyboard.scenes) ? storyboard.scenes : [];
  const report = readJson(join(video, "voice", "report.json"));
  const durations = readJson(join(video, "voice", "durations.json")) || {};
  const rows = report && Array.isArray(report.lines) ? report.lines : null;
  const sameVoice = !report || report.narrator == null || report.narrator === (storyboard.narrator || "ringan");
  const ready = {}, waiting = [];
  scenes.forEach((s, i) => {
    const n = i + 1, text = s && typeof s.voice === "string" ? s.voice.trim() : "";
    if (!text) return;
    const file = join(video, "voice", `scene-${n}.wav`);
    const seconds = Number(durations[n]);
    const row = rows ? rows.find((r) => r.scene === n) : null;
    if (existsSync(file) && seconds > 0 && sameVoice && (!rows || (row && row.text === text))) ready[n] = { file, seconds };
    else waiting.push(n);
  });
  return { ready, waiting, report };
}

// When each scene starts, by scene number (1 is the first). The builder's plan is the source;
// without it, a scene starts at its earliest cue.
export function sceneStarts(plan, cues) {
  const out = {};
  if (plan && Array.isArray(plan.scenes)) for (const s of plan.scenes) out[s.n] = { start: s.start, dur: s.dur };
  else if (cues) {
    for (const q of cues.cues) if (q.scene != null && (out[q.scene] == null || q.t < out[q.scene].start)) out[q.scene] = { start: q.t, dur: null };
  }
  return out;
}
