import { categoryColors, findCategoryByName } from './categories'
import { daysBetween, isValidDate, parseDate } from './dates'
import { currencies, isValidAmount } from './money'
import { schedules } from './recurring'

const currencyCodes = currencies.map((c) => c.code)
const types = ['income', 'expense']

// Everything the user has entered, as one JSON-friendly object.
// Built-in categories are not included: every install already has them.
export function buildBackup(
  { transactions, categories, budgets, recurring, savings = [] },
  now = new Date(),
) {
  return {
    app: 'quincena',
    version: 1,
    exportedAt: now.toISOString(),
    categories: categories
      .filter((c) => !c.key)
      .map(({ id, name, color }) => ({ id, name, color })),
    transactions,
    budgets,
    recurring,
    savings,
  }
}

// Limits that keep a damaged or hostile file from filling the device:
// the file, each text, the ids (SQLite integers; above 2^31 - 1 the next ids
// could repeat) and the number of records.
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
export const MAX_NOTE_LENGTH = 60
export const MAX_CATEGORY_NAME_LENGTH = 24
export const MAX_ID = 2_147_483_647
export const MAX_RECORDS = 200_000

// Ids are positive integers up to MAX_ID (0 is the "Uncategorized" stand-in)
function isValidId(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_ID
}

// Notes are cut to what the form allows
function cleanNote(value) {
  return typeof value === 'string' ? value.slice(0, MAX_NOTE_LENGTH) : ''
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A finite amount of at least one cent and at most the app's cap; it is
// rounded to cents like everything the app saves
function isPositiveAmount(value) {
  return isValidAmount(value)
}

function toCents(value) {
  return Math.round(value * 100) / 100
}

// Keeps the first record of each key
function keepFirst(items, keyOf) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function cleanCategory(c, builtInIds) {
  if (!isObject(c)) return null
  if (!isValidId(c.id) || builtInIds.has(c.id)) return null
  if (typeof c.name !== 'string') return null
  const name = c.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH).trim()
  if (name === '') return null
  if (!categoryColors.includes(c.color)) return null
  return { id: c.id, name, color: c.color }
}

// Fields shared by transactions and recurring items; null when invalid
function cleanEntry(item, knownIds) {
  if (!isObject(item)) return null
  if (!isValidId(item.id)) return null
  if (!isPositiveAmount(item.amount)) return null
  if (!currencyCodes.includes(item.currency)) return null
  if (!types.includes(item.type)) return null
  return {
    id: item.id,
    amount: toCents(item.amount),
    currency: item.currency,
    type: item.type,
    categoryId:
      item.type === 'expense' && knownIds.has(item.categoryId)
        ? item.categoryId
        : null,
    note: cleanNote(item.note),
  }
}

function cleanTransaction(tx, knownIds) {
  const entry = cleanEntry(tx, knownIds)
  if (!entry || typeof tx.date !== 'string' || !isValidDate(tx.date)) return null
  return { ...entry, date: tx.date }
}

function cleanRecurring(item, knownIds) {
  const entry = cleanEntry(item, knownIds)
  if (!entry || !schedules.includes(item.schedule)) return null
  const validPeriod =
    typeof item.lastPeriod === 'string' && /^\d{4}-\d{2}-[12]$/.test(item.lastPeriod)
  return {
    ...entry,
    schedule: item.schedule,
    lastPeriod: validPeriod ? item.lastPeriod : null,
  }
}

function cleanBudget(b, knownIds) {
  if (!isObject(b)) return null
  if (!knownIds.has(b.categoryId)) return null
  if (!currencyCodes.includes(b.currency)) return null
  if (!isPositiveAmount(b.amount)) return null
  return {
    categoryId: b.categoryId,
    currency: b.currency,
    amount: toCents(b.amount),
  }
}

function cleanSavingsMove(move) {
  if (!isObject(move)) return null
  if (!isValidId(move.id)) return null
  if (!isPositiveAmount(move.amount)) return null
  if (!currencyCodes.includes(move.currency)) return null
  if (move.direction !== 'in' && move.direction !== 'out') return null
  if (typeof move.date !== 'string' || !isValidDate(move.date)) return null
  return {
    id: move.id,
    amount: toCents(move.amount),
    currency: move.currency,
    direction: move.direction,
    note: cleanNote(move.note),
    date: move.date,
  }
}

// Applies the cleaner to each record and drops the ones it rejects
function clean(list, cleaner) {
  return list.map(cleaner).filter((item) => item !== null)
}

const LISTS = ['categories', 'transactions', 'budgets', 'recurring', 'savings']

