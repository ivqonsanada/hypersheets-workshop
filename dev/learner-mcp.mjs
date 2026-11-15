// A stand-in for the learner at the permission prompt, for headless trial runs only.
// Claude Code calls it (--permission-prompt-tool mcp__learner__approve) whenever a
// command would ask the person. It answers the way the track's guide tells a learner to:
// yes to copying the skill's template into ./video (and to listing that template), yes to
// motion-kit's own scripts (build, stills, sound, device), no to everything else, a voice
// download included. Every prompt and answer is appended to $LEARNER_LOG.
//
// MCP over stdio: newline-delimited JSON-RPC 2.0. No packages.
import { appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

const log = process.env.LEARNER_LOG || "/dev/null";
const TEMPLATE = /skills\/video-promo\/template\/?"?$/;

const CWD = process.env.LEARNER_CWD || process.cwd();
const unquote = (s) => s.replace(/^["']|["']$/g, "");
// Inside the learner's page folder, in its video/ subfolder.
const inVideo = (p) => {
  const abs = resolve(CWD, unquote(p));
  return abs === join(CWD, "video") || abs.startsWith(join(CWD, "video") + "/");
};
const ARG = /("[^"]+"|'[^']+'|\S+)/.source;

// One part of a command line, as a learner reading the prompt would judge it.
function partOk(part) {
  const p = part.replace(/\s2>\s*\/dev\/null/g, "").replace(/\s2>&1/g, "").trim();
  if (p === "") return true;
  if (/[<>`$]/.test(p)) return false; // redirects into files, substitutions
  // cp -R "<plugin>/skills/video-promo/template" video
  let m = p.match(new RegExp(`^cp\\s+-[rR]\\s+${ARG}\\s+${ARG}$`));
  if (m) return TEMPLATE.test(unquote(m[1])) && inVideo(m[2]);
  // cp <page file> video/assets/page/...
  m = p.match(new RegExp(`^cp\\s+${ARG}\\s+${ARG}$`));
  if (m && !m[1].startsWith("-")) return inVideo(m[2]);
  m = p.match(new RegExp(`^mkdir\\s+(-p\\s+)?${ARG}$`));
  if (m) return inVideo(m[2]);
  // motion-kit: the kit's own scripts, as its skill writes them. install.mjs downloads, and
  // this stand-in never said yes to a download, so anything but its list is refused and logged.
  m = p.match(new RegExp(`^node\\s+${ARG}(\\s+.*)?$`));
  if (m) {
    const script = unquote(m[1]);
    if (/\/skills\/motion-kit\/kit\/(build|stills|sound)\.mjs$/.test(script)) return true;
    if (/\/skills\/motion-kit\/kit\/sound\/device\.mjs$/.test(script)) return true;
    if (/\/skills\/motion-kit\/kit\/sound\/install\.mjs$/.test(script)) return /^\s*list\s*$/.test(m[2] || "");
    return false;
  }
  // looking around is harmless
  if (/^(ls|find|grep|cat|pwd|head|tail|wc|sort|echo|file|du)\b/.test(p)) return true;
  return false;
}

function decide(tool, input) {
  if (tool === "Bash") {
    const parts = String(input.command || "").split(/&&|\|\||;|\||\n/);
    if (parts.every(partOk)) return { allow: true };
  }
  return { allow: false, why: "The learner said no: the guide does not ask for this." };
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { return; }
  const { id, method, params } = req;
  if (method === "initialize") {
    send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "learner", version: "1.0.0" } } });
  } else if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: [{
      name: "approve",
      description: "Answers a permission prompt as the learner would.",
      inputSchema: { type: "object", properties: { tool_name: { type: "string" }, input: { type: "object" } }, required: ["tool_name", "input"] },
    }] } });
  } else if (method === "tools/call") {
    const args = params?.arguments || {};
    const d = decide(args.tool_name, args.input || {});
    appendFileSync(log, JSON.stringify({ tool: args.tool_name, input: args.input, allow: d.allow }) + "\n");
    const answer = d.allow ? { behavior: "allow", updatedInput: args.input } : { behavior: "deny", message: d.why };
    send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(answer) }] } });
  } else if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
  } else if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `no method ${method}` } });
  }
});
