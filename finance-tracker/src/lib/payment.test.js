import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethod,
  normalizePaymentMethod,
  paymentLabel,
  paymentMethods,
  paymentNote,
  totalsByMethod,
} from './payment'

describe('paymentLabel', () => {
  const t = (key) => `T:${key}`

  it('translates each method', () => {
    expect(paymentLabel('cash', t)).toBe('T:payCash')
    expect(paymentLabel('card', t)).toBe('T:payCard')
    expect(paymentLabel('sinpe', t)).toBe('T:paySinpe')
  })

  it('reads a missing or unknown code as cash', () => {
    expect(paymentLabel(undefined, t)).toBe('T:payCash')
    expect(paymentLabel('bitcoin', t)).toBe('T:payCash')
  })
})

describe('paymentNote', () => {
  const t = (key) => `T:${key}`

  it('is empty for cash and for a missing method', () => {
    expect(paymentNote('cash', t)).toBe('')
    expect(paymentNote(undefined, t)).toBe('')
    expect(paymentNote('bitcoin', t)).toBe('')
  })

  it('names card and SINPE', () => {
    expect(paymentNote('card', t)).toBe('T:payCard')
    expect(paymentNote('sinpe', t)).toBe('T:paySinpe')
  })
})

describe('payment methods', () => {
  it('are cash, card and SINPE, with cash as the default', () => {
    expect(paymentMethods.map((method) => method.code)).toEqual([
      'cash',
      'card',
      'sinpe',
    ])
    expect(DEFAULT_PAYMENT_METHOD).toBe('cash')
  })

  it('recognizes only the stored codes', () => {
    expect(isPaymentMethod('card')).toBe(true)
    expect(isPaymentMethod('Card')).toBe(false)
    expect(isPaymentMethod('bitcoin')).toBe(false)
    expect(isPaymentMethod(undefined)).toBe(false)
    expect(isPaymentMethod(null)).toBe(false)
  })

  it('keeps a valid code and falls back to cash for anything else', () => {
    expect(normalizePaymentMethod('sinpe')).toBe('sinpe')
    expect(normalizePaymentMethod(undefined)).toBe('cash')
    expect(normalizePaymentMethod('bitcoin')).toBe('cash')
    expect(normalizePaymentMethod(42)).toBe('cash')
  })
})

describe('totalsByMethod', () => {
  const range = {
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 15, 23, 59, 59),
  }
  const tx = (fields) => ({
    amount: 100,
    currency: 'CRC',
    type: 'expense',
    date: '2026-10-05',
    paymentMethod: 'cash',
    ...fields,
  })
  const byCode = (list) => Object.fromEntries(list.map((m) => [m.code, m]))

  it('always returns the three methods, in order, even with no data', () => {
    const result = totalsByMethod([], range)
    expect(result.map((m) => m.code)).toEqual(['cash', 'card', 'sinpe'])
    expect(result[0].CRC).toEqual({ count: 0, income: 0, spent: 0, net: 0 })
    expect(result[0].USD.count).toBe(0)
  })

  it('groups by method and keeps colones and dollars apart', () => {
    const result = byCode(
      totalsByMethod(
        [
          tx({ amount: 1000 }),
          tx({ amount: 500, paymentMethod: 'card' }),
          tx({ amount: 20.5, currency: 'USD', paymentMethod: 'card' }),
          tx({ amount: 0.1, currency: 'USD', paymentMethod: 'card' }),
          tx({ amount: 0.2, currency: 'USD', paymentMethod: 'card' }),
          tx({ amount: 300, type: 'income', paymentMethod: 'sinpe' }),
        ],
        range,
      ),
    )
    expect(result.cash.CRC.spent).toBe(1000)
    expect(result.card.CRC.spent).toBe(500)
    expect(result.card.USD.spent).toBe(20.8)
    expect(result.card.USD.count).toBe(3)
    expect(result.sinpe.CRC).toMatchObject({ income: 300, spent: 0, net: 300 })
    expect(result.cash.USD.count).toBe(0)
  })

  it('reads a missing or unknown method as cash', () => {
    const result = byCode(
      totalsByMethod(
        [tx({ paymentMethod: undefined }), tx({ paymentMethod: 'cheque' })],
        range,
      ),
    )
    expect(result.cash.CRC.count).toBe(2)
  })

  it('counts only the range, both ends included', () => {
    const result = byCode(
      totalsByMethod(
        [
          tx({ date: '2026-10-01' }),
          tx({ date: '2026-10-15' }),
          tx({ date: '2026-09-30' }),
          tx({ date: '2026-10-16' }),
        ],
        range,
      ),
    )
    expect(result.cash.CRC.count).toBe(2)
  })
})
