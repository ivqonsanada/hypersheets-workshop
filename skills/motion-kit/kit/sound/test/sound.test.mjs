// node --test test/   (from kit/sound). Needs only Node; the ffmpeg comparison skips without ffmpeg.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, fromDb, toDb, peak } from "../lib/dsp.mjs";
import { integrated, truePeakDb, limit } from "../lib/loudness.mjs";
import { readWav, writeWav } from "../lib/wav.mjs";
import { measure, ffmpegPath } from "../lib/ffmpeg.mjs";
import { checkCues, CUE_TYPES } from "../lib/project.mjs";
import { compare, words, advice, numberWords, lint } from "../lib/text.mjs";
import { layCues, master, pickPalette, speaking, duck } from "../mix.mjs";
import { tidy } from "../voice.mjs";
import { registry } from "../lib/engines.mjs";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(KIT, "sfx", "palettes.json"), "utf8"));
const sine = (hz, seconds, amp) => Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / RATE));
const palette = (name) => Object.fromEntries(CUE_TYPES.map((t) => [t, manifest.palettes[name][t].map((e) => ({ ...e, x: readWav(join(KIT, "sfx", e.file)).channels[0] }))]));

// When each burst of sound starts: the first 2 ms window louder than the floor after 20 ms of quiet.
function onsets(x, floorDb = -45) {
  const hop = RATE / 500, floor = fromDb(floorDb), out = [];
  let quiet = 99;
  for (let i = 0; i + hop <= x.length; i += hop) {
    let m = 0;
    for (let k = i; k < i + hop; k++) m = Math.max(m, Math.abs(x[k]));
    if (m > floor) { if (quiet >= 10) out.push(i / RATE); quiet = 0; } else quiet++;
  }
  return out;
}

test("the meter reads a 997 Hz tone as the standard says", () => {
  const x = sine(997, 5, 0.5);
  assert.ok(Math.abs(integrated([x, x]) - -6.02) < 0.1);
  assert.ok(Math.abs(integrated([x]) - -9.03) < 0.1);
  assert.ok(Math.abs(truePeakDb([x]) - -6.02) < 0.2);
});

test("true peak sees a peak that falls between samples", () => {
  const x = Float32Array.from({ length: RATE }, (_, i) => Math.sin((2 * Math.PI * i) / 4 + Math.PI / 4));
  assert.ok(toDb(peak(x)) < -2.9, "the samples themselves stay near -3 dB");
  assert.ok(truePeakDb([x]) > -0.3, "the wave between them reaches 0 dB");
});

test("the limiter holds the ceiling and leaves quiet audio alone", () => {
  const loud = sine(220, 1, 1.2);
  const held = limit([loud], -1.5);
  assert.ok(truePeakDb(held.channels) <= -1.45);
  const quiet = sine(220, 1, 0.1);
  assert.equal(limit([quiet], -1.5).channels[0], quiet);
});

test("WAV files survive a round trip at 16 and 24 bits", () => {
  const dir = mkdtempSync(join(tmpdir(), "mk-sound-"));
  const x = sine(440, 0.1, 0.5);
  for (const bits of [16, 24]) {
    const f = join(dir, `t${bits}.wav`);
    writeWav(f, [x, x], RATE, bits);
    const r = readWav(f);
    assert.equal(r.rate, RATE);
    assert.equal(r.channels.length, 2);
    assert.ok(Math.abs(r.channels[1][1000] - x[1000]) < 1 / 30000);
  }
  rmSync(dir, { recursive: true });
});

test("every palette has two or more sounds for every cue, all 48 kHz mono and unclipped", () => {
  let bytes = 0;
  for (const [name, pal] of Object.entries(manifest.palettes)) {
    for (const type of CUE_TYPES) {
      assert.ok(pal[type].length >= 2, `${name} ${type}`);
      for (const e of pal[type]) {
        const w = readWav(join(KIT, "sfx", e.file));
        bytes += w.channels[0].length * 2;
        assert.equal(w.rate, RATE);
        assert.equal(w.channels.length, 1);
        assert.ok(peak(w.channels[0]) < 0.95, `${e.file} peaks at ${toDb(peak(w.channels[0])).toFixed(1)} dB`);
        assert.ok(w.channels[0].length / RATE <= 1.4, `${e.file} is short`);
        if (type === "whoosh") assert.ok(e.peak > 0 && e.peak < e.seconds);
      }
    }
  }
  assert.ok(bytes < 3e6, "the whole sfx folder stays under 3 MB");
});

