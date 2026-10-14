import { categories as builtInCategories } from './mockData'
import { getDb, persist } from './database'
import { customColorAt, customColors } from '../lib/categories'
import { isValidDate } from '../lib/dates'
import { normalizePaymentMethod } from '../lib/payment'
import { DEFAULT_SCHEDULE, normalizeSchedule } from '../lib/quincenaSchedule'
import { MAX_CENTS, isValidAmount } from '../lib/money'

// Same bound as the backup ids: above it new ids could repeat
const MAX_ID = 2_147_483_647

// The only place that knows how data is saved: SQLite, through database.js.
// Amounts are stored as whole cents and converted here, so the rest of the
// app only sees normal numbers.

// The database has one connection: operations run one at a time, in the
// order they were called, so two can never overlap inside a transaction
let queue = Promise.resolve()

function enqueue(work) {
  const result = queue.then(work)
  queue = result.catch(() => {})
  return result
}

function toTransaction(row) {
  return {
    id: row.id,
    amount: row.amount_cents / 100,
    currency: row.currency,
    type: row.type,
    categoryId: row.category_id,
    note: row.note,
    date: row.date,
    paymentMethod: normalizePaymentMethod(row.payment_method),
  }
}

function toRecurring(row) {
  return {
    id: row.id,
    amount: row.amount_cents / 100,
    currency: row.currency,
    type: row.type,
    categoryId: row.category_id,
    note: row.note,
    schedule: row.schedule,
    lastPeriod: row.last_period,
  }
}

function toBudget(row) {
  return {
    categoryId: row.category_id,
    currency: row.currency,
    amount: row.amount_cents / 100,
  }
}

function toSavingsMove(row) {
  return {
    id: row.id,
    amount: row.amount_cents / 100,
    currency: row.currency,
    direction: row.direction,
    note: row.note,
    date: row.date,
  }
}

function toScheduleEntry(row) {
  return {
    from: row.effective_from,
    mode: row.mode,
    day1: row.day1,
    day2: row.day2,
  }
}

// Built-in rows have a key, custom rows have a name
function toCategory(row) {
  if (row.key !== null) return { id: row.id, key: row.key, color: row.color }
  return { id: row.id, name: row.name, color: row.color }
}

// Whole cents, or an error: nothing that is not a positive amount within the
// app's cap (no NaN, Infinity or 1e308) ever reaches the database
function toCents(amount) {
  const cents = Math.round(amount * 100)
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  return cents
}

// On web a write is in memory until persist() copies it to IndexedDB. If that
// copy fails the caller is told the save failed, so the write is undone:
// otherwise the row would stay in memory and a retry would save it twice.
async function persistOrUndo(undo) {
  try {
    await persist()
  } catch (error) {
    try {
      await undo()
    } catch (undoError) {
      console.error(undoError)
    }
    throw error
  }
}

const INSERT_TRANSACTION = `INSERT INTO transactions
  (amount_cents, currency, type, category_id, note, date, payment_method)
  VALUES (?, ?, ?, ?, ?, ?, ?)`

function transactionParams(tx) {
  return [
    toCents(tx.amount),
    tx.currency,
    tx.type,
    tx.categoryId,
    tx.note ?? '',
    tx.date,
    normalizePaymentMethod(tx.paymentMethod),
  ]
}

const INSERT_SAVINGS = `INSERT INTO savings
  (amount_cents, currency, direction, note, date)
  VALUES (?, ?, ?, ?, ?)`

function savingsParams(move) {
  return [
    toCents(move.amount),
    move.currency,
    move.direction,
    move.note ?? '',
    move.date,
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
    tx.id > 0 &&
    tx.id <= MAX_ID &&
    isValidAmount(tx.amount) &&
    (tx.type === 'income' || tx.type === 'expense') &&
    (tx.currency === 'CRC' || tx.currency === 'USD') &&
    isValidDate(tx.date)
  )
}

