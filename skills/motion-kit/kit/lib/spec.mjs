// The kit's rules, in one place: which scenes exist, what each field may hold, how long each
// scene lasts, when things land in it, and what a still of it should show. build.mjs reads
// this to check a storyboard and to write the video; the browser gets the times as data, so
// timing is decided here and nowhere else.

import * as wrapFile from "../runtime/wrap.js";

// How a long line of code wraps in a card: the runtime's own function (runtime/wrap.js), so the
// builder counts the rows the browser will lay.
export const wrapCode = (wrapFile.default && wrapFile.default.wrapCode) || wrapFile.wrapCode || globalThis.MKWrap;
// A line of code holds `max` characters. At the smallest size a row holds `cols`, so a longer line
// wraps onto a second row; a code card has room for `rows` rows, the two cards of a fix scene for
// `fixRows` between them.
export const CODE = { max: 72, cols: 40, rows: 18, fixRows: 14 };

export const LOOKS = ["warnet", "kertas", "panggung"];
export const LANGS = ["id", "en"];
export const IN = 0.34; // a scene's cover lifts over its first third of a second
export const OUT = 0.4; // and closes over its last 0.4 s

// Sound. With "on", every video gets sound effects from its look's own palette unless its
// storyboard says "sound": "off". Change this one word to "off" and a video is silent unless
// its storyboard says "sound": "on" (spoken lines and music are laid either way).
export const SOUND_DEFAULT = "on";
// What "narrator" may be: who speaks the scenes' "voice" lines. A voice's own name from
// sound/engines.json also works, for the voices this list leaves out.
export const NARRATORS = ["ringan", "kokoro", "bagus", "sendiri", "draft"];

// Which scenes a recipe needs and may hold. Every video opens on `title` and closes on `end`.
export const RECIPES = {
  promo: { need: [], may: ["page", "image", "list", "steps", "stat", "quote", "prices", "info", "numbers", "when", "qa"], about: "a person, page, shop or product" },
  announce: { need: [], may: ["image", "page", "stat", "list", "steps", "compare", "prices", "info", "numbers", "when", "qa"], about: "something new: a feature, an opening, a date" },
  faq: { need: [["qa"]], may: ["qa", "info", "list", "prices", "steps", "image", "page"], about: "questions people ask, with their answers" },
  menu: { need: [["prices"]], may: ["prices", "image", "page", "list", "info", "quote", "when", "qa"], about: "a menu, a price list, packages with prices" },
  recap: { need: [["numbers", "stat"]], may: ["numbers", "stat", "list", "quote", "image", "compare"], about: "a year, an event or a project in numbers" },
  explainer: { need: [["steps"]], may: ["steps", "code", "fix", "image", "compare", "list", "info", "qa"], about: "how something works, in steps" },
  tips: { need: [["list"]], may: ["list", "stat", "quote", "image", "info", "numbers", "qa"], about: "a short list of tips or reasons" },
  coding: { need: [["code", "fix"]], may: ["code", "fix", "compare", "steps", "list", "qa"], about: "a piece of code and what it does, or a mistake and its fix" },
  testimonial: { need: [["quote"]], may: ["quote", "stat", "page", "image", "list", "numbers"], about: "what a real person said" },
  "before-after": { need: [["compare", "fix"]], may: ["compare", "fix", "list", "stat", "image", "numbers", "prices"], about: "a change: before and after, wrong and right" },
};

// The few words the kit itself puts on screen, in the video's language.
export const WORDS = {
  id: { wrong: "Salah", right: "Benar" },
  en: { wrong: "Wrong", right: "Right" },
};

