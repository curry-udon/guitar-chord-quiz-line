/**
 * Stripe REST（Workers / Node 共通）
 */

/**
 * @param {string} secretKey
 * @param {string} path
 * @param {Record<string, string>} params
 */
async function stripeForm(secretKey, path, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error ${res.status}`);
  }
  return data;
}

/**
 * @param {{
 *   secretKey: string,
 *   userId: string,
 *   successUrl: string,
 *   cancelUrl: string,
 *   productName: string,
 *   priceId?: string,
 *   unitAmount?: number,
 * }} opts
 */
export async function createCheckoutSession(opts) {
  /** @type {Record<string, string>} */
  const params = {
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.userId,
    "metadata[userId]": opts.userId,
    "payment_intent_data[metadata][userId]": opts.userId,
  };

  if (opts.priceId) {
    params["line_items[0][price]"] = opts.priceId;
    params["line_items[0][quantity]"] = "1";
  } else {
    const amount = String(opts.unitAmount ?? 980);
    params["line_items[0][price_data][currency]"] = "jpy";
    params["line_items[0][price_data][unit_amount]"] = amount;
    params["line_items[0][price_data][product_data][name]"] = opts.productName;
    params["line_items[0][quantity]"] = "1";
  }

  return stripeForm(opts.secretKey, "checkout/sessions", params);
}

/**
 * Stripe Webhook 署名検証（v1）
 * @param {string} payload raw body
 * @param {string | null} header Stripe-Signature
 * @param {string} secret whsec_...
 * @param {number} [toleranceSec]
 */
export async function verifyStripeWebhook(payload, header, secret, toleranceSec = 300) {
  if (!header) throw new Error("Stripe-Signature がありません");
  /** @type {string[]} */
  const v1List = [];
  let t = "";
  for (const part of header.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k === "t") t = v;
    if (k === "v1" && v) v1List.push(v);
  }
  if (!t || v1List.length === 0) throw new Error("不正な Stripe-Signature");

  const signed = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed),
  );
  const expected = [...new Uint8Array(sigBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!v1List.some((v1) => timingSafeEqual(expected, v1))) {
    throw new Error("Stripe 署名不一致");
  }
  const age = Math.floor(Date.now() / 1000) - Number(t);
  if (Number.isFinite(age) && Math.abs(age) > toleranceSec) {
    throw new Error("Stripe 署名の時刻が古すぎます");
  }
}

/**
 * @param {string} a
 * @param {string} b
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