test("a look picks its palette, and an unknown look falls back to soft", () => {
  assert.equal(pickPalette(manifest, "warnet").name, "pixel");
  assert.equal(pickPalette(manifest, "kertas").name, "paper");
  assert.equal(pickPalette(manifest, "panggung").name, "bold");
  assert.equal(pickPalette(manifest, "something-new").name, "soft");
  assert.equal(pickPalette(manifest, "kertas", "bold").name, "bold");
  assert.equal(pickPalette(manifest, "kertas", "nope"), null);
});

test("hits start on their cue, to within 4 ms", () => {
  const cues = { duration: 6, cues: [{ t: 1, type: "land" }, { t: 2.5, type: "press", weight: 3 }, { t: 4, type: "cut" }, { t: 5, type: "marker" }] };
  for (const name of Object.keys(manifest.palettes)) {
    const bus = new Float32Array(6 * RATE);
    layCues(cues, palette(name), "1", bus);
    const found = onsets(bus, -50);
    for (const q of cues.cues) assert.ok(found.some((t) => Math.abs(t - q.t) <= 0.004 + (name === "paper" ? 0.02 : 0)), `${name} ${q.type} at ${q.t}: ${found.map((t) => t.toFixed(3))}`);
  }
});

test("typing is a soft tick train, not a machine gun", () => {
  const cues = { duration: 5, cues: [{ t: 1, until: 3, type: "type", weight: 1 }, { t: 4, type: "land", weight: 2 }] };
  const bus = new Float32Array(5 * RATE);
  const report = layCues(cues, palette("soft"), "1", bus);
  const train = report.find((r) => r.type === "type");
  assert.ok(train.ticks / 2 <= 12, `${train.ticks / 2} ticks a second`);
  assert.ok(train.ticks / 2 >= 6);
  const typing = peak(bus.subarray(RATE, 3 * RATE)), land = peak(bus.subarray(4 * RATE, 5 * RATE));
  assert.ok(typing < land, "a tick never outshouts a weight 2 hit");
});

test("of two hits within 120 ms, the lighter one is turned down", () => {
  const cues = { duration: 3, cues: [{ t: 1, type: "land", weight: 3 }, { t: 1.08, type: "land", weight: 1 }, { t: 2, type: "land", weight: 2 }, { t: 2.2, type: "land", weight: 2 }] };
  const report = layCues(cues, palette("bold"), "1", new Float32Array(3 * RATE));
  assert.match(report[1].note, /turned down 9 dB/);
  assert.equal(report[1].gainDb, -15);
  assert.equal(report[0].note, undefined);
  assert.equal(report[3].note, undefined, "200 ms apart is far enough");
});

test("a whoosh with no end swells into the next hit; one with an end sits on its move", () => {
  const cues = { duration: 6, cues: [{ t: 1, type: "whoosh" }, { t: 1.4, type: "cut" }, { t: 3, until: 4.3, type: "whoosh" }] };
  const pal = palette("soft");
  const report = layCues(cues, pal, "1", new Float32Array(6 * RATE));
  const lead = report[0], move = report[2];
  assert.equal(lead.into, 2);
  const leadSound = pal.whoosh.find((s) => s.file === lead.sound);
  assert.ok(Math.abs(lead.at + leadSound.peak - 1.38) < 0.01, "its loudest moment lands just before the cut");
  assert.ok(lead.at >= 0.95, "and it does not start before its own cue");
  const moveSound = pal.whoosh.find((s) => s.file === move.sound);
  assert.equal(moveSound.seconds, Math.max(...pal.whoosh.map((s) => s.seconds)), "a long move takes the long whoosh");
  assert.ok(Math.abs(move.at + moveSound.peak - 3.65) < 0.06);
});

