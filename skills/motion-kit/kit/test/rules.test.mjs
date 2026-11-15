// What the builder accepts and refuses, scene by scene, and what it hands the sound layer and
// the check sheet for each scene. Run with: node --test
// Only Node is needed: nothing is rendered, and every storyboard is written here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (f) => JSON.parse(readFileSync(f, "utf8"));

// A real PNG of w x h pixels, one flat colour, so the builder can read its size.
function png(w, h) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h, 0x80);
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const TITLE = { type: "title", kicker: "Warung Bu Lastri", headline: "Sarapan mulai pukul enam" };
const END = { type: "end", line: "Pesan untuk dibungkus", name: "Warung Bu Lastri", address: "@warungbulastri", button: "Chat kami" };
const LIST = { type: "list", heading: "Yang ada tiap pagi", items: ["Bubur ayam hangat", "Lontong sayur", "Teh poci gula batu"] };
const sb = (middle, top = {}) => ({ recipe: "promo", look: "kertas", lang: "id", ...top, scenes: [TITLE, ...[].concat(middle), END] });

// Builds `storyboard` in a fresh folder. `files` are written beside it first (name -> bytes).
function build(storyboard, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "mk-rules-"));
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard, null, 2));
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(dir, name), bytes);
  const r = spawnSync(process.execPath, [join(KIT, "build.mjs"), "storyboard.json"], { cwd: dir, encoding: "utf8", env: { ...process.env, HS_SOUND_HOME: join(dir, ".no-voices") } });
  const done = { dir, status: r.status, out: r.stdout + r.stderr };
  if (r.status === 0) {
    done.plan = json(join(dir, "video", "mk-plan.json"));
    done.cues = json(join(dir, "video", "cues.json")).cues;
    done.scene = (n) => JSON.parse(/data-mk='([^']*)'/.exec(readFileSync(join(dir, "video", "compositions", `s${n}.html`), "utf8"))[1].replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
  }
  return done;
}
const ok = (r) => { assert.equal(r.status, 0, r.out); return r; };
const refused = (r, what) => { assert.equal(r.status, 1, `it should have been refused: ${r.out}`); assert.match(r.out, what); };
const clean = (...rs) => rs.forEach((r) => rmSync(r.dir, { recursive: true, force: true }));
const of = (cues, n, type) => cues.filter((q) => q.scene === n && q.type === type);

test("a promo needs no page and no picture", () => {
  refused(build({ ...sb(LIST), scenes: [{ type: "title", kicker: "Flash sale 12.12", headline: "Flash sale 12.12, cuma sehari" }, LIST, END] }), /scene 1 \(title\) "kicker" repeats words of the headline \("Flash sale 12\.12"\)\. The kicker adds who, where or when/);
  refused(build({ ...sb(LIST), scenes: [{ type: "title", kicker: "Selamat datang di", headline: "Warung Bu Lastri" }, LIST, END] }), /scene 1 \(title\) "kicker" is a greeting \("Selamat datang di"\)/);
  const r = ok(build(sb(LIST)));
  assert.deepEqual(r.plan.scenes.map((s) => s.type), ["title", "list", "end"]);
  clean(r);
});

test("prices: a land for the heading and one for each row, and the sheet says what each row holds", () => {
  const rows = [{ name: "Bubur ayam", price: "Rp11.000" }, { name: "Lontong sayur", price: "Rp12.000", was: "Rp15.000" }, { name: "Teh poci", price: "Gratis" }];
  const r = ok(build(sb({ type: "prices", heading: "Menu sarapan", rows, note: "Harga per porsi" }, { recipe: "menu" })));
  assert.equal(of(r.cues, 2, "land").length, 1 + rows.length);
  const still = r.plan.stills.find((s) => s.scene === 2);
  assert.match(still.expect, /3 rows, each a name on the left and its price on the right/);
  assert.match(still.expect, /"Lontong sayur" Rp12\.000/);
  assert.match(still.expect, /each old price is struck through/);
  assert.match(still.expect, /"Harga per porsi" is under the rows/);
  assert.ok(r.plan.sound.on && r.plan.sound.effects >= 8, "the palette plays on a menu");

  refused(build(sb({ type: "prices", heading: "Menu sarapan", rows: [{ name: "Bubur ayam", price: "murah" }, { name: "Teh poci", price: "Rp6.000" }] }, { recipe: "menu" })), /scene 2 \(prices\) "rows" item 1 "price" must hold a price from the brief/);
  refused(build(sb({ type: "prices", heading: "Menu sarapan", rows: [{ name: "Bubur ayam", price: "Rp11.000" }] }, { recipe: "menu" })), /"rows" has 1 items; it holds 2 to 6\./);
  refused(build(sb(LIST, { recipe: "menu" })), /The recipe "menu" needs a prices scene\./);
  clean(r);
});

