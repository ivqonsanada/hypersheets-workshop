#!/usr/bin/env node
// Checks a storyboard and writes the video project.
//
//   node build.mjs [storyboard.json]
//
// It reads the storyboard, checks every scene against the kit's rules (lib/spec.mjs), and
// either prints what to fix, one sentence per problem, or writes `video/` next to the
// storyboard: a HyperFrames 0.9.51 project made of the kit's own scenes. It reads and writes
// files only in the storyboard's folder, runs no other program and uses no network.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOOKS, LANGS, RECIPES, FIELDS, VARIANTS, PLAN, IN, OUT, voiceRoom } from "./lib/spec.mjs";

const KIT = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(process.argv[2] || "storyboard.json");
const dir = path.dirname(file);
const out = path.join(dir, "video");
const problems = [];
const say = (s) => problems.push(s);
const list = (a) => a.join(", ");
const SHORTEN = "cut it before a joining word (yang, dengan, untuk, supaya; that, with, so, because) and keep the words before it, or write the whole line again, shorter";

function stop() {
  console.log(`The storyboard is not ready. Fix ${problems.length === 1 ? "this" : `these ${problems.length} things`} in ${path.basename(file)}, then run the build again:\n`);
  problems.forEach((p, i) => console.log(`${i + 1}. ${p}`));
  process.exit(1);
}

