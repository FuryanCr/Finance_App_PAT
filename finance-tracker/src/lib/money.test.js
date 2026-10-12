import { describe, expect, it } from 'vitest'
import {
  currencies,
  formatMoney,
  getTotals,
  laterTotal,
  parseAmount,
  safePerDay,
  sum,
} from './money'

describe('sum', () => {
  it('returns 0 for an empty list', () => {
    expect(sum([])).toBe(0)
  })

  it('adds 0.1 and 0.2 to exactly 0.3', () => {
    expect(sum([0.1, 0.2])).toBe(0.3)
  })

  it('handles negative values', () => {
    expect(sum([-5, 2, -1.5])).toBe(-4.5)
  })

  it('rounds to 2 decimals', () => {
    expect(sum([1.005, 1.114])).toBe(2.12)
    expect(sum([0.001])).toBe(0)
  })
})

describe('getTotals', () => {
  const transactions = [
    { id: 1, amount: 1000, currency: 'CRC', type: 'income' },
    { id: 2, amount: 300, currency: 'CRC', type: 'expense' },
    { id: 3, amount: 200.5, currency: 'CRC', type: 'expense' },
    { id: 4, amount: 50, currency: 'USD', type: 'income' },
    { id: 5, amount: 9.99, currency: 'USD', type: 'expense' },
  ]

  it('totals the CRC transactions only', () => {
    expect(getTotals(transactions, 'CRC')).toEqual({
      count: 3,
      income: 1000,
      spent: 500.5,
      net: 499.5,
    })
  })

  it('totals the USD transactions only', () => {
    expect(getTotals(transactions, 'USD')).toEqual({
      count: 2,
      income: 50,
      spent: 9.99,
      net: 40.01,
    })
  })

  it('gives all zeros for a currency with no transactions', () => {
    expect(getTotals([transactions[0]], 'USD')).toEqual({
      count: 0,
      income: 0,
      spent: 0,
      net: 0,
    })
  })
})

describe('safePerDay', () => {
  it('keeps cents for USD', () => {
    expect(safePerDay(0.29, 1, 'USD')).toBe(0.29)
    expect(safePerDay(4.35, 1, 'USD')).toBe(4.35)
    expect(safePerDay(8.2, 2, 'USD')).toBe(4.1)
  })

  it('rounds USD down to the cent', () => {
    expect(safePerDay(10, 3, 'USD')).toBe(3.33)
    expect(safePerDay(90.01, 4, 'USD')).toBe(22.5)
  })

  it('gives whole colones for CRC', () => {
    expect(safePerDay(174900, 4, 'CRC')).toBe(43725)
  })

  it('rounds CRC down', () => {
    expect(safePerDay(100, 3, 'CRC')).toBe(33)
  })
})

describe('formatMoney', () => {
  it('formats colones with dots for thousands', () => {
    expect(formatMoney(1800000)).toBe('₡1.800.000')
    expect(formatMoney(1800000, 'CRC')).toBe('₡1.800.000')
  })

  it('formats dollars with commas and two decimals', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('formats zero in both currencies', () => {
    expect(formatMoney(0, 'CRC')).toBe('₡0')
    expect(formatMoney(0, 'USD')).toBe('$0.00')
  })

  it('puts the minus sign before the symbol', () => {
    expect(formatMoney(-31000, 'CRC')).toBe('−₡31.000')
    expect(formatMoney(-9.99, 'USD')).toBe('−$9.99')
  })
})

describe('currencies', () => {
  it('has CRC and USD with their symbols', () => {
    expect(currencies.map((c) => [c.code, c.symbol])).toEqual([
      ['CRC', '₡'],
      ['USD', '$'],
    ])
  })
})

describe('parseAmount', () => {
  it('reads empty text as 0', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('   ')).toBe(0)
  })

  it('reads zero as 0', () => {
    expect(parseAmount('0')).toBe(0)
  })

  it('reads decimals with a dot or a comma', () => {
    expect(parseAmount('12.5')).toBe(12.5)
    expect(parseAmount('12,5')).toBe(12.5)
  })

  it('ignores spaces around the number', () => {
    expect(parseAmount(' 7 ')).toBe(7)
  })

  it('rounds to cents', () => {
    expect(parseAmount('100.555')).toBe(100.56)
  })

  it('is null below one cent', () => {
    expect(parseAmount('0.001')).toBeNull()
  })

  it('is null for negative amounts', () => {
    expect(parseAmount('-1')).toBeNull()
  })

  it('is null when it is not a finite number', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('Infinity')).toBeNull()
    expect(parseAmount('1e999')).toBeNull()
  })
})

describe('laterTotal', () => {
  const today = new Date(2026, 9, 12, 15, 0)
  const tx = (date, amount, type = 'expense', currency = 'CRC') => ({
    date,
    amount,
    type,
    currency,
  })

  it('does not count an expense dated today', () => {
    expect(laterTotal([tx('2026-10-12', 500)], 'CRC', today)).toBe(0)
  })

  it('counts an expense dated tomorrow', () => {
    expect(laterTotal([tx('2026-10-13', 500)], 'CRC', today)).toBe(500)
  })

  it('does not count income', () => {
    expect(laterTotal([tx('2026-10-14', 500, 'income')], 'CRC', today)).toBe(0)
  })

  it('does not count another currency', () => {
    expect(
      laterTotal([tx('2026-10-14', 5, 'expense', 'USD')], 'CRC', today),
    ).toBe(0)
  })

  it('is 0 for an empty list', () => {
    expect(laterTotal([], 'CRC', today)).toBe(0)
  })

  it('does not count past expenses', () => {
    expect(laterTotal([tx('2026-10-11', 500)], 'CRC', today)).toBe(0)
  })

  it('rounds like sum', () => {
    expect(
      laterTotal([tx('2026-10-13', 0.1), tx('2026-10-15', 0.2)], 'CRC', today),
    ).toBe(0.3)
  })
})
