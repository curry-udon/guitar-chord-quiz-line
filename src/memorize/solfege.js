/** 固定ド：英字 ↔ ドレミ */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const SOLFEGE = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];

/** @type {Record<string, string>} */
export const LETTER_TO_SOLFEGE = Object.fromEntries(
  LETTERS.map((letter, i) => [letter, SOLFEGE[i]]),
);

/** @type {Record<string, string>} */
export const SOLFEGE_TO_LETTER = Object.fromEntries(
  SOLFEGE.map((s, i) => [s, LETTERS[i]]),
);

/**
 * @param {string | null} [excludeKey]
 * @returns {{ direction: "to-solfege" | "to-letter", prompt: string, answer: string, choices: string[], directionLabel: string, questionKey: string }}
 */
export function pickSolfegeQuestion(excludeKey = null) {
  /** @type {{ direction: "to-solfege" | "to-letter", prompt: string, answer: string, choices: string[], directionLabel: string, questionKey: string }[]} */
  const candidates = [];
  for (let idx = 0; idx < LETTERS.length; idx += 1) {
    const letter = LETTERS[idx];
    const solfege = SOLFEGE[idx];
    candidates.push({
      direction: "to-solfege",
      prompt: letter,
      answer: solfege,
      choices: [...SOLFEGE],
      directionLabel: "英字 → ドレミ",
      questionKey: `to-solfege:${letter}`,
    });
    candidates.push({
      direction: "to-letter",
      prompt: solfege,
      answer: letter,
      choices: [...LETTERS],
      directionLabel: "ドレミ → 英字",
      questionKey: `to-letter:${solfege}`,
    });
  }

  const pool = excludeKey
    ? candidates.filter((c) => c.questionKey !== excludeKey)
    : candidates;
  const list = pool.length ? pool : candidates;
  return list[Math.floor(Math.random() * list.length)];
}
