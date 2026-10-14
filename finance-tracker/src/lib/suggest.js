import { normalize } from './categories'
import { byNewest } from './dates'

// Past notes that match what is being typed, most recently used first.
// Each suggestion carries the category it was last used with.
export function suggestNotes(transactions, query, type, limit = 4) {
  const wanted = normalize(query)
  if (wanted === '') return []

  const seen = new Set()
  const suggestions = []
  const candidates = transactions
    .filter((tx) => tx.type === type && tx.note.trim() !== '')
    .sort(byNewest)

  for (const tx of candidates) {
    const key = normalize(tx.note)
    if (seen.has(key)) continue
    seen.add(key)
    if (key === wanted || !key.includes(wanted)) continue
    suggestions.push({ note: tx.note, categoryId: tx.categoryId })
    if (suggestions.length === limit) break
  }
  return suggestions
}
