# motion-kit

A skill that lets Claude Code on Haiku 5.5 alone turn a short brief into a vertical motion video (1080 x 1920, 10 to 30 seconds, MP4, with sound effects and, when asked, a spoken voice) with HyperFrames 0.9.51.

The idea: a small model writes well and chooses well, but it does not design. So every design decision lives in tested code, and the model's whole job is one data file, `storyboard.json`: which scenes, in which order, with which words, in which look. A builder checks that file and answers every problem with one sentence that says what to do. A contact sheet prints, under each frame, what that frame should show, so the model compares a picture with a sentence instead of judging a layout.

Videos made this way are assembled from the kit. They are not designed from nothing by an AI, and the README says so.

## What the kit holds

```
skills/motion-kit/
  SKILL.md                 the steps and rules, written for Haiku (102 lines)
  reference/scenes.md      every scene's fields and limits, with one example each
  reference/writing.md     how the lines should read, in Indonesian and English
  reference/sound.md       a voice or a silent video: opened only when the user asks for one
  reference/custom-scene.md  open mode: a scene of one's own (not for Haiku)
  examples/<recipe>.json   one finished storyboard per recipe
  kit/build.mjs            checks storyboard.json, writes the HyperFrames project into video/, lays its sound
  kit/lib/spec.mjs         the rules in one place: scenes, fields, limits, timing, stills, the sound default
  kit/stills.mjs           one frame per scene on a sheet, each with what it should show
  kit/sound.mjs            the one extra command for a video with a voice
  kit/test/kit.test.mjs    node --test for the kit and its sound together (11 tests)
  kit/runtime/mk.js        text fitting on a canvas, colour from one accent, motion per look, the cover between scenes
  kit/runtime/scenes.js    the scenes
  kit/runtime/page.js      the page scene (the user's real page in a window)
  kit/runtime/kit.css      the three looks
  kit/runtime/fonts/       Finlandica, Fraunces, Big Shoulders Display, JetBrains Mono (OFL, licence texts beside them)
  kit/sound/               the sound layer: voices, effects, the mix (see "Sound" and docs/SOUND.md)
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
5. Only for a video with `voice` lines: `node "<skill>/kit/sound.mjs"` makes the spoken lines and builds again (see "Sound").
6. `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`.

What the builder checks, each with its own sentence: unknown settings and fields, missing fields ("take it from the brief; never make one up"), the length of every text (with how many characters to cut and the two allowed ways to shorten), a dash used as punctuation, emoji, placeholders, capitals, a stat without a digit, an address with `https://` or spaces, a page address that differs from the end card's, files that are missing, outside the folder or of the wrong kind, the recipe's needs, first scene `title` and last `end`, 3 to 6 scenes, one of each kind, the total length, a spoken line too long for its scene or holding a digit, an address or a sign (with the words to write instead), `"sound": "off"` beside a voice or music, a `"narrator"` the kit does not know or with no line to speak, and a `video` folder the kit did not make.

Text that passes the limits always fits. Scenes are not laid out until they play, so nothing is measured in the page: the runtime measures every text on a canvas with the look's own fonts, takes the largest size at which it fits its lines and the height that is left, and evens out two to four lines so a last line is never one stray word. If something still does not fit, the frame carries a red strip that says DOES NOT FIT and what to shorten, so the sheet shows it plainly.

## Rules the kit keeps

- Every name, number, quote and address comes from the brief or the user's files. A `stat` needs a real number, a `quote` real words and a name; without them the scene is left out.
- The kit never downloads pictures or music. A render loads GSAP 3.15.0 from cdn.jsdelivr.net, as `video-promo` does.
- A voice is never installed without the user's yes. Only `kit/sound/install.mjs` downloads, and the skill lets the model run it only after it has asked the question the sound command prints (the voice's name, the size, the source, the folder) and the user has answered yes. No script asks for, prints or stores a key.
- HyperFrames 0.9.51 only, through `npx`, with usage data turned off before the first other command.
- The scripts write only inside `video/` (an allowed install writes to `~/.hypersheets/sound`). The builder refuses a `video` folder it did not make.
- No gradients, glow, glass, sparkle icons or em dashes. Sentence case.

## Design choices

- **Frame zero is whole.** The title's words are on screen at time 0, so the cover frame is the headline; the colour band arrives behind them within the first second.
- **The safe box** is 912 px wide and runs from 210 px below the top to 410 px above the bottom. TikTok, Reels and Shorts put their captions and buttons over the lowest part of a vertical video. The page scene is the one exception: its window is a stage and runs lower.
- **One motion vocabulary per look** (`lines`, `pop`, `grow`, `block`, `sweep`, `count`) and one cover between scenes per look (warnet: nine stepped columns; kertas: one pane that slides across; panggung: two halves that shut). Every move is a pure function of time, so any frame can be drawn on its own.
- **Timing is decided in Node** (`kit/lib/spec.mjs`) and handed to the browser as data, so the builder knows the video's length, the stills and the sound cues without opening a browser.
- **Text is 32 px or larger**, code included. A line of code holds 40 characters; the builder says where to break a longer one.

