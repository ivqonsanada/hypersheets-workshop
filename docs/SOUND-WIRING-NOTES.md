# Sound wiring: working notes

Joining the video kit and the sound layer for plugin 0.4.0. Short, kept current, so a cut-off loses little. The finished write-up is the "Sound" section of `docs/MOTION-KIT.md`.

Last updated: 2026-11-15, after the Haiku trial.

## Done

- **One path.** `kit/build.mjs` lays the sound effects on every build (default in `SOUND_DEFAULT`, `kit/lib/spec.mjs`). `kit/sound.mjs` is the one extra command, only for a video with `voice` lines: it makes the lines, then builds again. `"sound": "off"` and `"narrator"` are storyboard settings.
- **Names.** Scene numbers count from 1 everywhere, `durations.json` included. Files the user makes go in `my-voice/`.
- **Consent.** `sound.mjs` prints the question to ask before a download; only `kit/sound/install.mjs` downloads; rule 8 of `SKILL.md`.
- **Tests.** `node --test` at the repo root: 38 pass (27 sound layer, 11 kit and sound together).
- **End to end on the kit's own builder.** Four examples across the three looks, built, spoken, rendered and measured. Numbers are in `docs/MOTION-KIT.md`.
- **Haiku trial.** 12 runs of 12, all pass `dev/score-kit.mjs`. Two notes changed the kit (after s01 and after s10). Table in `docs/MOTION-KIT.md`.
- **Docs.** `SKILL.md`, `reference/sound.md`, `README.md` (id and en), `docs/SOUND.md`, `docs/MOTION-KIT.md`.

## Next, in order

1. Done: the figures in `docs/MOTION-KIT.md` were checked against the run data, and `plugin.json` is at 0.4.0.
2. `claude plugin validate .`, `node --test`, commit, tag `v0.4.0` on the final commit.
3. API repo: branch `workshop-guides-voice` off `workshop-release` in the worktree `../.wt/api-workshop-voice`; one sentence in `resources/workshop/suara-untuk-halaman/02-buat-suara.{id,en}.md` about ElevenLabs' free plan; run the content check; commit there only.
4. Copy four Haiku-made videos to `belajarwebdev/docs/motion-kit-samples/with-sound/`: effects only in two looks (s06 warnet, s07 panggung), Indonesian narrated (s12), English narrated (s02).

## Where the working files are

Trial runs, fixtures and the measuring scripts are outside the repo, in the session's scratch folder under `mk4/` (`runs/s01` to `s12`, `e2e/`, `analyze.mjs`, `roundtrip.mjs`, `trial.sh`). They are not needed to use the kit.

## For the owner

- A learner's free seat is US$2 since 2026-11-15, so the cost of a video matters less than it working. Measured: $0.009 to $0.010 for effects only, $0.011 to $0.014 with a voice.
- Nobody has listened to anything yet. What ears must judge is listed in `docs/MOTION-KIT.md` and `docs/SOUND.md`.
