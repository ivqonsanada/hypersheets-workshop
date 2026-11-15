// Turns, tokens and cost of one trial run, and the tools Haiku called. For maintainers.
//
//   node dev/summarize.mjs <run-dir>
//
// Reads <run-dir>/stream.jsonl (stream-json) when there is one, else <run-dir>/result.json.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
let result = null;
const calls = [];
const streamFile = join(dir, "stream.jsonl");
if (existsSync(streamFile)) {
  for (const line of readFileSync(streamFile, "utf8").split("\n")) {
    if (!line.startsWith("{")) continue;
    const m = JSON.parse(line);
    if (m.type === "result") result = m;
    if (m.type === "assistant") {
      for (const c of m.message.content) {
        if (c.type === "tool_use") {
          const i = c.input || {};
          const what = i.command || i.file_path || i.pattern || i.skill || JSON.stringify(i).slice(0, 80);
          calls.push(`${c.name}: ${String(what).replace(/\s+/g, " ").slice(0, 150)}`);
        }
      }
    }
    if (m.type === "user" && Array.isArray(m.message?.content)) {
      for (const c of m.message.content) {
        if (c.type === "tool_result" && c.is_error) {
          const text = Array.isArray(c.content) ? c.content.map((x) => x.text || "").join(" ") : String(c.content);
          calls.push(`  ! error: ${text.replace(/\s+/g, " ").slice(0, 160)}`);
        }
      }
    }
  }
} else {
  const raw = readFileSync(join(dir, "result.json"), "utf8");
  result = JSON.parse(raw.slice(raw.indexOf("{")));
}

const u = result?.usage ?? {};
console.log(JSON.stringify({
  subtype: result?.subtype,
  is_error: result?.is_error,
  num_turns: result?.num_turns,
  minutes: result ? +(result.duration_ms / 60000).toFixed(1) : null,
  total_cost_usd: result?.total_cost_usd,
  input: u.input_tokens,
  cache_write: u.cache_creation_input_tokens,
  cache_read: u.cache_read_input_tokens,
  output: u.output_tokens,
  models: result?.modelUsage ? Object.keys(result.modelUsage) : undefined,
}, null, 1));
if (result?.modelUsage) console.log(JSON.stringify(result.modelUsage));
console.log("--- final text ---\n" + String(result?.result ?? "").slice(0, 1200));
if (calls.length) console.log("--- tools ---\n" + calls.join("\n"));
