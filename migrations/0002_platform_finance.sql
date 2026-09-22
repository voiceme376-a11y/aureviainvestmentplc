PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT, middle_name TEXT, last_name TEXT,
  phone TEXT, date_of_birth TEXT, country TEXT DEFAULT 'NG',
  state TEXT, city TEXT, address_line1 TEXT, address_line2 TEXT,
  postal_code TEXT, occupation TEXT, timezone TEXT DEFAULT 'Africa/Lagos',
  avatar_url TEXT, identity_status TEXT NOT NULL DEFAULT 'pending',
  address_status TEXT NOT NULL DEFAULT 'pending',
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'NGN',
  balance_kobo INTEGER NOT NULL DEFAULT 0,
  locked_kobo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,currency)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','upgrade','refund','adjustment')),
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT UNIQUE,
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES payment_transactions(id),
  direction TEXT NOT NULL CHECK(direction IN ('credit','debit')),
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  balance_after_kobo INTEGER NOT NULL,
  external_reference TEXT UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  recipient_code TEXT UNIQUE,
  bank_code TEXT NOT NULL,
  bank_name TEXT,
  account_number_masked TEXT,
  account_name TEXT,
  currency TEXT NOT NULL DEFAULT 'NGN',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id),
  transaction_id TEXT NOT NULL REFERENCES payment_transactions(id),
  amount_kobo INTEGER NOT NULL,
  fee_kobo INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  provider_reference TEXT,
  provider_transfer_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(identity_status,address_status);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_transactions(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status,created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status,created_at);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,created_at);
