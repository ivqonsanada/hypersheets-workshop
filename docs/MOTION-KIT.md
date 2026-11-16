# motion-kit

A skill that lets Claude Code on Haiku 5.5 alone turn a short brief into a vertical motion video (1080 x 1920, 10 to 30 seconds, MP4, with sound effects and, when asked, a spoken voice) with HyperFrames 0.9.51.

The idea: a small model writes well and chooses well, but it does not design. So every design decision lives in tested code, and the model's whole job is one data file, `storyboard.json`: which scenes, in which order, with which words, in which look. A builder checks that file and answers every problem with one sentence that says what to do. A contact sheet prints, under each frame, what that frame should show, so the model compares a picture with a sentence instead of judging a layout.

Videos made this way are assembled from the kit. They are not designed from nothing by an AI, and the README says so.

## What the kit holds

```
skills/motion-kit/
  SKILL.md                 the steps and rules, written for Haiku (136 lines)
  reference/scenes.md      every scene's fields and limits, with one example each
  reference/writing.md     how the lines should read, in Indonesian and English
  reference/sound.md       a voice or a silent video: opened only when the user asks for one
  reference/custom-scene.md  open mode: a scene of one's own (not for Haiku)
  examples/<recipe>.json   one finished storyboard per recipe
  kit/build.mjs            checks storyboard.json, writes the HyperFrames project into video/, lays its sound
  kit/lib/spec.mjs         the rules in one place: scenes, fields, limits, timing, stills, the sound default
  kit/stills.mjs           one frame per scene on a sheet, each with what it should show
  kit/lib/sheet.mjs        the sheet's page and its labels, in the video's language
  kit/sound.mjs            the one extra command for a video with a voice
  kit/test/kit.test.mjs    node --test for the kit and its sound together (11 tests)
  kit/test/rules.test.mjs  node --test for what the builder accepts and refuses, scene by scene, and what it hands the sound layer and the sheet
  kit/test/sheet.test.mjs  node --test for the sheet's labels and sentences in both languages (sheet-sentences.json holds them, scene by scene)
  kit/runtime/mk.js        text fitting on a canvas, colour from one accent, motion per look, the cover between scenes
  kit/runtime/scenes.js    the scenes
  kit/runtime/page.js      the page scene (the user's real page in a window)
  kit/runtime/wrap.js      how a long line of code wraps in its card; the builder counts rows with the same function
  kit/runtime/kit.css      the three looks
  kit/runtime/fonts/       Finlandica, Fraunces, Big Shoulders Display, JetBrains Mono (OFL, licence texts beside them)
  kit/sound/               the sound layer: voices, effects, the mix (see "Sound" and docs/SOUND.md)
```

