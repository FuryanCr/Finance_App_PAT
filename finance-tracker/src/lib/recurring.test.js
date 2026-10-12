import { describe, expect, it } from 'vitest'
import { isDue, schedules } from './recurring'

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