function isValidCustomCategory(c) {
  return (
    Number.isInteger(c?.id) &&
    c.id > 0 &&
    c.id <= MAX_ID &&
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
          (id, amount_cents, currency, type, category_id, note, date,
            payment_method)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

async function readAll(db) {
  const categories = await db.query('SELECT * FROM categories ORDER BY id')
  const transactions = await db.query('SELECT * FROM transactions ORDER BY id')
  const budgets = await db.query(
    'SELECT * FROM budgets ORDER BY category_id, currency',
  )
  const recurring = await db.query('SELECT * FROM recurring ORDER BY id')
  const savings = await db.query('SELECT * FROM savings ORDER BY id')
  const schedule = await db.query(
    'SELECT * FROM quincena_config ORDER BY effective_from',
  )
  return {
    transactions: transactions.values.map(toTransaction),
    categories: categories.values.map(toCategory),
    budgets: budgets.values.map(toBudget),
    recurring: recurring.values.map(toRecurring),
    savings: savings.values.map(toSavingsMove),
    quincenaSchedule: normalizeSchedule(schedule.values.map(toScheduleEntry)),
  }
}

// Replaces the schedule rows; the caller runs this inside a transaction
async function writeSchedule(db, schedule) {
  await db.run('DELETE FROM quincena_config', [], false)
  for (const entry of normalizeSchedule(schedule)) {
    await db.run(
      `INSERT INTO quincena_config (effective_from, mode, day1, day2)
        VALUES (?, ?, ?, ?)`,
      [entry.from, entry.mode, entry.day1, entry.day2],
      false,
    )
  }
}

export function loadAll() {
  return enqueue(async () => {
    const db = await getDb()
    await importLegacyDataOnce(db)
    return readAll(db)
  })
}

// Replaces everything with the cleaned data of a backup, in one transaction
export function restoreAll(data) {
  return enqueue(async () => {
    const db = await getDb()
    await inTransaction(db, async () => {
      await db.run('DELETE FROM budgets', [], false)
      await db.run('DELETE FROM recurring', [], false)
      await db.run('DELETE FROM savings', [], false)
      await db.run('DELETE FROM transactions', [], false)
      await db.run('DELETE FROM categories WHERE key IS NULL', [], false)
      for (const { id, name, color } of data.categories) {
        await db.run(
          'INSERT INTO categories (id, name, color) VALUES (?, ?, ?)',
          [id, name, color],
          false,
        )
      }
      for (const tx of data.transactions) {
        await db.run(
          `INSERT INTO transactions
            (id, amount_cents, currency, type, category_id, note, date,
              payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [tx.id, ...transactionParams(tx)],
          false,
        )
      }
      for (const b of data.budgets) {
        await db.run(
          `INSERT INTO budgets (category_id, currency, amount_cents)
            VALUES (?, ?, ?)`,
          [b.categoryId, b.currency, toCents(b.amount)],
          false,
        )
      }
      for (const item of data.recurring) {
        await db.run(
          `INSERT INTO recurring
            (id, amount_cents, currency, type, category_id, note, schedule,
              last_period)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, ...recurringParams(item), item.lastPeriod],
          false,
        )
      }
      for (const move of data.savings ?? []) {
        await db.run(
          `INSERT INTO savings
            (id, amount_cents, currency, direction, note, date)
            VALUES (?, ?, ?, ?, ?, ?)`,
          [move.id, ...savingsParams(move)],
          false,
        )
      }
      // a backup without the setting is 15/30
      await writeSchedule(db, data.quincenaSchedule ?? DEFAULT_SCHEDULE)
    })
    await persist()
    return readAll(db)
  })
}

export function insertTransaction(tx) {
  return enqueue(async () => {
    const db = await getDb()
    const result = await db.run(INSERT_TRANSACTION, transactionParams(tx))
    const id = result.changes.lastId
    await persistOrUndo(() =>
      db.run('DELETE FROM transactions WHERE id = ?', [id]),
    )
    return {
      ...tx,
      note: tx.note ?? '',
      paymentMethod: normalizePaymentMethod(tx.paymentMethod),
      id,
    }
  })
}

export function insertTransactions(list) {
  return enqueue(async () => {
    const db = await getDb()
    const saved = await inTransaction(db, async () => {
      const items = []
      for (const tx of list) {
        const result = await db.run(
          INSERT_TRANSACTION,
          transactionParams(tx),
          false,
        )
        items.push({
          ...tx,
          note: tx.note ?? '',
          paymentMethod: normalizePaymentMethod(tx.paymentMethod),
          id: result.changes.lastId,
        })
      }
      return items
    })
    await persistOrUndo(async () => {
      for (const item of saved) {
        await db.run('DELETE FROM transactions WHERE id = ?', [item.id])
      }
    })
    return saved
  })
}

export function updateTransaction(id, tx) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run(
      `UPDATE transactions SET
        amount_cents = ?, currency = ?, type = ?, category_id = ?, note = ?,
        date = ?, payment_method = ?
        WHERE id = ?`,
      [...transactionParams(tx), id],
    )
    await persist()
    return {
      ...tx,
      note: tx.note ?? '',
      paymentMethod: normalizePaymentMethod(tx.paymentMethod),
      id,
    }
  })
}

