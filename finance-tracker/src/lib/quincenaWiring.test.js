import { describe, expect, it } from 'vitest'
import { daysLeftInQuincena, getQuincenaRange, quincenaKey, todayString } from './dates'
import { isClosingDay, nextQuincenaStart, quincenaFigures, rolloverLeftover } from './quincena'
import { findMatchingDue, isDue, pendingTotal } from './recurring'
import { sampleTransactions } from './sample'
import { previousQuincenaRange } from './savings'
import { getQuincenaHistory } from './stats'

// Everything that used to assume "day 1 or 16" must follow the schedule
const at = (y, m, d) => new Date(y, m - 1, d, 12)
const payDays = [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }]
// 15/30 until the 15th of October 2026, then pay days 5 and 20
const changed = [
  { from: '2000-01-01', mode: 'fixed', day1: 1, day2: 16 },
  { from: '2026-10-16', mode: 'paydays', day1: 5, day2: 20 },
]
const tx = (date, amount, type = 'expense') => ({
  id: Math.random(),
  amount,
  currency: 'CRC',
  type,
  categoryId: 1,
  note: '',
  date,
  paymentMethod: 'cash',
})

describe('dates', () => {
  it('range, days left and key follow the pay days', () => {
    const today = at(2026, 10, 22)
    expect(todayString(getQuincenaRange(today, payDays).start)).toBe('2026-10-20')
    expect(todayString(getQuincenaRange(today, payDays).end)).toBe('2026-11-04')
    expect(daysLeftInQuincena(today, payDays)).toBe(14)
    expect(quincenaKey(today, payDays)).toBe('2026-10-20')
  })

  it('stay as before without a schedule', () => {
    expect(todayString(getQuincenaRange(at(2026, 10, 22)).start)).toBe('2026-10-16')
    expect(daysLeftInQuincena(at(2026, 10, 31))).toBe(1)
    expect(quincenaKey(at(2026, 10, 22))).toBe('2026-10-2')
  })
})

describe('Home figures', () => {
  const transactions = [
    tx('2026-10-04', 1000), // before the 5th: the previous quincena
    tx('2026-10-05', 2000), // pay day: first day
    tx('2026-10-19', 3000),
    tx('2026-10-20', 4000), // next quincena
  ]

  it('counts only the movements of the quincena of the pay days', () => {
    const figures = quincenaFigures(
      { transactions, savings: [], recurring: [], quincenaSchedule: payDays },
      'CRC',
      at(2026, 10, 10),
    )
    expect(figures.spent).toBe(5000)
    expect(figures.days).toBe(10)
  })

  it('does the same as before when there is no schedule', () => {
    const figures = quincenaFigures(
      { transactions, savings: [], recurring: [] },
      'CRC',
      at(2026, 10, 10),
    )
    expect(figures.spent).toBe(1000 + 2000)
  })

  it('offers the leftover of the previous quincena of the pay days', () => {
    const data = [tx('2026-09-25', 9000, 'income'), tx('2026-09-26', 2000)]
    const leftover = rolloverLeftover(
      { transactions: data, savings: [], quincenaSchedule: payDays },
      'CRC',
      at(2026, 10, 7),
    )
    expect(leftover).toBe(7000)
  })
})

describe('closing day and next start', () => {
  it('knows the last day of a quincena with pay days', () => {
    expect(isClosingDay('2026-10-19', payDays)).toBe(true)
    expect(isClosingDay('2026-10-15', payDays)).toBe(false)
    expect(isClosingDay('2026-10-15')).toBe(true)
    expect(nextQuincenaStart('2026-10-19', payDays)).toBe('2026-10-20')
    expect(nextQuincenaStart('2026-11-04', payDays)).toBe('2026-11-05')
  })
})

