# Sound wiring: working notes

Joining the video kit and the sound layer for plugin 0.4.0. Short, kept current while the work went on, so a cut-off would lose little. The finished write-up is the "Sound" section of `docs/MOTION-KIT.md`; the research is `docs/SOUND.md`.

Last updated: 2026-11-15, at the end of the work. Nothing is left open in this repo.

## Done

- **One path.** `kit/build.mjs` lays the sound effects on every build (default in `SOUND_DEFAULT`, `kit/lib/spec.mjs`). `kit/sound.mjs` is the one extra command, only for a video with `voice` lines: it makes the lines, then builds again. `"sound": "off"` and `"narrator"` are storyboard settings.
- **Names.** Scene numbers count from 1 everywhere, `durations.json` included. Files the user makes go in `my-voice/`.
- **Consent.** `sound.mjs` prints the question to ask before a download; only `kit/sound/install.mjs` downloads; rule 8 of `SKILL.md`.
- **Tests.** `node --test` at the repo root: 38 pass (27 sound layer, 11 kit and sound together). `claude plugin validate .` passes.
- **End to end on the kit's own builder.** Four examples across the three looks, built, spoken, rendered and measured. Numbers are in `docs/MOTION-KIT.md`.
- **Haiku trial.** 12 runs of 12, all pass `dev/score-kit.mjs`. Two notes changed what Haiku reads (after s01 and after s10), so only s11 and s12 ran on the text as released. Table in `docs/MOTION-KIT.md`.
- **Docs.** `SKILL.md`, `reference/sound.md`, `README.md` (id and en), `docs/SOUND.md`, `docs/MOTION-KIT.md`; `plugin.json` at 0.4.0.
- **ElevenLabs' rule, read at its source.** The help-centre article can be read in ElevenLabs' docs, and it says free-plan content must carry "elevenlabs.io" or "11.ai" in the title. The kit's notice says so again (it was softened for a few hours).
- **API repo.** Branch `workshop-guides-voice` off `workshop-release`, worktree `belajarwebdev/.wt/api-workshop-voice`: one sentence in track 3 step 2, Indonesian and English, on what a page used for business needs. Content check: 0 problems. Not merged, PHP tests not run.
- **Samples.** Four Haiku-made videos with sound in `belajarwebdev/docs/motion-kit-samples/with-sound/`.

## For the owner

- **Listen.** Nobody has heard any of this. `docs/MOTION-KIT.md` ("What a person must still judge by ear") and `docs/SOUND.md` list what to listen for. If the palettes disappoint, `SOUND_DEFAULT` is one word.
- **Decide.** Supertonic 3 for Indonesian (installable, offered nowhere). Kitten or Piper Kristin as the English light voice.
- **Merge.** The API branch `workshop-guides-voice`, after running its PHP tests.
- **Cost.** A learner's free seat is US$2 since 2026-11-15. Measured on Haiku 5.5: $0.009 to $0.010 for a video with effects only, $0.011 to $0.014 with a voice.
- **Not covered by the trial.** A user who answers yes to a download (no run reached `install.mjs`), the user coming back after making ElevenLabs files, music, `"sound": "off"` on Haiku, Kokoro, Windows and Linux.

## Where the working files are

Trial runs, fixtures and the measuring scripts are outside the repo, in the session's scratch folder under `mk4/` (`runs/s01` to `s12`, `e2e/`, `analyze.mjs`, `roundtrip.mjs`, `trial.sh`). They are not needed to use the kit, and a reboot may clear them.
