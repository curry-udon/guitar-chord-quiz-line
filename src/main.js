import liff from "@line/liff";
import {
  MEMORIZE_MODES,
  buildMemorizeQuestion,
  isMemorizeMode,
  isStaffPracticeMode,
  renderPromptFromFrets,
} from "./memorize/runtime.js";
import { STAFF_NOTES, renderStaffNoteSvg } from "./memorize/staff.js";
import { audioForMidi } from "./memorize/audio.js";
import {
  canAccessMode,
  createCheckoutUrl,
  devUnlockOnServer,
  getIsPremium,
  hasApi,
  isModePremiumOnly,
  PREMIUM_PRODUCT,
  setIsPremium,
  syncPremiumFromServer,
} from "./premium.js";

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   src: string,
 *   midiNotes: number[],
 *   waveY?: number,
 *   waveCaption?: string,
 *   staffCaption?: string,
 *   staffNoteX?: number,
 *   staffNoteY?: number
 * }} QuizItem
 */
/** @typedef {{ name: string, subtitle: string, items: QuizItem[], practice?: boolean }} QuizMode */

const STAFF_CROP_Y = 740;
const STAFF_CROP_H = 252;
const STREAK_CLEAR = 12;

/** ピアノロール表示範囲（E2〜G4） */
const PITCH_MIN = 40;
const PITCH_MAX = 67;

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** GitHub Pages のサブパス対応（例: /guitar-chord-quiz-line/audio/...） */
const asset = (path) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const MODES = /** @type {Record<string, QuizMode>} */ ({
  "open-strings": {
    name: "初級：開放弦",
    subtitle: "開放弦の音を聞いて、音名を選んでください",
    items: [
      {
        id: "E2",
        label: "E",
        src: asset("audio/open_E2.mp3"),
        midiNotes: [40],
        waveY: 620,
        waveCaption: "6弦 E2 · 82.41 Hz",
        staffCaption: "大譜表：ヘ音記号の下・加線（下第1線）の上",
        staffNoteX: 255,
        staffNoteY: 954,
      },
      {
        id: "A2",
        label: "A",
        src: asset("audio/open_A2.mp3"),
        midiNotes: [45],
        waveY: 516,
        waveCaption: "5弦 A2 · 110.00 Hz",
        staffCaption: "大譜表：ヘ音記号の第1間（一番下の線のすぐ上）",
        staffNoteX: 377,
        staffNoteY: 936,
      },
      {
        id: "D3",
        label: "D",
        src: asset("audio/open_D3.mp3"),
        midiNotes: [50],
        waveY: 412,
        waveCaption: "4弦 D3 · 146.83 Hz",
        staffCaption: "大譜表：ヘ音記号の第3線（真ん中の線）",
        staffNoteX: 499,
        staffNoteY: 918,
      },
      {
        id: "G3",
        label: "G",
        src: asset("audio/open_G3.mp3"),
        midiNotes: [55],
        waveY: 308,
        waveCaption: "3弦 G3 · 196.00 Hz",
        staffCaption: "大譜表：ヘ音記号の第4間（一番上の間）",
        staffNoteX: 621,
        staffNoteY: 900,
      },
      {
        id: "B3",
        label: "B",
        src: asset("audio/open_B3.mp3"),
        midiNotes: [59],
        waveY: 204,
        waveCaption: "2弦 B3 · 246.94 Hz",
        staffCaption: "大譜表：ヘ音記号の上・中央ド(C4)のすぐ下",
        staffNoteX: 743,
        staffNoteY: 888,
      },
      {
        id: "E4",
        label: "e",
        src: asset("audio/open_E4.mp3"),
        midiNotes: [64],
        waveY: 100,
        waveCaption: "1弦 E4 · 329.63 Hz",
        staffCaption: "大譜表：ト音記号の第1線（一番下の線）",
        staffNoteX: 865,
        staffNoteY: 870,
      },
    ],
  },
  "canon-c": {
    name: "カノン進行（C）",
    subtitle: "音を聞いて、コードを選んでください",
    items: [
      {
        id: "C",
        label: "C",
        src: asset("audio/C.mp3"),
        midiNotes: [48, 52, 55, 60, 64],
      },
      {
        id: "G",
        label: "G",
        src: asset("audio/G.mp3"),
        midiNotes: [43, 47, 50, 55, 59, 67],
      },
      {
        id: "Am",
        label: "Am",
        src: asset("audio/Am.mp3"),
        midiNotes: [45, 52, 57, 60, 64],
      },
      {
        id: "Em",
        label: "Em",
        src: asset("audio/Em.mp3"),
        midiNotes: [40, 47, 52, 55, 59, 64],
      },
      {
        id: "F",
        label: "F",
        src: asset("audio/F.mp3"),
        midiNotes: [41, 48, 53, 57, 60, 65],
      },
    ],
  },
  "diatonic-c": {
    name: "ダイアトニック（C）",
    subtitle: "キーCの三和音を聞いて、コードを選んでください",
    items: [
      {
        id: "C",
        label: "C",
        src: asset("audio/C.mp3"),
        midiNotes: [48, 52, 55, 60, 64],
      },
      {
        id: "Dm",
        label: "Dm",
        src: asset("audio/Dm.mp3"),
        midiNotes: [50, 57, 62, 65],
      },
      {
        id: "Em",
        label: "Em",
        src: asset("audio/Em.mp3"),
        midiNotes: [40, 47, 52, 55, 59, 64],
      },
      {
        id: "F",
        label: "F",
        src: asset("audio/F.mp3"),
        midiNotes: [41, 48, 53, 57, 60, 65],
      },
      {
        id: "G",
        label: "G",
        src: asset("audio/G.mp3"),
        midiNotes: [43, 47, 50, 55, 59, 67],
      },
      {
        id: "Am",
        label: "Am",
        src: asset("audio/Am.mp3"),
        midiNotes: [45, 52, 57, 60, 64],
      },
      {
        id: "Bdim",
        label: "Bm(♭5)",
        src: asset("audio/Bdim.mp3"),
        midiNotes: [47, 50, 53],
      },
    ],
  },
  "canon-d": {
    name: "カノン進行（D）",
    subtitle: "音を聞いて、コードを選んでください",
    items: [
      {
        id: "D",
        label: "D",
        src: asset("audio/D.mp3"),
        midiNotes: [50, 57, 62, 66],
      },
      {
        id: "A",
        label: "A",
        src: asset("audio/A.mp3"),
        midiNotes: [45, 52, 57, 61, 64],
      },
      {
        id: "Bm",
        label: "Bm",
        src: asset("audio/Bm.mp3"),
        midiNotes: [47, 54, 59, 62, 66],
      },
      {
        id: "F#m",
        label: "F#m",
        src: asset("audio/Fshm.mp3"),
        midiNotes: [42, 49, 54, 57, 61, 66],
      },
      {
        id: "G",
        label: "G",
        src: asset("audio/G.mp3"),
        midiNotes: [43, 47, 50, 55, 59, 67],
      },
    ],
  },
});

