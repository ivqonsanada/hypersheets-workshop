// Fill a copy of the template by hand, to check a template change on a real page before
// spending Haiku runs. For maintainers; learners never run this.
//
//   node dev/fill.mjs <fixture-page-dir> <slots.json> <out-dir>
//
// <out-dir> gets a copy of skills/video-promo/template, the fixture's files in assets/page/
// (as the skill's step 3 copies them), and every data-slot filled from <slots.json>, an object
// of slot name to text (score.mjs prints the slots of a finished run).
import { readFileSync, writeFileSync, readdirSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [fixture, slotsFile, out] = process.argv.slice(2);
if (!fixture || !slotsFile || !out) {
  console.error("usage: node dev/fill.mjs <fixture-page-dir> <slots.json> <out-dir>");
  process.exit(2);
}
if (existsSync(out)) {
  console.error(`${out} already exists`);
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, "..", "skills", "video-promo", "template");
const slots = JSON.parse(readFileSync(slotsFile, "utf8"));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

cpSync(template, out, { recursive: true });
cpSync(fixture, join(out, "assets", "page"), { recursive: true });

const SLOT = /(<([a-z0-9]+)\b[^>]*\bdata-slot="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g;
const used = new Set();
for (const f of readdirSync(join(out, "compositions"))) {
  const p = join(out, "compositions", f);
  const html = readFileSync(p, "utf8").replace(SLOT, (m, open, _t, slot, _text, close) => {
    if (!(slot in slots)) return m;
    used.add(slot);
    return open + esc(slots[slot]) + close;
  });
  writeFileSync(p, html);
}
const unused = Object.keys(slots).filter((s) => !used.has(s));
console.log(`filled ${used.size} slots in ${out}${unused.length ? `; not in the template: ${unused.join(", ")}` : ""}`);
