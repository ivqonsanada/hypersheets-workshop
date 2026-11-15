// The voices the kit can speak with: where they live on disk, whether they are installed, and
// how to run them. Nothing here downloads anything; install.mjs does that.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const registry = () => JSON.parse(readFileSync(join(KIT, "engines.json"), "utf8"));

// One folder per computer for programs and voices, outside any project.
export const soundHome = () => process.env.HS_SOUND_HOME || join(homedir(), ".hypersheets", "sound");

export const platformKey = () => `${process.platform}-${process.arch}`;

export function runtimeProgram(reg, home = soundHome()) {
  const build = reg.runtime.builds[platformKey()];
  if (!build) return null;
  const p = join(home, "runtime", build.file.replace(/\.tar\.bz2$/, ""), reg.runtime.program + (process.platform === "win32" ? ".exe" : ""));
  return existsSync(p) ? p : null;
}

// The files a voice needs, by role.
export function voiceFiles(v, home = soundHome()) {
  const d = join(home, "voices", v.dir || "");
  if (v.kind === "vits") return { model: join(d, v.model), tokens: join(d, "tokens.txt"), data: join(d, "espeak-ng-data") };
  if (v.kind === "kitten") return { model: join(d, v.model), voices: join(d, "voices.bin"), tokens: join(d, "tokens.txt"), data: join(d, "espeak-ng-data") };
  if (v.kind === "kokoro") return { model: join(d, v.model), voices: join(d, "voices.bin"), tokens: join(d, "tokens.txt"), data: join(d, "espeak-ng-data"), lexicon: join(d, "lexicon-us-en.txt") };
  if (v.kind === "supertonic") {
    const big = v.full ? join(home, "voices", v.full) : d, s = v.full ? "" : v.suffix;
    return {
      duration: join(d, "duration_predictor.int8.onnx"), encoder: join(d, "text_encoder.int8.onnx"),
      estimator: join(big, `vector_estimator${s}.onnx`), vocoder: join(big, `vocoder${s}.onnx`),
      json: join(d, "tts.json"), indexer: join(d, "unicode_indexer.bin"), style: join(d, "voice.bin"),
    };
  }
  return {};
}

export function macVoices() {
  if (process.platform !== "darwin") return [];
  const r = spawnSync("say", ["-v", "?"], { encoding: "utf8" });
  return (r.stdout || "").split("\n").map((l) => l.split(/\s{2,}/)[0].trim()).filter(Boolean);
}

export function installed(reg, id, home = soundHome()) {
  const v = reg.voices[id];
  if (!v) return false;
  if (v.kind === "say") return process.platform === "darwin";
  if (v.kind === "elevenlabs") return true; // nothing to install: the learner brings the files or a key
  return !!runtimeProgram(reg, home) && Object.values(voiceFiles(v, home)).every((f) => existsSync(f));
}

// Bytes still to download for a voice, counting the shared program once.
export function toDownload(reg, id, home = soundHome()) {
  const v = reg.voices[id];
  let bytes = 0;
  const build = reg.runtime.builds[platformKey()];
  if (v.parts.length && build && !runtimeProgram(reg, home)) bytes += build.bytes;
  if (!installed(reg, id, home)) for (const p of v.parts) bytes += p.bytes;
  return bytes;
}

export const mb = (bytes) => `${Math.round(bytes / 1e6)} MB`;

// Where a voice's files come from, as the host names a person would recognise.
export function downloadHost(reg, id) {
  const hosts = new Set([new URL(reg.runtime.base).host]);
  for (const p of reg.voices[id].parts) hosts.add(new URL(p.url).host);
  return [...hosts].join(" and ");
}

// Speaks `text` into a WAV file. Returns { ok, seconds (how long it took), error }.
export function speak(reg, id, text, outFile, o = {}, home = soundHome()) {
  const v = reg.voices[id];
  const started = Date.now();
  const done = (r) => ({ ok: r.status === 0 && existsSync(outFile), seconds: (Date.now() - started) / 1000, error: r.status === 0 ? "" : String(r.stderr || r.error || "").trim().split("\n").slice(-3).join(" ") });
  // The program reads a leading dash as an option; a space in front keeps a line a line.
  const line = text.startsWith("-") ? " " + text : text;
  if (v.kind === "say") {
    const voice = o.speakerName || v.voiceFor[o.lang];
    return done(spawnSync("say", ["-v", voice, "-r", String(Math.round(175 * (o.speed || 1))), "--file-format=WAVE", "--data-format=LEI16@48000", "-o", outFile, line], { encoding: "utf8" }));
  }
  const f = voiceFiles(v, home);
  const sid = o.speaker ?? v.speaker ?? 0, speed = o.speed || 1;
  let flags;
  if (v.kind === "vits") flags = [`--vits-model=${f.model}`, `--vits-tokens=${f.tokens}`, `--vits-data-dir=${f.data}`, `--vits-length-scale=${1 / speed}`];
  else if (v.kind === "kitten") flags = [`--kitten-model=${f.model}`, `--kitten-voices=${f.voices}`, `--kitten-tokens=${f.tokens}`, `--kitten-data-dir=${f.data}`, `--kitten-length-scale=${1 / speed}`, `--sid=${sid}`];
  else if (v.kind === "kokoro") flags = [`--kokoro-model=${f.model}`, `--kokoro-voices=${f.voices}`, `--kokoro-tokens=${f.tokens}`, `--kokoro-data-dir=${f.data}`, `--kokoro-lexicon=${f.lexicon}`, "--kokoro-lang=en", `--kokoro-length-scale=${1 / speed}`, `--sid=${sid}`];
  else flags = [`--supertonic-duration-predictor=${f.duration}`, `--supertonic-text-encoder=${f.encoder}`, `--supertonic-vector-estimator=${f.estimator}`, `--supertonic-vocoder=${f.vocoder}`, `--supertonic-tts-json=${f.json}`, `--supertonic-unicode-indexer=${f.indexer}`, `--supertonic-voice-style=${f.style}`, `--lang=${o.lang}`, `--num-steps=${o.steps || v.steps || 5}`, `--speed=${speed}`, `--sid=${sid}`];
  flags.push(`--num-threads=${o.threads || 2}`, `--output-filename=${outFile}`, line);
  return done(spawnSync(runtimeProgram(reg, home), flags, { encoding: "utf8", maxBuffer: 1 << 26 }));
}

// whisper.cpp's program and a model for it, or nulls.
export function whisper(reg, which, home = soundHome()) {
  const program = process.env.WHISPER_CLI || which("whisper-cli") || which("whisper-cpp");
  const candidates = [process.env.WHISPER_MODEL, join(home, "whisper", reg.whisper.parts[0].file)].filter(Boolean);
  return { program, model: candidates.find((m) => existsSync(m)) || null };
}
