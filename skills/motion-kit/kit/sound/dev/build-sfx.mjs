// Builds sfx/ from scratch: node dev/build-sfx.mjs <folder holding the unzipped Kenney packs>
// Recorded sounds are cut to their sounding part, faded, levelled and saved as mono 48 kHz WAV;
// the pixel palette and the soft and bold whooshes are synthesised here. Same input, same files.
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "../lib/ffmpeg.mjs";
import { RATE, peak, scale, fade, soundingRange, fromDb, toDb, filter, envelope } from "../lib/dsp.mjs";
import { shortLevel } from "../lib/loudness.mjs";
import { writeWav } from "../lib/wav.mjs";
import { chip, whoosh } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "sfx");
const packs = process.argv[2];
if (!packs || !existsSync(packs)) { console.error("Give the folder that holds the unzipped Kenney packs: node dev/build-sfx.mjs <folder>"); process.exit(1); }

const K = {
  ui: ["interface-sounds", "Interface Sounds 1.0", "https://kenney.nl/assets/interface-sounds"],
  ua: ["ui-audio", "UI Audio 1.0", "https://kenney.nl/assets/ui-audio"],
  im: ["impact-sounds", "Impact Sounds 1.0", "https://kenney.nl/assets/impact-sounds"],
  rp: ["rpg-audio", "RPG Audio 1.0", "https://kenney.nl/assets/rpg-audio"],
  ca: ["casino-audio", "Casino Audio 1.0", "https://kenney.nl/assets/casino-audio"],
};
const k = (pack, name, opt = {}) => ({ pack, name, ...opt });
const pix = (p) => ({ chip: p });
const air = (p) => ({ whoosh: p });

// Loudest 50 ms of every sound after levelling, in dB. Ticks sit lower because they repeat.
const LEVEL = { land: -20, press: -20, cut: -20, marker: -21, count: -23, type: -24, whoosh: -25 };

const PALETTES = {
  soft: {
    about: "Small rounded interface sounds: pops, plucks and light ticks. The default.",
    land: [k("ui", "drop_002"), k("ui", "drop_003"), k("ui", "drop_004")],
    whoosh: [
      air({ seconds: 0.34, peakAt: 0.62, from: 500, top: 2400, to: 900, q: 1.1, tilt: -4, seed: 11 }),
      air({ seconds: 0.62, peakAt: 0.6, from: 400, top: 2000, to: 700, q: 1.0, tilt: -4, seed: 12 }),
      air({ seconds: 1.25, peakAt: 0.55, from: 350, top: 1700, to: 600, q: 0.9, tilt: -5, seed: 13 }),
    ],
    type: [k("ua", "click4"), k("ua", "click5"), k("ua", "rollover2")],
    press: [k("ui", "select_005"), k("ui", "select_004"), k("ui", "switch_002")],
    count: [k("ui", "tick_002"), k("ui", "select_001"), k("ui", "select_002")],
    cut: [k("ui", "toggle_001"), k("ui", "toggle_002"), k("ui", "toggle_004")],
    marker: [k("ui", "pluck_001"), k("ui", "pluck_002"), k("ui", "glass_006")],
  },
  paper: {
    about: "Recorded paper, card and book handling: placed books, sliding cards, pen scratches.",
    land: [k("rp", "bookPlace1"), k("rp", "bookPlace2"), k("rp", "bookPlace3")],
    whoosh: [k("ca", "card-slide-5"), k("ca", "card-slide-6"), k("rp", "bookFlip2"), k("ca", "card-slide-4"), k("ca", "card-fan-1"), k("ca", "card-shove-2")],
    type: [k("ua", "click1"), k("ua", "click3"), k("ui", "click_001")],
    press: [k("ca", "card-place-1"), k("rp", "bookClose"), k("ca", "card-slide-1")],
    count: [k("ca", "chip-lay-1"), k("ca", "chip-lay-2"), k("ui", "tick_001")],
    cut: [k("rp", "bookFlip3"), k("rp", "chop"), k("rp", "knifeSlice2", { max: 0.3 })],
    marker: [k("ui", "scratch_001"), k("ui", "scratch_004"), k("ui", "scratch_005")],
  },
  bold: {
    about: "Recorded wood, tin and metal hits with weight, for a stage feel.",
    land: [k("im", "impactWood_medium_000"), k("im", "impactWood_medium_002"), k("im", "impactWood_medium_004")],
    whoosh: [
      air({ seconds: 0.3, peakAt: 0.7, from: 180, top: 1500, to: 400, q: 0.7, tilt: -9, seed: 21 }),
      air({ seconds: 0.55, peakAt: 0.68, from: 150, top: 1300, to: 320, q: 0.7, tilt: -9, seed: 22 }),
      air({ seconds: 1.2, peakAt: 0.6, from: 120, top: 1100, to: 260, q: 0.65, tilt: -10, seed: 23 }),
    ],
    type: [k("im", "impactWood_light_000"), k("im", "impactWood_light_002"), k("im", "impactWood_light_004")],
    press: [k("ui", "switch_005"), k("ui", "switch_003"), k("ui", "switch_006")],
    count: [k("im", "impactTin_medium_002"), k("im", "impactTin_medium_003"), k("im", "impactGeneric_light_000")],
    cut: [k("im", "impactGeneric_light_001"), k("im", "impactGeneric_light_003"), k("im", "impactGeneric_light_004")],
    marker: [k("im", "impactMetal_light_001"), k("im", "impactMetal_light_004"), k("im", "impactGlass_light_000")],
  },
  pixel: {
    about: "Synthesised 8-bit blips, made by dev/synth.mjs. Nothing recorded.",
    land: [196, 233, 262].map((f, i) => pix({ wave: "square", freq: f, slide: -7, duty: 0.5, hold: 0.03, punch: 0.5, decay: 0.09, lowpass: 5000, seed: 31 + i })),
    whoosh: [
      pix({ wave: "noise", freq: 70, slide: 5.5, attack: 0.2, hold: 0.02, decay: 0.1, lowpass: 6000, highpass: 300, seed: 41 }),
      pix({ wave: "noise", freq: 60, slide: 3.2, attack: 0.38, hold: 0.04, decay: 0.2, lowpass: 6000, highpass: 300, seed: 42 }),
      pix({ wave: "noise", freq: 50, slide: 1.7, attack: 0.75, hold: 0.08, decay: 0.4, lowpass: 5500, highpass: 250, seed: 43 }),
    ],
    type: [1245, 1397, 1568].map((f, i) => pix({ wave: "square", freq: f, duty: 0.25, hold: 0.004, decay: 0.014, lowpass: 7000, seed: 51 + i })),
    press: [[523, 1.5], [587, 1.5], [659, 1.335]].map(([f, r], i) => pix({ wave: "square", freq: f, duty: 0.5, jump: [r, 0.035], hold: 0.05, punch: 0.2, decay: 0.06, lowpass: 6000, seed: 61 + i })),
    count: [880, 988, 1047].map((f, i) => pix({ wave: "tri", freq: f, hold: 0.012, decay: 0.03, seed: 71 + i })),
    cut: [260, 330, 420].map((f, i) => pix({ wave: "noise", freq: f, slide: -5, hold: 0.008, decay: 0.045, highpass: 500, seed: 81 + i })),
    marker: [[440, 9], [523, 8], [392, 10]].map(([f, s], i) => pix({ wave: "square", freq: f, slide: s, duty: 0.3, dutySweep: 1.5, vib: [0.015, 28], hold: 0.07, decay: 0.07, lowpass: 7000, seed: 91 + i })),
  },
};

