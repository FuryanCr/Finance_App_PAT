import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { defineCustomElements } from 'jeep-sqlite/loader'
import { categories as builtInCategories } from './mockData'

const DB_NAME = 'quincena'

const isWeb = () => Capacitor.getPlatform() === 'web'
const sqlite = new SQLiteConnection(CapacitorSQLite)

// One entry per schema version, in order. Never edit a migration that has
// shipped; add a new one.
const migrations = [
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
]

async function runMigrations(db) {
  const result = await db.query('PRAGMA user_version')
  const current = result.values?.[0]?.user_version ?? 0

  for (let i = current; i < migrations.length; i++) {
    await db.beginTransaction()
    try {
      await migrations[i](db)
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

async function openConnection() {
  if (isWeb()) {
    defineCustomElements(window)
    if (!document.querySelector('jeep-sqlite')) {
      document.body.appendChild(document.createElement('jeep-sqlite'))
    }
    await customElements.whenDefined('jeep-sqlite')
    await sqlite.initWebStore()
  }

  // A connection can outlive this module (e.g. Vite hot reload)
  const consistent = (await sqlite.checkConnectionsConsistency()).result
  const exists = (await sqlite.isConnection(DB_NAME, false)).result
  const db =
    consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)

  await db.open()
  await db.execute('PRAGMA foreign_keys = ON', false)
  await runMigrations(db)
  // ask the browser not to evict the data; the answer does not matter here
  if (isWeb()) navigator.storage?.persist?.()?.catch(() => {})
  return db
}

let dbPromise = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openConnection()
      .then(async (db) => {
        await persist()
        return db
      })
      .catch((error) => {
        dbPromise = null
        throw error
      })
  }
  return dbPromise
}

// On web the database lives in memory; save it to IndexedDB
export async function persist() {
  if (isWeb()) await sqlite.saveToStore(DB_NAME)
}