// 練習モードはクイズと同じ音源・音階データを共有
MODES["practice-open-strings"] = {
  name: "練習：開放弦",
  subtitle: "音名をタップして、音とピアノロールで覚えましょう",
  practice: true,
  items: MODES["open-strings"].items,
};
MODES["practice-diatonic-c"] = {
  name: "練習：ダイアトニック（C）",
  subtitle: "コード名をタップして、音と構成音で覚えましょう",
  practice: true,
  items: MODES["diatonic-c"].items,
};
const el = {
  status: document.getElementById("liff-status"),
  subtitle: document.getElementById("subtitle"),
  play: document.getElementById("play-btn"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  hint: document.getElementById("hint"),
  correct: document.getElementById("correct"),
  wrong: document.getElementById("wrong"),
  streak: document.getElementById("streak"),
  mode: document.getElementById("mode-select"),
  wavePanel: document.getElementById("wave-panel"),
  waveCrop: document.getElementById("wave-crop"),
  waveCaption: document.getElementById("wave-caption"),
  staffCrop: document.getElementById("staff-crop"),
  staffCaption: document.getElementById("staff-caption"),
  staffMark: document.getElementById("staff-mark"),
  pianoKeys: document.getElementById("piano-keys"),
  pianoGrid: document.getElementById("piano-grid"),
  pianoNotes: document.getElementById("piano-notes"),
  pianoRoll: document.getElementById("piano-roll"),
  visualPrompt: document.getElementById("visual-prompt"),
  visualDirection: document.getElementById("visual-direction"),
  visualMain: document.getElementById("visual-main"),
  visualMeta: document.getElementById("visual-meta"),
  playerCard: document.querySelector(".player-card"),
  handednessField: document.getElementById("handedness-field"),
  streakConfirm: document.getElementById("streak-confirm"),
  streakYes: document.getElementById("streak-yes"),
  streakNo: document.getElementById("streak-no"),
  modePicker: document.getElementById("mode-picker"),
  modePickerList: document.getElementById("mode-picker-list"),
  modePickerCancel: document.getElementById("mode-picker-cancel"),
  paywall: document.getElementById("paywall"),
  paywallBody: document.getElementById("paywall-body"),
  paywallPrice: document.getElementById("paywall-price"),
  paywallBuy: document.getElementById("paywall-buy"),
  paywallDev: document.getElementById("paywall-dev"),
  paywallCancel: document.getElementById("paywall-cancel"),
};

const state = {
  modeKey: "open-strings",
  answer: /** @type {QuizItem | null} */ (null),
  /** 暗記モードの正解ラベル */
  visualAnswer: /** @type {string | null} */ (null),
  /** 再描画用 frets */
  visualFrets: /** @type {(number|null)[] | null} */ (null),
  /** 暗記モードの正解音 */
  visualAudio: /** @type {{ src: string, rate: number } | null} */ (null),
  /** 直前の出題キー（連続同一問題の防止） */
  lastQuestionKey: /** @type {string | null} */ (null),
  audioCtx: /** @type {AudioContext | null} */ (null),
  bufferCache: /** @type {Map<string, AudioBuffer>} */ (new Map()),
  sourceNode: /** @type {AudioBufferSourceNode | null} */ (null),
  locked: false,
  /** 答え表示中。タップで次問へ */
  awaitingNext: false,
  /** 12連続クリア確認ダイアログ表示中 */
  streakPromptOpen: false,
  /** ペイウォールで解放しようとしているモード */
  pendingModeKey: /** @type {string | null} */ (null),
  correct: 0,
  wrong: 0,
  streak: 0,
};

const player = /** @type {HTMLAudioElement | null} */ (
  document.getElementById("player")
);

function midiLabel(midi) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

function isBlackKey(midi) {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

function buildPianoRoll() {
  if (!el.pianoKeys || !el.pianoGrid || !el.pianoNotes) return;

  el.pianoKeys.innerHTML = "";
  el.pianoNotes.innerHTML = "";

  const rows = document.createElement("div");
  rows.className = "piano-grid-rows";

  // 高い音が上（DTMと同じ）
  for (let midi = PITCH_MAX; midi >= PITCH_MIN; midi -= 1) {
    const black = isBlackKey(midi);
    const key = document.createElement("div");
    key.className = `piano-key${black ? " is-black" : ""}${midi % 12 === 0 ? " is-c" : ""}`;
    // Cubase風: C のみオクターブラベル
    key.textContent = midi % 12 === 0 ? midiLabel(midi) : "";
    key.dataset.midi = String(midi);
    el.pianoKeys.appendChild(key);

    const row = document.createElement("div");
    row.className = `piano-grid-row${black ? " is-black" : ""}`;
    row.dataset.midi = String(midi);
    rows.appendChild(row);
  }

  el.pianoGrid.querySelector(".piano-grid-rows")?.remove();
  el.pianoGrid.insertBefore(rows, el.pianoNotes);
}

function clearPianoNotes() {
  if (!el.pianoNotes) return;
  el.pianoNotes.innerHTML = "";
}

function showPianoNotes(answer) {
  if (!el.pianoNotes || !answer?.midiNotes?.length) {
    clearPianoNotes();
    return;
  }

  clearPianoNotes();

  answer.midiNotes.forEach((midi, i) => {
    if (midi < PITCH_MIN || midi > PITCH_MAX) return;
    const fromTop = PITCH_MAX - midi;
    const note = document.createElement("div");
    note.className = "piano-note";
    note.style.top = `calc(${fromTop} * var(--pr-row))`;
    note.title = midiLabel(midi);
    el.pianoNotes.appendChild(note);
    window.setTimeout(() => note.classList.add("is-on"), 30 + i * 40);
  });

  // 構成音が見えるよう、最低音付近へスクロール
  const inRange = answer.midiNotes.filter(
    (m) => m >= PITCH_MIN && m <= PITCH_MAX,
  );
  if (inRange.length && el.pianoKeys) {
    const lowest = Math.min(...inRange);
    const rowEl = el.pianoKeys.querySelector(`[data-midi="${lowest}"]`);
    rowEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 最大 6 択。開放弦はチューニング順のまま 6 つ全部出す */
function pickChoices(pool, answer) {
  // 全選択肢を出すモードは定義順のまま（例: C→Dm→Em→…）
  if (state.modeKey === "open-strings" || pool.length <= 7) {
    return [...pool];
  }
  const others = shuffle(pool.filter((item) => item.id !== answer.id)).slice(
    0,
    5,
  );
  return shuffle([answer, ...others]);
}

function setFeedback(text, kind) {
  el.feedback.textContent = text;
  el.feedback.className = `feedback ${kind || ""}`;
}

function hideWave() {
  if (!el.wavePanel) return;
  el.wavePanel.hidden = true;
  if (el.waveCrop) el.waveCrop.style.removeProperty("--crop-y");
  if (el.waveCaption) el.waveCaption.textContent = "";
  if (el.staffCaption) el.staffCaption.textContent = "";
  if (el.staffCrop) {
    el.staffCrop.style.removeProperty("--mark-x");
    el.staffCrop.style.removeProperty("--mark-y");
  }
}

function showWave(answer) {
  if (!el.wavePanel || !el.waveCrop || answer.waveY == null) {
    hideWave();
    return;
  }
  el.waveCrop.style.setProperty("--crop-y", String(answer.waveY));
  if (el.waveCaption) el.waveCaption.textContent = answer.waveCaption || "";

  if (el.staffCaption) {
    el.staffCaption.textContent = answer.staffCaption || "";
  }
  if (el.staffCrop && answer.staffNoteX != null && answer.staffNoteY != null) {
    // 大譜表パネル内での相対位置（SVG座標 → %）
    const markX = (answer.staffNoteX / 960) * 100;
    const markY = ((answer.staffNoteY - STAFF_CROP_Y) / STAFF_CROP_H) * 100;
    el.staffCrop.style.setProperty("--mark-x", `${markX}%`);
    el.staffCrop.style.setProperty("--mark-y", `${markY}%`);
  }

  el.wavePanel.hidden = false;
}

function stopAudio() {
  if (state.sourceNode) {
    try {
      state.sourceNode.stop();
    } catch {
      /* already stopped */
    }
    state.sourceNode.disconnect();
    state.sourceNode = null;
  }
  if (player) {
    player.pause();
    player.currentTime = 0;
  }
}

async function ensureAudioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!state.audioCtx) state.audioCtx = new AC();
  if (state.audioCtx.state === "suspended") {
    await state.audioCtx.resume();
  }
  return state.audioCtx;
}

async function loadBuffer(url) {
  const cached = state.bufferCache.get(url);
  if (cached) return cached;
  const ctx = await ensureAudioCtx();
  if (!ctx) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`音源取得失敗 HTTP ${res.status}`);
  const arr = await res.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr.slice(0));
  state.bufferCache.set(url, buf);
  return buf;
}

