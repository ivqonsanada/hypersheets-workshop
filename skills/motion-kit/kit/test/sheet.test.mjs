// What the check sheet says under each frame, in the video's two languages: an Indonesian
// storyboard ("lang": "id") gets Indonesian labels and sentences, an English one gets the words the
// kit wrote before the sheet knew a second language. Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FIELDS, IN, PLAN, VARIANTS } from "../lib/spec.mjs";
import { sheetLabel, sheetPage, sheetSentence } from "../lib/sheet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..");
// One case is one scene with a choice that changes its sentence. "en" holds the sentences the kit
// at v0.5.0 wrote for it (that kit's own output, not typed by hand), "id" the Indonesian ones.
const CASES = JSON.parse(readFileSync(join(HERE, "sheet-sentences.json"), "utf8"));
const byName = (name) => CASES.find((c) => c.name === name);
const said = (c, lang) => PLAN[c.scene.type](c.scene, IN, lang, c.from || 0).stills.map((s) => s.expect);

// The English words the sheet's sentences are made of. An Indonesian sentence holds none of them.
// ("label" and "video" are Indonesian words too; PAGE MISSING is what a broken frame itself says.)
const ENGLISH = /\b(Should|should|show|shows|the|a|an|is|are|and|or|with|without|of|on|in|at|its|it|each|every|all|both|whole|above|below|under|over|then|not|no|none|neither|heading|headline|caption|line|lines|row|rows|item|items|card|cards|frame|window|picture|button|address|name|number|numbers|numbered|marked|typed|dimmed|struck|stretched|large|small|smaller|left|right|top|quote|full|step|steps|question|questions|answer|facts|panels|code|date|leaf|band|field|colour|scene)\b/;
const indonesian = (sentence, where) => {
  assert.doesNotMatch(sentence, ENGLISH, `${where}: an English word is left in "${sentence}"`);
  assert.doesNotMatch(sentence, /—/, `${where}: an em dash`);
};

