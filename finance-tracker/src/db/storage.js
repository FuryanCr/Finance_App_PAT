import { categories as builtInCategories } from './mockData'
import { getDb, persist } from './database'
import { customColorAt, customColors } from '../lib/categories'
import { isValidDate } from '../lib/dates'

// The only place that knows how data is saved: SQLite, through database.js.
// Amounts are stored as whole cents and converted here, so the rest of the
// app only sees normal numbers.

function toTransaction(row) {
  return {
    id: row.id,
    amount: row.amount_cents / 100,
    currency: row.currency,
    type: row.type,
    categoryId: row.category_id,
    note: row.note,
    date: row.date,
  }
}

function toBudget(row) {
  return {
    categoryId: row.category_id,
    currency: row.currency,
    amount: row.amount_cents / 100,
  }
}

// Built-in rows have a key, custom rows have a name
function toCategory(row) {
  if (row.key !== null) return { id: row.id, key: row.key, color: row.color }
  return { id: row.id, name: row.name, color: row.color }
}

const INSERT_TRANSACTION = `INSERT INTO transactions
  (amount_cents, currency, type, category_id, note, date)
  VALUES (?, ?, ?, ?, ?, ?)`

function transactionParams(tx) {
  return [
    Math.round(tx.amount * 100),
    tx.currency,
    tx.type,
    tx.categoryId,
    tx.note ?? '',
    tx.date,
  ]
}

// Runs the work in one transaction: all of it is saved or none of it.
// The work must pass false as the transaction argument to run/execute.
async function inTransaction(db, work) {
  await db.beginTransaction()
  try {
    const result = await work()
    await db.commitTransaction()
    return result
  } catch (error) {
    if ((await db.isTransactionActive()).result) {
      await db.rollbackTransaction()
    }
    throw error
  }
}

// --- Legacy import ---------------------------------------------------------
// Older versions saved everything in localStorage. That data is copied into
// the database once; the old copy is never changed, it stays as a backup.
const LEGACY_KEY = 'finance-data'
const IMPORTED_FLAG = 'finance-data-imported'

function isValidTransaction(tx) {
  return (
    Number.isInteger(tx?.id) &&
    typeof tx.amount === 'number' &&
    Math.round(tx.amount * 100) > 0 &&
    (tx.type === 'income' || tx.type === 'expense') &&
    (tx.currency === 'CRC' || tx.currency === 'USD') &&
    isValidDate(tx.date)
  )
}

function isValidCustomCategory(c) {
  return (
    Number.isInteger(c?.id) &&
    typeof c.name === 'string' &&
    c.name.trim() !== '' &&
    !builtInCategories.some((builtIn) => builtIn.id === c.id)
  )
}

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_KEY)) ?? {}
  } catch {
    return {}
  }
}

// Keeps the first item of each id: a repeated id would make the import fail
function uniqueById(items) {
  const seen = new Set()
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id))
}

// Missing or corrupted data reads as nothing to import
function readLegacy() {
  const saved = readSaved()
  const transactions = uniqueById(
    Array.isArray(saved.transactions)
      ? saved.transactions.filter(isValidTransaction)
      : [],
  )
  // a custom category saved without a valid color gets one by its position
  const categories = uniqueById(
    Array.isArray(saved.categories)
      ? saved.categories.filter(isValidCustomCategory)
      : [],
  ).map((c, index) =>
    customColors.includes(c.color) ? c : { ...c, color: customColorAt(index) },
  )
  return { transactions, categories }
}

function isImported() {
  try {
    return localStorage.getItem(IMPORTED_FLAG) === '1'
  } catch {
    return false
  }
}

function markImported() {
  try {
    localStorage.setItem(IMPORTED_FLAG, '1')
  } catch {
    // blocked: the database check stops a second import anyway
  }
}

