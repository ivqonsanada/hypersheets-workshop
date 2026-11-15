# motion-kit 0.5.0: working notes

Short log of the work after `v0.4.0` (the use-case campaign's patches, the report's "to build next", the Haiku trial). The full account goes in `docs/MOTION-KIT.md` at release. Working folder outside this repo: `../.kit-v05/` (tools, hand-built checks in `dev/`, Haiku runs in `runs/`).

## Done

- **Campaign patches 01 to 12** merged on top of `v0.4.0`, one commit each (`../.kit-campaign/patches/`). Runtime, spec, reference and example files applied as they were; `SKILL.md` and `build.mjs` hunks placed by hand around the sound layer. The wording patch's "cannot make a voice" became rule 9: no song, avatar or person on screen, no downloads, vertical only; a spoken voice it can make.
- `prices`, `info`, `numbers` carry their cues (a land per row, a count train and a land per number) and their sentence on the check sheet. `kit/test/rules.test.mjs` holds one test per rule.
- **Built from the report's list**, each seen in all three looks (sheets and mid-entry frames):
  - code that fits: a line holds 110 characters and wraps under itself with a hanging indent (`runtime/wrap.js`, shared by the builder and the browser), 32 px at the least;
  - `fix`: wrong code typed and dimmed, right code under it with the changed line marked;
  - a scene keeps its layout through a revision (`mk-plan.json` records it; `"variant": 1|2` asks for one);
  - no headline with two or more one-word lines among three or more when a slightly smaller size avoids it;
  - `when`: one date on a calendar leaf, covered by the calendar check and the same-fact check;
  - `qa` and the recipe `faq`; `swap` (before and after photos in one frame);
  - small ones: `"numbered": false` on a list, a quote without a name, a larger stat note, a count that never shows 0, skill wording (one command per call, the last message's fixed shape).
- The check sheet gives each sentence the room it needs. The same-fact check leaves out a number that is part of the name ("RW 05").

## Trial so far (Haiku 5.5, sound on by default)

Runs `t01` to `t09` on the kit at `d5f2d20`: A 7, B 1, C 1. What they changed: code max 72 to 110 and "a video about code always shows it" (t09), the headline rule widened (t08), the date note stops before the render (t06 did that by itself), the last message's shape (t08), the swap's title (t03).

## Next

1. Finish the trial: the remaining C and F briefs of the campaign, the flash sale, the discount with a page, two events, the quiz, the testimonial, an English code tip, one narrated Indonesian video on the light voice, two revision rounds. Aim: no C or F in the last 12 runs.
2. Release 0.5.0: README (id first, en below), MOTION-KIT.md (new scenes and recipes, the trial table), the overview picture (`../.kit-v05/tools/overview-make.py`, `overview.py`), six samples with sheets in `../docs/motion-kit-samples/v05/`, plugin.json, `claude plugin validate .`, tag.

## Left out, and why

- **Bars** (from the report's smaller list): not in this round's list; `numbers` covers a recap, and a chart needs its own care with scales.
- **A second look colour per kind of business**, the page's colour for `warnet`'s marks, "gue" mirrored: owner decisions in the campaign report, not built.
