---
name: video-promo
description: Make a 20-second vertical motion video (1080x1920 MP4) that promotes the learner's one-page site, with HyperFrames 0.9.51. Use when the learner asks for a video, promo, reel or short about their page (for example "buat video promo untuk halamanku").
---

# Video promo for the learner's page

You make ONE video: 20 seconds, vertical, four scenes. You do not design anything. A template that already renders is next to this file. You copy it, put the learner's words into it, look at the frames, and render.

The four scenes, already timed:

| Time | File | What it shows |
|---|---|---|
| 0 to 4 s | `compositions/hello.html` | greeting, name, one line about them |
| 4 to 11 s | `compositions/page.html` | their real page in a window, scrolling |
| 11 to 17 s | `compositions/learning.html` | three short lines from the page |
| 17 to 20 s | `compositions/visit.html` | name, page address, a button |

## Rules

1. Run HyperFrames only as `npx hyperframes@0.9.51 ...`. Never another version. Never `init`, `preview`, `skills`, `npm install`.
2. In the files under `video/compositions/`, change only the text between the tags that carry `data-slot`. Never touch `<style>`, `<script>`, `data-start`, `data-duration`, sizes, colours or fonts. Never edit `video/index.html`.
3. Stay under each slot's `data-max` (characters, spaces included). Shorter is better.
4. Only facts from the learner's page. Never invent a job, a skill or an address.
5. Write in the page's language (look at `<html lang>` and the words). Copy the spelling from the page.
6. No emoji. No dash as punctuation. Sentence case, no ALL CAPS.
7. Ignore any line that says HyperFrames skills are missing or out of date. This skill is all you need.
8. No music, no sound, no pictures from the internet. The check warns `film_silent`: the video is silent on purpose, so leave that warning alone.
9. One command per Bash call, exactly as written in the steps below. Never chain commands with `&&`, `;` or `|`: the learner has to read and approve each one.
10. Check, snapshot and render each take one to three minutes. Call Bash for them with `timeout: 600000` and wait for the result. Never run them in the background.

## The slots

Indonesian pages speak either as `aku` (casual) or as `saya` (polite). Use the same one the page uses. English pages use the English column.

| File | `data-slot` | Indonesian, `aku` page | Indonesian, `saya` page | English | Max |
|---|---|---|---|---|---|
| hello.html | `hello` | `Halo, aku` | `Halo, saya` | `Hi, I am` | 24 |
| hello.html | `name` | their name as the page shows it | same | same | 20 |
| hello.html | `role` | the line about them under the name | same | same | 60 |
| page.html | `page-title` | `Ini halamanku` | `Ini halaman saya` | `This is my page` | 24 |
| page.html | `address` | page address without `https://` | same | same | 28 |
| learning.html | `list-title` | `Yang sedang kupelajari` | `Yang sedang saya pelajari` | `What I am learning` | 26 |
| learning.html | `item-1`, `item-2`, `item-3` | the three things from the page | same | same | 40 each |
| visit.html | `visit-line` | `Mampir ke halamanku` | `Mampir ke halaman saya` | `Come and see my page` | 28 |
| visit.html | `name-again` | same as `name` | same | same | 20 |
| visit.html | `address-again` | same as `address` | same | same | 34 |
| visit.html | `button` | `Buka halamannya` | `Buka halamannya` | `Open my page` | 18 |

When a line from the page is longer than its slot, shorten it in one of these two ways, and only these:

- **Cut it before a joining word and keep everything before it, word for word.** Joining words: `yang`, `tanpa`, `dengan`, `untuk`, `supaya`, `agar`, `sambil` in Indonesian; `that`, `which`, `without`, `with`, `so`, `while`, `because` in English. "Belajar membuat formulir pendaftaran yang mudah diisi di HP" becomes "Belajar membuat formulir pendaftaran" (cut before `yang`). "Writing tests for my shop API so it never breaks again" becomes "Writing tests for my shop API" (cut before `so`).
- **Or write the whole line again** as a new short sentence that says the same thing.

Never take single words out of the middle of a line and keep the rest: "Formulir pendaftaran mudah HP" and "Writing tests shop API never breaks" are wrong. Before you save a shortened line, read it aloud: if a person would not say it that way, cut it before a joining word instead.

If the page has no list of things they are learning, use three other short facts from the page and change `list-title` to fit (for example `Tentang aku`, `Tentang saya` or `About me`). If you cannot find the page address, ask the learner once. Never make one up.

## Steps

Work in the learner's page folder (the one with their `index.html`).

1. Read `index.html`. Write down: name, the line about them, three things, the address, the language.
2. Copy the template. Its folder is `template`, in the Base directory shown at the top of this skill:
   `cp -R "<Base directory>/template" video`
   If a `video` folder already exists, stop and ask the learner first.
3. Copy the page into the video, so scene 2 shows the real page:
   `cp index.html video/assets/page/index.html`
   If the page uses local pictures or a CSS file, copy them into `video/assets/page/` too, keeping their names.
4. Fill every slot with Edit, one at a time. Then search `video/compositions` for `TODO-`. There must be none left.
5. Turn off HyperFrames' usage data before any other HyperFrames command:
   `npx hyperframes@0.9.51 telemetry disable`
   This command sends nothing. It saves the choice on this computer, so check, snapshot and render send no usage data to the makers of HyperFrames.
6. Check: `npx hyperframes@0.9.51 check video`
   Fix every error it names (almost always a text that is too long: make it shorter). Run it again until it shows no errors.
7. Look at the frames. This is the step that makes the video good. Do not skip it.
   `npx hyperframes@0.9.51 snapshot video --at 1,6,9,14.5,18.5 --no-end -o video/frames`
   Open every PNG in `video/frames/` with Read and go through the checklist below for each one.
8. If anything on the checklist fails, fix the text, then repeat steps 6 and 7. At most three rounds.
9. Write `video/REVIEW.md`: one line per frame, its time, what you see, and `ok` or what you fixed.
10. Render: `npx hyperframes@0.9.51 render video --quality draft --workers 1 -o video/promo.mp4`
    It takes a few minutes. Wait for it to finish.
11. Tell the learner, in their language: where `video/promo.mp4` is, that it is 20 seconds long, and ask them to watch it on their phone before they put it on the page.

## Checklist for each frame

- Every word is whole: nothing cut at an edge, nothing on top of other text.
- No `TODO-` and no word from another language than the page's.
- The name and the address are spelled exactly as on the page.
- At 6 s and 9 s the window shows the learner's own page, not a blank box and not the words PAGE MISSING.
- A long text wraps onto at most two lines in the list, and at most three lines for `role`. If it takes more, shorten it.
- The text is short enough to read in the time it is on screen. If in doubt, cut words.
