import { describe, expect, it } from 'vitest'
import { toCsv, transactionRows } from './csv'

describe('toCsv', () => {
  it('starts with the BOM', () => {
    expect(toCsv([['a']]).startsWith('﻿')).toBe(true)
  })

  it('joins rows with CRLF and cells with commas', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    ).toBe('﻿a,b\r\nc,d')
  })

  it('does not quote plain cells or numbers', () => {
    expect(toCsv([['hello', 12.5, 0]])).toBe('﻿hello,12.5,0')
  })

  it('quotes a cell with a comma', () => {
    expect(toCsv([['a,b']])).toBe('﻿"a,b"')
  })

  it('quotes a cell with a double quote and doubles the inner quotes', () => {
    expect(toCsv([['say "hi"']])).toBe('﻿"say ""hi"""')
  })

  it('quotes a cell with a line break', () => {
    expect(toCsv([['a\nb']])).toBe('﻿"a\nb"')
    expect(toCsv([['a\r\nb']])).toBe('﻿"a\r\nb"')
  })

  it('quotes a cell with leading or trailing spaces', () => {
    expect(toCsv([[' a']])).toBe('﻿" a"')
    expect(toCsv([['a ']])).toBe('﻿"a "')
  })

  it('adds a leading single quote to text starting with = + - or @', () => {
    expect(toCsv([['=SUM(A1)']])).toBe("﻿'=SUM(A1)")
    expect(toCsv([['+1']])).toBe("﻿'+1")
    expect(toCsv([['-1']])).toBe("﻿'-1")
    expect(toCsv([['@cmd']])).toBe("﻿'@cmd")
  })

  it('leaves a negative number untouched', () => {
    expect(toCsv([[-5]])).toBe('﻿-5')
  })
})

describe('transactionRows', () => {
  const t = (key) => `T:${key}`
  const categories = [
    { id: 1, key: 'food', color: 'orange' },
    { id: 5, name: 'Pets', color: 'cyan' },
  ]

  it('starts with the header row', () => {
    expect(transactionRows([], categories, t)).toEqual([
      ['date', 'type', 'amount', 'currency', 'category', 'note'],
    ])
  })

  it('puts the category label in an expense row', () => {
    const tx = {
      id: 1,
      amount: 8500,
      currency: 'CRC',
      type: 'expense',
      categoryId: 1,
      note: 'Lunch',
      date: '2026-10-02',
    }
    expect(transactionRows([tx], categories, t)[1]).toEqual([
      '2026-10-02',
      'expense',
      8500,
      'CRC',
      'T:category.food',
      'Lunch',
    ])
  })

  it('uses the name of a custom category', () => {
    const tx = {
      id: 2,
      amount: 5.5,
      currency: 'USD',
      type: 'expense',
      categoryId: 5,
      note: 'Food',
      date: '2026-10-03',
    }
    expect(transactionRows([tx], categories, t)[1][4]).toBe('Pets')
  })

  it('leaves the category empty for income', () => {
    const tx = {
      id: 3,
      amount: 100,
      currency: 'USD',
      type: 'income',
      categoryId: null,
      note: 'Freelance',
      date: '2026-10-04',
    }
    expect(transactionRows([tx], categories, t)[1]).toEqual([
      '2026-10-04',
      'income',
      100,
      'USD',
      '',
      'Freelance',
    ])
  })

  it('leaves the category empty when it no longer exists', () => {
    const tx = {
      id: 4,
      amount: 10,
      currency: 'CRC',
      type: 'expense',
      categoryId: 99,
      note: 'Old',
      date: '2026-10-05',
    }
    expect(transactionRows([tx], categories, t)[1][4]).toBe('')
  })

  it('turns a missing note into an empty string', () => {
    const tx = {
      id: 5,
      amount: 10,
      currency: 'CRC',
      type: 'expense',
      categoryId: 1,
      date: '2026-10-06',
    }
    expect(transactionRows([tx], categories, t)[1][5]).toBe('')
  })

  it('keeps the order of the transactions', () => {
    const list = [
      {
        id: 1,
        amount: 1,
        currency: 'CRC',
        type: 'expense',
        categoryId: 1,
        note: 'a',
        date: '2026-10-01',
      },
      {
        id: 2,
        amount: 2,
        currency: 'CRC',
        type: 'expense',
        categoryId: 1,
        note: 'b',
        date: '2026-10-02',
      },
    ]
    const rows = transactionRows(list, categories, t)
    expect(rows.slice(1).map((row) => row[5])).toEqual(['a', 'b'])
  })
})
