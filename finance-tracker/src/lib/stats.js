import { getTotals, sum } from './money'
import { uncategorized } from './categories'
import { getQuincenaRange, isSameMonth, parseDate } from './dates'
import { savingsInRange } from './savings'

// Monday of the week that contains the date (weeks start on Monday)
export function startOfWeek(date) {
  const sinceMonday = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday)
}

// First day covered by the chart of each period. The week is the current one,
// Monday to Sunday.
export function getPeriodStart(period, today = new Date()) {
  if (period === 'week') return startOfWeek(today)
  if (period === 'month') {
    return new Date(today.getFullYear(), today.getMonth() - 5, 1)
  }
  return new Date(today.getFullYear() - 2, 0, 1)
}

// Total spent per category, leaving out categories with nothing spent.
// Expenses whose category is missing go in a last "Uncategorized" item.
export function getCategoryTotals(expenses, categories) {
  const totals = categories
    .map((category) => ({
      category,
      total: sum(
        expenses
          .filter((t) => t.categoryId === category.id)
          .map((t) => t.amount),
      ),
    }))
    .filter((item) => item.total > 0)

  const total = sum(
    expenses
      .filter((t) => !categories.some((c) => c.id === t.categoryId))
      .map((t) => t.amount),
  )
  if (total > 0) totals.push({ category: uncategorized, total })
  return totals
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
    // this week, Monday to Sunday, one bar per day; days still to come are 0
    const monday = startOfWeek(today)
    const todayTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime()
    for (let i = 0; i < 7; i++) {
      const day = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      )
      const total =
        day.getTime() > todayTime
          ? 0
          : sum(
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

// The last `count` quincenas up to and including the one containing `today`,
// newest first, with the totals of one currency in each. Savings moves change
// the net (what was left) but not the income or the spent.
export function getQuincenaHistory(
  transactions,
  currency,
  count,
  today = new Date(),
  moves = [],
) {
  const history = []
  let range = getQuincenaRange(today)
  for (let i = 0; i < count; i++) {
    const { start, end } = range
    const inRange = transactions.filter((tx) => {
      const date = parseDate(tx.date)
      return date >= start && date <= end
    })
    const { income, spent, net } = getTotals(inRange, currency)
    const { toSavings, fromSavings } = savingsInRange(
      moves,
      currency,
      start,
      end,
    )
    history.push({
      start,
      end,
      income,
      spent,
      net: sum([net, -toSavings, fromSavings]),
    })
    // the day before this start belongs to the previous quincena
    range = getQuincenaRange(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1),
    )
  }
  return history
}

// The rows to show when a category list is collapsed: every row that is
// near or over its budget, plus the largest of the rest, up to `limit`
// rows in total (flagged rows are never dropped), in their original order
export function pickCategoryRows(totals, budgets, limit) {
  if (totals.length <= limit) return totals
  const flagged = totals.map((item) => {
    const budget = budgets.find((b) => b.categoryId === item.category.id)
    return Boolean(budget) && item.total / budget.amount >= 0.8
  })
  const keep = new Set()
  flagged.forEach((isFlagged, index) => {
    if (isFlagged) keep.add(index)
  })
  const slots = limit - keep.size
  if (slots > 0) {
    totals
      .map((item, index) => ({ index, total: item.total }))
      .filter(({ index }) => !flagged[index])
      .sort((a, b) => b.total - a.total || a.index - b.index)
      .slice(0, slots)
      .forEach(({ index }) => keep.add(index))
  }
  return totals.filter((_, index) => keep.has(index))
}

// Drops the quincenas that ended before the first transaction in that
// currency: there is nothing to compare before the data starts
export function trimQuincenaHistory(history, transactions, currency) {
  const dates = transactions
    .filter((tx) => tx.currency === currency)
    .map((tx) => tx.date)
  if (dates.length === 0) return []
  const first = parseDate(dates.reduce((a, b) => (b < a ? b : a)))
  return history.filter((q) => q.end >= first)
}
