# motion-kit 0.5.0: working notes

Short log of the work after `v0.4.0` (the use-case campaign's patches, the report's "to build next", the Haiku trial). Newest state first; the full account goes in `docs/MOTION-KIT.md` at release.

## Done

- Campaign patches 01 to 12 merged on top of `v0.4.0`, one commit each (`.kit-campaign/patches/`). Runtime, spec, reference and example files apply as they are; `SKILL.md` and `build.mjs` hunks placed by hand around the sound layer.
- The wording patch's "cannot make a voice" is now rule 9: no song, avatar or person on screen, no downloads, vertical only; a spoken voice it can make (rule 8 and `reference/sound.md` stay as they were).
- `prices`, `info`, `numbers` carry their cues (a land per row, a count train and a land per number) and their sentence on the check sheet; `kit/test/rules.test.mjs` holds one test per campaign rule (49 tests pass with `node --test`).

## Next

1. Look at the merged scenes in all three looks with sound on (sheets and mid-entry frames).
2. From the report's list: code that fits (wrap, `fix` scene), layout kept through a revision, no one-word-a-line headlines, `when`, `qa`, `swap`, the small ones.
3. Haiku trial on the merged kit (16 to 30 runs), grades and audio measurements.
4. Release 0.5.0: skill text, reference, examples, README, MOTION-KIT.md, overview image, tag.