test("info: a land per fact, and the sheet names each label with its line", () => {
  const rows = [{ label: "Buka", text: "Setiap hari, 06.00 sampai 11.00" }, { label: "Tempat", text: "Jalan Pandan 4, Salatiga" }];
  const r = ok(build(sb({ type: "info", heading: "Mampir ke kedai", rows })));
  assert.equal(of(r.cues, 2, "land").length, 1 + rows.length);
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /2 facts, each a small label over its own large line, whole: Buka: "Setiap hari, 06\.00 sampai 11\.00", Tempat: "Jalan Pandan 4, Salatiga"/);
  refused(build(sb({ type: "info", heading: "Mampir ke kedai", rows: [{ label: "Buka" }, rows[1]] })), /"rows" item 1 needs "text"\./);
  clean(r);
});

test("numbers: each number counts and lands, and a value without a number is refused", () => {
  const items = [{ value: "18", label: "murid ikut sampai akhir" }, { value: "32", label: "pertemuan" }, { value: "Rp8.500.000", label: "terkumpul" }];
  const r = ok(build(sb({ type: "numbers", heading: "Semester ini", items }, { recipe: "recap", look: "warnet" })));
  const counts = of(r.cues, 2, "count");
  assert.equal(counts.length, items.length);
  for (const q of counts) assert.ok(q.until > q.t, "a count runs for a while");
  assert.equal(of(r.cues, 2, "land").length, 1 + items.length);
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /3 numbers in large type, each exactly as written with its label under it: "18" murid ikut sampai akhir, "32" pertemuan, "Rp8\.500\.000" terkumpul/);
  assert.equal(r.plan.sound.palette, "pixel");

  refused(build(sb({ type: "numbers", heading: "Semester ini", items: [{ value: "banyak", label: "murid" }, items[1]] }, { recipe: "recap" })), /scene 2 \(numbers\) "items" item 1 "value" must hold a number from the brief/);
  refused(build(sb(LIST, { recipe: "recap" })), /The recipe "recap" needs a numbers or stat scene\./);
  clean(r);
});

test("a stat's value holds 12 characters", () => {
  const stat = (value) => sb({ type: "stat", value, label: "harga paket lengkap" });
  const r = ok(build(stat("Rp1.250.000")));
  refused(build(stat("Rp12.500.000,5")), /scene 2 \(stat\) "value" is 14 characters; the limit is 12\./);
  clean(r);
});

test("a picture: its own shape, a title or a caption, and three at most", () => {
  const files = { "a.png": png(1200, 600), "b.png": png(600, 900), "c.png": png(800, 800), "d.png": png(8, 8) };
  const pic = (file, more = { title: "Sebelum" }) => ({ type: "image", file, ...more });
  const r = ok(build(sb([pic("a.png"), pic("b.png", { caption: "Sesudah dicuci, putih lagi" }), pic("c.png", { title: "Rak baru" })]), files));
  assert.deepEqual([r.scene(2).s.w, r.scene(2).s.h], [1200, 600]);
  assert.deepEqual([r.scene(3).s.w, r.scene(3).s.h], [600, 900]);
  assert.equal(of(r.cues, 2, "land").length, 0, "no caption, so nothing lands under the picture");
  assert.equal(of(r.cues, 3, "land").length, 1);
  assert.doesNotMatch(r.plan.stills.find((s) => s.scene === 2).expect, /caption/);

  refused(build(sb(pic("a.png", {})), files), /scene 2 \(image\) needs a "title" or a "caption"/);
  refused(build(sb([pic("a.png"), pic("b.png"), pic("c.png"), pic("d.png")]), files), /There are 4 image scenes; a video holds three pictures at most\./);
  clean(r);
});

test("the end card takes a street address or a phone number as written; a page address has no spaces", () => {
  const end = (address) => ({ ...sb(LIST), scenes: [TITLE, LIST, { ...END, address }] });
  const street = ok(build(end("Jalan Pandan 4, Salatiga"))), phone = ok(build(end("0811 0000 142"))), dashed = ok(build(end("0811-0000-142")));
  refused(build(end("https://warung.pages.dev")), /"address" must be the address alone, without "https:\/\/"\./);
  refused(build(end("warung bulastri.pages.dev")), /"address" is a page address or a handle, so it has no spaces\./);
  clean(street, phone, dashed);
});

