// Compares what was written with what a listener (whisper) heard, and says how to fix a line.
const ONES = {
  id: ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"],
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
};
const EN_TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

// A whole number in words, the way it is read aloud, up to 999,999.
export function numberWords(n, lang) {
  if (n < 10) return ONES[lang][n];
  if (lang === "id") {
    if (n < 20) return n === 10 ? "sepuluh" : n === 11 ? "sebelas" : `${ONES.id[n - 10]} belas`;
    if (n < 100) return `${ONES.id[Math.floor(n / 10)]} puluh${n % 10 ? " " + ONES.id[n % 10] : ""}`;
    if (n < 1000) return `${n < 200 ? "seratus" : ONES.id[Math.floor(n / 100)] + " ratus"}${n % 100 ? " " + numberWords(n % 100, "id") : ""}`;
    if (n < 1e6) return `${n < 2000 ? "seribu" : numberWords(Math.floor(n / 1000), "id") + " ribu"}${n % 1000 ? " " + numberWords(n % 1000, "id") : ""}`;
  } else {
    if (n < 20) return EN_TEENS[n - 10];
    if (n < 100) return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES.en[n % 10] : ""}`;
    if (n < 1000) return `${ONES.en[Math.floor(n / 100)]} hundred${n % 100 ? " " + numberWords(n % 100, "en") : ""}`;
    if (n < 1e6) return `${numberWords(Math.floor(n / 1000), "en")} thousand${n % 1000 ? " " + numberWords(n % 1000, "en") : ""}`;
  }
  return String(n).split("").map((d) => ONES[lang][Number(d)]).join(" ");
}

const EN_ORDINALS = { first: "one", second: "two", third: "three", fourth: "four", fifth: "five", sixth: "six", seventh: "seven", eighth: "eight", ninth: "nine", tenth: "ten", eleventh: "eleven", twelfth: "twelve", twentieth: "twenty", thirtieth: "thirty" };

// Words only, lower case, digits spelled out: "Rp 20.000!" and "dua puluh ribu" then compare as
// equals. A listener writes "3rd" or "240" where the line says "third" or "two hundred and forty",
// so English ordinals count as their numbers and the "and" inside a number is dropped.
export function words(text, lang) {
  const sep = lang === "id" ? /(\d)\.(\d{3})\b/g : /(\d),(\d{3})\b/g;
  let t = String(text).normalize("NFKC").toLowerCase();
  while (sep.test(t)) t = t.replace(sep, "$1$2");
  if (lang === "en") t = t.replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  t = t.replace(/\d+/g, (d) => ` ${d.length > 6 ? d.split("").map((c) => ONES[lang][Number(c)]).join(" ") : numberWords(Number(d), lang)} `);
  t = t.replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (lang === "en") t = t.replace(/\bhundred and\b/g, "hundred").split(" ").map((w) => EN_ORDINALS[w] || w).join(" ");
  return t ? t.split(/\s+/) : [];
}

// What to fix in a line before any voice speaks it: digits, addresses and signs are read
// differently by every voice, and a listener cannot tell "15.000" said right from said wrong.
export function lint(text, lang) {
  const out = [];
  const id = lang === "id";
  const address = /[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/\S*)?|\S+@\S+|https?:\S+/i.exec(text);
  if (address) out.push(`has an address (${address[0]}), and voices misread addresses: leave it out of the spoken line, since the screen already shows it.`);
  const rest = address ? text.replace(address[0], " ") : text;
  const number = /\d[\d.,]*\d|\d/.exec(rest);
  if (number) {
    const plain = number[0].replace(id ? /\./g : /,/g, "");
    const said = /^\d{1,6}$/.test(plain) ? numberWords(Number(plain), lang) : null;
    out.push(`has the number ${number[0]}: write it in words${said ? ` ("${said}")` : `, the way it is said (for example "${id ? "dua puluh ribu" : "twenty thousand"}")`}, so every voice reads it the same way.`);
  }
  const sign = /[%&+=#]/.exec(rest);
  if (sign) out.push(`has the sign ${sign[0]}: write the word instead (for example "${{ "%": id ? "persen" : "percent", "&": id ? "dan" : "and", "+": id ? "tambah" : "plus", "=": id ? "sama dengan" : "equals", "#": id ? "nomor" : "number" }[sign[0]]}").`);
  return out;
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

// Word and character error rates of `heard` against `written`. A space lost or gained between
// two words ("Claude Code" heard as "Claudecode") costs characters, not whole words.
export function compare(written, heard, lang) {
  const ref = words(written, lang), hyp = words(heard, lang);
  if (!ref.length) return { wer: 0, cer: 0, missed: [] };
  const wer = distance(ref, hyp) / ref.length;
  const a = ref.join(""), b = hyp.join("");
  const cer = distance(a.split(""), b.split("")) / Math.max(1, a.length);
  const heardSet = new Set(hyp);
  return { wer, cer, missed: ref.filter((w) => !heardSet.has(w)) };
}

// One sentence that tells the writer what to change in a line a listener got wrong.
export function advice(written, heard, lang) {
  const acronym = /\b[A-Z]{2,6}\b/.exec(written);
  if (acronym) return `Write ${acronym[0]} the way it is said, for example "${acronym[0].split("").join(" ")}".`;
  return `What was heard: "${heard.trim()}". Swap the misheard word for a simpler one, or write a name the way it sounds${lang === "id" ? ' (for example "Klod Kod" for Claude Code)' : ""}.`;
}
