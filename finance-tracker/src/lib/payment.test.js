import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethod,
  normalizePaymentMethod,
  paymentLabel,
  paymentMethods,
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
