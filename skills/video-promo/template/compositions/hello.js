(() => {
  // LOCKED: scene 1 of compositions/hello.html. The words are whole from frame 0 (the cover).
  // Within the first second a band in the page's own colour sweeps behind the name in pixel
  // steps; at the end a curtain of the same colour rises and hands over to the page.
  const tl = gsap.timeline({ paused: true });
  const name = document.getElementById("hello-name");
  const hl = document.getElementById("hello-hl");
  const ink = document.getElementById("hello-ink");
  const LH = 1.08; // the name's line height, as in the style above

  // The largest size (176 down to 104) at which no word is wider than the 864 px box and the
  // name takes at most two lines; failing that, at most three. Measured on a canvas, which
  // needs no layout.
  function fit() {
    const ctx = document.createElement("canvas").getContext("2d");
    const words = name.textContent.trim().split(/\s+/);
    const room = 864 * 0.98;
    for (const most of [2, 3]) {
      for (let fs = 176; fs >= 104; fs -= 8) {
        ctx.font = `700 ${fs}px Finlandica`;
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${-0.01 * fs}px`;
        const space = ctx.measureText(" ").width;
        let lines = 1, line = 0, fits = true;
        for (const w of words) {
          const ww = ctx.measureText(w).width;
          if (ww > room) { fits = false; break; }
          if (!line) line = ww;
          else if (line + space + ww <= room) line += space + ww;
          else { lines++; line = ww; }
        }
        if (fits && lines <= most) return fs;
      }
    }
    return 104;
  }

  // One band per line of the name, hugging that line's words, with a hard shadow.
  function bands(fs) {
    ink.textContent = name.textContent;
    ink.style.fontSize = fs + "px";
    const box = name.getBoundingClientRect();
    const k = box.width / name.offsetWidth || 1;
    const lh = fs * LH;
    const range = document.createRange();
    range.selectNodeContents(name);
    const rows = [];
    for (const r of range.getClientRects()) {
      if (r.width < 1) continue;
      const i = Math.max(0, Math.floor(((r.top + r.bottom) / 2 - box.top) / k / lh));
      const left = (r.left - box.left) / k;
      const right = (r.right - box.left) / k;
      rows[i] = rows[i] ? [Math.min(rows[i][0], left), Math.max(rows[i][1], right)] : [left, right];
    }
    const pad = Math.round(fs * 0.12);
    const last = rows.length - 1;
    const parts = [];
    rows.forEach((row, i) => {
      if (!row) return;
      const x = Math.round(row[0] - pad);
      const w = Math.round(row[1] - row[0] + 2 * pad);
      const y = Math.round(i * lh - (i === 0 ? fs * 0.02 : 0));
      const h = Math.round((i + 1) * lh + (i === last ? fs * 0.06 : 0)) - y;
      parts.push({ x, y, w, h });
    });
    const shadow = parts.map((p) => `<s style="left:${p.x + 12}px;top:${p.y + 12}px;width:${p.w}px;height:${p.h}px"></s>`).join("");
    const band = parts.map((p) => `<b style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px"></b>`).join("");
    hl.insertAdjacentHTML("afterbegin", shadow + band);
  }

  // power3.out, landing in whole steps: arrives fast, settles in pixel stops.
  const stepOut = (n) => {
    const e = gsap.parseEase("power3.out");
    return (p) => Math.round(e(p) * n) / n;
  };

  function build() {
    const fs = fit();
    name.style.fontSize = fs + "px";
    try {
      if (name.offsetWidth) bands(fs);
      else hl.style.display = "none"; // not laid out yet: no band, the name still fits
    } catch (e) {
      hl.style.display = "none";
    }
    tl.fromTo(hl, { clipPath: "inset(-60px 1200px -60px -60px)" }, { clipPath: "inset(-60px -60px -60px -60px)", duration: 0.6, ease: stepOut(10) }, 0.2);
    // Once the band has landed, the cream name under it is covered by the band and by the copy
    // in the colour that reads on it; it takes that colour too, so it reads on the band as well.
    if (hl.style.display !== "none") tl.fromTo(name, { attr: { "data-inked": "0" } }, { attr: { "data-inked": "1" }, duration: 0.01, ease: "none" }, 0.82);
    tl.fromTo("#hello-wipe i", { scaleY: 0 }, { scaleY: 1, duration: 0.22, ease: "steps(4)", stagger: 0.0175 }, 3.22);
    window.__timelines["hello"] = tl;
  }

  const ready = document.fonts && document.fonts.load ? document.fonts.load('700 100px "Finlandica"', name.textContent) : Promise.resolve();
  ready.catch(() => {}).then(build);
})();
