// The check sheet: the page stills.mjs photographs into video/sheet.png. Under each frame it has a
// label (the frame's number, its time, its scene) and a sentence that says what the frame should
// show. Both are in the video's language, the storyboard's "lang", which mk-plan.json carries: the
// builder writes each sentence (lib/spec.mjs), and the label's few words are here. A scene's type
// stays the kit's own word, because that is the word in storyboard.json.

export const SHEET = {
  en: { frame: "FRAME", seconds: "s", scene: "scene", show: "Should show:" },
  id: { frame: "BINGKAI", seconds: "dtk", scene: "adegan", show: "Seharusnya tampil:" },
};
const words = (lang) => SHEET[lang] || SHEET.en;

// `still` is one entry of mk-plan.json's "stills": { n, t, scene, type, expect }.
export const sheetLabel = (lang, still) => {
  const w = words(lang);
  // Indonesian writes a decimal comma: 1,94 dtk.
  const t = lang === "id" ? String(still.t).replace(".", ",") : still.t;
  return `${w.frame} ${still.n} · ${t} ${w.seconds} · ${w.scene} ${still.scene} (${still.type})`;
};
export const sheetSentence = (lang, still) => `${words(lang).show} ${still.expect}`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The sheet as one HyperFrames page: the frames side by side (assets/f1.png, f2.png, ...), each
// over its own label and sentence. Returns the page and its size in pixels.
export function sheetPage(plan) {
  const lang = SHEET[plan.lang] ? plan.lang : "en";
  const n = plan.stills.length;
  const cols = n <= 3 ? n : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  // The room under a frame is set by the longest sentence, so none runs into the frame below. A
  // label of more than 38 characters takes a second row (the Indonesian one often does), and gets it.
  const longest = Math.max(...plan.stills.map((s) => sheetSentence(lang, s).length));
  const tall = plan.stills.some((s) => sheetLabel(lang, s).length > 38) ? 28 : 0;
  const FW = 420, FH = 747, GAP = 28, CAP = Math.max(214, 62 + tall + Math.ceil(longest / 33) * 27);
  const W = cols * FW + (cols + 1) * GAP, H = rows * (FH + CAP) + (rows + 1) * GAP;
  const cells = plan.stills.map((s, i) => {
    const x = GAP + (i % cols) * (FW + GAP), y = GAP + Math.floor(i / cols) * (FH + CAP + GAP);
    return `      <div class="cell" style="left:${x}px;top:${y}px">
        <img src="assets/f${i + 1}.png" alt="" />
        <p class="no">${esc(sheetLabel(lang, s))}</p>
        <p class="ex">${esc(sheetSentence(lang, s))}</p>
      </div>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #101010; }
      .sheet { position: relative; width: ${W}px; height: ${H}px; background: #101010; font-family: sans-serif; color: #f2f2f2; }
      .cell { position: absolute; width: ${FW}px; }
      .cell img { display: block; width: ${FW}px; height: ${FH}px; border: 2px solid #3a3a3a; }
      .no { margin-top: 12px; font-size: 23px; line-height: 1.2; font-weight: 700; color: #ffd166; }
      .ex { margin-top: 8px; font-size: 21px; line-height: 1.28; color: #f2f2f2; }
    </style>
  </head>
  <body>
    <div id="root" class="sheet" data-composition-id="main" data-start="0" data-duration="1" data-width="${W}" data-height="${H}">
${cells}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  return { html, W, H, n };
}