async function playWithWebAudio(url, rate = 1) {
  const ctx = await ensureAudioCtx();
  if (!ctx) throw new Error("AudioContext 非対応");
  const buf = await loadBuffer(url);
  if (!buf) throw new Error("デコード失敗");
  stopAudio();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  state.sourceNode = src;
  src.start(0);
}

async function playWithHtmlAudio(url) {
  if (!player) throw new Error("audio 要素なし");
  stopAudio();
  player.src = url;
  player.load();
  await player.play();
}

/**
 * @param {{ src: string, rate?: number } | null | undefined} audio
 */
async function playGuitarAudio(audio) {
  if (!audio?.src) return;
  const rate = audio.rate ?? 1;
  try {
    await ensureAudioCtx();
  } catch (err) {
    console.warn(err);
  }
  try {
    await playWithWebAudio(audio.src, rate);
  } catch (webErr) {
    console.warn("WebAudio failed, fallback to HTMLAudio", webErr);
    try {
      // HTMLAudio はピッチシフト不可。rate≈1 のときだけフォールバック
      if (Math.abs(rate - 1) < 0.02) await playWithHtmlAudio(audio.src);
    } catch (htmlErr) {
      console.error(htmlErr);
    }
  }
}

async function playAnswer() {
  if (!state.answer) return;
  const url = state.answer.src;
  try {
    // LINE WebView では Web Audio の方が安定しやすい
    await playWithWebAudio(url);
    if (!isPractice()) {
      el.hint.textContent = "もう一度聴くこともできます";
      setFeedback("", "");
    }
  } catch (webErr) {
    console.warn("WebAudio failed, fallback to HTMLAudio", webErr);
    try {
      await playWithHtmlAudio(url);
      if (!isPractice()) {
        el.hint.textContent = "もう一度聴くこともできます";
        setFeedback("", "");
      }
    } catch (htmlErr) {
      console.error(htmlErr);
      const detail =
        htmlErr && typeof htmlErr === "object" && "name" in htmlErr
          ? `${htmlErr.name}: ${htmlErr.message || ""}`
          : String(htmlErr);
      setFeedback(`再生できませんでした（${detail}）`, "ng");
    }
  }
}

