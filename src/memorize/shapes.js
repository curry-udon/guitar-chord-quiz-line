/**
 * 押さえ定義
 * frets: 6弦→1弦。null=ミュート, 0=開放, 1..=フレット
 */

/** @typedef {{ id: string, label: string, frets: (number|null)[] }} ChordShape */
/** @typedef {{ id: string, label: string, stringIndex: number, fret: number }} OpenStringShape */
/** @typedef {{ id: string, label: string, stringIndex: number, fret: number, parentChordId: string, parentLabel: string }} ToneShape */

/** 0=C … 11=B。6弦→1弦の開放 */
const OPEN_PC = [4, 9, 2, 7, 11, 4];

/** @type {Record<string, ChordShape>} */
export const CHORD_SHAPES = {
  C: { id: "C", label: "C", frets: [null, 3, 2, 0, 1, 0] },
  Dm: { id: "Dm", label: "Dm", frets: [null, null, 0, 2, 3, 1] },
  Em: { id: "Em", label: "Em", frets: [0, 2, 2, 0, 0, 0] },
  F: { id: "F", label: "F", frets: [1, 3, 3, 2, 1, 1] },
  G: { id: "G", label: "G", frets: [3, 2, 0, 0, 0, 3] },
  Am: { id: "Am", label: "Am", frets: [null, 0, 2, 2, 1, 0] },
  Bdim: {
    id: "Bdim",
    label: "Bm(♭5)",
    frets: [null, 2, 3, 4, 3, null],
  },
};

export const DIATONIC_C_IDS = ["C", "Dm", "Em", "F", "G", "Am", "Bdim"];
export const CANON_C_IDS = ["C", "G", "Am", "Em", "F"];

/** @type {OpenStringShape[]} */
export const OPEN_STRINGS = [
  { id: "E2", label: "E", stringIndex: 0, fret: 0 },
  { id: "A2", label: "A", stringIndex: 1, fret: 0 },
  { id: "D3", label: "D", stringIndex: 2, fret: 0 },
  { id: "G3", label: "G", stringIndex: 3, fret: 0 },
  { id: "B3", label: "B", stringIndex: 4, fret: 0 },
  { id: "E4", label: "e", stringIndex: 5, fret: 0 },
];

/** @type {Record<number, string>} */
const PC_LETTER = {
  0: "C",
  2: "D",
  4: "E",
  5: "F",
  7: "G",
  9: "A",
  11: "B",
};

/**
 * @param {number} stringIndex
 * @param {number} fret
 */
export function pitchClassAt(stringIndex, fret) {
  return (OPEN_PC[stringIndex] + fret) % 12;
}

/**
 * @param {number} pc
 */
export function letterFromPitchClass(pc) {
  return PC_LETTER[pc] || "C";
}

/**
 * @param {string[]} ids
 * @returns {ChordShape[]}
 */
export function chordsByIds(ids) {
  return ids.map((id) => CHORD_SHAPES[id]);
}

/**
 * ダイアトニック各コードの鳴っている音を1音ずつ展開
 * @returns {ToneShape[]}
 */
export function expandDiatonicTones() {
  /** @type {ToneShape[]} */
  const out = [];
  for (const id of DIATONIC_C_IDS) {
    const chord = CHORD_SHAPES[id];
    chord.frets.forEach((fret, stringIndex) => {
      if (fret == null) return;
      const pc = pitchClassAt(stringIndex, fret);
      const letter = letterFromPitchClass(pc);
      out.push({
        id: `${id}-s${stringIndex}-f${fret}`,
        label: letter,
        stringIndex,
        fret,
        parentChordId: id,
        parentLabel: chord.label,
      });
    });
  }
  return out;
}

/**
 * 単音を6弦配列に変換
 * @param {number} stringIndex
 * @param {number} fret
 * @returns {(number|null)[]}
 */
export function singleNoteFrets(stringIndex, fret) {
  return [0, 1, 2, 3, 4, 5].map((i) => (i === stringIndex ? fret : null));
}
