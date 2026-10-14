import { describe, expect, it } from 'vitest'
import { getQuincenaRange } from './dates'
import { closeQuincena, lateAdjustment, openingCarry } from './closure'

const tx = (date, amount, type = 'expense', currency = 'CRC') => ({
  id: Math.random(),
  date,
  amount,
  type,
  currency,
  categoryId: null,
  note: '',
})
const move = (date, amount, direction = 'in', currency = 'CRC') => ({
  id: Math.random(),
  date,
  amount,
  direction,
  currency,
  note: '',
})
const data = (transactions = [], savings = []) => ({ transactions, savings })

// first half of October 2026 (1 to 15), closed on the 20th
const october1 = getQuincenaRange(new Date(2026, 9, 10))
const october2 = getQuincenaRange(new Date(2026, 9, 20))
const onThe20th = new Date(2026, 9, 20)

describe('closeQuincena', () => {
  it('summarizes income, spent, savings and leftover of a finished quincena', () => {
    const closure = closeQuincena(
      data(
        [
          tx('2026-10-01', 250000, 'income'),
          tx('2026-10-05', 80000),
          tx('2026-10-09', 20000),
        ],
        [move('2026-10-10', 30000, 'in'), move('2026-10-12', 5000, 'out')],
      ),
      'CRC',
      october1,
      0,
      onThe20th,
    )
    expect(closure).toMatchObject({
      code: 'CRC',
      start: '2026-10-01',
      end: '2026-10-15',
      income: 250000,
      spent: 100000,
      toSavings: 30000,
      fromSavings: 5000,
      closingIncome: 0,
      leftover: 125000,
      carryIn: 0,
      carryOut: 125000,
      adjusted: 0,
    })
  })

  it('does not close a quincena that has not ended', () => {
    expect(
      closeQuincena(data(), 'CRC', october2, 0, new Date(2026, 9, 31)),
    ).toBeNull()
    // the day after the end it can be closed
    expect(
      closeQuincena(data(), 'CRC', october2, 0, new Date(2026, 10, 1)),
    ).not.toBeNull()
  })

  it('carries the previous closure forward', () => {
    const closure = closeQuincena(
      data([tx('2026-10-20', 40000)]),
      'CRC',
      october2,
      125000,
      new Date(2026, 10, 2),
    )
    expect(closure.leftover).toBe(-40000)
    expect(closure.carryOut).toBe(85000)
  })

  // Case 1: income dated on the closing day
  describe('income dated on the closing day', () => {
    const closure = closeQuincena(
      data([
        tx('2026-10-01', 250000, 'income'),
        tx('2026-10-15', 300000, 'income'),
        tx('2026-10-08', 100000),
      ]),
      'CRC',
      october1,
      0,
      onThe20th,
    )

    it('is not counted as leftover of the quincena that closes', () => {
      expect(closure.income).toBe(550000)
      expect(closure.closingIncome).toBe(300000)
      expect(closure.leftover).toBe(150000)
    })

    it('is not lost: it is carried to the next quincena', () => {
      expect(closure.carryOut).toBe(450000)
    })

    it('only counts the closing day of that currency', () => {
      const mixed = closeQuincena(
        data([tx('2026-10-15', 50, 'income', 'USD')]),
        'CRC',
        october1,
        0,
        onThe20th,
      )
      expect(mixed.closingIncome).toBe(0)
      expect(mixed.carryOut).toBe(0)
    })

    it('does not treat an income of the 14th as closing-day income', () => {
      const early = closeQuincena(
        data([tx('2026-10-14', 300000, 'income')]),
        'CRC',
        october1,
        0,
        onThe20th,
      )
      expect(early.closingIncome).toBe(0)
      expect(early.leftover).toBe(300000)
    })
  })

  // Case 3: a dollar card that ends negative
  describe('a dollar balance that ends negative', () => {
    const wallet = data([
      tx('2026-10-04', 50, 'expense', 'USD'),
      tx('2026-10-05', 9.99, 'expense', 'USD'),
      tx('2026-10-01', 250000, 'income'),
    ])
    const usd = closeQuincena(wallet, 'USD', october1, 0, onThe20th)
    const crc = closeQuincena(wallet, 'CRC', october1, 0, onThe20th)

    it('closes as a deficit in dollars, with cents kept', () => {
      expect(usd.leftover).toBe(-59.99)
      expect(usd.carryOut).toBe(-59.99)
    })

    it('does not touch the colones closure', () => {
      expect(crc.leftover).toBe(250000)
      expect(crc.carryOut).toBe(250000)
    })

    it('enters the next quincena as a dollar debt, never as colones', () => {
      const closures = [usd, crc]
      expect(openingCarry(closures, wallet, 'USD').total).toBe(-59.99)
      expect(openingCarry(closures, wallet, 'CRC').total).toBe(250000)
    })
  })
})