function isPractice() {
  return (
    Boolean(MODES[state.modeKey]?.practice) ||
    Boolean(MEMORIZE_MODES[state.modeKey]?.practice)
  );
}

function isVisualMemorize() {
  return isMemorizeMode(state.modeKey) && !isStaffPracticeMode(state.modeKey);
}

function isStaffPractice() {
  return isStaffPracticeMode(state.modeKey);
}

function scoreRow() {
  return document.querySelector(".score-row");
}

function hideVisualPrompt() {
  if (el.visualPrompt) el.visualPrompt.hidden = true;
  if (el.visualMain) el.visualMain.innerHTML = "";
  if (el.visualDirection) el.visualDirection.textContent = "";
  if (el.visualMeta) el.visualMeta.textContent = "";
  el.playerCard?.classList.remove("is-visual");
  state.visualAnswer = null;
  state.visualFrets = null;
  state.visualAudio = null;
}

function showHandednessIfNeeded() {
  const def = MEMORIZE_MODES[state.modeKey];
  const show = Boolean(def?.needsHand);
  if (el.handednessField) el.handednessField.hidden = !show;
  if (show) {
    const hand = getHandedness();
    el.handednessField
      ?.querySelectorAll('input[name="handedness"]')
      .forEach((input) => {
        /** @type {HTMLInputElement} */ (input).checked =
          /** @type {HTMLInputElement} */ (input).value === hand;
      });
  }
}