const text = (max, req = false) => ({ kind: "text", max, req });
export const FIELDS = {
  title: { kicker: text(28), headline: text(44, true), sub: text(80) },
  page: { title: text(26, true), address: text(34, true), file: { kind: "file", req: true, ext: ["html", "htm"] } },
  image: { title: text(26), caption: text(64), file: { kind: "file", req: true, ext: ["png", "jpg", "jpeg", "webp"] } },
  list: { heading: text(30, true), items: { kind: "texts", min: 2, most: 4, max: 48, req: true } },
  steps: { heading: text(30, true), steps: { kind: "objects", min: 2, most: 4, req: true, of: { title: text(28, true), detail: text(56) } } },
  prices: {
    heading: text(30, true),
    rows: { kind: "objects", min: 2, most: 6, req: true, of: {
      name: text(28, true),
      price: { ...text(12, true), how: "keep only the price here, as the brief writes it (\"Rp15.000\", \"Rp1.250.000\"); what it is the price of goes in \"name\", and words like \"per kotak\" go in the scene's \"note\"" },
      was: { ...text(12), how: "keep only the old price here, as the brief writes it" },
    } },
    note: text(48),
  },
  info: {
    heading: text(30, true),
    rows: { kind: "objects", min: 2, most: 4, req: true, of: { label: text(14, true), text: text(48, true) } },
  },
  qa: {
    heading: text(30),
    pairs: { kind: "objects", min: 1, most: 3, req: true, of: { q: text(64, true), a: text(96, true) } },
  },
  when: {
    label: text(24),
    day: text(12),
    date: { ...text(5, true), how: "keep only the day of the month here (\"13\"); the month and the year go in \"month\"" },
    month: { ...text(20, true), how: "keep only the month and the year here (\"Desember 2026\"); the hour and the place go in \"lines\"" },
    end: text(34),
    lines: { kind: "texts", min: 1, most: 2, max: 44 },
  },
  numbers: {
    heading: text(30, true),
    items: { kind: "objects", min: 2, most: 4, req: true, of: {
      value: { ...text(12, true), how: "keep only the number and its unit here, as the brief writes it (\"340\", \"Rp8.500.000\", \"87%\"); what it counts goes in \"label\"" },
      label: text(32, true),
    } },
  },
  stat: { value: { ...text(12, true), how: "keep only the number and its unit here, as the brief writes it (\"Rp15.000\", \"87%\", \"3 days\"); the words that explain it go in \"label\"" }, label: text(44, true), note: text(48) },
  quote: { text: text(150, true), name: text(28, true), role: text(40) },
  compare: {
    heading: text(30),
    left: { kind: "object", req: true, of: { label: text(14, true), text: text(56, true) } },
    right: { kind: "object", req: true, of: { label: text(14, true), text: text(56, true) } },
  },
  code: { caption: text(44, true), lang: text(12), lines: { kind: "texts", min: 1, most: 9, max: CODE.max, req: true, raw: true }, highlight: { kind: "int", of: "lines" } },
  fix: {
    caption: text(44, true), lang: text(12),
    wrong: { kind: "texts", min: 1, most: 4, max: CODE.max, req: true, raw: true },
    right: { kind: "texts", min: 1, most: 4, max: CODE.max, req: true, raw: true },
    highlight: { kind: "int", of: "right" },
  },
  end: { line: text(30, true), name: text(26), address: text(34, true), button: text(20, true) },
};

// How many layouts each scene has. The builder picks one from the scene's own words, so two
// videos differ without anyone choosing.
export const VARIANTS = { title: 2, list: 2, end: 2, quote: 2, stat: 2 };

const r2 = (v) => Math.round(v * 100) / 100;
const cut = (s, n = 36) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + "…" : String(s));
const q = (s, n) => `"${cut(s, n)}"`;

