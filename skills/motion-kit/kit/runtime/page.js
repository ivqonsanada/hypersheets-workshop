// The page scene. LOCKED: nothing in this folder is edited to make a video.
// The real page sits in a window: the address types itself, the page loads, a marker lands on
// its name, the page scrolls to its first list and the marker follows. The page is measured
// once, from an unseen copy laid out the same way, then every frame is a pure function of
// time. Nothing that holds the page is scaled: HyperFrames reloads a frame whose parent is
// scaled during its check.
(() => {
  const MK = window.MK, h = MK.h, M = MK.m;
  const S = 2.231884; // the page is laid out 414 px wide and shown 924 px wide
  const VP = 551; // its viewport height in page pixels
  const corner = () => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 60 60");
    for (const [d, cls] of [["M0 0h60v24H24v36H0z", "o"], ["M6 6h48v12H18v36H6z", "f"]]) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", cls);
      svg.append(p);
    }
    return svg;
  };

  MK.define("page", (c) => {
    const s = c.s, T = Object.assign({}, c.T, { exit0: c.dur - 0.56 });
    const full = s.address;
    const title = MK.text("h2", "head", MK.fit(s.title, "display", MK.look === "panggung" ? [96, 84, 72] : [68, 60, 54], c.W, 1), 1.1);
    const addr = h("span", "addr"), caret = h("b", "caret");
    const shot = h("iframe", "shot");
    shot.setAttribute("scrolling", "no");
    shot.setAttribute("title", "page");
    shot.setAttribute("data-layout-allow-overflow", "");
    shot.src = s.src;
    const corners = ["tl", "tr", "bl", "br"].map((k) => h("div", "c " + k, corner()));
    const mark = h("div", "mark", corners);
    mark.setAttribute("aria-hidden", "true");
    const load = h("div", "load", shot);
    const win = h("div", "win", [h("div", "bar", [h("i"), h("i"), h("i"), addr, caret]), h("div", "view", [load, mark])]);
    c.el.classList.add("mk-page-s");
    c.el.append(title, win);
    M.lines(c.tl, Array.from(title.querySelectorAll(".ln")), 0.06);

    // An unseen copy of the page at the size it is shown, outside every scene, so it is laid
    // out before this scene's turn (a scene is not laid out until it plays).
    const probe = h("iframe");
    probe.title = "page probe";
    probe.tabIndex = -1;
    probe.setAttribute("aria-hidden", "true");
    probe.setAttribute("scrolling", "no");
    probe.setAttribute("data-layout-ignore", "");
    probe.style.cssText = "position:fixed;left:-3000px;top:0;width:414px;height:551px;border:0;visibility:hidden;pointer-events:none";
    probe.src = s.src;
    document.body.appendChild(probe);

    const plan = { yA: 0, yB: 0, boxA: null, boxB: null };
    const col = MK.color;
    const rgb = (v) => {
      const m = /rgba?\(([^)]+)\)/.exec(v || "");
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (p.length > 3 && p[3] < 0.6) return null;
      return p.slice(0, 3);
    };
    const chroma = (v) => (Math.max(...v) - Math.min(...v)) / 255;
    // The page's own colour: the name's colour, else the band the name sits on, else the first
    // clearly coloured background, text or border on the page. Greys are skipped.
    function pageColour(doc, h1) {
      const win = doc.defaultView;
      const ok = (v, min) => v && chroma(v) >= min;
      if (h1) {
        const v = rgb(win.getComputedStyle(h1).color);
        if (ok(v, 0.1)) return v;
        for (let el = h1.parentElement; el && el !== doc.documentElement; el = el.parentElement) {
          const b = rgb(win.getComputedStyle(el).backgroundColor);
          if (ok(b, 0.1)) return b;
        }
      }
      const all = doc.body ? doc.body.querySelectorAll("*") : [];
      for (let i = 0; i < all.length && i < 600; i++) {
        const st = win.getComputedStyle(all[i]);
        if (st.display === "none" || st.visibility === "hidden") continue;
        for (const v of [rgb(st.backgroundColor), rgb(st.color), parseFloat(st.borderBottomWidth) >= 1 ? rgb(st.borderBottomColor) : null]) if (ok(v, 0.2)) return v;
      }
      return null;
    }

    function readPage(doc) {
      const win = doc.defaultView, root = doc.documentElement;
      const h1 = doc.querySelector("h1") || doc.querySelector("h2");
      const bg = rgb(win.getComputedStyle(doc.body || root).backgroundColor) || rgb(win.getComputedStyle(root).backgroundColor) || [255, 255, 255];
      document.documentElement.style.setProperty("--mk-page-bg", col.hex(bg));
      if ((window.MK_CONFIG || {}).accent === "page") { const a = pageColour(doc, h1); if (a) MK.setAccent(a); }

      const docH = Math.max(root.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
      const maxY = Math.max(0, Math.ceil(docH - VP));
      const rows = [];
      const range = doc.createRange();
      const walker = doc.createTreeWalker(doc.body || root, 4);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (r.height > 2) rows.push([r.top, r.bottom]);
      }
      if (!rows.length) return; // no layout: keep the page still, with no marker
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
      // The list: the first with three or more items, else two.
      const lists = Array.from(doc.querySelectorAll("ul, ol"));
      const list = lists.find((el) => el.querySelectorAll("li").length >= 3) || lists.find((el) => el.querySelectorAll("li").length >= 2) || null;
      let head = null;
      if (list) for (let el = list.previousElementSibling, i = 0; el && i < 3; el = el.previousElementSibling, i++) if (/^H[1-6]$/.test(el.tagName)) { head = el; break; }
      const h2s = doc.querySelectorAll("h2");
      const target = list || h2s[1] || h2s[0] || null;
      plan.boxA = h1 ? textBox(h1, 14, 2) : null;
      if (list) {
        plan.boxB = textBox(list, 10);
        if (plan.boxB) plan.boxB[0] = Math.max(2, list.getBoundingClientRect().left - 14);
      }
      // A cut through a line of text at a window edge looks broken. The lines become bands
      // (lines on one row merge). An edge may sit up to 1 px into the top of a band, which is
      // empty above the letters, and must stay half a pixel below its bottom, where the
      // descenders end. A stop is the point nearest to where it wants to be that keeps both
      // edges clear of the bands (failing that, the bottom edge).
      rows.sort((p, q) => p[0] - q[0]);
      const bands = [];
      for (const q of rows) {
        const last = bands[bands.length - 1];
        if (last && q[0] < last[1]) last[1] = Math.max(last[1], q[1]);
        else bands.push([q[0], q[1]]);
      }
      function settle(want, lo, hi) {
        lo = Math.max(0, lo);
        hi = Math.min(maxY, Math.max(lo, hi));
        lo = Math.min(lo, hi);
        want = Math.min(hi, Math.max(lo, want));
        let best = null, at = lo, fromBand = false;
        function take(t, toBand) {
          const a = at + (fromBand ? 1.5 : 0), z = t - (toBand ? 1.5 : 0);
          const y = a <= z ? Math.min(z, Math.max(a, want)) : (at + t) / 2;
          if (best === null || Math.abs(y - want) < Math.abs(best - want)) best = y;
        }
        for (const edges of [[0, VP], [VP]]) {
          best = null; at = lo; fromBand = false;
          const cuts = [];
          for (const b of bands) for (const off of edges) cuts.push([b[0] + 1 - off, b[1] + 0.5 - off]);
          cuts.sort((m, n) => m[0] - n[0]);
          for (const cu of cuts) {
            if (cu[1] <= at) continue;
            if (cu[0] >= hi) break;
            if (cu[0] >= at) take(cu[0], true);
            at = cu[1];
            fromBand = true;
          }
          if (at <= hi) take(hi, false);
          if (best !== null) return best;
        }
        return want;
      }
      const a = plan.boxA;
      plan.yA = settle(0, a ? a[3] + 6 - VP : 0, a ? Math.min(48, a[1] - 6) : 48);
      const headTop = target ? (head || target).getBoundingClientRect().top : null;
      const want = Math.min(maxY, Math.max(0, headTop !== null ? Math.round(headTop - 24) : VP * 0.6));
      plan.yB = Math.max(plan.yA, settle(want, Math.max(plan.yA, want - 60), headTop !== null ? Math.min(want + 60, headTop - 4) : want + 60));
    }

    const clamp = (v) => Math.max(0, Math.min(1, v));
    const inOut = gsap.parseEase("power2.inOut"), out3 = gsap.parseEase("power3.out"), in3 = gsap.parseEase("power3.in");
    const OPEN = [[18, 18], [846, 18], [18, 1150], [846, 1150]];
    const land = (p) => Math.round(out3(p) * 4) / 4;
    function show(t) {
      const k = t < T.type0 ? 0 : Math.min(full.length, 1 + Math.floor((t - T.type0) / T.dt));
      if (addr.textContent.length !== k) addr.textContent = full.slice(0, k);
      const typing = t >= T.type0 && t < T.type1;
      const on = t < T.load1 + 0.4 && (typing || Math.floor(t / 0.25) % 2 === 0);
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
      corners.forEach((el, i) => {
        el.style.transform = `translate(${pos[i][0].toFixed(1)}px, ${pos[i][1].toFixed(1)}px)`;
        el.style.opacity = l > 0 ? "1" : "0";
      });
    }

    function build() {
      show(0);
      const d = { t: 0 };
      c.tl.fromTo(d, { t: 0 }, { t: c.dur, duration: c.dur, ease: "none", onUpdate: () => show(d.t) }, 0);
      c.tl.fromTo(load, { clipPath: "inset(0px 0px 1228px 0px)" }, { clipPath: "inset(0px 0px 0px 0px)", duration: T.load1 - T.load0, ease: "steps(6)" }, T.load0);
    }

    const loaded = (frame) => new Promise((done) => {
      const d = frame.contentDocument;
      if (d && d.readyState === "complete" && /assets\/page/.test(d.URL)) return done(d);
      frame.addEventListener("load", () => done(frame.contentDocument), { once: true });
    });
    // The page's own animations jump to their end, so every frame shows the same finished page.
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
      try { return Promise.all([doc.fonts ? doc.fonts.ready : null, ...Array.from(doc.images).map((img) => (img.decode ? img.decode().catch(() => {}) : null))]).then(() => doc); } catch (e) { return doc; }
    };
    // The scene's timeline is registered by mount as soon as this returns, so the moves that
    // need the measured page are added to it when the page is ready; until then it holds still.
    c.wait = Promise.all([loaded(shot).then(freeze), loaded(probe).then((d) => (d ? settled(freeze(d)) : null))])
      .catch(() => [null, null])
      .then(([, doc]) => {
        try { if (doc) readPage(doc); } catch (e) { plan.boxA = plan.boxB = null; plan.yA = plan.yB = 0; }
        build();
      });
  });
})();