function applyModeCopy() {
  if (isMemorizeMode(state.modeKey)) {
    const mode = MEMORIZE_MODES[state.modeKey];
    if (el.subtitle) el.subtitle.textContent = mode.subtitle;
  } else {
    const mode = MODES[state.modeKey];
    if (el.subtitle) el.subtitle.textContent = mode.subtitle;
  }
  scoreRow()?.classList.toggle("is-practice", isPractice());
  showHandednessIfNeeded();
}

function renderChoiceButtons(labels, onPick, dense = false) {
  el.choices.innerHTML = "";
  el.choices.classList.toggle("is-dense", dense);
  labels.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = label;
    btn.dataset.label = label;
    btn.addEventListener("click", () => onPick(label, btn));
    el.choices.appendChild(btn);
  });
}

function enterMemorizeQuestion() {
  const def = MEMORIZE_MODES[state.modeKey];
  const q = buildMemorizeQuestion(def, state.lastQuestionKey);
  state.lastQuestionKey = q.questionKey;

  state.answer = null;
  state.visualAnswer = q.answer;
  state.visualFrets = q.frets;
  state.visualAudio = q.audio;
  state.locked = false;
  state.awaitingNext = false;
  stopAudio();
  hideWave();
  clearPianoNotes();
  setFeedback("", "");

  el.playerCard?.classList.add("is-visual");
  if (el.visualPrompt) el.visualPrompt.hidden = false;
  if (el.visualDirection) el.visualDirection.textContent = q.directionLabel;
  if (el.visualMain) el.visualMain.innerHTML = q.promptHtml;
  if (el.visualMeta) el.visualMeta.textContent = q.meta;

  el.hint.textContent = "選択肢をタップ";
  el.play.classList.add("is-hidden");
  el.play.classList.remove("is-next");
  el.play.disabled = true;
  el.play.textContent = "次の問題 ▶";

  if (q.audio?.src) loadBuffer(q.audio.src).catch(() => {});
  renderChoiceButtons(q.choices, onMemorizeChoose, def.kind === "staff");
}

function enterStaffPractice() {
  state.answer = null;
  state.visualAnswer = null;
  state.visualFrets = null;
  state.visualAudio = null;
  state.locked = false;
  state.awaitingNext = false;
  stopAudio();
  hideWave();
  clearPianoNotes();
  setFeedback("", "");

  el.playerCard?.classList.add("is-visual");
  if (el.visualPrompt) el.visualPrompt.hidden = false;
  if (el.visualDirection) el.visualDirection.textContent = "音名 → 大譜表＋音";
  if (el.visualMain) el.visualMain.innerHTML = renderStaffNoteSvg(null);
  if (el.visualMeta) el.visualMeta.textContent = "ミ2 / E2 〜 ミ5 / E5（自然音）";

  el.hint.textContent = "下の音名をタップ";
  el.play.classList.remove("is-hidden", "is-next");
  el.play.disabled = true;
  el.play.textContent = "もう一度 ▶";

  el.choices.innerHTML = "";
  el.choices.classList.add("is-dense");
  STAFF_NOTES.forEach((note) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = note.label;
    btn.dataset.label = note.label;
    btn.addEventListener("click", () => onStaffPracticeChoose(note, btn));
    el.choices.appendChild(btn);
    const audio = audioForMidi(note.midi);
    if (audio?.src) loadBuffer(audio.src).catch(() => {});
  });
}

function onStaffPracticeChoose(note, btn) {
  const audio = audioForMidi(note.midi);
  state.visualAnswer = note.label;
  state.visualAudio = audio;

  const buttons = [...el.choices.querySelectorAll(".choice")];
  buttons.forEach((b) => {
    b.classList.toggle("active", b === btn);
    b.classList.remove("correct", "wrong");
  });

  if (el.visualMain) el.visualMain.innerHTML = renderStaffNoteSvg(note);
  setFeedback(note.label, "ok");
  el.hint.textContent = "別の音名も試せます · 「もう一度」で再生";
  el.play.disabled = false;
  el.play.textContent = "もう一度 ▶";
  el.play.classList.remove("is-hidden", "is-next");

  playGuitarAudio(audio);
}

function redrawMemorizePrompt() {
  if (!isVisualMemorize() || !state.visualFrets || !el.visualMain) return;
  const def = MEMORIZE_MODES[state.modeKey];
  if (def.kind !== "diagram") return;
  el.visualMain.innerHTML = renderPromptFromFrets("diagram", state.visualFrets);
}

