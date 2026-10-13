import { describe, expect, it } from 'vitest'
import { uncategorized } from './categories'
import {
  getCategoryTotals,
  getPeriodStart,
  getQuincenaHistory,
  getSpendingBars,
  trimQuincenaHistory,
} from './stats'

function ymd(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
}

describe('getPeriodStart', () => {
  it('week starts 6 days before today', () => {
    expect(ymd(getPeriodStart('week', new Date(2026, 9, 12)))).toEqual([
      2026, 10, 6,
    ])
  })

  it('week can start in the previous month', () => {
    expect(ymd(getPeriodStart('week', new Date(2026, 9, 3)))).toEqual([
      2026, 9, 27,
    ])
  })

  it('month starts on the 1st, 5 months earlier', () => {
    expect(ymd(getPeriodStart('month', new Date(2026, 9, 12)))).toEqual([
      2026, 5, 1,
    ])
  })

  it('month from January crosses into the previous year', () => {
    expect(ymd(getPeriodStart('month', new Date(2026, 0, 20)))).toEqual([
      2025, 8, 1,
    ])
  })

  it('month from the 31st does not skip a month', () => {
    expect(ymd(getPeriodStart('month', new Date(2026, 9, 31)))).toEqual([
      2026, 5, 1,
    ])
    expect(ymd(getPeriodStart('month', new Date(2026, 7, 31)))).toEqual([
      2026, 3, 1,
    ])
  })

  it('year starts on January 1st, two years earlier', () => {
    expect(ymd(getPeriodStart('year', new Date(2026, 9, 12)))).toEqual([
      2024, 1, 1,
    ])
  })
})

describe('getCategoryTotals', () => {
  const categories = [
    { id: 1, key: 'food', color: 'orange' },
    { id: 2, key: 'transport', color: 'blue' },
    { id: 3, key: 'bills', color: 'violet' },
  ]

  it('sums the spending of each category', () => {
    const expenses = [
      { categoryId: 1, amount: 100 },
      { categoryId: 1, amount: 50.5 },
      { categoryId: 2, amount: 30 },
    ]
    expect(getCategoryTotals(expenses, categories)).toEqual([
      { category: categories[0], total: 150.5 },
      { category: categories[1], total: 30 },
    ])
  })

  it('keeps the order of the categories, not of the expenses', () => {
    const expenses = [
      { categoryId: 3, amount: 10 },
      { categoryId: 1, amount: 20 },
    ]
    const result = getCategoryTotals(expenses, categories)
    expect(result.map((item) => item.category.id)).toEqual([1, 3])
  })

  it('leaves out categories with no spending', () => {
    const result = getCategoryTotals([{ categoryId: 2, amount: 5 }], categories)
    expect(result).toHaveLength(1)
    expect(result[0].category.id).toBe(2)
  })

  it('reports expenses whose category does not exist in a last item', () => {
    const expenses = [
      { categoryId: 99, amount: 500 },
      { categoryId: null, amount: 40 },
      { categoryId: 1, amount: 10 },
    ]
    expect(getCategoryTotals(expenses, categories)).toEqual([
      { category: categories[0], total: 10 },
      { category: uncategorized, total: 540 },
    ])
  })

  it('adds nothing when every expense has a known category', () => {
    const result = getCategoryTotals([{ categoryId: 2, amount: 5 }], categories)
    expect(result.map((item) => item.category.id)).toEqual([2])
  })

  it('puts a null category id in the uncategorized item', () => {
    const result = getCategoryTotals([{ categoryId: null, amount: 7 }], categories)
    expect(result).toEqual([{ category: uncategorized, total: 7 }])
  })

  it('puts an unknown category id in the uncategorized item', () => {
    const result = getCategoryTotals([{ categoryId: 42, amount: 9 }], categories)
    expect(result).toEqual([{ category: uncategorized, total: 9 }])
  })

  it('returns an empty list when there are no expenses', () => {
    expect(getCategoryTotals([], categories)).toEqual([])
  })
})

