(() => {
  // LOCKED: the ground of compositions/backdrop.html.
  // A staircase band from the top right down to the bottom left: `steps` stairs of
  // `run` px across and `rise` px down, `thick` px tall. Coordinates are in the beam box,
  // which starts 120 px above and left of the frame.
  const stairs = (x0, y0, steps, run, rise, thick) => {
    const top = [];
    const bottom = [];
    for (let i = 0; i <= steps; i++) {
      const x = x0 - i * run;
      const y = y0 + i * rise;
      top.push(`${x}px ${y}px`, `${x - run}px ${y}px`);
      bottom.push(`${x}px ${y + thick}px`, `${x - run}px ${y + thick}px`);
    }
    return `polygon(${top.join(",")},${bottom.reverse().join(",")})`;
  };
  document.getElementById("bd-outer").style.clipPath = stairs(1440, -40, 8, 192, 240, 520);
  document.getElementById("bd-inner").style.clipPath = stairs(1440, 100, 8, 192, 240, 220);
  const tl = gsap.timeline({ paused: true });
  tl.fromTo("#bd-beam", { x: 0, y: 0 }, { x: -60, y: 80, duration: 20, ease: "steps(20)" }, 0);
  window.__timelines["backdrop"] = tl;
})();
