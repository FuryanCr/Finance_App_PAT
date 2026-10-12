import { quincenaKey } from './dates'

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
