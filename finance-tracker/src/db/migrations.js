import { categories as builtInCategories } from './mockData'

// One entry per schema version, in order. Never edit a migration that has
// shipped; add a new one.
export const migrations = [
  async (db) => {
    await db.execute(
      `CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE,
        name TEXT,
        color TEXT NOT NULL,
        CHECK ((key IS NULL) <> (name IS NULL))
      );

      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        currency TEXT NOT NULL CHECK (currency IN ('CRC', 'USD')),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category_id INTEGER REFERENCES categories (id),
        note TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL
      );

      CREATE INDEX idx_transactions_date ON transactions (date);`,
      false,
    )
    // seeds from mockData.js: see the note above `categories` there
    for (const { id, key, color } of builtInCategories) {
      await db.run(
        'INSERT INTO categories (id, key, color) VALUES (?, ?, ?)',
        [id, key, color],
        false,
      )
    }
  },
  async (db) => {
    await db.execute(
      `CREATE TABLE budgets (
        category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
        currency TEXT NOT NULL CHECK (currency IN ('CRC', 'USD')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        PRIMARY KEY (category_id, currency)
      );`,
      false,
    )
  },
  async (db) => {
    await db.execute(
      `CREATE TABLE recurring (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        currency TEXT NOT NULL CHECK (currency IN ('CRC', 'USD')),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
        note TEXT NOT NULL DEFAULT '',
        schedule TEXT NOT NULL CHECK (schedule IN ('every', 'first', 'second')),
        last_period TEXT
      );`,
      false,
    )
  },
  async (db) => {
    await db.execute(
      `CREATE TABLE savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        currency TEXT NOT NULL CHECK (currency IN ('CRC', 'USD')),
        direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
        note TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL
      );`,
      false,
    )
  },
  // v5: how a transaction was paid. Rows saved before this version do not say,
  // so they read as cash, the default (the person can change them one by one).
  async (db) => {
    await db.execute(
      `ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL
        DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'sinpe'));`,
      false,
    )
  },
  // v6: when the quincena starts. One row per change, with the date it takes
  // effect, so changing it later never moves the quincenas already lived.
  // Everyone who already has the app starts in 15/30 (days 1 and 16).
  async (db) => {
    await db.execute(
      `CREATE TABLE quincena_config (
        effective_from TEXT PRIMARY KEY,
        mode TEXT NOT NULL CHECK (mode IN ('fixed', 'paydays')),
        day1 INTEGER NOT NULL CHECK (day1 BETWEEN 1 AND 31),
        day2 INTEGER CHECK (day2 IS NULL OR day2 BETWEEN 1 AND 31)
      );`,
      false,
    )
    await db.run(
      `INSERT INTO quincena_config (effective_from, mode, day1, day2)
        VALUES ('2000-01-01', 'fixed', 1, 16)`,
      [],
      false,
    )
  },
  // v7: who the person is and whether the welcome steps were done. One row
  // (id 1). Anyone who already has data in the app starts as done, so they
  // never see the first-use screen; only a really new install does.
  async (db) => {
    await db.execute(
      `CREATE TABLE profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT '',
        income_cents INTEGER CHECK (income_cents IS NULL OR income_cents > 0),
        currency TEXT NOT NULL DEFAULT 'CRC' CHECK (currency IN ('CRC', 'USD')),
        savings_goal_cents INTEGER
          CHECK (savings_goal_cents IS NULL OR savings_goal_cents > 0),
        onboarded_at TEXT
      );`,
      false,
    )
    await db.run(
      `INSERT INTO profile (id, onboarded_at) VALUES (1,
        CASE WHEN
          EXISTS (SELECT 1 FROM transactions)
          OR EXISTS (SELECT 1 FROM recurring)
          OR EXISTS (SELECT 1 FROM savings)
          OR EXISTS (SELECT 1 FROM budgets)
          OR EXISTS (SELECT 1 FROM categories WHERE key IS NULL)
          OR EXISTS (
            SELECT 1 FROM quincena_config
            WHERE NOT (effective_from = '2000-01-01' AND mode = 'fixed'
              AND day1 = 1 AND day2 = 16)
          )
        THEN date('now') ELSE NULL END)`,
      [],
      false,
    )
  },
]

export async function runMigrations(db, list = migrations) {
  const result = await db.query('PRAGMA user_version')
  const current = result.values?.[0]?.user_version ?? 0

  for (let i = current; i < list.length; i++) {
    await db.beginTransaction()
    try {
      await list[i](db)
      await db.execute(`PRAGMA user_version = ${i + 1}`, false)
      await db.commitTransaction()
    } catch (error) {
      if ((await db.isTransactionActive()).result) {
        await db.rollbackTransaction()
      }
      throw error
    }
  }
}