function onMemorizeChoose(label, btn) {
  if (!isVisualMemorize() || state.locked || !state.visualAnswer || state.awaitingNext)
    return;
  state.locked = true;

  const buttons = [...el.choices.querySelectorAll(".choice")];
  buttons.forEach((b) => {
    b.disabled = true;
    if (b.dataset.label === state.visualAnswer) b.classList.add("correct");
  });

  if (label === state.visualAnswer) {
    btn.classList.add("correct");
    state.correct += 1;
    state.streak += 1;
    setFeedback("正解！", "ok");
  } else {
    btn.classList.add("wrong");
    state.wrong += 1;
    state.streak = 0;
    setFeedback(`不正解… 正解は ${state.visualAnswer}`, "ng");
  }

  el.correct.textContent = String(state.correct);
  el.wrong.textContent = String(state.wrong);
  el.streak.textContent = String(state.streak);

  state.awaitingNext = true;
  el.play.classList.remove("is-hidden");
  el.play.classList.add("is-next");
  el.play.disabled = false;
  el.play.textContent = "次の問題 ▶";
  el.hint.textContent = "確認したら「次の問題」をタップ";

  playGuitarAudio(state.visualAudio);

  if (label === state.visualAnswer) maybeOfferNextMode();
}

function enterPractice() {
  hideVisualPrompt();
  const pool = MODES[state.modeKey].items;
  state.answer = null;
  state.locked = false;
  state.awaitingNext = false;
  stopAudio();
  hideWave();
  clearPianoNotes();
  setFeedback("", "");
  el.hint.textContent = "名前をタップすると音と音階が出ます";
  el.play.disabled = true;
  el.play.textContent = "もう一度 ▶";
  el.play.classList.remove("is-hidden", "is-next");

  el.choices.innerHTML = "";
  el.choices.classList.remove("is-dense");
  pool.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = item.label;
    btn.dataset.label = item.label;
    btn.addEventListener("click", () => onPracticeChoose(item, btn));
    el.choices.appendChild(btn);
    loadBuffer(item.src).catch(() => {});
  });
}

async function onPracticeChoose(item, btn) {
  try {
    await ensureAudioCtx();
  } catch (err) {
    console.warn(err);
  }

  state.answer = item;
  const buttons = [...el.choices.querySelectorAll(".choice")];
  buttons.forEach((b) => {
    b.classList.toggle("active", b === btn);
    b.classList.remove("correct", "wrong");
  });

  const noteNames = item.midiNotes.map(midiLabel).join(" · ");
  setFeedback(`${item.label}　${noteNames}`, "ok");
  el.hint.textContent = "別の名前も試せます · 「もう一度」で再生";
  el.play.disabled = false;
  el.play.textContent = "もう一度 ▶";

  showPianoNotes(item);
  showWave(item);
  await playAnswer();
}

function nextQuestion() {
  if (isStaffPractice()) {
    enterStaffPractice();
    return;
  }
  if (isVisualMemorize()) {
    enterMemorizeQuestion();
    return;
  }
  if (isPractice()) {
    enterPractice();
    return;
  }

  hideVisualPrompt();
  const pool = MODES[state.modeKey].items;
  const lastId = state.lastQuestionKey;
  const candidates =
    pool.length > 1 && lastId
      ? pool.filter((item) => item.id !== lastId)
      : pool;
  state.answer = candidates[Math.floor(Math.random() * candidates.length)];
  state.lastQuestionKey = state.answer?.id ?? null;
  state.locked = false;
  state.awaitingNext = false;
  stopAudio();
  hideWave();
  clearPianoNotes();
  if (state.answer) {
    loadBuffer(state.answer.src).catch(() => {});
  }

  setFeedback("", "");
  el.hint.textContent = "再生してから選択肢をタップ";
  el.play.disabled = false;
  el.play.textContent = "▶ 再生";
  el.play.classList.remove("is-hidden", "is-next");

  const options = pickChoices(pool, state.answer);
  el.choices.innerHTML = "";
  el.choices.classList.remove("is-dense");
  options.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = item.label;
    btn.dataset.label = item.label;
    btn.addEventListener("click", () => onChoose(item, btn));
    el.choices.appendChild(btn);
  });
}

async function onPlay() {
  if (state.awaitingNext) {
    nextQuestion();
    return;
  }
  if (isStaffPractice()) {
    await playGuitarAudio(state.visualAudio);
    return;
  }
  if (isVisualMemorize()) return;
  try {
    await ensureAudioCtx();
  } catch (err) {
    console.warn(err);
  }
  await playAnswer();
}

