# Sound

Open this file only when the user asks for a voice, for a silent video, or about the sound. Sound effects need nothing from you: the builder lays them on every build.

## What you set in the storyboard

| Setting | Where | When |
|---|---|---|
| `"voice": "one spoken sentence"` | in a scene | the user asked for a voice |
| `"narrator": "ringan"` | at the top, beside `"look"` | the storyboard has `voice` lines |
| `"sound": "off"` | at the top | the user asked for a silent video |
| `"music": "lagu.mp3"` | at the top | the user gave a music file in this folder |

## A video with a voice, in order

1. Write one `voice` line in each scene that should speak, and set `"narrator"` (the table below).
2. Build, make the stills, write `REVIEW.md`, as always. The builder checks the `voice` lines too.
3. Before the render, run the sound command once, with `timeout: 600000`:
   `node "<Base directory>/kit/sound.mjs"`
4. It prints `OK` and the render command: render. It prints anything else: see "When the sound command stops".

The sound command makes the lines, makes each scene as long as its line, and puts the voice in the video. Never run another script from `kit/sound/` to make a voice.

## Which narrator

| The user says | `"narrator"` |
|---|---|
| a voice, narration, a voice-over, "pakai suara", and nothing more | `"ringan"`: a light voice that runs on this computer. Start here, in both languages |
| the name Kokoro, or a better voice than the light one, for a video in English | `"kokoro"`: a bigger download |
| ElevenLabs, "suara yang bagus", "the best voice" | `"bagus"`: the user makes the lines on their own ElevenLabs account |
| their own voice, their own recordings | `"sendiri"` |
| a quick draft on a Mac, only to check the timing | `"draft"`: the Mac's own voice, never for a video that is published |

When unsure, `"ringan"`. Never pick a bigger voice than the user asked for.

If the user asks which voice suits their computer, run `node "<Base directory>/kit/sound/device.mjs"` and tell them what it says. It installs nothing.

## Writing the voice lines

- One short sentence per scene, the way a person says it aloud. Say what the scene is about; do not read every line on the screen.
- Only facts from the brief, like the words on screen. The language is the video's `"lang"`.
- **Numbers in words:** "tiga puluh persen", not "30%"; "lima belas ribu rupiah", not "Rp15.000"; "twenty thousand", not "20,000".
- **No address in a voice line.** The screen shows it. Say "alamatnya ada di layar" or "the address is on screen".
- No signs: write "persen", "dan", "percent", "and".
- A scene has room for about 8 to 12 words. The builder says when a line has too many: say it in fewer words.
- If the user already recorded their lines and tells you what each one says, copy those words exactly. The file's number is the scene's number: `my-voice/2.m4a` speaks in scene 2.

```json
{ "type": "list", "heading": "Yang bisa dipesan", "items": ["Roti tawar gandum", "Sourdough polos dan kismis"], "voice": "Ada roti tawar gandum, ada juga sourdough." }
```

## When the sound command stops

- **"The voice is not on this computer yet"**: it prints a question for the user. Ask it word for word, add the sentence it tells you to say with it, then stop and wait. Run the install command only after the user answers yes (rule 8 in SKILL.md). No render.
- **"Make these lines on elevenlabs.io"** or **"Record these lines"**: give the user the list as printed, each line with the file name to save it under, and the sentence about ElevenLabs' free plan if one is printed. Then stop. No render. When the user says the files are saved, run the sound command again, then render.
- **A line "has the number", "has an address", "has the sign"**: rewrite that `voice` line as the sentence says, build again, run the sound command again.
- **"does not say its line"**: change that line once as the sentence says, build again, run the sound command again. If it says so again, tell the user which scene it is.
- **`OK`, with "The listener wrote ... a little differently"**: change nothing. Render, and tell the user which scenes to listen to.
- Anything else: do what the sentence says. Never install a program, never look for a key, never make a recording yourself.

## What to tell the user at the end

- Which voice spoke, and that the video also has sound effects.
- Any sentence the sound command told you to say word for word. For the light Indonesian voice it is: "Suara ini untuk latihan dan pemakaian non-komersial. Untuk video yang dijual atau dipakai klien, pakai suaramu sendiri atau ElevenLabs."
- To listen once with the sound on. You cannot hear the video; only the user can judge how it sounds.
