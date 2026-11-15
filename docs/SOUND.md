# Sound for the motion kit

The sound layer lives in `skills/motion-kit/kit/sound/`. It adds sound effects, a spoken line per scene and music to a video the kit has built, using Node and ffmpeg on the learner's own computer. This page records what was researched on 15 November 2026, what was chosen, what was measured, and what nobody has checked yet.

Nothing here was judged by ear. Every quality claim below is a measurement (loudness, peaks, timing, a speech recogniser's transcript) or a quote from a source. A person still has to listen; the samples in `belajarwebdev/docs/motion-kit-samples/sound/` (the sound layer alone, on the older `video-promo` video) and `belajarwebdev/docs/motion-kit-samples/with-sound/` (videos Haiku made with the joined kit) are for that.

## How it is used

The sound layer and the video kit were built apart and joined afterwards (plugin 0.4.0). Since then a video needs at most one extra command:

| A video with | Commands |
|---|---|
| sound effects (the kit's own choice, see `SOUND_DEFAULT` in `kit/lib/spec.mjs`) | none extra: `kit/build.mjs` calls the mixer on every build |
| a voice | one extra, after the stills and before the render: `node kit/sound.mjs`. It makes the spoken lines (`sound/voice.mjs`), then runs the builder again, which gives each scene the time its line needs and lays voice, effects and music in one mix |
| no sound | none: `"sound": "off"` in the storyboard |

Which voice speaks is the storyboard's `"narrator"`: `ringan`, `kokoro`, `bagus`, `sendiri` or `draft` (or a voice's own name from `engines.json`). The scripts underneath can still be run by hand:

| Command | What it does |
|---|---|
| `node kit/sound/device.mjs` | Describes the computer and says which voice suits it, in Indonesian and English, with the `"narrator"` setting for each. Installs nothing; prints what an install would download. |
| `node kit/sound/install.mjs <voice>` | Downloads one voice and the program that runs it into `~/.hypersheets/sound` (or `HS_SOUND_HOME`). Checks every file against a SHA-256 in `engines.json`. `--from <folder>` takes the files from a flash drive instead. `list` shows every voice with size and licence. The only script that downloads; the skill lets Claude run it only after the user's yes. |
| `node kit/sound/voice.mjs <video folder> [--engine ...]` | Makes `video/voice/scene-N.wav` for each scene with a `voice` line, writes `video/voice/durations.json`, and checks each line by listening to it with whisper when `whisper-cli` is installed. Ends with 0 when the lines are made, 3 when it waits for files only the user can make, 4 when a voice would have to be downloaded first, 1 for anything else. |
| `node kit/sound/mix.mjs <video folder>` | Lays sound effects from `video/cues.json`, the voice and the storyboard's music into `video/assets/audio/mix.wav`, and writes `video/mix-report.json`. The builder calls the same function, so a mix made by hand is replaced by the next build. |

## Voices: what the owner decided, and what the sources say

On 15 November 2026 the owner decided: Piper for practice with a one-line notice, ElevenLabs on the learner's own account as the step up, the learner's own voice always available.

| Tier | Indonesian | English |
|---|---|---|
| `ringan` (runs on this computer) | Piper `id_ID-news_tts-medium`, 41 MB with its program. Practice and non-commercial use. | KittenTTS nano 0.8, 52 MB with its program. Apache-2.0, may be published. |
| best local voice on a strong computer | the same Piper voice | Kokoro 82M v1.0, 370 MB with its program. Apache-2.0, may be published. `"narrator": "kokoro"` |
| `bagus` (step up) | ElevenLabs on the learner's own account | ElevenLabs on the learner's own account |
| `sendiri` | the learner's own recordings | the learner's own recordings |
| `draft` (Mac only) | macOS Damayanti: timing only, never published | macOS Samantha: timing only, never published |

The notices, shown once by `voice.mjs` and written to `video/voice/NOTICE.txt` in the storyboard's language:

- Piper Indonesian: "Suara ini untuk latihan dan pemakaian non-komersial. Untuk video yang dijual atau dipakai klien, pakai suaramu sendiri atau ElevenLabs." / "This voice is for practice and non-commercial use. For videos you sell or make for a client, use your own voice or ElevenLabs."
- ElevenLabs: "Paket gratis ElevenLabs hanya untuk pemakaian non-komersial dan wajib menulis "elevenlabs.io" di judul; untuk video yang dijual atau dipakai klien perlu paket berbayar." / "ElevenLabs' free plan is for non-commercial use only and needs "elevenlabs.io" in the title; videos you sell or make for a client need a paid plan."

### The Indonesian Piper voice, read at the source

There is one Indonesian Piper voice. Its [model card](https://huggingface.co/rhasspy/piper-voices/blob/main/id/id_ID/news_tts/medium/MODEL_CARD) says, in full: dataset URL `https://www.kaggle.com/code/mpwolke/indic-tts-malayalam-speech-corpus` (a notebook about a Malayalam corpus, not this voice's recordings), "License: See URL", and "Finetuned from U.S. English lessac voice (medium quality)".

- No licence is documented for its recordings. Its name matches the Indonesian News TTS corpus ([CC BY-NC-SA 4.0](https://huggingface.co/datasets/SEACrowd/indspeech_news_tts), ATR Japan), but the card does not say so.
- Its base, lessac, comes from recordings whose [licence](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html) allows "only those purposes associated with research and exploration" and excludes "any commercial purpose, including the development, marketing, commercialisation, sale or licencing of voice synthesis".
- Piper's own [commercial-use list](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/COMMERCIAL_USE.md) does not include it. It falls under two of that page's "not on this list" groups: fine-tuned from lessac, and "Voices whose card only says See URL. These have not been reviewed yet."
- Piper's [licensing page](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/LICENSING.md): "The Piper project makes no license grant of its own over voice models."

So "practice and non-commercial" is this kit's careful reading, not a grant anyone has written down. The notice says that much and no more. A learner who publishes a practice video with this voice is in the same position as everyone else who uses it: the recordings' owners have not said yes or no.

### Which Piper engine

- [rhasspy/piper](https://github.com/rhasspy/piper) (MIT) was archived on 6 October 2025; its last release is 2023.11.14-2.
- Development moved to [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0-or-later, installed with `pip install piper-tts` (1.8.0, needs Python 3.9 or later).
- This kit uses neither. A Piper voice is an ONNX file, and [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 1.13.8 (Apache-2.0 source, ready-made programs for macOS, Windows and Linux, no Python) runs it, along with every other local voice here. Its 1.x programs include espeak-ng (GPL-3.0-or-later) to turn text into sounds; release 2.0.0 removed that and can no longer speak a Piper, Kitten or Kokoro voice from plain text, which is why the kit pins 1.13.8.
- What the licences mean for us: the kit ships none of these programs. `install.mjs` tells the learner's computer to fetch them from their makers, so the GPL's conditions on distributing a program do not reach this repo, and running a GPL program places no condition on the audio it makes. If the plugin ever bundled the program itself, that would change.

### ElevenLabs, read at the source

- [Terms of Service](https://elevenlabs.io/terms-of-use), updated 9 October 2026: "if you access or use our Services free of charge (such a user, a "Free User"), you may only use the Services for non-commercial purposes"; a paid subscriber "may use the Services for commercial purposes".
- [Billing docs](https://elevenlabs.io/docs/overview/administration/billing): "If you are on the free plan, you can use the content non-commercially with attribution." "When generating content on our paid plans, you get commercial rights to use that content."
- The help-centre article "Can I publish the content I generate on the platform?" refused an automated read at help.elevenlabs.io (HTTP 403). The same article [in ElevenLabs' docs](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform) was read on 15 November 2026: "The free plan does not include a commercial license and cannot be used for any commercial purpose." "If you publish content generated using our Services on a free plan or without being signed-in to your account, you must attribute it to ElevenLabs by including "elevenlabs.io" or "11.ai" in the title". "Content created outside of a paid subscription (before or after) cannot be used commercially and always requires attribution when shared non-commercially." The kit's notice rests on these three sentences.
- [Pricing](https://elevenlabs.io/pricing): Free is 0 dollars with "10k credits per month", about 10 minutes of speech. Starter is 6 dollars a month (1 dollar the first month), 30k credits, and lists "Commercial License".
- Indonesian: the [models page](https://elevenlabs.io/docs/overview/models) lists it for `eleven_multilingual_v2` (the API's default model) and for `eleven_v4`.

For the Workshop's track 3 guide: step 2 already tells the learner that the free plan's output may not be used commercially and must carry `elevenlabs.io` in its title, and links the article above. What it did not say is what follows for a page used for business. The API branch `workshop-guides-voice` (not merged) adds that one sentence: such a page needs a paid plan or a recording of the learner's own voice.

Two ways in, both through `"narrator": "bagus"`:

1. Files. With no key set, the kit prints each line and the name to save it under (`my-voice/1.mp3`, `my-voice/2.mp3`, the scene's number, in a folder beside the storyboard). The learner makes them on elevenlabs.io, saves them, and runs the sound command again. Tested with stand-in files, and on Haiku with no files at all: the run stopped and handed the list over.
2. Key. With `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` set in the shell, `voice.mjs` fetches each missing line as `video/voice/N.mp3` and carries on as in way 1. The key is read from the environment only, sent only to `*.elevenlabs.io`, and never printed or written; a line already fetched is not fetched again unless its words change; a file the learner made is never replaced. **Not tested against the real service**: there was no key to test with. A test runs it against a stand-in server and checks the request and that the key appears in no output or file.

The lines' text goes to ElevenLabs when the key is used. That is the learner's own choice, on their own account.

### A local Indonesian voice the owner has not ruled on

Research turned up Supertonic 3, released by Supertone in April 2026: 31 languages including Indonesian, about 99 million parameters, ONNX, runs in the same sherpa-onnx program. Its [weights](https://huggingface.co/Supertone/supertonic-3) are under the BigScience OpenRAIL-M licence, which permits commercial use ("perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license") with use restrictions. Two of them touch a learner's video: not to "impersonate or attempt to impersonate (e.g. deepfakes) others without their consent", and not to place generated content "in any context ... without expressly and intelligibly disclaiming that the information and/or content is machine generated". A caption line such as "Suara: AI" meets the second.

Caveat: Supertone's GitHub repo now sits at `supertone-oss-archive/supertonic`, archived and read-only since September 2026. Third-party pages say the company is closing; no primary source confirmed that. The licence grant is irrevocable and the kit pins the files by checksum, with the archive copy on Hugging Face as a second address.

It is installed and measured (below) and selectable as `"narrator": "supertonic-ringan"` (149 MB with its program) or `"narrator": "supertonic"` (507 MB). Neither the skill nor the README's table of voices offers it. It is not a tier and `device.mjs` does not recommend it, because the owner's decision named Piper and ElevenLabs. It is the only local Indonesian voice found whose licence allows a video that is sold.

## Measured on this Mac

Apple M1 Pro, 16 GB, macOS 26.5.1, Node 24.16, ffmpeg 8.1.1, sherpa-onnx 1.13.8, one thread. Each voice spoke the same 20 lines (lines these videos would carry: names, places, prices in words, short sentences). Whisper small (5-bit) transcribed each line and the transcript was compared with the text.

| Voice | Language | Download, voice alone | Peak memory | Time per second of speech | Word errors | Character errors | Lines flagged |
|---|---|---|---|---|---|---|---|
| Piper news_tts (8-bit) | id | 21 MB | 157 MB | 0.41 s | 11.2% | 2.4% | 1 of 20 |
| Supertonic 3, 8-bit, voice F1 | id | 129 MB | 337 MB | 0.60 s | 6.1% | 0.8% | 0 |
| Supertonic 3, full, voice F1 | id | 487 MB | 505 MB | 0.85 s | 8.1% | 0.9% | 0 |
| macOS Damayanti (draft) | id | 0 | not measured | 0.21 s | 6.2% | 0.5% | 0 |
| KittenTTS nano 0.8 (8-bit) | en | 31 MB | 173 MB | 0.37 s | 1.9% | 0.4% | 0 |
| Piper Kristin | en | 67 MB | 257 MB | 0.30 s | 6.2% | 3.2% | 1 of 20 |
| Kokoro 82M v1.0, voice af_heart | en | 350 MB | 689 MB | 1.31 s | 3.1% | 1.0% | 0 |
| Supertonic 3, 8-bit, voice F1 | en | 129 MB | 337 MB | 0.60 s | 2.8% | 1.5% | 0 |
| Supertonic 3, full, voice F1 | en | 487 MB | 505 MB | 0.91 s | 2.5% | 0.5% | 0 |
| macOS Samantha (draft) | en | 0 | not measured | 0.37 s | 3.2% | 1.4% | 1 of 20 |

How to read it:

- The program is 20 MB more, once (28 MB on Linux, 25 MB on Windows).
- "Time per second of speech" includes loading the model for every line, which is how `voice.mjs` runs. Speaking alone, on one sentence: Piper 0.10, Kitten 0.26, Supertonic 8-bit 0.41, Kokoro 0.98.
- Word errors include the listener's own spelling habits ("halaman ku" for "halamanku", "Funksi" for "Fungsi"), so they overstate mispronunciation. Character errors are steadier. A line is flagged when character errors reach 15%, or word errors 20% with character errors 8%.
- The two flagged lines were real: Piper Kristin turned "fourth graders in Yogyakarta" into something a listener wrote as "forth greater Xenogia Carter", and Piper news_tts said "Tips" so that it was heard as "Fitz". The Samantha flag was a date the listener wrote as "3 March".
- Kitten was chosen over Piper Kristin for English `ringan` on these numbers: it kept Indonesian names and places intact (Dimas, Maya, Yogyakarta, Surabaya), which is what these learners write. Which of the two sounds nicer is for ears.
- Whisper itself took about 1.6 s a line and 536 MB.
- Every spoken line came out at -17 LUFS with a true peak of -2 dBTP or lower.

What the check cannot do: whisper writes "15.000" whether a voice said "lima belas ribu" or "satu lima titik nol nol nol", so a misread number passes. That is why `voice.mjs` stops before speaking when a line holds digits, an address or a sign, and says what to write instead ("lima belas ribu"). Three addresses were tried with five voices and all five mangled them.

## Local voices that were looked at

Licences read at the source on 15 November 2026. "Not tested" means its page was read and nothing was run.

| Voice or model | Indonesian | Licence of the weights | Size | Notes |
|---|---|---|---|---|
| [Piper `id_ID-news_tts-medium`](https://huggingface.co/rhasspy/piper-voices/tree/main/id/id_ID/news_tts/medium) | yes | none documented; see above | 63 MB (21 MB as 8-bit) | the Indonesian `ringan` voice |
| [Supertonic 3](https://huggingface.co/Supertone/supertonic-3) | yes | OpenRAIL-M, commercial use with use restrictions | 398 MB (129 MB as 8-bit) | measured; awaits an owner decision |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | no (English, Spanish, French, Hindi, Italian, Japanese, Portuguese, Chinese) | Apache-2.0 | 350 MB | best local English voice here |
| [KittenTTS nano 0.8](https://huggingface.co/KittenML/kitten-tts-nano-0.8-fp32) | no (English) | Apache-2.0 | 31 MB | English `ringan` |
| Piper English voices trained from scratch on public-domain recordings: Kristin, Norman, John, LJSpeech | no | public domain recordings; on Piper's commercial-use list | 67 MB each | Kristin measured |
| [Kyutai Pocket TTS](https://huggingface.co/kyutai/pocket-tts) | no (English, French, German, Portuguese, Italian, Spanish); its page mentions a community-trained Indonesian model, not found or checked | CC BY 4.0 | 100M parameters | gated download; runs in sherpa-onnx; not tested |
| [ZONOS3-Mini](https://huggingface.co/Zyphra/ZONOS3-Mini) | yes (43 languages) | Apache-2.0 | 800M parameters; its smallest files total over 1.1 GB | clones or designs a voice; "runs in real time on phones and laptops" by its own page; not tested, too large for this task's download limit |
| [Confucius4-TTS](https://huggingface.co/netease-youdao/Confucius4-TTS) | yes (14 languages, Malay too) | Apache-2.0 | not sized | needs PyTorch and a reference recording to clone; not tested |
| [Audio8 TTS Realistic Air](https://huggingface.co/Edge0/Audio8-TTS-Realistic-Air) | yes | Apache-2.0 | 601M parameters | needs PyTorch; not tested |
| [VoxCPM2](https://huggingface.co/openbmb/VoxCPM2) | yes (30 languages) | Apache-2.0 | 2B parameters, "~8 GB" of graphics memory | too heavy for a learner's laptop |
| [OmniVoice](https://huggingface.co/k2-fsa/OmniVoice) | yes (600+ languages) | "CC-BY-NC due to constraints from its training data" | 0.6B parameters | non-commercial |
| [Meta MMS-TTS Indonesian](https://huggingface.co/facebook/mms-tts-ind) | yes | CC BY-NC 4.0 | not tested | non-commercial |
| [Wikidepia/indonesian-tts](https://github.com/Wikidepia/indonesian-tts) | yes | no licence file; README: "DO NOT USE FOR COMMERCIAL PURPOSES!"; trained partly on Azure TTS output | not tested | non-commercial |
| [sanoTTS](https://huggingface.co/ampixa/sanoTTS) | yes, a 1.46M-parameter voice distilled from the Piper news_tts voice | GPL-3.0 | under 9 MB a voice | inherits the Piper voice's open question; not tested |
| [Higgs TTS 3](https://huggingface.co/bosonai/higgs-tts-3-4b) | yes | research and non-commercial licence | 5B parameters | non-commercial |
| [Fish Audio S2 Pro](https://huggingface.co/fishaudio/s2-pro) | yes | Fish Audio Research License: "Commercial use requires a separate license" | 5B parameters | non-commercial |
| [Chatterbox Multilingual V3](https://huggingface.co/ResembleAI/chatterbox) | no. It lists Malay, which is a different language from Indonesian | MIT | 0.5B parameters | not tested |
| [Qwen3-TTS](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice) | no ("10 major languages") | Apache-2.0 | 0.6B parameters | not tested |
| [XTTS-v2](https://huggingface.co/coqui/XTTS-v2) | no (17 languages) | Coqui Public Model License, non-commercial | not tested | |
| macOS `say` (Damayanti, Samantha) | yes | macOS licence, section 2F: system voices are for "your personal, non-commercial use" and not for "publishing or redistribution ... in a profit, non-profit, public sharing or commercial context" | on every Mac | draft only |
| [espeak-ng](https://github.com/espeak-ng/espeak-ng) | yes | GPL-3.0-or-later; the audio is the user's | a few MB | robot-like formant voice; not offered |

The macOS wording is from the licence file on this Mac (`/Library/Documentation/License.lpdf`, "SOFTWARE LICENSE AGREEMENT FOR macOS Tahoe 26").

## Sound effects

Four palettes, 87 mono 48 kHz WAV files, 1.7 MB in all, in `kit/sound/sfx/`. Each palette has 3 sounds for each of the 7 cue types (the paper palette has 6 whooshes). `sfx/SOURCES.md` lists every file with its origin, licence and what was done to it.

| Palette | The kit's look | Made of |
|---|---|---|
| `soft` | any look without its own palette | Kenney interface pops, plucks and ticks; whooshes synthesised from filtered noise |
| `paper` | `kertas` | Kenney recordings of books being placed, cards sliding, a pen scratching |
| `pixel` | `warnet` | 8-bit blips from the kit's own synthesiser, nothing recorded |
| `bold` | `panggung` | Kenney recordings of wood, tin and metal hits; lower, heavier synthesised whooshes |

Sources and their licences:

- [Kenney](https://kenney.nl/assets?q=audio) audio packs (Interface Sounds, UI Audio, Impact Sounds, RPG Audio, Casino Audio): Creative Commons Zero. Each pack's `License.txt`: "This content is free to use in personal, educational and commercial projects." The site's support page: "Attribution is not required."
- The 8-bit synthesiser, `dev/synth.mjs`, was written for this kit in the manner of sfxr. It uses no code from sfxr or from [jsfxr](https://github.com/chr15m/jsfxr) (Unlicense). The sounds it makes are the kit's own.
- Sounds were picked by their names in the packs and by measurements (`dev/analyze.mjs`: length, attack, pitch centre, share of low and high energy), then levelled so variations of one cue are equally loud. Nobody listened to them.

Generators that were read about and not used:

| Model | Licence | Why not |
|---|---|---|
| [Stable Audio Open Small](https://huggingface.co/stabilityai/stable-audio-open-small) | Stability AI Community License: free for "researchers, developers, small businesses, and creators with less than $1M in annual revenue"; above that, a paid licence | 0.5B parameters, up to 11 s of stereo sound, download needs a Hugging Face account and agreement. Not run here. |
| [Stable Audio 3 Small SFX](https://huggingface.co/stabilityai/stable-audio-3-small-sfx) (May 2026) | the same Community License, plus the Gemma Terms of Use for its text encoder | 0.6B parameters; its page says "less than a few seconds on a MacBook Pro M4" and gives no memory figure. Gated. Not run here, so whether it fits 1.5 GB of memory is unknown. |
| [AudioGen](https://huggingface.co/facebook/audiogen-medium) | CC BY-NC 4.0 | non-commercial |
| [MMAudio](https://github.com/hkchengrex/MMAudio) | code MIT; "The checkpoints are released ... under the CC-BY-NC 4.0 license" | non-commercial |

A learner under the revenue line could make their own effects with Stable Audio and drop the files into a palette folder. The kit does not do it for them.

## How the mix is made

- Every hit (`land`, `press`, `cut`, `marker`) starts on its cue, to within 4 ms (20 ms for the paper palette, whose recordings fade in).
- `type` is a tick train of about 10 ticks a second with small gaps and uneven timing, each tick 8 to 11 dB under a landing of the same weight. `count` is 14 blips a second rising in pitch.
- A `whoosh` with an `until` is centred on its move, using the palette's longest fitting sound. A `whoosh` without one swells into the next hit within 0.7 s, so its loudest moment lands on that hit.
- `weight` 1, 2, 3 is -6, -3, 0 dB.
- Of two hits closer than 120 ms, the lighter (or the later) is turned down 9 dB.
- A spoken line starts 0.3 s after its scene, and its scene lasts until 0.5 s after the line (the cover between scenes closes over the last 0.4 s of that; the last scene simply holds). While someone speaks, music drops 8 dB and effects drop 3 dB, eased over a tenth of a second.
- The master brings the mix to -16 LUFS with a true peak under -1.5 dBTP, using a look-ahead limiter. Speech and music reach -16. Sound effects alone are short and far apart, so the mix stops where the limiter would cut more than 3 dB and says so: in the test video the four palettes land between -22.6 and -16.1 LUFS.
- The file is exactly as long as the video. The same input gives the same bytes; `mix-report.json` carries a SHA-256.
- The meter is the kit's own (ITU-R BS.1770-4, checked against a 997 Hz tone). ffmpeg's `ebur128` is the referee and its numbers are the ones reported; the two agree within 0.2 LU and 0.1 dB on the test mixes.

## What the video builder and the sound layer agree on

- The builder writes `video/cues.json` (`look`, `duration`, `cues` with `t`, `type`, `scene`, `weight`, optional `until`) and `video/mk-plan.json` (each scene's `n`, `start`, `dur`). `mix.mjs` needs the first and uses the second to place the voice; without it, a scene starts at its earliest cue.
- Scene numbers count from 1 everywhere: `scene-1.wav`, `my-voice/1.mp3`, "Scene 1" in messages, `scene` in the cues, and the keys of `durations.json` (`{ "1": 2.24, "2": 4.15 }`). Until 0.4.0 `durations.json` alone counted from 0.
- A take counts only while it still says the storyboard's words in the storyboard's voice. `lib/project.mjs` (`voiceTakes`) compares each scene's `voice` line and the `narrator` with `video/voice/report.json`; the builder stretches a scene only for a take that passes, the mixer leaves the others out (`voiceLeftOut` in `mix-report.json`), and the builder prints which scenes are "not spoken yet" with the command that makes them.
- The contact sheet stays when only the sound changed: the builder keeps `video/sheet.png` and `video/frames/` when the storyboard's pictures (everything but the `voice` lines and the sound settings) are the same as in the last build.
- `t` on a `whoosh`, `type` or `count` is where it starts; on a hit it is the moment of impact.
- The look picks the palette: `warnet` pixel, `kertas` paper, `panggung` bold, anything else soft. `--palette` overrides.
- Music is the storyboard's `music` path, read from the storyboard's folder.
- `mix.mjs --check` exits 1 when `mix.wav` was made for an older timeline, voice or music. The builder mixes on every build, so this can only happen to a folder changed by hand.
- `video/voice/report.json` holds each line's length, loudness, what the listener heard and the voice's notice. `mix-report.json` holds the loudness, the peak and where each cue's sound was placed.

## Installing, for a learner

| To get | Run | Downloads |
|---|---|---|
| Indonesian practice voice | `node kit/sound/install.mjs piper-id` | 41 MB from github.com |
| English light voice | `node kit/sound/install.mjs kitten` | 52 MB |
| English best local voice | `node kit/sound/install.mjs kokoro` | 370 MB |
| ElevenLabs | nothing to install: `"narrator": "bagus"` in the storyboard | nothing |
| Own voice | nothing to install: `"narrator": "sendiri"` in the storyboard | nothing |
| The line check | whisper.cpp's `whisper-cli` (on a Mac: `brew install whisper-cpp`), then `node kit/sound/install.mjs whisper` | 190 MB model, MIT |
| Supertonic 3 (optional) | `node kit/sound/install.mjs supertonic-ringan` | 149 MB |

Sizes after the first voice are smaller, because the 20 MB program is shared. In a room with slow internet, download once and pass the folder with `--from`.

A learner can run these by hand. Claude runs an install only after it has asked the question `kit/sound.mjs` prints (the voice's name, the size, the source, the folder) and the learner has answered yes: rule 8 of `SKILL.md`.

## Not tested

- **Windows and Linux.** The mixer, the meter and the tests need only Node and should behave the same, but they ran only on this Mac. `engines.json` names the sherpa-onnx builds for Windows (x64, ARM) and Linux (x64, ARM) with the checksums GitHub publishes; none was downloaded or run. `install.mjs` unpacks with the system's `tar`; Windows 10 and 11 ship one, and whether every version reads `.tar.bz2` was not checked. `whisper-cli` on Windows was not tried.
- **Intel Macs.** The x64 build is named, not run.
- **A weak laptop.** Estimate, not a measurement: if an old dual-core is 3 to 5 times slower per core than this M1 Pro, Piper news_tts needs about 1.2 to 2 seconds per second of speech and Kitten about 1.1 to 1.9, so a 20-second video's voice takes under a minute. Their memory use (157 to 173 MB) fits a 4 GB computer. Kokoro at that speed would take 4 to 6.5 seconds per second of speech and 689 MB.
- **The ElevenLabs key path** against the real service, and ElevenLabs' voices in Indonesian.
- **Recording.** The kit reads recordings; it does not record. The own-voice path ran with stand-in files, not with a person at a microphone.
- **The Piper program itself** (`piper-tts`). The voice ran in sherpa-onnx.
- **Music from a real track.** Ducking was measured with a synthesised placeholder bed.
- **The install path on Haiku.** No trial run ever reached `install.mjs`: every run in which a voice was missing stopped at the question, as it should, and nobody answered yes. `install.mjs` itself ran when the voices on this Mac were installed.

## What only ears can judge

1. Whether each palette suits its look, and whether any single sound is ugly. `e-palette-*-every-cue.wav` plays every cue type of a palette in 13 seconds.
2. Whether effects are too loud or too quiet against a voice (they sit about 6 dB under it, 3 dB more while it speaks).
3. Piper news_tts against Supertonic 3 in Indonesian: natural or flat, and how each says "Claude Code", "HTML", "CSS". A listener wrote Supertonic's "Claude Code" as "cloud kodi".
4. Kitten against Piper Kristin against Kokoro in English.
5. Whether Supertonic's 8-bit weights sound worse than its full ones. The numbers cannot tell them apart.
6. Whether typing ticks are pleasant or irritating over 3 seconds of code.
7. Whether the whoosh into a cut lands where the eye expects.
8. Whether a list line's sound should come a little later. Its sound starts with its bullet; the words follow about 0.1 s after (measured in "Sound" of `docs/MOTION-KIT.md`).
9. Whether the paper palette feels late. Its recordings fade in, so their steepest rise comes 27 to 64 ms after the cue.

## Still to decide

1. Supertonic 3 for Indonesian: keep it as an unlisted option, make it a tier next to Piper, or drop it. It needs a caption line saying the voice is AI-made.
2. Kitten or Piper Kristin as the English light voice, after listening.
3. Whether sound effects stay on by default once the palettes have been heard (`SOUND_DEFAULT` in `kit/lib/spec.mjs`).

Settled since this page was first written: the track 3 guide already said what ElevenLabs' free plan allows, and the API branch `workshop-guides-voice` adds what a page used for business needs.
