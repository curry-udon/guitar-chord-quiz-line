-- users: LINE userId または anon:<uuid>
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  premium INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_premium ON users (premium);
