import { parseDate, quincenaKey } from './dates'
import { sum } from './money'

// 'every' = every quincena; 'first' = monthly, days 1-15; 'second' = monthly,
// days 16 to month end
export const schedules = ['every', 'first', 'second']

// True when the item's schedule includes the current quincena
function isScheduled(item, today) {
  const half = today.getDate() <= 15 ? 'first' : 'second'
  return item.schedule === 'every' || item.schedule === half
}

// Due when its schedule includes the current quincena and it has not been
// confirmed or skipped in it yet
export function isDue(item, today = new Date()) {
  return isScheduled(item, today) && item.lastPeriod !== quincenaKey(today)
}

// Handled when its schedule includes the current quincena and it was already
// confirmed or skipped in it
export function isHandled(item, today = new Date()) {
  return isScheduled(item, today) && item.lastPeriod === quincenaKey(today)
}

// The due item that a new transaction most likely pays: same type, same
// currency, same amount to the cent, and the transaction is dated inside
// the current quincena. Returns the item or null.
export function findMatchingDue(recurring, tx, today = new Date()) {
  if (quincenaKey(parseDate(tx.date)) !== quincenaKey(today)) return null
  const cents = Math.round(tx.amount * 100)
  return (
    recurring.find(
      (item) =>
        isDue(item, today) &&
        item.type === tx.type &&
        item.currency === tx.currency &&
        Math.round(item.amount * 100) === cents,
    ) ?? null
  )
}

// Total of the due EXPENSES in one currency: money already spoken for
// this quincena that is not a transaction yet. Due income is not counted.
export function pendingTotal(recurring, currency, today = new Date()) {
  return sum(
    recurring
      .filter(
        (item) =>
          isDue(item, today) &&
          item.type === 'expense' &&
          item.currency === currency,
      )
      .map((item) => item.amount),
  )
}
