import { sum } from './money'
import { isSameMonth, parseDate } from './dates'

// First day covered by the chart of each period
export function getPeriodStart(period, today = new Date()) {
  if (period === 'week') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  }
  if (period === 'month') {
    return new Date(today.getFullYear(), today.getMonth() - 5, 1)
  }
  return new Date(today.getFullYear() - 2, 0, 1)
}

// Total spent per category, leaving out categories with nothing spent
export function getCategoryTotals(expenses, categories) {
  return categories
    .map((category) => ({
      category,
      total: sum(
        expenses
          .filter((t) => t.categoryId === category.id)
          .map((t) => t.amount),
      ),
    }))
    .filter((item) => item.total > 0)
}

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
          .filter((t) => isSameMonth(parseDate(t.date), m))
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