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

// The name on screen (or in a CSV) of a stored code; t translates the key
export function paymentLabel(value, t) {
  const code = normalizePaymentMethod(value)
  return t(paymentMethods.find((method) => method.code === code).labelKey)
}