test("a missing heading is the writer's own words; a missing address is a fact to ask for", () => {
  const r = build({ ...sb({ type: "list", items: LIST.items }), scenes: [TITLE, { type: "list", items: LIST.items }, { ...END, address: undefined }] });
  refused(r, /scene 2 \(list\) needs "heading": two to five words that say what the scene holds\. These are your own words, not a fact from the brief, so write them now in the video's language and do not ask the user for them\./);
  assert.match(r.out, /scene 3 \(end\) needs "address"\. Take it from the brief; if the brief does not have it, ask the user or use another scene\. Never make one up\./);
});

test("the same fact in three scenes is refused, and the scenes are named", () => {
  const title = { ...TITLE, sub: "Buka 12 Desember 2026 di Jalan Pandan 4" };
  const info = { type: "info", heading: "Catat harinya", rows: [{ label: "Tanggal", text: "12 Desember 2026" }, { label: "Tempat", text: "Jalan Pandan 4, Salatiga" }] };
  const list = { type: "list", heading: "Hari pertama", items: ["Gratis teh poci 12 Desember 2026", "Bubur ayam hangat"] };
  refused(build({ ...sb([]), scenes: [title, info, list, END] }), /Scenes 1, 2 and 3 all show the same fact \("desember 2026", "12 desember", "12"\)\. A viewer needs it once/);
  const twice = ok(build({ ...sb([]), scenes: [title, info, LIST, END] }));
  // A number that is part of the name ("RW 05") is said wherever the name is.
  const rw = { type: "list", heading: "Untuk warga RW 05", items: ["Lapak gratis untuk warga RW 05", "Parkir di halaman masjid"] };
  const name = ok(build({ ...sb([]), scenes: [{ ...TITLE, kicker: "Bazar RW 05" }, { type: "info", heading: "Catat harinya", rows: [{ label: "Tempat", text: "Lapangan RW 05" }, { label: "Jam", text: "08.00 sampai selesai" }] }, rw, { ...END, name: "Panitia Bazar RW 05" }] }));
  clean(twice, name);
});

test("a day that does not match its date still builds, and the builder says to ask the user", () => {
  // 13 December 2026 is a Sunday.
  const wrong = ok(build(sb({ type: "info", heading: "Catat harinya", rows: [{ label: "Hari", text: "Sabtu, 13 Desember 2026" }, { label: "Jam", text: "09.00 sampai selesai" }] })));
  assert.match(wrong.out, /CHECK WITH THE USER before the render\./);
  assert.match(wrong.out, /scene 2 says "Sabtu, 13 Desember 2026", and on the calendar that date is a Minggu\./);
  assert.match(wrong.out, /Do not change the day or the date yourself.*then stop: tell the user what the calendar says, ask which is right, and render after they answer\./);
  const right = ok(build(sb({ type: "info", heading: "Catat harinya", rows: [{ label: "Hari", text: "Minggu, 13 Desember 2026" }, { label: "Jam", text: "09.00 sampai selesai" }] })));
  assert.doesNotMatch(right.out, /CHECK WITH THE USER/);
  const en = ok(build(sb({ type: "info", heading: "Save the date", rows: [{ label: "When", text: "Friday, December 13, 2026" }, { label: "Time", text: "9 am to noon" }] }, { lang: "en" })));
  assert.match(en.out, /on the calendar that date is a Sunday\./);
  const none = ok(build(sb({ type: "info", heading: "Catat harinya", rows: [{ label: "Hari", text: "Senin, 31 Februari 2027" }, { label: "Jam", text: "09.00 sampai selesai" }] })));
  assert.match(none.out, /that month has no day 31\./);
  clean(wrong, right, en, none);
});

test("a long line of code wraps in its card, and the builder counts the rows the browser will lay", async () => {
  const { wrapCode, CODE } = await import("../lib/spec.mjs");
  const show = (line, cols) => wrapCode(line, cols).map((r) => " ".repeat(r.pad) + line.slice(r.from, r.to));
  assert.deepEqual(show("console.log(0.1 + 0.2 === 0.3);", 40), ["console.log(0.1 + 0.2 === 0.3);"]);
  assert.deepEqual(show("  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));", 41), ["  grid-template-columns: repeat(auto-fit,", "    minmax(200px, 1fr));"]);
  assert.deepEqual(show("    document.querySelector(\".tombol\").addEventListener(\"click\", kirim);", 41), ["    document.querySelector(\".tombol\")", "      .addEventListener(\"click\", kirim);"]);
  assert.deepEqual(show("  if (umur >= 17 && punyaKtp || didampingiOrangTua) {", 36), ["  if (umur >= 17 && punyaKtp", "    || didampingiOrangTua) {"]);
  for (let cols = 24; cols <= 44; cols++) for (const row of show("console.log(user.address?.city); // undefined", cols).slice(0, -1)) assert.doesNotMatch(row, /\?$/, `at ${cols} columns a row ends between ? and .`);
  assert.deepEqual(show("console.log(user.address?.city); // undefined", 34), ["console.log(user.address?.city);", "  // undefined"]);
  for (const line of ["const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);", "x".repeat(72)]) for (const row of show(line, 40)) assert.ok(row.length <= 40, row);
  assert.deepEqual([CODE.max, CODE.cols], [110, 40]);
  assert.equal(show("  const url = `https://api.tokocontoh.test/produk?kategori=${kategori}&halaman=${halaman}&per=${perHalaman}`;", 40).length, 3, "a line of 109 characters takes three rows");

  const code = (lines, more = {}) => ({ recipe: "coding", look: "warnet", lang: "en", scenes: [{ type: "title", headline: "Columns that follow the screen" }, { type: "code", caption: "One line does it", lang: "css", lines, ...more }, { type: "end", line: "Try it in your editor", address: "@kelassore", button: "Follow the class" }] });
  const long = "  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));";
  const r = ok(build(code([".galeri {", "  display: grid;", long, "}"], { highlight: 3 })));
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /none cut off at the card's edge \(a long line continues on a second row, set in a little\); line 3 is marked/);
  assert.match(readFileSync(join(r.dir, "video", "index.html"), "utf8"), /assets\/kit\/mk\.js"><\/script>\n\s+<script src="assets\/kit\/wrap\.js"><\/script>\n\s+<script src="assets\/kit\/scenes\.js">/);
  refused(build(code(["x".repeat(111)])), /"lines" line 1 is 111 characters; a line of code holds 110\./);
  refused(build(code([" ".repeat(30) + "const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);"])), /scene 2 \(code\) has a line of code that takes more than three rows in the card\./);
  const two = ok(build(code(Array(9).fill("const a = [" + "1, ".repeat(19) + "2];"))));
  refused(build(code(Array(9).fill(long))), /scene 2 \(code\) takes 27 rows on screen \(a line longer than 40 characters wraps onto a second row\), and a code card holds 18\./);
  clean(r, two);
});

test("fix: the wrong code, then the right code with the changed line marked", () => {
  const fix = (more = {}, top = {}) => ({ recipe: "coding", look: "kertas", lang: "id", ...top, scenes: [{ type: "title", headline: "Kenapa hasilnya 150002000?" }, { type: "fix", caption: "Angka dalam tanda kutip itu teks", lang: "js", wrong: ["const harga = \"15000\";", "const total = harga + 2000;"], right: ["const harga = Number(\"15000\");", "const total = harga + 2000;"], ...more }, { type: "end", line: "Coba di editor kamu", address: "@kelassore", button: "Ikuti kelasnya" }] });
  const r = ok(build(fix()));
  const T = r.scene(2).T;
  assert.deepEqual(T.marks, { wrong: [0], right: [0] });
  assert.ok(T.markW < T.dim && T.dim < T.rIn && T.rIn < T.right[0].t && T.right[1].t < T.hl, "wrong is typed and marked, steps back, then right is typed and marked");
  assert.equal(of(r.cues, 2, "type").length, 2);
  assert.equal(of(r.cues, 2, "marker").length, 2);
  assert.equal(of(r.cues, 2, "land").length, 1);
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /two code cards.*under the label "Salah", the wrong code \(2 lines\), dimmed; below, under "Benar", the right code \(2 lines\), with line 1 marked/);
  assert.match(readFileSync(join(r.dir, "video", "index.html"), "utf8"), /"words":\{"wrong":"Salah","right":"Benar",/);

  const en = ok(build(fix({ highlight: 2 }, { lang: "en" })));
  assert.deepEqual(en.scene(2).T.marks.right, [1], "\"highlight\" names the line");
  assert.match(en.plan.stills.find((s) => s.scene === 2).expect, /under the label "Wrong".*under "Right".*with line 2 marked/);
  const all = ok(build(fix({ wrong: ["a = 1"], right: ["a = 2"] })));
  assert.deepEqual(all.scene(2).T.marks, { wrong: [], right: [] }, "when every line differs, nothing is marked");
  assert.equal(all.scene(2).T.hl, null);

  refused(build(fix({ highlight: 3 })), /"highlight" must be the number of one of the lines in "right", counted from 1\./);
  refused(build(fix({ right: undefined })), /scene 2 \(fix\) needs "right"\./);
  refused(build(fix({ wrong: Array(4).fill("  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));"), right: Array(4).fill("  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));") })), /scene 2 \(fix\) takes 24 rows on screen .*, and its two cards hold 14\./);
  clean(r, en, all);
});

test("a scene keeps its layout through a revision, and \"variant\" picks one", () => {
  const dir = mkdtempSync(join(tmpdir(), "mk-rules-"));
  const write = (storyboard) => writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard));
  const run = () => { const r = spawnSync(process.execPath, [join(KIT, "build.mjs"), "storyboard.json"], { cwd: dir, encoding: "utf8", env: { ...process.env, HS_SOUND_HOME: join(dir, ".no-voices") } }); assert.equal(r.status, 0, r.stdout); return json(join(dir, "video", "mk-plan.json")).scenes.map((s) => s.v); };
  const first = sb(LIST);
  write(first);
  const layouts = run();
  // Thirty rewrites of the same three scenes: without the memory about half would flip a layout.
  for (let i = 0; i < 30; i++) {
    write({ ...first, scenes: [{ ...TITLE, headline: `Sarapan mulai pukul ${i}` }, { ...LIST, items: [...LIST.items.slice(0, 2), `Teh poci nomor ${i + 100}`] }, { ...END, line: `Pesan ${i + 200} bungkus` }] });
    assert.deepEqual(run(), layouts, `revision ${i} kept every layout`);
  }
  // A scene added before the others does not move their layouts.
  write({ ...first, scenes: [TITLE, { type: "stat", value: "Rp11.000", label: "bubur ayam semangkuk" }, LIST, END] });
  const more = run();
  assert.deepEqual([more[0], more[2], more[3]], layouts);
  // "variant" wins over the memory, and is remembered in turn.
  const other = layouts[1] === 0 ? 2 : 1;
  write({ ...first, scenes: [TITLE, { ...LIST, variant: other }, END] });
  assert.equal(run()[1], other - 1);
  write(first);
  assert.equal(run()[1], other - 1, "the layout asked for stays after \"variant\" is taken out again");
  assert.doesNotMatch(readFileSync(join(dir, "video", "compositions", "s2.html"), "utf8"), /variant/);
  rmSync(dir, { recursive: true });

  refused(build(sb({ ...LIST, variant: 3 })), /scene 2 \(list\) "variant" picks one of the scene's 2 layouts: write 1 or 2/);
  refused(build(sb({ type: "info", heading: "Mampir", variant: 1, rows: [{ label: "Buka", text: "06.00 sampai 11.00" }, { label: "Tempat", text: "Jalan Pandan 4" }] })), /scene 2 \(info\) has "variant", and this scene has one layout\. Remove it\./);
});

test("when: one loud date, checked against the calendar and counted as one fact", () => {
  // 12 December 2026 is a Saturday.
  const when = (more = {}, top = {}) => sb({ type: "when", label: "Buka perdana", day: "Sabtu", date: "12", month: "Desember 2026", lines: ["Pukul 06.00 sampai habis", "Jalan Pandan 4, Salatiga"], ...more }, { recipe: "announce", ...top });
  const r = ok(build(when()));
  const T = r.scene(2).T;
  assert.equal(T.roll, true);
  assert.ok(T.num0 < T.num1 && T.month < T.lines[0] && T.lines[0] < T.lines[1]);
  assert.equal(of(r.cues, 2, "count").length, 1, "the number rolls");
  assert.equal(of(r.cues, 2, "land").length, 4, "the leaf, the number and two lines land");
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /a date set very large on a calendar leaf: "Sabtu" on the band at its top, the number "12" and under it "Desember 2026", all whole; "Buka perdana" is above the leaf; then the two lines "Pukul 06\.00 sampai habis" and "Jalan Pandan 4, Salatiga"/);
  assert.doesNotMatch(r.out, /CHECK WITH THE USER/);

  const wrong = ok(build(when({ day: "Minggu" })));
  assert.match(wrong.out, /CHECK WITH THE USER before the render\.[\s\S]*scene 2 says "Minggu, 12 Desember 2026", and on the calendar that date is a Sabtu\./);
  // Without a day's name, the kit writes the calendar's, in the video's language.
  const auto = ok(build(when({ day: undefined })));
  assert.equal(auto.scene(2).s.day, "Sabtu");
  assert.match(auto.plan.stills.find((s) => s.scene === 2).expect, /"Sabtu" on the band at its top/);
  assert.equal(ok(build(when({ day: undefined, month: "December 2026", label: "Opening day", lines: ["From 6 am"] }, { lang: "en" }))).scene(2).s.day, "Saturday");
  assert.equal(ok(build(when({ day: undefined, month: "Desember" }))).scene(2).s.day, undefined, "no year, no day");
  const span = ok(build(when({ date: "12-13", day: undefined, end: "sampai Minggu, 13 Desember 2026", lines: undefined })));
  assert.equal(span.scene(2).s.day, undefined);
  assert.equal(span.scene(2).T.roll, false, "a span of days does not roll");
  assert.equal(of(span.cues, 2, "count").length, 0);

  refused(build(when({ date: "Sabtu" })), /scene 2 \(when\) "date" must be the day of the month as a number, such as "13"\./);
  refused(build(when({ month: "12 Desember 2026" })), /scene 2 \(when\) "month" starts with a day of the month\./);
  refused(build(when({ date: "12 Des" })), /"date" is 6 characters; the limit is 5\. Shorten it by 1 or more: keep only the day of the month here/);
  refused(build(when({ lines: ["a", "b", "c"] })), /"lines" has 3 lines; it holds 1 to 2\./);
  // The date is one fact: said in the title and in a list as well, it is in three scenes.
  const title = { ...TITLE, sub: "Buka 12 Desember 2026 di Jalan Pandan" };
  const list = { type: "list", heading: "Hari pertama", items: ["Gratis teh poci 12 Desember 2026", "Bubur ayam hangat"] };
  refused(build({ ...when(), scenes: [title, when().scenes[1], list, END] }), /Scenes 1, 2 and 3 all show the same fact \("desember 2026", "12 desember", "12"\)/);
  refused(build(when({}, { recipe: "tips" })), /scene 2 is a when scene, which the recipe "tips" does not hold\./);
  clean(r, wrong, span);
});

