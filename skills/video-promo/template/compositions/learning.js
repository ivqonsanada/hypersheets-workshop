(() => {
  // LOCKED: scene 3 of compositions/learning.html. The list arrives out of the marker that
  // opened over the page, then one line at a time: its number steps in, its words sharpen one
  // by one, and each line then holds still. At the end the third number grows into the page's
  // colour, the last scene's ground.
  const tl = gsap.timeline({ paused: true });

  // Words become separate pieces so they can arrive one after another; spaces stay text,
  // so the lines wrap exactly as before.
  for (const i of [1, 2, 3]) {
    const p = document.getElementById("learning-t" + i);
    const words = p.textContent.trim().split(/(\s+)/);
    p.textContent = "";
    for (const w of words) {
      if (/^\s+$/.test(w)) p.appendChild(document.createTextNode(" "));
      else if (w) { const s = document.createElement("span"); s.className = "w"; s.textContent = w; p.appendChild(s); }
    }
  }

  const stepIn = (n) => (p) => Math.ceil(p * n) / n;
  tl.fromTo("#learning-in", { scale: 1.14, filter: "blur(10px)", opacity: 0 }, { scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.42, ease: "power3.out" }, 0);
  [0.55, 1.3, 2.05].forEach((at, i) => {
    const n = i + 1;
    tl.fromTo(`#learning-c${n}`, { scale: 0 }, { scale: 1, duration: 0.18, ease: stepIn(3) }, at);
    tl.fromTo(`#learning-t${n} .w`, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.16, ease: "power2.out", stagger: 0.06 }, at + 0.08);
  });
  // The flood sits exactly on the third number. From 5.1 s it grows (56 times covers the
  // frame from anywhere the number can be) and its colour becomes the last scene's ground.
  tl.fromTo("#learning-flood", { opacity: 0 }, { opacity: 1, duration: 0.01, ease: "none" }, 5.1);
  tl.fromTo("#learning-flood", { scale: 1 }, { scale: 56, duration: 0.44, ease: "power3.in" }, 5.12);
  window.__timelines["learning"] = tl;
})();
