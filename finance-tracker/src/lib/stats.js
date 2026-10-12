import { sum } from './money'
import { parseDate } from './dates'

export function getSpendingBars(
  transactions,
  currency,
  period,
  today = new Date(),
  locale = 'en-US',
) {
  const expenses = transactions.filter(
    (t) => t.type === 'expense' && t.currency === currency,
  )
  const bars = []

  if (period === 'week') {
    // last 7 days, one bar per day
    for (let i = 6; i >= 0; i--) {
      const day = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - i,
      )
      const total = sum(
        expenses
          .filter((t) => parseDate(t.date).getTime() === day.getTime())
          .map((t) => t.amount),
      )
      bars.push({
        label: day.toLocaleDateString(locale, { weekday: 'short' }),
        total,
      })
    }
  } else if (period === 'month') {
    // last 6 months, one bar per month
    for (let i = 5; i >= 0; i--) {
      const m = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const total = sum(
        expenses
          .filter((t) => {
            const d = parseDate(t.date)
            return (
              d.getFullYear() === m.getFullYear() &&
              d.getMonth() === m.getMonth()
            )
          })
          .map((t) => t.amount),
      )
      bars.push({
        label: m.toLocaleDateString(locale, { month: 'short' }),
        total,
      })
    }
  } else {
    // last 3 years, one bar per year
    for (let i = 2; i >= 0; i--) {
      const year = today.getFullYear() - i
      const total = sum(
        expenses
          .filter((t) => parseDate(t.date).getFullYear() === year)
          .map((t) => t.amount),
      )
      bars.push({ label: String(year), total })
    }
  }

  return bars
}