test("qa: each question lands, then its answer, and the recipe faq needs one", () => {
  const pairs = [{ q: "Bisa pesan untuk hari yang sama?", a: "Bisa, selama pesan masuk sebelum pukul 10.00." }, { q: "Ada antar ke rumah?", a: "Ada, gratis untuk Salatiga kota." }];
  const r = ok(build(sb({ type: "qa", heading: "Yang sering ditanya", pairs }, { recipe: "faq" })));
  const T = r.scene(2).T;
  assert.ok(T.pairs[0].q < T.pairs[0].a && T.pairs[0].a < T.pairs[1].q && T.pairs[1].q < T.pairs[1].a, "question, answer, question, answer");
  assert.ok(T.pairs[0].a - T.pairs[0].q >= 0.8, "a question is on screen a moment before its answer");
  assert.equal(of(r.cues, 2, "land").length, 1 + 2 * pairs.length);
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /the heading "Yang sering ditanya" and 2 questions, each marked with a question mark, with its answer under it, every line whole: "Bisa pesan untuk hari yang sama\?" then "Bisa, selama pesan masuk sebelum pukul…"; "Ada antar ke rumah\?" then "Ada, gratis untuk Salatiga kota\."/);
  const one = ok(build(sb({ type: "qa", pairs: [pairs[0]] })));
  assert.equal(of(one.cues, 2, "land").length, 2, "no heading, one pair");
  refused(build(sb({ type: "qa", pairs: [{ q: "Ada antar ke rumah?" }] })), /"pairs" item 1 needs "a"\./);
  refused(build(sb({ type: "qa", pairs: [...pairs, ...pairs] })), /"pairs" has 4 items; it holds 1 to 3\./);
  refused(build(sb(LIST, { recipe: "faq" })), /The recipe "faq" needs a qa scene\./);
  clean(r, one);
});