describe('getSpendingBars', () => {
  // Wednesday 2026-10-14
  const today = new Date(2026, 9, 14)
  const transactions = [
    { id: 1, amount: 100, currency: 'CRC', type: 'expense', date: '2026-10-14' },
    { id: 2, amount: 50, currency: 'CRC', type: 'expense', date: '2026-10-14' },
    { id: 3, amount: 70, currency: 'CRC', type: 'expense', date: '2026-10-08' },
    { id: 4, amount: 999, currency: 'CRC', type: 'expense', date: '2026-10-07' },
    { id: 5, amount: 500, currency: 'CRC', type: 'income', date: '2026-10-14' },
    { id: 6, amount: 25, currency: 'USD', type: 'expense', date: '2026-10-14' },
    { id: 7, amount: 800, currency: 'CRC', type: 'expense', date: '2026-10-15' },
    { id: 8, amount: 300, currency: 'CRC', type: 'expense', date: '2026-08-20' },
    { id: 9, amount: 400, currency: 'CRC', type: 'expense', date: '2025-03-01' },
    { id: 10, amount: 600, currency: 'CRC', type: 'expense', date: '2024-12-31' },
  ]

  it('returns 7 bars for week, 6 for month and 3 for year', () => {
    expect(getSpendingBars(transactions, 'CRC', 'week', today)).toHaveLength(7)
    expect(getSpendingBars(transactions, 'CRC', 'month', today)).toHaveLength(6)
    expect(getSpendingBars(transactions, 'CRC', 'year', today)).toHaveLength(3)
  })

  it('totals each day of the week, oldest first', () => {
    const bars = getSpendingBars(transactions, 'CRC', 'week', today, 'en-US')
    expect(bars).toEqual([
      { label: 'Thu', total: 70 },
      { label: 'Fri', total: 0 },
      { label: 'Sat', total: 0 },
      { label: 'Sun', total: 0 },
      { label: 'Mon', total: 0 },
      { label: 'Tue', total: 0 },
      { label: 'Wed', total: 150 },
    ])
  })

  it('does not count a transaction dated after today in the week chart', () => {
    const bars = getSpendingBars(transactions, 'CRC', 'week', today)
    expect(bars.reduce((total, bar) => total + bar.total, 0)).toBe(220)
  })

  it('does not count income or the other currency', () => {
    const crc = getSpendingBars(transactions, 'CRC', 'week', today)
    const usd = getSpendingBars(transactions, 'USD', 'week', today)
    expect(crc[6].total).toBe(150)
    expect(usd[6].total).toBe(25)
  })

  it('totals each of the last 6 months, oldest first', () => {
    const bars = getSpendingBars(transactions, 'CRC', 'month', today, 'en-US')
    expect(bars).toEqual([
      { label: 'May', total: 0 },
      { label: 'Jun', total: 0 },
      { label: 'Jul', total: 0 },
      { label: 'Aug', total: 300 },
      { label: 'Sep', total: 0 },
      { label: 'Oct', total: 2019 },
    ])
  })

  it('totals each of the last 3 years, labelled by year', () => {
    const bars = getSpendingBars(transactions, 'CRC', 'year', today)
    expect(bars).toEqual([
      { label: '2024', total: 600 },
      { label: '2025', total: 400 },
      { label: '2026', total: 2319 },
    ])
  })
})

describe('getQuincenaHistory', () => {
  const tx = (id, date, amount, type = 'expense', currency = 'CRC') => ({
    id,
    amount,
    currency,
    type,
    date,
  })

  it('returns exactly count items', () => {
    const today = new Date(2026, 9, 12)
    expect(getQuincenaHistory([], 'CRC', 6, today)).toHaveLength(6)
    expect(getQuincenaHistory([], 'CRC', 1, today)).toHaveLength(1)
    expect(getQuincenaHistory([], 'CRC', 0, today)).toHaveLength(0)
  })

  it('goes newest first, starting with the quincena of today', () => {
    const history = getQuincenaHistory([], 'CRC', 3, new Date(2026, 9, 20))
    expect(history.map((q) => ymd(q.start))).toEqual([
      [2026, 10, 16],
      [2026, 10, 1],
      [2026, 9, 16],
    ])
    expect(history.map((q) => ymd(q.end))).toEqual([
      [2026, 10, 31],
      [2026, 10, 15],
      [2026, 9, 30],
    ])
  })

  it('crosses the start of a year', () => {
    const history = getQuincenaHistory([], 'CRC', 3, new Date(2026, 0, 10))
    expect(history.map((q) => [ymd(q.start), ymd(q.end)])).toEqual([
      [
        [2026, 1, 1],
        [2026, 1, 15],
      ],
      [
        [2025, 12, 16],
        [2025, 12, 31],
      ],
      [
        [2025, 12, 1],
        [2025, 12, 15],
      ],
    ])
  })

  it('totals each quincena for the requested currency only', () => {
    const transactions = [
      tx(1, '2026-10-02', 100),
      tx(2, '2026-10-10', 50),
      tx(3, '2026-10-12', 1000, 'income'),
      tx(4, '2026-10-12', 25, 'expense', 'USD'),
      tx(5, '2026-09-20', 70),
    ]
    const [current, previous] = getQuincenaHistory(
      transactions,
      'CRC',
      2,
      new Date(2026, 9, 12),
    )
    expect(current).toMatchObject({ income: 1000, spent: 150, net: 850 })
    expect(previous).toMatchObject({ income: 0, spent: 70, net: -70 })
    const [usd] = getQuincenaHistory(transactions, 'USD', 1, new Date(2026, 9, 12))
    expect(usd).toMatchObject({ income: 0, spent: 25, net: -25 })
  })

  it('puts the 15th in the first quincena and the 16th in the second', () => {
    const transactions = [tx(1, '2026-10-15', 10), tx(2, '2026-10-16', 20)]
    const [second, first] = getQuincenaHistory(
      transactions,
      'CRC',
      2,
      new Date(2026, 9, 20),
    )
    expect(first.spent).toBe(10)
    expect(second.spent).toBe(20)
  })

  it('returns zeros for quincenas with no transactions', () => {
    const [q] = getQuincenaHistory(
      [tx(1, '2026-01-02', 5)],
      'CRC',
      1,
      new Date(2026, 9, 12),
    )
    expect(q).toMatchObject({ income: 0, spent: 0, net: 0 })
  })
})

