import liff from "@line/liff";

/** @typedef {{ id: string, label: string, src: string, waveY?: number, waveCaption?: string, staffCaption?: string, staffNoteX?: number, staffNoteY?: number }} QuizItem */
/** @typedef {{ name: string, subtitle: string, items: QuizItem[] }} QuizMode */

const WAVE_HOLD_MS = 3600;
const ANSWER_HOLD_MS = 1100;
const STAFF_CROP_Y = 740;
const STAFF_CROP_H = 252;

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
      { id: "C", label: "C", src: asset("audio/C.mp3") },
      { id: "G", label: "G", src: asset("audio/G.mp3") },
      { id: "Am", label: "Am", src: asset("audio/Am.mp3") },
      { id: "Em", label: "Em", src: asset("audio/Em.mp3") },
      { id: "F", label: "F", src: asset("audio/F.mp3") },
    ],
  },
  "diatonic-c": {
    name: "ダイアトニック（C）",
    subtitle: "キーCの三和音を聞いて、コードを選んでください",
    items: [
      { id: "C", label: "C", src: asset("audio/C.mp3") },
      { id: "Dm", label: "Dm", src: asset("audio/Dm.mp3") },
      { id: "Em", label: "Em", src: asset("audio/Em.mp3") },
      { id: "F", label: "F", src: asset("audio/F.mp3") },
      { id: "G", label: "G", src: asset("audio/G.mp3") },
      { id: "Am", label: "Am", src: asset("audio/Am.mp3") },
      { id: "Bdim", label: "Bm(♭5)", src: asset("audio/Bdim.mp3") },
    ],
  },
  "canon-d": {
    name: "カノン進行（D）",
    subtitle: "音を聞いて、コードを選んでください",
    items: [
      { id: "D", label: "D", src: asset("audio/D.mp3") },
      { id: "A", label: "A", src: asset("audio/A.mp3") },
      { id: "Bm", label: "Bm", src: asset("audio/Bm.mp3") },
      { id: "F#m", label: "F#m", src: asset("audio/Fshm.mp3") },
      { id: "G", label: "G", src: asset("audio/G.mp3") },
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
  audioCtx: /** @type {AudioContext | null} */ (null),
  bufferCache: /** @type {Map<string, AudioBuffer>} */ (new Map()),
  sourceNode: /** @type {AudioBufferSourceNode | null} */ (null),
  locked: false,
  correct: 0,
  wrong: 0,
  streak: 0,
};

const player = /** @type {HTMLAudioElement | null} */ (
  document.getElementById("player")
);


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
  // ダイアトニック7つなど、少数プールは全選択肢を出す
  if (pool.length <= 7) return shuffle(pool);
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

async function playWithWebAudio(url) {
  const ctx = await ensureAudioCtx();
  if (!ctx) throw new Error("AudioContext 非対応");
  const buf = await loadBuffer(url);
  if (!buf) throw new Error("デコード失敗");
  stopAudio();
  const src = ctx.createBufferSource();
  src.buffer = buf;
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

async function playAnswer() {
  if (!state.answer) return;
  const url = state.answer.src;
  try {
    // LINE WebView では Web Audio の方が安定しやすい
    await playWithWebAudio(url);
    el.hint.textContent = "もう一度聴くこともできます";
    setFeedback("", "");
  } catch (webErr) {
    console.warn("WebAudio failed, fallback to HTMLAudio", webErr);
    try {
      await playWithHtmlAudio(url);
      el.hint.textContent = "もう一度聴くこともできます";
      setFeedback("", "");
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
  // 裏でデコードを先行（失敗しても再生時に再試行）
  if (state.answer) {
    loadBuffer(state.answer.src).catch(() => {});
  }

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
  // タップ直後に AudioContext を起こす（iOS / LINE WebView 対策）
  try {
    await ensureAudioCtx();
  } catch (err) {
    console.warn(err);
  }
  await playAnswer();
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
