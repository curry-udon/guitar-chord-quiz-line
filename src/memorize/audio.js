/**
 * 暗記クイズ用：正解に対応するギター音源の解決
 */

const OPEN_IDS = ["E2", "A2", "D3", "G3", "B3", "E4"];
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/** コードID → ファイル名 */
const CHORD_FILE = {
  C: "C.mp3",
  Dm: "Dm.mp3",
  Em: "Em.mp3",
  F: "F.mp3",
  G: "G.mp3",
  Am: "Am.mp3",
  Bdim: "Bdim.mp3",
  D: "D.mp3",
  A: "A.mp3",
  Bm: "Bm.mp3",
  "F#m": "Fshm.mp3",
};

/** 音名（オクターブなし）→ 代表 MIDI（ギター中域） */
const LETTER_MIDI = {
  C: 60,
  D: 62,
  E: 64,
  F: 65,
  G: 55,
  A: 57,
  B: 59,
};

/**
 * @param {string} path
 */
function asset(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

/**
 * @typedef {{ src: string, rate: number }} GuitarAudio
 */

/**
 * @param {string} chordId
 * @returns {GuitarAudio | null}
 */
export function audioForChordId(chordId) {
  const file = CHORD_FILE[chordId];
  if (!file) return null;
  return { src: asset(`audio/${file}`), rate: 1 };
}

/**
 * @param {string} openId E2 / A2 / …
 * @returns {GuitarAudio | null}
 */
export function audioForOpenId(openId) {
  if (!OPEN_IDS.includes(openId)) return null;
  return { src: asset(`audio/open_${openId}.mp3`), rate: 1 };
}

/**
 * 弦＋フレット → その開放弦サンプルをピッチシフト
 * @param {number} stringIndex 0=6弦 … 5=1弦
 * @param {number} fret
 * @returns {GuitarAudio | null}
 */
export function audioForFretted(stringIndex, fret) {
  if (stringIndex < 0 || stringIndex > 5) return null;
  const openId = OPEN_IDS[stringIndex];
  const rate = 2 ** (Math.max(0, fret) / 12);
  return { src: asset(`audio/open_${openId}.mp3`), rate };
}

/**
 * MIDI ノート → 直下の開放弦サンプル＋レート
 * @param {number} midi
 * @returns {GuitarAudio | null}
 */
export function audioForMidi(midi) {
  let best = 0;
  for (let i = 0; i < OPEN_MIDI.length; i += 1) {
    if (OPEN_MIDI[i] <= midi) best = i;
  }
  const base = OPEN_MIDI[best];
  const semitones = midi - base;
  // 大きく上げすぎない（最大 +7 半音程度を推奨だが、必要ならそのまま）
  const rate = 2 ** (semitones / 12);
  return { src: asset(`audio/open_${OPEN_IDS[best]}.mp3`), rate };
}

/**
 * 英字音名 C–B
 * @param {string} letter
 * @returns {GuitarAudio | null}
 */
export function audioForLetter(letter) {
  const midi = LETTER_MIDI[letter];
  if (midi == null) return null;
  return audioForMidi(midi);
}
