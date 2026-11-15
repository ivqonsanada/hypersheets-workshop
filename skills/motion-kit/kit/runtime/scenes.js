// The kit's scenes. LOCKED: nothing in this folder is edited to make a video.
// Each scene builds its own elements from the words in `c.s` and animates them at the times
// in `c.T` (both written by the builder). Sizes come from measuring the words, never from
// guessing, and every move is a pure function of time.
(() => {
  const MK = window.MK, h = MK.h, M = MK.m, LOOK = MK.look;
  const P = LOOK === "panggung", K = LOOK === "kertas";
  const lines = (el) => Array.from(el.querySelectorAll(".ln"));
  const flag = (c, fitted, what) => { if (!fitted.ok) MK.problem(c, what); return fitted; };
  const safe = (c, kids) => { const box = h("div", "mk-safe", kids); c.el.append(box); return box; };
  // A number that drives things a tween cannot (typing, counting), so they follow the playhead.
  const drive = (c, fn) => {
    const d = { t: 0 };
    c.tl.fromTo(d, { t: 0 }, { t: c.dur, duration: c.dur, ease: "none", onUpdate: () => fn(d.t) }, 0);
    fn(0);
  };
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const head = (c, text) => MK.text("h2", "head", flag(c, MK.fit(text, "display", P ? [128, 112, 100, 88, 76] : [96, 88, 80, 72, 64], c.W, 2), "the heading"), P ? 1.02 : 1.1);

  // ---------- title: the opening statement, whole from the first frame ----------
  MK.define("title", (c) => {
    const s = c.s;
    const sizes = P ? [264, 232, 204, 180, 156, 136, 116, 100] : K ? [164, 148, 132, 118, 106, 94, 84] : [176, 160, 144, 128, 112, 96, 84];
    const hd = MK.text("h1", "hd", flag(c, MK.fit(s.headline, "display", sizes, c.W - (P ? 56 : 28), 4), "the headline"), P ? 1.0 : 1.08);
    const kids = [];
    if (s.kicker) kids.push(h("p", "kick", [h("i"), h("span", null, s.kicker)]));
    kids.push(hd);
    const band = c.v === 0;
    const rule = band ? null : h("i", "rule");
    if (rule) kids.push(rule);
    if (s.sub) kids.push(MK.text("p", "sub", flag(c, MK.fit(s.sub, "body", [54, 50, 46], c.W, 3), "the line under the headline"), 1.28));
    safe(c, kids);
    if (band) {
      const bands = lines(hd).map((ln) => {
        const bd = h("span", "bd", [h("s"), h("b"), h("em", null, ln.textContent)]);
        bd.setAttribute("aria-hidden", "true");
        for (const a of ["occlusion", "overlap", "overflow"]) bd.setAttribute("data-layout-allow-" + a, "");
        ln.append(bd);
        return bd;
      });
      // The words are on screen from frame 0; the colour arrives behind them within the first second.
      bands.forEach((bd, i) => M.sweep(c.tl, bd, c.T.band + i * 0.12));
    } else {
      M.grow(c.tl, rule, c.T.band, P ? 0.36 : 0.6);
    }
    const dot = c.el.querySelector(".kick i");
    if (dot && !P) c.tl.fromTo(dot, { scale: 1 }, { scale: 1.7, duration: 0.16, ease: "steps(2)", repeat: 1, yoyo: true }, c.T.rule);
    if (P && s.kicker) c.tl.fromTo(c.el.querySelector(".kick"), { rotation: -7, scale: 1.12 }, { rotation: -2, scale: 1, duration: 0.3, ease: "back.out(2)" }, c.T.band);
  });

  // ---------- list: a heading and two to four lines that land one by one ----------
  MK.define("list", (c) => {
    const s = c.s;
    const hd = head(c, s.heading);
    const room = c.W - (K ? 92 + 30 : 96 + 36);
    const avail = c.H - Number(hd.dataset.h) - 68;
    let rows = null;
    for (const size of [68, 62, 58, 54, 50, 46, 42]) {
      const fits = s.items.map((t) => MK.fit(t, "body", [size], room, 2));
      const total = fits.reduce((a, f) => a + Math.max(96, f.lines.length * size * 1.22) + (K ? 88 : 56), 0);
      rows = fits;
      if (fits.every((f) => f.ok) && total <= avail) break;
    }
    rows.forEach((f, i) => flag(c, f, "list item " + (i + 1)));
    const lis = rows.map((f, i) => h("li", null, [h("b", "chip", String(i + 1)), MK.text("p", "it", f, 1.22), i < rows.length - 1 ? h("i", "hr") : null]));
    safe(c, [hd, h("ol", null, lis)]);
    M.lines(c.tl, lines(hd), c.T.head);
    lis.forEach((li, i) => {
      M.pop(c.tl, li.firstChild, c.T.items[i]);
      M.lines(c.tl, lines(li), c.T.items[i] + 0.08);
      if (li.querySelector(".hr")) M.grow(c.tl, li.querySelector(".hr"), c.T.items[i] + 0.1, 0.5);
    });
  });

  // ---------- steps: numbered steps on a line, lit one after another ----------
  MK.define("steps", (c) => {
    const s = c.s, n = s.steps.length;
    const hd = head(c, s.heading);
    const room = c.W - 88 - 36;
    const few = n < 4;
    const sts = s.steps.map((st, i) => {
      const tt = MK.text("p", "tt", flag(c, MK.fit(st.title, "body", few ? [66, 60, 54, 50, 46] : [56, 52, 48, 44], room, 2), "step " + (i + 1)), 1.16);
      const dt = st.detail ? MK.text("p", "dt", flag(c, MK.fit(st.detail, "body", few ? [46, 42, 38] : [40, 36], room, 2), "the detail of step " + (i + 1)), 1.26) : null;
      // Each step but the last carries the piece of line that runs down to the next node.
      const way = i < n - 1 ? h("i", "way", h("i")) : null;
      return h("div", "st", [way, h("b", "node", [String(i + 1), h("u", null, String(i + 1))]), h("div", "bd2", [tt, dt])]);
    });
    safe(c, [hd, h("div", "rail", sts)]);
    M.lines(c.tl, lines(hd), c.T.head);
    sts.forEach((st, i) => {
      const node = st.querySelector(".node"), on = node.querySelector("u"), tt = st.querySelector(".tt"), dt = st.querySelector(".dt"), way = st.querySelector(".way");
      M.pop(c.tl, node, c.T.head + 0.12 + i * 0.07);
      c.tl.fromTo(tt, { opacity: 0 }, { opacity: 0.5, duration: 0.2, ease: "none" }, c.T.head + 0.16 + i * 0.07);
      if (way) c.tl.fromTo(way, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" }, c.T.head + 0.2 + i * 0.07);
      const t = c.T.steps[i];
      M.pop(c.tl, on, t);
      c.tl.fromTo(tt, { opacity: 0.5 }, { opacity: 1, duration: 0.16, ease: "none", immediateRender: false }, t);
      if (dt) M.lines(c.tl, lines(dt), t + 0.12);
      // The piece of line above this step fills as the step lights.
      if (i > 0) c.tl.fromTo(sts[i - 1].querySelector(".way i"), { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: P ? "power4.out" : K ? "power3.inOut" : MK.steps(6) }, t - 0.4);
    });
  });

  // ---------- stat: one number, counted up, and what it means ----------
  MK.define("stat", (c) => {
    const s = c.s, boxed = c.v === 1;
    const m = /^(.*?)(\d[\d.,]*\d|\d)(.*)$/.exec(s.value) || [null, "", "0", s.value];
    const [, pre, digits, post] = m;
    // Which mark splits thousands and which splits decimals, read from the number itself.
    const lastSep = Math.max(digits.lastIndexOf("."), digits.lastIndexOf(","));
    const tail = lastSep < 0 ? 0 : digits.length - lastSep - 1;
    const decSep = lastSep >= 0 && tail !== 3 ? digits[lastSep] : "";
    const groupSep = digits.replace(decSep || "\u0000", "").match(/[.,]/) ? (decSep === "," ? "." : decSep === "." ? "," : digits[lastSep]) : "";
    const decimals = decSep ? tail : 0;
    const end = Number(digits.split(groupSep || "\u0000").join("").replace(",", "."));
    const show = (v) => {
      const [int, frac] = v.toFixed(decimals).split(".");
      const grouped = groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep) : int;
      return pre + grouped + (frac ? decSep + frac : "") + post;
    };
    const sizes = P ? [460, 400, 350, 300, 260, 220, 190, 160] : [380, 340, 300, 260, 220, 190, 160, 132];
    const fitted = flag(c, MK.fit(s.value.replace(/\s+/g, " "), "display", sizes, c.W - (boxed ? 88 : 0), 1), "the number");
    const num = MK.plain("div", "num", s.value);
    num.style.fontSize = fitted.size + "px";
    const bar = h("i", "bar");
    const lab = MK.text("p", "lab", flag(c, MK.fit(s.label, "body", [64, 58, 52], c.W, 2), "the label"), 1.2);
    const note = s.note ? MK.text("p", "note", flag(c, MK.fit(s.note, "body", [42, 38], c.W, 2), "the small line"), 1.3) : null;
    safe(c, [boxed ? h("div", "box", num) : num, bar, lab, note]);
    if (boxed) M.block(c.tl, num.parentNode, c.T.count0 - 0.1);
    else M.grow(c.tl, bar, c.T.count0, c.T.count1 - c.T.count0);
    drive(c, (t) => {
      const p = clamp((t - c.T.count0) / (c.T.count1 - c.T.count0));
      const text = p >= 1 ? s.value : show(end * MK.m.count(p));
      if (num.textContent !== text) num.textContent = text;
    });
    M.lines(c.tl, lines(lab), c.T.label);
    if (note) M.lines(c.tl, lines(note), c.T.note);
  });

  // ---------- quote: what a real person said, and who ----------
  MK.define("quote", (c) => {
    const s = c.s, card = c.v === 1;
    const room = c.W - (card ? (K ? 0 : 116) : 0);
    const qt = MK.text("blockquote", "qt", flag(c, MK.fit(s.text, K ? "display" : "body", [78, 72, 66, 60, 54, 50, 46], room, 8), "the quote"), 1.24);
    const by = h("div", "by", [h("i"), h("div", null, [MK.plain("p", "nm", s.name), s.role ? MK.plain("p", "rl", s.role) : null])]);
    const qm = h("div", "qm", [h("i"), h("i")]);
    const inner = [qm, qt, by];
    safe(c, card ? h("div", "card", inner) : inner);
    if (card) M.block(c.tl, c.el.querySelector(".card"), c.T.mark);
    M.pop(c.tl, qm, c.T.mark + (card ? 0.15 : 0));
    M.lines(c.tl, lines(qt), c.T.text);
    M.block(c.tl, by, c.T.by);
  });

  // ---------- compare: the old way above, the new way below ----------
  MK.define("compare", (c) => {
    const s = c.s;
    const room = c.W - (K ? 0 : 88 + 16);
    const pane = (side, cls) => {
      const strike = cls === "a" ? h("s") : null;
      const lb = h("p", "lb", [h("span", null, side.label), strike]);
      const pt = MK.text("p", "pt", flag(c, MK.fit(side.text, K ? "display" : "body", [58, 54, 50, 46, 42], room, 3), `the ${cls === "a" ? "first" : "second"} panel's text`), 1.22);
      return h("div", "pn " + cls, [lb, pt]);
    };
    const hd = s.heading ? head(c, s.heading) : null;
    const a = pane(s.left, "a"), b = pane(s.right, "b"), arrow = h("div", "arrow", h("i"));
    safe(c, [hd, a, arrow, b]);
    if (hd) M.lines(c.tl, lines(hd), c.T.head);
    M.block(c.tl, a, c.T.left);
    M.pop(c.tl, arrow.firstChild, c.T.right - 0.25);
    M.block(c.tl, b, c.T.right);
    c.tl.fromTo(a.querySelector(".pt"), { opacity: 1 }, { opacity: 0.55, duration: 0.25, ease: "none", immediateRender: false }, c.T.right);
    M.grow(c.tl, a.querySelector("s"), c.T.right + 0.05, 0.3);
  });

  // ---------- code: real code, typed line by line ----------
  const TOKEN = /(\/\/.*$|\/\*.*?\*\/|<!--.*?-->)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d.]*(?:px|rem|em|vh|vw|fr|ms|s|%)?)/g;
  const tokens = (line) => {
    const out = [];
    let at = 0;
    for (const m of line.matchAll(TOKEN)) {
      if (m.index > at) out.push(["", line.slice(at, m.index)]);
      out.push([m[1] ? "c1" : m[2] ? "c2" : "c3", m[0]]);
      at = m.index + m[0].length;
    }
    if (at < line.length) out.push(["", line.slice(at)]);
    return out;
  };
  MK.define("code", (c) => {
    const s = c.s;
    const cap = MK.text("p", "cap" + (K || P ? " d" : ""), flag(c, MK.fit(s.caption, K || P ? "display" : "body", P ? [112, 100, 88, 76, 64] : K ? [84, 76, 68, 60, 52] : [72, 66, 60, 54, 48], c.W, 2), "the caption"), P ? 1.02 : 1.14);
    const longest = s.lines.reduce((a, b) => (b.length > a.length ? b : a), "");
    const room = c.W - 76 - 28 - 16;
    const fitted = flag(c, MK.fit(longest.replace(/ /g, " ") || "x", "mono", [46, 42, 38, 36, 34, 32, 30], room, 1), "the longest line of code");
    const lis = s.lines.map((line, i) => {
      const hl = s.highlight === i + 1;
      return h("li", null, [hl ? h("u") : null, hl ? h("em") : null, h("b", null, String(i + 1)), h("code")]);
    });
    const ol = h("ol", null, lis);
    ol.style.fontSize = fitted.size + "px";
    ol.style.lineHeight = "1.6";
    const card = h("div", "card", [h("div", "top", [h("i"), h("i"), h("i"), s.lang ? MK.plain("span", null, s.lang) : null]), ol]);
    safe(c, [cap, card]);
    M.lines(c.tl, lines(cap), c.T.cap);
    M.block(c.tl, card, c.T.cap + 0.1);
    const toks = s.lines.map(tokens), shown = s.lines.map(() => -1);
    const paint = (i, k) => {
      if (shown[i] === k) return;
      shown[i] = k;
      const code = lis[i].lastChild;
      code.textContent = "";
      let left = k;
      for (const [cls, text] of toks[i]) {
        if (left <= 0) break;
        const part = text.slice(0, left);
        left -= part.length;
        code.append(cls ? MK.plain("span", cls, part) : part);
      }
    };
    drive(c, (t) => {
      s.lines.forEach((line, i) => {
        const at = c.T.lines[i];
        paint(i, Math.round(clamp((t - at.t) / at.d) * line.length));
      });
    });
    if (s.highlight && c.T.hl != null) {
      const li = lis[s.highlight - 1];
      M.grow(c.tl, li.querySelector("u"), c.T.hl, 0.3);
      M.pop(c.tl, li.querySelector("em"), c.T.hl);
    }
  });

  // ---------- image: one picture, held in a frame, with a slow push ----------
  MK.define("image", (c) => {
    const s = c.s;
    const img = h("img");
    img.src = s.src;
    img.alt = "";
    img.setAttribute("data-layout-allow-overflow", "");
    const fr = h("figure", "fr", h("div", "ph", img));
    const cap = MK.text("p", "cap", flag(c, MK.fit(s.caption, K ? "display" : "body", [50, 46, 42], c.W, 2), "the caption"), 1.24);
    const hd = s.title ? head(c, s.title) : null;
    if (hd) fr.style.height = "880px";
    safe(c, [hd, fr, cap]);
    if (hd) M.lines(c.tl, lines(hd), c.T.open);
    M.block(c.tl, fr, c.T.open + (hd ? 0.12 : 0));
    c.tl.fromTo(img, { scale: 1.0 }, { scale: 1.08, duration: c.dur, ease: "none" }, 0);
    M.lines(c.tl, lines(cap), c.T.cap);
  });

  // ---------- end: where to go, typed out, and one press of the button ----------
  MK.define("end", (c) => {
    const s = c.s, T = c.T;
    const line = MK.plain("p", "line", s.line);
    const nm = s.name ? MK.text("h2", "nm", flag(c, MK.fit(s.name, "display", P ? [210, 184, 160, 136, 116, 96] : [150, 132, 116, 100, 88, 76], c.W, 2), "the name"), P ? 1.0 : 1.08) : null;
    const addr = h("span", "addr"), caret = h("b", "caret");
    const field = h("div", "field", [addr, caret]);
    const btn = h("div", "btn", [h("s"), MK.plain("b", null, s.button)]);
    const box = h("div", "mk-safe", [line, nm, field, btn]);
    c.el.append(h("div", "card", box));
    M.lines(c.tl, [line], T.line);
    if (nm) M.lines(c.tl, lines(nm), T.name);
    M.block(c.tl, field, T.addr0 - 0.22);
    M.pop(c.tl, btn, T.addr1 + 0.2);
    const face = btn.lastChild;
    c.tl.fromTo(face, { x: 0, y: 0 }, { x: 10, y: 10, duration: 0.08, ease: "none", immediateRender: false }, T.press);
    c.tl.fromTo(face, { x: 10, y: 10 }, { x: 0, y: 0, duration: 0.12, ease: "none", immediateRender: false }, T.press + 0.2);
    const n = s.address.length;
    drive(c, (t) => {
      const k = Math.round(clamp((t - T.addr0) / (T.addr1 - T.addr0)) * n);
      if (addr.textContent.length !== k) addr.textContent = s.address.slice(0, k);
      const typing = t >= T.addr0 && t < T.addr1;
      const on = t >= T.addr0 - 0.1 && (typing || Math.floor((t - T.addr0) / 0.3) % 2 === 0);
      caret.style.opacity = on ? "1" : "0";
    });
  });

  // ---------- the ground behind every scene ----------
  MK.ground = (id, total) => {
    const el = document.getElementById(id + "-in");
    const tl = gsap.timeline({ paused: true });
    if (LOOK === "warnet") {
      // Afternoon light through a window, as two stepped bands of flat colour that creep one
      // step a second.
      const stairs = (x0, y0, n, run, rise, thick) => {
        const top = [], bottom = [];
        for (let i = 0; i <= n; i++) {
          const x = x0 - i * run, y = y0 + i * rise;
          top.push(`${x}px ${y}px`, `${x - run}px ${y}px`);
          bottom.push(`${x}px ${y + thick}px`, `${x - run}px ${y + thick}px`);
        }
        return `polygon(${top.join(",")},${bottom.reverse().join(",")})`;
      };
      const outer = h("b", "outer"), inner = h("b", "inner");
      outer.style.clipPath = stairs(1440, -40, 8, 192, 240, 520);
      inner.style.clipPath = stairs(1440, 100, 8, 192, 240, 220);
      const beam = h("div", "beam", [outer, inner]);
      el.append(beam);
      tl.fromTo(beam, { x: 0, y: 0 }, { x: -3 * total, y: 4 * total, duration: total, ease: `steps(${Math.max(1, Math.round(total))})` }, 0);
    } else if (LOOK === "kertas") {
      // A rule at the head of the sheet; a small square walks along it as the video plays.
      const tick = h("i");
      el.append(h("div", "folio", tick), h("div", "foot"));
      tl.fromTo(tick, { x: 0 }, { x: 912 - 21, duration: total, ease: "none" }, 0);
    } else {
      // A poster's keyline, and a tab that fills as the video plays.
      const tab = h("div", "tab");
      el.append(h("div", "frame"), tab);
      tl.fromTo(tab, { scaleX: 0.14, transformOrigin: "0% 50%" }, { scaleX: 1, duration: total, ease: "none" }, 0);
    }
    for (const kid of el.children) kid.setAttribute("data-layout-ignore", "");
    window.__timelines[id] = tl;
  };
})();