test("counting rises in pitch and ends on its last beat", () => {
  const cues = { duration: 3, cues: [{ t: 0.5, until: 1.5, type: "count", weight: 2 }] };
  const bus = new Float32Array(3 * RATE);
  const report = layCues(cues, palette("pixel"), "1", bus);
  assert.ok(report[0].ticks >= 12 && report[0].ticks <= 16);
  assert.ok(peak(bus.subarray(Math.round(1.49 * RATE), Math.round(1.6 * RATE))) > 0, "a blip sounds at the end time");
});

test("the same cues give the same samples, and a different seed gives different ones", () => {
  const cues = { duration: 4, cues: [{ t: 0.5, until: 2, type: "type" }, { t: 2.5, type: "land" }, { t: 3, type: "land" }] };
  const run = (seed) => { const b = new Float32Array(4 * RATE); layCues(cues, palette("paper"), seed, b); return Buffer.from(b.buffer).toString("base64"); };
  assert.equal(run("1"), run("1"));
  assert.notEqual(run("1"), run("2"));
});

test("the master reaches -16 LUFS for speech-like sound and keeps peaks under -1.5 dBTP", () => {
  const x = Float32Array.from({ length: 10 * RATE }, (_, i) => 0.05 * Math.sin((2 * Math.PI * 180 * i) / RATE) * (1 + Math.sin((2 * Math.PI * 3 * i) / RATE)));
  const m = master(x, x, -16, -1.5, false);
  assert.ok(Math.abs(m.lufs - -16) < 0.3, `${m.lufs}`);
  assert.ok(m.truePeakDb <= -1.5);
});

test("sparse effects stop short of the target instead of being crushed", () => {
  const bus = new Float32Array(20 * RATE);
  layCues({ duration: 20, cues: [{ t: 2, type: "land" }, { t: 9, type: "land" }, { t: 16, type: "press" }] }, palette("soft"), "1", bus);
  const m = master(bus, bus, -16, -1.5, true);
  assert.ok(m.truePeakDb <= -1.5);
  assert.ok(m.limiterDb >= -3.5, `limited by ${m.limiterDb} dB at most`);
  assert.ok(m.note && m.lufs < -16);
});

test("music drops 8 dB while someone speaks and comes back in the gaps", () => {
  const n = 6 * RATE;
  const voice = new Float32Array(n);
  for (let i = 2 * RATE; i < 4 * RATE; i++) voice[i] = 0.2 * Math.sin((2 * Math.PI * 200 * i) / RATE);
  const music = Float32Array.from({ length: n }, (_, i) => 0.1 * Math.sin((2 * Math.PI * 440 * i) / RATE));
  duck(music, speaking(voice), -8);
  const level = (from, to) => toDb(Math.sqrt(music.subarray(from * RATE, to * RATE).reduce((s, v) => s + v * v, 0) / ((to - from) * RATE)));
  assert.ok(Math.abs(level(0.5, 1.5) - level(2.5, 3.5) - 8) < 0.2, "8 dB lower under the voice");
  assert.ok(Math.abs(level(0.5, 1.5) - level(4.8, 5.8)) < 0.2, "back to full once the voice has ended");
  let step = 0;
  for (let i = 1; i < n; i++) step = Math.max(step, Math.abs(Math.abs(music[i]) - Math.abs(music[i - 1])));
  assert.ok(step < 0.01, "no click where the level changes");
});

test("cue problems come back as one sentence each", () => {
  const bad = checkCues({ duration: 10, cues: [{ t: 12, type: "land" }, { t: 1, type: "boom" }, { t: 2, until: 1, type: "type" }, { t: 3, type: "land", weight: 5 }] });
  assert.equal(bad.length, 4);
  for (const s of bad) assert.match(s, /^cues\.json cue \d .*\.$/);
  assert.equal(checkCues({ duration: 10, cues: [{ t: 1, type: "land", weight: 2 }] }).length, 0);
  assert.equal(checkCues(null).length, 1);
});

test("numbers and punctuation do not count as mishearing", () => {
  assert.deepEqual(words("Harga Rp 20.000!", "id"), ["harga", "rp", "dua", "puluh", "ribu"]);
  assert.equal(numberWords(1999, "id"), "seribu sembilan ratus sembilan puluh sembilan");
  assert.equal(numberWords(315, "en"), "three hundred fifteen");
  assert.equal(compare("We served 240 customers.", "we served two hundred forty customers", "en").wer, 0);
  const c = compare("menulis perintah untuk Claude Code", "Menulis perintah untuk Claudecode.", "id");
  assert.equal(c.cer, 0, "a lost space costs no characters");
});