test("swap: two pictures in one frame, a still of the halves and a still of the after picture", () => {
  const files = { "kusam.png": png(900, 1200), "bersih.png": png(1200, 1200) };
  const swap = (more = {}, top = {}) => sb({ type: "swap", title: "Sepatu putih kusam", before: "kusam.png", after: "bersih.png", caption: "Dicuci dan dijemur sehari", ...more }, { recipe: "before-after", ...top });
  const r = ok(build(swap(), files));
  const d = r.scene(2);
  assert.deepEqual([d.s.w, d.s.h], [1200, 1200], "the frame takes the after picture's shape");
  assert.deepEqual([d.s.src, d.s.src2], ["assets/img/before-kusam.png", "assets/img/after-bersih.png"]);
  assert.ok(d.T.tag < d.T.half0 && d.T.half1 < d.T.full0 && d.T.full1 < d.T.cap);
  const stills = r.plan.stills.filter((s) => s.scene === 2);
  assert.equal(stills.length, 2);
  assert.ok(stills[0].t > r.plan.scenes[1].start + d.T.half1 && stills[0].t < r.plan.scenes[1].start + d.T.full0, "the first still is taken while both halves show");
  assert.match(stills[0].expect, /one frame split down the middle by a line: the before picture on the left under the label "Sebelum", the after picture on the right under "Sesudah"; neither is stretched; "Sepatu putih kusam" is above the frame/);
  assert.match(stills[1].expect, /the after picture fills the whole frame, with the label "Sesudah"; the caption "Dicuci dan dijemur sehari" is whole/);
  assert.equal(of(r.cues, 2, "whoosh").length, 3 + 1, "the frame opens, two wipes, and the scene's own closing whoosh");
  assert.equal(of(r.cues, 2, "land").length, 3);

  const own = ok(build(swap({ beforeLabel: "Kusam", afterLabel: "Bersih", title: undefined, caption: undefined }, { lang: "en" }), files));
  assert.match(own.plan.stills.find((s) => s.scene === 2).expect, /under the label "Kusam".*under "Bersih"/);
  const en = ok(build(swap({}, { lang: "en" }), files));
  assert.match(en.plan.stills.find((s) => s.scene === 2).expect, /under the label "Before".*under "After"/);
  refused(build(swap({ after: "kusam.png" }), files), /scene 2 \(swap\) shows the same file as "before" and as "after"\./);
  refused(build(swap({ after: "tidak-ada.png" }), files), /"after": there is no file "tidak-ada\.png" in this folder\./);
  refused(build(swap({ before: undefined }), files), /scene 2 \(swap\) needs "before"\./);
  // A new after picture is a new sheet: the builder does not say the pictures are unchanged.
  writeFileSync(join(r.dir, "video", "sheet.png"), "the sheet");
  writeFileSync(join(r.dir, "bersih.png"), png(1000, 1000));
  const again = spawnSync(process.execPath, [join(KIT, "build.mjs"), "storyboard.json"], { cwd: r.dir, encoding: "utf8", env: { ...process.env, HS_SOUND_HOME: join(r.dir, ".no-voices") } });
  assert.doesNotMatch(again.stdout, /The pictures did not change/);
  clean(r, own, en);
});

