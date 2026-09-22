PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS live_trade_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id TEXT NOT NULL REFERENCES live_trades(id) ON DELETE CASCADE,
  admin_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  current_price REAL,
  status TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_live_trade_updates_trade_time
  ON live_trade_updates(trade_id, created_at DESC);
