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
  // Like MK.fit, but the lines must also fit `tall` px at line height `lh`. Two settings are
  // passed over when one of the next four sizes sets the same words without them: a word of one
  // to three letters alone on a line ("Bu", "di"), and three or more lines of one word each
  // ("Kolom / yang ikut / lebar / layar"), which reads as a list, not a sentence.
  const fitTall = (text, role, sizes, room, most, lh, tall) => {
    const alone = (f) => f.lines.length > 2 && f.lines.some((l) => l.length <= 3);
    const stacked = (f) => f.lines.filter((l) => !/\s/.test(l)).length >= 3;
    let last = null, kept = null, tries = 0;
    for (const size of sizes) {
      last = MK.fit(text, role, [size], room, most);
      if (!(last.ok && last.lines.length * size * lh <= tall)) continue;
      if (!alone(last) && !stacked(last)) return last;
      kept = kept || last;
      if (++tries > 4) break;
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

  // ---------- prices: a menu or price list, each name led across to its price ----------
  MK.define("prices", (c) => {
    const s = c.s, n = s.rows.length;
    const hd = head(c, s.heading);
    const note = s.note ? MK.text("p", "note", flag(c, MK.fit(s.note, "body", [42, 38], c.W, 2), "the small line"), 1.3) : null;
    const tall = c.H - Number(hd.dataset.h) - 68 - (note ? Number(note.dataset.h) + 48 : 0);
    const role = K ? "display" : "body";
    // One size for every name and one for every price. Of the pairs at which each name takes at
    // most two lines beside the widest price and every row fits under the heading, the one that
    // wraps the fewest names wins.
    const pick = fewest([[66, 70], [60, 64], [56, 58], [52, 54], [48, 50], [44, 46], [40, 42], [36, 38]], 48, ([a, b]) => {
      const small = Math.round(b * 0.62);
      const wide = Math.max(...s.rows.map((r) => MK.width(r.price, "display", b) + (P ? 40 : 0) + (r.was ? MK.width(r.was, "body", small) + 24 : 0)));
      const room = c.W - wide - 20 - 70; // the price, the gap before it, and the shortest leader
      const names = s.rows.map((r) => MK.fit(r.name, role, [a], room, 2));
      const lh = Math.round(a * 1.22);
      const used = names.reduce((sum, f) => sum + f.lines.length * lh, 0);
      // Rows sit closer when there are many, and take the height that is left when there are few.
      const gap = Math.round(Math.max(a * 0.5, Math.min(a * 1.3, (tall - used) / Math.max(1, n - 1) - 4)));
      return { a, b, small, names, lh, gap, ok: room > 240 && names.every((f) => f.ok) && used + (n - 1) * a * 0.5 <= tall, lines: names.reduce((sum, f) => sum + f.lines.length, 0) };
    });
    if (!pick.ok) MK.problem(c, "the price list (shorten the longest name, or take a row out)");
    const lis = s.rows.map((r, i) => {
      const nm = MK.text("p", "nm", pick.names[i], 1.22);
      nm.style.lineHeight = pick.lh + "px";
      const lns = lines(nm), ld = h("i", "ld");
      lns[lns.length - 1].classList.add("last");
      lns[lns.length - 1].append(ld);
      const pr = MK.plain("b", "pr", r.price);
      pr.style.fontSize = pick.b + "px";
      pr.style.lineHeight = pick.lh + "px";
      let was = null;
      if (r.was) {
        was = h("span", "was", [MK.plain("span", null, r.was), h("s")]);
        was.style.fontSize = pick.small + "px";
        was.style.lineHeight = pick.lh + "px";
        was.setAttribute("data-layout-allow-occlusion", "");
      }
      return h("li", null, [nm, was, pr]);
    });
    const ol = h("ol", null, lis);
    ol.style.gap = pick.gap + "px";
    safe(c, [hd, ol, note]);
    M.lines(c.tl, lines(hd), c.T.head);
    lis.forEach((li, i) => {
      const t = c.T.rows[i];
      M.lines(c.tl, lines(li.querySelector(".nm")), t);
      M.grow(c.tl, li.querySelector(".ld"), t + 0.12, 0.4);
      M.pop(c.tl, li.querySelector(".pr"), t + 0.2);
      const was = li.querySelector(".was");
      if (was) {
        M.pop(c.tl, was, t + 0.12);
        M.grow(c.tl, was.querySelector("s"), t + 0.45, 0.3);
      }
    });
    if (note) M.lines(c.tl, lines(note), c.T.note);
  });

  // ---------- info: the facts of a date or a place, each under its own label ----------
  MK.define("info", (c) => {
    const s = c.s, n = s.rows.length;
    const hd = head(c, s.heading);
    const tall = c.H - Number(hd.dataset.h) - 68;
    const lab = P ? 44 : 40, gap = K ? 44 : 40; // the label's size; the room above and below a rule
    // Two facts can be set large and wrap; four are kept to a line each where they can be.
    const pick = fewest(n < 4 ? [88, 80, 72, 66, 60, 54, 50, 46] : [72, 66, 60, 54, 50, 46, 42], n < 3 ? 72 : n < 4 ? 64 : 56, (size) => {
      const fits = s.rows.map((r) => MK.fit(r.text, K || P ? "display" : "body", [size], c.W, 2));
      const lh = P ? 1.04 : 1.14;
      const total = fits.reduce((sum, f) => sum + (P ? 76 : 62) + f.lines.length * size * lh, 0) + (n - 1) * (gap * 2 + 6);
      return { fits, lh, ok: fits.every((f) => f.ok) && total <= tall, lines: fits.reduce((sum, f) => sum + f.lines.length, 0) };
    });
    const rows = s.rows.map((r, i) => {
      const lb = h("p", "lb", [h("i"), MK.plain("span", null, r.label)]);
      lb.style.fontSize = lab + "px";
      const tx = MK.text("p", "tx2", flag(c, pick.fits[i], "the line under \"" + r.label + "\""), pick.lh);
      const hr = i ? h("i", "hr") : null;
      if (hr) hr.style.marginBottom = gap + "px";
      return h("div", "row", [hr, lb, tx]);
    });
    const box = h("div", "rows", rows);
    box.style.gap = gap + "px";
    safe(c, [hd, box]);
    M.lines(c.tl, lines(hd), c.T.head);
    rows.forEach((row, i) => {
      const t = c.T.rows[i];
      if (row.querySelector(".hr")) M.grow(c.tl, row.querySelector(".hr"), t - 0.1, 0.45);
      M.pop(c.tl, row.querySelector(".lb"), t);
      M.lines(c.tl, lines(row.querySelector(".tx2")), t + 0.1);
    });
  });

  // ---------- qa: one to three questions, each answered under itself ----------
  MK.define("qa", (c) => {
    const s = c.s, n = s.pairs.length;
    const hd = s.heading ? head(c, s.heading) : null;
    const chip = K ? 84 : 88, room = c.W - chip - (K ? 26 : 34);
    const tall = c.H - (hd ? Number(hd.dataset.h) + 68 : 0);
    const role = K || P ? "display" : "body", qlh = P ? 1.04 : 1.16;
    // One size for every question and one for every answer: of the pairs at which everything
    // fits, the one that wraps the fewest lines. A single question is set larger.
    const pick = fewest(n < 2 ? [[92, 64], [84, 60], [76, 56], [68, 52], [60, 48], [54, 44], [48, 40]] : n < 3 ? [[76, 56], [68, 52], [62, 48], [56, 44], [50, 42], [46, 38]] : [[64, 50], [58, 46], [54, 44], [50, 42], [46, 38], [42, 36]], n < 2 ? 68 : n < 3 ? 56 : 50, ([a, b]) => {
      const qs = s.pairs.map((p) => MK.fit(p.q, role, [a], room, 3));
      const as = s.pairs.map((p) => MK.fit(p.a, "body", [b], room, 4));
      const total = qs.reduce((sum, f, i) => sum + Math.max(chip, f.lines.length * a * qlh) + 18 + as[i].lines.length * b * 1.28, 0) + (n - 1) * (K ? 92 : 84);
      return { a, b, qs, as, ok: qs.concat(as).every((f) => f.ok) && total <= tall, lines: qs.concat(as).reduce((sum, f) => sum + f.lines.length, 0) };
    });
    const rows = s.pairs.map((p, i) => {
      const qq = MK.text("p", "qq", flag(c, pick.qs[i], "question " + (i + 1)), qlh);
      const aa = MK.text("p", "aa", flag(c, pick.as[i], "the answer to question " + (i + 1)), 1.28);
      return h("div", "pair", [i ? h("i", "hr") : null, h("b", "chip", "?"), h("div", "bd3", [qq, aa])]);
    });
    safe(c, [hd, h("div", "pairs", rows)]);
    if (hd) M.lines(c.tl, lines(hd), c.T.head);
    rows.forEach((row, i) => {
      const t = c.T.pairs[i];
      if (row.querySelector(".hr")) M.grow(c.tl, row.querySelector(".hr"), t.q - 0.1, 0.45);
      M.pop(c.tl, row.querySelector(".chip"), t.q);
      M.lines(c.tl, lines(row.querySelector(".qq")), t.q + 0.08);
      M.lines(c.tl, lines(row.querySelector(".aa")), t.a);
    });
  });

  // ---------- when: one date, loud, on a calendar leaf ----------
  MK.define("when", (c) => {
    const s = c.s, T = c.T;
    const label = s.label ? h("p", "kick", [h("i"), MK.plain("span", null, s.label)]) : null;
    const end = s.end ? MK.text("p", "to", flag(c, MK.fit(s.end, "body", [54, 50, 46], c.W, 2), "the line under the leaf"), 1.26) : null;
    const notes = (s.lines || []).map((x, i) => MK.text("p", "nt", flag(c, MK.fit(x, "body", [58, 54, 50, 46], c.W, 2), "line " + (i + 1) + " under the date"), 1.24));
    const pad = P ? 44 : 48, inner = c.W - 2 * pad - 2 * (P ? 0 : K ? 3 : 6);
    const band = s.day ? h("div", "band", [h("b"), MK.plain("span", null, s.day)]) : null;
    const mo = MK.text("p", "mo", flag(c, MK.fit(s.month, "display", P ? [150, 132, 116, 100, 88, 76] : [120, 108, 96, 84, 72, 64], inner, 1), "the month"), 1.05);
    // The leaves the number rolls through: the three days before it, or after it early in a month.
    const day = parseInt(s.date, 10);
    const seq = T.roll ? [3, 2, 1, 0].map((k) => String(day > 3 ? day - k : day + k).padStart(s.date.length, "0")) : [s.date];
    seq[seq.length - 1] = s.date;
    // The number takes the height the other lines leave, and never more than the leaf is wide.
    const rest = (label ? 54 * 1.2 + 40 : 0) + (band ? 112 : 0) + Number(mo.dataset.h) + 2 * pad + 12 + (end ? Number(end.dataset.h) + 36 : 0) + (notes.length ? 44 + 46 + notes.reduce((sum, n) => sum + Number(n.dataset.h) + 14, 0) : 0);
    let size = 220;
    for (const sz of P ? [620, 560, 500, 440, 380, 320, 270, 220] : [520, 470, 420, 370, 320, 270, 220]) {
      size = sz;
      if (Math.max(...seq.map((x) => MK.width(x, "display", sz))) <= inner && rest + sz * 0.86 <= c.H) break;
    }
    const high = Math.round(size * 0.86);
    const strip = h("div", "strip", seq.map((x) => { const d = MK.plain("div", "dn", x); d.style.height = high + "px"; d.style.lineHeight = high + "px"; return d; }));
    const num = h("div", "num", strip);
    num.style.fontSize = size + "px";
    num.style.height = high + "px";
    num.setAttribute("data-layout-allow-overflow", "");
    const leaf = h("div", "leaf", [band, h("div", "in", [num, mo])]);
    const rule = notes.length ? h("i", "rule") : null;
    safe(c, [label, leaf, end, rule].concat(notes));
    if (label) M.pop(c.tl, label, T.top);
    M.block(c.tl, leaf, T.top + 0.05);
    if (band) {
      M.grow(c.tl, band.firstChild, T.top + 0.15, P ? 0.3 : 0.5);
      c.tl.fromTo(band.lastChild, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, T.top + 0.3);
    }
    if (T.roll) c.tl.fromTo(strip, { y: 0 }, { y: -high * (seq.length - 1), duration: T.num1 - T.num0, ease: P ? "power4.out" : K ? "power3.inOut" : "steps(" + (seq.length - 1) + ")" }, T.num0);
    else M.block(c.tl, num, T.num0);
    M.lines(c.tl, lines(mo), T.month);
    if (end) M.lines(c.tl, lines(end), T.end);
    if (rule) M.grow(c.tl, rule, T.rule, P ? 0.3 : 0.5);
    notes.forEach((n, i) => M.lines(c.tl, lines(n), T.lines[i]));
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

  // How a number reads part of the way through its count: `counter("Rp8.500.000")(0.5)` is
  // "Rp4.250.000". The marks that split thousands and decimals are read from the number itself.
  const counter = (value) => {
    const m = /^(.*?)(\d[\d.,]*\d|\d)(.*)$/.exec(value) || [null, "", "0", value];
    const [, pre, digits, post] = m;
    const lastSep = Math.max(digits.lastIndexOf("."), digits.lastIndexOf(","));
    const tail = lastSep < 0 ? 0 : digits.length - lastSep - 1;
    const decSep = lastSep >= 0 && tail !== 3 ? digits[lastSep] : "";
    const groupSep = digits.replace(decSep || "\u0000", "").match(/[.,]/) ? (decSep === "," ? "." : decSep === "." ? "," : digits[lastSep]) : "";
    const decimals = decSep ? tail : 0;
    const end = Number(digits.split(groupSep || "\u0000").join("").replace(",", "."));
    return (p) => {
      if (p >= 1) return value;
      const [int, frac] = (end * MK.m.count(p)).toFixed(decimals).split(".");
      const grouped = groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep) : int;
      return pre + grouped + (frac ? decSep + frac : "") + post;
    };
  };

  // ---------- numbers: two to four numbers, each counted up over its label ----------
  MK.define("numbers", (c) => {
    const s = c.s, n = s.items.length;
    const hd = head(c, s.heading);
    const tall = c.H - Number(hd.dataset.h) - 68;
    const gap = n > 3 ? 30 : 40;
    let pick = null;
    for (const v of n < 3 ? [240, 210, 190, 170, 150, 132, 116, 100] : n < 4 ? [190, 170, 150, 132, 116, 100, 88] : [150, 132, 116, 100, 88, 76]) {
      const l = v >= 170 ? 56 : v >= 132 ? 50 : 46;
      const wide = Math.max(...s.items.map((x) => MK.width(x.value, "display", v)));
      const labs = s.items.map((x) => MK.fit(x.label, "body", [l], c.W - (K || P ? 0 : 36), 2));
      const total = labs.reduce((sum, f) => sum + v * 0.98 + 14 + f.lines.length * l * 1.22, 0) + (n - 1) * (gap * 2 + 6);
      pick = { v, l, labs, ok: wide <= c.W && labs.every((f) => f.ok) && total <= tall };
      if (pick.ok) break;
    }
    if (!pick.ok) MK.problem(c, "the numbers (shorten the longest label, or take one out)");
    const rows = s.items.map((x, i) => {
      const num = MK.plain("div", "num", x.value);
      num.style.fontSize = pick.v + "px";
      if (/[gjpqy]/.test(x.value)) num.style.paddingBottom = "0.13em";
      const lab = MK.text("p", "lab", pick.labs[i], 1.22);
      const hr = i ? h("i", "hr") : null;
      if (hr) hr.style.marginBottom = gap + "px";
      const mark = h("i");
      mark.style.marginTop = Math.round((pick.l * 1.22 - 18) / 2) + "px";
      return h("div", "row", [hr, num, h("div", "lr", [mark, lab])]);
    });
    const box = h("div", "rows", rows);
    box.style.gap = gap + "px";
    safe(c, [hd, box]);
    M.lines(c.tl, lines(hd), c.T.head);
    const shows = s.items.map((x) => counter(x.value));
    rows.forEach((row, i) => {
      const t = c.T.items[i];
      if (row.querySelector(".hr")) M.grow(c.tl, row.querySelector(".hr"), t.count0 - 0.15, 0.45);
      M.block(c.tl, row.querySelector(".num"), t.count0 - 0.1);
      M.pop(c.tl, row.querySelector(".lr i"), t.count1 - 0.3);
      M.lines(c.tl, lines(row.querySelector(".lab")), t.count1 - 0.3);
    });
    drive(c, (t) => {
      rows.forEach((row, i) => {
        const at = c.T.items[i], num = row.querySelector(".num");
        const text = shows[i](clamp((t - at.count0) / (at.count1 - at.count0)));
        if (num.textContent !== text) num.textContent = text;
      });
    });
  });

  // ---------- stat: one number, counted up, and what it means ----------
  MK.define("stat", (c) => {
    const s = c.s, boxed = c.v === 1;
    const show = counter(s.value);
    const sizes = P ? [460, 400, 350, 300, 260, 220, 190, 160, 136] : [380, 340, 300, 260, 220, 190, 160, 132, 112];
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
      const text = show(p);
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
      // The old panel's label is struck through when it is a word. A sign ("=", "px") stays as it is: a line through it makes another sign.
      const strike = cls === "a" && /\p{L}{2}/u.test(side.label) ? h("s") : null;
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
    if (a.querySelector("s")) M.grow(c.tl, a.querySelector("s"), c.T.right + 0.05, 0.3);
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
  // The size for some code and how each line is laid at it. Every row must fit the card's width
  // `room` and all rows its height `tall`. A line too long for one row wraps under itself
  // (wrap.js). Of the sizes that fit, the one that wraps the fewest rows wins, then the largest;
  // wrapped code is set at 44 px at most, so a wrap never comes from setting the code too large.
  const codeFit = (all, room, tall) => {
    let best = null, last = null;
    for (const size of [60, 54, 50, 46, 42, 38, 36, 34, 32]) {
      const cols = Math.floor((room * 10) / MK.width("0000000000", "mono", size));
      const rows = all.map((line) => window.MKWrap(line, cols));
      const extra = rows.reduce((sum, r) => sum + r.length - 1, 0);
      const high = rows.reduce((sum, r) => sum + r.length * 1.3 + 0.3, 0) * size;
      last = { size, rows, extra, ok: high <= tall && rows.every((r) => r.length <= 3) && (!extra || size <= 44) };
      if (last.ok && (!best || extra < best.extra)) best = last;
    }
    return best || last;
  };
  // A card of numbered code. `fit.rows[from + i]` says how line i is laid; `marks` are the lines
  // that get a band (counted from 0). Returns the card, its lines, and `type(i, k)`, which shows
  // the first k characters of line i.
  const codeCard = (codeLines, fit, from, top, marks) => {
    const lis = codeLines.map((line, i) => {
      const code = h("code", null, fit.rows[from + i].map((r) => {
        const row = h("span", "row");
        if (r.pad) row.style.paddingLeft = r.pad + "ch";
        return row;
      }));
      const hl = marks.includes(i);
      return h("li", null, [hl ? h("u") : null, hl ? h("em") : null, h("b", null, String(i + 1)), code]);
    });
    const ol = h("ol", null, lis);
    ol.style.fontSize = fit.size + "px";
    const card = h("div", "card", [h("div", "top", top), ol]);
    const toks = codeLines.map(tokens), shown = codeLines.map(() => -1);
    const type = (i, k) => {
      if (shown[i] === k) return;
      shown[i] = k;
      const rows = lis[i].lastChild.children;
      fit.rows[from + i].forEach((r, n) => {
        rows[n].textContent = "";
        let at = 0;
        for (const [cls, text] of toks[i]) {
          const a = Math.max(at, r.from), b = Math.min(at + text.length, r.to, k);
          if (b > a) rows[n].append(cls ? MK.plain("span", cls, text.slice(a - at, b - at)) : text.slice(a - at, b - at));
          at += text.length;
        }
      });
    };
    return { card, lis, type };
  };
  const typing = (card, codeLines, at, t) => codeLines.forEach((line, i) => card.type(i, Math.round(clamp((t - at[i].t) / at[i].d) * line.length)));
  const mark = (c, li, at) => { M.grow(c.tl, li.querySelector("u"), at, 0.3); M.pop(c.tl, li.querySelector("em"), at); };
  const CODE_ROOM = 912 - 76 - 28 - 16; // the card's width less the line numbers and the right edge

  MK.define("code", (c) => {
    const s = c.s;
    const cap = MK.text("p", "cap" + (K || P ? " d" : ""), flag(c, MK.fit(s.caption, K || P ? "display" : "body", P ? [112, 100, 88, 76, 64] : K ? [84, 76, 68, 60, 52] : [72, 66, 60, 54, 48], c.W, 2), "the caption"), P ? 1.02 : 1.14);
    // A short snippet is set large enough to read on a phone; forty characters on a row still get 32 px.
    const fit = codeFit(s.lines, CODE_ROOM, c.H - Number(cap.dataset.h) - 52 - 78 - 72 - 16);
    if (!fit.ok) MK.problem(c, "the code (take lines out, or shorten the longest)");
    const card = codeCard(s.lines, fit, 0, [h("i"), h("i"), h("i"), s.lang ? MK.plain("span", null, s.lang) : null], s.highlight ? [s.highlight - 1] : []);
    safe(c, [cap, card.card]);
    M.lines(c.tl, lines(cap), c.T.cap);
    M.block(c.tl, card.card, c.T.cap + 0.1);
    drive(c, (t) => typing(card, s.lines, c.T.lines, t));
    if (s.highlight && c.T.hl != null) mark(c, card.lis[s.highlight - 1], c.T.hl);
  });

  // ---------- fix: the wrong code above, typed and then dimmed; the right code below ----------
  MK.define("fix", (c) => {
    const s = c.s, T = c.T, words = MK.words;
    c.el.classList.add("mk-code");
    const cap = MK.text("p", "cap" + (K || P ? " d" : ""), flag(c, MK.fit(s.caption, K || P ? "display" : "body", P ? [100, 88, 76, 64] : K ? [76, 68, 60, 52] : [66, 60, 54, 48], c.W, 2), "the caption"), P ? 1.02 : 1.14);
    // Both cards share one size, so the two pieces of code compare letter for letter.
    const fit = codeFit(s.wrong.concat(s.right), CODE_ROOM, c.H - Number(cap.dataset.h) - 44 - 2 * (70 + 56 + 16) - 84);
    if (!fit.ok) MK.problem(c, "the two pieces of code (take lines out, or shorten the longest)");
    const tag = (text, old) => {
      const lb = h("p", "lb", [text, old ? h("s") : null]);
      if (old) lb.setAttribute("data-layout-allow-occlusion", "");
      return lb;
    };
    const a = codeCard(s.wrong, fit, 0, [tag(words.wrong, true), s.lang ? MK.plain("span", null, s.lang) : null], T.marks.wrong);
    const b = codeCard(s.right, fit, s.wrong.length, [tag(words.right, false)], T.marks.right);
    a.card.classList.add("a");
    b.card.classList.add("b");
    const arrow = h("div", "arrow", h("i"));
    safe(c, [cap, a.card, arrow, b.card]);
    M.lines(c.tl, lines(cap), T.cap);
    M.block(c.tl, a.card, T.cap + 0.1);
    if (T.markW != null) T.marks.wrong.forEach((i) => mark(c, a.lis[i], T.markW));
    // The wrong code steps back as the right code arrives: it stays readable, but it is no longer the subject.
    c.tl.fromTo(a.card.querySelector("ol"), { opacity: 1 }, { opacity: 0.5, duration: 0.25, ease: "none", immediateRender: false }, T.dim);
    M.grow(c.tl, a.card.querySelector(".lb s"), T.dim, 0.3);
    M.pop(c.tl, arrow.firstChild, T.rIn - 0.1);
    M.block(c.tl, b.card, T.rIn);
    if (T.hl != null) T.marks.right.forEach((i) => mark(c, b.lis[i], T.hl));
    drive(c, (t) => { typing(a, s.wrong, T.wrong, t); typing(b, s.right, T.right, t); });
  });

  // A picture, a frame for it, and what sits around it. The frame takes what the heading and the
  // caption leave of the scene's height, in the picture's own shape: a wide picture gets a low
  // frame, a tall one a narrow frame, so a screenshot keeps its top and a product keeps its
  // sides. Only a picture more than about twice as tall as it is wide is still cut to fit.
  const picture = (src) => {
    const img = h("img");
    img.src = src;
    img.alt = "";
    img.setAttribute("data-layout-allow-overflow", "");
    return img;
  };
  const framed = (c, kids) => {
    const s = c.s;
    const fr = h("figure", "fr", kids);
    const cap = s.caption ? MK.text("p", "cap", flag(c, MK.fit(s.caption, K ? "display" : "body", [50, 46, 42], c.W, 2), "the caption"), 1.24) : null;
    const hd = s.title ? head(c, s.title) : null;
    const room = c.H - (hd ? Number(hd.dataset.h) + 68 : 0) - (cap ? 88 + Number(cap.dataset.h) : 0);
    let wide = c.W, tall = Math.min(hd ? 880 : 980, room);
    if (s.w && s.h) {
      tall = Math.min(room, Math.round((wide * s.h) / s.w));
      if (tall < (wide * s.h) / s.w - 1) wide = Math.max(Math.round(c.W * 0.56), Math.round((tall * s.w) / s.h));
    }
    fr.style.width = wide + "px";
    fr.style.height = tall + "px";
    safe(c, [hd, fr, cap]);
    return { fr, cap, hd, wide };
  };

  // ---------- image: one picture, held in a frame, with a slow push ----------
  MK.define("image", (c) => {
    const img = picture(c.s.src);
    const { fr, cap, hd } = framed(c, h("div", "ph", img));
    if (hd) M.lines(c.tl, lines(hd), c.T.open);
    M.block(c.tl, fr, c.T.open + (hd ? 0.12 : 0));
    c.tl.fromTo(img, { scale: 1.0 }, { scale: 1.08, duration: c.dur, ease: "none" }, 0);
    if (cap) M.lines(c.tl, lines(cap), c.T.cap);
  });

  // ---------- swap: a before and an after picture in one frame, the after wiping over the before ----------
  MK.define("swap", (c) => {
    const s = c.s, T = c.T, words = MK.words;
    c.el.classList.add("mk-image");
    const was = picture(s.src), now = picture(s.src2);
    const tagA = h("p", "tg a", s.beforeLabel || words.before), tagB = h("p", "tg b", s.afterLabel || words.after);
    const after = h("div", "ph b", [now, tagB]), bar = h("i", "bar");
    for (const el of [after, bar, tagA, tagB]) el.setAttribute("data-layout-allow-occlusion", "");
    const { fr, cap, hd, wide } = framed(c, [h("div", "ph a", [was, tagA]), after, bar]);
    if (hd) M.lines(c.tl, lines(hd), T.open);
    M.block(c.tl, fr, T.open + (hd ? 0.12 : 0));
    M.pop(c.tl, tagA, T.tag);
    // The after picture comes in from the right, stops at the middle so both halves can be
    // compared, then takes the whole frame. The line between them travels with its edge.
    const ease = P ? "power4.inOut" : K ? "power3.inOut" : MK.steps(12, "power2.inOut");
    const wipe = (from, to, at, d, first) => {
      c.tl.fromTo(after, { clipPath: `inset(0% 0% 0% ${from}%)` }, { clipPath: `inset(0% 0% 0% ${to}%)`, duration: d, ease, immediateRender: first }, at);
      c.tl.fromTo(bar, { x: (wide * from) / 100 }, { x: (wide * to) / 100 - (to ? 0 : 24), duration: d, ease, immediateRender: first }, at);
    };
    wipe(100, 50, T.half0, T.half1 - T.half0, true);
    wipe(50, 0, T.full0, T.full1 - T.full0, false);
    M.pop(c.tl, tagB, T.half1 - 0.1);
    // Both pictures push in together, so they stay in register along the line.
    c.tl.fromTo([was, now], { scale: 1.0 }, { scale: 1.06, duration: c.dur, ease: "none" }, 0);
    if (cap) M.lines(c.tl, lines(cap), T.cap);
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
