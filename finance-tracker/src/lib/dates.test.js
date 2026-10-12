import { describe, expect, it } from 'vitest'
import {
  byNewest,
  daysBetween,
  daysLeftInQuincena,
  getQuincenaRange,
  isSameMonth,
  isValidDate,
  parseDate,
  quincenaKey,
  todayString,
} from './dates'

describe('getQuincenaRange', () => {
  it('covers day 1 to day 15 on the 1st and the 15th', () => {
    for (const day of [1, 15]) {
      const { start, end } = getQuincenaRange(new Date(2026, 9, day))
      expect([start.getMonth(), start.getDate()]).toEqual([9, 1])
      expect([end.getMonth(), end.getDate()]).toEqual([9, 15])
    }
  })

  it('covers day 16 to the last day in a 31-day month', () => {
    for (const day of [16, 31]) {
      const { start, end } = getQuincenaRange(new Date(2026, 9, day))
      expect([start.getMonth(), start.getDate()]).toEqual([9, 16])
      expect([end.getMonth(), end.getDate()]).toEqual([9, 31])
    }
  })

  it('covers day 16 to the last day in a 30-day month', () => {
    for (const day of [16, 30]) {
      const { start, end } = getQuincenaRange(new Date(2026, 8, day))
      expect([start.getMonth(), start.getDate()]).toEqual([8, 16])
      expect([end.getMonth(), end.getDate()]).toEqual([8, 30])
    }
  })

  it('ends on the 28th in February 2026', () => {
    for (const day of [16, 28]) {
      const { start, end } = getQuincenaRange(new Date(2026, 1, day))
      expect([start.getMonth(), start.getDate()]).toEqual([1, 16])
      expect([end.getMonth(), end.getDate()]).toEqual([1, 28])
    }
  })

  it('ends on the 29th in February 2028', () => {
    for (const day of [16, 29]) {
      const { start, end } = getQuincenaRange(new Date(2028, 1, day))
      expect([start.getMonth(), start.getDate()]).toEqual([1, 16])
      expect([end.getMonth(), end.getDate()]).toEqual([1, 29])
    }
  })

  it('stays inside December and the same year', () => {
    for (const day of [16, 31]) {
      const { start, end } = getQuincenaRange(new Date(2026, 11, day))
      expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([
        2026, 11, 16,
      ])
      expect([end.getFullYear(), end.getMonth(), end.getDate()]).toEqual([
        2026, 11, 31,
      ])
    }
  })

  it('starts at midnight and ends at 23:59:59', () => {
    const { start, end } = getQuincenaRange(new Date(2026, 9, 5, 14, 30))
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([
      0, 0, 0,
    ])
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([
      23, 59, 59,
    ])
  })
})

describe('daysLeftInQuincena', () => {
  it('is 15 on the 1st', () => {
    expect(daysLeftInQuincena(new Date(2026, 9, 1))).toBe(15)
  })

  it('is 1 on the 15th', () => {
    expect(daysLeftInQuincena(new Date(2026, 9, 15))).toBe(1)
  })

  it('is 16 on the 16th of a 31-day month', () => {
    expect(daysLeftInQuincena(new Date(2026, 9, 16))).toBe(16)
  })

  it('is 1 on the last day of any month length', () => {
    expect(daysLeftInQuincena(new Date(2026, 9, 31))).toBe(1)
    expect(daysLeftInQuincena(new Date(2026, 8, 30))).toBe(1)
    expect(daysLeftInQuincena(new Date(2026, 1, 28))).toBe(1)
    expect(daysLeftInQuincena(new Date(2028, 1, 29))).toBe(1)
  })

  it('is 13 on February 16, 2026', () => {
    expect(daysLeftInQuincena(new Date(2026, 1, 16))).toBe(13)
  })

  it('does not depend on the time of day', () => {
    expect(daysLeftInQuincena(new Date(2026, 9, 15, 23, 59))).toBe(1)
  })
})

