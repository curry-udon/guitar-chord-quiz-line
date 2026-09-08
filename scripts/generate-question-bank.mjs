/**
 * 問題・解答カタログ QUESTION_BANK.md をソースから再生成する
 * 使い方: node --input-type=module scripts/generate-question-bank.mjs
 */
import { writeFileSync } from "fs";
import {
  CHORD_SHAPES,
  DIATONIC_C_IDS,
  CANON_C_IDS,
  OPEN_STRINGS,
  expandDiatonicTones,
} from "../src/memorize/shapes.js";
import { LETTERS, SOLFEGE } from "../src/memorize/solfege.js";
import { STAFF_NOTES } from "../src/memorize/staff.js";

const STRING_NAMES = ["6弦E", "5弦A", "4弦D", "3弦G", "2弦B", "1弦e"];
function fretsStr(frets) {
  return frets.map((f) => (f == null ? "X" : String(f))).join("-");
}

let md = `# 問題・解答カタログ（チェック用）

> 自動生成。編集の正は各ソースファイル。  
> 生成日: ${new Date().toISOString().slice(0, 10)}

## ソースの場所

| 内容 | ファイル |
| :--- | :--- |
| 英字↔ドレミ | \`src/memorize/solfege.js\` |
| 大譜表 E2〜E5（自然音） | \`src/memorize/staff.js\` |
| コード押さえ・開放弦・構成音 | \`src/memorize/shapes.js\` |
| 聴音モードの音・ラベル | \`src/main.js\` の \`MODES\` |
| モード一覧・出題ロジック | \`src/memorize/runtime.js\` |

---

## 1. 暗記：コード（ドレミ）\`memorize-solfege\`

選択肢（固定）: ドレミ側 \`${SOLFEGE.join(" ")}\` ／ 英字側 \`${LETTERS.join(" ")}\`

| 向き | 問題 | 正解 |
| :--- | :--- | :--- |
`;

for (let i = 0; i < LETTERS.length; i += 1) {
  md += `| 英字→ドレミ | ${LETTERS[i]} | ${SOLFEGE[i]} |\n`;
  md += `| ドレミ→英字 | ${SOLFEGE[i]} | ${LETTERS[i]} |\n`;
}

md += `
---

## 2. 暗記：大譜表 \`memorize-staff\`

選択肢（固定）: ${STAFF_NOTES.map((n) => n.label).join(" / ")}

| 問題（譜面上の音） | 正解ラベル | 英字 | ドレミ | MIDI |
| :--- | :--- | :--- | :--- | ---: |
`;
for (const n of STAFF_NOTES) {
  md += `| ${n.id} | ${n.label} | ${n.letter} | ${n.solfege} | ${n.midi} |\n`;
}

md += `
---

## 3. 押さえ定義（ダイアグラム／TAB 共通）\`shapes.js\`

表記: 6弦→1弦（X=ミュート）

| id | 表示ラベル | 押さえ |
| :--- | :--- | :--- |
`;
for (const id of Object.keys(CHORD_SHAPES)) {
  const c = CHORD_SHAPES[id];
  md += `| ${c.id} | ${c.label} | ${fretsStr(c.frets)} |\n`;
}

md += `
### セット別の出題プール

| セット | 出題（正解ラベル） |
| :--- | :--- |
| ダイアトニック | ${DIATONIC_C_IDS.map((id) => CHORD_SHAPES[id].label).join(" / ")} |
| カノン（C） | ${CANON_C_IDS.map((id) => CHORD_SHAPES[id].label).join(" / ")} |

---

## 4. 開放弦（ダイアグラム／TAB／聴音）

| id | 正解ラベル | 弦 | フレット |
| :--- | :--- | :--- | ---: |
`;
for (const s of OPEN_STRINGS) {
  md += `| ${s.id} | ${s.label} | ${STRING_NAMES[s.stringIndex]} | ${s.fret} |\n`;
}

md += `
---

## 5. TAB・構成音（アルペジオ土台）\`diatonic-tones\`

問題 = 単音TAB（弦・フレット）。正解 = 英字音名（選択肢 C〜B 固定）。

| 親コード | 弦 | フレット | 正解音名 | questionKey |
| :--- | :--- | ---: | :--- | :--- |
`;
const tones = expandDiatonicTones();
for (const t of tones) {
  md += `| ${t.parentLabel} | ${STRING_NAMES[t.stringIndex]} | ${t.fret} | ${t.label} | ${t.id} |\n`;
}

md += `
（計 ${tones.length} 問）

---

## 6. 聴音モード（\`src/main.js\`）

問題 = 音再生。正解 = ラベル。詳細 midi／音源は \`src/main.js\` の \`MODES\` を参照。

| モード | 正解ラベル |
| :--- | :--- |
| 開放弦 | E / A / D / G / B / e |
| ダイアトニック（C） | C / Dm / Em / F / G / Am / Bm(♭5) |
| カノン（C） | C / G / Am / Em / F |
| カノン（D） | D / A / Bm / F#m / G |

---

## 再生成

\`\`\`bash
node --input-type=module scripts/generate-question-bank.mjs
\`\`\`
`;

writeFileSync(new URL("../QUESTION_BANK.md", import.meta.url), md);
console.log("Wrote QUESTION_BANK.md");
