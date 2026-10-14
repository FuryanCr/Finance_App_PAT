import { parseDate } from './dates'
import { currencies, getTotals } from './money'

// How a transaction was paid. The codes are what is stored (migration v5) and
// what a backup carries; labelKey is the translation of the name on screen.
export const paymentMethods = [
  { code: 'cash', labelKey: 'payCash' },
  { code: 'card', labelKey: 'payCard' },
  { code: 'sinpe', labelKey: 'paySinpe' },
]

// What old rows, old backups and anything that does not say it are read as
export const DEFAULT_PAYMENT_METHOD = 'cash'

export function isPaymentMethod(value) {
  return paymentMethods.some((method) => method.code === value)
}

// A valid code stays; anything else (missing, misspelled, from a newer
// version) becomes the default, so a record is never lost over this field
export function normalizePaymentMethod(value) {
  return isPaymentMethod(value) ? value : DEFAULT_PAYMENT_METHOD
}

// Small text for a list row: the method when it is not cash, so the lists
// are not full of the default. Empty for cash.
export function paymentNote(value, t) {
  return normalizePaymentMethod(value) === DEFAULT_PAYMENT_METHOD
    ? ''
    : paymentLabel(value, t)
}

// The name on screen (or in a CSV) of a stored code; t translates the key
export function paymentLabel(value, t) {
  const code = normalizePaymentMethod(value)
  return t(paymentMethods.find((method) => method.code === code).labelKey)
}

// What each payment method moved inside a date range (both ends included).
// One entry per method, always, in the order of paymentMethods; each carries
// the totals per currency, never mixed: { code, labelKey, CRC, USD } where
// every currency is { count, income, spent, net }.
export function totalsByMethod(transactions, { start, end }) {
  const inRange = transactions.filter((tx) => {
    const date = parseDate(tx.date)
    return date >= start && date <= end
  })
  return paymentMethods.map(({ code, labelKey }) => {
    const own = inRange.filter(
      (tx) => normalizePaymentMethod(tx.paymentMethod) === code,
    )
    const entry = { code, labelKey }
    for (const currency of currencies) {
      entry[currency.code] = getTotals(own, currency.code)
    }
    return entry
  })
}
