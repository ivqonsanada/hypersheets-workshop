#!/usr/bin/env node
// Checks a storyboard and writes the video project.
//
//   node build.mjs [storyboard.json]
//
// It reads the storyboard, checks every scene against the kit's rules (lib/spec.mjs), and
// either prints what to fix, one sentence per problem, or writes `video/` next to the
// storyboard: a HyperFrames 0.9.51 project made of the kit's own scenes, with its sound laid
// (sound/mix.mjs: effects on the builder's own cues, the spoken lines that are already made,
// the storyboard's music). It reads and writes files only in the storyboard's folder and uses
// no network; the only program it starts is ffmpeg, when there is one, to read an MP3 and to
// measure the mix.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { LOOKS, LANGS, RECIPES, FIELDS, VARIANTS, PLAN, IN, OUT, voiceRoom, SOUND_DEFAULT, NARRATORS, CODE, WORDS, wrapCode } from "./lib/spec.mjs";
import { mixVideo } from "./sound/mix.mjs";
import { voiceTakes } from "./sound/lib/project.mjs";
import { lint } from "./sound/lib/text.mjs";
import { registry } from "./sound/lib/engines.mjs";

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
const TOP = ["recipe", "look", "lang", "accent", "sound", "narrator", "music", "scenes"];
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
  else if (n > rule.max) say(`${where} is ${n} characters; the limit is ${rule.max}. Shorten it by ${n - rule.max} or more: ${rule.how || SHORTEN}.`);
  if (rule.raw) return;
  if (v !== v.trim()) say(`${where} starts or ends with a space. Remove it.`);
  if (/[—–]|\s-\s/.test(v)) say(`${where} uses a dash as punctuation. Use a comma or a full stop.`);
  if (/\p{Extended_Pictographic}/u.test(v)) say(`${where} has an emoji. Remove it.`);
  if (/TODO|lorem ipsum|\[[^\]]*\]|<[^>]*>|\bxxx\b/i.test(v)) say(`${where} looks like a placeholder. Put the real words from the brief there, or remove the scene.`);
  const caps = v.split(/\s+/).filter((w) => w.length >= 5 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (caps.length >= 2) say(`${where} is written in capital letters. Write it in sentence case.`);
}
// A heading, a caption or a button is wording the writer chooses, not a fact: a missing one is written, never asked for.
const OWN_WORDS = {
  heading: "two to five words that say what the scene holds",
  caption: "one short line that says what the scene shows",
  title: "two or three words that name what is shown",
  label: "the words that say what the number is, as the brief says it",
  line: "one short line that gives the reason to act or the deadline",
  button: "two or three words that start with a verb (\"Buka halamannya\", \"Chat lewat WA\", \"Open the page\")",
};
function checkFields(n, type, s, fields) {
  const tag = `scene ${n} (${type})`;
  for (const k of Object.keys(s)) if (!["type", "scene", "voice", "variant"].includes(k) && !fields[k]) say(`${tag} has "${k}", which this scene does not use. Remove it. It uses: ${list(Object.keys(fields))}.`);
  for (const [k, rule] of Object.entries(fields)) {
    const v = s[k], where = `${tag} "${k}"`;
    if (v == null || v === "") { if (rule.req) say(OWN_WORDS[k] ? `${tag} needs "${k}": ${OWN_WORDS[k]}. These are your own words, not a fact from the brief, so write them now in the video's language and do not ask the user for them.` : `${tag} needs "${k}". Take it from the brief; if the brief does not have it, ask the user or use another scene. Never make one up.`); continue; }
    if (rule.kind === "text") checkText(where, v, rule);
    else if (rule.kind === "texts") {
      if (!Array.isArray(v)) { say(`${where} must be a list: ["…", "…"].`); continue; }
      if (v.length < rule.min || v.length > rule.most) say(`${where} has ${v.length} ${v.length === 1 ? "line" : "lines"}; it holds ${rule.min} to ${rule.most}. Keep the ones that matter most.`);
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
      if (!Number.isInteger(v) || v < 1 || v > (s[rule.of] || []).length) say(`${where} must be the number of one of the lines in "${rule.of}", counted from 1.`);
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
  if (s.variant != null) {
    const count = VARIANTS[type] || 1;
    if (count < 2) say(`scene ${n} (${type}) has "variant", and this scene has one layout. Remove it.`);
    else if (!Number.isInteger(s.variant) || s.variant < 1 || s.variant > count) say(`scene ${n} (${type}) "variant" picks one of the scene's ${count} layouts: write 1 or 2, without quote marks. Leave it out and the kit keeps the layout the video already has.`);
  }
  if (type === "prices" && Array.isArray(s.rows)) s.rows.forEach((row, k) => {
    for (const key of ["price", "was"]) if (row && typeof row[key] === "string" && row[key].trim() && !/\d/.test(row[key]) && !/^(gratis|free)$/i.test(row[key].trim())) say(`scene ${n} (prices) "rows" item ${k + 1} "${key}" must hold a price from the brief, such as "Rp15.000". A row without a price belongs in a list scene.`);
  });
  if (type === "numbers" && Array.isArray(s.items)) s.items.forEach((item, k) => {
    if (item && typeof item.value === "string" && item.value.trim() && !/\d/.test(item.value)) say(`scene ${n} (numbers) "items" item ${k + 1} "value" must hold a number from the brief, such as "340" or "Rp8.500.000". A line without a number belongs in a list scene.`);
  });
  if (type === "swap" && typeof s.before === "string" && s.before === s.after) say(`scene ${n} (swap) shows the same file as "before" and as "after". It needs two pictures; with one picture, use an image scene.`);
  if (type === "image" && !s.title && !s.caption) say(`scene ${n} (image) needs a "title" or a "caption": two or three words that name what the picture shows. A caption is only for something the picture does not say by itself, such as its price.`);
  // Code that would not fit its card even at the smallest size, where a row holds CODE.cols characters and a longer line wraps.
  if (type === "code" || type === "fix") {
    const lines = (type === "code" ? [s.lines] : [s.wrong, s.right]).flatMap((x) => (Array.isArray(x) ? x.filter((l) => typeof l === "string") : []));
    const rows = lines.map((line) => wrapCode(line, CODE.cols).length), total = rows.reduce((sum, x) => sum + x, 0), most = type === "code" ? CODE.rows : CODE.fixRows;
    if (rows.some((x) => x > 3)) say(`scene ${n} (${type}) has a line of code that is indented too deep to fit the card. Remove some of its leading spaces.`);
    else if (total > most) say(`scene ${n} (${type}) takes ${total} rows on screen (a line longer than ${CODE.cols} characters wraps onto a second row), and ${type === "code" ? "a code card holds" : "its two cards hold"} ${most}. Take out the lines the point does not need, or break a long line where the language allows.`);
  }
  if (type === "when" && typeof s.date === "string" && s.date.trim() && !/^\d/.test(s.date)) say(`scene ${n} (when) "date" must be the day of the month as a number, such as "13". The day's name goes in "day", the month and the year in "month".`);
  if (type === "when" && typeof s.month === "string" && /^\d{1,2}\s/.test(s.month)) say(`scene ${n} (when) "month" starts with a day of the month. Put that number in "date" and keep only the month and the year here.`);
  if (type === "stat" && typeof s.value === "string" && !/\d/.test(s.value)) say(`scene ${n} (stat) "value" must hold a number from the brief, such as "87%" or "Rp15.000".`);
  // A page address or a handle has no spaces; a street address or a phone number, given by a shop with no page, may.
  for (const k of ["address"]) if (typeof s[k] === "string") {
    const v = s[k], web = /^@|[a-z0-9-]\.[a-z]{2,}(\/|$)/i.test(v.replace(/\s+/g, ""));
    if (/^https?:/i.test(v)) say(`scene ${n} (${type}) "${k}" must be the address alone, without "https://".`);
    else if (/\s/.test(v) && (type === "page" || (web && !/\d\s|,\s/.test(v)))) say(`scene ${n} (${type}) "${k}" is a page address or a handle, so it has no spaces. Write it as the user gave it.`);
  }
});
const types = scenes.map(typeOf);
if (scenes.length && types[0] !== "title") say(`The first scene must be a title scene.`);
if (scenes.length && types[types.length - 1] !== "end") say(`The last scene must be an end scene.`);
if (scenes.length < 3 || scenes.length > 6) say(`The video has ${scenes.length} scenes; it needs 3 to 6.`);
for (const t of new Set(types)) {
  const count = types.filter((x) => x === t).length;
  if (t === "image") { if (count > 3) say(`There are ${count} image scenes; a video holds three pictures at most. Keep the three that show the most.`); }
  else if (count > 1 && FIELDS[t]) say(`There are ${count} ${t} scenes; a video holds one of each. Keep the stronger one, or join them.`);
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
// Every text a scene shows (code and file names apart). A when scene keeps its date in three fields: it is
// read as the one date it shows ("Sabtu, 13 Desember 2026"), so the two checks below see it whole.
const strings = (o, got = [], top = true) => {
  if (typeof o === "string") got.push(o);
  else if (o && typeof o === "object") {
    const code = ["code", "fix"].includes(typeOf(o));
    for (const [k, v] of Object.entries(o)) if (!["type", "scene", "file", "before", "after", "voice", "variant"].includes(k) && !(code && ["lines", "wrong", "right"].includes(k))) strings(v, got, false);
    if (top && typeOf(o) === "when" && typeof o.date === "string" && typeof o.month === "string") got.push(`${typeof o.day === "string" ? o.day + ", " : ""}${o.date} ${o.month}`);
  }
  return got;
};
// A number, a date or an address that three scenes show: the viewer has read it twice already, and the third place is a scene with nothing new.
{
  const words = (t) => t.toLowerCase().split(/[^\p{L}\p{N}@.%-]+/u).map((w) => w.replace(/^[.-]+|[.-]+$/g, "")).filter(Boolean);
  const number = (w) => /\d/.test(w) && (w.replace(/\D/g, "").length >= 2 || /%|^rp/.test(w)) && !/^(19|20)\d\d$/.test(w);
  const at = new Map();
  scenes.forEach((sc, i) => {
    if (!sc || typeof sc !== "object") return;
    const here = new Set();
    for (const t of strings(sc)) {
      const w = words(t);
      w.forEach((x, k) => {
        if (number(x)) here.add(x);
        if (k + 1 < w.length && (/\d/.test(x) || /\d/.test(w[k + 1])) && x.length + w[k + 1].length >= 5) here.add(`${x} ${w[k + 1]}`);
      });
    }
    for (const h of here) at.set(h, [...(at.get(h) || []), i + 1]);
  });
  const sets = new Map();
  for (const [h, where] of at) if (where.length >= 3) sets.set(where.join(), { where, said: [...((sets.get(where.join()) || {}).said || []), h] });
  for (const { where, said } of sets.values()) say(`Scenes ${where.slice(0, -1).join(", ")} and ${where[where.length - 1]} all show the same fact (${[...said].sort((x, y) => y.length - x.length).slice(0, 3).map((x) => `"${x}"`).join(", ")}). A viewer needs it once, or twice when the second place is the end card. Keep it where it reads best and take it out of the other scenes. Do not put a new fact in its place: a scene left with nothing of its own is removed.`);
}
// A day name beside a full date ("Sabtu, 13 Desember 2026") that the calendar does not agree with. The builder cannot
// know which of the two the user meant, so it builds with the words as written and says so at the end.
const notes = [];
{
  const DAYS = { id: ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"], en: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] };
  const MONTHS = { id: ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"], en: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"] };
  const told = new Set();
  scenes.forEach((sc, i) => {
    for (const t of strings(sc)) {
      for (const L of ["id", "en"]) {
        const day = `(${DAYS[L].join("|")}|jum'at|ahad)`, month = `(${MONTHS[L].join("|")})`;
        const found = [...t.matchAll(new RegExp(`\\b${day},?\\s+(\\d{1,2})\\s+${month}\\s+(\\d{4})\\b`, "gi"))].map((m) => ({ said: m[0], day: m[1], d: +m[2], month: m[3], y: +m[4] }));
        if (L === "en") found.push(...[...t.matchAll(new RegExp(`\\b${day},?\\s+${month}\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "gi"))].map((m) => ({ said: m[0], day: m[1], d: +m[3], month: m[2], y: +m[4] })));
        for (const f of found) {
          const name = f.day.toLowerCase().replace("jum'at", "jumat").replace("ahad", "minggu");
          const date = new Date(Date.UTC(f.y, MONTHS[L].indexOf(f.month.toLowerCase()), f.d));
          if (date.getUTCDate() !== f.d) { if (!told.has(f.said)) notes.push(`scene ${i + 1} says "${f.said}", and that month has no day ${f.d}.`); told.add(f.said); continue; }
          const real = DAYS[L][date.getUTCDay()];
          if (real !== name && !told.has(f.said)) notes.push(`scene ${i + 1} says "${f.said}", and on the calendar that date is a ${real[0].toUpperCase() + real.slice(1)}.`);
          told.add(f.said);
        }
      }
    }
  });
}
if (fs.existsSync(out) && !fs.existsSync(path.join(out, "mk-plan.json"))) say(`A folder named video is already here and the kit did not make it. Ask the user before anything in it is replaced.`);

// Sound: effects by the kit's own choice, spoken lines where a scene has "voice", music if given.
const spoken = scenes.map((s, i) => ({ n: i + 1, text: s && typeof s.voice === "string" ? s.voice.trim() : "" })).filter((l) => l.text);
const nums = (a) => (a.length === 1 ? `scene ${a[0]}` : `scenes ${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
if (sb.sound != null && !["on", "off"].includes(sb.sound)) say(`"sound" must be "on" or "off". Leave it out and the video has ${SOUND_DEFAULT === "on" ? "sound effects" : "no sound effects"}.`);
if (sb.sound === "off" && spoken.length) say(`"sound": "off" keeps the video silent, but ${nums(spoken.map((l) => l.n))} ${spoken.length === 1 ? "has" : "have"} a "voice" line. Remove "sound": "off", or remove the "voice" lines.`);
if (sb.sound === "off" && sb.music != null) say(`"sound": "off" keeps the video silent, but "music" is set. Remove one of the two.`);
if (LANGS.includes(sb.lang)) for (const l of spoken) for (const what of lint(l.text, sb.lang)) say(`scene ${l.n} "voice" ${what}`);
if (sb.narrator != null) {
  if (typeof sb.narrator !== "string" || !(NARRATORS.includes(sb.narrator) || registry().voices[sb.narrator])) say(`"narrator" says which voice speaks the "voice" lines. It must be one of: ${list(NARRATORS)}.`);
  else if (!spoken.length) say(`"narrator" is set, but no scene has a "voice" line. Add "voice": "one spoken sentence" to the scenes that should speak, or remove "narrator".`);
}
const effectsOn = sb.sound ? sb.sound === "on" : SOUND_DEFAULT === "on";
const soundOn = sb.sound !== "off" && (effectsOn || spoken.length > 0 || music != null);
if (problems.length) stop();

// ---------- plan: when every scene starts and what happens in it ----------
const r2 = (v) => Math.round(v * 100) / 100;
// The takes in video/voice/ that still say the storyboard's words, by scene number from 1.
const takes = spoken.length ? voiceTakes(out, sb) : { ready: {}, waiting: [] };
const hash = (s) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.codePointAt(0), 16777619) >>> 0; return x; };
// What the last build of this folder wrote. A scene keeps the layout it had there, so changing a
// word in a revision does not also change how the scene is laid out.
let before = null;
try { before = JSON.parse(fs.readFileSync(path.join(out, "mk-plan.json"), "utf8")); } catch (e) {}
const had = {}; // type -> the layouts of that type's scenes in the last build, in order
for (const x of (before && Array.isArray(before.scenes) ? before.scenes : [])) (had[x.type] = had[x.type] || []).push(x.v);
const seen = {};
let at = 0;
const cues = [], stills = [], plan = [];
scenes.forEach((s, i) => {
  const type = typeOf(s), first = i === 0, last = i === scenes.length - 1, a = first ? 0 : IN;
  const c = custom[type];
  const p = c ? { need: a + c.seconds, T: { a }, cues: (c.cues || []).map((q) => ({ ...q, t: a + q.t })), stills: [{ t: a + c.still, expect: c.expect }] } : PLAN[type](s, a, sb.lang);
  const words = typeof s.voice === "string" ? s.voice.trim().split(/\s+/).length : 0;
  const preset = r2(p.need + (last ? 0 : OUT));
  if (s.voice != null) {
    if (typeof s.voice !== "string" || !s.voice.trim()) say(`scene ${i + 1} "voice" must be one spoken sentence, or left out.`);
    else if (words > voiceRoom(preset)) say(`scene ${i + 1} "voice" has ${words} words; this scene has room for about ${voiceRoom(preset)}. Say it shorter.`);
  }
  const take = takes.ready[i + 1];
  // A line starts 0.3 s into its scene and ends before the cover closes; the last scene holds
  // half a second after its line, so the video does not end on a word.
  const dur = r2(Math.max(preset, take ? take.seconds + 0.4 + (last ? 0.5 : OUT) : 0));
  const id = "s" + (i + 1);
  // The layout: the one the storyboard asks for, else the one this scene had in the last build
  // (the first, second… scene of its type), else one picked from the scene's own words.
  const layouts = VARIANTS[type] || 1, nth = (seen[type] = (seen[type] || 0) + 1) - 1;
  const kept = had[type] ? had[type][nth] : null;
  const { variant, ...rest } = s;
  const v = Number.isInteger(variant) ? variant - 1 : Number.isInteger(kept) && kept >= 0 && kept < layouts ? kept : (hash(JSON.stringify(rest)) + LOOKS.indexOf(sb.look)) % layouts;
  plan.push({ n: i + 1, id, type, start: r2(at), dur, v, T: p.T, first, last });
  for (const q of p.cues) cues.push({ ...q, t: r2(at + q.t), ...(q.until != null ? { until: r2(at + q.until) } : {}), scene: i + 1 });
  if (!last) cues.push({ t: r2(at + dur - OUT), type: "whoosh", weight: 1, scene: i + 1 }, { t: r2(at + dur), type: "cut", weight: 2, scene: i + 2 });
  for (const st of p.stills) stills.push({ t: r2(at + st.t), scene: i + 1, type, expect: st.expect });
  at += dur;
});
const total = r2(at);
const anyVoice = Object.keys(takes.ready).length > 0;
if (total > (anyVoice ? 45 : 32)) say(`The video would run ${total} seconds; the most is ${anyVoice ? 45 : 32}. Drop a scene, or shorten the longest texts.`);
if (total < 8) say(`The video would run ${total} seconds; it needs at least 8. Add a scene the recipe allows.`);
if (problems.length) stop();

// ---------- write ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
const write = (rel, text) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const copy = (from, rel) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(from, p); };
// The sheet shows the pictures. It stays when only the sound changed (a spoken line, a voice
// that stretched a scene), so the frames a review was written from are still there.
const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);
const pictures = sha(JSON.stringify({ look: sb.look, lang: sb.lang, accent: sb.accent || null, layouts: plan.map((p) => p.v), scenes: scenes.map((s) => { const c = { ...s }; delete c.voice; for (const k of ["file", "before", "after"]) if (typeof c[k] === "string" && inside(c[k])) c[k + "Is"] = sha(fs.readFileSync(inside(c[k]))); return c; }) }));
const sheetStays = !!(before && before.pictures === pictures && fs.existsSync(path.join(out, "sheet.png")));
for (const old of ["compositions", "index.html", "assets/kit", "assets/page", "assets/img", "assets/custom", ".sheet", ...(sheetStays ? [] : ["frames", "sheet.png"])]) fs.rmSync(path.join(out, old), { recursive: true, force: true });
fs.cpSync(path.join(KIT, "runtime"), path.join(out, "assets", "kit"), { recursive: true });

// A picture's width and height in pixels, read from the file's own header (png, jpg, webp), so
// the image scene can give it a frame of its own shape. Unknown: null, and the frame is the kit's.
function pictureSize(abs) {
  try {
    const b = fs.readFileSync(abs);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const kind = b.toString("ascii", 12, 16);
      if (kind === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      if (kind === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
      if (kind === "VP8L") { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
    }
  } catch (e) {}
  return null;
}

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
  delete s.variant;
  if (p.type === "page") { s.src = copyPage(s.file); if (!scripts.includes("assets/kit/page.js")) scripts.push("assets/kit/page.js"); }
  if ((p.type === "code" || p.type === "fix") && !scripts.includes("assets/kit/wrap.js")) scripts.splice(1, 0, "assets/kit/wrap.js");
  if (p.type === "image") {
    const abs = inside(s.file), size = pictureSize(abs);
    s.src = "assets/img/" + path.basename(abs);
    copy(abs, s.src);
    if (size && size.w > 0 && size.h > 0) { s.w = size.w; s.h = size.h; }
  }
  if (p.type === "swap") {
    // Both pictures share one frame, in the shape of the after picture.
    const one = inside(s.before), two = inside(s.after), size = pictureSize(two);
    s.src = "assets/img/before-" + path.basename(one);
    s.src2 = "assets/img/after-" + path.basename(two);
    copy(one, s.src);
    copy(two, s.src2);
    if (size && size.w > 0 && size.h > 0) { s.w = size.w; s.h = size.h; }
  }
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

// ---------- sound ----------
// The mixer reads the cues and the plan, so they are written first. It lays the effects, the
// spoken lines that are ready and the music into one file, which the video plays from 0.
const planScenes = plan.map(({ n, id, type, start, dur, v }) => ({ n, id, type, start, dur, v }));
write("cues.json", JSON.stringify({ look: sb.look, duration: total, cues: cues.sort((a, b) => a.t - b.t) }, null, 2) + "\n");
const mix = path.join(out, "assets", "audio", "mix.wav");
let audio = "", heard = { on: false };
if (soundOn) {
  let m;
  try { m = mixVideo(out, { storyboard: sb, plan: { scenes: planScenes }, "no-sfx": !effectsOn }); } catch (e) { m = { ok: false, problems: [e.message] }; }
  if (!m.ok) { for (const p of m.problems) say(`The sound could not be laid. ${p}`); stop(); }
  const rep = m.report;
  heard = { on: true, effects: rep.cues.length, palette: rep.palette, voice: rep.voice.map((v) => v.scene), voiceWaiting: takes.waiting, voiceName: rep.voiceName || null, narrator: spoken.length ? sb.narrator || "ringan" : null, music: !!rep.music, lufs: rep.lufs, truePeakDb: rep.truePeakDb, warnings: rep.warnings };
  audio = `\n      <audio id="mk-mix" src="assets/audio/mix.wav" data-start="0" data-duration="${total}" data-track-index="2" data-volume="1"></audio>`;
} else {
  fs.rmSync(mix, { force: true });
  fs.rmSync(path.join(out, "mix-report.json"), { force: true });
}
const words = WORDS[sb.lang];
const sample = [...new Set(JSON.stringify(scenes) + Object.values(words).join(""))].join("");
const config = { look: sb.look, lang: sb.lang, accent: sb.accent || null, words, sample };
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
write("mk-plan.json", JSON.stringify({ look: sb.look, lang: sb.lang, duration: total, pictures, sound: heard, scenes: planScenes, stills: stills.map((s, i) => ({ n: i + 1, ...s })) }, null, 2) + "\n");

console.log(`OK. ${plan.length} scenes, ${total} seconds, look "${sb.look}".\n`);
for (const p of plan) console.log(`  ${p.n}. ${p.type.padEnd(8)} ${String(p.start).padStart(5)} to ${r2(p.start + p.dur)} s`);
if (!heard.on) console.log(`\nSound: none${sb.sound === "off" ? ` (the storyboard says "sound": "off")` : ""}.`);
else {
  const parts = [];
  if (heard.effects) parts.push(`${heard.effects} sound effects (palette "${heard.palette}")`);
  if (heard.voice.length) parts.push(`${heard.voice.length} spoken ${heard.voice.length === 1 ? "line" : "lines"}${heard.voiceName ? ` (${heard.voiceName})` : ""}`);
  if (heard.music) parts.push("music");
  console.log(`\nSound: ${parts.join(", ")}; ${heard.lufs ?? "silent"} LUFS, peak ${heard.truePeakDb ?? "none"} dBTP.`);
  for (const w of heard.warnings) console.log(`Sound check: ${w}`);
}
if (takes.waiting.length) console.log(`\nThe "voice" ${takes.waiting.length === 1 ? "line" : "lines"} of ${nums(takes.waiting)} ${takes.waiting.length === 1 ? "is" : "are"} not spoken yet. After the sheet and REVIEW.md, and before the render, run:\n  node "${path.join(KIT, "sound.mjs")}"`);
if (sheetStays) console.log(`\nWrote the project to video/. The pictures did not change, so video/sheet.png still shows them.`);
else console.log(`\nWrote the project to video/. Next, make the contact sheet:\n  node "${path.join(KIT, "stills.mjs")}"`);
if (notes.length) console.log(`\nCHECK WITH THE USER. The video is built with the words as the storyboard has them, and one thing in them cannot be right:\n${notes.map((x) => `  - ${x}`).join("\n")}\nDo not change the day or the date yourself: you cannot know which one the user meant. In your last message, tell the user what the calendar says and ask which is right.`);
