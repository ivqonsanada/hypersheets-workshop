---
name: motion-kit
description: Make a short vertical motion video (10 to 30 seconds, 1080x1920 MP4) from a brief by writing one storyboard file for a kit of ready-made scenes, with HyperFrames 0.9.51. Use when the user asks for a video, promo, reel, short, announcement, explainer, tip list, coding short, testimonial or before/after video (for example "buat video promo untuk tokoku" or "make a short that explains flexbox"). The scenes, looks and motion are built into the kit: this skill chooses and writes, it does not design.
---

# Motion kit

**Which mode.** If you are Claude Haiku, use kit mode only: everything in this file. A stronger model (Sonnet, Opus, Fable) also works in kit mode first; only when the user asks for something no kit scene shows may it read `reference/custom-scene.md` and add one or two scenes of its own.

You make ONE video by writing ONE file, `storyboard.json`. The kit turns it into the video. You never write HTML, CSS or animation, and you never judge layout by eye alone: the builder counts every text for you and the contact sheet tells you what each frame should show.

## Rules

1. **Facts only.** Every name, number, price, date, quote and address comes from the brief, the user's files or the user's answer. Never invent one. If a scene needs a fact you do not have, ask the user once, or leave that scene out.
2. **Only `storyboard.json` is yours.** Never edit anything inside `video/` or inside this skill's folder. To change the video, change the storyboard and build again.
3. **Bash runs three commands and nothing else**, one per call, exactly as written in the steps: the build, the stills, the render. Never chain with `&&`, `;` or `|`. Never `init`, `preview`, `npm install`, or another HyperFrames version. You are already in the user's folder, so no `pwd`, `cd` or `ls`: to see which files are here use Glob, to open one use Read, and write `storyboard.json` and `REVIEW.md` with Write.
4. **Write the video's words in the language of the brief** and set `"lang"` to `"id"` or `"en"`. Copy names and addresses letter for letter, and keep the voice of the brief or the page: where it says `aku`, write `aku`, not `saya`.
5. **Short lines.** When a line is too long, either cut it before a joining word and keep the words before it (`yang`, `dengan`, `untuk`, `supaya`, `tanpa`; `that`, `with`, `so`, `because`, `without`), or write the whole line again, shorter. Never take single words out of the middle.
6. No emoji. No dash as punctuation. Sentence case, no ALL CAPS.
7. The stills and the render each take up to a few minutes. Call Bash for them with `timeout: 600000` and wait. Never run them in the background. Ignore any line that says HyperFrames skills are missing or out of date.

## Steps

Work in the user's folder (for a page, the one with its `index.html`).

1. **Read the brief and the files it names** (the page's `index.html`, a picture). Write down the facts you may use: who or what it is, the address, the numbers, the quotes and who said them, the list of things.
2. **Pick the recipe and the look** from the two tables below.
3. **Write `storyboard.json`.** Open `reference/scenes.md` for the fields and limits of the scenes you use, and `reference/writing.md` for how the lines should read. The example below shows the shape.
4. **Build:** `node "<Base directory>/kit/build.mjs" storyboard.json`
   (`<Base directory>` is the path shown at the top of this skill.) If it lists problems, fix each one in `storyboard.json` and build again, until it prints `OK`.
5. **Tell the user in one sentence** what comes next: the kit runs HyperFrames 0.9.51 through `npx`, turns HyperFrames' usage data off first, and writes only inside `video/`.
6. **Stills:** `node "<Base directory>/kit/stills.mjs"`
   Then open `video/sheet.png` with Read. Each frame has a number, a time and a sentence that says what it should show. Compare every frame with its own sentence.
7. **If a frame is wrong** (a word cut off, words on top of each other, a red strip that says DOES NOT FIT, a wrong or misspelled fact), fix the words in `storyboard.json`, then repeat steps 4 and 6. At most three rounds. The colours, the marker, the motion and the layout belong to the kit: never try to change them.
8. **Write `video/REVIEW.md`** in the user's language, one line per frame: `Frame 1:` then what you see in the picture, in your own words, then `ok` or what you changed. For a page frame, name one thing you can read inside the page's window.
9. **Render:** `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`
10. **Tell the user**, in their language: where `video/video.mp4` is, how many seconds it runs, that it has no sound unless they gave music, and to watch it once on a phone.

## Pick the recipe

| The brief is about | `recipe` | Scenes, in this order |
|---|---|---|
| a person, a page, a shop, a product | `promo` | title, then page or image, then one or two of list, steps, stat, quote, then end |
| something new: a feature, an opening, a date | `announce` | title, then one to three of image, page, stat, list, steps, compare, then end |
| how something works | `explainer` | title, steps, then optionally code, image, compare or list, then end |
| tips or reasons | `tips` | title, list, then optionally stat, quote or image, then end |
| a piece of code | `coding` | title, code, then optionally compare, steps or list, then end |
| what a real person said | `testimonial` | title, quote, then optionally stat, page, image or list, then end |
| a change: before and after, wrong and right | `before-after` | title, compare, then optionally list, stat or image, then end |

Every video opens with `title` and closes with `end`, holds 3 to 6 scenes, and holds one scene of each kind at most. Use a `page` scene when there is a page file, an `image` scene when there is a picture file, a `stat` only for a real number, a `quote` only for real words from a named person.

## Pick the look

| `look` | Looks like | Pick it for |
|---|---|---|
| `warnet` | dark, warm, stepped pixel motion, one colour band | code, tech, learning, anything made at a computer |
| `kertas` | light paper, serif headlines, calm reveals | food, craft, services, people, anything warm or formal |
| `panggung` | one loud colour filling the frame, heavy type, hard cuts | sales, events, openings, anything that should shout |

Colour: with a `page` scene, add `"accent": "page"` and the video takes the page's own colour. If the brief names a brand colour, give it as `"accent": "#0f766e"`. Otherwise leave `accent` out. Do not add `voice` or `music` unless the user asks for sound.

## Example

A promo for a page, in Indonesian:

```json
{
  "recipe": "promo",
  "look": "kertas",
  "lang": "id",
  "accent": "page",
  "scenes": [
    { "type": "title", "kicker": "Halo, saya", "headline": "Wayan Sudiarta", "sub": "Pemandu wisata di Ubud yang sedang belajar membuat web" },
    { "type": "page", "title": "Ini halaman saya", "address": "wayan-sudiarta.pages.dev", "file": "index.html" },
    { "type": "list", "heading": "Yang ada di sana", "items": ["Tiga rute jalan kaki di Ubud", "Harga per orang", "Cara memesan lewat pesan"] },
    { "type": "end", "line": "Mampir ke halaman saya", "name": "Wayan Sudiarta", "address": "wayan-sudiarta.pages.dev", "button": "Buka halamannya" }
  ]
}
```

`examples/` holds one finished storyboard per recipe (`examples/tips.json`, `examples/coding.json`, and so on). Read the one for your recipe only if you are unsure of the shape, and never copy its words: they belong to made-up people.

## When you are stuck

- The builder's sentences are the instructions: do what each one says, then build again.
- `stills.mjs` names a missing tool (Node.js 22, FFmpeg, Chrome): tell the user what is missing and stop. Do not install anything yourself.
- A frame shows `PAGE MISSING` or a blank window: the `file` of the page scene is wrong. Use the page's real file name.
- A `video` folder is already here and the builder refuses: ask the user before anything is replaced.