function build(storyboard) {
  const dir = mkdtempSync(join(tmpdir(), "mk-sheet-"));
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard, null, 2));
  const r = spawnSync(process.execPath, [join(KIT, "build.mjs"), "storyboard.json"], { cwd: dir, encoding: "utf8", env: { ...process.env, HS_SOUND_HOME: join(dir, ".no-voices") } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const plan = JSON.parse(readFileSync(join(dir, "video", "mk-plan.json"), "utf8"));
  rmSync(dir, { recursive: true, force: true });
  return plan;
}

test("the cases hold every scene of the kit", () => {
  assert.deepEqual([...new Set(CASES.map((c) => c.scene.type))].sort(), Object.keys(FIELDS).sort());
  assert.equal(Object.keys(FIELDS).length, 17);
});

test("an English storyboard gets the sentences the kit at 0.5.0 wrote, to the letter", () => {
  for (const c of CASES) assert.deepEqual(said(c, "en"), c.en, c.name);
});

test("an Indonesian storyboard gets every sentence in Indonesian", () => {
  for (const c of CASES) {
    const id = said(c, "id");
    assert.deepEqual(id, c.id, c.name);
    assert.equal(id.length, c.en.length, `${c.name}: as many stills as in English`);
    id.forEach((sentence, i) => {
      indonesian(sentence, c.name);
      assert.notEqual(sentence, c.en[i], c.name);
    });
    // The language changes the words under a frame, never when the frame is taken.
    const t = (lang) => PLAN[c.scene.type](c.scene, IN, lang, c.from || 0).stills.map((s) => s.t);
    assert.deepEqual(t("id"), t("en"), c.name);
  }
});

test("the video's own words stand in the Indonesian sentence as written", () => {
  assert.match(said(byName("prices, an old price and a note"), "id")[0], /"Lontong sayur" Rp12\.000.*tiap harga lama dicoret.*baris kecil "Harga per porsi"/);
  assert.match(said(byName("end, with the name"), "id")[0], /^kartu penutup memakai warna video: "Pesan untuk dibungkus", nama "Warung Bu Lastri", alamat "@warungbulastri" terketik di sebuah kolom, dan tombol "Chat kami"$/);
  // The kit's own labels on a fix and a swap follow the language too, as they did.
  assert.match(said(byName("fix, the changed line marked"), "id")[0], /berlabel "Salah".*berlabel "Benar".*dengan baris 1 ditandai/);
  assert.match(said(byName("fix, the changed line marked"), "en")[0], /under the label "Wrong".*under "Right".*with line 1 marked/);
  assert.match(said(byName("swap, the kit's labels"), "id")[0], /berlabel "Sebelum".*berlabel "Sesudah"/);
  assert.match(said(byName("swap, the kit's labels"), "en")[0], /under the label "Before".*under "After"/);
});

test("the builder writes the plan's sentences in the storyboard's language", () => {
  const names = ["title, kicker and a long sub", "prices, an old price and a note", "when, day, label, end and two lines", "info", "end, with the name"];
  const board = (lang) => ({ recipe: "announce", look: "kertas", lang, scenes: names.map((n) => byName(n).scene) });
  const id = build(board("id")), en = build(board("en"));
  assert.equal(id.lang, "id");
  assert.equal(en.lang, "en");
  assert.deepEqual(en.stills.map((s) => s.expect), names.flatMap((n) => byName(n).en));
  assert.deepEqual(id.stills.map((s) => s.expect), names.flatMap((n) => byName(n).id));
  id.stills.forEach((s) => indonesian(s.expect, `frame ${s.n}`));
  assert.deepEqual(id.stills.map((s) => [s.n, s.t, s.scene, s.type]), en.stills.map((s) => [s.n, s.t, s.scene, s.type]));
});

test("both layouts of a scene that has two get the same Indonesian sentence", () => {
  const two = Object.keys(VARIANTS).sort();
  assert.deepEqual(two, ["end", "list", "quote", "stat", "title"]);
  const scenes = ["title, kicker and a long sub", "quote, a name and a role", "list, not numbered", "stat, a note", "end, with the name"].map((n) => byName(n).scene);
  assert.deepEqual(scenes.map((s) => s.type).sort(), two);
  const board = (variant) => ({ recipe: "promo", look: "warnet", lang: "id", scenes: scenes.map((s) => ({ ...s, variant })) });
  const first = build(board(1)), second = build(board(2));
  assert.deepEqual(first.scenes.map((s) => s.v), [0, 0, 0, 0, 0]);
  assert.deepEqual(second.scenes.map((s) => s.v), [1, 1, 1, 1, 1]);
  assert.deepEqual(first.stills.map((s) => s.expect), second.stills.map((s) => s.expect));
  second.stills.forEach((s) => indonesian(s.expect, `layout 2, frame ${s.n}`));
});

test("the label under a frame: FRAME, s and scene in English; BINGKAI, dtk and adegan in Indonesian", () => {
  const still = { n: 1, t: 1.94, scene: 1, type: "title", expect: "x" };
  assert.equal(sheetLabel("en", still), "FRAME 1 · 1.94 s · scene 1 (title)");
  assert.equal(sheetSentence("en", still), "Should show: x");
  assert.equal(sheetLabel("id", still), "BINGKAI 1 · 1,94 dtk · adegan 1 (title)");
  assert.equal(sheetSentence("id", still), "Seharusnya tampil: x");
  assert.equal(sheetLabel("id", { ...still, n: 7, t: 26, scene: 5, type: "prices" }), "BINGKAI 7 · 26 dtk · adegan 5 (prices)", "the scene's type stays the kit's own word");
  // A plan written before the sheet knew a second language names no language the sheet has words for.
  assert.equal(sheetLabel(undefined, still), "FRAME 1 · 1.94 s · scene 1 (title)");
  assert.equal(sheetSentence("fr", still), "Should show: x");
});

test("the sheet page: an English one is the page 0.5.0 laid out, an Indonesian one has no English label", () => {
  const stills = (lang) => [byName("title, headline only"), byName("code, a long line and a marked line"), byName("end, no name")].map((c, i) => ({ n: i + 1, t: [1.94, 8.2, 12.61][i], scene: i + 1, type: c.scene.type, expect: c[lang][0] }));
  // The page stills.mjs at v0.5.0 wrote for these three frames, by its SHA-256.
  const en = sheetPage({ lang: "en", stills: stills("en") });
  assert.equal(createHash("sha256").update(en.html).digest("hex"), "d8f48bf587c69aceaaab5dd1425899a0135c09dce5e6e948fcb175eb0212586b");
  assert.match(en.html, /<html lang="en">/);
  assert.match(en.html, /<p class="no">FRAME 2 · 8\.2 s · scene 2 \(code\)<\/p>\n\s+<p class="ex">Should show: a code card with 4 numbered lines/);
  assert.deepEqual(sheetPage({ stills: stills("en") }), en, "a plan that names no language is laid out in English");

  const id = sheetPage({ lang: "id", stills: stills("id") });
  assert.match(id.html, /<html lang="id">/);
  assert.match(id.html, /<p class="no">BINGKAI 2 · 8,2 dtk · adegan 2 \(code\)<\/p>\n\s+<p class="ex">Seharusnya tampil: kartu kode berisi 4 baris bernomor/);
  assert.equal((id.html.match(/Seharusnya tampil: /g) || []).length, 3);
  assert.doesNotMatch(id.html, /FRAME|Should show| s · scene /);
  // A label that passes 38 characters takes a second row, and the page gives every row of frames that room.
  const sentence = "kata ".repeat(60).trim();
  const short = { n: 1, t: 1.9, scene: 1, type: "qa", expect: sentence }, long = { n: 1, t: 12.94, scene: 1, type: "numbers", expect: sentence };
  assert.ok(sheetLabel("id", short).length <= 38 && sheetLabel("id", long).length > 38);
  assert.equal(sheetPage({ lang: "id", stills: [long] }).H - sheetPage({ lang: "id", stills: [short] }).H, 28);
  assert.equal(id.n, 3);
});
