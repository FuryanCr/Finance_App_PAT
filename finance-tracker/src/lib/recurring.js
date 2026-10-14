import { parseDate, quincenaKey } from './dates'
import { DEFAULT_SCHEDULE, describeSchedule, halfOf } from './quincenaSchedule'
import { sum } from './money'

// 'every' = every quincena; 'first' = monthly, first quincena of the month
// (days 1-15 in 15/30); 'second' = monthly, second quincena (days 16 to month
// end in 15/30). With a single pay day a month, a monthly item is due in each.
export const schedules = ['every', 'first', 'second']

// The translation key that names a schedule. With 15/30 a monthly item says
// "days 1 to 15" or "16 to month end"; with other pay days it says "first" or
// "second quincena", because those days no longer mean anything.
export function scheduleKey(
  schedule,
  quincenaSchedule = DEFAULT_SCHEDULE,
  today = new Date(),
) {
  const { current } = describeSchedule(quincenaSchedule, today)
  if (schedule === 'every' || current.mode === 'fixed') {
    return `schedule.${schedule}`
  }
  return `schedule.${schedule}Pay`
}

// Due when its schedule includes the current quincena and it has not been
// confirmed or skipped in it yet
export function isDue(item, today = new Date(), schedule = DEFAULT_SCHEDULE) {
  const half = halfOf(today, schedule)
  const scheduled =
    item.schedule === 'every' || half === 'both' || item.schedule === half
  return scheduled && item.lastPeriod !== quincenaKey(today, schedule)
}

// The due item that a new transaction most likely pays: same type, same
// currency, same amount to the cent, and the transaction is dated inside
// the current quincena. Returns the item or null.
export function findMatchingDue(
  recurring,
  tx,
  today = new Date(),
  schedule = DEFAULT_SCHEDULE,
) {
  if (quincenaKey(parseDate(tx.date), schedule) !== quincenaKey(today, schedule)) {
    return null
  }
  const cents = Math.round(tx.amount * 100)
  return (
    recurring.find(
      (item) =>
        isDue(item, today, schedule) &&
        item.type === tx.type &&
        item.currency === tx.currency &&
        Math.round(item.amount * 100) === cents,
    ) ?? null
  )
}

// Total of the due EXPENSES in one currency: money already spoken for
// this quincena that is not a transaction yet. Due income is not counted.
export function pendingTotal(
  recurring,
  currency,
  today = new Date(),
  schedule = DEFAULT_SCHEDULE,
) {
  return sum(
    recurring
      .filter(
        (item) =>
          isDue(item, today, schedule) &&
          item.type === 'expense' &&
          item.currency === currency,
      )
      .map((item) => item.amount),
  )
}
