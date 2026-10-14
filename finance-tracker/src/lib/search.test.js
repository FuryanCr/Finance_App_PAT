import { describe, expect, it } from 'vitest'
import { filterTransactions, hasFilters } from './search'

const t = (key) => ({ 'category.food': 'Food' })[key] ?? key
const categories = [
  { id: 1, key: 'food', color: 'orange' },
  { id: 2, name: 'Mascotas', color: 'cyan' },
]
const tx = (id, fields) => ({
  id,
  amount: 10,
  currency: 'CRC',
  type: 'expense',
  categoryId: null,
  note: '',
  date: '2026-10-12',
  ...fields,
})
const transactions = [
  tx(1, { categoryId: 1, note: 'Café con leche' }),
  tx(2, { categoryId: 2, note: 'Croquetas' }),
  tx(3, { type: 'income', note: 'Salario' }),
  tx(4, { categoryId: 99, note: 'Huérfana' }),
]
const none = { query: '', type: 'all', categoryId: 'all' }
const idsFor = (filters) =>
  filterTransactions(transactions, filters, categories, t).map((x) => x.id)

describe('filterTransactions', () => {
  it('returns everything when no filter is active', () => {
    expect(filterTransactions(transactions, none, categories, t)).toEqual(
      transactions,
    )
  })

  it('matches the query against the note', () => {
    expect(idsFor({ ...none, query: 'croq' })).toEqual([2])
  })

  it('matches the query against the category name through t', () => {
    expect(idsFor({ ...none, query: 'food' })).toEqual([1])
    expect(idsFor({ ...none, query: 'mascot' })).toEqual([2])
  })

  it('ignores case and accents', () => {
    expect(idsFor({ ...none, query: 'CAFE' })).toEqual([1])
  })

  it('filters by type', () => {
    expect(idsFor({ ...none, type: 'income' })).toEqual([3])
  })

  it('filters by category', () => {
    expect(idsFor({ ...none, categoryId: 2 })).toEqual([2])
  })

  it('combines the filters', () => {
    expect(idsFor({ query: 'c', type: 'expense', categoryId: 1 })).toEqual([1])
    expect(idsFor({ query: 'salario', type: 'expense', categoryId: 'all' })).toEqual(
      [],
    )
  })

  it('handles a missing or unknown category and still matches the note', () => {
    expect(idsFor({ ...none, query: 'huerf' })).toEqual([4])
    expect(idsFor({ ...none, query: 'salario' })).toEqual([3])
  })

  it('does not modify the original array', () => {
    const copy = [...transactions]
    filterTransactions(transactions, { ...none, type: 'income' }, categories, t)
    expect(transactions).toEqual(copy)
  })
})

describe('hasFilters', () => {
  it('is false with the default filters', () => {
    expect(hasFilters(none)).toBe(false)
  })

  it('is false for a query of only spaces', () => {
    expect(hasFilters({ ...none, query: '   ' })).toBe(false)
  })

  it('is true for a query, a type or a category', () => {
    expect(hasFilters({ ...none, query: 'a' })).toBe(true)
    expect(hasFilters({ ...none, type: 'expense' })).toBe(true)
    expect(hasFilters({ ...none, categoryId: 3 })).toBe(true)
  })
})

describe('payment method filter', () => {
  const paid = [
    tx(1, { paymentMethod: 'cash' }),
    tx(2, { paymentMethod: 'card', note: 'Café' }),
    tx(3, { paymentMethod: 'sinpe', categoryId: 1 }),
    tx(4, { paymentMethod: 'card', type: 'income' }),
    tx(5, {}),
  ]
  const ids = (filters) =>
    filterTransactions(paid, { ...none, ...filters }, categories, t).map(
      (x) => x.id,
    )

  it('keeps only that method', () => {
    expect(ids({ method: 'card' })).toEqual([2, 4])
    expect(ids({ method: 'sinpe' })).toEqual([3])
  })

  it('reads a missing method as cash', () => {
    expect(ids({ method: 'cash' })).toEqual([1, 5])
  })

  it('shows everything for all, or when the filter is absent', () => {
    expect(ids({ method: 'all' })).toEqual([1, 2, 3, 4, 5])
    expect(
      filterTransactions(paid, none, categories, t).map((x) => x.id),
    ).toEqual([1, 2, 3, 4, 5])
  })

  it('combines with type, category and text', () => {
    expect(ids({ method: 'card', type: 'income' })).toEqual([4])
    expect(ids({ method: 'sinpe', categoryId: 1 })).toEqual([3])
    expect(ids({ method: 'sinpe', categoryId: 2 })).toEqual([])
    expect(ids({ method: 'card', query: 'cafe' })).toEqual([2])
    expect(ids({ method: 'cash', query: 'cafe' })).toEqual([])
  })

  it('counts as an active filter', () => {
    expect(hasFilters({ ...none, method: 'card' })).toBe(true)
    expect(hasFilters({ ...none, method: 'all' })).toBe(false)
    expect(hasFilters(none)).toBe(false)
  })
})