describe('getQuincenaHistory with savings moves', () => {
  const today = new Date(2026, 9, 12)
  const tx = (id, date, amount, type) => ({
    id,
    amount,
    currency: 'CRC',
    type,
    date,
  })
  const move = (id, direction, amount, date, currency = 'CRC') => ({
    id,
    amount,
    currency,
    direction,
    note: '',
    date,
  })
  const transactions = [
    tx(1, '2026-10-02', 1000, 'income'),
    tx(2, '2026-10-03', 300, 'expense'),
  ]

  it('subtracts money moved in and adds money taken out, keeping income and spent', () => {
    const moves = [
      move(1, 'in', 200, '2026-10-05'),
      move(2, 'out', 50, '2026-10-06'),
      move(3, 'in', 999, '2026-10-06', 'USD'),
      move(4, 'in', 70, '2026-09-20'),
    ]
    const [current, previous] = getQuincenaHistory(
      transactions,
      'CRC',
      2,
      today,
      moves,
    )
    expect(current).toMatchObject({ income: 1000, spent: 300, net: 550 })
    expect(previous).toMatchObject({ income: 0, spent: 0, net: -70 })
  })

  it('is exactly as before with no moves', () => {
    const without = getQuincenaHistory(transactions, 'CRC', 3, today)
    expect(getQuincenaHistory(transactions, 'CRC', 3, today, [])).toEqual(without)
    expect(without[0].net).toBe(700)
  })

  it('counts a quincena with only a move', () => {
    const [q] = getQuincenaHistory([], 'CRC', 1, today, [
      move(1, 'in', 40, '2026-10-15'),
    ])
    expect(q).toMatchObject({ income: 0, spent: 0, net: -40 })
  })
})

describe('trimQuincenaHistory', () => {
  const tx = (id, date, currency = 'CRC', type = 'expense') => ({
    id,
    amount: 10,
    currency,
    type,
    date,
  })
  const today = new Date(2026, 9, 12) // quincena 2026-10-01 to 2026-10-15
  const history = getQuincenaHistory([], 'CRC', 6, today)

  it('returns nothing when the currency has no transactions', () => {
    expect(trimQuincenaHistory(history, [], 'CRC')).toEqual([])
    expect(
      trimQuincenaHistory(history, [tx(1, '2026-10-02', 'USD')], 'CRC'),
    ).toEqual([])
  })

  it('keeps everything when the first transaction is in the oldest quincena', () => {
    // the oldest of the 6 is 2026-07-16 to 2026-07-31
    const result = trimQuincenaHistory(history, [tx(1, '2026-07-20')], 'CRC')
    expect(result).toEqual(history)
  })

  it('drops the quincenas that ended before the first transaction', () => {
    // two quincenas ago: 2026-09-01 to 2026-09-15
    const result = trimQuincenaHistory(history, [tx(1, '2026-09-03')], 'CRC')
    expect(result).toHaveLength(3)
    expect(result).toEqual(history.slice(0, 3))
  })

  it('counts income too', () => {
    const result = trimQuincenaHistory(
      history,
      [tx(1, '2026-10-02', 'CRC', 'income')],
      'CRC',
    )
    expect(result).toEqual(history.slice(0, 1))
  })

  it('keeps an empty quincena between two with data', () => {
    const result = trimQuincenaHistory(
      history,
      [tx(1, '2026-09-03'), tx(2, '2026-10-02')],
      'CRC',
    )
    expect(result).toHaveLength(3)
    expect(result[1]).toMatchObject({ income: 0, spent: 0, net: 0 })
  })

  it('ignores the other currency when finding the first date', () => {
    const result = trimQuincenaHistory(
      history,
      [tx(1, '2026-07-20', 'USD'), tx(2, '2026-10-02')],
      'CRC',
    )
    expect(result).toEqual(history.slice(0, 1))
  })

  it('a lone future transaction gives an empty result', () => {
    // dated after the end of the current quincena (2026-10-15)
    expect(trimQuincenaHistory(history, [tx(1, '2026-10-20')], 'CRC')).toEqual(
      [],
    )
  })

  it('a future transaction inside the current quincena keeps only that one', () => {
    expect(trimQuincenaHistory(history, [tx(1, '2026-10-14')], 'CRC')).toEqual(
      history.slice(0, 1),
    )
  })
})
