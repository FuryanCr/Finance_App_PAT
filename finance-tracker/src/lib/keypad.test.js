import { describe, expect, it } from 'vitest'
import { applyKey, formatTyping, keypadKeys } from './keypad'

const type = (keys, currency = 'CRC', start = '') =>
  keys.reduce((text, key) => applyKey(text, key, currency), start)

describe('keypadKeys', () => {
  it('has 000 for colones and the decimal point for dollars', () => {
    expect(keypadKeys('CRC')).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫',
    ])
    expect(keypadKeys('USD')).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫',
    ])
  })
})

describe('applyKey', () => {
  it('types digits one after another', () => {
    expect(type(['3', '6', '0', '0'])).toBe('3600')
  })

  it('000 adds three zeros', () => {
    expect(type(['3', '6', '000'])).toBe('36000')
    expect(type(['1', '000', '000'])).toBe('1000000')
  })

  it('000 does nothing on an empty or zero amount', () => {
    expect(type(['000'])).toBe('')
    expect(type(['0', '000'])).toBe('0')
  })

  it('does not keep a leading zero', () => {
    expect(type(['0', '5'])).toBe('5')
    expect(type(['0', '0', '0'])).toBe('0')
  })

  it('backspace removes the last digit and is safe on empty', () => {
    expect(type(['1', '2', '⌫'])).toBe('1')
    expect(type(['⌫', '⌫'])).toBe('')
    expect(type(['1', '2', '3', '000', '⌫'])).toBe('12300')
  })

  it('dollars take one point and two decimals', () => {
    expect(type(['.'], 'USD')).toBe('0.')
    expect(type(['9', '.', '9', '9'], 'USD')).toBe('9.99')
    expect(type(['9', '.', '9', '9', '9'], 'USD')).toBe('9.99')
    expect(type(['9', '.', '.', '5'], 'USD')).toBe('9.5')
    expect(type(['1', '.', '5', '000'], 'USD')).toBe('1.5')
  })

  it('colones ignore the point and the comma', () => {
    expect(type(['1', '.', '5', '0', '0'])).toBe('1500')
    expect(type(['1', ',', '5'])).toBe('15')
  })

  it('stops at the cap', () => {
    expect(type(['1', '000', '000', '000'])).toBe('1000000000')
    expect(type(['1', '000', '000', '000', '0'])).toBe('1000000000')
    expect(type(['9', '9', '9', '9', '9', '9', '9', '9', '9', '9'])).toBe(
      '999999999',
    )
    expect(type(['9', '9', '9', '000', '000', '000'])).toBe('999000000')
  })

  it('ignores keys it does not know', () => {
    expect(applyKey('12', 'a', 'CRC')).toBe('12')
    expect(applyKey('12', 'Enter', 'CRC')).toBe('12')
    expect(applyKey('12', '-', 'CRC')).toBe('12')
    expect(applyKey('12', '٣', 'CRC')).toBe('12')
  })
})

describe('formatTyping', () => {
  it.each([
    ['', 'CRC', ''],
    ['0', 'CRC', '0'],
    ['36', 'CRC', '36'],
    ['3600', 'CRC', '3.600'],
    ['1800000', 'CRC', '1.800.000'],
    ['1000000000', 'CRC', '1.000.000.000'],
    ['8500.5', 'CRC', '8.500,5'],
    ['3600', 'USD', '3,600'],
    ['1234.5', 'USD', '1,234.5'],
    ['0.', 'USD', '0.'],
    ['12.', 'USD', '12.'],
    ['0.05', 'USD', '0.05'],
  ])('shows %s (%s) as %s', (text, currency, shown) => {
    expect(formatTyping(text, currency)).toBe(shown)
  })
})
