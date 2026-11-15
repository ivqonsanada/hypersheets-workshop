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
- **The trial**: 30 Haiku runs, sound on. A 15, B 13, C 2, F 0 (the campaign on v0.3.0: A 6, B 17, C 12, F 2 of 37). $0.0123 a video, $0.0072 a revision. What each stumble changed is listed run by run in `docs/MOTION-KIT.md`.
- **After the last run** (`t29`): code longer than one card goes on two code scenes in a row with the line numbers carried on, and an end card address that stands inside the code gets a `CHECK THE ADDRESS` note. Tests and hand-made frames in three looks; no Haiku run.
- **Release files**: README (id first, en below), MOTION-KIT.md, ten examples (`announce` now holds a `when` scene), `plugin.json` 0.5.0. The overview of every scene in every look and six Haiku-made videos with their sheets are in `../docs/motion-kit-samples/v05/`.

## Not tagged

The aim was no C or F in the last 12 runs. `t19` to `t30` hold one C (`t29`: nine of fourteen lines of a function the brief wanted whole, and the end card's address taken from the code). The trial was capped at 30 runs, so `v0.5.0` was not placed.

## Next

1. Run the long-function brief (`c07-kode-panjang`) on Haiku two or three times: does it split the code over two cards, and does it put the brief's own address on the end card? Then enough further runs for twelve in a row without a C or F, and tag `v0.5.0`. When the tag exists, change `#v0.4.0` to `#v0.5.0` in the README's install lines (four places) and take out the "no tag yet" line in its maintainers' part.
2. A headline that is only the shop's name (`t22`, `t27`: the example in `reference/writing.md` did not take). A builder check is easy (title headline equal to the end card's name); try it on Haiku before keeping it, since a refusal may push it to invent a hook.
3. A fact said in the title's sub line and again in one later scene (`t13`, `t14`, `t28`). The builder refuses at three scenes; two is the common case.

## Left out, and why

- **Bars** (from the report's smaller list): not in this round's list; `numbers` covers a recap, and a chart needs its own care with scales.
- **A second look colour per kind of business**, the page's colour for `warnet`'s marks, "gue" mirrored: owner decisions in the campaign report, not built.
- **An example storyboard with `swap`**: the examples test writes one picture per `file` field, and `swap` names two; `reference/scenes.md` has its JSON.
