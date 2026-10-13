import { describe, expect, it } from 'vitest'
import {
  buildBackup,
  isBackupDue,
  isBackupReminderDue,
  parseBackup,
} from './backup'

const builtIn = [
  { id: 1, key: 'food', color: 'orange' },
  { id: 2, key: 'transport', color: 'blue' },
  { id: 3, key: 'bills', color: 'violet' },
  { id: 4, key: 'fun', color: 'lime' },
]
const now = new Date('2026-10-12T15:30:00Z')

const state = {
  categories: [...builtIn, { id: 7, name: 'Mascotas', color: 'cyan' }],
  transactions: [
    { id: 1, amount: 250000, currency: 'CRC', type: 'income', categoryId: null, note: 'Pay', date: '2026-10-01' },
    { id: 2, amount: 8500.5, currency: 'CRC', type: 'expense', categoryId: 1, note: 'Lunch', date: '2026-10-02' },
    { id: 3, amount: 9.99, currency: 'USD', type: 'expense', categoryId: 7, note: '', date: '2026-10-06' },
  ],
  budgets: [
    { categoryId: 1, currency: 'CRC', amount: 50000 },
    { categoryId: 7, currency: 'USD', amount: 20 },
  ],
  recurring: [
    { id: 1, amount: 45000, currency: 'CRC', type: 'expense', categoryId: 3, note: 'Rent', schedule: 'first', lastPeriod: '2026-10-1' },
    { id: 2, amount: 100, currency: 'USD', type: 'income', categoryId: null, note: '', schedule: 'every', lastPeriod: null },
  ],
  savings: [
    { id: 1, amount: 20000, currency: 'CRC', direction: 'in', note: 'Trip', date: '2026-10-01' },
    { id: 2, amount: 5.5, currency: 'USD', direction: 'out', note: '', date: '2026-10-05' },
  ],
}

const validTx = state.transactions[1]
const validBudget = state.budgets[0]
const validRecurring = state.recurring[0]
const validMove = state.savings[0]

// A backup file with the given lists replaced
const file = (changes = {}) =>
  JSON.stringify({ ...buildBackup(state, now), ...changes })
const parse = (changes) => parseBackup(file(changes), builtIn)

describe('buildBackup', () => {
  it('leaves out built-in categories and stamps app, version and date', () => {
    const backup = buildBackup(state, now)
    expect(backup.app).toBe('quincena')
    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe('2026-10-12T15:30:00.000Z')
    expect(backup.categories).toEqual([{ id: 7, name: 'Mascotas', color: 'cyan' }])
    expect(backup.transactions).toEqual(state.transactions)
    expect(backup.budgets).toEqual(state.budgets)
    expect(backup.recurring).toEqual(state.recurring)
    expect(backup.savings).toEqual(state.savings)
  })

  it('writes an empty savings list when the state has none', () => {
    const withoutSavings = { ...state, savings: undefined }
    expect(buildBackup(withoutSavings, now).savings).toEqual([])
  })
})