function render(src) {
  if (src.chip) return fade(chip(src.chip), 0.0005, 0.004);
  if (src.whoosh) return whoosh(src.whoosh);
  const [l, r] = decode(join(packs, K[src.pack][0], "Audio", src.name + ".ogg"));
  let mono = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
  mono = filter(mono, "highpass", 40, 0.7071);
  let [a, b] = soundingRange(mono, -42, 0.001, 0.02);
  if (src.max) b = Math.min(b, a + Math.round(src.max * RATE));
  const cutLen = b - a;
  return fade(mono.subarray(a, b), 0.001, Math.min(0.03, cutLen / RATE / 3));
}

rmSync(OUT, { recursive: true, force: true });
const manifest = { version: 1, rate: RATE, default: "soft", aliases: { warnet: "pixel", kertas: "paper", panggung: "bold" }, palettes: {} };
const rows = [];
let bytes = 0;
for (const [name, pal] of Object.entries(PALETTES)) {
  mkdirSync(join(OUT, name), { recursive: true });
  manifest.palettes[name] = { about: pal.about };
  for (const type of Object.keys(LEVEL)) {
    manifest.palettes[name][type] = pal[type].map((src, i) => {
      let x = render(src);
      let g = fromDb(LEVEL[type] - shortLevel(x));
      if (peak(x) * g > fromDb(-1)) g = fromDb(-1) / peak(x);
      x = scale(x, g);
      const file = `${name}/${type}-${i + 1}.wav`;
      writeWav(join(OUT, file), [x], RATE, 16);
      bytes += 44 + x.length * 2;
      const seconds = Math.round((x.length / RATE) * 1000) / 1000;
      const origin = src.pack ? `Kenney ${K[src.pack][1]}, \`Audio/${src.name}.ogg\`` : src.chip ? "synthesised (dev/synth.mjs, chip)" : "synthesised (dev/synth.mjs, whoosh)";
      const made = src.pack ? `cut to its sounding part${src.max ? `, first ${src.max} s` : ""}, 40 Hz high-pass, faded, mono, levelled` : "levelled";
      rows.push({ file, origin, url: src.pack ? K[src.pack][2] : "", licence: src.pack ? "CC0 1.0" : "made for this kit", made, seconds, peakDb: Math.round(toDb(peak(x)) * 10) / 10 });
      if (type !== "whoosh") return { file, seconds };
      // Where a whoosh is loudest, so the mixer can put that moment in the middle of a move.
      const env = envelope(x, 0.02, 0.005);
      return { file, seconds, peak: Math.round(env.indexOf(Math.max(...env)) * 5 + 10) / 1000 };
    });
  }
}
writeFileSync(join(OUT, "palettes.json"), JSON.stringify(manifest, null, 2) + "\n");

const md = [
  "# Where every sound comes from",
  "",
  "Built by `dev/build-sfx.mjs`; this file is written by that script, so edit the script, not this page.",
  "",
  "Recorded sounds are from Kenney's audio packs (kenney.nl), released under Creative Commons Zero (CC0 1.0). Each pack's `License.txt` says: \"This content is free to use in personal, educational and commercial projects.\" Credit is not required. The synthesised sounds were made for this kit by `dev/synth.mjs` and carry no outside licence.",
  "",
  "Every file is mono, 48 kHz, 16-bit WAV. \"Levelled\" means its loudest 50 ms sits at a fixed level for its cue type, so variations of one cue sound equally loud.",
  "",
  "| File | Origin | Licence | What was done | Length | Peak |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => `| \`${r.file}\` | ${r.url ? `[${r.origin}](${r.url})` : r.origin} | ${r.licence} | ${r.made} | ${r.seconds} s | ${r.peakDb} dBFS |`),
  "",
];
writeFileSync(join(OUT, "SOURCES.md"), md.join("\n"));
console.log(`${rows.length} sounds, ${(bytes / 1e6).toFixed(2)} MB, in ${OUT}`);