// Checks and cleans the text of a backup file and says what happened to it:
//   { ok: false, reason }  reason: 'format' (not a backup of this app),
//                          'newer' (made by a newer version), 'tooBig'
//                          (the text or a list is over the limits)
//   { ok: true, data, counts, dropped, droppedTotal }
// data is { transactions, categories, budgets, recurring, savings } ready to
// restore; counts is how many records of each list will be restored, and
// dropped how many were left out (invalid, repeated, or a category whose
// name already exists). It never throws.
// Older backups have no savings: they read as an empty list.
export function inspectBackup(text, builtInCategories) {
  try {
    if (typeof text !== 'string') return { ok: false, reason: 'format' }
    if (text.length > MAX_BACKUP_BYTES) return { ok: false, reason: 'tooBig' }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, reason: 'format' }
    }
    if (!isObject(data) || data.app !== 'quincena') {
      return { ok: false, reason: 'format' }
    }
    if (Number.isInteger(data.version) && data.version > 1) {
      return { ok: false, reason: 'newer' }
    }
    if (data.version !== 1) return { ok: false, reason: 'format' }
    const lists = [
      data.categories,
      data.transactions,
      data.budgets,
      data.recurring,
    ]
    if (!lists.every(Array.isArray)) return { ok: false, reason: 'format' }
    if (data.savings !== undefined && !Array.isArray(data.savings)) {
      return { ok: false, reason: 'format' }
    }
    const source = {
      categories: data.categories,
      transactions: data.transactions,
      budgets: data.budgets,
      recurring: data.recurring,
      savings: data.savings ?? [],
    }
    if (LISTS.some((name) => source[name].length > MAX_RECORDS)) {
      return { ok: false, reason: 'tooBig' }
    }

    const builtInIds = new Set(builtInCategories.map((c) => c.id))

    // a category whose name is already taken (by a built-in one in any
    // language, or by an earlier one) is merged into it
    const aliases = new Map()
    const keptCategories = []
    for (const raw of source.categories) {
      const category = cleanCategory(raw, builtInIds)
      if (!category) continue
      if (keptCategories.some((c) => c.id === category.id)) continue
      const twin = findCategoryByName(
        [...builtInCategories, ...keptCategories],
        category.name,
      )
      if (twin) {
        aliases.set(category.id, twin.id)
        continue
      }
      keptCategories.push(category)
    }
    const categories = keptCategories
    const knownIds = new Set([...builtInIds, ...categories.map((c) => c.id)])
    const resolve = (item) =>
      isObject(item) && aliases.has(item.categoryId)
        ? { ...item, categoryId: aliases.get(item.categoryId) }
        : item

    const result = {
      categories,
      transactions: keepFirst(
        clean(source.transactions, (tx) => cleanTransaction(resolve(tx), knownIds)),
        (tx) => tx.id,
      ),
      budgets: keepFirst(
        clean(source.budgets, (b) => cleanBudget(resolve(b), knownIds)),
        (b) => `${b.categoryId}-${b.currency}`,
      ),
      recurring: keepFirst(
        clean(source.recurring, (item) => cleanRecurring(resolve(item), knownIds)),
        (item) => item.id,
      ),
      savings: keepFirst(
        clean(source.savings, cleanSavingsMove),
        (move) => move.id,
      ),
    }

    const counts = {}
    const dropped = {}
    let droppedTotal = 0
    for (const name of LISTS) {
      counts[name] = result[name].length
      dropped[name] = source[name].length - result[name].length
      droppedTotal += dropped[name]
    }
    return { ok: true, data: result, counts, dropped, droppedTotal }
  } catch {
    return { ok: false, reason: 'format' }
  }
}

// Same check, for callers that only want the data: null when the text is not
// a usable backup
export function parseBackup(text, builtInCategories) {
  const result = inspectBackup(text, builtInCategories)
  return result.ok ? result.data : null
}

// True when there is no valid backup date, or the last backup is older
// than `days` days
export function isBackupDue(lastBackup, today = new Date(), days = 14) {
  if (typeof lastBackup !== 'string' || !isValidDate(lastBackup)) return true
  return daysBetween(parseDate(lastBackup), today) > days
}

// "Movements: 12 · Budgets: 3 · ..." for a list of counts; lists with
// nothing in them are left out. `counts` has the five keys of a backup
// (categories counts only the custom ones). t is the translation function.
export function summarizeCounts(counts, t) {
  const labels = [
    ['transactions', 'listTransactions'],
    ['budgets', 'listBudgets'],
    ['recurring', 'listRecurring'],
    ['savings', 'listSavings'],
    ['categories', 'listCategories'],
  ]
  const parts = labels
    .filter(([name]) => (counts[name] ?? 0) > 0)
    .map(([name, key]) => `${t(key)}: ${counts[name]}`)
  return parts.length > 0 ? parts.join(' · ') : t('listNothing')
}