function onChoose(item, btn) {
  if (
    isPractice() ||
    isVisualMemorize() ||
    state.locked ||
    !state.answer ||
    state.awaitingNext
  )
    return;
  state.locked = true;

  const buttons = [...el.choices.querySelectorAll(".choice")];
  buttons.forEach((b) => {
    b.disabled = true;
    if (b.dataset.label === state.answer.label) b.classList.add("correct");
  });

  if (item.label === state.answer.label) {
    btn.classList.add("correct");
    state.correct += 1;
    state.streak += 1;
    setFeedback("正解！", "ok");
  } else {
    btn.classList.add("wrong");
    state.wrong += 1;
    state.streak = 0;
    setFeedback(`不正解… 正解は ${state.answer.label}`, "ng");
  }

  el.correct.textContent = String(state.correct);
  el.wrong.textContent = String(state.wrong);
  el.streak.textContent = String(state.streak);

  showPianoNotes(state.answer);
  showWave(state.answer);

  state.awaitingNext = true;
  el.play.disabled = false;
  el.play.textContent = "次の問題 ▶";
  el.play.classList.add("is-next");
  el.hint.textContent = "確認したら「次の問題」をタップ";

  playGuitarAudio({ src: state.answer.src, rate: 1 });

  if (item.label === state.answer.label) maybeOfferNextMode();
}

function maybeOfferNextMode() {
  if (isPractice()) return;
  if (state.streak >= STREAK_CLEAR && state.streak % STREAK_CLEAR === 0) {
    openStreakConfirm();
  }
}

function openStreakConfirm() {
  state.streakPromptOpen = true;
  if (el.streakConfirm) el.streakConfirm.hidden = false;
}

function closeStreakConfirm() {
  state.streakPromptOpen = false;
  if (el.streakConfirm) el.streakConfirm.hidden = true;
}

function listModeOptions() {
  /** @type {{ value: string, label: string, group: string, locked: boolean }[]} */
  const options = [];
  const select = el.mode;
  if (!select) return options;
  [...select.querySelectorAll("option")].forEach((opt) => {
    const group =
      opt.parentElement instanceof HTMLOptGroupElement
        ? opt.parentElement.label
        : "";
    const base = opt.dataset.baseLabel || opt.textContent?.trim() || opt.value;
    options.push({
      value: opt.value,
      label: base,
      group,
      locked: !canAccessMode(opt.value),
    });
  });
  return options;
}

function initModeOptionLabels() {
  if (!el.mode) return;
  [...el.mode.options].forEach((opt) => {
    if (!opt.dataset.baseLabel) {
      opt.dataset.baseLabel = opt.textContent?.trim() || opt.value;
    }
  });
  refreshModeSelectLocks();
}

function refreshModeSelectLocks() {
  if (!el.mode) return;
  [...el.mode.options].forEach((opt) => {
    const base = opt.dataset.baseLabel || opt.textContent?.trim() || opt.value;
    opt.textContent =
      !getIsPremium() && isModePremiumOnly(opt.value) ? `${base} 🔒` : base;
  });
  updatePremiumBadge();
}

function updatePremiumBadge() {
  const sub = el.subtitle;
  if (!sub) return;
  // badge is separate element after h1 if present
  let badge = document.getElementById("premium-badge");
  if (getIsPremium()) {
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "premium-badge";
      badge.className = "premium-badge";
      badge.textContent = "Premium";
      document.querySelector(".header h1")?.appendChild(badge);
    }
    badge.hidden = false;
  } else if (badge) {
    badge.hidden = true;
  }
}

function openPaywall(modeKey) {
  state.pendingModeKey = modeKey;
  closeModePicker();
  if (el.paywallBody) {
    el.paywallBody.textContent = PREMIUM_PRODUCT.blurb;
  }
  if (el.paywallPrice) {
    el.paywallPrice.textContent = PREMIUM_PRODUCT.priceLabel;
  }
  if (el.paywall) el.paywall.hidden = false;
}

function closePaywall() {
  state.pendingModeKey = null;
  if (el.paywall) el.paywall.hidden = true;
  if (el.mode) el.mode.value = state.modeKey;
}

function unlockPremiumAndEnter() {
  setIsPremium(true);
  refreshModeSelectLocks();
  const next = state.pendingModeKey || state.modeKey;
  closePaywall();
  applyModeSwitch(next);
}

async function refreshPremiumFromServer() {
  if (!hasApi()) return;
  try {
    await syncPremiumFromServer();
    refreshModeSelectLocks();
  } catch (err) {
    console.warn("premium sync failed", err);
  }
}

function consumePremiumQuery() {
  const params = new URLSearchParams(window.location.search);
  const flag = params.get("premium");
  if (!flag) return null;
  params.delete("premium");
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
  return flag;
}

