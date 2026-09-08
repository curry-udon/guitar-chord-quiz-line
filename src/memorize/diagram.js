/**
 * コード／単音ダイアグラム SVG
 * 右利き: 左=ナット、上=1弦（細）〜下=6弦（太）
 * 左利き: 水平ミラー
 */

/**
 * @param {(number|null)[]} frets6to1 6弦→1弦
 * @param {"right"|"left"} hand
 * @returns {string} SVG markup
 */
export function renderDiagramSvg(frets6to1, hand = "right") {
  const frets = frets6to1;
  const played = frets.filter((f) => f != null && f > 0);
  const maxFret = played.length ? Math.max(.../** @type {number[]} */ (played)) : 1;
  const startFret = maxFret <= 4 ? 1 : Math.min(.../** @type {number[]} */ (played));
  const fretCount = 4;
  const stringCount = 6;

  // Display order top→bottom: 1弦 → 6弦
  const displayFrets = [...frets].reverse();

  const W = 200;
  const H = 160;
  const padL = 36;
  const padR = 16;
  const padT = 28;
  const padB = 16;
  const gridW = W - padL - padR;
  const gridH = H - padT - padB;
  const mirror = hand === "left";

  const xAt = (fretSlot) => {
    // fretSlot 0 = nut, 1..fretCount = fret lines
    const x = padL + (fretSlot / fretCount) * gridW;
    return mirror ? W - x : x;
  };
  const yAt = (stringFromTop) => padT + (stringFromTop / (stringCount - 1)) * gridH;

  let marks = "";
  // nut
  const nutX1 = xAt(0);
  marks += `<line class="dg-nut" x1="${nutX1}" y1="${padT}" x2="${nutX1}" y2="${padT + gridH}" />`;

  // fret lines
  for (let f = 1; f <= fretCount; f += 1) {
    const x = xAt(f);
    marks += `<line class="dg-fret" x1="${x}" y1="${padT}" x2="${x}" y2="${padT + gridH}" />`;
  }

  // strings
  for (let s = 0; s < stringCount; s += 1) {
    const y = yAt(s);
    marks += `<line class="dg-string" x1="${xAt(0)}" y1="${y}" x2="${xAt(fretCount)}" y2="${y}" />`;
  }

  // open / mute / fingers (displayFrets is 1弦→6弦)
  displayFrets.forEach((fret, sFromTop) => {
    const y = yAt(sFromTop);
    const labelX = mirror ? W - 14 : 14;
    if (fret == null) {
      marks += `<text class="dg-mute" x="${labelX}" y="${y + 4}" text-anchor="middle">×</text>`;
      return;
    }
    if (fret === 0) {
      marks += `<circle class="dg-open" cx="${labelX}" cy="${y}" r="5" />`;
      return;
    }
    const slot = fret - startFret + 1; // 1..fretCount in window
    if (slot < 1 || slot > fretCount) return;
    const x = (xAt(slot - 1) + xAt(slot)) / 2;
    marks += `<circle class="dg-dot" cx="${x}" cy="${y}" r="8" />`;
  });

  // base fret number if not starting at 1
  let fretNum = "";
  if (startFret > 1) {
    const fx = (xAt(0) + xAt(1)) / 2;
    fretNum = `<text class="dg-fretnum" x="${fx}" y="${padT - 8}" text-anchor="middle">${startFret}</text>`;
  }

  return `<svg class="chord-diagram" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${fretNum}${marks}</svg>`;
}