## Sound

The sound layer (`kit/sound/`) was built apart from the video kit and joined to it for 0.4.0. `docs/SOUND.md` has its research: the voices and their licences, what was measured for each, the palettes and their sources. This section is the join.

**What a model does for sound.**

- Nothing, for sound effects. `build.mjs` lays them on every build from the look's own palette (`warnet` pixel, `kertas` paper, `panggung` bold) and the video plays the mix from 0. `"sound": "off"` in the storyboard keeps a video silent.
- For a voice: a `"voice"` line in each scene that should speak, `"narrator"` at the top (`ringan`, `kokoro`, `bagus`, `sendiri`, `draft`), and one command after the review and before the render: `node "<skill>/kit/sound.mjs"`. It makes the lines, runs the builder again so each scene lasts as long as its line, and prints the render command. When it cannot finish it prints what to do, and for two cases what to say: the question to ask before a download, and the list of lines and file names for ElevenLabs or the user's own recordings.

**The default is one constant.** `SOUND_DEFAULT` in `kit/lib/spec.mjs` is `"on"`. Set it to `"off"` and a video is silent unless its storyboard says `"sound": "on"`; a voice or music is laid either way. `SKILL.md`'s "Sound" section says "Sound effects are already in every video", which would then need changing. The owner has not heard the palettes yet, which is why this is one word to flip.

**What joins the two halves.**

- `build.mjs` writes `video/cues.json` (`{ look, duration, cues: [{ t, type, scene, weight }] }`; `type` is `land`, `whoosh`, `type`, `press`, `count`, `cut` or `marker`; spans carry `until`) and calls the mixer itself, so a mix can never be older than its timeline. The same storyboard gives the same `mix.wav`, byte for byte.
- Scene numbers count from 1 in every file and message: `scene-1.wav`, `my-voice/1.mp3`, the keys of `durations.json`. Before 0.4.0 `durations.json` counted from 0.
- A take is used only while it says the storyboard's words in the storyboard's voice. Change a `voice` line and the next build leaves its old take out, keeps the scene at its own length, and says which scenes are "not spoken yet" with the command that makes them. `stills.mjs` says it again.
- A scene with a take lasts at least 0.3 s (the cover lifts) plus the line plus 0.5 s. A line may have about 2.5 words for each second of its scene; the builder counts them.
- The contact sheet stays when only the sound changed, so the frames a review was written from are still there after `sound.mjs` has built again.
- `mk-plan.json` carries what the video's sound holds (`sound`: effects, palette, which scenes speak, which wait, loudness, peak).

**Voices.** Decided by the owner on 2026-11-15: Indonesian light is Piper `news_tts` (a practice voice, with a one-line notice), English light is KittenTTS, the better local English voice is Kokoro, `bagus` is ElevenLabs on the user's own account (files the user makes; the kit prints the lines and the names), `sendiri` is the user's own recordings, and the macOS voice is a draft only. Supertonic 3 can be installed by name and is offered nowhere. The skill starts every voice at `ringan` and never picks a bigger one than the user asked for.

**Measured on the kit's own builder** (four of the examples, taken through build, stills, sound and render; M1 Pro, HyperFrames 0.9.51). Loudness and peak are of the finished MP4's AAC track, by ffmpeg's `ebur128`.

| Example | Look, palette | Sound | Video | MP4 loudness | MP4 peak | Sound against the mix |
|---|---|---|---|---|---|---|
| tips (id) | warnet, pixel | 12 effects | 12.35 s | -16.0 LUFS | -2.4 dBTP | 0 ms apart |
| coding (en) | warnet, pixel | 15 effects | 19.43 s | -16.1 LUFS | -1.3 dBTP | 0 ms apart |
| before-after (id) | panggung, bold | 17 effects, 4 lines by Piper | 18.96 s | -16.0 LUFS | -2.4 dBTP | 0 ms apart |
| testimonial (en) | kertas, paper | 15 effects, 4 lines by KittenTTS | 20.73 s | -16.0 LUFS | -1.7 dBTP | 0 ms apart |

