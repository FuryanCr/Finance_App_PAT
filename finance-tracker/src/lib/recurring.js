import { quincenaKey } from './dates'
import { sum } from './money'

// 'every' = every quincena; 'first' = monthly, days 1-15; 'second' = monthly,
// days 16 to month end
export const schedules = ['every', 'first', 'second']

// Due when its schedule includes the current quincena and it has not been
// confirmed or skipped in it yet
export function isDue(item, today = new Date()) {
  const half = today.getDate() <= 15 ? 'first' : 'second'
  const scheduled = item.schedule === 'every' || item.schedule === half
  return scheduled && item.lastPeriod !== quincenaKey(today)
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
