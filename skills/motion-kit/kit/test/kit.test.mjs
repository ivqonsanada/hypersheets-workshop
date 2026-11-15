// The kit and its sound, joined: what the builder lays by itself, what the storyboard can
// switch, and what the one sound command does and says. Run with: node --test
// Only Node is needed. No voice is synthesised and nothing is downloaded: spoken lines are
// stand-in recordings, and the folder of installed voices is an empty one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOUND_DEFAULT, NARRATORS } from "../lib/spec.mjs";
import { writeWav } from "../sound/lib/wav.mjs";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(KIT, "..");
const RATE = 48000;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const speechLike = (seconds) => Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => 0.1 * Math.sin((2 * Math.PI * 190 * i) / RATE) * (1 + Math.sin((2 * Math.PI * 4 * i) / RATE)));

// A folder with a storyboard, as a user's folder would be. `change` edits the example first.
function project(example, change = (sb) => sb) {
  const dir = mkdtempSync(join(tmpdir(), "mk-kit-"));
  const sb = change(json(join(SKILL, "examples", `${example}.json`)));
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(sb, null, 2));
  for (const s of sb.scenes) if (s.file) writeFileSync(join(dir, s.file), /\.html?$/.test(s.file) ? "<!doctype html><html lang=\"id\"><body><h1>Wayan Sudiarta</h1><ul><li>Satu</li><li>Dua</li></ul></body></html>" : PNG);
  return dir;
}
const node = (dir, script, env = {}) => {
  const r = spawnSync(process.execPath, [join(KIT, script), "storyboard.json"], { cwd: dir, encoding: "utf8", env: { ...process.env, HS_SOUND_HOME: join(dir, ".no-voices"), ELEVENLABS_API_KEY: "", ELEVENLABS_VOICE_ID: "", ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const build = (dir) => node(dir, "build.mjs");
const sound = (dir) => node(dir, "sound.mjs");
const speak = (sb, lines, narrator) => { lines.forEach((v, i) => { if (v) sb.scenes[i].voice = v; }); if (narrator) sb.narrator = narrator; return sb; };
const LINES = ["Tiga hal sebelum menekan tombol kirim.", "Buka di layar HP, lalu baca ulang semua teks.", "Mampir ke kelasnya, alamatnya ada di layar."];

test("every example builds, and each look brings its own sounds", () => {
  const palette = { warnet: "pixel", kertas: "paper", panggung: "bold" };
  const looks = new Set();
  for (const f of readdirSync(join(SKILL, "examples"))) {
    const dir = project(f.replace(".json", ""));
    const r = build(dir);
    assert.equal(r.status, 0, `${f}: ${r.out}`);
    const plan = json(join(dir, "video", "mk-plan.json"));
    looks.add(plan.look);
    assert.equal(plan.sound.on, true, `${f} has sound without being asked`);
    assert.ok(plan.sound.effects >= 8, `${f} has ${plan.sound.effects} effects`);
    assert.equal(plan.sound.palette, palette[plan.look]);
    assert.deepEqual(plan.sound.voice, []);
    assert.ok(plan.sound.truePeakDb <= -1.5 && plan.sound.lufs <= -15.5 && plan.sound.lufs >= -26, `${f}: ${plan.sound.lufs} LUFS, ${plan.sound.truePeakDb} dBTP`);
    assert.match(readFileSync(join(dir, "video", "index.html"), "utf8"), /<audio id="mk-mix" src="assets\/audio\/mix\.wav" data-start="0"/);
    assert.equal(readFileSync(join(dir, "video", "assets", "audio", "mix.wav")).length, 44 + Math.round(plan.duration * RATE) * 4, "the mix is as long as the video");
    rmSync(dir, { recursive: true });
  }
  assert.deepEqual([...looks].sort(), ["kertas", "panggung", "warnet"]);
});

test("sound effects are the default, and one constant says so", () => {
  assert.equal(SOUND_DEFAULT, "on");
  assert.deepEqual(NARRATORS, ["ringan", "kokoro", "bagus", "sendiri", "draft"]);
});

test("\"sound\": \"off\" gives a silent video and takes an older mix away", () => {
  const dir = project("tips");
  assert.equal(build(dir).status, 0);
  assert.ok(existsSync(join(dir, "video", "assets", "audio", "mix.wav")));
  const sb = json(join(dir, "storyboard.json"));
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify({ ...sb, sound: "off" }));
  const r = build(dir);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Sound: none \(the storyboard says "sound": "off"\)/);
  assert.equal(json(join(dir, "video", "mk-plan.json")).sound.on, false);
  assert.equal(existsSync(join(dir, "video", "assets", "audio", "mix.wav")), false);
  assert.equal(existsSync(join(dir, "video", "mix-report.json")), false);
  assert.doesNotMatch(readFileSync(join(dir, "video", "index.html"), "utf8"), /<audio/);
  rmSync(dir, { recursive: true });
});

test("the same storyboard gives the same sound, byte for byte", () => {
  const dir = project("coding");
  build(dir);
  const a = readFileSync(join(dir, "video", "assets", "audio", "mix.wav")), ra = readFileSync(join(dir, "video", "mix-report.json"));
  build(dir);
  assert.ok(a.equals(readFileSync(join(dir, "video", "assets", "audio", "mix.wav"))));
  assert.ok(ra.equals(readFileSync(join(dir, "video", "mix-report.json"))));
  rmSync(dir, { recursive: true });
});

test("the builder checks spoken lines and sound settings, one sentence each", () => {
  const dir = project("tips", (sb) => speak({ ...sb, sound: "off", narrator: "merdu" }, ["Diskon 30% sampai 15.000 di toko.id"]));
  const r = build(dir);
  assert.equal(r.status, 1);
  assert.match(r.out, /"sound": "off" keeps the video silent, but scene 1 has a "voice" line\. Remove "sound": "off", or remove the "voice" lines\./);
  assert.match(r.out, /scene 1 "voice" has an address \(toko\.id\), and voices misread addresses: leave it out of the spoken line/);
  assert.match(r.out, /scene 1 "voice" has the number 30: write it in words \("tiga puluh"\)/);
  assert.match(r.out, /scene 1 "voice" has the sign %: write the word instead \(for example "persen"\)/);
  assert.match(r.out, /"narrator" says which voice speaks the "voice" lines\. It must be one of: ringan, kokoro, bagus, sendiri, draft\./);
  assert.equal(existsSync(join(dir, "video")), false, "nothing is written while the storyboard has problems");
  const lone = project("tips", (sb) => ({ ...sb, narrator: "ringan" }));
  assert.match(build(lone).out, /"narrator" is set, but no scene has a "voice" line\./);
  const long = project("tips", (sb) => speak(sb, [Array(30).fill("kata").join(" ")], "ringan"));
  assert.match(build(long).out, /scene 1 "voice" has 30 words; this scene has room for about \d+\. Say it shorter\./);
  for (const d of [dir, lone, long]) rmSync(d, { recursive: true });
});

test("a video with spoken lines says they are waiting, and the sound command makes them from the user's recordings", () => {
  const dir = project("tips", (sb) => speak(sb, LINES, "sendiri"));
  const first = build(dir);
  assert.equal(first.status, 0, first.out);
  assert.match(first.out, /The "voice" lines of scenes 1, 2 and 3 are not spoken yet\. After the sheet and REVIEW\.md, and before the render, run:\n  node ".*kit\/sound\.mjs"/);
  const before = json(join(dir, "video", "mk-plan.json"));
  assert.deepEqual(before.sound.voiceWaiting, [1, 2, 3]);
  writeFileSync(join(dir, "video", "sheet.png"), "the sheet");

  // No recordings yet: the list to hand to the user, and no render.
  const wait = sound(dir);
  assert.equal(wait.status, 1);
  for (const [i, line] of LINES.entries()) assert.ok(wait.out.includes(`my-voice/${i + 1}.m4a\n  ${line}`), wait.out);
  assert.match(wait.out, /Do not render yet\. Do not make these files yourself\./);

  mkdirSync(join(dir, "my-voice"));
  [2.6, 5.5, 3.1].forEach((s, i) => writeWav(join(dir, "my-voice", `${i + 1}.wav`), [speechLike(s)], RATE));
  const r = sound(dir);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^OK\. The video speaks now: 3 lines by your own voice/);
  assert.match(r.out, /Next, render:\n  npx hyperframes@0\.9\.51 render video --quality standard --workers 1 -o video\/video\.mp4\n$/);
  assert.match(r.out, /Tell the user this about their files; the video is made either way:/);
  assert.deepEqual(Object.keys(json(join(dir, "video", "voice", "durations.json"))), ["1", "2", "3"], "scene numbers from 1, like scene-1.wav");
  const plan = json(join(dir, "video", "mk-plan.json")), mix = json(join(dir, "video", "mix-report.json"));
  assert.deepEqual(plan.sound.voice, [1, 2, 3]);
  assert.deepEqual(plan.sound.voiceWaiting, []);
  assert.ok(plan.duration > before.duration, "the video grew to hold its lines");
  assert.ok(Math.abs(plan.sound.lufs - -16) <= 0.5 && plan.sound.truePeakDb <= -1.5, `${plan.sound.lufs} LUFS, ${plan.sound.truePeakDb} dBTP`);
  for (const v of mix.voice) {
    const sc = plan.scenes.find((s) => s.n === v.scene), last = v.scene === plan.scenes.length;
    assert.ok(v.at >= sc.start + 0.29, `scene ${v.scene} starts speaking after its cover`);
    assert.ok(v.at + v.seconds <= sc.start + sc.dur - (last ? 0.55 : 0.45), `scene ${v.scene}: the line ends ${(sc.start + sc.dur - v.at - v.seconds).toFixed(2)} s before its scene does`);
  }
  assert.equal(readFileSync(join(dir, "video", "sheet.png"), "utf8"), "the sheet", "the sheet stays when only the sound changed");

  // A line rewritten after it was spoken: its old take is left out and the builder says so.
  const sb = json(join(dir, "storyboard.json"));
  sb.scenes[1].voice = "Buka di layar HP dulu.";
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(sb));
  const again = build(dir);
  assert.match(again.out, /The "voice" line of scene 2 is not spoken yet\./);
  assert.deepEqual(json(join(dir, "video", "mk-plan.json")).sound.voice, [1, 3]);
  assert.deepEqual(json(join(dir, "video", "mix-report.json")).voiceLeftOut, [2]);
  rmSync(dir, { recursive: true });
});