- **The MP4 carries the sound.** Each has an AAC track (48 kHz, stereo) as long as the video. Its samples line up with `mix.wav` to the sample (the lag with the highest correlation is 0).
- **Peaks.** The mix is held under -1.5 dBTP. AAC encoding can lift a peak a little: across these four and the Haiku runs the MP4s measure -2.8 to -1.2 dBTP.
- **Effects alone.** The pixel palette reaches -16 LUFS. Paper and bold are sparse recordings and stop short on purpose, at about -22 LUFS (-21.9 and -22.9 in the Haiku runs).
- **Cues against frames.** For every hit cue (`land`, `press`, `cut`, `marker`) the sound's steepest rise was found in the MP4, and the frames around it were compared. With the pixel and bold palettes the rise is on the cue (0 ms, 12 hits that no voice covers). With the paper palette it comes 27 to 64 ms after, because those recordings fade in. In the picture, a band, a panel, a marker or a button changes in the first one or two frames after its cue (13 to 60 ms). A list line is the exception by design: its bullet pops on the cue and its words follow 0.08 s later, so most of what the eye sees arrives 110 to 140 ms after the sound. Frames at a cue's time were also looked at: at a list line's cue the bullet is at its first step and the line is absent 0.1 s before and whole 0.3 s after; at a compare scene's second panel the panel is half up one frame after the cue.
- **A voice inside its scene.** In both voiced videos every line starts 0.3 s into its scene and ends 0.5 s or more before the scene does (0.5 to 0.83 s). Each scene's own seconds were cut from the MP4 and given to whisper: all eight lines came back whole inside their scenes, with 0 to 8% of characters different (the listener wrote "Bu Yati" as "Boo Yeti").

**What a person must still judge by ear.** Nobody has listened to any of this. Whether each palette suits its look and no single sound is ugly; whether the effects sit well under a voice; whether Piper's Indonesian and Kitten's English are pleasant, and how they say names; whether the typing ticks tire over three seconds of code; whether a list line's sound should move 0.08 s later to meet its words; whether the paper palette feels late. `docs/SOUND.md` has the longer list.

### The sound trial on Haiku (2026-11-15)

**Harness.** As for the first trial, with three changes in `dev/run-kit-trial.sh`: the kit's `node` commands now go to the stand-in at the permission prompt, which allows the build, the stills, the sound command and `device.mjs` and refuses an install (nobody said yes); `HS_SOUND_HOME` names the folder of installed voices (an empty one unless a run is given this Mac's), listed before and after; and no ElevenLabs key reaches a run.

**Rubric.** `dev/score-kit.mjs` reads what the brief asked for from `<run-dir>/expect.json` and adds to the first trial's checks:

- the MP4 has sound, or has none, as asked;
- its loudness is within 1 LU of -16 LUFS with a voice, or between -26 and -14.5 LUFS with effects alone, and its peak is under -1 dBTP;
- with a voice: every line is in the video, in the voice asked for, and none runs past its scene;
- the practice voice's notice is in the final message when Piper spoke;
- no install command was run and the folder of voices did not change;
- nothing that looks like a key or token, and no secret of the shell, is in anything the run wrote;
- a run that has to hand over to the user (lines to make, a download to allow) renders nothing, and its final message carries the lines with their file names, or the question with its size and source.

The rebuild check still holds: the spoken lines go into the copy as they are, and the mix the builder lays from them must be the run's own, byte for byte.

**Bar.** At most 12 runs; stop when the last 6 in a row pass.

| Run | Brief | Sound asked | Recipe, look | Result | Turns | Cost | Time | Video | MP4 loudness, peak |
|---|---|---|---|---|---|---|---|---|---|
| s01 | bengkel (id), "dinarasikan, pakai suara ringan" | voice, light | before-after, kertas | pass, with a note | 20 | $0.0142 | 89 s | 17.9 s | -16.0 LUFS, -2.8 dBTP |
| s02 | flexbox (en), "add a voice-over with the light voice" | voice, light | explainer, warnet | pass | 15 | $0.0116 | 74 s | 20.4 s | -16.0 LUFS, -1.7 dBTP |
| s03 | roti (id), "narasinya pakai ElevenLabs dari akunku", no key, no files | ElevenLabs | announce, kertas | pass: stopped, listed 4 lines and `my-voice/1.mp3` to `4.mp3` | 15 | $0.0104 | 52 s | none | |
| s04 | rantai (id), "pakai suaraku sendiri", three stand-in recordings in `my-voice/` | own voice | tips, kertas | pass | 14 | $0.0112 | 56 s | 12.0 s | -16.0 LUFS, -1.9 dBTP |
| s05 | bengkel again | voice, light | before-after, kertas | pass | 15 | $0.0121 | 83 s | 18.8 s | -16.0 LUFS, -2.4 dBTP |
| s06 | tips (id), "efek suara saja, tanpa narasi" | effects | tips, warnet | pass | 12 | $0.0095 | 50 s | 12.4 s | -16.1 LUFS, -2.7 dBTP |
| s07 | diskon (id), "beri efek suara, tidak perlu suara orang" | effects | announce, panggung | pass | 13 | $0.0094 | 46 s | 17.3 s | -22.9 LUFS, -1.7 dBTP |
| s08 | kopi (en), "sound effects only, no voice-over" | effects | testimonial, kertas | pass | 13 | $0.0089 | 46 s | 18.1 s | -21.9 LUFS, -1.2 dBTP |
| s09 | kode (id), nothing about sound | effects, unasked | coding, warnet | pass: effects, no voice, nothing installed | 13 | $0.0098 | 53 s | 20.2 s | -16.2 LUFS, -1.7 dBTP |
| s10 | kopi (en), "add a voice-over", no voice installed | a download to allow | testimonial, kertas | pass, with a note: stopped and asked | 14 | $0.0093 | 38 s | none | |
| s11 | the same | a download to allow | testimonial, kertas | pass: stopped and asked, word for word | 14 | $0.0092 | 39 s | none | |
| s12 | rina (id), a page, "tambahkan narasi suara" | voice | promo, kertas, accent page | pass | 17 | $0.0128 | 78 s | 21.8 s | -16.0 LUFS, -2.8 dBTP |

