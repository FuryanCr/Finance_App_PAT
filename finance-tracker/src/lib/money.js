export const currencies = [
  { code: 'CRC', symbol: '₡', labelKey: 'colones' },
  { code: 'USD', symbol: '$', labelKey: 'dollars' },
]

export function sum(amounts) {
  const total = amounts.reduce((a, b) => a + b, 0)
  return Math.round(total * 100) / 100
}

// Income, spent and net of the transactions in one currency
export function getTotals(transactions, code) {
  const list = transactions.filter((tx) => tx.currency === code)
  const income = sum(
    list.filter((tx) => tx.type === 'income').map((tx) => tx.amount),
  )
  const spent = sum(
    list.filter((tx) => tx.type === 'expense').map((tx) => tx.amount),
  )
  return { count: list.length, income, spent, net: sum([income, -spent]) }
}

// What is left split over the remaining days, rounded down so it stays safe:
// whole colones, or cents for dollars
export function safePerDay(net, days, code) {
  const cents = Math.floor(Math.round(net * 100) / days)
  return code === 'USD' ? cents / 100 : Math.floor(cents / 100)
}

// Empty means 0; null means the text is not a valid amount (not a number,
// negative, or a positive amount below one cent).
// The result is rounded to cents.
export function parseAmount(text) {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  const value = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(value) || value < 0) return null
  const rounded = Math.round(value * 100) / 100
  return value > 0 && rounded === 0 ? null : rounded
}

// CRC: ₡1.800.000 | USD: $1,234.50 | negative: −₡31.000
export function formatMoney(amount, currency = 'CRC') {
  const sign = amount < 0 ? '−' : ''
  const value = Math.abs(amount)
  if (currency === 'USD') {
    return (
      sign +
      '$' +
      value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  }
  return sign + '₡' + value.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}
