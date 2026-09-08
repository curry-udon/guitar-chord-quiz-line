/**
 * 大譜表クイズ：アコースティックギター常用レンジの自然音 E2〜E5
 * ラベル例: ミ3 / E3
 *
 * @typedef {{
 *   id: string,
 *   letter: string,
 *   solfege: string,
 *   octave: number,
 *   midi: number,
 *   label: string
 * }} StaffNote
 */

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const SOLFEGE = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];
/** @type {Record<string, number>} */
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** @type {Record<string, number>} */
const LETTER_DEG = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/**
 * @param {string} letter
 * @param {number} octave
 */
function midiOf(letter, octave) {
  return 12 * (octave + 1) + LETTER_PC[letter];
}

/**
 * @param {string} letter
 * @param {number} octave
 */
function degreeOf(letter, octave) {
  return octave * 7 + LETTER_DEG[letter];
}

/**
 * @param {string} letter
 * @param {number} octave
 */
function makeNote(letter, octave) {
  const i = LETTERS.indexOf(letter);
  const id = `${letter}${octave}`;
  const solfege = SOLFEGE[i];
  return {
    id,
    letter,
    solfege,
    octave,
    midi: midiOf(letter, octave),
    label: `${solfege}${octave} / ${letter}${octave}`,
  };
}

/** E2〜E5 の自然音（両端含む） */
function buildStaffNotes() {
  /** @type {StaffNote[]} */
  const out = [];
  const start = midiOf("E", 2);
  const end = midiOf("E", 5);
  for (let oct = 2; oct <= 5; oct += 1) {
    for (const letter of LETTERS) {
      const m = midiOf(letter, oct);
      if (m < start || m > end) continue;
      out.push(makeNote(letter, oct));
    }
  }
  return out;
}

/** @type {StaffNote[]} */
export const STAFF_NOTES = buildStaffNotes();

export const STAFF_CHOICES = STAFF_NOTES.map((n) => n.label);

const STEP = 6;
const DEG_C4 = degreeOf("C", 4);
const Y_C4 = 148;

/**
 * @param {string} letter
 * @param {number} octave
 */
function noteY(letter, octave) {
  return Y_C4 - (degreeOf(letter, octave) - DEG_C4) * STEP;
}

/**
 * @param {StaffNote | null} [note]
 * @returns {string} SVG
 */
export function renderStaffNoteSvg(note = null) {
  const W = 300;
  const yE5 = noteY("E", 5);
  const yE2 = noteY("E", 2);
  const yF5 = noteY("F", 5);
  const yG2 = noteY("G", 2);
  const padT = 18;
  const padB = 22;
  // 五線は F5〜G2。音符 E5〜E2 がその中〜加線
  const topY = Math.min(yF5, yE5) - padT;
  const botY = Math.max(yG2, yE2) + padB;
  const H = Math.ceil(botY - topY);
  const shift = -topY;

  const left = 72;
  const right = W - 20;
  const y = (letter, oct) => noteY(letter, oct) + shift;

  const trebleLetters = /** @type {const} */ (["E", "G", "B", "D", "F"]);
  const trebleOcts = [4, 4, 4, 5, 5];
  const trebleLines = trebleLetters.map((letter, i) => y(letter, trebleOcts[i]));

  const bassLetters = /** @type {const} */ (["G", "B", "D", "F", "A"]);
  const bassOcts = [2, 2, 3, 3, 3];
  const bassLines = bassLetters.map((letter, i) => y(letter, bassOcts[i]));

  let marks = "";
  trebleLines.forEach((ly) => {
    marks += `<line class="st-line" x1="${left}" y1="${ly}" x2="${right}" y2="${ly}" />`;
  });
  bassLines.forEach((ly) => {
    marks += `<line class="st-line" x1="${left}" y1="${ly}" x2="${right}" y2="${ly}" />`;
  });

  marks += `<line class="st-brace" x1="${left - 14}" y1="${trebleLines[4]}" x2="${left - 14}" y2="${bassLines[0]}" />`;

  const scale = STEP / 8;
  const yG4 = y("G", 4);
  const yF3 = y("F", 3);
  const CLEF_TREBLE = { x: 69, y: yG4, size: 63 * scale };
  const CLEF_BASS = { x: 69, y: yF3 + 25 * scale, size: 63 * scale };
  marks += `<text class="st-clef st-clef-treble" x="${CLEF_TREBLE.x}" y="${CLEF_TREBLE.y}" font-size="${CLEF_TREBLE.size}" dominant-baseline="middle">𝄞</text>`;
  marks += `<text class="st-clef st-clef-bass" x="${CLEF_BASS.x}" y="${CLEF_BASS.y}" font-size="${CLEF_BASS.size}" dominant-baseline="middle">𝄢</text>`;

  if (note) {
    const noteX = left + 100;
    const ny = y(note.letter, note.octave);
    const yG2s = y("G", 2);
    const yF5s = y("F", 5);
    const yC4s = y("C", 4);

    /** @type {number[]} */
    const ledgerYs = [];
    // ト音より上：音符〜五線のあいだの線位置（スペース上の音は直下の加線まで）
    if (ny < yF5s - 0.5) {
      for (let ly = yF5s - 2 * STEP; ly >= ny - STEP; ly -= 2 * STEP) {
        ledgerYs.push(ly);
      }
    }
    // ヘ音より下：同様（F2 は E2 加線が必要）
    if (ny > yG2s + 0.5) {
      for (let ly = yG2s + 2 * STEP; ly <= ny + STEP; ly += 2 * STEP) {
        ledgerYs.push(ly);
      }
    }
    if (note.id === "C4") {
      ledgerYs.push(yC4s);
    }
    [...new Set(ledgerYs.map((v) => Math.round(v * 10) / 10))].forEach((ly) => {
      marks += `<line class="st-line" x1="${noteX - 18}" y1="${ly}" x2="${noteX + 18}" y2="${ly}" />`;
    });

    marks += `<ellipse class="st-note" cx="${noteX}" cy="${ny}" rx="10" ry="7" transform="rotate(-18 ${noteX} ${ny})" />`;
  }

  return `<svg class="staff-quiz" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${marks}</svg>`;
}

/**
 * @param {string | null} excludeKey
 * @returns {{ note: StaffNote, questionKey: string, choices: string[] }}
 */
export function pickStaffQuestion(excludeKey = null) {
  const pool =
    excludeKey && STAFF_NOTES.length > 1
      ? STAFF_NOTES.filter((n) => `staff:${n.id}` !== excludeKey)
      : STAFF_NOTES;
  const list = pool.length ? pool : STAFF_NOTES;
  const note = list[Math.floor(Math.random() * list.length)];
  return {
    note,
    questionKey: `staff:${note.id}`,
    choices: [...STAFF_CHOICES],
  };
}