describe('previous quincena and history', () => {
  it('walks back through the pay days', () => {
    const previous = previousQuincenaRange(at(2026, 10, 7), payDays)
    expect([todayString(previous.start), todayString(previous.end)]).toEqual([
      '2026-09-20',
      '2026-10-04',
    ])
  })

  it('shows past quincenas as they were lived, across the change', () => {
    const data = [
      tx('2026-09-20', 100),
      tx('2026-10-01', 200),
      tx('2026-10-15', 300),
      tx('2026-10-16', 400),
      tx('2026-10-20', 500),
    ]
    const history = getQuincenaHistory(data, 'CRC', 4, at(2026, 10, 22), [], changed)
    expect(
      history.map(({ start, end, spent }) => [
        todayString(start),
        todayString(end),
        spent,
      ]),
    ).toEqual([
      ['2026-10-20', '2026-11-04', 500],
      ['2026-10-16', '2026-10-19', 400],
      ['2026-10-01', '2026-10-15', 500],
      ['2026-09-16', '2026-09-30', 100],
    ])
  })
})

describe('recurring items', () => {
  const item = (schedule, lastPeriod = null) => ({
    id: 1,
    amount: 100,
    currency: 'CRC',
    type: 'expense',
    categoryId: 1,
    note: '',
    schedule,
    lastPeriod,
  })

  it('"first" and "second" follow the pay days', () => {
    expect(isDue(item('first'), at(2026, 10, 6), payDays)).toBe(true)
    expect(isDue(item('second'), at(2026, 10, 6), payDays)).toBe(false)
    expect(isDue(item('second'), at(2026, 10, 21), payDays)).toBe(true)
    expect(isDue(item('every'), at(2026, 10, 21), payDays)).toBe(true)
  })

  it('a monthly item is due in each quincena when there is one pay day', () => {
    const one = [{ from: '2000-01-01', mode: 'paydays', day1: 25, day2: null }]
    expect(isDue(item('first'), at(2026, 10, 26), one)).toBe(true)
    expect(isDue(item('second'), at(2026, 10, 26), one)).toBe(true)
  })

  it('is not due again once handled in that quincena', () => {
    const today = at(2026, 10, 12)
    const handled = item('every', quincenaKey(today, payDays))
    expect(isDue(handled, today, payDays)).toBe(false)
    expect(isDue(handled, at(2026, 10, 20), payDays)).toBe(true)
  })

  it('a mark written in 15/30 still holds in 15/30', () => {
    expect(isDue(item('first', '2026-10-1'), at(2026, 10, 9))).toBe(false)
    expect(isDue(item('first', '2026-09-1'), at(2026, 10, 9))).toBe(true)
  })

  it('matches a typed bill dated inside the quincena of the pay days', () => {
    const list = [item('every')]
    const bill = { type: 'expense', currency: 'CRC', amount: 100, date: '2026-10-06' }
    expect(findMatchingDue(list, bill, at(2026, 10, 12), payDays)).not.toBeNull()
    expect(
      findMatchingDue(list, { ...bill, date: '2026-10-04' }, at(2026, 10, 12), payDays),
    ).toBeNull()
  })

  it('adds up the pending expenses of the quincena of the pay days', () => {
    expect(pendingTotal([item('second')], 'CRC', at(2026, 10, 6), payDays)).toBe(0)
    expect(pendingTotal([item('second')], 'CRC', at(2026, 10, 21), payDays)).toBe(100)
  })
})

describe('sample data', () => {
  it('stays inside the quincenas of the pay days and never after today', () => {
    const today = at(2026, 10, 7)
    const list = sampleTransactions(today, 'es', payDays)
    for (const entry of list) {
      expect(entry.date <= '2026-10-07').toBe(true)
    }
    const current = list.filter((entry) => entry.date >= '2026-10-05')
    expect(current.length).toBeGreaterThan(0)
  })
})

describe('recurring schedule labels', () => {
  it('say days 1-15 / 16-end in 15/30 and first/second quincena otherwise', async () => {
    const { scheduleKey } = await import('./recurring')
    const today = at(2026, 10, 22)
    expect(scheduleKey('first')).toBe('schedule.first')
    expect(scheduleKey('every', payDays, today)).toBe('schedule.every')
    expect(scheduleKey('first', payDays, today)).toBe('schedule.firstPay')
    expect(scheduleKey('second', payDays, today)).toBe('schedule.secondPay')
    // before the change takes effect the old wording still holds
    expect(scheduleKey('second', changed, at(2026, 10, 7))).toBe('schedule.second')
    expect(scheduleKey('second', changed, today)).toBe('schedule.secondPay')
  })
})