export function deleteTransaction(id) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run('DELETE FROM transactions WHERE id = ?', [id])
    await persist()
  })
}

export function insertCategory({ name, color }) {
  return enqueue(async () => {
    const db = await getDb()
    const result = await db.run(
      'INSERT INTO categories (name, color) VALUES (?, ?)',
      [name, color],
    )
    const id = result.changes.lastId
    await persistOrUndo(() =>
      db.run('DELETE FROM categories WHERE id = ?', [id]),
    )
    return { id, name, color }
  })
}

export function updateCategory(id, { name, color }) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run(
      'UPDATE categories SET name = ?, color = ? WHERE id = ? AND key IS NULL',
      [name, color, id],
    )
    await persist()
    return { id, name, color }
  })
}

// Its transactions move to another category first, in the same transaction
export function deleteCategory(id, moveToId) {
  return enqueue(async () => {
    const db = await getDb()
    // built-in categories stay, and so do their transactions
    const custom = await db.query(
      'SELECT id FROM categories WHERE id = ? AND key IS NULL',
      [id],
    )
    if (custom.values.length === 0) return
    await inTransaction(db, async () => {
      await db.run(
        'UPDATE transactions SET category_id = ? WHERE category_id = ?',
        [moveToId, id],
        false,
      )
      await db.run(
        'UPDATE recurring SET category_id = ? WHERE category_id = ?',
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
  })
}

export function clearAll() {
  return enqueue(async () => {
    const db = await getDb()
    await inTransaction(db, async () => {
      await db.run('DELETE FROM budgets', [], false)
      await db.run('DELETE FROM recurring', [], false)
      await db.run('DELETE FROM savings', [], false)
      await db.run('DELETE FROM transactions', [], false)
      await db.run('DELETE FROM categories WHERE key IS NULL', [], false)
    })
    await persist()
  })
}

// An amount of 0 (or none) removes the budget; returns the saved budget or null
export function setBudget(categoryId, currency, amount) {
  return enqueue(async () => {
    const db = await getDb()
    if (amount > 0) {
      await db.run(
        `INSERT INTO budgets (category_id, currency, amount_cents)
          VALUES (?, ?, ?)
          ON CONFLICT (category_id, currency)
          DO UPDATE SET amount_cents = excluded.amount_cents`,
        [categoryId, currency, toCents(amount)],
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
  })
}

function recurringParams(item) {
  return [
    toCents(item.amount),
    item.currency,
    item.type,
    item.categoryId,
    item.note ?? '',
    item.schedule,
  ]
}

export function insertRecurring(item) {
  return enqueue(async () => {
    const db = await getDb()
    const result = await db.run(
      `INSERT INTO recurring
        (amount_cents, currency, type, category_id, note, schedule)
        VALUES (?, ?, ?, ?, ?, ?)`,
      recurringParams(item),
    )
    const id = result.changes.lastId
    await persistOrUndo(() => db.run('DELETE FROM recurring WHERE id = ?', [id]))
    return { ...item, note: item.note ?? '', id, lastPeriod: null }
  })
}

// last_period is not touched here: only confirm and skip change it
export function updateRecurring(id, item) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run(
      `UPDATE recurring SET
        amount_cents = ?, currency = ?, type = ?, category_id = ?, note = ?,
        schedule = ?
        WHERE id = ?`,
      [...recurringParams(item), id],
    )
    await persist()
    return { ...item, note: item.note ?? '', id }
  })
}

export function deleteRecurring(id) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run('DELETE FROM recurring WHERE id = ?', [id])
    await persist()
  })
}

