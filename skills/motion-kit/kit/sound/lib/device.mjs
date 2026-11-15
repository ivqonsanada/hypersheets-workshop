// What this computer is, and which voice tier suits it. Reads only; installs nothing.
import { statfsSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { cpus, totalmem, release, homedir } from "node:os";
import { dirname } from "node:path";
import { registry, soundHome, installed, platformKey, runtimeProgram, toDownload, whisper, mb } from "./engines.mjs";
import { which, ffmpegVersion } from "./ffmpeg.mjs";

const OS_NAMES = { darwin: "macOS", win32: "Windows", linux: "Linux" };

export function inspect() {
  const reg = registry(), home = soundHome();
  let freeBytes = null;
  try {
    let at = home;
    while (!existsSync(at) && dirname(at) !== at) at = dirname(at);
    const s = statfsSync(existsSync(at) ? at : homedir());
    freeBytes = Number(s.bavail) * Number(s.bsize);
  } catch (e) {}
  const w = whisper(reg, which, home);
  const cpu = cpus();
  // On a Mac, os.release() is the kernel's number; sw_vers gives the one people know.
  const mac = process.platform === "darwin" ? (spawnSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).stdout || "").trim() : "";
  return {
    os: OS_NAMES[process.platform] || process.platform, osVersion: mac || release(), arch: process.arch, platform: platformKey(),
    cpu: cpu[0] ? cpu[0].model.trim() : "unknown", cores: cpu.length, ramGb: Math.round(totalmem() / 1073741824),
    freeGb: freeBytes == null ? null : Math.round(freeBytes / 1e8) / 10,
    node: process.versions.node, ffmpeg: ffmpegVersion(),
    whisperProgram: w.program, whisperModel: w.model,
    home, runtimeBuild: !!reg.runtime.builds[platformKey()], runtimeInstalled: !!runtimeProgram(reg, home),
    voices: Object.fromEntries(Object.keys(reg.voices).map((id) => [id, installed(reg, id, home)])),
  };
}

// A computer is weak for speech when memory or cores are short, or its disk is nearly full.
export function tierFor(info) {
  const weak = info.ramGb < 6 || info.cores <= 2;
  const tight = info.freeGb != null && info.freeGb < 2;
  return { weak, tight };
}

// The voice that runs on this computer for a language: the light one, or on a strong computer
// the best local one where the language has it. Comes with what installing it would download.
export function recommend(info, lang, reg = registry()) {
  const { weak, tight } = tierFor(info);
  const best = reg.localBest && reg.localBest[lang];
  const id = !weak && !tight && best ? best : reg.tiers[lang].ringan;
  if (!info.runtimeBuild) return { voice: null, weak, tight };
  const v = reg.voices[id];
  const bytes = toDownload(reg, id, info.home);
  return { voice: id, name: v.name, use: v.use, installed: info.voices[id], download: bytes, downloadText: mb(bytes), notice: v.notice || null, weak, tight };
}
