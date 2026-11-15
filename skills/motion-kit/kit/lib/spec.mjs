// The kit's rules, in one place: which scenes exist, what each field may hold, how long each
// scene lasts, when things land in it, and what a still of it should show. build.mjs reads
// this to check a storyboard and to write the video; the browser gets the times as data, so
// timing is decided here and nowhere else.

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
  promo: { need: [], may: ["page", "image", "list", "steps", "stat", "quote"], about: "a person, page, shop or product" },
  announce: { need: [], may: ["image", "page", "stat", "list", "steps", "compare"], about: "something new: a feature, an opening, a date" },
  explainer: { need: [["steps"]], may: ["steps", "code", "image", "compare", "list"], about: "how something works, in steps" },
  tips: { need: [["list"]], may: ["list", "stat", "quote", "image"], about: "a short list of tips or reasons" },
  coding: { need: [["code"]], may: ["code", "compare", "steps", "list"], about: "a piece of code and what it does" },
  testimonial: { need: [["quote"]], may: ["quote", "stat", "page", "image", "list"], about: "what a real person said" },
  "before-after": { need: [["compare"]], may: ["compare", "list", "stat", "image"], about: "a change: before and after, wrong and right" },
};

const text = (max, req = false) => ({ kind: "text", max, req });
export const FIELDS = {
  title: { kicker: text(28), headline: text(44, true), sub: text(80) },
  page: { title: text(26, true), address: text(34, true), file: { kind: "file", req: true, ext: ["html", "htm"] } },
  image: { title: text(26), caption: text(64, true), file: { kind: "file", req: true, ext: ["png", "jpg", "jpeg", "webp"] } },
  list: { heading: text(30, true), items: { kind: "texts", min: 2, most: 4, max: 48, req: true } },
  steps: { heading: text(30, true), steps: { kind: "objects", min: 2, most: 4, req: true, of: { title: text(28, true), detail: text(56) } } },
  stat: { value: { ...text(12, true), how: "keep only the number and its unit here, as the brief writes it (\"Rp15.000\", \"87%\", \"3 days\"); the words that explain it go in \"label\"" }, label: text(44, true), note: text(48) },
  quote: { text: text(150, true), name: text(28, true), role: text(40) },
  compare: {
    heading: text(30),
    left: { kind: "object", req: true, of: { label: text(14, true), text: text(56, true) } },
    right: { kind: "object", req: true, of: { label: text(14, true), text: text(56, true) } },
  },
  code: { caption: text(44, true), lang: text(12), lines: { kind: "texts", min: 2, most: 9, max: 40, req: true, raw: true }, highlight: { kind: "int" } },
  end: { line: text(30, true), name: text(26), address: text(34, true), button: text(20, true) },
};

// How many layouts each scene has. The builder picks one from the scene's own words, so two
// videos differ without anyone choosing.
export const VARIANTS = { title: 2, list: 2, end: 2, quote: 2, stat: 2 };

const r2 = (v) => Math.round(v * 100) / 100;
const cut = (s, n = 36) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + "…" : String(s));
const q = (s, n) => `"${cut(s, n)}"`;

// plan(scene, a): `a` is when the scene's content may start (0 in the first scene, IN after a
// cover). Returns the time its last move lands plus a hold (`need`), the times the browser
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
      cues: [{ t: T.open, type: "whoosh", weight: 1 }, { t: T.cap, type: "land", weight: 1 }],
      stills: [{ t: r2(a + 2.4), expect: `the picture fills its frame and is not stretched; the caption ${q(s.caption, 48)} is whole${s.title ? `; ${q(s.title)} is above the picture` : ""}` }],
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
    let t = a + 0.5;
    const lines = s.lines.map((line) => {
      const d = Math.min(0.55, Math.max(0.12, line.length * 0.028));
      const at = { t: r2(t), d: r2(d) };
      t += d + 0.07;
      return at;
    });
    const end = r2(t - 0.07);
    const hl = s.highlight ? r2(end + 0.35) : null;
    const need = (hl || end) + 2.3;
    return {
      need,
      T: { cap: r2(a), lines, end, hl },
      cues: [{ t: lines[0].t, until: end, type: "type", weight: 1 }, ...(hl ? [{ t: hl, type: "marker", weight: 2 }] : [])],
      stills: [{ t: r2(need - 0.9), expect: `a code card with ${s.lines.length} numbered lines, all typed out and none cut off${s.highlight ? `; line ${s.highlight} is marked` : ""}; ${q(s.caption)} is above the card` }],
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