async function importLegacyData(db) {
  if (isImported()) return

  const legacy = readLegacy()
  if (legacy.transactions.length === 0 && legacy.categories.length === 0) {
    markImported()
    return
  }

  const counts = (
    await db.query(
      `SELECT
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM categories WHERE key IS NULL) AS custom`,
    )
  ).values[0]
  if (counts.transactions > 0 || counts.custom > 0) {
    markImported()
    return
  }

  const knownIds = new Set([
    ...builtInCategories.map((c) => c.id),
    ...legacy.categories.map((c) => c.id),
  ])
  await inTransaction(db, async () => {
    for (const { id, name, color } of legacy.categories) {
      await db.run(
        'INSERT INTO categories (id, name, color) VALUES (?, ?, ?)',
        [id, name, color],
        false,
      )
    }
    for (const tx of legacy.transactions) {
      const categoryId = knownIds.has(tx.categoryId) ? tx.categoryId : null
      await db.run(
        `INSERT INTO transactions
          (id, amount_cents, currency, type, category_id, note, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, ...transactionParams({ ...tx, categoryId })],
        false,
      )
    }
  })
  await persist()
  markImported()
}

// loadAll can be called twice at once (React StrictMode runs effects twice):
// both calls share one import, or the second would start a transaction
// inside the first one's
let importPromise = null

function importLegacyDataOnce(db) {
  if (!importPromise) {
    importPromise = importLegacyData(db).catch((error) => {
      importPromise = null
      throw error
    })
  }
  return importPromise
}
// --- End of legacy import --------------------------------------------------

export async function loadAll() {
  const db = await getDb()
  await importLegacyDataOnce(db)

  const categories = await db.query('SELECT * FROM categories ORDER BY id')
  const transactions = await db.query('SELECT * FROM transactions ORDER BY id')
  const budgets = await db.query(
    'SELECT * FROM budgets ORDER BY category_id, currency',
  )
  return {
    transactions: transactions.values.map(toTransaction),
    categories: categories.values.map(toCategory),
    budgets: budgets.values.map(toBudget),
  }
}

export async function insertTransaction(tx) {
  const db = await getDb()
  const result = await db.run(INSERT_TRANSACTION, transactionParams(tx))
  await persist()
  return { ...tx, note: tx.note ?? '', id: result.changes.lastId }
}

export async function insertTransactions(list) {
  const db = await getDb()
  const saved = await inTransaction(db, async () => {
    const items = []
    for (const tx of list) {
      const result = await db.run(
        INSERT_TRANSACTION,
        transactionParams(tx),
        false,
      )
      items.push({ ...tx, note: tx.note ?? '', id: result.changes.lastId })
    }
    return items
  })
  await persist()
  return saved
}

export async function updateTransaction(id, tx) {
  const db = await getDb()
  await db.run(
    `UPDATE transactions SET
      amount_cents = ?, currency = ?, type = ?, category_id = ?, note = ?,
      date = ?
      WHERE id = ?`,
    [...transactionParams(tx), id],
  )
  await persist()
  return { ...tx, id }
}

export async function deleteTransaction(id) {
  const db = await getDb()
  await db.run('DELETE FROM transactions WHERE id = ?', [id])
  await persist()
}

export async function insertCategory({ name, color }) {
  const db = await getDb()
  const result = await db.run(
    'INSERT INTO categories (name, color) VALUES (?, ?)',
    [name, color],
  )
  await persist()
  return { id: result.changes.lastId, name, color }
}

export async function updateCategory(id, { name, color }) {
  const db = await getDb()
  await db.run(
    'UPDATE categories SET name = ?, color = ? WHERE id = ? AND key IS NULL',
    [name, color, id],
  )
  await persist()
  return { id, name, color }
}

// Its transactions move to another category first, in the same transaction
export async function deleteCategory(id, moveToId) {
  const db = await getDb()
  await inTransaction(db, async () => {
    await db.run(
      'UPDATE transactions SET category_id = ? WHERE category_id = ?',
      [moveToId, id],
      false,
    )
    await db.run(
      'DELETE FROM categories WHERE id = ? AND key IS NULL',
      [id],
      false,
    )
  })
  await persist()
}

export async function clearAll() {
  const db = await getDb()
  await inTransaction(db, async () => {
    await db.run('DELETE FROM budgets', [], false)
    await db.run('DELETE FROM transactions', [], false)
    await db.run('DELETE FROM categories WHERE key IS NULL', [], false)
  })
  await persist()
}

// An amount of 0 (or none) removes the budget; returns the saved budget or null
export async function setBudget(categoryId, currency, amount) {
  const db = await getDb()
  if (amount > 0) {
    await db.run(
      `INSERT INTO budgets (category_id, currency, amount_cents)
        VALUES (?, ?, ?)
        ON CONFLICT (category_id, currency)
        DO UPDATE SET amount_cents = excluded.amount_cents`,
      [categoryId, currency, Math.round(amount * 100)],
    )
    await persist()
    return { categoryId, currency, amount }
  }
  await db.run('DELETE FROM budgets WHERE category_id = ? AND currency = ?', [
    categoryId,
    currency,
  ])
  await persist()
  return null
}
