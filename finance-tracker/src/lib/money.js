export function sum(amounts) {
  const total = amounts.reduce((a, b) => a + b, 0)
  return Math.round(total * 100) / 100
}

// CRC: ₡1.800.000 | USD: $1,234.50
export function formatMoney(amount, currency = 'CRC') {
  if (currency === 'USD') {
    return (
      '$' +
      amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  }
  return '₡' + amount.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}