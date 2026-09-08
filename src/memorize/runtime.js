import { pickSolfegeQuestion, LETTERS, SOLFEGE_TO_LETTER } from "./solfege.js";
import { pickStaffQuestion, renderStaffNoteSvg } from "./staff.js";
import {
  CANON_C_IDS,
  DIATONIC_C_IDS,
  OPEN_STRINGS,
  chordsByIds,
  expandDiatonicTones,
  singleNoteFrets,
} from "./shapes.js";
import { renderDiagramSvg } from "./diagram.js";
import { renderTabHtml } from "./tab.js";
import { getHandedness } from "./handedness.js";
import {
  audioForChordId,
  audioForFretted,
  audioForLetter,
  audioForMidi,
  audioForOpenId,
} from "./audio.js";

/**
 * @typedef {{
 *   key: string,
 *   name: string,
 *   subtitle: string,
 *   kind: "solfege" | "staff" | "staff-practice" | "diagram" | "tab",
 *   set: "solfege" | "staff" | "diatonic-c" | "canon-c" | "open-strings" | "diatonic-tones",
 *   needsHand?: boolean,
 *   practice?: boolean
 * }} MemorizeModeDef
 */

/** @type {Record<string, MemorizeModeDef>} */
export const MEMORIZE_MODES = {
  "practice-staff": {
    key: "practice-staff",
    name: "練習：大譜表",
    subtitle: "音名をタップすると、大譜表に音符を出して音を鳴らします",
    kind: "staff-practice",
    set: "staff",
    practice: true,
  },
  "memorize-solfege": {
    key: "memorize-solfege",
    name: "暗記：コード（ドレミ）",
    subtitle: "英字とドレミの対応を選んでください（双方向）",
    kind: "solfege",
    set: "solfege",
  },
  "memorize-staff": {
    key: "memorize-staff",
    name: "暗記：大譜表（E2〜E5）",
    subtitle: "大譜表の音符を、ミ3 / E3 形式で選んでください（自然音）",
    kind: "staff",
    set: "staff",
  },
  "memorize-diagram-diatonic": {
    key: "memorize-diagram-diatonic",
    name: "暗記：ダイアグラム・ダイアトニック",
    subtitle: "ダイアグラムのコード名を選んでください",
    kind: "diagram",
    set: "diatonic-c",
    needsHand: true,
  },
  "memorize-diagram-canon": {
    key: "memorize-diagram-canon",
    name: "暗記：ダイアグラム・カノン（C）",
    subtitle: "ダイアグラムのコード名を選んでください",
    kind: "diagram",
    set: "canon-c",
    needsHand: true,
  },
  "memorize-diagram-open": {
    key: "memorize-diagram-open",
    name: "暗記：ダイアグラム・開放弦",
    subtitle: "ダイアグラムの音名を選んでください",
    kind: "diagram",
    set: "open-strings",
    needsHand: true,
  },
  "memorize-tab-diatonic": {
    key: "memorize-tab-diatonic",
    name: "暗記：TAB・ダイアトニック",
    subtitle: "TABのコード名を選んでください",
    kind: "tab",
    set: "diatonic-c",
  },
  "memorize-tab-canon": {
    key: "memorize-tab-canon",
    name: "暗記：TAB・カノン（C）",
    subtitle: "TABのコード名を選んでください",
    kind: "tab",
    set: "canon-c",
  },
  "memorize-tab-open": {
    key: "memorize-tab-open",
    name: "暗記：TAB・開放弦",
    subtitle: "TABの音名を選んでください",
    kind: "tab",
    set: "open-strings",
  },
  "memorize-tab-tones": {
    key: "memorize-tab-tones",
    name: "暗記：TAB・構成音（アルペジオ）",
    subtitle: "TABの音名を選んでください（ダイアトニック構成音）",
    kind: "tab",
    set: "diatonic-tones",
  },
};

export function isMemorizeMode(key) {
  return Boolean(MEMORIZE_MODES[key]);
}

/**
 * @param {string} key
 */
export function isStaffPracticeMode(key) {
  return MEMORIZE_MODES[key]?.kind === "staff-practice";
}

/**
 * @template T
 * @param {T[]} pool
 * @param {string | null} excludeKey
 * @param {(item: T) => string} keyFn
 * @returns {T}
 */