// When each line of some code is typed, from `t` on: a line takes longer the longer it is.
const typed = (lines, t) => {
  const at = lines.map((line) => {
    const d = Math.min(0.55, Math.max(0.12, line.length * 0.028));
    const one = { t: r2(t), d: r2(d) };
    t += d + 0.07;
    return one;
  });
  return { at, end: r2(t - 0.07) };
};
// Which lines of a fix scene are marked, counted from 0: in the right code the line "highlight"
// names, or else the lines the wrong code does not have; in the wrong code the lines the right
// code does not have. When every line of a card differs, nothing in it is marked.
export const fixMarks = (s) => {
  const W = s.wrong.map((l) => l.trim()), R = s.right.map((l) => l.trim());
  const not = (mine, theirs) => { const out = mine.map((l, i) => (theirs.includes(l) ? -1 : i)).filter((i) => i >= 0); return out.length === mine.length ? [] : out; };
  return { wrong: not(W, R), right: s.highlight ? [s.highlight - 1] : not(R, W) };
};

// plan(scene, a, lang): `a` is when the scene's content may start (0 in the first scene, IN after a
// cover); `lang` is the video's language, for the kit's own words. Returns the time its last move lands plus a hold (`need`), the times the browser
// animates at (`T`), what can be heard (`cues`), and the stills to check (`stills`).
export const PLAN = {
  title(s, a) {
    const T = { band: r2(a + 0.2), rule: r2(a + 0.5), sub: r2(a + 0.45) };
    const need = a + 2.7 + Math.min(1.6, (s.sub || "").length * 0.02);
    const parts = [`the headline ${q(s.headline)} is whole and marked with the video's colour`];
    if (s.kicker) parts.push(`${q(s.kicker)} sits above it`);
    if (s.sub) parts.push(`${q(s.sub, 48)} sits below it`);
    return { need, T, cues: [{ t: T.band, type: "land", weight: 2 }, { t: T.rule, type: "land", weight: 1 }], stills: [{ t: r2(need * 0.72), expect: parts.join("; ") }] };
  },
  page(s, a) {
    const n = Math.max(1, s.address.length);
    const dt = Math.min(0.04, 0.9 / n);
    const type0 = r2(a + 0.06), type1 = r2(type0 + n * dt);
    const T = { type0, dt: r2(dt * 1000) / 1000, type1, load0: r2(type1 + 0.1), load1: r2(type1 + 0.46), mark0: r2(type1 + 0.66), scr0: r2(a + 3.1), scr1: r2(a + 4.4) };
    return {
      need: a + 6.5,
      T,
      cues: [
        { t: type0, until: type1, type: "type", weight: 1 },
        { t: T.load1, type: "land", weight: 1 },
        { t: T.mark0, type: "marker", weight: 2 },
        { t: T.scr0, until: T.scr1, type: "whoosh", weight: 1 },
        { t: r2(T.scr1 + 0.05), type: "marker", weight: 2 },
      ],
      stills: [
        { t: r2(a + 2.3), expect: `a window shows the real page from its top (not blank, not the words PAGE MISSING); ${q(s.address)} is typed in its bar; a marker frames the page's name; ${q(s.title)} is above the window` },
        { t: r2(a + 5.4), expect: "the same window, scrolled down; the marker now frames the page's first list, if the page has one; no line of the page is cut at the window's edge" },
      ],
    };
  },
  image(s, a) {
    const T = { open: r2(a), cap: r2(a + 0.6) };
    return {
      need: a + 3.7,
      T,
      cues: [{ t: T.open, type: "whoosh", weight: 1 }, ...(s.caption ? [{ t: T.cap, type: "land", weight: 1 }] : [])],
      stills: [{ t: r2(a + 2.4), expect: `the picture fills its frame, is not stretched, and neither its top nor a side is cut off${s.caption ? `; the caption ${q(s.caption, 48)} is whole` : ""}${s.title ? `; ${q(s.title)} is above the picture` : ""}` }],
    };
  },
  list(s, a) {
    const items = s.items.map((_, i) => r2(a + 0.5 + i * 0.75));
    const last = items[items.length - 1];
    return {
      need: last + 1.75,
      T: { head: r2(a), items },
      cues: [{ t: r2(a), type: "land", weight: 1 }, ...items.map((t) => ({ t, type: "land", weight: 2 }))],
      stills: [{ t: r2(last + 0.95), expect: `the heading ${q(s.heading)} and ${s.items.length} items, each whole and on at most two lines: ${s.items.map((x) => q(x, 30)).join(", ")}` }],
    };
  },
  prices(s, a) {
    const rows = s.rows.map((_, i) => r2(a + 0.5 + i * 0.6));
    const last = rows[rows.length - 1];
    const was = s.rows.some((x) => x.was);
    return {
      need: last + 1.9 + s.rows.length * 0.15,
      T: { head: r2(a), rows, note: r2(last + 0.45) },
      cues: [{ t: r2(a), type: "land", weight: 1 }, ...rows.map((t) => ({ t, type: "land", weight: 2 }))],
      stills: [{ t: r2(last + 1.2), expect: `the heading ${q(s.heading)} and ${s.rows.length} rows, each a name on the left and its price on the right, whole and not touching: ${s.rows.map((x) => `${q(x.name, 24)} ${x.price}`).join(", ")}${was ? "; each old price is struck through, left of its new price" : ""}${s.note ? `; the smaller line ${q(s.note)} is under the rows` : ""}` }],
    };
  },
  info(s, a) {
    const rows = s.rows.map((_, i) => r2(a + 0.45 + i * 0.8));
    const last = rows[rows.length - 1];
    return {
      need: last + 2.1 + s.rows.length * 0.15,
      T: { head: r2(a), rows },
      cues: [{ t: r2(a), type: "land", weight: 1 }, ...rows.map((t) => ({ t, type: "land", weight: 2 }))],
      stills: [{ t: r2(last + 1.2), expect: `the heading ${q(s.heading)} and ${s.rows.length} facts, each a small label over its own large line, whole: ${s.rows.map((x) => `${x.label}: ${q(x.text, 32)}`).join(", ")}` }],
    };
  },
  qa(s, a) {
    // A question is read before its answer arrives, and an answer before the next question.
    let t = a + (s.heading ? 0.5 : 0.1);
    const pairs = s.pairs.map((p) => {
      const at = { q: r2(t), a: r2(t + 0.8 + Math.min(0.6, p.q.length * 0.01)) };
      t = at.a + 0.9 + Math.min(1.0, p.a.length * 0.012);
      return at;
    });
    const need = pairs[pairs.length - 1].a + 2.2 + Math.min(1.2, s.pairs[s.pairs.length - 1].a.length * 0.012);
    return {
      need,
      T: { head: r2(a), pairs },
      cues: [...(s.heading ? [{ t: r2(a), type: "land", weight: 1 }] : []), ...pairs.flatMap((x) => [{ t: x.q, type: "land", weight: 2 }, { t: x.a, type: "land", weight: 1 }])],
      stills: [{ t: r2(need - 0.9), expect: `${s.heading ? `the heading ${q(s.heading)} and ` : ""}${s.pairs.length} ${s.pairs.length === 1 ? "question, marked with a question mark, with its answer" : "questions, each marked with a question mark, with its answer"} under it, every line whole: ${s.pairs.map((x) => `${q(x.q, 40)} then ${q(x.a, 40)}`).join("; ")}` }],
    };
  },
  when(s, a) {
    // A plain day of the month rolls into place like the leaves of a calendar; anything else ("13-14") just lands.
    const roll = /^\d{1,2}$/.test(s.date);
    const num0 = r2(a + 0.3), num1 = r2(num0 + (roll ? 0.8 : 0.3));
    const month = r2(num1 - 0.1), end = s.end ? r2(month + 0.4) : null;
    const from = r2((end ?? month) + 0.55);
    const lines = (s.lines || []).map((_, i) => r2(from + i * 0.55));
    const lastAt = lines.length ? lines[lines.length - 1] : end ?? month;
    const need = lastAt + 2.3;
    const parts = [`a date set very large on a calendar leaf: ${s.day ? `${q(s.day)} on the band at its top, ` : ""}the number ${q(s.date)} and under it ${q(s.month)}, all whole`];
    if (s.label) parts.push(`${q(s.label)} is above the leaf`);
    if (s.end) parts.push(`the line ${q(s.end)} is under the leaf`);
    if (lines.length) parts.push(`then ${lines.length === 1 ? "the line" : "the two lines"} ${s.lines.map((x) => q(x, 44)).join(" and ")}`);
    return {
      need,
      T: { top: r2(a), roll, num0, num1, month, end, rule: lines.length ? r2(from - 0.2) : null, lines },
      cues: [
        { t: r2(a + 0.05), type: "land", weight: 1 },
        ...(roll ? [{ t: num0, until: num1, type: "count", weight: 2 }] : []),
        { t: num1, type: "land", weight: 3 },
        ...(end != null ? [{ t: end, type: "land", weight: 1 }] : []),
        ...lines.map((t) => ({ t, type: "land", weight: 2 })),
      ],
      stills: [{ t: r2(need - 0.9), expect: parts.join("; ") }],
    };
  },
  steps(s, a) {
    const steps = s.steps.map((_, i) => r2(a + 0.5 + i * 1.35));
    const last = steps[steps.length - 1];
    return {
      need: last + 1.9,
      T: { head: r2(a), steps },
      cues: [{ t: r2(a), type: "land", weight: 1 }, ...steps.map((t) => ({ t, type: "land", weight: 2 }))],
      stills: [{ t: r2(last + 1.05), expect: `the heading ${q(s.heading)} and ${s.steps.length} numbered steps joined by a line, step ${s.steps.length} lit: ${s.steps.map((x) => q(x.title, 28)).join(", ")}` }],
    };
  },
  numbers(s, a) {
    const items = s.items.map((_, i) => { const t = r2(a + 0.4 + i * 0.7); return { count0: t, count1: r2(t + 0.8) }; });
    const last = items[items.length - 1].count1;
    return {
      need: last + 1.9 + s.items.length * 0.15,
      T: { head: r2(a), items },
      cues: [{ t: r2(a), type: "land", weight: 1 }, ...items.flatMap((x) => [{ t: x.count0, until: x.count1, type: "count", weight: 1 }, { t: x.count1, type: "land", weight: 2 }])],
      stills: [{ t: r2(last + 1.0), expect: `the heading ${q(s.heading)} and ${s.items.length} numbers in large type, each exactly as written with its label under it: ${s.items.map((x) => `${q(x.value)} ${cut(x.label, 28)}`).join(", ")}` }],
    };
  },
  stat(s, a) {
    const T = { count0: r2(a + 0.2), count1: r2(a + 1.25), label: r2(a + 1.05), note: r2(a + 1.6) };
    return {
      need: a + 3.8,
      T,
      cues: [{ t: T.count0, until: T.count1, type: "count", weight: 2 }, { t: T.count1, type: "land", weight: 3 }, { t: T.label, type: "land", weight: 1 }],
      stills: [{ t: r2(a + 2.6), expect: `${q(s.value)} in very large type, exactly as written; under it ${q(s.label)}${s.note ? ` and the smaller line ${q(s.note)}` : ""}` }],
    };
  },
  quote(s, a) {
    const by = r2(a + 0.3 + 0.9 + 0.35);
    const need = by + 1.5 + Math.min(2.6, s.text.length * 0.02);
    return {
      need,
      T: { mark: r2(a), text: r2(a + 0.3), by },
      cues: [{ t: r2(a), type: "land", weight: 2 }, { t: by, type: "land", weight: 1 }],
      stills: [{ t: r2(by + 0.9), expect: `the quote ${q(s.text, 60)} in full, and under it the name ${q(s.name)}${s.role ? ` with ${q(s.role)}` : ""}` }],
    };
  },
  compare(s, a) {
    const T = { head: r2(a), left: r2(a + 0.4), right: r2(a + 1.9) };
    return {
      need: T.right + 2.4,
      T,
      cues: [{ t: T.left, type: "land", weight: 2 }, { t: r2(T.right - 0.12), type: "whoosh", weight: 1 }, { t: T.right, type: "land", weight: 3 }],
      stills: [{ t: r2(T.right + 1.3), expect: `two panels: ${q(s.left.label)} above, dimmed, with ${q(s.left.text, 40)}; ${q(s.right.label)} below, marked with the video's colour, with ${q(s.right.text, 40)}; both texts whole` }],
    };
  },
  code(s, a) {
    const { at: lines, end } = typed(s.lines, a + 0.5);
    const hl = s.highlight ? r2(end + 0.35) : null;
    const need = (hl || end) + 2.3;
    const long = s.lines.some((line) => line.length > CODE.cols);
    return {
      need,
      T: { cap: r2(a), lines, end, hl },
      cues: [{ t: lines[0].t, until: end, type: "type", weight: 1 }, ...(hl ? [{ t: hl, type: "marker", weight: 2 }] : [])],
      stills: [{ t: r2(need - 0.9), expect: `a code card with ${s.lines.length} numbered ${s.lines.length === 1 ? "line" : "lines"}, all typed out and none cut off at the card's edge${long ? " (a long line continues on a second row, set in a little)" : ""}${s.highlight ? `; line ${s.highlight} is marked` : ""}; ${q(s.caption)} is above the card` }],
    };
  },
  fix(s, a, lang) {
    const marks = fixMarks(s), words = WORDS[lang] || WORDS.id;
    const w = typed(s.wrong, a + 0.5);
    const markW = marks.wrong.length ? r2(w.end + 0.3) : null;
    const dim = r2((markW ?? w.end) + 0.8); // the wrong code is read, then it steps back
    const rIn = r2(dim + 0.15);
    const r = typed(s.right, rIn + 0.4);
    const hl = marks.right.length ? r2(r.end + 0.35) : null;
    const need = (hl ?? r.end) + 2.4;
    return {
      need,
      T: { cap: r2(a), wrong: w.at, markW, dim, rIn, right: r.at, hl, marks },
      cues: [
        { t: w.at[0].t, until: w.end, type: "type", weight: 1 },
        ...(markW != null ? [{ t: markW, type: "marker", weight: 1 }] : []),
        { t: r2(rIn - 0.12), type: "whoosh", weight: 1 },
        { t: rIn, type: "land", weight: 2 },
        { t: r.at[0].t, until: r.end, type: "type", weight: 1 },
        ...(hl != null ? [{ t: hl, type: "marker", weight: 2 }] : []),
      ],
      stills: [{ t: r2(need - 0.9), expect: `two code cards, every line whole and none cut off at a card's edge: above, under the label "${words.wrong}", the wrong code (${s.wrong.length} ${s.wrong.length === 1 ? "line" : "lines"}), dimmed; below, under "${words.right}", the right code (${s.right.length} ${s.right.length === 1 ? "line" : "lines"})${marks.right.length ? `, with line ${marks.right.map((i) => i + 1).join(" and ")} marked` : ""}; ${q(s.caption)} is above them` }],
    };
  },
  end(s, a) {
    const n = Math.max(1, s.address.length);
    const addr0 = r2(a + 0.6), addr1 = r2(addr0 + Math.min(0.9, n * 0.035));
    const press = r2(addr1 + 0.7);
    return {
      need: press + 1.6, // the button stays long enough to be read
      T: { line: r2(a), name: r2(a + 0.2), addr0, addr1, press },
      cues: [{ t: addr0, until: addr1, type: "type", weight: 1 }, { t: press, type: "press", weight: 2 }],
      stills: [{ t: r2(press + 0.55), expect: `the end card on the video's colour: ${q(s.line)}${s.name ? `, the name ${q(s.name)}` : ""}, the address ${q(s.address)} typed in a field, and the button ${q(s.button)}` }],
    };
  },
};

// The spoken line of a scene may have about 2.5 words per second of the scene, with a little room.
export const voiceRoom = (seconds) => Math.floor(2.5 * (seconds + 1.5));
