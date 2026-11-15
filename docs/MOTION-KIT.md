# motion-kit

A skill that lets Claude Code on Haiku 5.5 alone turn a short brief into a vertical motion video (1080 x 1920, 10 to 30 seconds, MP4) with HyperFrames 0.9.51.

The idea: a small model writes well and chooses well, but it does not design. So every design decision lives in tested code, and the model's whole job is one data file, `storyboard.json`: which scenes, in which order, with which words, in which look. A builder checks that file and answers every problem with one sentence that says what to do. A contact sheet prints, under each frame, what that frame should show, so the model compares a picture with a sentence instead of judging a layout.

Videos made this way are assembled from the kit. They are not designed from nothing by an AI, and the README says so.

## What the kit holds

```
skills/motion-kit/
  SKILL.md                 the steps and rules, written for Haiku (89 lines)
  reference/scenes.md      every scene's fields and limits, with one example each
  reference/writing.md     how the lines should read, in Indonesian and English
  reference/custom-scene.md  open mode: a scene of one's own (not for Haiku)
  examples/<recipe>.json   one finished storyboard per recipe
  kit/build.mjs            checks storyboard.json, writes the HyperFrames project into video/
  kit/lib/spec.mjs         the rules in one place: scenes, fields, limits, timing, stills
  kit/stills.mjs           one frame per scene on a sheet, each with what it should show
  kit/runtime/mk.js        text fitting on a canvas, colour from one accent, motion per look, the cover between scenes
  kit/runtime/scenes.js    the scenes
  kit/runtime/page.js      the page scene (the user's real page in a window)
  kit/runtime/kit.css      the three looks
  kit/runtime/fonts/       Finlandica, Fraunces, Big Shoulders Display, JetBrains Mono (OFL, licence texts beside them)
  kit/sound/               the sound layer, built separately (see "Sound")
```