// ---------- read ----------
if (!fs.existsSync(file)) { say(`There is no ${path.basename(file)} in this folder. Write it first.`); stop(); }
let sb;
try { sb = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { say(`${path.basename(file)} is not valid JSON (${e.message}). Check the commas and the quote marks.`); stop(); }
if (!sb || typeof sb !== "object" || Array.isArray(sb)) { say("The storyboard must be one JSON object: { \"recipe\": …, \"look\": …, \"lang\": …, \"scenes\": [ … ] }."); stop(); }

// ---------- check ----------
const TOP = ["recipe", "look", "lang", "accent", "music", "scenes"];
for (const k of Object.keys(sb)) if (!TOP.includes(k)) say(`"${k}" is not a setting of the kit. Remove it. The settings are: ${list(TOP)}.`);
if (!RECIPES[sb.recipe]) say(`"recipe" must be one of: ${list(Object.keys(RECIPES))}.`);
if (!LOOKS.includes(sb.look)) say(`"look" must be one of: ${list(LOOKS)}.`);
if (!LANGS.includes(sb.lang)) say(`"lang" must be "id" or "en": the language the video's words are in.`);
const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
if (!Array.isArray(sb.scenes)) say(`"scenes" must be a list of scenes.`);

const inside = (rel) => {
  if (typeof rel !== "string" || !rel || path.isAbsolute(rel) || /^[a-z]+:/i.test(rel)) return null;
  const abs = path.resolve(dir, rel);
  return abs.startsWith(dir + path.sep) ? abs : null;
};
function checkText(where, v, rule) {
  if (typeof v !== "string") return say(`${where} must be text in quote marks.`);
  const n = [...v].length;
  if (!v.trim()) return say(`${where} is empty. Write it, or remove it.`);
  if (/\n/.test(v)) say(`${where} has a line break in it. Write it as one line.`);
  if (n > rule.max && rule.raw) say(`${where} is ${n} characters; a line of code holds ${rule.max}. Break it into two lines at a place the language allows (after a comma, an operator or an opening bracket), and indent the second.`);
  else if (n > rule.max) say(`${where} is ${n} characters; the limit is ${rule.max}. Shorten it by ${n - rule.max} or more: ${SHORTEN}.`);
  if (rule.raw) return;
  if (v !== v.trim()) say(`${where} starts or ends with a space. Remove it.`);
  if (/[—–]|\s-\s/.test(v)) say(`${where} uses a dash as punctuation. Use a comma or a full stop.`);
  if (/\p{Extended_Pictographic}/u.test(v)) say(`${where} has an emoji. Remove it.`);
  if (/TODO|lorem ipsum|\[[^\]]*\]|<[^>]*>|\bxxx\b/i.test(v)) say(`${where} looks like a placeholder. Put the real words from the brief there, or remove the scene.`);
  const caps = v.split(/\s+/).filter((w) => w.length >= 5 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (caps.length >= 2) say(`${where} is written in capital letters. Write it in sentence case.`);
}
function checkFields(n, type, s, fields) {
  const tag = `scene ${n} (${type})`;
  for (const k of Object.keys(s)) if (!["type", "scene", "voice"].includes(k) && !fields[k]) say(`${tag} has "${k}", which this scene does not use. Remove it. It uses: ${list(Object.keys(fields))}.`);
  for (const [k, rule] of Object.entries(fields)) {
    const v = s[k], where = `${tag} "${k}"`;
    if (v == null || v === "") { if (rule.req) say(`${tag} needs "${k}". Take it from the brief; if the brief does not have it, ask the user or use another scene. Never make one up.`); continue; }
    if (rule.kind === "text") checkText(where, v, rule);
    else if (rule.kind === "texts") {
      if (!Array.isArray(v)) { say(`${where} must be a list: ["…", "…"].`); continue; }
      if (v.length < rule.min || v.length > rule.most) say(`${where} has ${v.length} lines; it holds ${rule.min} to ${rule.most}. Keep the ones that matter most.`);
      v.forEach((t, i) => checkText(`${tag} "${k}" line ${i + 1}`, t, rule));
    } else if (rule.kind === "object" || rule.kind === "objects") {
      const many = rule.kind === "objects";
      if (many ? !Array.isArray(v) : typeof v !== "object" || Array.isArray(v)) { say(`${where} must be ${many ? "a list of { … } items" : "one { … } item"}.`); continue; }
      if (many && (v.length < rule.min || v.length > rule.most)) say(`${where} has ${v.length} items; it holds ${rule.min} to ${rule.most}.`);
      (many ? v : [v]).forEach((o, i) => {
        const at = many ? `${tag} "${k}" item ${i + 1}` : where;
        if (!o || typeof o !== "object") return say(`${at} must be a { … } item.`);
        for (const kk of Object.keys(o)) if (!rule.of[kk]) say(`${at} has "${kk}", which it does not use. It uses: ${list(Object.keys(rule.of))}.`);
        for (const [kk, r] of Object.entries(rule.of)) {
          if (o[kk] == null || o[kk] === "") { if (r.req) say(`${at} needs "${kk}".`); } else checkText(`${at} "${kk}"`, o[kk], r);
        }
      });
    } else if (rule.kind === "file") {
      const abs = inside(v);
      if (!abs) say(`${where} must be the name of a file in this folder, such as "index.html".`);
      else if (!fs.existsSync(abs)) say(`${where}: there is no file "${v}" in this folder. Use the real file's name.`);
      else if (!rule.ext.includes(path.extname(abs).slice(1).toLowerCase())) say(`${where} must be a ${list(rule.ext)} file.`);
    } else if (rule.kind === "int") {
      if (!Number.isInteger(v) || v < 1 || v > (s.lines || []).length) say(`${where} must be the number of one of the code's lines, counted from 1.`);
    }
  }
}

const custom = {}; // custom/<name> -> { fields, seconds, still, expect, css }
const typeOf = (s) => (s && typeof s === "object" ? s.type || s.scene : null);
scenes.forEach((s, i) => {
  const n = i + 1, type = typeOf(s);
  if (!s || typeof s !== "object" || Array.isArray(s)) return say(`scene ${n} must be a { … } item with a "type".`);
  if (typeof type === "string" && type.startsWith("custom/")) {
    // Open mode: a scene written for this video, kept next to the storyboard.
    const base = inside(type);
    const def = base && fs.existsSync(path.join(base, "scene.json")) && fs.existsSync(path.join(base, "scene.js"));
    if (!/^custom\/[a-z0-9-]+$/.test(type) || !def) return say(`scene ${n}: "${type}" needs a folder ${type}/ here with scene.json and scene.js (see reference/custom-scene.md). Kit mode has no custom scenes.`);
    try { custom[type] = JSON.parse(fs.readFileSync(path.join(base, "scene.json"), "utf8")); } catch (e) { return say(`${type}/scene.json is not valid JSON (${e.message}).`); }
    const c = custom[type];
    if (!c.fields || !(c.seconds >= 2 && c.seconds <= 9) || !(c.still > 0 && c.still < c.seconds) || typeof c.expect !== "string") return say(`${type}/scene.json needs "fields", "seconds" (2 to 9), "still" (a time inside the scene) and "expect" (what that still shows).`);
    const fields = Object.fromEntries(Object.entries(c.fields).map(([k, r]) => [k, { kind: "text", max: Math.min(160, r.max || 40), req: !!r.req }]));
    return checkFields(n, type, s, fields);
  }
  if (!FIELDS[type]) return say(`scene ${n} has type "${type}", which the kit does not have. The scenes are: ${list(Object.keys(FIELDS))}.`);
  checkFields(n, type, s, FIELDS[type]);
  if (type === "stat" && typeof s.value === "string" && !/\d/.test(s.value)) say(`scene ${n} (stat) "value" must hold a number from the brief, such as "87%" or "Rp15.000".`);
  for (const k of ["address"]) if (typeof s[k] === "string" && /^https?:|\s/.test(s[k])) say(`scene ${n} (${type}) "${k}" must be the address alone: no "https://" and no spaces.`);
});
const types = scenes.map(typeOf);
if (scenes.length && types[0] !== "title") say(`The first scene must be a title scene.`);
if (scenes.length && types[types.length - 1] !== "end") say(`The last scene must be an end scene.`);
if (scenes.length < 3 || scenes.length > 6) say(`The video has ${scenes.length} scenes; it needs 3 to 6.`);
for (const t of new Set(types)) {
  const count = types.filter((x) => x === t).length;
  if (count > 1 && FIELDS[t]) say(`There are ${count} ${t} scenes; a video holds one of each. Keep the stronger one, or join them.`);
}
const recipe = RECIPES[sb.recipe];
if (recipe) {
  for (const any of recipe.need) if (!any.some((t) => types.includes(t))) say(`The recipe "${sb.recipe}" needs a ${any.join(" or ")} scene.`);
  types.forEach((t, i) => { if (FIELDS[t] && !["title", "end"].includes(t) && !recipe.may.includes(t)) say(`scene ${i + 1} is a ${t} scene, which the recipe "${sb.recipe}" does not hold. It may hold: ${list(recipe.may)}. Change the scene or pick the recipe that fits.`); });
}
const pageScene = scenes.find((s) => typeOf(s) === "page"), endScene = scenes.find((s) => typeOf(s) === "end");
if (pageScene && endScene && pageScene.address && endScene.address && pageScene.address !== endScene.address) say(`The page scene's address ("${pageScene.address}") and the end scene's ("${endScene.address}") differ. Use the one true address in both.`);
if (sb.accent != null && sb.accent !== "page" && !/^#[0-9a-f]{6}$/i.test(sb.accent)) say(`"accent" must be "page" or a colour written like "#0f766e". Leave it out to use the look's own colour.`);
if (sb.accent === "page" && !pageScene) say(`"accent": "page" takes the colour from a page scene, and this video has none. Give a colour like "#0f766e", or leave "accent" out.`);
let music = null;
if (sb.music != null) {
  music = inside(sb.music);
  if (!music || !fs.existsSync(music) || !/\.(mp3|wav|m4a)$/i.test(music)) say(`"music" must be an mp3, wav or m4a file in this folder. The kit never downloads or makes music.`);
}
if (fs.existsSync(out) && !fs.existsSync(path.join(out, "mk-plan.json"))) say(`A folder named video is already here and the kit did not make it. Ask the user before anything in it is replaced.`);
if (problems.length) stop();

// ---------- plan: when every scene starts and what happens in it ----------
const r2 = (v) => Math.round(v * 100) / 100;
let voiced = {};
try { voiced = JSON.parse(fs.readFileSync(path.join(out, "voice", "durations.json"), "utf8")); } catch (e) {}
const hash = (s) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.codePointAt(0), 16777619) >>> 0; return x; };
let at = 0;
const cues = [], stills = [], plan = [];
scenes.forEach((s, i) => {
  const type = typeOf(s), first = i === 0, last = i === scenes.length - 1, a = first ? 0 : IN;
  const c = custom[type];
  const p = c ? { need: a + c.seconds, T: { a }, cues: (c.cues || []).map((q) => ({ ...q, t: a + q.t })), stills: [{ t: a + c.still, expect: c.expect }] } : PLAN[type](s, a);
  const words = typeof s.voice === "string" ? s.voice.trim().split(/\s+/).length : 0;
  const preset = r2(p.need + (last ? 0 : OUT));
  if (s.voice != null) {
    if (typeof s.voice !== "string" || !s.voice.trim()) say(`scene ${i + 1} "voice" must be one spoken sentence, or left out.`);
    else if (words > voiceRoom(preset)) say(`scene ${i + 1} "voice" has ${words} words; this scene has room for about ${voiceRoom(preset)}. Say it shorter.`);
  }
  const dur = r2(Math.max(preset, voiced[i] != null ? Number(voiced[i]) + 0.4 + (last ? 0 : OUT) : 0));
  const id = "s" + (i + 1);
  const v = (hash(JSON.stringify(s)) + LOOKS.indexOf(sb.look)) % (VARIANTS[type] || 1);
  plan.push({ n: i + 1, id, type, start: r2(at), dur, v, T: p.T, first, last });
  for (const q of p.cues) cues.push({ ...q, t: r2(at + q.t), ...(q.until != null ? { until: r2(at + q.until) } : {}), scene: i + 1 });
  if (!last) cues.push({ t: r2(at + dur - OUT), type: "whoosh", weight: 1, scene: i + 1 }, { t: r2(at + dur), type: "cut", weight: 2, scene: i + 2 });
  for (const st of p.stills) stills.push({ t: r2(at + st.t), scene: i + 1, type, expect: st.expect });
  at += dur;
});
const total = r2(at);
const anyVoice = Object.keys(voiced).length > 0;
if (total > (anyVoice ? 45 : 32)) say(`The video would run ${total} seconds; the most is ${anyVoice ? 45 : 32}. Drop a scene, or shorten the longest texts.`);
if (total < 8) say(`The video would run ${total} seconds; it needs at least 8. Add a scene the recipe allows.`);
if (problems.length) stop();

