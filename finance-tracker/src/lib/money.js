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