test("ElevenLabs without files or a key: the lines to make and where to save them, nothing more", () => {
  const dir = project("testimonial", (sb) => speak(sb, ["This is a customer story.", null, null, "The address is on screen."], "bagus"));
  assert.equal(build(dir).status, 0);
  const r = sound(dir);
  assert.equal(r.status, 1);
  assert.ok(r.out.includes("my-voice/1.mp3\n  This is a customer story."), r.out);
  assert.ok(r.out.includes("my-voice/4.mp3\n  The address is on screen."), r.out);
  assert.doesNotMatch(r.out, /my-voice\/[23]\.mp3/);
  assert.match(r.out, /ElevenLabs' free plan is for non-commercial use only and needs "elevenlabs\.io" in the title/);
  assert.match(r.out, /Do not render yet\./);
  assert.deepEqual(json(join(dir, "video", "mk-plan.json")).sound.voiceWaiting, [1, 4]);
  rmSync(dir, { recursive: true });
});

test("a voice that is not on the computer: the question to ask, and nothing is downloaded", () => {
  for (const [example, voice, size, sentence] of [["tips", "Piper news_tts", "41 MB", /Suara Piper news_tts belum ada di komputermu\. Kalau kamu setuju, aku unduh 41 MB dari github\.com ke folder .*, dan tidak mengunduh yang lain\. Boleh aku unduh sekarang\?/], ["coding", "KittenTTS nano 0.8", "52 MB", /The voice KittenTTS nano 0\.8 is not on your computer yet\. If you agree, I will download 52 MB from github\.com into .*, and nothing else\. May I download it now\?/]]) {
    const dir = project(example, (sb) => speak(sb, ["Satu kalimat saja."], "ringan"));
    assert.equal(build(dir).status, 0);
    const r = sound(dir);
    assert.equal(r.status, 1, `${voice} (${size})`);
    assert.match(r.out, /^The voice is not on this computer yet, and nothing may be downloaded without the user's yes\./);
    assert.match(r.out, sentence);
    assert.match(r.out, /Only when the user answers yes, run this \(timeout 600000\):\n  node ".*kit\/sound\/install\.mjs" (piper-id|kitten)\n/);
    if (example === "tips") assert.match(r.out, /Say this with it, word for word:\n\n  Suara ini untuk latihan dan pemakaian non-komersial\./);
    assert.equal(existsSync(join(dir, ".no-voices")), false, "the folder of voices was not even made");
    assert.equal(existsSync(join(dir, "video", "voice", "durations.json")), false);
    rmSync(dir, { recursive: true });
  }
});

test("a bigger voice that is not on the computer: the question names the light one too", () => {
  const dir = project("coding", (sb) => speak(sb, ["One sentence only."], "kokoro"));
  assert.equal(build(dir).status, 0);
  const r = sound(dir);
  assert.equal(r.status, 1);
  assert.match(r.out, /The voice Kokoro 82M v1\.0 is not on your computer yet\. If you agree, I will download 370 MB from github\.com into /);
  assert.match(r.out, /Tell the user this too: a lighter voice, KittenTTS nano 0\.8, is a 52 MB download, and they can have that one instead \("narrator": "ringan"\)\./);
  rmSync(dir, { recursive: true });
});

test("the sound command has nothing to do without spoken lines, and says what comes next", () => {
  const dir = project("tips");
  assert.equal(build(dir).status, 0);
  const r = sound(dir);
  assert.equal(r.status, 0);
  assert.match(r.out, /^No scene has a "voice" line, so there is nothing to speak; the builder has already laid the video's other sound\. Next, render:/);
  const none = mkdtempSync(join(tmpdir(), "mk-kit-"));
  assert.match(sound(none).out, /^There is no storyboard\.json in this folder\./);
  for (const d of [dir, none]) rmSync(d, { recursive: true });
});

test("the skill's texts keep their own rules: no em dash, and one name for every file and setting", () => {
  const texts = ["SKILL.md", "reference/sound.md", "reference/scenes.md", "reference/writing.md"].map((f) => readFileSync(join(SKILL, f), "utf8")).join("\n");
  assert.doesNotMatch(texts, /—/);
  assert.doesNotMatch(texts, /--engine|voice\.mjs|mix\.mjs/, "the skill names one sound command and the storyboard's own settings");
  assert.match(texts, /Boleh aku unduh sekarang\?/);
  assert.match(texts, /May I download it now\?/);
});
