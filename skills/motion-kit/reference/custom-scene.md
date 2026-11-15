# Open mode: a scene of your own

**Not for Claude Haiku.** Kit mode (SKILL.md) never needs this file. A stronger model reads it only when the user asks for something no kit scene shows, and then writes at most two scenes of its own. Everything else stays the same: the storyboard, the builder's checks, the contact sheet, the render.

A custom scene is a folder next to `storyboard.json`:

```
custom/<name>/scene.json   what the builder needs to know
custom/<name>/scene.js     the scene
custom/<name>/scene.css    optional styles
```

`<name>` is lower-case letters, digits and hyphens. The storyboard uses it as `{ "type": "custom/<name>", … }`.

## scene.json

```json
{
  "fields": { "heading": { "max": 30, "req": true }, "note": { "max": 60 } },
  "seconds": 5,
  "still": 3.4,
  "expect": "the heading is whole at the top and three bars have grown to their marks",
  "cues": [{ "t": 0.4, "type": "land", "weight": 2 }]
}
```

- `fields`: the scene's text fields. Each is checked like a kit text (length, no dash as punctuation, no emoji, no placeholder). Limits of 160 or less.
- `seconds`: how long the scene's content needs, 2 to 9. The kit adds the cover's time.
- `still`: the moment, inside those seconds, at which everything has landed. The contact sheet shows it.
- `expect`: one sentence saying what that still shows, concrete enough to check a picture against.
- `cues` (optional): what can be heard, for the sound layer: `t` in seconds from the scene's content start, `type` one of `land`, `whoosh`, `type`, `press`, `count`, `marker`, `weight` 1 to 3, `until` for a span.

## scene.js

```js
MK.define("custom/<name>", (c) => {
  const h = MK.h, M = MK.m;
  const head = MK.text("h2", "head", MK.fit(c.s.heading, "display", [96, 84, 72], c.W, 2), 1.1);
  c.el.append(h("div", "mk-safe", [head]));
  M.lines(c.tl, Array.from(head.querySelectorAll(".ln")), c.T.a);
});
```

What `c` holds:

| | |
|---|---|
| `c.s` | the scene's fields from the storyboard |
| `c.el` | the scene's element (1080 x 1920). It carries the class `mk-custom-<name>` |
| `c.tl` | the scene's paused GSAP timeline, in the scene's own seconds |
| `c.T.a` | when the content may start (0 in a first scene, 0.34 after a cover) |
| `c.dur` | the scene's whole length |
| `c.W`, `c.H` | the safe box inside `.mk-safe`: 912 x 1300. It ends 410 px above the bottom edge, where the apps put their own captions and buttons |
| `c.first`, `c.last` | whether it opens or closes the video |

What the kit gives you:

- `MK.h(tag, className, children)` makes an element.
- `MK.fit(text, role, sizes, room, most)` picks the largest of `sizes` at which `text` takes at most `most` lines of `room` px; `role` is `"display"`, `"body"` or `"mono"`. It returns `{ size, lines, ok }`. `MK.text(tag, className, fitted, lineHeight)` turns that into an element, one `.ln` per line.
- `MK.m` is the look's motion: `lines(tl, elements, at)` reveals lines, `pop(tl, el, at)` lands a small thing, `grow(tl, el, at, seconds)` draws a rule from the left, `block(tl, el, at)` brings in a panel, `sweep(tl, el, at)` wipes a band in. Use these, so the scene moves like the rest of the video.
- `MK.problem(c, "what")` puts a red strip in the frame when something does not fit.
- The look's colours, as CSS variables: `--g` ground, `--ink`, `--muted`, `--line`, `--panel`, `--deep`, `--mk-accent`, `--mk-on-accent`, `--mk-accent-ink` (the accent as readable text), `--fd`, `--fb`, `--fm` (display, body and mono fonts).

## The contract

1. **Seek-safe.** Every move is a `fromTo` on `c.tl`, or a function of time driven by one (as the kit's typing and counting are). No `Date`, no `Math.random`, no timers, no CSS animations or transitions, nothing that plays by itself.
2. **Measure on a canvas.** A scene is not laid out until it plays, so `getBoundingClientRect` and `offsetWidth` read zero when the scene is built. Size text with `MK.fit`.
3. **Stay inside the scene.** Build under `c.el`, animate only what you built, and never the scene's own element. The cover between scenes is the kit's.
4. **The look's tokens only.** No colour written by hand, no gradient, glow, blur or shadow that fades. Text the viewer reads is 32 px or larger.
5. **The first frame is whole** when the scene opens the video: its words are on screen at time 0.
6. **Honest `expect`.** Write what the still really shows; the check depends on it.

Build, look at the sheet, and fix the scene until its frame matches its sentence. If it cannot be made to fit, use a kit scene.