**Result.** 12 runs of the 12 allowed, 12 pass the rubric, so the last 6 in a row pass. Two notes led to changes, and the runs after each change are fewer than six: s02 to s12 ran after the first, s11 and s12 after the second.

- **s01** made its video, and whisper wrote two of its lines a little differently ("Jatwal Service" for "jadwal servis", "service routine" for "servis rutin"). The sound command then said the model "may change those lines once", and Haiku did: "servis rutin" became "perawatan rutin" in the voice while the screen still said "Servis rutin". The listener was only spelling loanwords its own way. The command now says to change nothing and to tell the user which scenes to listen to. s05 is the same brief afterwards: one sound command, no rewrite.
- **s10** stopped and asked before any download, as it must, but it had set `"narrator": "kokoro"` for a brief that only said "add a voice-over", so its question was about 370 MB where 52 MB would do. It also moved the question's last sentence to the front and shortened the folder's long path. `reference/sound.md` now says to start at `ringan` and never pick a bigger voice than the user asked for, and the question for a bigger voice names the light one too. s11 is the same brief afterwards: `ringan`, 52 MB, the question word for word. The rubric does not check which voice was chosen; this was found by reading.

**Cost and time.** $0.129 for the 12 runs, $0.0107 a run. A finished video with effects only (s06 to s09): 12 to 13 turns, $0.0089 to $0.0098, 46 to 53 s. A finished video with a voice (s01, s02, s04, s05, s12): 14 to 20 turns, $0.0112 to $0.0142, 56 to 89 s; without s01's extra round, 14 to 17 turns and $0.0112 to $0.0128. A run that stops for the user (s03, s10, s11): 14 to 15 turns, about $0.01, under a minute. Sound effects added no turn and no measurable cost to a video: the first trial's average was $0.0096.

**What the runs show beyond the rubric.**

- No run wrote a `voice` line or a `narrator` that was not asked for, and none read `reference/sound.md` unless the brief asked for a voice.
- Every `voice` line kept the rules on the first build: numbers in words ("Mulai Sabtu enam Desember, buka pukul tujuh pagi sampai tiga sore"), no address ("alamatnya ada di layar").
- Whisper heard 19 of the 19 lines in the five finished voiced videos as written, after s01's rewrite; in s04 the lines were the brief's own, copied word for word, and matched the recordings.
- Piper's notice reached the user in all three runs it spoke in (s01, s05, s12). In s03 the ElevenLabs notice was passed on too.
- No run asked for a key. s03 said, unprompted, that it would not ask for one.
- Final messages now mention the renderer's `blank-frame suspect` lines (the flat cover between two scenes trips HyperFrames' check, as it did in the first trial). Rule 7 of `SKILL.md` says to ignore them since s06; s12 still mentioned them, as harmless.

**Not covered.** A user who answers yes: no run reached `install.mjs`, because a headless run has nobody to answer. The second half of the ElevenLabs and own-voice paths as a conversation (the user comes back and says the files are saved); s04 covers recordings that are already there. Music. `"sound": "off"` on Haiku (the builder's side is tested). Kokoro. Windows and Linux.

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
- **Sound has been measured, not heard.** Loudness, peaks, timing and a recogniser's transcript say the sound is level, on its cues and intelligible. Whether it is pleasant is unknown until a person listens (see "Sound").
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

then ask, for example: `Pakai skill motion-kit. Buat video tips: tiga cara merawat sepatu lari. Alamatnya contoh-toko.pages.dev.` The video comes with sound effects. For a voice, add `Videonya dinarasikan.`; Claude then asks before it downloads the light voice (41 MB for Indonesian).

To install it for every session instead, add this folder as a local marketplace: `/plugin marketplace add /path/to/hypersheets-workshop`, then `/plugin install hypersheets-workshop@hypersheets`.