describe('daysBetween', () => {
  it('is 0 for the same day at any time', () => {
    expect(
      daysBetween(new Date(2026, 9, 12, 0, 0), new Date(2026, 9, 12, 23, 59)),
    ).toBe(0)
  })

  it('counts across a month end', () => {
    expect(daysBetween(new Date(2026, 0, 30), new Date(2026, 1, 2))).toBe(3)
  })

  it('counts across a year end', () => {
    expect(daysBetween(new Date(2026, 11, 30), new Date(2027, 0, 2))).toBe(3)
  })

  it('is negative when b is before a', () => {
    expect(daysBetween(new Date(2026, 9, 12), new Date(2026, 9, 10))).toBe(-2)
  })

  it('counts across a leap day', () => {
    expect(daysBetween(new Date(2028, 1, 28), new Date(2028, 2, 1))).toBe(2)
    expect(daysBetween(new Date(2026, 1, 28), new Date(2026, 2, 1))).toBe(1)
  })
})

describe('isValidDate', () => {
  it('accepts real dates, including a leap day', () => {
    expect(isValidDate('2026-10-12')).toBe(true)
    expect(isValidDate('2028-02-29')).toBe(true)
  })

  it('rejects days that do not exist in the month', () => {
    expect(isValidDate('2026-02-31')).toBe(false)
    expect(isValidDate('2026-04-31')).toBe(false)
    expect(isValidDate('2026-02-29')).toBe(false)
  })

  it('rejects month or day zero and month 13', () => {
    expect(isValidDate('2026-13-01')).toBe(false)
    expect(isValidDate('2026-00-10')).toBe(false)
    expect(isValidDate('2026-01-00')).toBe(false)
  })

  it('rejects text in the wrong format', () => {
    expect(isValidDate('')).toBe(false)
    expect(isValidDate('abc')).toBe(false)
    expect(isValidDate('2026-1-5')).toBe(false)
  })
})

describe('isSameMonth', () => {
  it('is true for the same month and year', () => {
    expect(isSameMonth(new Date(2026, 9, 1), new Date(2026, 9, 31))).toBe(true)
  })

  it('is false for the same month in a different year', () => {
    expect(isSameMonth(new Date(2026, 9, 1), new Date(2025, 9, 1))).toBe(false)
  })

  it('is false for different months', () => {
    expect(isSameMonth(new Date(2026, 9, 1), new Date(2026, 10, 1))).toBe(false)
  })
})

describe('parseDate', () => {
  it('gives a local date at midnight', () => {
    const date = parseDate('2026-10-12')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(9)
    expect(date.getDate()).toBe(12)
    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([
      0, 0, 0,
    ])
  })
})

describe('byNewest', () => {
  it('sorts by date, newest first', () => {
    const list = [
      { id: 1, date: '2026-10-01' },
      { id: 2, date: '2026-10-03' },
      { id: 3, date: '2026-09-30' },
    ]
    expect(list.sort(byNewest).map((tx) => tx.id)).toEqual([2, 1, 3])
  })

  it('sorts by id, highest first, within the same date', () => {
    const list = [
      { id: 4, date: '2026-10-01' },
      { id: 9, date: '2026-10-01' },
      { id: 7, date: '2026-10-01' },
    ]
    expect(list.sort(byNewest).map((tx) => tx.id)).toEqual([9, 7, 4])
  })

  it('compares ids as numbers, not text', () => {
    const list = [
      { id: 9, date: '2026-10-01' },
      { id: 10, date: '2026-10-01' },
    ]
    expect(list.sort(byNewest).map((tx) => tx.id)).toEqual([10, 9])
  })
})

describe('todayString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(todayString(new Date(2026, 9, 12))).toBe('2026-10-12')
  })

  it('pads the month and the day with zeros', () => {
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('ignores the time of day', () => {
    expect(todayString(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12')
  })
})

describe('quincenaKey', () => {
  it('ends in 1 on the 1st and the 15th', () => {
    expect(quincenaKey(new Date(2026, 9, 1))).toBe('2026-10-1')
    expect(quincenaKey(new Date(2026, 9, 15))).toBe('2026-10-1')
  })

  it('ends in 2 on the 16th and the last day of the month', () => {
    expect(quincenaKey(new Date(2026, 9, 16))).toBe('2026-10-2')
    expect(quincenaKey(new Date(2026, 9, 31))).toBe('2026-10-2')
    expect(quincenaKey(new Date(2026, 1, 28))).toBe('2026-02-2')
  })

  it('pads the month with a zero', () => {
    expect(quincenaKey(new Date(2026, 0, 10))).toBe('2026-01-1')
  })

  it('works in December', () => {
    expect(quincenaKey(new Date(2026, 11, 20))).toBe('2026-12-2')
  })
})
