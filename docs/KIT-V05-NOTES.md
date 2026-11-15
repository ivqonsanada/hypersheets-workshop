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

## Next

1. A fact said in the title's sub line and again in one later scene: twelve runs of 58, the commonest reason for a B. The builder refuses at three scenes; two is the common case. A check of the title's sub line against the later scenes is the place to start.
2. Initials of a long name in the kicker (`t48`: "HMSI Sistem Informasi" over the whole name in the sub line; `t20` before it). The skill says never; a builder check could compare a word in capitals with the first letters of a run of words elsewhere in the video.
3. A headline that is only the shop's name (`t22`, `t27`, `t42`, `t56`; `t37` and `t53` took it from the customer's words). A builder check is easy (title headline equal to the end card's name); try it on Haiku before keeping it, since a refusal may push it to invent a hook.
4. A kicker that says the headline again in other words ("10 tips belajar coding" over "Sepuluh tips belajar coding", `t34`): the check compares whole words.
5. A long function on two cards is whole but dense (`t31` to `t33`, `t51`, all B): up to thirteen rows at 32 px on the first card. A third card, or a split where the rows are even, would help.
6. A narrated recap speaks the labels and leaves the numbers to the screen (`t54`), because a spoken number takes many words. Room for one number per spoken line would help.
7. `CHECK THE ADDRESS` has never printed in a Haiku run.

## Left out, and why

- **Bars** (from the report's smaller list): not in this round's list; `numbers` covers a recap, and a chart needs its own care with scales.
- **A second look colour per kind of business**, the page's colour for `warnet`'s marks, "gue" mirrored: owner decisions in the campaign report, not built.
- **An example storyboard with `swap`**: the examples test writes one picture per `file` field, and `swap` names two; `reference/scenes.md` has its JSON.