describe('parseBackup', () => {
  it('round-trips a realistic state unchanged', () => {
    const result = parseBackup(file(), builtIn)
    expect(result).toEqual({
      categories: [{ id: 7, name: 'Mascotas', color: 'cyan' }],
      transactions: state.transactions,
      budgets: state.budgets,
      recurring: state.recurring,
      savings: state.savings,
    })
  })

  it('reads an older backup without savings as an empty list', () => {
    const old = JSON.parse(file())
    delete old.savings
    const result = parseBackup(JSON.stringify(old), builtIn)
    expect(result).not.toBeNull()
    expect(result.savings).toEqual([])
    expect(result.transactions).toEqual(state.transactions)
  })

  it('rejects a backup whose savings is not an array', () => {
    expect(parse({ savings: 'x' })).toBeNull()
    expect(parse({ savings: {} })).toBeNull()
    expect(parse({ savings: null })).toBeNull()
    expect(parse({ savings: 5 })).toBeNull()
  })

  it('drops invalid savings moves and keeps the valid ones', () => {
    const bad = [
      { ...validMove, id: 1.5 },
      { ...validMove, id: 0 },
      { ...validMove, id: 11, amount: 0 },
      { ...validMove, id: 12, amount: -5 },
      { ...validMove, id: 13, amount: 0.001 },
      { ...validMove, id: 14, amount: '10' },
      { ...validMove, id: 15, currency: 'EUR' },
      { ...validMove, id: 16, direction: 'up' },
      { ...validMove, id: 17, direction: undefined },
      { ...validMove, id: 18, date: '2026-02-31' },
      { ...validMove, id: 19, date: 20261012 },
      null,
      5,
    ]
    const result = parse({ savings: [validMove, ...bad] })
    expect(result.savings).toEqual([validMove])
  })

  it('cleans the note of a savings move and keeps exactly six fields', () => {
    const result = parse({
      savings: [
        { ...validMove, id: 1, note: undefined, extra: 'x' },
        { ...validMove, id: 2, note: 5 },
      ],
    })
    expect(result.savings.map((m) => m.note)).toEqual(['', ''])
    expect(Object.keys(result.savings[0])).toHaveLength(6)
  })

  it('returns null when the text is not an I AM POOR FOR NOW backup', () => {
    expect(parseBackup('not json', builtIn)).toBeNull()
    expect(parseBackup('', builtIn)).toBeNull()
    expect(parseBackup('null', builtIn)).toBeNull()
    expect(parseBackup('[]', builtIn)).toBeNull()
    expect(parseBackup('5', builtIn)).toBeNull()
    expect(parse({ app: 'other' })).toBeNull()
    expect(parse({ version: 2 })).toBeNull()
    expect(parse({ transactions: undefined })).toBeNull()
    expect(parse({ categories: 'x' })).toBeNull()
    expect(parse({ budgets: {} })).toBeNull()
    expect(parse({ recurring: null })).toBeNull()
  })

  it('never throws, whatever the input', () => {
    expect(parseBackup(null, builtIn)).toBeNull()
    expect(parseBackup(undefined, builtIn)).toBeNull()
    expect(parseBackup(42, builtIn)).toBeNull()
    const garbage = [null, 5, 'x', [], undefined, true]
    const result = parse({
      categories: garbage,
      transactions: [...garbage, { id: 1, date: ['2026-10-12'] }],
      budgets: garbage,
      recurring: garbage,
      savings: garbage,
    })
    expect(result).toEqual({
      categories: [],
      transactions: [],
      budgets: [],
      recurring: [],
      savings: [],
    })
  })

  it('drops invalid custom categories', () => {
    const good = { id: 7, name: 'Mascotas', color: 'cyan' }
    const result = parse({
      categories: [
        good,
        { id: 2, name: 'Clash', color: 'cyan' },
        { id: 1.5, name: 'Float', color: 'cyan' },
        { id: 8, name: '   ', color: 'cyan' },
        { id: 9, name: 5, color: 'cyan' },
        { id: 10, name: 'Bad color', color: 'pink' },
      ],
    })
    expect(result.categories).toEqual([good])
  })

  it('drops invalid transactions and keeps the valid ones', () => {
    const bad = [
      { ...validTx, id: 1.5 },
      { ...validTx, id: 11, amount: 0 },
      { ...validTx, id: 12, amount: -5 },
      { ...validTx, id: 13, amount: 0.001 },
      { ...validTx, id: 14, amount: '10' },
      { ...validTx, id: 15, amount: Infinity },
      { ...validTx, id: 16, currency: 'EUR' },
      { ...validTx, id: 17, type: 'transfer' },
      { ...validTx, id: 18, date: '2026-02-31' },
      { ...validTx, id: 19, date: 20261012 },
    ]
    const result = parse({ transactions: [validTx, ...bad] })
    expect(result.transactions).toEqual([validTx])
  })

  it('cleans the note and the category of a transaction', () => {
    const result = parse({
      transactions: [
        { ...validTx, id: 1, note: undefined },
        { ...validTx, id: 2, note: 5 },
        { ...validTx, id: 3, categoryId: 99 },
        { ...validTx, id: 4, categoryId: 7 },
        { ...validTx, id: 5, type: 'income', categoryId: 1 },
      ],
    })
    expect(result.transactions.map((x) => x.note)).toEqual(['', '', 'Lunch', 'Lunch', 'Lunch'])
    expect(result.transactions.map((x) => x.categoryId)).toEqual([1, 1, null, 7, null])
    expect(Object.keys(result.transactions[0])).toHaveLength(7)
  })

  it('drops budgets that are invalid or point to an unknown category', () => {
    const result = parse({
      budgets: [
        validBudget,
        { categoryId: 99, currency: 'CRC', amount: 10 },
        { categoryId: 7, currency: 'EUR', amount: 10 },
        { categoryId: 1, currency: 'USD', amount: 0 },
        { categoryId: 1, currency: 'USD', amount: 'x' },
        { currency: 'USD', amount: 10 },
      ],
    })
    expect(result.budgets).toEqual([validBudget])
  })

  it('drops budgets of a custom category that was not in the file', () => {
    const result = parse({ categories: [] })
    expect(result.budgets).toEqual([validBudget])
    expect(result.transactions.find((x) => x.id === 3).categoryId).toBeNull()
  })

  it('drops invalid recurring items and cleans lastPeriod', () => {
    const result = parse({
      recurring: [
        validRecurring,
        { ...validRecurring, id: 10, schedule: 'weekly' },
        { ...validRecurring, id: 11, amount: 0 },
        { ...validRecurring, id: 12, currency: 'EUR' },
        { ...validRecurring, id: 13, type: 'x' },
        { ...validRecurring, id: 14, categoryId: 99 },
        { ...validRecurring, id: 15, lastPeriod: '2026-10-3' },
        { ...validRecurring, id: 16, lastPeriod: 5 },
        { ...validRecurring, id: 17.5 },
      ],
    })
    expect(result.recurring.map((x) => x.id)).toEqual([1, 14, 15, 16])
    expect(result.recurring[1].categoryId).toBeNull()
    expect(result.recurring[2].lastPeriod).toBeNull()
    expect(result.recurring[3].lastPeriod).toBeNull()
    expect(Object.keys(result.recurring[0])).toHaveLength(8)
  })

  it('drops records whose id is not a positive safe integer', () => {
    const badIds = [0, -1, 2 ** 60, 1.5]
    const goodCategory = { id: 7, name: 'Mascotas', color: 'cyan' }
    const result = parse({
      categories: [
        goodCategory,
        ...badIds.map((id) => ({ id, name: 'Bad', color: 'cyan' })),
      ],
      transactions: [validTx, ...badIds.map((id) => ({ ...validTx, id }))],
      recurring: [validRecurring, ...badIds.map((id) => ({ ...validRecurring, id }))],
      savings: [validMove, ...badIds.map((id) => ({ ...validMove, id }))],
    })
    expect(result.categories).toEqual([goodCategory])
    expect(result.transactions).toEqual([validTx])
    expect(result.recurring).toEqual([validRecurring])
    expect(result.savings).toEqual([validMove])
  })

  it('keeps the first of any duplicate', () => {
    const result = parse({
      categories: [
        { id: 7, name: 'Mascotas', color: 'cyan' },
        { id: 7, name: 'Otra', color: 'sand' },
      ],
      transactions: [validTx, { ...validTx, note: 'Second' }],
      budgets: [validBudget, { ...validBudget, amount: 1 }],
      recurring: [validRecurring, { ...validRecurring, note: 'Second' }],
      savings: [validMove, { ...validMove, note: 'Second' }],
    })
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0].name).toBe('Mascotas')
    expect(result.transactions).toEqual([validTx])
    expect(result.budgets).toEqual([validBudget])
    expect(result.recurring).toEqual([validRecurring])
    expect(result.savings).toEqual([validMove])
  })
})

