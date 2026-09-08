/**
 * ローカル開発用 API（D1 互換の簡易メモリ DB）
 * 使い方: cd backend && npm run dev
 * フロント: VITE_API_BASE=http://127.0.0.1:8787
 */
import { createServer } from "node:http";
import { handleRequest } from "../src/app.js";

const PORT = Number(process.env.PORT || 8787);

/** @type {Map<string, { user_id: string, premium: number, stripe_session_id: string | null, updated_at: string }>} */
const users = new Map();

function createMemoryDb() {
  return {
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      return {
        bind(...args) {
          const bound = args;
          return {
            async first() {
              if (normalized.startsWith("SELECT user_id, premium, updated_at")) {
                const userId = bound[0];
                const row = users.get(userId);
                return row
                  ? {
                      user_id: row.user_id,
                      premium: row.premium,
                      updated_at: row.updated_at,
                    }
                  : null;
              }
              return null;
            },
            async run() {
              if (normalized.startsWith("INSERT INTO users (user_id, premium, stripe_session_id")) {
                const [userId, premium, sessionId, updatedAt] = bound;
                const prev = users.get(userId);
                users.set(userId, {
                  user_id: userId,
                  premium: Number(premium),
                  stripe_session_id:
                    sessionId ?? prev?.stripe_session_id ?? null,
                  updated_at: updatedAt,
                });
                return { success: true };
              }
              if (normalized.startsWith("INSERT INTO users (user_id, premium, updated_at)")) {
                const [userId, updatedAt] = bound;
                if (!users.has(userId)) {
                  users.set(userId, {
                    user_id: userId,
                    premium: 0,
                    stripe_session_id: null,
                    updated_at: updatedAt,
                  });
                }
                return { success: true };
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
}

const env = {
  DB: createMemoryDb(),
  LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || "",
  STRIPE_UNIT_AMOUNT: process.env.STRIPE_UNIT_AMOUNT || "980",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  SUCCESS_URL:
    process.env.SUCCESS_URL || "http://localhost:5173/?premium=success",
  CANCEL_URL:
    process.env.CANCEL_URL || "http://localhost:5173/?premium=cancel",
  PRODUCT_NAME: process.env.PRODUCT_NAME || "ギターコードクイズ Premium",
  ALLOW_ANON: process.env.ALLOW_ANON || "1",
  DEV_UNLOCK_SECRET: process.env.DEV_UNLOCK_SECRET || "dev-unlock",
};

createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const bodyBuf = Buffer.concat(chunks);
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method || "GET")
        ? undefined
        : bodyBuf,
    });
    const response = await handleRequest(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[gcq-api] http://127.0.0.1:${PORT}`);
  console.log(`  ALLOW_ANON=${env.ALLOW_ANON} DEV_UNLOCK_SECRET=${env.DEV_UNLOCK_SECRET ? "(set)" : "(off)"}`);
  console.log(`  LINE_CHANNEL_ID=${env.LINE_CHANNEL_ID ? "set" : "missing"}`);
  console.log(`  STRIPE_SECRET_KEY=${env.STRIPE_SECRET_KEY ? "set" : "missing"}`);
});
