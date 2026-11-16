# motion-kit 0.5.0: working notes

Short log of the work after `v0.4.0` (the use-case campaign's patches, the report's "to build next", the Haiku trial). The full account is in `docs/MOTION-KIT.md`, "The use-case trial for 0.5.0". Working folder outside this repo: `../.kit-v05/` (tools, hand-built checks in `dev/`, Haiku runs in `runs/`, the trial table in `runs/table.md`).

## Done

- **Campaign patches 01 to 12** merged on top of `v0.4.0`, one commit each (`../.kit-campaign/patches/`). Runtime, spec, reference and example files applied as they were; `SKILL.md` and `build.mjs` hunks placed by hand around the sound layer. The wording patch's "cannot make a voice" became rule 9: no song, avatar or person on screen, no downloads, vertical only; a spoken voice it can make.
- `prices`, `info`, `numbers` carry their cues (a land per row, a count train and a land per number) and their sentence on the check sheet. `kit/test/rules.test.mjs` holds one test per rule.
- **Built from the report's list**, each seen in all three looks (sheets and mid-entry frames):
  - code that fits: a line holds 110 characters and wraps under itself with a hanging indent (`runtime/wrap.js`, shared by the builder and the browser), 32 px at the least;
  - `fix`: wrong code typed and dimmed, right code under it with the changed line marked;
  - a scene keeps its layout through a revision (`mk-plan.json` records it; `"variant": 1|2` asks for one);
  - no headline with two or more one-word lines among three or more when a slightly smaller size avoids it;
  - `when`: one date on a calendar leaf, covered by the calendar check and the same-fact check; without `day` the builder writes the weekday from the calendar;
  - `qa` and the recipe `faq`; `swap` (before and after photos in one frame);
  - small ones: `"numbered": false` on a list, a quote without a name, a larger stat note, a count that never shows 0, skill wording (one command per call, the last message's fixed shape).
- The check sheet gives each sentence the room it needs. The same-fact check leaves out a number that is part of the name ("RW 05").
- **The trial**: 58 Haiku runs, sound on: 30, a follow-up of 16, then a release-candidate round of 12 on a frozen kit. A 22, B 33, C 3, F 0 (the campaign on v0.3.0: A 6, B 17, C 12, F 2 of 37). $0.0123 a video, $0.0072 a revision, $0.729 in all. What each stumble changed is listed run by run in `docs/MOTION-KIT.md`.
- **After `t29`**: code longer than one card goes on two code scenes in a row with the line numbers carried on, and an end card address that stands inside the code gets a `CHECK THE ADDRESS` note. `t31` to `t33` ran the long function again: whole on two cards, the brief's address on the end card, three times of three.
- **After `t34`**: the headline rule looks down to half the largest size that fits (a four-word headline stood as four one-word lines); on the title's band layout the tails of g, j and p stay inside the band in `kertas` and `panggung`, the words on a `kertas` band no longer sit 0.08em under the words they replace, and frame 0 has no hairline beside the lines.
- **After `t39`**: a `when` scene that leaves `day` out makes the builder say which day it wrote and what to do when the brief names another (`CHECK THE DAY`); the reference says to write the brief's day as the brief has it; the skill says to leave the end card's name out when the whole name does not fit. `t43` to `t46` ran the three wrong-weekday briefs: four of four wrote the brief's day, stopped before the render and asked.
- **After `t44`**: the day and date note names the nearest date that falls on the day the words name, so the model never counts days. Tests only.
- **Release files**: README (id first, en below), MOTION-KIT.md, ten examples (`announce` now holds a `when` scene), `plugin.json` 0.5.0. The overview of every scene in every look and six Haiku-made videos with their sheets are in `../docs/motion-kit-samples/v05/`.

## Tagged

`v0.5.0` is the commit that records the release-candidate round. The aim was no C or F in the last 12 runs. It was missed in the first 30 (`t29`) and in the follow-up of 16 (`t39`), where the kit also changed between runs. The round then froze the kit at `46e6140` and ran exactly twelve briefs, eleven of them written for it: `t47` to `t58`, A 3, B 9, no C, no F. `CHECK THE DAY` printed twice and caused no needless question; the nearest-date line printed once and Haiku offered the builder's date; `CHECK THE ADDRESS` did not print, because the one run that could have taken an address from the code asked the user for one.

## After the tag: three wording notes on `main`, not tagged

Two commits on `main` after `v0.5.0` (`7dfcc81`, `15e10c7`): three notes the builder prints after `OK`, before the sheet. None stops the build. `CHECK WHAT IS SAID TWICE` (a fact or a phrase in two scenes, with both places and the one that keeps it, and a line for an end card that says its own name twice), `CHECK THE INITIALS`, `CHECK THE HEADLINE` (a headline that is only the name the end card shows). 61 tests.

- **Proof**: 24 Haiku runs, the cap. Six while shaping (`u01` to `u06`), then eighteen on the kit frozen at `15e10c7`: the release-candidate round's twelve briefs again (`t59` to `t70`) and six campaign briefs not run before (`t71` to `t76`).
- **Result**: the twelve A 4, B 8 (on 0.5.0: A 3, B 9); up `t59`, `t68`, `t69`; down `t62`, `t70`; seven stayed. The six A 1, B 5. No C and no F in the eighteen. $0.230 for the eighteen, $0.069 for shaping.
- **No tag for the notes**: the rule asked for six A among the twelve. The round was meant to become 0.5.1 and did not. The tag `v0.5.1` that came after it is another change (below), made from `v0.5.0`, and does not hold the notes.
- **The commits stay.** No grade of the twelve fell because of a note: `t62` printed none, and what brought `t70` down was in its first storyboard. The said-twice note printed in nine runs and was followed in one further build each time; the headline note made `t68` an A. `git revert 15e10c7 7dfcc81` takes them out.
- **What they made worse**, all without a change of grade: `t61`'s end line ("Tanya dulu sebelum datang", a request the brief does not make, written after the end card line of the note), `t72`'s headline (a promise replaced by "Cara pesan", now said three times), `t73`'s headline (a person's name replaced by a line about her internship).