describe('isBackupDue', () => {
  const today = new Date(2026, 9, 28)

  it('is due when there is no valid date', () => {
    expect(isBackupDue(null, today)).toBe(true)
    expect(isBackupDue('', today)).toBe(true)
    expect(isBackupDue('garbage', today)).toBe(true)
  })

  it('is not due for a backup made today', () => {
    expect(isBackupDue('2026-10-28', today)).toBe(false)
  })

  it('is not due at exactly 14 days, due at 15', () => {
    expect(isBackupDue('2026-10-14', today)).toBe(false)
    expect(isBackupDue('2026-10-13', today)).toBe(true)
  })

  it('is not due for a date in the future', () => {
    expect(isBackupDue('2026-11-15', today)).toBe(false)
  })

  it('accepts a custom number of days', () => {
    expect(isBackupDue('2026-10-21', today, 7)).toBe(false)
    expect(isBackupDue('2026-10-20', today, 7)).toBe(true)
  })
})

describe('isBackupReminderDue', () => {
  const today = new Date(2026, 9, 28)
  const tx = (date) => ({ date })

  it('follows the last backup when there is one', () => {
    expect(isBackupReminderDue('2026-10-20', [tx('2026-01-01')], today)).toBe(false)
    expect(isBackupReminderDue('2026-10-13', [tx('2026-10-20')], today)).toBe(true)
  })

  it('is not due with no transactions, whatever the last backup', () => {
    expect(isBackupReminderDue(null, [], today)).toBe(false)
    expect(isBackupReminderDue('2026-01-01', [], today)).toBe(false)
  })

  it('counts from the oldest transaction when there is no backup', () => {
    expect(isBackupReminderDue(null, [tx('2026-10-25')], today)).toBe(false)
    expect(isBackupReminderDue(null, [tx('2026-10-14')], today)).toBe(false)
    expect(isBackupReminderDue(null, [tx('2026-10-13')], today)).toBe(true)
  })

  it('uses the oldest of several transactions out of order', () => {
    const list = [tx('2026-10-27'), tx('2026-10-01'), tx('2026-10-20')]
    expect(isBackupReminderDue('garbage', list, today)).toBe(true)
  })
})