export function skipRecurring(id, period) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run('UPDATE recurring SET last_period = ? WHERE id = ?', [
      period,
      id,
    ])
    await persist()
  })
}

// Adds the transaction and marks the item as handled in one transaction
export function confirmRecurring(id, period, tx) {
  return enqueue(async () => {
    const db = await getDb()
    const before = await db.query(
      'SELECT last_period FROM recurring WHERE id = ?',
      [id],
    )
    const saved = await inTransaction(db, async () => {
      const result = await db.run(
        INSERT_TRANSACTION,
        transactionParams(tx),
        false,
      )
      await db.run(
        'UPDATE recurring SET last_period = ? WHERE id = ?',
        [period, id],
        false,
      )
      return {
        ...tx,
        note: tx.note ?? '',
        paymentMethod: normalizePaymentMethod(tx.paymentMethod),
        id: result.changes.lastId,
      }
    })
    await persistOrUndo(async () => {
      await db.run('DELETE FROM transactions WHERE id = ?', [saved.id])
      await db.run('UPDATE recurring SET last_period = ? WHERE id = ?', [
        before.values[0]?.last_period ?? null,
        id,
      ])
    })
    return saved
  })
}

export function insertSavingsMove(move) {
  return enqueue(async () => {
    const db = await getDb()
    const result = await db.run(INSERT_SAVINGS, savingsParams(move))
    const id = result.changes.lastId
    await persistOrUndo(() => db.run('DELETE FROM savings WHERE id = ?', [id]))
    return { ...move, note: move.note ?? '', id }
  })
}

export function deleteSavingsMove(id) {
  return enqueue(async () => {
    const db = await getDb()
    await db.run('DELETE FROM savings WHERE id = ?', [id])
    await persist()
  })
}

// Adds an income and the part of it sent to savings in one transaction
export function insertIncomeWithSavings(tx, move) {
  return enqueue(async () => {
    const db = await getDb()
    const saved = await inTransaction(db, async () => {
      const txResult = await db.run(
        INSERT_TRANSACTION,
        transactionParams(tx),
        false,
      )
      const moveResult = await db.run(
        INSERT_SAVINGS,
        savingsParams(move),
        false,
      )
      return {
        transaction: {
          ...tx,
          note: tx.note ?? '',
          paymentMethod: normalizePaymentMethod(tx.paymentMethod),
          id: txResult.changes.lastId,
        },
        move: { ...move, note: move.note ?? '', id: moveResult.changes.lastId },
      }
    })
    await persistOrUndo(async () => {
      await db.run('DELETE FROM transactions WHERE id = ?', [
        saved.transaction.id,
      ])
      await db.run('DELETE FROM savings WHERE id = ?', [saved.move.id])
    })
    return saved
  })
}

// Saves the whole schedule (the list is short: one entry per change)
export function saveQuincenaSchedule(schedule) {
  return enqueue(async () => {
    const db = await getDb()
    const before = (
      await db.query('SELECT * FROM quincena_config ORDER BY effective_from')
    ).values.map(toScheduleEntry)
    await inTransaction(db, () => writeSchedule(db, schedule))
    await persistOrUndo(() => inTransaction(db, () => writeSchedule(db, before)))
    return normalizeSchedule(schedule)
  })
}
