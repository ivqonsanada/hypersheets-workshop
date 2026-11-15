(() => {
  // LOCKED: scene 2 of compositions/page.html. The curtain lifts, the address types itself, the
  // real page loads, a marker lands on the name, the page scrolls to the list and the marker
  // follows, then the marker opens out to the window's corners as the scene fades into the list.
  // The learner's page is measured once, from an unseen copy laid out the same way, then every
  // frame is a pure function of time. Nothing that holds the page is scaled: HyperFrames reloads
  // a frame whose parent is scaled during its check.
  const tl = gsap.timeline({ paused: true });
  const S = 2.231884; // the page is laid out 414 px wide and shown 924 px wide
  const VP = 551; // its viewport height in page pixels (1228 px on screen)
  const GROUND = [23, 20, 18];
  const shot = document.getElementById("page-shot");
  // An unseen copy of the page at the size it is shown, outside every scene, so it is laid
  // out before this scene's turn (a scene is not laid out until it plays).
  let probe = document.getElementById("hs-probe");
  if (!probe) {
    probe = document.createElement("iframe");
    probe.id = "hs-probe";
    probe.title = "page probe";
    probe.tabIndex = -1;
    probe.setAttribute("aria-hidden", "true");
    probe.setAttribute("scrolling", "no");
    probe.setAttribute("data-layout-ignore", "");
    probe.style.cssText = "position:fixed;left:-3000px;top:0;width:414px;height:551px;border:0;visibility:hidden;pointer-events:none";
    probe.src = shot.src;
    document.body.appendChild(probe);
  }
  const addr = document.getElementById("page-addr");
  const caret = document.getElementById("page-caret");
  const corners = [0, 1, 2, 3].map((i) => document.getElementById("page-c" + i));
  const full = addr.textContent.trim();
  addr.textContent = "";

  const plan = { yA: 0, yB: 0, boxA: null, boxB: null };
  // Typing takes at most 0.9 s, so the marker has landed on the name by 2.2 s (5.8 s in the
  // video) for any address the slot allows.
  const T = { type0: 0.36, scr0: 3.4, scr1: 4.7, exit0: 6.84 };
  T.dt = Math.min(0.04, 0.9 / Math.max(1, full.length));
  T.type1 = T.type0 + Math.max(1, full.length) * T.dt;
  T.load0 = T.type1 + 0.1;
  T.load1 = T.load0 + 0.36;
  T.mark0 = T.load1 + 0.2;

  // ---------- colour ----------
  const rgb = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || "");
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length > 3 && p[3] < 0.6) return null;
    return p.slice(0, 3);
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function chroma(c) { return (Math.max(...c) - Math.min(...c)) / 255; }
  function hex(c) { return "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""); }
  // The page's own colour: the name's colour, else the band the name sits on, else the
  // first clearly coloured background, text or border on the page. Greys and colours too
  // close to the video's dark ground are skipped.
  function pageColour(doc, h1) {
    const win = doc.defaultView;
    function ok(c, min) { return c && chroma(c) >= min && contrast(c, GROUND) >= 1.5; }
    if (h1) {
      const c = rgb(win.getComputedStyle(h1).color);
      if (ok(c, 0.1)) return c;
      for (let el = h1.parentElement; el && el !== doc.documentElement; el = el.parentElement) {
        const b = rgb(win.getComputedStyle(el).backgroundColor);
        if (ok(b, 0.1)) return b;
      }
    }
    const all = doc.body ? doc.body.querySelectorAll("*") : [];
    for (let i = 0; i < all.length && i < 600; i++) {
      const st = win.getComputedStyle(all[i]);
      if (st.display === "none" || st.visibility === "hidden") continue;
      for (const c of [rgb(st.backgroundColor), rgb(st.color), parseFloat(st.borderBottomWidth) >= 1 ? rgb(st.borderBottomColor) : null]) {
        if (ok(c, 0.2)) return c;
      }
    }
    return null;
  }

  // ---------- the learner's page, in page pixels ----------
  function readPage(doc) {
    const win = doc.defaultView;
    const root = doc.documentElement;
    const h1 = doc.querySelector("h1") || doc.querySelector("h2");

    const bg = rgb(win.getComputedStyle(doc.body || root).backgroundColor) || rgb(win.getComputedStyle(root).backgroundColor) || [255, 255, 255];
    const accent = pageColour(doc, h1) || [228, 77, 38];
    const ink = contrast(accent, [244, 237, 228]) >= contrast(accent, GROUND) ? [244, 237, 228] : GROUND;
    const vars = document.documentElement.style;
    vars.setProperty("--hs-accent", hex(accent));
    vars.setProperty("--hs-ink", hex(ink));
    vars.setProperty("--hs-page-bg", hex(bg));

    const docH = Math.max(root.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
    const maxY = Math.max(0, Math.ceil(docH - VP));
    const lines = [];
    const range = doc.createRange();
    const walker = doc.createTreeWalker(doc.body || root, 4);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.height > 2) lines.push([r.top, r.bottom]);
    }
    if (!lines.length) return; // no layout: keep the page still, with no marker
    const textBox = (el, pad, padY = pad) => {
      range.selectNodeContents(el);
      let t = 1e9, b = -1e9, l = 1e9, r = -1e9;
      for (const q of range.getClientRects()) {
        if (q.width < 1) continue;
        t = Math.min(t, q.top); b = Math.max(b, q.bottom); l = Math.min(l, q.left); r = Math.max(r, q.right);
      }
      if (t > b) return null;
      return [Math.max(2, l - pad), t - padY, Math.min(412, r + pad), b + padY];
    };

    // The list: the first with three or more items (the slot has three lines), else two.
    const lists = Array.from(doc.querySelectorAll("ul, ol"));
    const list = lists.find((el) => el.querySelectorAll("li").length >= 3) || lists.find((el) => el.querySelectorAll("li").length >= 2) || null;
    let head = null;
    if (list) for (let el = list.previousElementSibling, i = 0; el && i < 3; el = el.previousElementSibling, i++) if (/^H[1-6]$/.test(el.tagName)) { head = el; break; }
    const h2s = doc.querySelectorAll("h2");
    const target = list || h2s[1] || h2s[0] || null;

    plan.boxA = h1 ? textBox(h1, 14, 2) : null; // tight above and below: the lines around a name sit close
    if (list) {
      plan.boxB = textBox(list, 10);
      if (plan.boxB) plan.boxB[0] = Math.max(2, list.getBoundingClientRect().left - 14); // clear of the numbers or bullets
    }

    // A cut through a line of text at a window edge looks broken: each resting point moves
    // a little until both edges fall between lines (failing that, the bottom edge).
    function clean(e) { return !lines.some((q) => q[0] < e - 1 && q[1] > e + 1); }
    const settle = (want, span) => {
      let best = null;
      for (let d = 0; d <= span; d++) {
        for (const y of d ? [want - d, want + d] : [want]) {
          if (y < 0 || y > maxY) continue;
          if (clean(y) && clean(y + VP)) return y;
          if (best === null && clean(y + VP)) best = y;
        }
      }
      return best === null ? Math.min(maxY, Math.max(0, want)) : best;
    };
    plan.yA = settle(0, 24);
    const want = target ? (head || target).getBoundingClientRect().top - 24 : VP * 0.6;
    plan.yB = Math.max(plan.yA, settle(Math.min(maxY, Math.max(0, Math.round(want))), 60));
  }

  // ---------- every frame ----------
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  const inOut = gsap.parseEase("power2.inOut");
  const out3 = gsap.parseEase("power3.out");
  const in3 = gsap.parseEase("power3.in");
  const OPEN = [[18, 18], [846, 18], [18, 1150], [846, 1150]]; // the view's corners, 18 px in
  function land(p) { return Math.round(out3(p) * 4) / 4; }
  function show(t) {
    const k = t < T.type0 ? 0 : Math.min(full.length, 1 + Math.floor((t - T.type0) / T.dt));
    if (addr.textContent.length !== k) addr.textContent = full.slice(0, k);
    const typing = t >= T.type0 && t < T.type1;
    const on = t >= 0.3 && t < T.load1 + 0.4 && (typing || Math.floor((t - 0.3) / 0.25) % 2 === 0);
    caret.style.opacity = on ? "1" : "0";

    const p = inOut(clamp((t - T.scr0) / (T.scr1 - T.scr0)));
    const y = plan.yA + (plan.yB - plan.yA) * p;
    const doc = shot.contentDocument;
    if (doc && doc.documentElement) doc.documentElement.style.transform = `translate(0px, ${(-y).toFixed(2)}px)`;

    const a = plan.boxA, b = plan.boxB;
    let box = null, l = 0;
    if (a && b) { box = a.map((v, i) => v + (b[i] - v) * p); l = land(clamp((t - T.mark0) / 0.24)); }
    else if (a) { box = a; l = land(clamp((t - T.mark0) / 0.24)); }
    else if (b) { box = b; l = land(clamp((t - T.scr1 - 0.05) / 0.24)); }
    if (!box) return;
    const off = (1 - l) * 48;
    const x0 = box[0] * S - 6 - off, x1 = box[2] * S - 54 + off;
    const y0 = (box[1] - y) * S - 6 - off, y1 = (box[3] - y) * S - 54 + off;
    const e = in3(clamp((t - T.exit0) / 0.42));
    const pos = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map((q, i) => [q[0] + (OPEN[i][0] - q[0]) * e, q[1] + (OPEN[i][1] - q[1]) * e]);
    corners.forEach((c, i) => {
      c.style.transform = `translate(${pos[i][0].toFixed(1)}px, ${pos[i][1].toFixed(1)}px)`;
      c.style.opacity = l > 0 ? "1" : "0";
    });
  }

  function build() {
    show(0);
    const drive = { t: 0 };
    function tick() { show(drive.t); }
    tl.fromTo(drive, { t: 0 }, { t: 7.4, duration: 7.4, ease: "none", onUpdate: tick }, 0);
    tl.fromTo("#page-wipe i", { scaleY: 1 }, { scaleY: 0, duration: 0.22, ease: "steps(4)", stagger: 0.0175 }, 0);
    tl.fromTo("#page-load", { clipPath: "inset(0px 0px 1228px 0px)" }, { clipPath: "inset(0px 0px 0px 0px)", duration: T.load1 - T.load0, ease: "steps(6)" }, T.load0);
    tl.fromTo("#page-in", { opacity: 1 }, { opacity: 0, duration: 0.18, ease: "power1.in" }, 7.18);
    window.__timelines["page"] = tl;
  }

  // ---------- loading ----------
  function loaded(frame) {
    return new Promise((done) => {
      if (!frame) return done(null);
      const d = frame.contentDocument;
      if (d && d.readyState === "complete" && /assets\/page/.test(d.URL)) return done(d);
      frame.addEventListener("load", () => done(frame.contentDocument), { once: true });
    });
  }
  // The page's own animations jump to their end, and its pictures load at once, so every
  // frame shows the same finished page.
  const freeze = (doc) => {
    try {
      const style = doc.createElement("style");
      style.textContent = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}";
      (doc.head || doc.documentElement).appendChild(style);
      doc.documentElement.style.transformOrigin = "0 0";
      for (const img of doc.images) img.loading = "eager";
    } catch (e) {}
    return doc;
  };
  const settled = (doc) => {
    try {
      return Promise.all([doc.fonts ? doc.fonts.ready : null, ...Array.from(doc.images).map((img) => (img.decode ? img.decode().catch(() => {}) : null))]).then(() => doc);
    } catch (e) {
      return doc;
    }
  };
  Promise.all([loaded(shot).then(freeze), loaded(probe).then((d) => (d ? settled(freeze(d)) : null))])
    .catch(() => [null, null])
    .then(([, doc]) => {
      try { if (doc) readPage(doc); } catch (e) { plan.boxA = plan.boxB = null; plan.yA = plan.yB = 0; }
      build();
    });
})();
