import { describe, expect, it } from 'vitest'
import { getQuincenaRange, isValidDate, parseDate } from './dates'
import { isValidAmount } from './money'
import { sampleTransactions } from './sample'

// every kind of day in a quincena, including first, 15th, 16th and month end
const days = [
  new Date(2026, 9, 1),
  new Date(2026, 9, 13),
  new Date(2026, 9, 15),
  new Date(2026, 9, 16),
  new Date(2026, 9, 31),
  new Date(2026, 1, 28),
  new Date(2028, 1, 29),
  new Date(2027, 0, 1),
]

describe('sampleTransactions', () => {
  it.each(days.map((d) => [d.toDateString(), d]))(
    'is valid and never in the future on %s',
    (_, today) => {
      const list = sampleTransactions(today, 'es')
      expect(list).toHaveLength(15)
      for (const tx of list) {
        expect(isValidDate(tx.date)).toBe(true)
        expect(parseDate(tx.date) <= today).toBe(true)
        expect(isValidAmount(tx.amount)).toBe(true)
        expect(['CRC', 'USD']).toContain(tx.currency)
        expect([null, 1, 2, 3, 4]).toContain(tx.categoryId)
        if (tx.type === 'income') expect(tx.categoryId).toBeNull()
      }
    },
  )

  it('puts the pay and some spending in the current quincena', () => {
    const today = new Date(2026, 9, 13)
    const { start, end } = getQuincenaRange(today)
    const current = sampleTransactions(today, 'es').filter((tx) => {
      const date = parseDate(tx.date)
      return date >= start && date <= end
    })
    expect(current.some((tx) => tx.type === 'income' && tx.currency === 'CRC')).toBe(true)
    expect(current.some((tx) => tx.type === 'expense')).toBe(true)
    expect(current.some((tx) => tx.currency === 'USD')).toBe(true)
  })

  it('has its notes in Spanish by default and in English on request', () => {
    const today = new Date(2026, 9, 13)
    const es = sampleTransactions(today).map((tx) => tx.note)
    const en = sampleTransactions(today, 'en').map((tx) => tx.note)
    expect(es).toContain('Sueldo')
    expect(es).toContain('Supermercado')
    expect(en).toContain('Pay')
    expect(en).toContain('Groceries')
    expect(es).not.toContain('Pay')
    // nothing in English leaks into the Spanish notes
    for (const word of ['Lunch', 'Dinner', 'Groceries', 'Streaming', 'Cinema', 'Water bill', 'Electricity', 'Restaurant', 'Concert']) {
      expect(es).not.toContain(word)
    }
  })

  it('falls back to Spanish for an unknown language', () => {
    expect(sampleTransactions(new Date(2026, 9, 13), 'fr')[0].note).toBe('Sueldo')
  })
})
