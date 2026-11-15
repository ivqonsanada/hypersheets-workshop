// The kit's runtime. LOCKED: nothing in this folder is edited to make a video.
// It lays out each scene from its data (the builder wrote the words and every time into the
// scene's data-mk), measures text on a canvas (a scene is not laid out until it plays, so
// nothing here reads the page's layout), and registers one paused, seekable timeline per scene.
(() => {
  const CFG = window.MK_CONFIG || { look: "warnet" };
  const LOOK = CFG.look;
  const MK = (window.MK = { look: LOOK, defs: {} });
  MK.define = (type, fn) => { MK.defs[type] = fn; };
  // The few words the kit itself puts on screen (the builder sends them in the video's language).
  MK.words = CFG.words || {};

  // ---------- colour ----------
  const CREAM = [244, 237, 228], DARK = [23, 20, 18];
  const GROUND = { warnet: DARK, kertas: [243, 237, 226], panggung: null }[LOOK];
  const DEFAULT = { warnet: [249, 115, 22], kertas: [184, 67, 47], panggung: [255, 201, 40] }[LOOK];
  const parse = (s) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s || "").trim());
    return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
  };
  const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  // `c` moved toward white or black, a little at a time, until it stands `min` : 1 against `on`.
  function readable(c, on, min) {
    const to = lum(on) < 0.4 ? [255, 255, 255] : [0, 0, 0];
    let out = c;
    for (let k = 0; k <= 1 && contrast(out, on) < min; k += 0.04) out = mix(c, to, k);
    return out;
  }
  // Every colour the looks use comes from one accent. Nobody picks a text colour by hand.
  MK.setAccent = (rgb) => {
    const st = document.documentElement.style;
    let fill = rgb || DEFAULT;
    let ground = GROUND;
    if (LOOK === "panggung") {
      // The accent is the ground. If neither ink reads on it, darken it until cream does.
      ground = fill;
      for (let k = 0; k <= 1 && Math.max(contrast(ground, CREAM), contrast(ground, DARK)) < 4.5; k += 0.04) ground = mix(fill, [0, 0, 0], k);
      fill = ground;
    } else {
      fill = readable(fill, ground, 1.8); // a band of it must show on the ground
    }
    const on = contrast(fill, CREAM) >= contrast(fill, DARK) ? CREAM : DARK;
    st.setProperty("--mk-accent", hex(fill));
    st.setProperty("--mk-on-accent", hex(on));
    st.setProperty("--mk-accent-ink", hex(LOOK === "panggung" ? on : readable(fill, ground, 4.5)));
    // A second tone for the marked words inside a panel filled with the ink (panggung's code card).
    st.setProperty("--mk-pop", on === DARK ? "#ffffff" : hex(DARK));
  };
  MK.setAccent(parse(CFG.accent));
  MK.color = { parse, hex, lum, contrast, mix };

  // ---------- small helpers ----------
  const h = (MK.h = (tag, cls, kids) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (kids == null) return el;
    for (const k of [].concat(kids)) if (k != null) el.append(k);
    return el;
  });
  const ctx = document.createElement("canvas").getContext("2d");
  const FONT = {
    warnet: { display: ["Finlandica", 700, -0.01], body: ["Finlandica", 500, 0], mono: ["JetBrains Mono", 500, 0] },
    kertas: { display: ["Fraunces", 600, -0.02], body: ["Finlandica", 500, 0], mono: ["JetBrains Mono", 500, 0] },
    panggung: { display: ["Big Shoulders Display", 900, 0.005], body: ["Finlandica", 600, 0], mono: ["JetBrains Mono", 600, 0] },
  }[LOOK];
  MK.font = FONT;
  const measure = (text, [family, weight, track], size) => {
    ctx.font = `${weight} ${size}px "${family}"`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${track * size}px`;
    return ctx.measureText(text).width;
  };
  // Greedy line breaking at `size`. `over` is true when one word alone is wider than the room.
  function flow(text, font, size, room) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "", over = false;
    for (const w of words) {
      if (measure(w, font, size) > room) over = true;
      const next = line ? line + " " + w : w;
      if (line && measure(next, font, size) > room) { lines.push(line); line = w; } else line = next;
    }
    if (line) lines.push(line);
    return { lines, over };
  }
  // Where to break `words` into exactly `n` lines of at most `room` px. Of every way that fits, it takes the
  // one whose lines are most even, and it would rather end a line at a comma than after a joining word
  // ("di", "dan", "with") or between a number and the word it counts ("12 / Desember", "3 / hari").
  const JOIN = /^(di|ke|dari|dan|yang|untuk|dengan|atau|pada|per|a|an|the|of|to|in|on|at|for|and|or|with|by)$/i;
  function breaks(words, font, size, room, n) {
    const w = words.map((x) => measure(x, font, size));
    const space = measure("a b", font, size) - measure("ab", font, size);
    let best = null, bestCost = Infinity;
    const ends = [];
    const walk = (start, left, widths) => {
      if (left === 1) {
        let last = 0;
        for (let i = start; i < words.length; i++) last += w[i] + (i > start ? space : 0);
        if (last > room) return;
        const all = widths.concat(last), widest = Math.max(...all);
        let cost = all.reduce((a, x) => a + ((widest - x) / room) ** 2, 0);
        for (const e of ends) {
          const end = words[e - 1], next = words[e];
          if (/[,.:;!?]$/.test(end)) cost -= 0.1;
          else if (JOIN.test(end)) cost += 0.06;
          else if (/^\d+$/.test(end) && /^[A-Za-z]/.test(next)) cost += 0.06;
        }
        if (cost < bestCost) { bestCost = cost; best = ends.slice(); }
        return;
      }
      let width = 0;
      for (let end = start + 1; end <= words.length - (left - 1); end++) {
        width += w[end - 1] + (end - 1 > start ? space : 0);
        if (width > room) break;
        ends.push(end);
        walk(end, left - 1, widths.concat(width));
        ends.pop();
      }
    };
    walk(0, n, []);
    if (!best) return null;
    const cuts = [0, ...best, words.length];
    return cuts.slice(1).map((e, i) => words.slice(cuts[i], e).join(" "));
  }
  // The largest of `sizes` at which `text` takes at most `most` lines of `room` px. When even
  // the smallest fails, it is used and the scene is flagged, so the still shows the problem.
  MK.fit = (text, role, sizes, room, most) => {
    const font = FONT[role];
    let last = null;
    for (const size of sizes) {
      const r = flow(text, font, size, room * 0.97);
      last = { size, lines: r.lines, ok: !r.over && r.lines.length <= most };
      if (last.ok) break;
    }
    // Two to four lines are broken again, by the whole line: as even as they can be, so a last
    // line is never one stray word, and at a comma before anywhere else.
    const n = last.lines.length;
    if (last.ok && n > 1 && n <= 4) {
      const words = String(text).trim().split(/\s+/).filter(Boolean);
      const lines = words.length <= 28 ? breaks(words, font, last.size, room * 0.97, n) : null;
      if (lines && lines.every((l) => measure(l, font, last.size) <= room)) last.lines = lines;
    }
    return last;
  };
  // An element holding `fitted` text, one block per line: `<tag class><span.ln><span.tx>…`.
  MK.text = (tag, cls, fitted, lh) => {
    const el = h(tag, cls, fitted.lines.map((line) => h("span", "ln", h("span", "tx", line))));
    el.style.fontSize = fitted.size + "px";
    el.style.lineHeight = String(lh);
    el.dataset.h = String(Math.ceil(fitted.lines.length * fitted.size * lh));
    return el;
  };
  // How wide `text` is at `size`, spaces and all (code keeps its indentation).
  MK.width = (text, role, size) => measure(text, FONT[role], size);
  MK.plain = (tag, cls, text) => { const el = h(tag, cls); el.textContent = text; return el; };

  // ---------- motion: one vocabulary per look ----------
  const steps = (n, ease) => { const e = gsap.parseEase(ease || "power3.out"); return (p) => Math.round(e(p) * n) / n; };
  const M = {
    warnet: {
      lines(tl, els, at) { tl.fromTo(els, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.34, ease: steps(8), stagger: 0.09 }, at); },
      pop(tl, el, at) { tl.fromTo(el, { scale: 0 }, { scale: 1, duration: 0.18, ease: "steps(3)" }, at); },
      grow(tl, el, at, d) { tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: d || 0.4, ease: steps(8) }, at); },
      block(tl, el, at) { tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(-4% -4% -4% -4%)", duration: 0.3, ease: steps(6) }, at); },
      sweep(tl, el, at) { tl.fromTo(el, { clipPath: "inset(-40px 101% -40px -40px)" }, { clipPath: "inset(-40px -40px -40px -40px)", duration: 0.6, ease: steps(10) }, at); },
      count: steps(12, "power2.out"),
    },
    kertas: {
      lines(tl, els, at) {
        const tx = [].concat(...[].concat(els).map((e) => (e.classList && e.classList.contains("ln") ? [e.firstChild] : [e])));
        tl.fromTo(tx, { yPercent: 115 }, { yPercent: 0, duration: 0.62, ease: "power3.out", stagger: 0.09 }, at);
      },
      pop(tl, el, at) { tl.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: "power3.out" }, at); },
      grow(tl, el, at, d) { tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: d || 0.7, ease: "power3.inOut" }, at); },
      block(tl, el, at) { tl.fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, at); },
      sweep(tl, el, at) { tl.fromTo(el, { clipPath: "inset(-40px 101% -40px -40px)" }, { clipPath: "inset(-40px -40px -40px -40px)", duration: 0.7, ease: "power3.inOut" }, at); },
      count: gsap.parseEase("power3.out"),
    },
    panggung: {
      lines(tl, els, at) { tl.fromTo(els, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, ease: "back.out(1.6)", stagger: 0.07 }, at); },
      pop(tl, el, at) { tl.fromTo(el, { scale: 0, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(2.2)" }, at); },
      grow(tl, el, at, d) { tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: d || 0.32, ease: "power4.out" }, at); },
      // No fade: a half-seen dark panel on a loud ground turns to mud.
      block(tl, el, at) { tl.fromTo(el, { y: 90, clipPath: "inset(0% 0% 100% 0%)" }, { y: 0, clipPath: "inset(-4% -4% -4% -4%)", duration: 0.36, ease: "power4.out" }, at); },
      sweep(tl, el, at) { tl.fromTo(el, { clipPath: "inset(-40px 101% -40px -40px)" }, { clipPath: "inset(-40px -40px -40px -40px)", duration: 0.3, ease: "power4.out" }, at); },
      count: gsap.parseEase("power4.out"),
    },
  }[LOOK];
  MK.m = M;
  MK.steps = steps;

  // The cover that hands one scene to the next: it closes over a scene's last 0.4 s and lifts
  // over the next scene's first third of a second.
  function cover(c) {
    if (c.first && c.last) return;
    const box = h("div", "mk-cover");
    box.setAttribute("data-layout-ignore", "");
    c.host.append(box);
    const D = c.dur, O = 0.4, I = 0.34;
    // Two sets of the same shapes: `lift` starts closed and opens, `shut` starts open and closes.
    const lift = c.first ? null : h("div", "lift"), shut = c.last ? null : h("div", "shut");
    if (lift) box.append(lift);
    if (shut) box.append(shut);
    if (LOOK === "warnet") {
      const cols = (into) => { const set = Array.from({ length: 9 }, () => h("i")); into.append(...set); return set; };
      if (lift) c.tl.fromTo(cols(lift), { scaleY: 1 }, { scaleY: 0, duration: 0.22, ease: "steps(4)", stagger: 0.0125 }, 0);
      if (shut) c.tl.fromTo(cols(shut), { scaleY: 0 }, { scaleY: 1, duration: 0.24, ease: "steps(4)", stagger: 0.0175 }, D - O);
    } else if (LOOK === "kertas") {
      const pane = (into) => { const p = h("i"); into.append(p); return p; };
      if (lift) c.tl.fromTo(pane(lift), { xPercent: 0 }, { xPercent: 104, duration: I, ease: "power3.inOut" }, 0);
      if (shut) c.tl.fromTo(pane(shut), { xPercent: -104 }, { xPercent: 0, duration: O - 0.02, ease: "power3.inOut" }, D - O);
    } else {
      const pair = (into) => { const p = [h("i", "a"), h("i", "b")]; into.append(...p); return p; };
      if (lift) { const p = pair(lift); c.tl.fromTo(p[0], { yPercent: 0 }, { yPercent: -101, duration: 0.3, ease: "power4.out" }, 0.04); c.tl.fromTo(p[1], { yPercent: 0 }, { yPercent: 101, duration: 0.3, ease: "power4.out" }, 0.04); }
      if (shut) { const p = pair(shut); c.tl.fromTo(p[0], { yPercent: -101 }, { yPercent: 0, duration: 0.22, ease: "power4.in" }, D - 0.26); c.tl.fromTo(p[1], { yPercent: 101 }, { yPercent: 0, duration: 0.22, ease: "power4.in" }, D - 0.26); }
    }
  }

  // A red strip in the frame when something does not fit: the still then shows it plainly.
  MK.problem = (c, what) => {
    let strip = c.el.querySelector(".mk-problem");
    if (!strip) { strip = h("div", "mk-problem"); c.el.append(strip); }
    strip.textContent = `DOES NOT FIT: ${what}. Shorten it in storyboard.json.`;
  };

  // ---------- fonts, then every scene ----------
  const need = Object.values(FONT).map(([family, weight]) => `${weight} 80px "${family}"`);
  const fonts = () => {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const sample = CFG.sample || "Aa";
    return Promise.all(need.map((f) => document.fonts.load(f, sample).catch(() => {})));
  };
  MK.ready = fonts();

  MK.mount = (id) => {
    const el = document.getElementById(id + "-in");
    const data = JSON.parse(el.dataset.mk);
    const tl = gsap.timeline({ paused: true });
    const c = { id, el, host: el.parentNode, s: data.s, T: data.T, v: data.v || 0, dur: data.dur, first: !!data.first, last: !!data.last, tl, W: 912, H: 1300 };
    el.classList.add("mk-" + data.type.replace("/", "-"), "v" + c.v);
    MK.ready.then(() => {
      try {
        const def = MK.defs[data.type];
        if (!def) throw new Error("no scene " + data.type);
        def(c);
      } catch (e) {
        MK.problem(c, String(e && e.message ? e.message : e));
      }
      // A scene that waits for something (the page scene waits for the page) registers after it.
      const done = () => {
        cover(c);
        tl.to({}, { duration: 0.01 }, Math.max(0, c.dur - 0.01)); // the timeline spans the scene
        window.__timelines[id] = tl;
      };
      Promise.resolve(c.wait).then(done, done);
    });
  };
})();