// ---------- write ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
const write = (rel, text) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const copy = (from, rel) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(from, p); };
for (const old of ["compositions", "index.html", "assets/kit", "assets/page", "assets/img", "assets/custom", "frames", "sheet.png", ".sheet"]) fs.rmSync(path.join(out, old), { recursive: true, force: true });
fs.cpSync(path.join(KIT, "runtime"), path.join(out, "assets", "kit"), { recursive: true });

// The page and the files it uses (its CSS, its pictures), kept at the same relative places.
function copyPage(rel) {
  const abs = inside(rel), base = path.dirname(abs);
  const seen = new Set();
  const take = (ref, from) => {
    if (!ref || /^(?:[a-z]+:|\/\/|#|\/)/i.test(ref)) return;
    const src = path.resolve(from, ref.split(/[?#]/)[0]);
    if (!src.startsWith(base + path.sep) || seen.has(src) || !fs.existsSync(src) || !fs.statSync(src).isFile()) return;
    seen.add(src);
    copy(src, path.join("assets", "page", path.relative(base, src)));
    if (/\.css$/i.test(src)) for (const m of fs.readFileSync(src, "utf8").matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) take(m[1], path.dirname(src));
  };
  const html = fs.readFileSync(abs, "utf8");
  copy(abs, path.join("assets", "page", path.basename(abs)));
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) take(m[1], base);
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) take(m[1], base);
  return "assets/page/" + path.basename(abs);
}

const sub = (id, inner, script) => `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <div id="root" class="mk-sub" data-composition-id="${id}" data-width="1080" data-height="1920">
        ${inner}
      </div>
      <script>${script}</script>
    </template>
  </body>
</html>
`;
const scripts = ["assets/kit/mk.js", "assets/kit/scenes.js"], links = ["assets/kit/kit.css"];
plan.forEach((p, i) => {
  const s = { ...scenes[i] };
  delete s.voice;
  if (p.type === "page") { s.src = copyPage(s.file); if (!scripts.includes("assets/kit/page.js")) scripts.push("assets/kit/page.js"); }
  if (p.type === "image") { const abs = inside(s.file); s.src = "assets/img/" + path.basename(abs); copy(abs, s.src); }
  if (custom[p.type]) {
    const base = inside(p.type), name = p.type.slice(7);
    copy(path.join(base, "scene.js"), `assets/custom/${name}.js`);
    scripts.push(`assets/custom/${name}.js`);
    if (fs.existsSync(path.join(base, "scene.css"))) { copy(path.join(base, "scene.css"), `assets/custom/${name}.css`); links.push(`assets/custom/${name}.css`); }
  }
  const data = { type: p.type, v: p.v, dur: p.dur, first: p.first, last: p.last, T: p.T, s };
  write(`compositions/${p.id}.html`, sub(p.id, `<div class="mk-scene" id="${p.id}-in" data-mk='${esc(JSON.stringify(data))}'></div>`, `MK.mount("${p.id}");`));
});
write("compositions/bg.html", sub("bg", `<div class="mk-bg" id="bg-in"></div>`, `MK.ground("bg", ${total});`));

const mix = path.join(out, "assets", "audio", "mix.wav");
let audio = "";
if (fs.existsSync(mix)) audio = `\n      <audio id="mk-mix" src="assets/audio/mix.wav" data-start="0" data-duration="${total}" data-track-index="2" data-volume="1"></audio>`;
else if (music) { copy(music, "assets/audio/" + path.basename(music)); audio = `\n      <audio id="mk-music" src="assets/audio/${esc(path.basename(music))}" data-start="0" data-duration="${total}" data-track-index="2" data-volume="0.5"></audio>`; }
const sample = [...new Set(JSON.stringify(scenes))].join("");
const config = { look: sb.look, lang: sb.lang, accent: sb.accent || null, sample };
const host = (id, start, dur, track) => `      <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${start}" data-duration="${dur}" data-track-index="${track}" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`;
write("index.html", `<!doctype html>
<html lang="${sb.lang}" class="look-${sb.look}" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <!-- Written by the motion kit's build.mjs from storyboard.json. Change the storyboard and build again; do not edit this folder. -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
${links.map((l) => `    <link rel="stylesheet" href="${l}" />`).join("\n")}
    <script>window.MK_CONFIG = ${JSON.stringify(config).replace(/</g, "\\u003c")};</script>
${scripts.map((s) => `    <script src="${s}"></script>`).join("\n")}
  </head>
  <body>
    <div id="root" class="mk-main" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1080" data-height="1920">
${host("bg", 0, total, 0)}
${plan.map((p) => host(p.id, p.start, p.dur, 1)).join("\n")}${audio}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`);
write("hyperframes.json", JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } }, null, 2) + "\n");
write("cues.json", JSON.stringify({ look: sb.look, duration: total, cues: cues.sort((a, b) => a.t - b.t) }, null, 2) + "\n");
write("mk-plan.json", JSON.stringify({ look: sb.look, lang: sb.lang, duration: total, sound: audio ? (fs.existsSync(mix) ? "mix" : "music") : "silent", scenes: plan.map(({ n, id, type, start, dur }) => ({ n, id, type, start, dur })), stills: stills.map((s, i) => ({ n: i + 1, ...s })) }, null, 2) + "\n");

console.log(`OK. ${plan.length} scenes, ${total} seconds, look "${sb.look}"${audio ? "" : ", silent"}.\n`);
for (const p of plan) console.log(`  ${p.n}. ${p.type.padEnd(8)} ${String(p.start).padStart(5)} to ${r2(p.start + p.dur)} s`);
console.log(`\nWrote the project to video/. Next, make the contact sheet:\n  node "${path.join(KIT, "stills.mjs")}"`);
