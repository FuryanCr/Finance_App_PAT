import { describe, expect, it } from 'vitest'
import { suggestNotes } from './suggest'

const tx = (id, fields) => ({
  id,
  amount: 10,
  currency: 'CRC',
  type: 'expense',
  categoryId: 1,
  note: '',
  date: '2026-10-12',
  ...fields,
})

describe('suggestNotes', () => {
  it('returns nothing for an empty query', () => {
    const list = [tx(1, { note: 'Cafe' })]
    expect(suggestNotes(list, '', 'expense')).toEqual([])
    expect(suggestNotes(list, '   ', 'expense')).toEqual([])
  })

  it('matches the query as a substring of the note', () => {
    const list = [tx(1, { note: 'Almuerzo oficina' }), tx(2, { note: 'Taxi' })]
    expect(suggestNotes(list, 'zo of', 'expense')).toEqual([
      { note: 'Almuerzo oficina', categoryId: 1 },
    ])
  })

  it('ignores case and accents', () => {
    const list = [tx(1, { note: 'Café con leche' })]
    expect(suggestNotes(list, 'cafe', 'expense')).toEqual([
      { note: 'Café con leche', categoryId: 1 },
    ])
    expect(suggestNotes(list, 'CAFÉ C', 'expense')).toHaveLength(1)
  })

  it('only uses transactions of the requested type', () => {
    const list = [
      tx(1, { note: 'Pago extra', type: 'income', categoryId: null }),
      tx(2, { note: 'Pago luz' }),
    ]
    expect(suggestNotes(list, 'pago', 'expense')).toEqual([
      { note: 'Pago luz', categoryId: 1 },
    ])
    expect(suggestNotes(list, 'pago', 'income')).toEqual([
      { note: 'Pago extra', categoryId: null },
    ])
  })

  it('ignores empty notes', () => {
    const list = [tx(1, { note: '' }), tx(2, { note: '   ' })]
    expect(suggestNotes(list, 'a', 'expense')).toEqual([])
  })

  it('collapses duplicates into the most recent one, with its category', () => {
    const list = [
      tx(1, { note: 'Cafe', categoryId: 1, date: '2026-10-01' }),
      tx(2, { note: ' café ', categoryId: 2, date: '2026-10-10' }),
      tx(3, { note: 'CAFE', categoryId: 3, date: '2026-10-05' }),
    ]
    expect(suggestNotes(list, 'caf', 'expense')).toEqual([
      { note: ' café ', categoryId: 2 },
    ])
  })

  it('leaves out a note equal to the query', () => {
    const list = [tx(1, { note: 'Café' }), tx(2, { note: 'Café con leche' })]
    expect(suggestNotes(list, ' cafe ', 'expense')).toEqual([
      { note: 'Café con leche', categoryId: 1 },
    ])
  })

  it('orders by recency, using the id on the same date', () => {
    const list = [
      tx(1, { note: 'Pan viejo', date: '2026-10-01' }),
      tx(2, { note: 'Pan A', date: '2026-10-12' }),
      tx(3, { note: 'Pan B', date: '2026-10-12' }),
    ]
    expect(suggestNotes(list, 'pan', 'expense').map((s) => s.note)).toEqual([
      'Pan B',
      'Pan A',
      'Pan viejo',
    ])
  })

  it('respects the limit', () => {
    const list = [1, 2, 3, 4, 5, 6].map((i) => tx(i, { note: `Pan ${i}` }))
    expect(suggestNotes(list, 'pan', 'expense')).toHaveLength(4)
    expect(suggestNotes(list, 'pan', 'expense', 2).map((s) => s.note)).toEqual([
      'Pan 6',
      'Pan 5',
    ])
  })

  it('carries a null categoryId through for income', () => {
    const list = [tx(1, { type: 'income', categoryId: null, note: 'Salario' })]
    expect(suggestNotes(list, 'sal', 'income')).toEqual([
      { note: 'Salario', categoryId: null },
    ])
  })
})
