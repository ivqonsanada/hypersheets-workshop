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
  // Like MK.fit, but the lines must also fit `tall` px at line height `lh`. A size that leaves
  // a word of one to three letters alone on a line ("Bu", "di") is passed over when one of
  // the next three sizes sets the same words without it.
  const fitTall = (text, role, sizes, room, most, lh, tall) => {
    const alone = (f) => f.lines.length > 2 && f.lines.some((l) => l.length <= 3);
    let last = null, kept = null, tries = 0;
    for (const size of sizes) {
      last = MK.fit(text, role, [size], room, most);
      if (!(last.ok && last.lines.length * size * lh <= tall)) continue;
      if (!alone(last)) return last;
      kept = kept || last;
      if (++tries > 3) break;
    }
    return kept || last;
  };
  // Of the sizes at which everything fits, the largest wins, unless a smaller one at or above
  // `floor` wraps fewer lines: "Tanggal 12 Desember 2026" on one line at 58 px reads better
  // than on two at 68. `at(size)` returns { ok, lines, … } for one size.
  const fewest = (sizes, floor, at) => {
    let best = null, last = null;
    for (const size of sizes) {
      if (best && sizeOf(size) < floor) break;
      last = at(size);
      if (last.ok && (!best || last.lines < best.lines)) best = last;
    }
    return best || last;
  };
  const sizeOf = (size) => (Array.isArray(size) ? size[0] : size);
  const head = (c, text) => MK.text("h2", "head", flag(c, MK.fit(text, "display", P ? [128, 112, 100, 88, 76] : [96, 88, 80, 72, 64], c.W, 2), "the heading"), P ? 1.02 : 1.1);

  // ---------- title: the opening statement, whole from the first frame ----------
  MK.define("title", (c) => {
    const s = c.s;
    const sizes = P ? [320, 288, 256, 228, 204, 180, 156, 136, 116, 100] : K ? [216, 196, 180, 164, 148, 132, 118, 106, 94, 84] : [208, 192, 176, 160, 144, 128, 112, 96, 84];
    const band = c.v === 0;
    const sub = s.sub ? MK.text("p", "sub", flag(c, MK.fit(s.sub, "body", [54, 50, 46], c.W, 3), "the line under the headline"), 1.28) : null;
    // The headline takes what the lines above and below it leave of the frame's height.
    const tall = c.H - (s.kicker ? (K ? 150 : P ? 128 : 105) : 0) - (sub ? Number(sub.dataset.h) + 56 : 0) - (band ? 0 : 60);
    const hd = MK.text("h1", "hd", flag(c, fitTall(s.headline, "display", sizes, c.W - (P ? 56 : 28), 4, P ? 1.06 : 1.08, tall), "the headline"), P ? 1.0 : 1.08);
    const kids = [];
    if (s.kicker) kids.push(h("p", "kick", [h("i"), h("span", null, s.kicker)]));
    kids.push(hd);
    const rule = band ? null : h("i", "rule");
    if (rule) kids.push(rule);
    if (sub) kids.push(sub);
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
      const took = P ? 0.3 : K ? 0.7 : 0.6; // how long the look's sweep takes
      bands.forEach((bd, i) => {
        const at = c.T.band + i * 0.12;
        M.sweep(c.tl, bd, at);
        // Once the band covers a line, the words under it go, so no descender shows below the band.
        c.tl.fromTo(bd.parentNode.firstChild, { opacity: 1 }, { opacity: 0, duration: 0.01, ease: "none", immediateRender: false }, at + took);
      });
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
    const rows = fewest([68, 62, 58, 54, 50, 46, 42], 54, (size) => {
      const fits = s.items.map((t) => MK.fit(t, "body", [size], room, 2));
      const total = fits.reduce((a, f) => a + Math.max(96, f.lines.length * size * 1.22) + (K ? 88 : 56), 0);
      return { fits, ok: fits.every((f) => f.ok) && total <= avail, lines: fits.reduce((a, f) => a + f.lines.length, 0) };
    }).fits;
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
    // One size for every step's title and one for every detail: the largest pair at which
    // each text takes at most two lines and the whole rail fits under the heading.
    const tall = c.H - Number(hd.dataset.h) - 68;
    const pick = fewest(n < 4 ? [[66, 46], [60, 42], [54, 40], [50, 38], [46, 36]] : [[56, 40], [52, 38], [48, 36], [44, 34]], 50, ([a, b]) => {
      const tts = s.steps.map((st) => MK.fit(st.title, "body", [a], room, 2));
      const dts = s.steps.map((st) => (st.detail ? MK.fit(st.detail, "body", [b], room, 2) : null));
      const total = tts.reduce((sum, f, i) => sum + Math.max(88, 6 + f.lines.length * a * 1.16 + (dts[i] ? 14 + dts[i].lines.length * b * 1.26 : 0)), 0) + (n - 1) * 64;
      return { tts, dts, ok: tts.every((f) => f.ok) && dts.every((f) => !f || f.ok) && total <= tall, lines: tts.concat(dts).reduce((sum, f) => sum + (f ? f.lines.length : 0), 0) };
    });
    const sts = s.steps.map((st, i) => {
      const tt = MK.text("p", "tt", flag(c, pick.tts[i], "step " + (i + 1)), 1.16);
      const dt = pick.dts[i] ? MK.text("p", "dt", flag(c, pick.dts[i], "the detail of step " + (i + 1)), 1.26) : null;
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
    // A value with letters that hang below the line ("3 days", "Rp") gets room for them.
    if (/[gjpqy]/.test(s.value)) num.style.paddingBottom = "0.13em";
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
    // Both panels' texts are set at one size, so they compare.
    let fits = null;
    for (const size of [58, 54, 50, 46, 42]) {
      fits = [s.left, s.right].map((side) => MK.fit(side.text, K ? "display" : "body", [size], room, 3));
      if (fits.every((f) => f.ok)) break;
    }
    const pane = (side, cls, fitted) => {
      const strike = cls === "a" ? h("s") : null;
      const lb = h("p", "lb", [h("span", null, side.label), strike]);
      if (strike) lb.setAttribute("data-layout-allow-occlusion", "");
      const pt = MK.text("p", "pt", flag(c, fitted, `the ${cls === "a" ? "first" : "second"} panel's text`), 1.22);
      return h("div", "pn " + cls, [lb, pt]);
    };
    const hd = s.heading ? head(c, s.heading) : null;
    const a = pane(s.left, "a", fits[0]), b = pane(s.right, "b", fits[1]), arrow = h("div", "arrow", h("i"));
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
    // The largest size at which the widest line, indentation included, fits the card.
    const room = c.W - 76 - 28 - 16;
    let size = 32, fitsCard = false;
    for (const sz of [46, 42, 38, 36, 34, 32]) {
      size = sz;
      if (Math.max(...s.lines.map((line) => MK.width(line, "mono", sz))) <= room) { fitsCard = true; break; }
    }
    if (!fitsCard) MK.problem(c, "the longest line of code");
    const lis = s.lines.map((line, i) => {
      const hl = s.highlight === i + 1;
      return h("li", null, [hl ? h("u") : null, hl ? h("em") : null, h("b", null, String(i + 1)), h("code")]);
    });
    const ol = h("ol", null, lis);
    ol.style.fontSize = size + "px";
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
    // The picture takes what the heading and the caption leave of the frame's height.
    fr.style.height = Math.min(hd ? 880 : 980, c.H - (hd ? Number(hd.dataset.h) + 68 : 0) - 88 - Number(cap.dataset.h)) + "px";
    safe(c, [hd, fr, cap]);
    if (hd) M.lines(c.tl, lines(hd), c.T.open);
    M.block(c.tl, fr, c.T.open + (hd ? 0.12 : 0));
    c.tl.fromTo(img, { scale: 1.0 }, { scale: 1.08, duration: c.dur, ease: "none" }, 0);
    M.lines(c.tl, lines(cap), c.T.cap);
  });

  // ---------- end: where to go, typed out, and one press of the button ----------
  MK.define("end", (c) => {
    const s = c.s, T = c.T;
    // With a name, the line sits small above it. Without one, the line itself is the large text.
    const line = s.name ? MK.plain("p", "line", s.line) : null;
    const nm = MK.text("h2", "nm", flag(c, MK.fit(s.name || s.line, "display", P ? [210, 184, 160, 136, 116, 96] : [150, 132, 116, 100, 88, 76], c.W, s.name ? 2 : 3), s.name ? "the name" : "the end card's line"), P ? 1.0 : 1.08);
    const addr = h("span", "addr"), caret = h("b", "caret");
    const field = h("div", "field", [addr, caret]);
    const btn = h("div", "btn", [h("s"), MK.plain("b", null, s.button)]);
    const box = h("div", "mk-safe", [line, nm, field, btn]);
    c.el.append(h("div", "card", box));
    if (line) M.lines(c.tl, [line], T.line);
    M.lines(c.tl, lines(nm), line ? T.name : T.line);
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