test("a list without numbers, and a quote without a name", () => {
  const plain = ok(build(sb({ ...LIST, numbered: false })));
  assert.equal(plain.scene(2).s.numbered, false);
  assert.match(plain.plan.stills.find((s) => s.scene === 2).expect, /3 items, each behind a small square mark and not a number, each whole/);
  const counted = ok(build(sb(LIST)));
  assert.match(counted.plan.stills.find((s) => s.scene === 2).expect, /3 items, numbered, each whole/);
  refused(build(sb({ ...LIST, numbered: "no" })), /scene 2 \(list\) "numbered" must be true or false, without quote marks\./);

  const quote = (more) => sb({ type: "quote", text: "Buburnya masih hangat waktu sampai di rumah.", ...more }, { recipe: "testimonial" });
  const named = ok(build(quote({ name: "Bu Ratna", role: "Pelanggan sejak 2021" })));
  assert.match(named.plan.stills.find((s) => s.scene === 2).expect, /and under it the name "Bu Ratna" with "Pelanggan sejak 2021"/);
  assert.equal(of(named.cues, 2, "land").length, 2);
  const role = ok(build(quote({ role: "Pelanggan sejak 2021" })));
  assert.match(role.plan.stills.find((s) => s.scene === 2).expect, /in full, and under it "Pelanggan sejak 2021"$/);
  const nobody = ok(build(quote({})));
  assert.match(nobody.plan.stills.find((s) => s.scene === 2).expect, /in full, with no name under it$/);
  assert.equal(of(nobody.cues, 2, "land").length, 1, "nothing lands where the name would be");
  clean(plain, counted, named, role, nobody);
});