The table and what each note printed are in `docs/MOTION-KIT.md`, "After 0.5.0".
## 0.5.1: the sheet in the video's language

`v0.5.1` is on the branch `release-0.5`, made from `v0.5.0`. It adds one thing. The full account is in `docs/MOTION-KIT.md`, "0.5.1: the check sheet in the video's language".

- A storyboard with `"lang": "id"` gets an Indonesian sheet: `BINGKAI 1 · 1,94 dtk · adegan 1 (title)` and `Seharusnya tampil: ...`, for all 17 scenes and both layouts. An English storyboard gets the text 0.5.0 wrote, to the letter (806 scene plans and 184 sheet pages compared with the kit at `v0.5.0`; `kit/test/sheet.test.mjs` holds every sentence in both languages).
- The sheet's page and labels are in `kit/lib/sheet.mjs`; the Indonesian sentences are beside the English ones in `kit/lib/spec.mjs`. `SKILL.md` step 6 names both openings of the sentence.
- Twelve hand-built Indonesian sheets read line by line (`../.kit-v05/dev/s051-*`), then six Haiku runs on `ccb899c` (`s01` to `s06` in `../.kit-v05/runs/`): A 2, B 4, no C, no F, $0.0745. Every Indonesian sheet is Indonesian, the English one is unchanged, and Haiku still reviews frame by frame; one run of five wrote "Bingkai 1:" in `REVIEW.md` where the skill says "Frame 1:".
- Tests: 66 on `release-0.5` (four files). Two sheets and one video are in `../docs/motion-kit-samples/v051/`.
- **On `main`**: `release-0.5` is merged in, so `main` is `v0.5.1` plus the three wording notes. `plugin.json` and the README's install lines say 0.5.1, the newest tag; what `#v0.5.1` installs is the kit without the notes. 69 tests on `main`.
- Left alone: the red strip in a frame (`DOES NOT FIT: ...`) and everything the scripts print in the terminal stay English.

## Next

1. The end card line of the said-twice note says to write "the reason to act or the deadline". A brief with neither got a made-up request (`t61`). It should say to keep the action and drop the name ("Tanya lewat WA"), and never to add a condition.
2. The said-twice note names the place to change, and Haiku sometimes changes the other one (`t60`) or moves the repeat instead of ending it (`t61`, `t72`). Say that the headline is the last thing to change, and that a headline with a number or a promise keeps it.
3. The headline note on a person's introduction (`t73`): the name is the right headline there. A way to tell a person from a shop is needed before the note is kept for the `promo` recipe without a page.
4. Repeats the note does not reach: a caption that says the title's sub line again (`t62`, `t64`, `t76`), a sub line that says the headline again in other words (`t66`), the same words in two forms ("tiap Jumat", "Setiap Jumat", `t67`), a headline that is only the name when the end card has no name (`t75`).
5. `CHECK THE INITIALS` has tests and no Haiku run: no run of the 24 wrote initials. `CHECK THE ADDRESS` has never printed either.
6. A number read from the user's picture and set as a stat (`t70`: "Rp160.000 collected this week" from the screenshot). The builder cannot see into a picture; the skill could say that a number on screen comes from the brief's words or the user's answer.
7. A kicker that says the headline again in other words ("10 tips belajar coding" over "Sepuluh tips belajar coding", `t34`): the check compares whole words.
8. A long function on two cards is whole but dense (`t31` to `t33`, `t51`, `t63`, all B): up to thirteen rows at 32 px on the first card. A third card, or a split where the rows are even, would help.
9. A narrated recap speaks the labels and leaves most numbers to the screen (`t54`, `t66`), because a spoken number takes many words. Room for one number per spoken line would help.

## Left out, and why

- **Bars** (from the report's smaller list): not in this round's list; `numbers` covers a recap, and a chart needs its own care with scales.
- **A second look colour per kind of business**, the page's colour for `warnet`'s marks, "gue" mirrored: owner decisions in the campaign report, not built.
- **An example storyboard with `swap`**: the examples test writes one picture per `file` field, and `swap` names two; `reference/scenes.md` has its JSON.