// Case 2: an expense entered late, dated in a quincena already closed
describe('late entries in a closed quincena', () => {
  const base = data([
    tx('2026-10-01', 250000, 'income'),
    tx('2026-10-05', 100000),
  ])
  const closure = closeQuincena(base, 'CRC', october1, 0, onThe20th)

  it('leaves the frozen summary as it was', () => {
    const later = data([...base.transactions, tx('2026-10-14', 20000)])
    expect(closure.spent).toBe(100000)
    expect(closure.leftover).toBe(150000)
    // the closure object is a snapshot: new data does not rewrite it
    expect(lateAdjustment(closure, later)).toBe(-20000)
    expect(closure.leftover).toBe(150000)
  })

  it('has no adjustment when nothing was added', () => {
    expect(lateAdjustment(closure, base)).toBe(0)
  })

  it('charges a late expense to the open quincena', () => {
    const later = data([...base.transactions, tx('2026-10-14', 20000)])
    const opening = openingCarry([closure], later, 'CRC')
    expect(opening).toEqual({ carry: 150000, late: -20000, total: 130000 })
  })

  it('credits a late income', () => {
    const later = data([...base.transactions, tx('2026-10-13', 7000, 'income')])
    expect(lateAdjustment(closure, later)).toBe(7000)
  })

  it('counts a late savings move', () => {
    const later = data(base.transactions, [move('2026-10-12', 10000, 'in')])
    expect(lateAdjustment(closure, later)).toBe(-10000)
  })

  it('does not count the same adjustment twice once it is absorbed', () => {
    const later = data([...base.transactions, tx('2026-10-14', 20000)])
    const absorbed = { ...closure, adjusted: -20000 }
    expect(lateAdjustment(absorbed, later)).toBe(0)
    // a second late expense still shows up
    const again = data([...later.transactions, tx('2026-10-15', 3000)])
    expect(lateAdjustment(absorbed, again)).toBe(-3000)
  })

  it('ignores entries dated outside the closed quincena', () => {
    const outside = data([...base.transactions, tx('2026-10-20', 9999)])
    expect(lateAdjustment(closure, outside)).toBe(0)
  })
})

describe('openingCarry', () => {
  it('is zero when there is no closure of that currency', () => {
    expect(openingCarry([], data(), 'CRC')).toEqual({
      carry: 0,
      late: 0,
      total: 0,
    })
  })

  it('uses the latest closure, not the sum of all of them', () => {
    const first = closeQuincena(
      data([tx('2026-10-01', 100000, 'income')]),
      'CRC',
      october1,
      0,
      new Date(2026, 10, 2),
    )
    const second = closeQuincena(
      data([tx('2026-10-01', 100000, 'income'), tx('2026-10-20', 30000)]),
      'CRC',
      october2,
      first.carryOut,
      new Date(2026, 10, 2),
    )
    const all = data([tx('2026-10-01', 100000, 'income'), tx('2026-10-20', 30000)])
    // given out of order on purpose
    expect(openingCarry([second, first], all, 'CRC').carry).toBe(70000)
  })
})