function pickOther(pool, excludeKey, keyFn) {
  if (pool.length === 0) throw new Error("empty pool");
  if (pool.length === 1) return pool[0];
  const filtered = excludeKey
    ? pool.filter((item) => keyFn(item) !== excludeKey)
    : pool;
  const list = filtered.length ? filtered : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * @typedef {{
 *   answer: string,
 *   choices: string[],
 *   directionLabel: string,
 *   promptHtml: string,
 *   meta: string,
 *   frets: (number|null)[] | null,
 *   questionKey: string,
 *   audio: { src: string, rate: number } | null
 * }} MemorizeQuestion
 */

/** @type {ReturnType<typeof expandDiatonicTones> | null} */
let tonePoolCache = null;

function tonePool() {
  if (!tonePoolCache) tonePoolCache = expandDiatonicTones();
  return tonePoolCache;
}

/**
 * @param {MemorizeModeDef} mode
 * @param {string | null} [excludeKey]
 * @returns {MemorizeQuestion}
 */
export function buildMemorizeQuestion(mode, excludeKey = null) {
  if (mode.kind === "solfege") {
    const q = pickSolfegeQuestion(excludeKey);
    const letter =
      q.direction === "to-solfege" ? q.prompt : SOLFEGE_TO_LETTER[q.prompt] || q.answer;
    return {
      answer: q.answer,
      choices: q.choices,
      directionLabel: q.directionLabel,
      promptHtml: `<span class="visual-letter">${q.prompt}</span>`,
      meta: "",
      frets: null,
      questionKey: q.questionKey,
      audio: audioForLetter(letter),
    };
  }

  if (mode.kind === "staff") {
    const q = pickStaffQuestion(excludeKey);
    return {
      answer: q.note.label,
      choices: q.choices,
      directionLabel: "大譜表 → ドレミ / 英字",
      promptHtml: renderStaffNoteSvg(q.note),
      meta: "E2〜E5・自然音／例: ミ3 / E3",
      frets: null,
      questionKey: q.questionKey,
      audio: audioForMidi(q.note.midi),
    };
  }

  const hand = getHandedness();

  if (mode.set === "open-strings") {
    const pool = OPEN_STRINGS;
    const item = pickOther(pool, excludeKey, (p) => p.id);
    const frets = singleNoteFrets(item.stringIndex, item.fret);
    const promptHtml =
      mode.kind === "diagram"
        ? renderDiagramSvg(frets, hand)
        : renderTabHtml(frets);
    return {
      answer: item.label,
      choices: pool.map((p) => p.label),
      directionLabel: mode.kind === "diagram" ? "ダイアグラム → 音名" : "TAB → 音名",
      promptHtml,
      meta: "",
      frets,
      questionKey: item.id,
      audio: audioForOpenId(item.id),
    };
  }

  if (mode.set === "diatonic-tones") {
    const pool = tonePool();
    const item = pickOther(pool, excludeKey, (p) => p.id);
    const frets = singleNoteFrets(item.stringIndex, item.fret);
    return {
      answer: item.label,
      choices: [...LETTERS],
      directionLabel: "構成音 TAB → 音名",
      promptHtml: renderTabHtml(frets),
      meta: "",
      frets,
      questionKey: item.id,
      audio: audioForFretted(item.stringIndex, item.fret),
    };
  }

  const ids = mode.set === "canon-c" ? CANON_C_IDS : DIATONIC_C_IDS;
  const chords = chordsByIds(ids);
  const chord = pickOther(chords, excludeKey, (c) => c.id);
  const promptHtml =
    mode.kind === "diagram"
      ? renderDiagramSvg(chord.frets, hand)
      : renderTabHtml(chord.frets);

  return {
    answer: chord.label,
    choices: chords.map((c) => c.label),
    directionLabel:
      mode.kind === "diagram" ? "ダイアグラム → コード" : "TAB → コード",
    promptHtml,
    meta: "",
    frets: chord.frets,
    questionKey: chord.id,
    audio: audioForChordId(chord.id),
  };
}

/**
 * 利き手変更時に同じ frets を再描画
 * @param {"diagram"|"tab"} kind
 * @param {(number|null)[]} frets
 */
export function renderPromptFromFrets(kind, frets) {
  if (kind === "diagram") return renderDiagramSvg(frets, getHandedness());
  return renderTabHtml(frets);
}
