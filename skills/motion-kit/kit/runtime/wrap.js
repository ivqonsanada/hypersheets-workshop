// How a long line of code is laid in a card. LOCKED: nothing in this folder is edited to make a video.
// One function, used twice: the builder counts rows with it before anything is written, and the
// code scenes lay the rows out with it in the browser, so the two can never disagree.
(function (root) {
  // Breaks `line` into rows of at most `cols` characters. Returns [{ from, to, pad }]: a row shows the
  // characters [from, to) of the line after `pad` spaces. The first row keeps the line's own
  // indentation; the rows under it hang two spaces deeper, as an editor's soft wrap does. A row
  // ends at a space, by choice after a comma or an opening bracket, or before && or ||. Without
  // a space it ends before a dot that starts a name (never inside "?." or "...") or after a
  // bracket, and in the middle of a word only when nothing else is left.
  function wrap(line, cols, care) {
    const text = String(line);
    const indent = /^\s*/.exec(text)[0].length;
    const hang = Math.min(indent + 2, Math.max(0, cols - 14)); // deep indentation still leaves 14 columns
    const rows = [];
    let from = 0, pad = 0;
    while (text.length - from > cols - pad) {
      const room = cols - pad, end = from + room;
      const low = from + Math.max(rows.length ? 1 : indent + 1, Math.floor(room * 0.45));
      const good = from + Math.floor(room * 0.6); // a better place to break is taken only from the row's last two fifths
      let cut = -1;
      for (let i = end; i >= low; i--) {
        if (text[i] !== " ") continue;
        if (cut < 0) cut = i;
        if (care < 2 || i < good) break;
        if (/[,;([{]/.test(text[i - 1]) || /^(&&|\|\||[?:+] )/.test(text.slice(i + 1))) { cut = i; break; }
      }
      // No space to break at: before a dot that starts a name (a chain of calls), or after a bracket or a comma.
      let soft = -1;
      if (cut < 0 && care > 0) for (let i = end; i > low; i--) {
        if ((text[i] === "." && /[A-Za-z_$]/.test(text[i + 1] || "") && !/[\d?.]/.test(text[i - 1])) || (/[,([{]/.test(text[i - 1]) && text.slice(i - 2, i) !== "${")) { soft = i; break; }
      }
      if (cut >= 0) { rows.push({ from, to: cut, pad }); from = cut + 1; }
      else if (soft >= 0) { rows.push({ from, to: soft, pad }); from = soft; }
      else { rows.push({ from, to: end, pad }); from = end; }
      pad = hang;
    }
    rows.push({ from, to: text.length, pad });
    return rows;
  }
  // Three degrees of care: 0 breaks at the last space that fits, or mid-word; 1 also breaks before a
  // dot or after a bracket when there is no space; 2 also prefers the better spaces. The most
  // careful one that costs no extra row is used.
  function wrapCode(line, cols) {
    const plain = wrap(line, cols, 0);
    for (const care of [2, 1]) {
      const rows = wrap(line, cols, care);
      if (rows.length <= plain.length) return rows;
    }
    return plain;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { wrapCode };
  else root.MKWrap = wrapCode;
})(typeof window !== "undefined" ? window : globalThis);
