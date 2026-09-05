import liff from "@line/liff";

/** @typedef {{ id: string, label: string, src: string, waveY?: number, waveCaption?: string, staffCaption?: string, staffNoteX?: number, staffNoteY?: number }} QuizItem */
/** @typedef {{ name: string, subtitle: string, items: QuizItem[] }} QuizMode */

const WAVE_HOLD_MS = 3600;
const ANSWER_HOLD_MS = 1100;
const STAFF_CROP_Y = 740;
const STAFF_CROP_H = 252;

const MODES = /** @type {Record<string, QuizMode>} */ ({
  "open-strings": {
    name: "初級：開放弦",
    subtitle: "開放弦の音を聞いて、音名を選んでください",
    items: [
      {
        id: "E2",
        label: "E",
        src: "/audio/open_E2.mp3",
        waveY: 620,
        waveCaption: "6弦 E2 · 82.41 Hz",
        staffCaption: "大譜表：ヘ音記号の下・加線（下第1線）の上",
        staffNoteX: 255,
        staffNoteY: 954,
      },
      {
        id: "A2",
        label: "A",
        src: "/audio/open_A2.mp3",
        waveY: 516,
        waveCaption: "5弦 A2 · 110.00 Hz",
        staffCaption: "大譜表：ヘ音記号の第1間（一番下の線のすぐ上）",
        staffNoteX: 377,
        staffNoteY: 936,
      },
      {
        id: "D3",
        label: "D",
        src: "/audio/open_D3.mp3",
        waveY: 412,
        waveCaption: "4弦 D3 · 146.83 Hz",
        staffCaption: "大譜表：ヘ音記号の第3線（真ん中の線）",
        staffNoteX: 499,
        staffNoteY: 918,
      },
      {
        id: "G3",
        label: "G",
        src: "/audio/open_G3.mp3",
        waveY: 308,
        waveCaption: "3弦 G3 · 196.00 Hz",
        staffCaption: "大譜表：ヘ音記号の第4間（一番上の間）",
        staffNoteX: 621,
        staffNoteY: 900,
      },
      {
        id: "B3",
        label: "B",
        src: "/audio/open_B3.mp3",
        waveY: 204,
        waveCaption: "2弦 B3 · 246.94 Hz",
        staffCaption: "大譜表：ヘ音記号の上・中央ド(C4)のすぐ下",
        staffNoteX: 743,
        staffNoteY: 888,
      },
      {
        id: "E4",
        label: "e",
        src: "/audio/open_E4.mp3",
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
      { id: "C", label: "C", src: "/audio/C.mp3" },
      { id: "G", label: "G", src: "/audio/G.mp3" },
      { id: "Am", label: "Am", src: "/audio/Am.mp3" },
      { id: "Em", label: "Em", src: "/audio/Em.mp3" },
      { id: "F", label: "F", src: "/audio/F.mp3" },
    ],
  },
  "canon-d": {
    name: "カノン進行（D）",
    subtitle: "音を聞いて、コードを選んでください",
    items: [
      { id: "D", label: "D", src: "/audio/D.mp3" },
      { id: "A", label: "A", src: "/audio/A.mp3" },
      { id: "Bm", label: "Bm", src: "/audio/Bm.mp3" },
      { id: "F#m", label: "F#m", src: "/audio/Fshm.mp3" },
      { id: "G", label: "G", src: "/audio/G.mp3" },
    ],
  },
});

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
};

const state = {
  modeKey: "open-strings",
  answer: /** @type {QuizItem | null} */ (null),
  audio: /** @type {HTMLAudioElement | null} */ (null),
  locked: false,
  correct: 0,
  wrong: 0,
  streak: 0,
};

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
  if (state.modeKey === "open-strings") return [...pool];
  if (pool.length <= 6) return shuffle(pool);
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
  if (
    !el.wavePanel ||
    !el.waveCrop ||
    answer.waveY == null ||
    state.modeKey !== "open-strings"
  ) {
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
  if (state.audio) {
    state.audio.pause();
    state.audio.currentTime = 0;
  }
}

function applyModeCopy() {
  const mode = MODES[state.modeKey];
  if (el.subtitle) el.subtitle.textContent = mode.subtitle;
}

function nextQuestion() {
  const pool = MODES[state.modeKey].items;
  state.answer = pool[Math.floor(Math.random() * pool.length)];
  state.locked = false;
  stopAudio();
  hideWave();
  state.audio = new Audio(state.answer.src);
  state.audio.preload = "auto";

  setFeedback("", "");
  el.hint.textContent = "再生してから選択肢をタップ";
  el.play.disabled = false;

  const options = pickChoices(pool, state.answer);
  el.choices.innerHTML = "";
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
  if (!state.answer) return;
  try {
    stopAudio();
    state.audio = new Audio(state.answer.src);
    await state.audio.play();
    el.hint.textContent = "もう一度聴くこともできます";
  } catch (err) {
    setFeedback("再生できませんでした（端末の音量も確認）", "ng");
    console.error(err);
  }
}

function onChoose(item, btn) {
  if (state.locked || !state.answer) return;
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

  showWave(state.answer);
  const hold =
    state.modeKey === "open-strings" ? WAVE_HOLD_MS : ANSWER_HOLD_MS;
  window.setTimeout(() => nextQuestion(), hold);
}

async function initLiff() {
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId || liffId.includes("xxxx")) {
    el.status.textContent = "ローカル開発モード（LIFF未設定）";
    return;
  }

  try {
    await liff.init({ liffId });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    el.status.textContent = `LIFF OK · ${profile.displayName}`;
  } catch (err) {
    console.error(err);
    el.status.textContent = "LIFF初期化失敗（ブラウザでも動作可）";
  }
}

el.play.addEventListener("click", onPlay);
el.mode.addEventListener("change", () => {
  state.modeKey = el.mode.value;
  state.correct = 0;
  state.wrong = 0;
  state.streak = 0;
  el.correct.textContent = "0";
  el.wrong.textContent = "0";
  el.streak.textContent = "0";
  applyModeCopy();
  nextQuestion();
});

(async () => {
  await initLiff();
  applyModeCopy();
  nextQuestion();
})();
