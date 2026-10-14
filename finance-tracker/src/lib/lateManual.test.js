import { describe, expect, it } from 'vitest'
import { daysLeftInQuincena } from './dates'
import { isClosingDay } from './quincena'

// A manual quincena whose next payment was never registered
const schedule = [
  { from: '2000-01-01', mode: 'fixed', day1: 1, day2: 16 },
  { from: '2026-10-01', mode: 'manual', day1: 1, day2: null },
]

describe('a manual quincena that is late', () => {
  it('spreads the money over 15 days instead of calling every day the last one', () => {
    expect(daysLeftInQuincena(new Date(2026, 9, 5), schedule)).toBe(11)
    // day 15 is the last expected day
    expect(daysLeftInQuincena(new Date(2026, 9, 15), schedule)).toBe(1)
    // the payment is late: no known end
    expect(daysLeftInQuincena(new Date(2026, 9, 20), schedule)).toBe(15)
    expect(daysLeftInQuincena(new Date(2026, 10, 3), schedule)).toBe(15)
  })

  it('is not a closing day, so incomes dated later are not told to move', () => {
    expect(isClosingDay('2026-10-20', schedule)).toBe(false)
    expect(isClosingDay('2026-10-15', schedule)).toBe(false)
    // a closed manual quincena does have one
    const closed = [...schedule, { from: '2026-10-16', mode: 'manual', day1: 1, day2: null }]
    expect(isClosingDay('2026-10-15', closed)).toBe(true)
  })
})
