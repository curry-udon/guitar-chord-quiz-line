-- コスタバ MySQL 用（phpMyAdmin で実行）
CREATE TABLE IF NOT EXISTS gcq_users (
  user_id VARCHAR(128) NOT NULL PRIMARY KEY,
  premium TINYINT(1) NOT NULL DEFAULT 0,
  stripe_session_id VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_gcq_users_premium (premium)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
