/**
 * LINE ID token 検証
 * @param {string} idToken
 * @param {string} channelId LINE Login / LIFF のチャネル ID
 * @returns {Promise<{ userId: string, name?: string }>}
 */
export async function verifyLineIdToken(idToken, channelId) {
  if (!idToken || !channelId) {
    throw new Error("idToken / channelId がありません");
  }
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.error || res.statusText;
    throw new Error(`LINE token 検証失敗: ${msg}`);
  }
  if (!data.sub) throw new Error("LINE token に sub がありません");
  return { userId: String(data.sub), name: data.name };
}
