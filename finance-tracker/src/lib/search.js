import { categoryLabel, normalize } from './categories'
import { normalizePaymentMethod } from './payment'

// filters: { query, type, categoryId, method }
//   query: text matched against the note and the category name (ignoring
//          case and accents); '' matches everything
//   type: 'all', 'income' or 'expense'
//   categoryId: 'all' or a category id (number)
//   method: 'all' or a payment method code; missing reads as 'all'
export function hasFilters({ query, type, categoryId, method = 'all' }) {
  return (
    query.trim() !== '' ||
    type !== 'all' ||
    categoryId !== 'all' ||
    method !== 'all'
  )
}

// The transactions that pass every active filter, in their original order
export function filterTransactions(transactions, filters, categories, t) {
  const { query, type, categoryId, method = 'all' } = filters
  const wanted = normalize(query)
  return transactions.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false
    if (categoryId !== 'all' && tx.categoryId !== categoryId) return false
    if (method !== 'all' && normalizePaymentMethod(tx.paymentMethod) !== method)
      return false
    if (wanted === '') return true
    if (normalize(tx.note ?? '').includes(wanted)) return true
    const category = categories.find((c) => c.id === tx.categoryId)
    return category
      ? normalize(categoryLabel(category, t)).includes(wanted)
      : false
  })
}
