PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS live_trades (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  instrument TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('LONG','SHORT')),
  quantity REAL NOT NULL DEFAULT 0,
  leverage REAL NOT NULL DEFAULT 1,
  entry_price REAL NOT NULL,
  current_price REAL NOT NULL,
  stop_price REAL,
  target_price REAL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PAUSED','CLOSED')),
  note TEXT,
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS live_trade_candles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id TEXT NOT NULL REFERENCES live_trades(id) ON DELETE CASCADE,
  ts INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL DEFAULT 0,
  UNIQUE(trade_id,ts)
);

CREATE INDEX IF NOT EXISTS idx_live_trades_user_status ON live_trades(user_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_live_trade_candles_trade_ts ON live_trade_candles(trade_id,ts);
