/** フリーミアム：無料モードと Premium 状態（サーバー同期 + localStorage キャッシュ） */

const PREMIUM_KEY = "gcq-premium";
const ANON_KEY = "gcq-anon-id";

/** 無料で使えるモード */
export const FREE_MODE_KEYS = new Set([
  "practice-staff",
  "memorize-solfege",
  "memorize-staff",
  "open-strings",
  "practice-open-strings",
]);

/**
 * @param {string} modeKey
 */
export function isModeFree(modeKey) {
  return FREE_MODE_KEYS.has(modeKey);
}

/**
 * @param {string} modeKey
 */
export function isModePremiumOnly(modeKey) {
  return !isModeFree(modeKey);
}

export function getIsPremium() {
  try {
    return localStorage.getItem(PREMIUM_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} value
 */
export function setIsPremium(value) {
  try {
    localStorage.setItem(PREMIUM_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * 有料モードに入れるか
 * @param {string} modeKey
 */
export function canAccessMode(modeKey) {
  return isModeFree(modeKey) || getIsPremium();
}

export const PREMIUM_PRODUCT = {
  name: "ギターコードクイズ Premium",
  priceLabel: "¥980（買い切り）",
  blurb:
    "ダイアグラム／TAB／ダイアトニック／カノンなど、学習モードをすべて解放します。",
};

/** @returns {string} */
export function getApiBase() {
  const base = import.meta.env.VITE_API_BASE || "";
  return String(base).replace(/\/$/, "");
}

/** nginx 等で rewrite が無いとき `.php`（例: VITE_API_SUFFIX=.php） */
export function getApiSuffix() {
  const s = import.meta.env.VITE_API_SUFFIX;
  if (s == null || s === "") return "";
  return String(s);
}

/**
 * @param {string} path 例: /api/me
 */
export function apiUrl(path) {
  const base = getApiBase();
  const suffix = getApiSuffix();
  const p = path.startsWith("/") ? path : `/${path}`;
  // /api/me + .php → /api/me.php 、 /health + .php → /health.php
  if (suffix && p !== "/") {
    return `${base}${p}${suffix}`;
  }
  return `${base}${p}`;
}

export function hasApi() {
  return Boolean(getApiBase());
}

/** ブラウザ用匿名 ID（LIFF 外・ALLOW_ANON 時） */
export function getOrCreateAnonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (id && id.startsWith("anon:")) return id;
    const rand =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : String(Date.now());
    id = `anon:${rand.slice(0, 24)}`;
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return `anon:${Date.now()}`;
  }
}

/**
 * @returns {Promise<string | null>}
 */
export async function getLineIdToken() {
  try {
    const { default: liff } = await import("@line/liff");
    if (!liff.isLoggedIn?.()) return null;
    return liff.getIDToken?.() || null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{ idToken?: string, anonId?: string }>}
 */
export async function identityPayload() {
  const idToken = await getLineIdToken();
  if (idToken) return { idToken };
  return { anonId: getOrCreateAnonId() };
}

/**
 * サーバーから premium を同期（API 未設定時はキャッシュのまま）
 * @returns {Promise<{ premium: boolean, userId?: string, via?: string } | null>}
 */
export async function syncPremiumFromServer() {
  const base = getApiBase();
  if (!base) return null;
  const body = await identityPayload();
  const res = await fetch(apiUrl("/api/me"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || ` /api/me ${res.status}`);
  }
  setIsPremium(Boolean(data.premium));
  return data;
}

/** LINE LIFF ログイン済みか（課金に必須） */
export async function isLiffLoggedIn() {
  return Boolean(await getLineIdToken());
}

/**
 * Stripe Checkout へリダイレクト用 URL を取得（LINE ID トークン必須）
 * @returns {Promise<string>}
 */
export async function createCheckoutUrl() {
  const base = getApiBase();
  if (!base) throw new Error("VITE_API_BASE が未設定です");
  const idToken = await getLineIdToken();
  if (!idToken) {
    throw new Error("購入は LINE アプリ内から開いてください");
  }
  const res = await fetch(apiUrl("/api/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || `checkout ${res.status}`);
  }
  return data.url;
}

/**
 * 開発用解放（サーバー側。DEV_UNLOCK_SECRET が必要）
 * @param {string} [secret]
 */
export async function devUnlockOnServer(secret = "dev-unlock") {
  const base = getApiBase();
  if (!base) {
    setIsPremium(true);
    return { premium: true, local: true };
  }
  const body = { ...(await identityPayload()), secret };
  const res = await fetch(apiUrl("/api/dev-unlock"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 本番で endpoint が無いときはローカルのみ解放
    if (res.status === 404) {
      setIsPremium(true);
      return { premium: true, local: true };
    }
    throw new Error(data.error || `dev-unlock ${res.status}`);
  }
  setIsPremium(true);
  return data;
}