test("a code card holds one line", () => {
  const code = (lines) => ({ recipe: "coding", look: "warnet", lang: "en", scenes: [{ type: "title", headline: "True or false?" }, { type: "code", caption: "What does this print?", lang: "js", lines }, { type: "end", line: "Answer in the comments", address: "@kelassore", button: "Follow for more" }] });
  const one = ok(build(code(["console.log(0.1 + 0.2 === 0.3);"])));
  assert.match(one.plan.stills.find((s) => s.scene === 2).expect, /a code card with 1 numbered line/);
  refused(build(code([])), /"lines" has 0 lines; it holds 1 to 9\./);
  clean(one);
});

test("code longer than one card goes on two cards side by side, and the numbers carry on", () => {
  const whole = [
    "async function ambilProduk(kategori, halaman = 1, perHalaman = 20) {",
    "  const url = `https://api.tokocontoh.test/produk?kategori=${kategori}&halaman=${halaman}&per=${perHalaman}`;",
    "  try {",
    "    const res = await fetch(url, { headers: { Accept: \"application/json\" } });",
    "    if (!res.ok) {",
    "      throw new Error(`Gagal ambil produk: ${res.status}`);",
    "    }",
    "    const data = await res.json();",
    "    return data.items.map((item) => ({ id: item.id, nama: item.nama, harga: item.harga }));",
    "  } catch (err) {",
    "    console.error(err);",
    "    return [];",
    "  }",
    "}",
  ];
  const title = { type: "title", headline: "Ambil daftar produk dari internet" };
  const end = { type: "end", line: "Belajar lagi di sini", address: "learnhypersheets.com", button: "Buka halamannya" };
  const card = (lines, more = {}) => ({ type: "code", caption: "Minta data, lalu cek jawabannya", lang: "JavaScript", lines, ...more });
  const video = (middle, last = end) => ({ recipe: "coding", look: "warnet", lang: "id", scenes: [title, ...middle, last] });
  const steps = { type: "steps", heading: "Yang dilakukan fungsi ini", steps: [{ title: "Bangun alamatnya" }, { title: "Ambil datanya" }] };

  // One card cannot hold it, and the builder says how to show it whole.
  refused(build(video([card(whole)])), /"lines" has 14 lines; a code card holds 1 to 9\. Show only the lines the point needs\. When the user wants the whole code, split it over two code scenes in a row, at the end of a block: the second card's line numbers carry on from the first\./);

  const r = ok(build(video([card(whole.slice(0, 7), { highlight: 4 }), card(whole.slice(7), { caption: "Kalau gagal, hasilnya kosong", highlight: 5 })])));
  assert.deepEqual(r.plan.scenes.map((s) => s.type), ["title", "code", "code", "end"]);
  assert.deepEqual([r.scene(2).T.from, r.scene(3).T.from], [0, 7]);
  assert.match(r.plan.stills.find((s) => s.scene === 2).expect, /a code card with 7 numbered lines, all typed out .*; line 4 is marked/);
  // "highlight" counts the card's own lines; the sheet names the number the card shows.
  assert.match(r.plan.stills.find((s) => s.scene === 3).expect, /a code card with 7 numbered lines \(8 to 14, carrying on from the card before\), all typed out .*; line 12 is marked/);
  assert.equal(of(r.cues, 3, "type").length, 1);
  assert.doesNotMatch(r.out, /CHECK THE ADDRESS/);

  // Two code scenes are two parts of one piece of code: never apart, never three.
  refused(build(video([card(whole.slice(0, 7)), steps, card(whole.slice(7))])), /The two code scenes are not side by side\. Two code scenes are one piece of code in two parts, so put the second right after the first/);
  refused(build(video([card(whole.slice(0, 5)), card(whole.slice(5, 9)), card(whole.slice(9))])), /There are 3 code scenes; a video holds two at most, side by side/);
  clean(r);
});

test("an end card address taken out of the code builds, and the builder says to look at the brief again", () => {
  const code = { type: "code", caption: "Minta data produk", lang: "JavaScript", lines: ["const res = await fetch(\"https://api.tokocontoh.test/produk?halaman=1\");", "const data = await res.json();"] };
  const video = (address) => ({ recipe: "coding", look: "warnet", lang: "id", scenes: [{ type: "title", headline: "Ambil daftar produk dari internet" }, code, { type: "end", line: "Alamat sumber datanya", address, button: "Lihat alamatnya" }] });
  const lifted = ok(build(video("api.tokocontoh.test/produk")));
  assert.match(lifted.out, /CHECK THE ADDRESS before the sheet\. Scene 3 sends the viewer to "api\.tokocontoh\.test\/produk", and that address is inside the code\. An address the code calls is not where a viewer goes\. Read the brief again: if it gives an address outside the code \(often on a line of its own, at the end\), that one goes on the end card; if it gives none, ask the user which address, handle or number the end card should show\./);
  const own = ok(build(video("learnhypersheets.com")));
  assert.doesNotMatch(own.out, /CHECK THE ADDRESS/);
  clean(lifted, own);
});
