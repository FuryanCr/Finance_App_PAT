import { categoryLabel } from './categories'

// Quotes a value when it has a comma, a quote, a line break or outer spaces
function escapeCell(value) {
  const text = String(value)
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

export function downloadCsv(filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
