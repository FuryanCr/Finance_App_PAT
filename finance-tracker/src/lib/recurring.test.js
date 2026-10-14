import { describe, expect, it } from 'vitest'
import {
  findMatchingDue,
  isDue,
  isHandled,
  pendingTotal,
  schedules,
} from './recurring'

// 2026-10-05 is in the first quincena, 2026-10-20 in the second
const first = new Date(2026, 9, 5)
const second = new Date(2026, 9, 20)

const item = (schedule, lastPeriod = null) => ({ schedule, lastPeriod })

describe('schedules', () => {
  it('has every, first and second', () => {
    expect(schedules).toEqual(['every', 'first', 'second'])
  })
})

describe('isDue', () => {
  it('is due every quincena for "every"', () => {
    expect(isDue(item('every'), first)).toBe(true)
    expect(isDue(item('every'), second)).toBe(true)
  })

  it('is due only in the first quincena for "first"', () => {
    expect(isDue(item('first'), first)).toBe(true)
    expect(isDue(item('first'), second)).toBe(false)
  })

  it('is due only in the second quincena for "second"', () => {
    expect(isDue(item('second'), first)).toBe(false)
    expect(isDue(item('second'), second)).toBe(true)
  })

  it('uses the 15th and the 16th as the boundary', () => {
    expect(isDue(item('first'), new Date(2026, 9, 15))).toBe(true)
    expect(isDue(item('first'), new Date(2026, 9, 16))).toBe(false)
    expect(isDue(item('second'), new Date(2026, 9, 16))).toBe(true)
  })

  it('is not due once handled in the current quincena', () => {
    expect(isDue(item('every', '2026-10-1'), first)).toBe(false)
    expect(isDue(item('first', '2026-10-1'), first)).toBe(false)
    expect(isDue(item('every', '2026-10-2'), second)).toBe(false)
    expect(isDue(item('second', '2026-10-2'), second)).toBe(false)
  })

  it('is due again in the next quincena', () => {
    expect(isDue(item('every', '2026-10-1'), second)).toBe(true)
    expect(isDue(item('every', '2026-10-2'), new Date(2026, 10, 3))).toBe(true)
  })

  it('is due in the same quincena of the next month', () => {
    expect(isDue(item('first', '2026-10-1'), new Date(2026, 10, 5))).toBe(true)
  })
})

describe('isHandled', () => {
  it('is handled when confirmed or skipped in the current quincena', () => {
    expect(isHandled(item('first', '2026-10-1'), first)).toBe(true)
    expect(isHandled(item('every', '2026-10-2'), second)).toBe(true)
  })

  it('is not handled while it is still due', () => {
    expect(isHandled(item('every'), first)).toBe(false)
  })

  it('is not handled when the last period is a previous quincena', () => {
    expect(isHandled(item('every', '2026-09-2'), first)).toBe(false)
  })

  it('is not handled when the schedule skips the current quincena', () => {
    expect(isHandled(item('first', '2026-10-2'), second)).toBe(false)
  })
})

describe('pendingTotal', () => {
  const bill = (overrides) => ({
    type: 'expense',
    currency: 'CRC',
    amount: 100,
    schedule: 'every',
    lastPeriod: null,
    ...overrides,
  })

  it('adds up the due expenses of one currency', () => {
    const list = [bill({ amount: 100 }), bill({ amount: 50.25 })]
    expect(pendingTotal(list, 'CRC', first)).toBe(150.25)
  })

  it('leaves out items that are not due in this quincena', () => {
    const list = [bill({ amount: 100 }), bill({ schedule: 'second', amount: 70 })]
    expect(pendingTotal(list, 'CRC', first)).toBe(100)
    expect(pendingTotal(list, 'CRC', second)).toBe(170)
  })

  it('does not count income', () => {
    const list = [bill({ amount: 100 }), bill({ type: 'income', amount: 900 })]
    expect(pendingTotal(list, 'CRC', first)).toBe(100)
  })

  it('does not count other currencies', () => {
    const list = [bill({ amount: 100 }), bill({ currency: 'USD', amount: 20 })]
    expect(pendingTotal(list, 'CRC', first)).toBe(100)
    expect(pendingTotal(list, 'USD', first)).toBe(20)
  })

  it('does not count items already handled this quincena', () => {
    const list = [bill({ amount: 100, lastPeriod: '2026-10-1' }), bill({ amount: 5 })]
    expect(pendingTotal(list, 'CRC', first)).toBe(5)
  })

  it('is 0 for an empty list', () => {
    expect(pendingTotal([], 'CRC', first)).toBe(0)
  })
})

describe('findMatchingDue', () => {
  const bill = (overrides) => ({
    id: 1,
    type: 'expense',
    currency: 'CRC',
    amount: 45000,
    schedule: 'every',
    lastPeriod: null,
    ...overrides,
  })
  const typed = (overrides) => ({
    type: 'expense',
    currency: 'CRC',
    amount: 45000,
    date: '2026-10-05',
    ...overrides,
  })

  it('finds the due item with the same type, currency and amount', () => {
    const item = bill()
    expect(findMatchingDue([item], typed(), first)).toBe(item)
  })

  it('returns null when the amount, currency or type differs', () => {
    expect(findMatchingDue([bill()], typed({ amount: 45001 }), first)).toBeNull()
    expect(findMatchingDue([bill()], typed({ currency: 'USD' }), first)).toBeNull()
    expect(findMatchingDue([bill()], typed({ type: 'income' }), first)).toBeNull()
  })

  it('returns null for an item already handled this quincena', () => {
    const list = [bill({ lastPeriod: '2026-10-1' })]
    expect(findMatchingDue(list, typed(), first)).toBeNull()
  })

  it('returns null for an item not scheduled for this half of the month', () => {
    expect(findMatchingDue([bill({ schedule: 'second' })], typed(), first)).toBeNull()
  })

  it('returns null when the transaction is dated in another quincena', () => {
    expect(findMatchingDue([bill()], typed({ date: '2026-10-20' }), first)).toBeNull()
    expect(findMatchingDue([bill()], typed({ date: '2026-09-05' }), first)).toBeNull()
  })

  it('matches amounts that differ only by float noise', () => {
    const item = bill({ amount: 0.3 })
    expect(findMatchingDue([item], typed({ amount: 0.1 + 0.2 }), first)).toBe(item)
  })

  it('returns the first of several candidates', () => {
    const a = bill({ id: 1 })
    const b = bill({ id: 2 })
    expect(findMatchingDue([a, b], typed(), first)).toBe(a)
  })
})