test("a listener's way of writing dates and numbers is not an error", () => {
  assert.equal(compare("The workshop starts on Monday the third of March.", "The workshop starts on Monday, the 3rd of March.", "en").wer, 0);
  assert.equal(compare("We served two hundred and forty customers.", "We served 240 customers.", "en").wer, 0);
});

test("digits, addresses and signs are caught before any voice speaks", () => {
  assert.match(lint("Harganya Rp 15.000 per mangkuk.", "id")[0], /15\.000.*"lima belas ribu"/);
  assert.match(lint("It costs 1,250 dollars.", "en")[0], /"one thousand two hundred fifty"/);
  assert.match(lint("Buka rina-lestari.pages.dev sekarang.", "id")[0], /address \(rina-lestari\.pages\.dev\)/);
  assert.equal(lint("Buka rina-lestari.pages.dev sekarang.", "id").length, 1);
  assert.match(lint("Diskon 50% hari ini", "id").join(" "), /"lima puluh".*"persen"/);
  assert.match(lint("Open at 08.30", "en")[0], /the way it is said/);
  assert.deepEqual(lint("Halo, aku Rina, guru SD di Yogyakarta.", "id"), []);
});

test("advice names what to change", () => {
  assert.match(advice("I use the CLI", "x", "en"), /"C L I"/);
  assert.match(advice("Halo semua", "halo semuah", "id"), /halo semuah/);
});

test("a take is trimmed, levelled and kept under its ceiling", () => {
  const speech = Float32Array.from({ length: 3 * 22050 }, (_, i) => (i > 11025 && i < 55125 ? 0.02 * Math.sin((2 * Math.PI * 200 * i) / 22050) * (1 + Math.sin((2 * Math.PI * 4 * i) / 22050)) : 0));
  const t = tidy(speech, 22050);
  assert.ok(Math.abs(t.seconds - 2.13) < 0.1, `${t.seconds}`);
  assert.ok(Math.abs(integrated([t.x, t.x]) - -17) < 0.5);
  assert.ok(truePeakDb([t.x]) <= -1.9);
});

test("every download in engines.json names its size, checksum and licence", () => {
  const reg = registry();
  for (const b of Object.values(reg.runtime.builds)) { assert.match(b.sha256, /^[0-9a-f]{64}$/); assert.ok(b.bytes > 1e6); }
  for (const [id, v] of Object.entries(reg.voices)) {
    assert.ok(v.licence.length > 20 && v.source.startsWith("https://"), id);
    assert.ok(["any", "practice", "plan", "draft"].includes(v.use), id);
    if (v.use !== "any") assert.ok(v.notice.id && v.notice.en, `${id} tells the learner its limit in both languages`);
    for (const p of v.parts) { assert.match(p.sha256, /^[0-9a-f]{64}$/); assert.ok(p.url.startsWith("https://")); }
  }
  assert.deepEqual(reg.tiers.id, { ringan: "piper-id", bagus: "elevenlabs" });
  assert.equal(reg.voices["piper-id"].use, "practice");
  assert.equal(reg.voices[reg.tiers.en.ringan].use, "any");
  assert.equal(reg.voices[reg.localBest.en].use, "any");
});

// A small project on disk: a storyboard with spoken lines and an empty video folder.
function project(lines, lang = "id") {
  const dir = mkdtempSync(join(tmpdir(), "mk-voice-"));
  mkdirSync(join(dir, "video"));
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify({ recipe: "promo", look: "kertas", lang, scenes: lines.map((voice) => (voice ? { type: "title", voice } : { type: "list" })) }));
  return dir;
}
const speechLike = (seconds) => Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => 0.1 * Math.sin((2 * Math.PI * 190 * i) / RATE) * (1 + Math.sin((2 * Math.PI * 4 * i) / RATE)));
const runVoice = (dir, flags, env = {}) => new Promise((done) => {
  const child = spawn(process.execPath, [join(KIT, "voice.mjs"), join(dir, "video"), ...flags], { env: { ...process.env, HS_SOUND_HOME: join(dir, "no-sound-home"), ELEVENLABS_API_KEY: "", ELEVENLABS_VOICE_ID: "", ...env } });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  child.on("close", (status) => done({ status, out }));
});

