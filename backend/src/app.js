import { verifyLineIdToken } from "./line.js";
import { createCheckoutSession, verifyStripeWebhook } from "./stripe.js";

/**
 * @typedef {{
 *   DB: { prepare: (sql: string) => any },
 *   LINE_CHANNEL_ID?: string,
 *   STRIPE_SECRET_KEY?: string,
 *   STRIPE_WEBHOOK_SECRET?: string,
 *   STRIPE_PRICE_ID?: string,
 *   STRIPE_UNIT_AMOUNT?: string,
 *   FRONTEND_ORIGIN?: string,
 *   SUCCESS_URL?: string,
 *   CANCEL_URL?: string,
 *   PRODUCT_NAME?: string,
 *   ALLOW_ANON?: string,
 *   DEV_UNLOCK_SECRET?: string,
 * }} Env
 */

/**
 * @param {Env} env
 * @param {string} userId
 */
async function getUser(env, userId) {
  return env.DB.prepare(
    "SELECT user_id, premium, updated_at FROM users WHERE user_id = ?",
  )
    .bind(userId)
    .first();
}

/**
 * @param {Env} env
 * @param {string} userId
 * @param {boolean} premium
 * @param {string} [sessionId]
 */
async function upsertPremium(env, userId, premium, sessionId = null) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (user_id, premium, stripe_session_id, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       premium = excluded.premium,
       stripe_session_id = COALESCE(excluded.stripe_session_id, users.stripe_session_id),
       updated_at = excluded.updated_at`,
  )
    .bind(userId, premium ? 1 : 0, sessionId, now)
    .run();
}

/**
 * @param {Env} env
 * @param {string} userId
 */
async function ensureUser(env, userId) {
  const row = await getUser(env, userId);
  if (row) return row;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (user_id, premium, updated_at) VALUES (?, 0, ?)
     ON CONFLICT(user_id) DO NOTHING`,
  )
    .bind(userId, now)
    .run();
  return getUser(env, userId);
}

/**
 * @param {Request} request
 * @param {Env} env
 * @returns {string}
 */
function corsOrigin(request, env) {
  const allowed = (env.FRONTEND_ORIGIN || "*").split(",").map((s) => s.trim());
  const origin = request.headers.get("Origin") || "";
  if (allowed.includes("*")) return origin || "*";
  if (origin && allowed.some((a) => origin === a || origin.startsWith(a))) {
    return origin;
  }
  // ローカル Vite
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return origin;
  }
  return allowed[0] || "*";
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {number} status
 * @param {unknown} body
 */
function json(request, env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": corsOrigin(request, env),
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

/**
 * @param {Env} env
 * @param {{ idToken?: string, anonId?: string }} body
 */
async function resolveUserId(env, body) {
  if (body.idToken) {
    if (!env.LINE_CHANNEL_ID) {
      throw new Error("LINE_CHANNEL_ID が未設定です");
    }
    const verified = await verifyLineIdToken(body.idToken, env.LINE_CHANNEL_ID);
    return { userId: verified.userId, via: "line" };
  }
  if (body.anonId && (env.ALLOW_ANON === "1" || env.ALLOW_ANON === "true")) {
    const id = String(body.anonId).slice(0, 80);
    if (!/^anon:[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error("anonId の形式が不正です");
    }
    return { userId: id, via: "anon" };
  }
  throw new Error("idToken または anonId が必要です");
}

/**
 * @param {Request} request
 * @param {Env} env
 */
export async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin(request, env),
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/health") {
    return json(request, env, 200, { ok: true });
  }

  // Stripe webhook（署名検証・CORS なし）
  if (request.method === "POST" && url.pathname === "/api/webhook") {
    const raw = await request.text();
    try {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
        return new Response("Stripe 未設定", { status: 503 });
      }
      await verifyStripeWebhook(
        raw,
        request.headers.get("Stripe-Signature"),
        env.STRIPE_WEBHOOK_SECRET,
      );
      const event = JSON.parse(raw);
      if (event.type === "checkout.session.completed") {
        const session = event.data?.object || {};
        const userId =
          session.client_reference_id ||
          session.metadata?.userId ||
          null;
        if (userId) {
          await upsertPremium(env, String(userId), true, session.id || null);
        }
      }
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      return new Response(String(err?.message || err), { status: 400 });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/me") {
    try {
      const body = await request.json();
      const { userId, via } = await resolveUserId(env, body);
      const row = await ensureUser(env, userId);
      return json(request, env, 200, {
        userId,
        via,
        premium: Boolean(row?.premium),
        updatedAt: row?.updated_at ?? null,
      });
    } catch (err) {
      return json(request, env, 401, { error: String(err?.message || err) });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/checkout") {
    try {
      if (!env.STRIPE_SECRET_KEY) {
        return json(request, env, 503, { error: "STRIPE_SECRET_KEY 未設定" });
      }
      const body = await request.json();
      const { userId } = await resolveUserId(env, body);
      await ensureUser(env, userId);
      const session = await createCheckoutSession({
        secretKey: env.STRIPE_SECRET_KEY,
        userId,
        successUrl:
          env.SUCCESS_URL ||
          "http://localhost:5173/?premium=success",
        cancelUrl:
          env.CANCEL_URL || "http://localhost:5173/?premium=cancel",
        productName: env.PRODUCT_NAME || "ギターコードクイズ Premium",
        priceId: env.STRIPE_PRICE_ID || undefined,
        unitAmount: env.STRIPE_UNIT_AMOUNT
          ? Number(env.STRIPE_UNIT_AMOUNT)
          : 980,
      });
      return json(request, env, 200, {
        url: session.url,
        sessionId: session.id,
      });
    } catch (err) {
      console.error(err);
      return json(request, env, 400, { error: String(err?.message || err) });
    }
  }

  // ローカル／ステージング用の開発解放（本番では DEV_UNLOCK_SECRET を設定しない）
  if (request.method === "POST" && url.pathname === "/api/dev-unlock") {
    try {
      if (!env.DEV_UNLOCK_SECRET) {
        return json(request, env, 404, { error: "not found" });
      }
      const body = await request.json();
      if (body.secret !== env.DEV_UNLOCK_SECRET) {
        return json(request, env, 403, { error: "forbidden" });
      }
      const { userId } = await resolveUserId(env, body);
      await upsertPremium(env, userId, true, "dev-unlock");
      return json(request, env, 200, { userId, premium: true });
    } catch (err) {
      return json(request, env, 400, { error: String(err?.message || err) });
    }
  }

  return json(request, env, 404, { error: "not found" });
}