function openModePicker() {
  closeStreakConfirm();
  if (!el.modePicker || !el.modePickerList) return;
  el.modePickerList.innerHTML = "";

  let lastGroup = "";
  listModeOptions().forEach((opt) => {
    if (opt.group && opt.group !== lastGroup) {
      lastGroup = opt.group;
      const g = document.createElement("p");
      g.className = "mode-picker-group";
      g.textContent = opt.group;
      el.modePickerList.appendChild(g);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mode-picker-item${opt.value === state.modeKey ? " is-current" : ""}${opt.locked ? " is-locked" : ""}`;
    btn.innerHTML = opt.locked
      ? `${opt.label}<span class="lock">🔒</span>`
      : opt.label;
    btn.addEventListener("click", () => trySwitchMode(opt.value));
    el.modePickerList.appendChild(btn);
  });

  el.modePicker.hidden = false;
}

function closeModePicker() {
  if (el.modePicker) el.modePicker.hidden = true;
}

function applyModeSwitch(modeKey) {
  closeModePicker();
  if (!el.mode) return;
  el.mode.value = modeKey;
  state.modeKey = modeKey;
  state.correct = 0;
  state.wrong = 0;
  state.streak = 0;
  state.lastQuestionKey = null;
  el.correct.textContent = "0";
  el.wrong.textContent = "0";
  el.streak.textContent = "0";
  applyModeCopy();
  nextQuestion();
}

/** @returns {boolean} 切り替えできたか */
function trySwitchMode(modeKey) {
  if (!canAccessMode(modeKey)) {
    openPaywall(modeKey);
    if (el.mode) el.mode.value = state.modeKey;
    return false;
  }
  applyModeSwitch(modeKey);
  return true;
}

function selectModeFromPicker(modeKey) {
  trySwitchMode(modeKey);
}

async function initLiff() {
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId || liffId.includes("xxxx")) {
    el.status.textContent = hasApi()
      ? "ローカル開発（LIFF未設定・APIあり）"
      : "ローカル開発モード（LIFF未設定）";
    return;
  }

  try {
    await liff.init({ liffId });
    // ブラウザ／Cursor プレビューではログイン強制しない（音声テストしやすくする）
    if (!liff.isLoggedIn()) {
      if (liff.isInClient()) {
        liff.login();
        return;
      }
      el.status.textContent = "ブラウザ確認モード（LINE外）";
      return;
    }
    const profile = await liff.getProfile();
    el.status.textContent = `LIFF OK · ${profile.displayName}`;
  } catch (err) {
    console.error(err);
    el.status.textContent = "LIFF初期化失敗（ブラウザでも動作可）";
  }
}

let playBusy = false;
async function onPlayGuarded() {
  if (playBusy) return;
  playBusy = true;
  try {
    await onPlay();
  } finally {
    playBusy = false;
  }
}

el.play.addEventListener("click", onPlayGuarded);
el.mode.addEventListener("change", () => {
  const next = el.mode.value;
  if (!trySwitchMode(next)) {
    // ペイウォール表示。select は trySwitchMode 内で戻す
  }
});

el.handednessField?.addEventListener("change", (ev) => {
  const t = /** @type {HTMLInputElement} */ (ev.target);
  if (t.name !== "handedness") return;
  setHandedness(/** @type {"right"|"left"} */ (t.value));
  redrawMemorizePrompt();
});

el.streakYes?.addEventListener("click", () => {
  openModePicker();
});
el.streakNo?.addEventListener("click", () => {
  closeStreakConfirm();
});
el.modePickerCancel?.addEventListener("click", () => {
  closeModePicker();
});

el.paywallCancel?.addEventListener("click", () => {
  closePaywall();
});
el.paywallDev?.addEventListener("click", async () => {
  try {
    await devUnlockOnServer();
    unlockPremiumAndEnter();
  } catch (err) {
    console.error(err);
    setFeedback(`開発解放に失敗: ${err?.message || err}`, "ng");
  }
});
el.paywallBuy?.addEventListener("click", async () => {
  if (!hasApi()) {
    setFeedback("API未設定のため開発用解放を使ってください。", "ng");
    return;
  }
  try {
    el.paywallBuy.disabled = true;
    el.paywallBuy.textContent = "Checkout へ…";
    const url = await createCheckoutUrl();
    window.location.href = url;
  } catch (err) {
    console.error(err);
    setFeedback(`決済開始に失敗: ${err?.message || err}`, "ng");
    el.paywallBuy.disabled = false;
    el.paywallBuy.textContent = "解放する";
  }
});

(async () => {
  initModeOptionLabels();
  buildPianoRoll();
  const premiumFlag = consumePremiumQuery();
  await initLiff();
  if (premiumFlag === "success" || premiumFlag === "1") {
    await refreshPremiumFromServer();
    if (getIsPremium()) {
      setFeedback("Premium が有効になりました", "ok");
    } else {
      setFeedback("決済は完了しています。反映まで数秒かかることがあります。", "ok");
      // Webhook 遅延向けに再同期
      setTimeout(() => {
        refreshPremiumFromServer().catch(() => {});
      }, 2000);
    }
  } else {
    await refreshPremiumFromServer();
  }
  if (premiumFlag === "cancel") {
    setFeedback("決済をキャンセルしました", "ng");
  }
  applyModeCopy();
  refreshModeSelectLocks();
  nextQuestion();
})();
