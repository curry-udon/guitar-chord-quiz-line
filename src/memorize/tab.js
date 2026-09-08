/**
 * TAB 生成（上=1弦 … 下=6弦）
 * SVG で一般的な TAB 譜（参照画像の TAB クレフ＋弦線＋フレット番号）
 */

/** @typedef {{ numSize?: number, numXRatio?: number }} TabLayout */

/** アプリ既定（tab-layout-tune.html で調整） */
export const TAB_LAYOUT = {
  numSize: 25,
  /** 数字の X：クレフ右端〜右端の間の比率（0=すぐ右, 1=右端） */
  numXRatio: 0.45,
};

/**
 * @param {(number|null)[]} frets6to1
 * @param {TabLayout} [layout]
 * @returns {string}
 */
export function renderTabHtml(frets6to1, layout = {}) {
  const numSize = layout.numSize ?? TAB_LAYOUT.numSize;
  const numXRatio = layout.numXRatio ?? TAB_LAYOUT.numXRatio;

  const display = [...frets6to1].reverse(); // 1弦→6弦
  const playedCount = display.filter((f) => f != null).length;
  // 単音: 他弦は空線。和音: null はミュート x
  const muteAsX = playedCount > 1;

  const W = 280;
  const H = 168;
  const padL = 8;
  const padR = 16;
  const padT = 16;
  const padB = 14;
  const stringCount = 6;
  const gridH = H - padT - padB;
  const spacing = gridH / (stringCount - 1);
  const yAt = (i) => padT + i * spacing;

  const clefH = gridH;
  const clefW = (clefH * 87) / 269;
  const clefX = padL;
  const clefY = padT;
  const clefHref = `${import.meta.env.BASE_URL}tab-clef.png`;

  const contentL = Math.round(clefX + clefW + 8);
  const contentR = W - padR;
  const numX = contentL + (contentR - contentL) * numXRatio;
  const lineL = padL;
  const lineR = contentR;

  const bw1 = Math.round(numSize * 0.95);
  const bw2 = Math.round(numSize * 1.35);
  const bh = Math.round(numSize * 0.95);

  let marks = "";

  marks += `<image class="tb-clef-img" href="${clefHref}" x="${clefX}" y="${clefY}" width="${clefW}" height="${clefH}" preserveAspectRatio="none" />`;

  for (let i = 0; i < stringCount; i += 1) {
    const y = yAt(i);
    marks += `<line class="tb-string" x1="${lineL}" y1="${y}" x2="${lineR}" y2="${y}" />`;
  }

  display.forEach((fret, i) => {
    const y = yAt(i);

    let label = null;
    if (fret == null) {
      if (muteAsX) label = "×";
    } else {
      label = String(fret);
    }
    if (label == null) return;

    const bw = label.length > 1 ? bw2 : bw1;
    marks += `<rect class="tb-knockout" x="${numX - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" />`;
    marks += `<text class="tb-num" x="${numX}" y="${y}" font-size="${numSize}" dominant-baseline="middle" text-anchor="middle">${label}</text>`;
  });

  return `<svg class="tab-quiz" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${marks}</svg>`;
}