**Ten scenes.** `title` (always first), `page` (the user's real page in a window: the address types itself, a marker lands on the name, the page scrolls to its first list), `image` (one picture the user has), `list`, `steps`, `stat` (one number, counted up), `quote`, `compare`, `code` (typed line by line, one line marked), `end` (always last: the address types itself and the button is pressed once). `title`, `list`, `stat`, `quote` and `end` each have two layouts; the builder picks one from the scene's own words, so two videos differ without anyone choosing.

**Three looks.** Each takes every colour from one accent, and fixes contrast by itself.

| Look | What it is | Default accent |
|---|---|---|
| `warnet` | Hyper Sheets' own video direction: dark warm ground, Finlandica, stepped pixel motion, one colour band, a stepped beam of light as the ground | `#f97316` |
| `kertas` | light paper, Fraunces headlines, calm masked reveals, a folio rule with a square that walks along it as the video plays | `#b8432f` |
| `panggung` | the accent fills the frame, Big Shoulders Display at weight 900, hard reveals, a keyline frame with a tab that fills | `#ffc928` |

`"accent": "page"` takes the colour of the user's page (read in the page scene); `"accent": "#0f766e"` takes a brand colour. A colour too weak to show on the ground is moved toward white or black until it does; text on the accent is whichever of the two inks reads better.

**Seven recipes**: `promo`, `announce`, `explainer`, `tips`, `coding`, `testimonial`, `before-after`. A recipe says which scenes it needs and which it may hold. Every video has 3 to 6 scenes, one of each kind at most, and runs 8 to 32 seconds (45 with a voice).

## How a video is made

1. The model reads the brief and the files it names, and writes `storyboard.json`.
2. `node "<skill>/kit/build.mjs" storyboard.json` checks it. Wrong: it prints numbered sentences and writes nothing. Right: it writes `video/` (a HyperFrames project: `index.html`, one sub-composition per scene, the runtime, the user's page or picture copied into `video/assets/`), plus `video/mk-plan.json` (times and stills) and `video/cues.json` (what can be heard, for the sound layer).
3. `node "<skill>/kit/stills.mjs"` turns HyperFrames' usage data off, snapshots one frame per scene (two for the page scene) and lays them on `video/sheet.png` with the frame number, the time and "Should show: ...".
4. The model reads the sheet, fixes words in the storyboard if a frame is wrong (at most three rounds), and writes `video/REVIEW.md`.
5. `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`.

What the builder checks, each with its own sentence: unknown settings and fields, missing fields ("take it from the brief; never make one up"), the length of every text (with how many characters to cut and the two allowed ways to shorten), a dash used as punctuation, emoji, placeholders, capitals, a stat without a digit, an address with `https://` or spaces, a page address that differs from the end card's, files that are missing, outside the folder or of the wrong kind, the recipe's needs, first scene `title` and last `end`, 3 to 6 scenes, one of each kind, the total length, a spoken line too long for its scene, and a `video` folder the kit did not make.

Text that passes the limits always fits. Scenes are not laid out until they play, so nothing is measured in the page: the runtime measures every text on a canvas with the look's own fonts, takes the largest size at which it fits its lines and the height that is left, and evens out two to four lines so a last line is never one stray word. If something still does not fit, the frame carries a red strip that says DOES NOT FIT and what to shorten, so the sheet shows it plainly.

## Rules the kit keeps

- Every name, number, quote and address comes from the brief or the user's files. A `stat` needs a real number, a `quote` real words and a name; without them the scene is left out.
- The kit never downloads pictures or music. A render loads GSAP 3.15.0 from cdn.jsdelivr.net, as `video-promo` does.
- HyperFrames 0.9.51 only, through `npx`, with usage data turned off before the first other command.
- The scripts write only inside `video/`. The builder refuses a `video` folder it did not make.
- No gradients, glow, glass, sparkle icons or em dashes. Sentence case.

## Design choices

- **Frame zero is whole.** The title's words are on screen at time 0, so the cover frame is the headline; the colour band arrives behind them within the first second.
- **The safe box** is 912 px wide and runs from 210 px below the top to 410 px above the bottom. TikTok, Reels and Shorts put their captions and buttons over the lowest part of a vertical video. The page scene is the one exception: its window is a stage and runs lower.
- **One motion vocabulary per look** (`lines`, `pop`, `grow`, `block`, `sweep`, `count`) and one cover between scenes per look (warnet: nine stepped columns; kertas: one pane that slides across; panggung: two halves that shut). Every move is a pure function of time, so any frame can be drawn on its own.
- **Timing is decided in Node** (`kit/lib/spec.mjs`) and handed to the browser as data, so the builder knows the video's length, the stills and the sound cues without opening a browser.
- **Text is 32 px or larger**, code included. A line of code holds 40 characters; the builder says where to break a longer one.

## Sound

The builder writes what the sound layer needs and plays what it finds. The sound layer itself (`kit/sound/`: local voices, sound effects, the mix) was built separately and is not described here.

- `video/cues.json`: `{ look, duration, cues: [{ t, type, scene, weight }] }`. `type` is `land`, `whoosh`, `type`, `press`, `count`, `cut` or `marker`; spans carry `until`; `weight` is 1 to 3.
- A scene may carry `"voice": "..."`, and the storyboard `"music": "file"`. A spoken line is checked by words (about 2.5 a second).
- If `video/voice/durations.json` exists (`{ "<scene index>": seconds }`), a scene lasts at least that plus 0.4 s.
- If `video/assets/audio/mix.wav` exists when the builder runs, the video plays it from 0. Otherwise a `music` file plays at half volume, and otherwise the video is silent. Build again after a mix is made.

## Open mode

SKILL.md opens with: "If you are Claude Haiku, use kit mode only." A stronger model also works in kit mode first, and may add one or two scenes of its own when the user asks for something no kit scene shows. `reference/custom-scene.md` is the contract: a folder `custom/<name>/` beside the storyboard with `scene.json` (fields, seconds, the still's time and what it shows, cues) and `scene.js` (`MK.define("custom/<name>", (c) => ...)`), used as `{ "type": "custom/<name>", ... }`. The builder checks its fields like any other scene, the sheet shows its still, and the kit's text fitting, motion and colour tokens are there to use. Kit mode never depends on it.

## The Haiku trial (2026-11-15)

**Harness.** `dev/run-kit-trial.sh <run-dir> <fixture-dir> <prompt-file>` starts one headless Claude Code run, `claude -p --model claude-haiku-5-5`, the way `dev/run-trial.sh` does for `video-promo`: no user or project settings, the plugin loaded from a copy of this repo, a stand-in for the person at the permission prompt (`dev/learner-mcp.mjs`, which refuses anything the skill does not ask for), and a HyperFrames settings folder of its own that starts with usage data on. Each run is one invocation, so `total_cost_usd` is that run's own cost. The briefs are `dev/prompts/kit-*.txt`; their people, shops and addresses are made up.

**Rubric.** `node dev/score-kit.mjs <run-dir>` (the brief copied to `<run-dir>/prompt.txt`). A run passes when all of these hold:

- the storyboard as left builds, and `video/` is byte for byte what the builder writes from it (nothing in the kit or the project was edited by hand);
- `video/sheet.png` and `video/REVIEW.md` exist, with a line per frame;
- `video/video.mp4` exists at 1080 x 1920 and runs as long as the plan says;
- no command was refused at the permission prompt and none was chained with `&&`, `;` or `|`;
- every number and address in the storyboard appears in the brief or the user's files;
- HyperFrames' usage data was turned off.

The storyboards, sheets and reviews were also read by eye, for invented facts the net cannot catch and for how the frames look.

**Bar.** At most 30 Haiku runs; stop when the last 6 runs in a row, across at least 4 briefs, pass.

**Briefs** (`dev/prompts/kit-<name>.txt`): `rina` (id, a promo of her own page, with `index.html`), `flexbox` (en, explain centering with flexbox, with code), `roti` (id, a new branch opening, with a picture), `kopi` (en, a client's words about a menu page), `kode` (id, explain a `reduce` snippet), `tips` (id, three habits), `bengkel` (id, before and after, with a brand colour), `diskon` (id, a sale).

**Round 1**, the first working kit:

| Run | Brief | Recipe | Look | Scenes | Result | Builds | Turns | Cost | Time | Video |
|---|---|---|---|---|---|---|---|---|---|---|
| k01 | rina | promo | kertas, accent page | title, page, list, end | FAIL: tried `cat >` to write the storyboard, refused at the prompt | 1 | 14 | $0.0111 | 56 s | 19.3 s |
| k02 | flexbox | explainer | warnet | title, steps, code, end | pass | 1 | 12 | $0.0093 | 50 s | 18.9 s |
| k03 | roti | announce | kertas | title, image, list, end | pass | 1 | 15 | $0.0108 | 53 s | 16.4 s |
| k04 | kopi | testimonial | kertas | title, quote, stat, end | FAIL: chained `pwd; ls; ls` in one command | 1 | 13 | $0.0094 | 46 s | 17.5 s |
| k05 | kode | coding | warnet | title, code, steps, end | pass | 1 | 13 | $0.0098 | 55 s | 19.4 s |
| k06 | tips | tips | warnet | title, list, end | pass | 1 | 11 | $0.0087 | 46 s | 12.3 s |

**Round 2**, after the Bash rule, the layout fixes and the examples:

| Run | Brief | Recipe | Look | Scenes | Result | Builds | Turns | Cost | Time | Video |
|---|---|---|---|---|---|---|---|---|---|---|
| k07 | rina | promo | kertas, accent page | title, page, list, end | pass | 1 | 12 | $0.0082 | 53 s | 19.9 s |
| k08 | flexbox | explainer | warnet | title, steps, code, end | FAIL: kicker "CSS in 20 seconds", a number not in the brief, copied from the kit's own example line | 1 | 14 | $0.0095 | 54 s | 19.8 s |
| k09 | roti | announce | kertas | title, image, list, end | pass | 1 | 14 | $0.0104 | 49 s | 17.0 s |
| k10 | kopi | testimonial | kertas | title, quote, end | pass | 1 | 12 | $0.0085 | 41 s | 13.7 s |
| k11 | kode | coding | warnet | title, code, list, end | pass | 1 | 13 | $0.0095 | 49 s | 18.7 s |
| k12 | tips | tips | warnet | title, list, end | pass | 1 | 11 | $0.0089 | 47 s | 12.6 s |
| k13 | bengkel | before-after | kertas, accent #0f766e | title, compare, list, end | pass | 2 | 16 | $0.0106 | 51 s | 17.9 s |

**Round 3**, the kit as tagged (all seven briefs again):

| Run | Brief | Recipe | Look | Scenes | Result | Builds | Turns | Cost | Time | Video |
|---|---|---|---|---|---|---|---|---|---|---|
| k14 | flexbox | explainer | warnet | title, steps, code, end | pass | 1 | 12 | $0.0089 | 52 s | 19.8 s |
| k15 | rina | promo | kertas, accent page | title, page, list, end | pass | 1 | 14 | $0.0102 | 51 s | 19.9 s |
| k16 | roti | announce | kertas | title, image, list, end | pass | 1 | 15 | $0.0114 | 60 s | 17.0 s |
| k17 | kopi | testimonial | kertas | title, quote, stat, end | pass | 1 | 13 | $0.0089 | 44 s | 18.4 s |
| k18 | kode | coding | warnet | title, code, list, end | pass | 1 | 13 | $0.0104 | 56 s | 19.1 s |
| k19 | tips | tips | warnet | title, list, end | pass | 1 | 12 | $0.0088 | 45 s | 12.3 s |
| k20 | bengkel | before-after | kertas, accent #0f766e | title, compare, list, end | pass | 1 | 13 | $0.0095 | 48 s | 17.9 s |

**After round 3**, two single runs:

| Run | Brief | Recipe | Look | Scenes | Result | Builds | Turns | Cost | Time | Video |
|---|---|---|---|---|---|---|---|---|---|---|
| k21 | diskon | announce | panggung | title, stat, list, end | pass | 1 | 13 | $0.0093 | 50 s | 17.5 s |
| k22 | open-bars, on Sonnet 5.5 | announce | warnet | title, custom/bars, end | pass | 2 | 20 | $0.2493 | 77 s | 13.5 s |

k21 is the only run in which Haiku picked `panggung`: its brief says the video "harus mencolok". k22 is the one open-mode run, on `claude-sonnet-5-5` (see "Not done, and what is weak").

The rubric was tightened after round 1: a prompt refused at the permission step now fails a run, which is why k01 is a failure in this table though its video was complete. Rounds 1 and 2 ran on earlier states of the kit; round 3, k21 and k22 ran on the kit as tagged, apart from one later change that no run depends on (a stat value with letters that hang below the line, such as "3 days", now gets room for them in its box).

**Result.** The last 13 Haiku runs in a row pass (k09 to k21), across all eight briefs, seven recipes and both languages; round 3 is seven of seven on the kit as tagged. 21 Haiku runs were used of the 30 allowed, 18 passed, and each of the three failures led to a change above.

**Cost and time.** Over the 21 Haiku runs: $0.202 in total, $0.0096 a video on average ($0.0082 to $0.0114), 11 to 16 turns (13 on average), and 41 to 60 seconds from the brief to the rendered MP4, render included. A run reads about 28,000 tokens into the cache once, re-reads about 145,000 from it, and writes 4,000 to 5,500. The videos run 12 to 20 seconds and weigh about half a megabyte.

**What Haiku stumbled on, and what was changed.**

- Round 1, k01: it read the reference files with `cat` and tried `cat >` to write the storyboard (refused, then it used Write). k04: it chained `pwd; ls -la; ls -la ...` in one command. Rule 3 of SKILL.md now says Bash runs the three commands only, that the session is already in the user's folder, and that Glob, Read and Write do the rest. No run since has run a looking command.
- Round 2, k08: it took the kicker "CSS in 20 seconds" from the kit's own example lines, a number the brief never gave. The example line was replaced, and the worked examples now use made-up people no trial brief uses.
- Round 2, k07: it wrote "Halo, saya" over a page that says `aku`, following the worked example's voice. Rule 4 now says to keep the voice of the brief or the page.
- Both `rina` runs had to rewrite a 46-character list line of the page. A list line now holds 48 characters.
- Every run built on its first try except k13 (two builds). No run edited the kit or the project, and none invented a name, a quote or an address.

**What the kit itself got wrong, found by looking and by `npx hyperframes@0.9.51 check`.**

- A line of code was measured without its indentation, so an indented 41-character line ran out of its card. Code is now measured as written.
- An end card without a name was nearly empty; its line is now the large text.
- The end card's button was on screen 1.4 s; it now stays 2.1 s.
- Tall scenes reached 300 px above the bottom edge, under the apps' captions; the safe box now ends 410 px above it, and the headline, the steps and the picture size themselves to the height that is left.
- panggung's panels faded in, which turned a dark panel on a loud ground to mud for a few frames; they now arrive by a hard reveal.

`check` passes on a built project with 0 errors. Its warnings that remain: `film_silent` (no sound in a silent build), `outside_safe_zone` for text that sits outside HyperFrames' strictest per-app zones (the kit keeps a 84 px side margin and stays above the lowest 410 px, but a wide line can still sit behind an app's right-hand buttons), and `dead_stretch` on a title whose sub line is long (the headline holds while it is read; only the ground moves).

## Not done, and what is weak

- **9:16 only.** 16:9 and 1:1 are not done. The scenes are laid out for 1080 x 1920 and nothing reflows them.
- **Sound.** Only the builder's side of the contract is in this document's scope: cues, a voice line's length, voice durations stretching a scene, and playing a mix or a music file. That side was checked with a stand-in mix (the render carries the audio track). The sound layer in `kit/sound/` was built separately.
- **Open mode was run once**, on Sonnet 5.5 (k22: 20 turns, $0.25, 77 s). It wrote `custom/bars/` (31 lines of `scene.js`, a `scene.json` with an honest `expect`, six lines of CSS), used the kit's fitting and motion, saw on the sheet that its bars touched, widened them and built again. Two things went wrong that the rubric does not catch. It wrote the video's words in Indonesian although the brief was in English. And it put the three numbers inside `scene.js` instead of in fields, where the builder would have checked them: a custom scene can hold facts the builder never sees. One run is not a trial; open mode is tried, not proven.
- **Haiku rarely picks `panggung`.** In 21 runs it chose `kertas` 11 times, `warnet` 9 times and `panggung` once, when the brief asked for a video that stands out. A branch opening got `kertas` three times out of three. That is a fair reading of the look table, but a user who wants the loud look has to say so.
- **REVIEW.md is a weak check.** Haiku's review lines mostly restate the sentence under each frame. It would notice a red strip or a blank page window; it would not notice a subtle fault. What keeps the frames right is the builder's limits and the text fitting, not the model's eye.
- **The videos are typographic.** Without a page or a picture from the user there is no imagery, by design (nothing is downloaded). Several videos from the same kit will look related: ten scenes, three looks, two layouts for five of the scenes.
- **`check` still warns** about text outside HyperFrames' strictest per-app safe zones, and about a still title when the sub line is long (see above).
- **Latin text only.** The bundled fonts cover Latin and Latin Extended.
- **Not tried on Windows**, and not with a page that needs JavaScript to show its content (the page scene has the limits of `video-promo`'s).

## Trying it

From a folder that holds a page (`index.html`) or nothing at all:

```
claude --plugin-dir /path/to/hypersheets-workshop --model claude-haiku-5-5
```

then ask, for example: `Pakai skill motion-kit. Buat video tips: tiga cara merawat sepatu lari. Alamatnya contoh-toko.pages.dev.`

To install it for every session instead, add this folder as a local marketplace: `/plugin marketplace add /path/to/hypersheets-workshop`, then `/plugin install hypersheets-workshop@hypersheets`.
