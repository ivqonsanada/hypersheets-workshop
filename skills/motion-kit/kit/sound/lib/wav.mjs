// WAV in and out without ffmpeg: PCM 8/16/24/32-bit and 32-bit float, any channel count.
import { readFileSync, writeFileSync } from "node:fs";

export function readWav(file) {
  const b = readFileSync(file);
  if (b.length < 12 || b.toString("latin1", 0, 4) !== "RIFF" || b.toString("latin1", 8, 12) !== "WAVE") {
    throw new Error(`${file} is not a WAV file: convert it to WAV first.`);
  }
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString("latin1", pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      fmt = { tag: b.readUInt16LE(body), channels: b.readUInt16LE(body + 2), rate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
      if (fmt.tag === 0xfffe && size >= 26) fmt.tag = b.readUInt16LE(body + 24);
    } else if (id === "data") {
      // A streamed file may carry a size of 0 or 0xFFFFFFFF: the samples then run to the end.
      const end = size === 0 || body + size > b.length ? b.length : body + size;
      data = b.subarray(body, end);
      if (end === b.length) break;
    }
    pos = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${file} has no audio in it: save it again as WAV.`);
  const { tag, channels: nch, rate, bits } = fmt;
  const bytes = bits / 8;
  if (!(tag === 1 && [1, 2, 3, 4].includes(bytes)) && !(tag === 3 && bytes === 4)) {
    throw new Error(`${file} uses a WAV format this kit cannot read (tag ${tag}, ${bits} bit): save it as 16-bit PCM WAV.`);
  }
  const frames = Math.floor(data.length / (bytes * nch));
  const channels = Array.from({ length: nch }, () => new Float32Array(frames));
  for (let i = 0, o = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++, o += bytes) {
      let v;
      if (tag === 3) v = data.readFloatLE(o);
      else if (bytes === 2) v = data.readInt16LE(o) / 32768;
      else if (bytes === 3) v = data.readIntLE(o, 3) / 8388608;
      else if (bytes === 4) v = data.readInt32LE(o) / 2147483648;
      else v = (data[o] - 128) / 128;
      channels[c][i] = v;
    }
  }
  return { rate, channels };
}

export function wavBuffer(channels, rate, bits = 16) {
  const nch = channels.length, frames = channels[0].length, bytes = bits / 8;
  const out = Buffer.alloc(44 + frames * nch * bytes);
  out.write("RIFF", 0, "latin1");
  out.writeUInt32LE(36 + frames * nch * bytes, 4);
  out.write("WAVEfmt ", 8, "latin1");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(nch, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * nch * bytes, 28);
  out.writeUInt16LE(nch * bytes, 32);
  out.writeUInt16LE(bits, 34);
  out.write("data", 36, "latin1");
  out.writeUInt32LE(frames * nch * bytes, 40);
  const full = bits === 16 ? 32767 : 8388607;
  for (let i = 0, o = 44; i < frames; i++) {
    for (let c = 0; c < nch; c++, o += bytes) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      const q = Math.round(v * full);
      if (bits === 16) out.writeInt16LE(q, o);
      else out.writeIntLE(q, o, 3);
    }
  }
  return out;
}

export function writeWav(file, channels, rate, bits = 16) {
  writeFileSync(file, wavBuffer(channels, rate, bits));
}