test("with no files and no key, the ElevenLabs tier lists each line and the name to save it under", async () => {
  const dir = project(["Halo, aku Rina.", null, "Mampir ke halamanku, ya."]);
  const r = await runVoice(dir, ["--engine", "bagus"]);
  assert.equal(r.status, 3, "3 says: waiting for files only the user can make");
  assert.match(r.out, /my-voice\/1\.mp3\n  Halo, aku Rina\./);
  assert.match(r.out, /my-voice\/3\.mp3\n  Mampir ke halamanku, ya\./);
  assert.doesNotMatch(r.out, /voice\/2\.mp3/, "a scene with no voice line asks for no file");
  assert.match(r.out, /non-komersial/, "the plan's limit is said once, in the learner's language");
  rmSync(dir, { recursive: true });
});

test("files the learner made are measured, levelled and timed, from video/voice or my-voice", async () => {
  const dir = project(["Halo, aku Rina.", "Mampir ke halamanku, ya."]);
  mkdirSync(join(dir, "video", "voice"));
  mkdirSync(join(dir, "my-voice"));
  writeWav(join(dir, "video", "voice", "1.wav"), [speechLike(1.5)], RATE);
  writeWav(join(dir, "my-voice", "2.wav"), [speechLike(2.2)], 44100);
  const r = await runVoice(dir, ["--engine", "sendiri", "--no-check"]);
  assert.equal(r.status, 0, r.out);
  const durations = JSON.parse(readFileSync(join(dir, "video", "voice", "durations.json"), "utf8"));
  assert.deepEqual(Object.keys(durations), ["1", "2"], "keys are scene numbers from 1, like scene-1.wav and 1.mp3");
  assert.ok(Math.abs(durations["1"] - 1.5) < 0.2 && Math.abs(durations["2"] - 2.2 * (RATE / 44100)) < 0.3);
  const made = readWav(join(dir, "video", "voice", "scene-2.wav"));
  assert.equal(made.rate, RATE);
  assert.ok(Math.abs(integrated([made.channels[0], made.channels[0]]) - -17) < 0.6);
  assert.equal(existsSync(join(dir, "video", "voice", "NOTICE.txt")), false, "your own voice carries no notice");
  rmSync(dir, { recursive: true });
});

