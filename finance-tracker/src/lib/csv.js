import { categoryLabel } from './categories'

// Quotes a value when it has a comma, a quote, a line break or outer spaces.
// Text starting with = + - or @ is run as a formula by Excel and Sheets, so
// it gets a leading quote; numbers (the amount column) are left as they are.
function escapeCell(value) {
  const risky = typeof value === 'string' && /^[=+\-@]/.test(value)
  const text = risky ? `'${value}` : String(value)
  if (!/[",\r\n]|^\s|\s$/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

// The BOM at the start makes Excel read accents and ₡ as UTF-8
export function toCsv(rows) {
  return '﻿' + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

// Header plus one row per transaction, in the order given
export function transactionRows(transactions, categories, t) {
  const rows = transactions.map((tx) => {
    const category = categories.find((c) => c.id === tx.categoryId)
    return [
      tx.date,
      tx.type,
      tx.amount,
      tx.currency,
      category ? categoryLabel(category, t) : '',
      tx.note ?? '',
    ]
  })
  return [['date', 'type', 'amount', 'currency', 'category', 'note'], ...rows]
}

// Saves text as a file through a temporary link
export function downloadFile(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // some browsers cancel the download if the URL is revoked right away
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(filename, rows) {
  downloadFile(filename, toCsv(rows), 'text/csv;charset=utf-8')
}
