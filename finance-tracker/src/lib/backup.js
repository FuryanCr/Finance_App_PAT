import { categoryColors } from './categories'
import { isValidDate } from './dates'
import { currencies } from './money'
import { schedules } from './recurring'

const currencyCodes = currencies.map((c) => c.code)
const types = ['income', 'expense']

// Everything the user has entered, as one JSON-friendly object.
// Built-in categories are not included: every install already has them.
export function buildBackup(
  { transactions, categories, budgets, recurring },
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
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveAmount(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.round(value * 100) > 0
  )
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
  if (!Number.isInteger(c.id) || builtInIds.has(c.id)) return null
  if (typeof c.name !== 'string' || c.name.trim() === '') return null
  if (!categoryColors.includes(c.color)) return null
  return { id: c.id, name: c.name, color: c.color }
}

// Fields shared by transactions and recurring items; null when invalid
function cleanEntry(item, knownIds) {
  if (!isObject(item)) return null
  if (!Number.isInteger(item.id)) return null
  if (!isPositiveAmount(item.amount)) return null
  if (!currencyCodes.includes(item.currency)) return null
  if (!types.includes(item.type)) return null
  return {
    id: item.id,
    amount: item.amount,
    currency: item.currency,
    type: item.type,
    categoryId:
      item.type === 'expense' && knownIds.has(item.categoryId)
        ? item.categoryId
        : null,
    note: typeof item.note === 'string' ? item.note : '',
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
  return { categoryId: b.categoryId, currency: b.currency, amount: b.amount }
}

// Applies the cleaner to each record and drops the ones it rejects
function clean(list, cleaner) {
  return list.map(cleaner).filter((item) => item !== null)
}

// Checks and cleans the text of a backup file.
// Returns { transactions, categories, budgets, recurring } ready to restore,
// or null when the text is not a Quincena backup at all.
export function parseBackup(text, builtInCategories) {
  try {
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return null
    }
    if (!isObject(data) || data.app !== 'quincena' || data.version !== 1) {
      return null
    }
    const lists = [
      data.categories,
      data.transactions,
      data.budgets,
      data.recurring,
    ]
    if (!lists.every(Array.isArray)) return null

    const builtInIds = new Set(builtInCategories.map((c) => c.id))
    const categories = keepFirst(
      clean(data.categories, (c) => cleanCategory(c, builtInIds)),
      (c) => c.id,
    )
    const knownIds = new Set([...builtInIds, ...categories.map((c) => c.id)])

    return {
      categories,
      transactions: keepFirst(
        clean(data.transactions, (tx) => cleanTransaction(tx, knownIds)),
        (tx) => tx.id,
      ),
      budgets: keepFirst(
        clean(data.budgets, (b) => cleanBudget(b, knownIds)),
        (b) => `${b.categoryId}-${b.currency}`,
      ),
      recurring: keepFirst(
        clean(data.recurring, (item) => cleanRecurring(item, knownIds)),
        (item) => item.id,
      ),
    }
  } catch {
    return null
  }
}