test("a line with digits stops before any voice speaks, with the words to write", async () => {
  const dir = project(["Harganya Rp 15.000 per mangkuk."]);
  const r = await runVoice(dir, ["--engine", "sendiri"]);
  assert.equal(r.status, 1);
  assert.match(r.out, /Scene 1's "voice" line has the number 15\.000: write it in words \("lima belas ribu"\)/);
  rmSync(dir, { recursive: true });
});

test("the ElevenLabs key goes only in the request header and never into output or files", { skip: !ffmpegPath() }, async () => {
  const dir = project(["Hello from the test."], "en");
  const mp3 = join(dir, "tone.mp3");
  writeWav(join(dir, "tone.wav"), [speechLike(1.2)], RATE);
  spawnSync(ffmpegPath(), ["-v", "error", "-y", "-i", join(dir, "tone.wav"), mp3]);
  const seen = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      seen.push({ url: req.url, key: req.headers["xi-api-key"], body: JSON.parse(body) });
      if (req.url.includes("bad-voice")) { res.writeHead(401, { "content-type": "application/json" }); res.end(JSON.stringify({ detail: { status: "invalid_api_key", message: "Invalid API key: SECRET-KEY-123" } })); return; }
      res.writeHead(200, { "content-type": "audio/mpeg" });
      res.end(readFileSync(mp3));
    });
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ELEVENLABS_API_KEY: "SECRET-KEY-123", ELEVENLABS_VOICE_ID: "voice-abc", ELEVENLABS_API_BASE: base };
  const ok = await runVoice(dir, ["--engine", "elevenlabs", "--no-check"], env);
  assert.equal(ok.status, 0, ok.out);
  assert.equal(seen[0].key, "SECRET-KEY-123");
  assert.equal(seen[0].url, "/v1/text-to-speech/voice-abc?output_format=mp3_44100_128");
  assert.deepEqual(seen[0].body, { text: "Hello from the test.", model_id: "eleven_multilingual_v2" });
  assert.ok(existsSync(join(dir, "video", "voice", "1.mp3")) && existsSync(join(dir, "video", "voice", "scene-1.wav")));
  assert.match(readFileSync(join(dir, "video", "voice", "NOTICE.txt"), "utf8"), /^ElevenLabs' free plan is for non-commercial use only/);
  const again = await runVoice(dir, ["--engine", "elevenlabs", "--no-check"], env);
  assert.equal(seen.length, 1, "the same words are not fetched (or paid for) twice");
  const bad = await runVoice(dir, ["--engine", "elevenlabs", "--no-check", "--fresh"], { ...env, ELEVENLABS_VOICE_ID: "bad-voice" });
  assert.equal(bad.status, 1);
  assert.match(bad.out, /ElevenLabs answered 401 .*Check the key in ELEVENLABS_API_KEY/);
  server.close();
  const written = [ok.out, again.out, bad.out, ...["report.json", "durations.json", "NOTICE.txt", ".elevenlabs.json"].map((f) => readFileSync(join(dir, "video", "voice", f), "utf8"))].join("\n");
  assert.doesNotMatch(written, /SECRET-KEY-123/);
  const stray = await runVoice(dir, ["--engine", "elevenlabs", "--no-check", "--fresh"], { ...env, ELEVENLABS_API_BASE: "https://example.com" });
  assert.match(stray.out, /ELEVENLABS_API_BASE must be an https address at elevenlabs\.io/);
  rmSync(dir, { recursive: true });
});

test("mix.mjs writes the same file twice and ffmpeg agrees with its meter", { skip: !ffmpegPath() }, () => {
  const dir = mkdtempSync(join(tmpdir(), "mk-sound-"));
  mkdirSync(join(dir, "video"));
  writeFileSync(join(dir, "video", "cues.json"), JSON.stringify({ look: "kertas", duration: 8, cues: [{ t: 0.5, until: 1.5, type: "type", scene: 1, weight: 1 }, { t: 2, type: "land", scene: 1, weight: 2 }, { t: 3.6, type: "whoosh", scene: 1, weight: 1 }, { t: 4, type: "cut", scene: 2, weight: 2 }, { t: 5, until: 6, type: "count", scene: 2, weight: 2 }, { t: 6, type: "land", scene: 2, weight: 3 }, { t: 7, type: "press", scene: 2, weight: 2 }] }));
  const run = () => spawnSync(process.execPath, [join(KIT, "mix.mjs"), join(dir, "video")], { encoding: "utf8" });
  const first = run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const a = readFileSync(join(dir, "video", "assets", "audio", "mix.wav"));
  const report = JSON.parse(readFileSync(join(dir, "video", "mix-report.json"), "utf8"));
  run();
  assert.ok(a.equals(readFileSync(join(dir, "video", "assets", "audio", "mix.wav"))));
  assert.equal(report.palette, "paper");
  assert.equal(report.cues.length, 7);
  assert.equal(a.length, 44 + 8 * RATE * 4, "exactly as long as the video");
  const ff = measure(join(dir, "video", "assets", "audio", "mix.wav"));
  assert.ok(Math.abs(ff.lufs - report.ownMeter.lufs) <= 0.2, `${ff.lufs} vs ${report.ownMeter.lufs}`);
  assert.ok(ff.truePeakDb <= -1.5);
  assert.equal(spawnSync(process.execPath, [join(KIT, "mix.mjs"), join(dir, "video"), "--check"]).status, 0);
  writeFileSync(join(dir, "video", "cues.json"), JSON.stringify({ look: "kertas", duration: 8, cues: [] }));
  assert.equal(spawnSync(process.execPath, [join(KIT, "mix.mjs"), join(dir, "video"), "--check"]).status, 1, "a changed timeline makes the old mix stale");
  rmSync(dir, { recursive: true });
});