**Seventeen scenes.** `title` (always first) and `end` (always last: the address types itself and the button is pressed once). For what a person or a shop has: `page` (the user's real page in a window: the address types itself, a marker lands on the name, the page scrolls to its first list), `image` (one picture, in a frame of its own shape; up to three in a video), `swap` (a before and an after photo in one frame: the after wipes in to the middle, then over the whole). For facts: `prices` (two to six names, each led across to its price, an old price struck through), `info` (two to four labelled facts: hours, a place, a number), `when` (one date on a calendar leaf, the number rolling into place), `numbers` (two to four numbers counted up), `stat` (one number), `list`, `steps`, `qa` (one to three questions, each answered under itself), `quote`, `compare`. For code: `code` (typed line by line, one line marked, long lines wrapped under themselves) and `fix` (the wrong code typed and dimmed, the right code under it with the changed line marked). `title`, `list`, `stat`, `quote` and `end` each have two layouts; the builder picks one from the scene's own words the first time and keeps it through every later build, so a revision changes only what was asked.

**Three looks.** Each takes every colour from one accent, and fixes contrast by itself.

| Look | What it is | Default accent |
|---|---|---|
| `warnet` | Hyper Sheets' own video direction: dark warm ground, Finlandica, stepped pixel motion, one colour band, a stepped beam of light as the ground | `#f97316` |
| `kertas` | light paper, Fraunces headlines, calm masked reveals, a folio rule with a square that walks along it as the video plays | `#b8432f` |
| `panggung` | the accent fills the frame, Big Shoulders Display at weight 900, hard reveals, a keyline frame with a tab that fills | `#ffc928` |

`"accent": "page"` takes the colour of the user's page (read in the page scene); `"accent": "#0f766e"` takes a brand colour. A colour too weak to show on the ground is moved toward white or black until it does; text on the accent is whichever of the two inks reads better.

**Ten recipes**: `promo`, `announce`, `menu` (needs `prices`), `faq` (needs `qa`), `recap` (needs `numbers` or `stat`), `explainer`, `tips`, `coding` (needs `code` or `fix`), `testimonial`, `before-after` (needs `compare`, `swap` or `fix`). A recipe says which scenes it needs and which it may hold; `promo` and `announce` need none, so a shop without a page or a picture still gets a video. Every video has 3 to 6 scenes, one of each kind at most (three pictures; two code cards in a row for code longer than one card), and runs 8 to 32 seconds (45 with a voice).

## How a video is made

1. The model reads the brief and the files it names, and writes `storyboard.json`.
2. `node "<skill>/kit/build.mjs" storyboard.json` checks it. Wrong: it prints numbered sentences and writes nothing. Right: it writes `video/` (a HyperFrames project: `index.html`, one sub-composition per scene, the runtime, the user's page or picture copied into `video/assets/`), plus `video/mk-plan.json` (times and stills) and `video/cues.json` (what can be heard, for the sound layer).
3. `node "<skill>/kit/stills.mjs"` turns HyperFrames' usage data off, snapshots one frame per scene (two for the page scene) and lays them on `video/sheet.png` with the frame number, the time and "Should show: ...", or "Seharusnya tampil: ..." when the storyboard's `lang` is `id` (since 0.5.1 the sheet is in the video's language).
4. The model reads the sheet, fixes words in the storyboard if a frame is wrong (at most three rounds), and writes `video/REVIEW.md`.
5. Only for a video with `voice` lines: `node "<skill>/kit/sound.mjs"` makes the spoken lines and builds again (see "Sound").
6. `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`.

What the builder checks, each with its own sentence: unknown settings and fields, missing fields ("take it from the brief; never make one up"), the length of every text (with how many characters to cut and the two allowed ways to shorten), a dash used as punctuation, emoji, placeholders, capitals, a stat without a digit, an address with `https://` or spaces, a page address that differs from the end card's, files that are missing, outside the folder or of the wrong kind, the recipe's needs, first scene `title` and last `end`, 3 to 6 scenes, one of each kind, the total length, a spoken line too long for its scene or holding a digit, an address or a sign (with the words to write instead), `"sound": "off"` beside a voice or music, a `"narrator"` the kit does not know or with no line to speak, and a `video` folder the kit did not make. Since 0.5.0 also: a price or a number without a digit, a picture with neither a title nor a caption, more than three pictures, code that would take more rows than its card holds, a `"variant"` the scene does not have, and the same number, date or address in three or more scenes (a number that is part of the name itself, such as "RW 05", does not count). A missing heading, caption, label or button is answered with what to write ("these are your own words"), a missing fact with "ask the user". A day name that does not match its date ("Sabtu, 13 Desember 2026" is a Sunday) does not stop the build: its last lines say to stop before the render and ask the user which is right. The note names the nearest date that falls on the day the words name, so the model never counts days. A `when` scene that leaves `day` out gets the calendar's day, and the build's last lines name it and say what to do if the brief names another. An end card address that also stands inside the code does not stop the build either: its last lines say to read the brief again, since an address the code calls is not where a viewer goes.

Text that passes the limits always fits. Scenes are not laid out until they play, so nothing is measured in the page: the runtime measures every text on a canvas with the look's own fonts, takes the largest size at which it fits its lines and the height that is left, and evens out two to four lines so a last line is never one stray word. If something still does not fit, the frame carries a red strip that says DOES NOT FIT and what to shorten, so the sheet shows it plainly.

## Rules the kit keeps

- Every name, number, quote and address comes from the brief or the user's files. A `stat` needs a real number, a `quote` real words (a name when the brief gives one); without them the scene is left out. The kit's own words on screen are four labels in the video's language: "Salah" and "Benar" on a `fix`, "Sebelum" and "Sesudah" on a `swap`.
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
- **Text is 32 px or larger**, code included. A row of code holds about 40 characters at that size; a longer line (up to 110 characters) continues on a second or third row with a hanging indent, broken at a space where there is one (by choice after a comma or a bracket, before `&&` or `||`). The card takes the size that wraps the fewest rows, so short code is still set large. A card holds nine lines; code longer than that goes on two cards in a row, and the second card's line numbers carry on from the first.
- **Lines break by the whole line.** Two to four lines are set as even as they can be, at a comma before anywhere else, never after "di", "dan" or "with". A headline passes over a size that leaves a short word alone on a line, or two one-word lines among three or more, when a smaller size avoids it, down to half the largest that fits.
- **A band holds the whole letter.** On the title's band layout the tails of g, j and p stay inside the band: in `kertas` the bands of two lines meet, in `panggung` the lines stand a little further apart. The words on a band sit exactly where the words under it sat, so nothing moves when the band lands.
- **A count never shows 0.** A number is not on screen before its count begins, and its first step is 1 or more.

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
- **Cues against frames.** For every hit cue (`land`, `press`, `cut`, `marker`) the sound's steepest rise was found in the MP4, and the frames around it were compared. With the pixel palette the rise is on the cue: 0 ms on all 12 hits of the two effects-only examples. The bold and paper palettes were measured on two effects-only videos Haiku made (s07 and s08 below): bold is within 1 ms on all 12 hits; paper comes 27 to 64 ms after the cue on its seven landings and presses, because those recordings fade in. In the picture, a band, a panel, a marker or a button changes within three frames of its cue (13 to 83 ms, where the change was large enough to measure). A list line is the exception by design: its bullet pops on the cue and its words follow 0.08 s later, so most of what the eye sees arrives 100 to 140 ms after the sound. Frames at a cue's time were also looked at: at a list line's cue the bullet is at its first step and the line is absent 0.1 s before and whole 0.3 s after; at a compare scene's second panel the panel is half up one frame after the cue.
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

**Result.** 12 runs of the 12 allowed, and 12 pass the rubric, so the last 6 in a row pass. Read with one caution: two notes changed what Haiku reads, the first after s01 and the second after s10, so only s11 and s12 ran on the text as released. The runs between differ from it by one row of a table and one added sentence in the download question.

- **s01** made its video, and whisper wrote two of its lines a little differently ("Jatwal Service" for "jadwal servis", "service routine" for "servis rutin"). The sound command then said the model "may change those lines once", and Haiku did: "servis rutin" became "perawatan rutin" in the voice while the screen still said "Servis rutin". The listener was only spelling loanwords its own way. The command now says to change nothing and to tell the user which scenes to listen to. s05 is the same brief afterwards: one sound command, no rewrite.
- **s10** stopped and asked before any download, as it must, but it had set `"narrator": "kokoro"` for a brief that only said "add a voice-over", so its question was about 370 MB where 52 MB would do. It also moved the question's last sentence to the front and shortened the folder's long path. `reference/sound.md` now says to start at `ringan` and never pick a bigger voice than the user asked for, and the question for a bigger voice names the light one too. s11 is the same brief afterwards: `ringan`, 52 MB, the question word for word. The rubric does not check which voice was chosen; this was found by reading.

**Cost and time.** $0.129 for the 12 runs, $0.0107 a run. A finished video with effects only (s06 to s09): 12 to 13 turns, $0.0089 to $0.0098, 46 to 53 s. A finished video with a voice (s01, s02, s04, s05, s12): 14 to 20 turns, $0.0112 to $0.0142, 56 to 89 s; without s01's extra round, 14 to 17 turns and $0.0112 to $0.0128. A run that stops for the user (s03, s10, s11): 14 to 15 turns, about $0.01, under a minute. Sound effects added no turn and no measurable cost to a video: the first trial's average was $0.0096.

**What the runs show beyond the rubric.**

- No run wrote a `voice` line or a `narrator` that was not asked for.
- Every `voice` line kept the rules on the first build: numbers in words ("Mulai Sabtu enam Desember, buka pukul tujuh pagi sampai tiga sore"), no address ("alamatnya ada di layar").
- Whisper heard 19 of the 19 lines in the five finished voiced videos as written, after s01's rewrite; in s04 the lines were the brief's own, copied word for word, and matched the recordings.
- Piper's notice reached the user in all three runs it spoke in (s01, s05, s12). In s03 the ElevenLabs notice was passed on too, in the softer wording it had during the trial ("asks you to credit ElevenLabs"). After the trial the rule was read at its source, and the notice again names `elevenlabs.io` in the title; the sound command passes the notice through as it is, so no run depends on its words.
- No run asked for a key. s03 said, unprompted, that it would not ask for one.
- Seven of the nine finished videos' final messages mention the renderer's `blank-frame suspect` lines (the flat cover between two scenes trips HyperFrames' check, as it did in the first trial, where the render log was the same). Rule 7 of `SKILL.md` says to ignore those lines since s06, and four of the five videos finished after that still mention them, now as harmless. It is noise in the message, not a fault in the video.
- No run opened `reference/sound.md` unless its brief asked for a voice: s06 to s09 did not, the eight others did.

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

## The use-case trial for 0.5.0 (2026-11-16)

**What 0.5.0 adds.** A use-case campaign ran 37 briefs on v0.3.0 (small shops, students and campus groups, coding shorts, requests the kit cannot fill) and left twelve patches and a list of what to build next. 0.5.0 is those patches on top of 0.4.0's sound layer, then the list:

- **Seven scenes**: `prices`, `info`, `numbers` (from the campaign), `when`, `qa`, `swap`, `fix`. **Three recipes**: `menu`, `recap`, `faq`. Each scene has its sound cues and its sentence on the check sheet.
- **Code that fits.** A line holds 110 characters and wraps under itself (it held 40, and a longer line was refused). A card holds one to nine lines, and short code is set larger. Code longer than one card goes on two cards in a row.
- **A scene keeps its layout through a revision** (`mk-plan.json` records it), and `"variant": 1` or `2` asks for one.
- **Smaller ones**: no headline with two one-word lines among three or more, a list without numbers, a quote without a name, a larger stat note, a count that never shows 0, pictures in their own shape and up to three of them, a promo without a page.
- **Checks**: the same fact in three scenes, a day name against the calendar, a kicker that repeats the headline or only greets, a price or a number without a digit, an end card address taken out of the code.
- **Wording in SKILL.md**: ask once and briefly, a fact stays whole, never make initials of a long name, never build an address, one command per call, render warnings are not passed on, and a last message of six short lines. Rule 9 now says what the kit does not do (a song, an avatar or a person on screen, a download, a wide or square video); a spoken voice it can make.

**Harness.** As in the earlier trials: headless `claude -p --model claude-haiku-5-5`, the plugin loaded from a copy of this repo, a stand-in for the person at the permission prompt. Sound was left at its default (effects on). 58 runs in three parts. The first two parts ran the campaign's briefs again on the kit as it stood. The first 30: `t01` on `d5f2d20`, `t02` to `t09` on `02739a3`, `t10` to `t17` on `2f3fd12`, `t18` to `t24` on `20dff59`, `t25` to `t30` on `aafdf0d`. Then a follow-up of 16, the most it was allowed: `t31` to `t34` on `db0f0d5`, `t35` to `t42` on `911a19f`, `t43` to `t46` on `b75f7ae`. Then a release-candidate round of exactly 12 on a frozen kit, `t47` to `t58` on `46e6140`: eleven briefs written for the round and one campaign brief not run before, so nothing in it was a case the kit had been fixed on. Sixteen runs asked the user something and got an answer in a second turn; two finished videos were sent back for a revision. Three runs (`t24`, `t38`, `t54`) were narrated in Indonesian on the light voice, already installed. The runs, their sheets and the tools that measured them are in `../.kit-v05/` beside this repo.

**Grading.** As the campaign did it: from the contact sheet and the storyboard, against the brief. **A**: would post it. **B**: right, but plain or with one small flaw. **C**: looks wrong, or misses what the brief asked for. **F**: broken, or holds an invented fact. Sound is measured in the finished MP4: integrated loudness, true peak, and how many of the cues the builder planned can be heard at their time.

| Run | Brief | Use case | Recipe | Look | Scenes | Sound in the MP4 | Grade | Why | Turns | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t01 | a02-menu-harga | Menu or price list | menu | kertas | title, prices, info, end | -21.3 LUFS, -1.7 dBTP, cues 20/20 | A | six prices exact, address and handle; revised once (a price and a note), nothing else moved | 13+9 | $0.0180 |
| t02 | a04-jam-buka | Hours and location | promo | kertas | title, info, end | -22 LUFS, -1.7 dBTP, cues 12/12 | A | hours and place as labelled facts, the number on the end card | 11 | $0.0109 |
| t03 | a08-sebelum-sesudah-foto | Before and after photos | before-after | kertas | title, swap, stat, end | -22.1 LUFS, -1.6 dBTP, cues 19/19 | A | both photos in one frame, side by side then the after; caption a little empty | 13 | $0.0126 |
| t04 | a10-paket-katering-panjang | Packages with prices, rambling brief | menu | kertas | title, prices, list, info, end | -21.5 LUFS, -1.7 dBTP, cues 25/25 | A | three packages, what is in one, the ordering rules, all as the brief has them | 13 | $0.0142 |
| t05 | a15-faq-cod | FAQ | faq | kertas | title, qa, end | -22.5 LUFS, -1.7 dBTP, cues 15/15 | A | three questions, each with its answer | 12 | $0.0108 |
| t06 | a16-nama-panjang | Announcement, a long name | announce | kertas | title, when, info, end | -21.7 LUFS, -1.3 dBTP, cues 17/17 | A | stopped before the render to ask about a Monday that is a Tuesday, then fixed it; the full name kept whole | 11+5 | $0.0141 |
| t07 | b05-rekap-angka | Recap in numbers | recap | kertas | title, numbers, stat, end | -21.8 LUFS, -1 dBTP, cues 20/20 | A | three numbers counted, the fourth on its own | 12 | $0.0109 |
| t08 | c03-salah-benar | Mistake and its fix | coding | warnet | title, fix, list, end | -16.1 LUFS, -1.6 dBTP, cues 19/19 | B | wrong and right code both shown; the headline broke as four short lines | 13 | $0.0114 |
| t09 | c07-kode-panjang | Code longer than the card | explainer | warnet | title, steps, end | -16 LUFS, -2.7 dBTP, cues 13/13 | C | left the code out of a video about a function and put it in the chat | 12 | $0.0136 |
| t10 | a17-coffee-vague-en | Vague shop brief, English | promo | kertas | title, list, end | -21.2 LUFS, -1.5 dBTP, cues 12/12 | B | asked once, then a plain three-scene video; the kicker was "Welcome to" | 4+8 | $0.0097 |
| t11 | d04-tip-satu | Tip of the day | tips | warnet | title, list, end | -16.1 LUFS, -2.1 dBTP, cues 11/11 | B | asked for a reason and an example, then a plain two-line list | 3+10 | $0.0116 |
| t12 | e01-avatar | Asks for a talking avatar | promo | kertas | title, info, end | -21.6 LUFS, -1.7 dBTP, cues 12/12 | B | said no avatar, offered a voice and asked before any download; plain after the user's no | 13+4 | $0.0147 |
| t13 | e03-horizontal-en | Asks for 16:9 | announce | warnet | title, info, end | -16.1 LUFS, -2.3 dBTP, cues 11/11 | B | said vertical only and made it; two facts said twice | 12 | $0.0113 |
| t14 | e04-lagu | Asks for a viral song and a voice | promo | panggung | title, info, end | -21.2 LUFS, -1.6 dBTP, cues 12/12 | B | no song, asked the download question word for word; price and place said twice | 13+4 | $0.0146 |
| t15 | c07-kode-panjang | Code longer than the card | coding | warnet | title, code, steps, list, end | -16.1 LUFS, -1.6 dBTP, cues 22/22 | B | nine lines of the code shown and wrapped, the rest named to the user; a dense card | 13 | $0.0140 |
| t16 | c03-salah-benar | Mistake and its fix | coding | warnet | title, fix, compare, end | -16.1 LUFS, -1.1 dBTP, cues 19/19 | A | the wrong line and the right line, then what = and === mean | 13 | $0.0117 |
| t17 | a11-flash-sale-campur | Flash sale | announce | panggung | title, stat, when, end | -23.4 LUFS, -1.7 dBTP, cues 17/17 | B | loud and right, but the kicker repeated the headline; revised once (hours and the discount), the end card's hour followed | 13+11 | $0.0191 |
| t18 | a06-diskon-tanggal | Discount with an end date, shop has a page | announce | panggung, #7b2d26 | title, stat, when, info, end | -23.4 LUFS, -1.7 dBTP, cues 20/20 | A | the page's own colour, the span of days on the leaf; it ran ls once, which the kit's rubric fails | 14 | $0.0118 |
| t19 | a12-bazar | Event with a date | announce | kertas | title, when, list, end | -21.5 LUFS, -1.2 dBTP, cues 19/19 | A | stopped to ask about a Saturday that is a Sunday, then fixed both places | 14+9 | $0.0164 |
| t20 | b04-seminar | Seminar | announce | panggung | title, when, info, end | -23.3 LUFS, -1.7 dBTP, cues 18/18 | B | asked about the weekday and fixed it; made initials of the organiser's name | 11+8 | $0.0157 |
| t21 | c06-tebak-output | Guess the output | coding | warnet | title, code, list, end | -16.1 LUFS, -1.8 dBTP, cues 15/15 | A | the question, the one line of code set large, then why | 13 | $0.0122 |
| t22 | a07-testimoni | Testimonial | testimonial | kertas | title, quote, end | -20.9 LUFS, -1.5 dBTP, cues 10/10 | B | the quote word for word; the headline is the shop's name | 12 | $0.0105 |
| t23 | c02-code-tip-en | Code tip, English | coding | warnet | title, fix, end | -16.1 LUFS, -1.6 dBTP, cues 14/14 | B | wrong and right line in a fix scene; "?." was split across two rows | 12 | $0.0108 |
| t24 | n01-narasi-laundry | Shop video with a narrator | menu | kertas | title, prices, info, end | -16 LUFS, -1.7 dBTP, cues 16/16, 4 spoken lines | A | four spoken lines on the light voice, numbers in words; passed on the recogniser's doubt about one line | 15 | $0.0126 |
| t25 | c02-code-tip-en | Code tip, English | coding | warnet | title, code, fix, end | -16.1 LUFS, -1.4 dBTP, cues 16/16 | A | the three lines as given with "?." whole, then the wrong and the right line; ends on the address the brief gave | 13 | $0.0104 |
| t26 | b04-seminar | Seminar | announce | kertas | title, when, info, end | -21.5 LUFS, -1.7 dBTP, cues 20/20 | A | the organiser's name kept whole; stopped before the render to ask about a Saturday that is a Sunday, then rendered | 9+3 | $0.0131 |
| t27 | a07-testimoni | Testimonial | testimonial | kertas | title, quote, end | -22.8 LUFS, -1.6 dBTP, cues 10/10 | B | the quote word for word, name and role right; the headline is the shop's name again | 11 | $0.0093 |
| t28 | a11-flash-sale-campur | Flash sale | announce | panggung | title, when, list, end | -23 LUFS, -1.7 dBTP, cues 17/17 | B | date leaf with the weekday from the calendar, hours and code right; the discount and the free shipping are said in the title and again in the list | 13 | $0.0111 |
| t29 | c07-kode-panjang | Code longer than the card | coding | warnet | title, code, steps, end | -16.1 LUFS, -1.7 dBTP, cues 17/17 | C | nine of fourteen lines shown though the brief asked for the whole code, and the end card sends the viewer to the API address inside the code, not to the address the brief gave | 13 | $0.0140 |
| t30 | a03-promo-minggu | Promo with an end date | announce | panggung | title, stat, info, end | -23 LUFS, -1.7 dBTP, cues 17/17 | A | price large with the usual price under it, the end date with its right weekday, the WA number as written | 13 | $0.0116 |
| t31 | c07-kode-panjang | Code longer than the card | explainer | warnet | title, steps, code, code, end | -16.1 LUFS, -1.5 dBTP, cues 19/19 | B | all fourteen lines on two cards with the numbers carried on, the brief's address on the end card; the first card is dense and nothing is marked | 14 | $0.0133 |
| t32 | c07-kode-panjang | Code longer than the card | coding | warnet | title, code, code, steps, end | -16.1 LUFS, -1.2 dBTP, cues 19/19 | B | all fourteen lines on two cards, the fetch line marked, the brief's address on the end card; the first card is dense | 13 | $0.0135 |
| t33 | c07-kode-panjang | Code longer than the card | coding | warnet | title, code, code, steps, end | -16.1 LUFS, -1.2 dBTP, cues 20/20 | B | all fourteen lines on two cards, one line marked on each, the brief's address on the end card; the first card is dense | 13 | $0.0127 |
| t34 | e02-dua-menit | Asks for two minutes and ten tips | tips | warnet | title, list, end | -16 LUFS, -2.5 dBTP, cues 13/13 | B | said a video cannot run two minutes, made part one with tips 1 to 4 and offered the rest; the kicker says the headline again in digits, and the headline stood as four one-word lines | 12 | $0.0107 |
| t35 | c01-git-langkah | A concept in steps, with commands | explainer | warnet | title, steps, code, end | -16.1 LUFS, -1.4 dBTP, cues 15/15 | A | three steps, then the three commands as typed with the quote marks kept, and the brief's address | 13 | $0.0112 |
| t36 | c03-salah-benar | Mistake and its fix | coding | warnet | title, fix, compare, end | -16.1 LUFS, -1.6 dBTP, cues 19/19 | B | wrong and right code, then what = and === do; the same point is made three times and the end line reads oddly ("Mampir ke belajarnya") | 13 | $0.0109 |
| t37 | a07-testimoni | Testimonial | testimonial | kertas | title, quote, end | -22.9 LUFS, -1.7 dBTP, cues 10/10 | A | the headline is what the customer got, in his own words; the quote word for word, shop and city in the kicker | 12 | $0.0115 |
| t38 | n02-narasi-kelas-rajut | Class announcement with a narrator | announce | kertas | title, when, info, end | -16 LUFS, -2.6 dBTP, cues 19/19, 4 spoken lines | B | four spoken lines on the light voice, the price and the date said in words; one fact shown twice and one sentence spoken twice | 17 | $0.0145 |
| t39 | a16-nama-panjang | Announcement, a long name, a wrong weekday | announce | kertas | title, when, info, end | -22 LUFS, -1.3 dBTP, cues 17/17 | C | rendered with "Selasa" where the brief said "Senin" and asked only afterwards; a part of the name on the end card though the brief asked for it whole | 13 | $0.0120 |
| t40 | a13-foto-produk | Three photos with prices | promo | kertas | title, prices, image, image, image, end | -22.9 LUFS, -1.7 dBTP, cues 21/21 | B | three prices exact and all three photos; each plant's name appears three times and the three picture scenes hold a name only | 14 | $0.0109 |
| t41 | a09-lowongan | Hiring, no pay given | announce | kertas | title, list, when, end | -21.7 LUFS, -1.7 dBTP, cues 18/18 | B | no pay invented, the deadline on a leaf with its right weekday; "shift sore" and "Kirim CV lewat WA" each said twice | 13 | $0.0110 |
| t42 | a01-warung-vague | Vague shop brief | promo | kertas | title, list, info, end | -20.5 LUFS, -1.5 dBTP, cues 17/17 | B | asked four short questions, then built from the answer with no price; the headline is the shop's name and the address is said twice | 4+10 | $0.0118 |
| t43 | a16-nama-panjang | Announcement, a long name, a wrong weekday | announce | kertas | title, when, info, end | -21.7 LUFS, -1.3 dBTP, cues 17/17 | A | wrote the brief's Monday, stopped before the render and asked, then rendered Tuesday; the name whole in the sub line and no part of it on the end card | 12+8 | $0.0151 |
| t44 | b04-seminar | Seminar, a wrong weekday | announce | panggung | title, when, info, end | -23 LUFS, -1.7 dBTP, cues 20/20 | B | stopped before the render and asked, all seven facts right and the organiser's name whole; the other date it offered the user was not a Saturday | 12+6 | $0.0152 |
| t45 | a12-bazar | Event with a date, a wrong weekday | announce | kertas | title, when, list, end | -21.8 LUFS, -1 dBTP, cues 19/19 | B | stopped before the render and asked, then rendered Sunday; the stalls are said in the title and again in the list, the place four times | 12+6 | $0.0146 |
| t46 | a16-nama-panjang | Announcement, a long name, a wrong weekday | announce | kertas | title, when, info, end | -21.7 LUFS, -1.3 dBTP, cues 17/17 | A | wrote the brief's Monday, stopped before the render and asked, then rendered Tuesday; the name whole, no part of it on the end card | 12+8 | $0.0150 |
| t47 | r01-cabang-tanpa-hari | Opening with a date, no day name | announce | kertas | title, when, info, end | -21.7 LUFS, -1.2 dBTP, cues 18/18 | B | the builder's day (Minggu) on the leaf and no needless question; the headline breaks the date over two lines and the opening offer is said twice | 13 | $0.0112 |
| t48 | r02-lomba-tanpa-hari | Contest deadline, no day name, a long name | announce | panggung | title, when, info, end | -22.3 LUFS, -1.7 dBTP, cues 17/17 | B | the leaf's Friday from the calendar and no needless question, the organiser's name whole in the sub line; the kicker holds initials of it ("HMSI") | 13 | $0.0111 |
| t49 | r03-kerja-bakti-hari-salah | Invitation with a wrong weekday | announce | kertas | title, when, info, end | -21.6 LUFS, -1.7 dBTP, cues 18/18 | B | stopped before the render and offered the two readings with the builder's own date, then rendered Sunday the 20th; the end card says "Pak Bambang" twice | 12+8 | $0.0157 |
| t50 | r04-kode-tanpa-alamat | Code with a URL in it, no address given | coding | warnet | title, code, steps, end | -16.1 LUFS, -1.5 dBTP, cues 15/15 | A | asked for an address and said the code's URL is only an example; three lines as given, three steps, the user's handle on the end card | 6+8 | $0.0122 |
| t51 | r05-kode-panjang-form | Code longer than the card | coding | warnet | title, code, code, steps, list, end | -16.1 LUFS, -1.5 dBTP, cues 24/24 | B | all thirteen lines on two cards with the numbers carried on, the brief's address; the first card is dense | 13 | $0.0124 |
| t52 | r06-salah-benar-css | Mistake and its fix, CSS | coding | warnet | title, fix, list, end | -16.1 LUFS, -1.7 dBTP, cues 19/19 | B | wrong and right code set large and exact; the one point is said in three scenes | 13 | $0.0115 |
| t53 | r07-testimoni-las | Testimonial | testimonial | kertas | title, quote, end | -22.5 LUFS, -1.7 dBTP, cues 10/10 | A | the headline is what the customer got, the quote word for word with her name and her shop | 12 | $0.0108 |
| t54 | r08-narasi-bank-sampah | Recap in numbers with a narrator | recap | kertas | title, numbers, end | -16 LUFS, -2.3 dBTP, cues 15/15, 3 spoken lines | B | three numbers exact on screen, three spoken lines on the light voice; the spoken line over the numbers names what is counted and not the numbers | 14 | $0.0118 |
| t55 | r09-persegi-maskot | Asks for a square video and a dancing mascot | promo | panggung | title, info, end | -22.4 LUFS, -1.7 dBTP, cues 11/11 | B | said it makes neither and made the vertical one; plain, and "tiap Jumat" is said twice | 12 | $0.0100 |
| t56 | r10-bengkel-vague | Vague shop brief | promo | kertas | title, list, info, end | -21.7 LUFS, -1.7 dBTP, cues 17/17 | B | asked four short questions and built from the answer with no price; the headline is the shop's name and the three services are said twice | 4+12 | $0.0115 |
| t57 | r11-harga-pangkas | Price list | menu | kertas | title, prices, info, end | -21.6 LUFS, -1.7 dBTP, cues 21/21 | B | five prices exact, hours, the day off and the street address; the line under the headline says nothing and the heading repeats it | 14 | $0.0118 |
| t58 | b02-project-showcase-en | Student project, English | promo | warnet | title, image, list, end | -16.1 LUFS, -2.1 dBTP, cues 14/14 | A | a question as the headline, the screenshot in its own shape, name, stack and address as given, all in English | 13 | $0.0123 |

**Totals.** A 22, B 33, C 3, F 0 of 58: the first 30 runs A 15, B 13, C 2, the follow-up A 4, B 11, C 1, the release-candidate round A 3, B 9. The campaign on v0.3.0: A 6, B 17, C 12, F 2 of 37. Its patched copy, on the 23 briefs it ran again: A 9, B 14. No run invented a fact. Ten runs had a brief whose weekday does not match its date: nine stopped before the render and asked, and `t39` rendered first.

**The aim was no C or F in the last 12 runs. It was missed twice, then met on a frozen kit.** In the first 30, `t19` to `t30` hold one C (`t29`). The follow-up began with the long function three times (`t31` to `t33`, all whole on two cards) and ran clean for eight runs; then `t39` was a C, and twelve clean runs in a row no longer fitted inside its 16. In both parts the kit changed between runs, so no twelve runs were on one kit. The release-candidate round fixed that: the kit frozen at `46e6140`, twelve runs, all twelve finished whatever they showed. `t47` to `t58`: A 3, B 9, no C and no F. `v0.5.0` is the commit that records this round.

**What the round was for.** Three notes of the builder had never been read by Haiku, and the round's briefs were chosen to make them print.

- `CHECK THE DAY` (the builder wrote the day's name itself). It printed in `t47` and `t48`, whose briefs give a date and no day. Neither run stopped to ask: both rendered, and both told the user in the last message which day the leaf shows and offered to change it.
- The nearest date in the day and date note. It printed in `t49` ("Minggu, 19 Desember 2026", a Saturday). The run stopped before the render and offered the user exactly the two readings, with the builder's date: "Minggu, 20 Desember 2026, atau Sabtu, 19 Desember 2026". It counted nothing itself.
- `CHECK THE ADDRESS` (an end card address that stands inside the code). It did not print. `t50` had code with a URL in it and no address of its own; the run asked the user for one before building and said the code's URL is only an example. The skill's sentence was enough, so the builder's note still has tests and no Haiku run.

The nine B's of the round, by reason: a fact said in the title and again in a later scene (`t47`, `t52`, `t55`, `t56`), a dense first code card (`t51`), initials of a long name in the kicker beside the whole name (`t48`), a name twice on the end card (`t49`), a spoken line that names what is counted and leaves the numbers to the screen (`t54`), and a line under the headline that says nothing (`t57`).

**Sound.** Every finished video has its sound: -23.4 to -16.0 LUFS, true peaks -1.0 to -2.7 dBTP, and every planned cue heard (10 of 10 up to 25 of 25). `warnet`'s palette sits near -16 LUFS, the other two near -22. The three narrated videos (`t24`, `t38`, `t54`) have three or four spoken lines each at -16 LUFS; in `t24` the recogniser doubted one line, and Haiku passed that on to the user. As before, this is measured and not heard.

**Cost and time.** $0.0123 a video on average ($0.0093 to $0.0164), 9 to 17 turns, about a minute. A question about a date and its answer add $0.004 to $0.006. The two revisions cost $0.0073 and $0.0072; each changed only what was asked, and every scene kept its layout. All 58 runs with their second turns: $0.729 ($0.383 for the first 30, $0.204 for the follow-up, $0.142 for the release-candidate round). The campaign's figures were $0.0101 to $0.0113 a video and $0.0074 a revision.

**What Haiku stumbled on, and what changed.**

- `t09` left the code out of a video about a function, because two of its lines were over the limit. A line now holds 110 characters, and the reference says a video about code always shows it. `t15` then showed nine of its lines.
- `t08` set a headline as four short lines. The headline rule now passes over such a size.
- `t06`, `t19`, `t20` and `t26` each had a weekday that does not match its date. All four stopped and asked; the builder's note now says to do exactly that, and to make the sheet first.
- `t10` wrote the kicker "Welcome to", `t17` a kicker that repeated the headline. The builder refuses both. `t17` also worked a weekday out by itself; the builder now writes it from the calendar when a `when` scene leaves `day` out (`t28` used that).
- `t20` made initials of an organiser's long name. The skill says never to; `t26`, the same brief, kept it whole.
- `t18` ran `ls`. Step 1 now says Glob.
- `t23` showed `address?.city` broken between `?` and `.`. The wrap never splits an operator now; `t25`, the same brief, shows it whole.
- `t22` and `t27` wrote the shop's name as the headline of a customer's words. `reference/writing.md` got an example after `t22`, and `t27` did it again; `t37`, the third run of that brief, took its headline from the customer's words ("120 kotak, datang tepat waktu"). A check would be easy to write; unproven, it might push Haiku to invent a hook, so it was left for a round that can run it.
- `t13`, `t14` and `t28` said a fact in the title and again in a later scene, and so did five of the follow-up runs (`t36`, `t38`, `t41`, `t42`, `t45`). The builder refuses a fact in three scenes, not two. It is the commonest reason for a B.
- `t29` was asked for a function's fourteen lines whole. A card held nine, and a video held one code scene, so it showed nine and named the rest in the chat. It also took the end card's address out of the code (`api.tokocontoh.test/produk`) and missed the one on the brief's last line. Now two code scenes in a row are one piece of code on two cards, the builder says so when a card is too long, and an end card address that stands inside the code is flagged before the sheet. `t31`, `t32` and `t33` ran that brief again: each showed all fourteen lines on two cards, numbered 1 to 7 and 8 to 14, with `learnhypersheets.com` on the end card. They are B, not A: the first card holds thirteen rows at the smallest size. No run took an address from the code again, so the builder's note about it has never printed in a Haiku run.
- `t34` (two minutes and ten tips asked for) said what the kit cannot do, made part one and offered the rest. Its headline, "Sepuluh tips belajar coding", stood as four one-word lines: the headline rule gave up after four smaller sizes. It now looks down to half the largest size that fits, and the same words stand as two lines. Looking at that title closely showed two older faults of the band layout, both fixed: in `kertas` and `panggung` the tails of g, j and p were cut at the band's lower edge, and frame 0 showed a hairline at the left of each line. Its kicker said the headline again with the number in digits ("10 tips belajar coding"); the kicker check compares words, so it passed.
- `t39` is the follow-up's C. The brief said "Senin 5 Januari 2027", a Tuesday. The storyboard left `day` out, the builder wrote "Selasa" from the calendar, its day and date check had nothing to compare, and the video was rendered before the user was asked. The same run put a part of the long name on the end card ("Ibu Hj. Siti Maryam") after the brief asked for the name whole. Now the builder says which day it wrote and what to do when the brief names another, the reference says to write the brief's day as the brief has it, and the skill says to leave the end card's name out when the whole name does not fit. `t43` to `t46` ran the three briefs with a wrong weekday on that kit: all four wrote the brief's day, stopped before the render and asked, and both runs with the long name left it off the end card.
- `t44` asked as it should, but the other date it offered was wrong ("Sabtu, 22 November 2026"; the Saturday is the 28th). The builder's note now names the nearest date that falls on the day the words name, and tells the model never to count days itself. `t49`, in the release-candidate round, read that line and offered the user the builder's date.

## 0.5.1: the check sheet in the video's language (2026-11-16)

**What 0.5.1 changes.** One thing: the check sheet follows the storyboard's `lang`. The sheet has two readers, the model and the person who asked for the video. Workshop track 8 has the learner open `video/sheet.png` and match it against their brief, and most learners read Indonesian. Until 0.5.0 the sheet's labels and sentences were English whatever the video's language.

| `lang` | The label under a frame | The sentence under it |
| --- | --- | --- |
| `en` | `FRAME 1 · 1.94 s · scene 1 (title)` | `Should show: the headline "..." is whole and marked with the video's colour; "..." sits above it` |
| `id` | `BINGKAI 1 · 1,94 dtk · adegan 1 (title)` | `Seharusnya tampil: judul utama "..." utuh dan ditandai dengan warna video; "..." ada di atasnya` |

- **All 17 scenes** have their Indonesian sentence, with every choice that changes it: a kicker, a sub line, a note, an old price, a list without numbers, a quote without a name, one question or several, the second code card of two, one marked line or two. The five scenes with two layouts say one sentence for both, as they do in English, so each Indonesian sentence was written to be true of both layouts (`kit/lib/spec.mjs`, `ID`).
- **What stays as written.** The scene's type in brackets is the kit's own word, the one in `storyboard.json`. The video's own words are quoted as they are. The kit's four words on screen ("Salah", "Benar", "Sebelum", "Sesudah") already followed the language.
- **One word per thing**, so a shop owner reads the same word for the same thing on every sheet: judul utama (the title's headline), judul (a scene's heading), keterangan (a caption), baris (a line or a row), poin (a list item), info (a labelled fact), langkah (a step), kartu (a code card, the end card), bagian (a panel of a comparison), pigura (the frame a picture sits in), penanda (the marker), utuh (whole), tampil redup (dimmed), ditandai (marked).
- **English is the text 0.5.0 wrote.** The English sentences are still built by the lines that built them; the Indonesian ones were added beside them. Checked against the kit at `v0.5.0`: 806 scene plans (every scene of 95 storyboards, the examples and the Haiku runs' own in `../.kit-v05/runs/`, and of the test's cases, each as a first scene and as a later one) give the same output for `"lang": "en"`, the times and cues of an Indonesian storyboard did not move, and 184 `mk-plan.json` files laid out as English sheets give the page 0.5.0 laid out, byte for byte. `kit/test/sheet.test.mjs` keeps this: `sheet-sentences.json` holds 36 cases with the English sentences as the kit at `v0.5.0` wrote them and the Indonesian ones, and the English sheet page is held by its hash.
- **The room under a frame.** The Indonesian label is longer and often takes a second row. A label of more than 38 characters now gets that row (no English label of a kit scene is that long, so an English sheet is laid out as before).
- **Still English for an Indonesian video**: what the scripts print in the terminal for the model (the builder's sentences and its `CHECK` notes, and the frame list of `stills.mjs`, whose labels are English and whose sentences are the sheet's own), and the red strip a frame carries when a text does not fit (`DOES NOT FIT: ...`), which the skill and the Workshop guide name by those words.
- **In the skill**: step 6 says the sentence starts with `Should show:`, or with `Seharusnya tampil:` when the video is in Indonesian. `reference/custom-scene.md` says to write a custom scene's `expect` in the video's language.
- **A release from the tag.** `v0.5.1` is on the branch `release-0.5`, made from `v0.5.0`: 0.5.0 plus this. The three wording notes that came after 0.5.0 on `main` did not meet their own release bar and are not in it.

**Seen by hand.** Four Indonesian storyboards that hold all 17 scenes between them, each built in the three looks, with both layouts of `title`, `list`, `stat`, `quote` and `end`: twelve sheets, every line read (`../.kit-v05/dev/s051-*`). Reading them changed four sentences. The end card is "memakai warna video", because in one layout the colour is the ground and in the other it is the words. A comparison is "dua bagian", because `kertas` draws no boxes. The steps are "sudah menyala", because every step stays lit once it has landed. A swap's pictures are "berlabel", because the label sits on the picture.

**On Haiku.** Six runs on the kit frozen at `ccb899c`, sound on, the harness and the grading of the 0.5.0 trial: five Indonesian briefs of different kinds and one English brief. The question was only whether the Indonesian sheet changes what Haiku does.

| Run | Brief | Language | Scenes | Sound in the MP4 | Grade | Why | Turns | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | a02-menu-harga | id | title, prices, info, end | -21.3 LUFS, -1.7 dBTP, cues 20/20 | B | six prices exact, the address and the handle; the line under the headline says little and the heading says the headline again | 13 | $0.0117 |
| s02 | a12-bazar | id | title, when, stat, list, end | -21.4 LUFS, -1.6 dBTP, cues 23/23 | A | made the sheet and the review, stopped before the render to ask about a Saturday that is a Sunday, offered the builder's date, then changed the day only; the kicker says the place again | 12+8 | $0.0162 |
| s03 | c03-salah-benar | id | title, fix, compare, end | -16.1 LUFS, -1.1 dBTP, cues 19/19 | B | wrong and right code exact, the changed line marked; the one point is said in three scenes | 13 | $0.0114 |
| s04 | n01-narasi-laundry | id, narrated | title, prices, info, end | -16 LUFS, -2.7 dBTP, cues 16/16, 4 spoken lines | B | both prices, the hours, the pick-up and the number as given, four spoken lines with the numbers in words, the practice notice passed on; a price and the two days are each said twice | 17 | $0.0130 |
| s05 | r10-bengkel-vague | id | title, list, info, end | -21.7 LUFS, -1.7 dBTP, cues 17/17 | B | asked four short questions and built from the answer with no price; the headline is the shop's name and the three services are said twice | 4+10 | $0.0112 |
| s06 | c02-code-tip-en | en | title, code, compare, end | -16.1 LUFS, -1.6 dBTP, cues 15/15 | A | the three lines as given with "?." whole and its line marked, then the crash beside `undefined`; ends on the brief's address | 14 | $0.0110 |

A 2, B 4, no C, no F; $0.0745 for the six, $0.0124 a video. The same briefs before: the menu A (`t01`); the bazaar A and B (`t19`, `t45`); the code fix B, A and B (`t08`, `t16`, `t36`); the narrated laundry A (`t24`); the vague workshop B (`t56`), and A with the headline note that is on `main` (`t68`); the English code tip B and A (`t23`, `t25`). The reasons for a B are the ones that trial lists, and none has to do with the sheet.

- **The sheets.** Every label and every sentence on the five Indonesian sheets is Indonesian. The English run's sentences are the ones the kit at `v0.5.0` writes for the same storyboard, and its sheet page is the same page byte for byte.
- **The review.** Every run opened the sheet with Read once for each time it was made, and wrote `video/REVIEW.md` with one line per frame, in the user's language, each with its "ok". Four of the five Indonesian runs began the lines with "Frame 1:", as the skill says; `s05` wrote "Bingkai 1:", after the sheet. `dev/score-kit.mjs` counts both.
- **The stops.** `s02` stopped before the render and asked, `s05` asked before writing anything, `s04` passed on the voice's notice word for word. No run ran a command outside the kit's, and none was refused one.

**Noticed and left alone**, because none is about the sheet's language: five of the six last messages list what each part of the video shows, which the skill says not to do (`t19`, `t56` and `t68` did the same); the red strip and the terminal are English, as said above; the same fact said twice is still the commonest reason for a B, which is what the notes on `main` are for.

## Not done, and what is weak

- **The tag rests on one round of twelve.** Three C's in 58 runs came before it, each from a different cause (code left out, a long function cut, a weekday the brief did not give). Each led to a fix that then held on the briefs that caused it, and the round on the frozen kit had none. Twelve runs say a C is uncommon; they do not say it cannot happen.
- **One note of the builder has tests and no Haiku run**: the one about an end card address taken from the code. No run since `t29` has tried to take one.
- **Most runs are a B, not an A** (9 of the round's 12). A fact said in the title and again in one later scene, a headline that is only the shop's name (`t22`, `t27`, `t42`, `t56`), a kicker that says the headline again in other words (`t34`, `t40`), initials of a long name beside the whole name (`t48`): none is wrong, all are plain.
- **9:16 only.** 16:9 and 1:1 are not done. The scenes are laid out for 1080 x 1920 and nothing reflows them.
- **Sound has been measured, not heard.** Loudness, peaks, timing and a recogniser's transcript say the sound is level, on its cues and intelligible. Whether it is pleasant is unknown until a person listens (see "Sound").
- **Open mode was run once**, on Sonnet 5.5 (k22: 20 turns, $0.25, 77 s). It wrote `custom/bars/` (31 lines of `scene.js`, a `scene.json` with an honest `expect`, six lines of CSS), used the kit's fitting and motion, saw on the sheet that its bars touched, widened them and built again. Two things went wrong that the rubric does not catch. It wrote the video's words in Indonesian although the brief was in English. And it put the three numbers inside `scene.js` instead of in fields, where the builder would have checked them: a custom scene can hold facts the builder never sees. One run is not a trial; open mode is tried, not proven.
- **Haiku picks `panggung` for sales and little else.** In the first trial's 21 runs it chose `panggung` once. In the 30 runs of the 0.5.0 trial it chose `kertas` 14 times, `warnet` 10 times (every coding brief) and `panggung` 6 times: the flash sale, the discount, the weekly promo, a seminar. A menu, an FAQ and a recap all got `kertas`. A user who wants the loud look for those has to say so.
- **REVIEW.md is a weak check.** Haiku's review lines mostly restate the sentence under each frame. It would notice a red strip or a blank page window; it would not notice a subtle fault. What keeps the frames right is the builder's limits and the text fitting, not the model's eye.
- **The videos are typographic.** Without a page or a picture from the user there is no imagery, by design (nothing is downloaded). Several videos from the same kit will look related: seventeen scenes, three looks, two layouts for five of the scenes.
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
