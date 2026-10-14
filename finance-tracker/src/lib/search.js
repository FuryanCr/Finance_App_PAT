import { categoryLabel, normalize } from './categories'

// filters: { query, type, categoryId }
//   query: text matched against the note and the category name (ignoring
//          case and accents); '' matches everything
//   type: 'all', 'income' or 'expense'
//   categoryId: 'all' or a category id (number)
export function hasFilters({ query, type, categoryId }) {
  return query.trim() !== '' || type !== 'all' || categoryId !== 'all'
}

// The transactions that pass every active filter, in their original order
export function filterTransactions(transactions, filters, categories, t) {
  const { query, type, categoryId } = filters
  const wanted = normalize(query)
  return transactions.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false
    if (categoryId !== 'all' && tx.categoryId !== categoryId) return false
    if (wanted === '') return true
    if (normalize(tx.note ?? '').includes(wanted)) return true
    const category = categories.find((c) => c.id === tx.categoryId)
    return category
      ? normalize(categoryLabel(category, t)).includes(wanted)
      : false
  })
}
