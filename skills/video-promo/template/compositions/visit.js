(() => {
  // LOCKED: scene 4 of compositions/visit.html. The card lands on the page's colour, the
  // address caret blinks three times, the button is pressed once, and the last two seconds
  // hold still.
  const tl = gsap.timeline({ paused: true });
  const name = document.getElementById("visit-name");
  const url = document.getElementById("visit-url");

  // The name as large as it fits in two lines (144 down to 96), the address on one line.
  // Measured on a canvas, which needs no layout (this scene is not shown until its turn).
  function fit() {
    const ctx = document.createElement("canvas").getContext("2d");
    const words = name.textContent.trim().split(/\s+/);
    const room = 864 * 0.97;
    let size = 96;
    for (let fs = 144; fs >= 96; fs -= 8) {
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
      if (fits && lines <= 2) { size = fs; break; }
    }
    name.style.fontSize = size + "px";
    const n = Math.max(1, url.textContent.trim().length);
    url.style.fontSize = Math.max(36, Math.min(52, Math.floor((864 - 12 - 56 - 60) / (0.6 * n)))) + "px"; // border, padding, caret and some air
  }

  function build() {
    tl.fromTo(["#visit-line", "#visit-name", "#visit-bar", "#visit-box"], { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "power2.out", stagger: 0.08 }, 0.08);
    tl.fromTo("#visit-caret", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "steps(1)", repeat: 5, yoyo: true }, 0.6);
    tl.fromTo("#visit-btn", { y: 0 }, { y: 10, duration: 0.12, ease: "power1.in" }, 1.25);
    tl.to("#visit-btn", { y: 0, duration: 0.2, ease: "power1.out" }, 1.41);
    window.__timelines["visit"] = tl;
  }

  const ready = document.fonts && document.fonts.load ? document.fonts.load('700 100px "Finlandica"', name.textContent) : Promise.resolve();
  ready.catch(() => {}).then(() => {
    try { fit(); } catch (e) {}
    build();
  });
})();
