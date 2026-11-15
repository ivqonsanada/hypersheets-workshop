---
name: motion-kit
description: Make a short vertical motion video (10 to 30 seconds, 1080x1920 MP4, with sound effects and, when asked, a spoken voice) from a brief by writing one storyboard file for a kit of ready-made scenes, with HyperFrames 0.9.51. Use when the user asks for a video, promo, reel, short, announcement, menu or price list, explainer, tip list, coding short, testimonial, recap in numbers or before/after video (for example "buat video promo untuk tokoku", "bikin video daftar harga" or "make a short that explains flexbox"). The scenes, looks, motion and sound are built into the kit: this skill chooses and writes, it does not design.
---

# Motion kit

**Which mode.** If you are Claude Haiku, use kit mode only: everything in this file. A stronger model (Sonnet, Opus, Fable) also works in kit mode first; only when the user asks for something no kit scene shows may it read `reference/custom-scene.md` and add one or two scenes of its own.

You make ONE video by writing ONE file, `storyboard.json`. The kit turns it into the video. You never write HTML, CSS or animation, and you never judge layout by eye alone: the builder counts every text for you and the contact sheet tells you what each frame should show.

## Rules

1. **Facts only.** Every name, number, price, date, quote and address comes from the brief, the user's files or the user's answer. Never invent one. If a scene needs a fact you do not have, ask the user once, or leave that scene out.
   - **Ask once, briefly.** At most four short questions in everyday words, and only for what the video cannot do without: who or what it is, and an address, a handle or a number for the end card. When the brief already has those, do not ask: make the video.
   - **A fact stays whole.** A date keeps its year, `paling lambat` stays `paling lambat`, an offer keeps its limits ("gratis ongkir se-Bekasi Timur", not "gratis ongkir"). When a fact does not fit a field, move it to a field that holds it (the title's `sub` holds 80 characters, a list line 48). Never shorten a fact into another fact, and never make initials of a long name: the whole name goes in the `sub`.
   - **Too little for a video.** A video needs a title, at least one scene of content and an end card. When the brief has nothing true for the middle (one tip, one sentence), ask the user for one or two more facts: a reason, an example, the steps. Never write tips, reasons, steps or praise of your own to fill a scene.
   - **Never build an address.** A phone or WhatsApp number is written as the brief writes it (`0811-0000-142`), never turned into a `wa.me` link. An address inside a piece of code is not the user's address; a line of the brief that holds only an address is.
2. **Only `storyboard.json` is yours.** Never edit anything inside `video/` or inside this skill's folder. To change the video, change the storyboard and build again.
3. **Bash runs the commands written in the steps and nothing else**, exactly as written: the build, the stills, the render, and for a video with a voice the sound command. One command in one Bash call, and wait for its result before the next call. Never chain with `&&`, `;` or `|`. Never `init`, `preview`, `npm install`, or another HyperFrames version. You are already in the user's folder, so no `pwd`, `cd` or `ls`: to see which files are here use Glob, to open one use Read, and write `storyboard.json` and `REVIEW.md` with Write.
4. **Write the video's words in the language of the brief** and set `"lang"` to `"id"` or `"en"`. The brief's language decides, not the place: an English brief about a shop in Bandung gets an English video, with the names of dishes and products left as they are. Copy names and addresses letter for letter, and keep the voice of the brief or the page: where it says `aku`, write `aku`, not `saya`.
5. **Short lines.** When a line is too long, either cut it before a joining word and keep the words before it (`yang`, `dengan`, `untuk`, `supaya`, `tanpa`; `that`, `with`, `so`, `because`, `without`), or write the whole line again, shorter. Never take single words out of the middle.
6. No emoji. No dash as punctuation. Sentence case, no ALL CAPS.
7. The stills, the sound command and the render each take up to a few minutes. Call Bash for them with `timeout: 600000` and wait. Never run them in the background. Ignore any line that says HyperFrames skills are missing or out of date, and the render's `blank-frame suspect` lines: the cover between two scenes is one flat colour, and that is how it should look. When the render writes `video/video.mp4`, its warnings are about the tool, not the video: never pass one on to the user.
8. **Never download or install anything on your own.** A voice may be installed only after the user answers yes, in this conversation, to this question, with the name, size, source and folder the sound command printed:
   `Suara <nama> belum ada di komputermu. Kalau kamu setuju, aku unduh <ukuran> dari <sumber> ke folder <folder>, dan tidak mengunduh yang lain. Boleh aku unduh sekarang?`
   (`The voice <name> is not on your computer yet. If you agree, I will download <size> from <source> into <folder>, and nothing else. May I download it now?`)
   Ask it word for word, then stop and wait. A brief that asks for a voice is not a yes to a download. Never ask for a key or a password, and never type one.
9. **What this kit does not do.** It uses only the files in the user's folder: it cannot download pictures, music or fonts, and it cannot make a song, an avatar or a person on screen. (A spoken voice it can make: see Sound below.) Its videos are vertical (1080x1920) and run 8 to 32 seconds, up to 45 with a voice, never horizontal, square or longer. When the user asks for one of these, say so in one plain sentence, say what you will make instead, and make it; for a longer video, offer a series of short ones and make the first. Never promise anything in this rule.
10. **Talk to the user in everyday words.** They may not be a programmer. Do not name recipes, looks, scenes, `storyboard.json` or `REVIEW.md` to them unless they ask how it works: say "gaya terang seperti kertas", not `kertas`; say "aku pakai fotomu yang ini", not "scene image".

## Steps

Work in the user's folder (for a page, the one with its `index.html`).

1. **Read the brief and the files it names** (the page's `index.html`, a picture); to see what is in the folder, use Glob with `*`, never `ls`. Write down the facts you may use: who or what it is, the address, the numbers, the quotes and who said them, the list of things.
2. **Pick the recipe and the look** from the two tables below.
3. **Write `storyboard.json`.** Open `reference/scenes.md` for the fields and limits of the scenes you use, and `reference/writing.md` for how the lines should read. The example below shows the shape. Say each fact once: a price, a date or a place belongs to one scene (the address also goes on the end card). A scene with two true lines is better than one filled up with lines that repeat another scene. If the user asks for a voice or for a silent video, open `reference/sound.md` too.
4. **Build:** `node "<Base directory>/kit/build.mjs" storyboard.json`
   (`<Base directory>` is the path shown at the top of this skill.) If it lists problems, fix each one in `storyboard.json` and build again, until it prints `OK`. If its last lines start with `CHECK`, do what they say.
5. **Tell the user in one sentence** what comes next: the kit runs HyperFrames 0.9.51 through `npx`, turns HyperFrames' usage data off first, and writes only inside `video/`.
6. **Stills:** `node "<Base directory>/kit/stills.mjs"`
   Then open `video/sheet.png` with Read. Each frame has a number, a time and a sentence that says what it should show. Compare every frame with its own sentence.
7. **If a frame is wrong** (a word cut off, words on top of each other, a red strip that says DOES NOT FIT, a wrong or misspelled fact), fix the words in `storyboard.json`, then repeat steps 4 and 6. At most three rounds. The colours, the marker, the motion and the layout belong to the kit: never try to change them.
8. **Write `video/REVIEW.md`** in the user's language, one line per frame: `Frame 1:` then what you see in the picture, in your own words, then `ok` or what you changed. For a page frame, name one thing you can read inside the page's window.
9. **Only if the storyboard has `voice` lines, make the voice:** `node "<Base directory>/kit/sound.mjs"`
   Do what it prints. If it says to ask the user or to give the user a list, do that and stop: no render yet.
10. **Render:** `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`
11. **Tell the user**, in their language, in six short lines or fewer:
    - where the video is (`video/video.mp4`) and how many seconds it runs;
    - what sound it has (sound effects, and the voice if you made one), and to watch it once on a phone with the sound on;
    - the sentence the sound command told you to say word for word, if it printed one;
    - anything they gave or asked for that is not in the video (a second photo, a fifth list line, a part of the code), and why, one sentence each;
    - one line on what they can ask you to change: the colour, the order, any line's words.

    Say nothing else. No list of what each part shows, no recipe, look or scene by name, no `REVIEW.md`, nothing about the build, the sheet or the render's warnings.

## Pick the recipe

| The brief is about | `recipe` | Scenes, in this order |
|---|---|---|
| a person, a page, a shop, a product, a service | `promo` | title, then page or image when there is one, then one or two of list, prices, info, when, steps, stat, numbers, quote, then end |
| something new: a feature, an opening, an event, a sale, a vacancy | `announce` | title, then one to three of when, info, image, page, stat, prices, list, steps, compare, then end |
| a menu, a price list, packages with prices | `menu` | title, prices, then optionally image, info, list or quote, then end |
| questions people ask, with their answers | `faq` | title, qa, then optionally info, list, prices or steps, then end |
| a year, an event or a project in numbers | `recap` | title, numbers (or stat for one number), then optionally list, quote, image or compare, then end |
| how something works | `explainer` | title, steps, then optionally code, fix, image, compare or list, then end |
| tips or reasons | `tips` | title, list, then optionally stat, quote or image, then end |
| a piece of code, or a mistake and its fix | `coding` | title, code or fix, then optionally compare, steps or list, then end |
| what a real person said | `testimonial` | title, quote, then optionally stat, page, image or list, then end |
| a change: before and after, wrong and right | `before-after` | title, then swap for two photos, compare for two lines of words or fix for code, then optionally list, stat, quote or image, then end |

Every video opens with `title` and closes with `end`, holds 3 to 6 scenes, and holds one scene of each kind at most, except `image` (up to three pictures, each in its own scene: a few products) and `code` (two in a row, when the user wants code whole that is longer than one card). Use a `page` scene when there is a page file, an `image` scene when there is a picture file, a `stat` only for a real number, a `quote` only for words a real person said.

Then pick each scene by what its facts are:

| The facts are | Scene |
|---|---|
| things with prices: a menu, a price list, packages, an old and a new price | `prices` |
| one date the video is for: an event day, an opening, a deadline | `when` |
| hours, a place, a fee, a number to call or chat, several dates | `info` |
| two to four numbers | `numbers` |
| one number that matters most | `stat` |
| things done in order: first, then, last | `steps` |
| separate points with no order: reasons, features, what is included | `list` |
| a question and its answer | `qa` |
| a before photo and an after photo | `swap` |
| before and after, wrong and right | `compare` |
| a real person's own words | `quote` |
| code that runs | `code` |
| code that goes wrong, and the same code put right | `fix` |

## Pick the look

| `look` | Looks like | Pick it for |
|---|---|---|
| `warnet` | dark, warm, stepped pixel motion, one colour band | code, tech, learning, anything made at a computer |
| `kertas` | light paper, serif headlines, calm reveals | food, craft, services, people, anything warm or formal |
| `panggung` | one loud colour filling the frame, heavy type, hard cuts | sales, events, openings, anything that should shout |

Colour: with a `page` scene, add `"accent": "page"` and the video takes the page's own colour. If the brief names a brand colour, give it as `"accent": "#0f766e"`. Otherwise leave `accent` out.

## Sound

- **Sound effects are already in every video.** The builder lays them on each build from the look's own sounds. You write nothing for them. Only when the user asks for a silent video, add `"sound": "off"`.
- **A voice only when the user asks for one** (narration, voice-over, "pakai suara", "dinarasikan", their own recordings). Then open `reference/sound.md` before you write the storyboard: it says how to write the `voice` lines, which `"narrator"` to set, and what to do when the sound command stops. If the user did not ask, write no `voice` line and no `"narrator"`.
- `"music"` only when the user gives a music file in this folder.

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
- The sound command stops: its sentences say what to do. It never asks you to install anything by yourself (rule 8).
