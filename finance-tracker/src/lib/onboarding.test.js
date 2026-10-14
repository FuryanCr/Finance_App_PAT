import { describe, expect, it } from 'vitest'
import {
  MAX_NAME_LENGTH,
  buildFixedExpense,
  buildIncomeItem,
  cleanCurrency,
  cleanName,
  freePerQuincena,
  isOnboarded,
  planIncome,
  optionalAmount,
  quincenasPerMonth,
  scheduleForOnboarding,
} from './onboarding'
import { DEFAULT_SCHEDULE } from './quincenaSchedule'

describe('cleanName', () => {
  it('trims, collapses spaces and cuts to the limit', () => {
    expect(cleanName('  Ana   María ')).toBe('Ana María')
    expect(cleanName('x'.repeat(100))).toHaveLength(MAX_NAME_LENGTH)
    expect(cleanName('')).toBe('')
    expect(cleanName(undefined)).toBe('')
    expect(cleanName(42)).toBe('')
  })
})

describe('cleanCurrency and isOnboarded', () => {
  it('only knows colones and dollars', () => {
    expect(cleanCurrency('USD')).toBe('USD')
    expect(cleanCurrency('CRC')).toBe('CRC')
    expect(cleanCurrency('EUR')).toBe('CRC')
    expect(cleanCurrency(undefined)).toBe('CRC')
  })

  it('is done only with a date', () => {
    expect(isOnboarded({ onboardedAt: '2026-10-13' })).toBe(true)
    expect(isOnboarded({ onboardedAt: null })).toBe(false)
    expect(isOnboarded({ onboardedAt: '' })).toBe(false)
    expect(isOnboarded(null)).toBe(false)
    expect(isOnboarded(undefined)).toBe(false)
  })
})

describe('optionalAmount', () => {
  it('reads empty as nothing, a valid amount as a number, the rest as invalid', () => {
    expect(optionalAmount('')).toBeNull()
    expect(optionalAmount('  ')).toBeNull()
    expect(optionalAmount('0')).toBeNull()
    expect(optionalAmount('450.000')).toBe(450000)
    expect(optionalAmount('12,50')).toBe(12.5)
    expect(optionalAmount('abc')).toBeUndefined()
    expect(optionalAmount('-5')).toBeUndefined()
    expect(optionalAmount('9999999999')).toBeUndefined()
  })
})

describe('quincenasPerMonth', () => {
  it('is 2 for 15/30 and two pay days, 1 for a single pay day', () => {
    expect(quincenasPerMonth({ mode: 'fixed' })).toBe(2)
    expect(quincenasPerMonth({ mode: 'paydays', day1: 5, day2: 20 })).toBe(2)
    expect(quincenasPerMonth({ mode: 'paydays', day1: 30, day2: null })).toBe(1)
    expect(quincenasPerMonth({ mode: 'paydays', day1: 5, day2: 5 })).toBe(1)
    expect(quincenasPerMonth(undefined)).toBe(2)
  })
})

describe('freePerQuincena', () => {
  it('takes the fixed expenses and the goal out of one pay', () => {
    const result = freePerQuincena({
      income: 500000,
      expenses: [
        { amount: 20000, schedule: 'every' },
        { amount: 200000, schedule: 'first' },
        { amount: 30000, schedule: 'second' },
      ],
      savingsGoal: 25000,
      perMonth: 2,
    })
    // 20.000 + (200.000 + 30.000) / 2 = 135.000
    expect(result).toEqual({
      income: 500000,
      fixed: 135000,
      goal: 25000,
      free: 340000,
    })
  })

  it('counts a monthly expense in full when there is one pay day a month', () => {
    const result = freePerQuincena({
      income: 900000,
      expenses: [
        { amount: 300000, schedule: 'first' },
        { amount: 10000, schedule: 'every' },
      ],
      perMonth: 1,
    })
    expect(result.fixed).toBe(310000)
    expect(result.free).toBe(590000)
  })

  it('can be negative and works with nothing at all', () => {
    expect(
      freePerQuincena({ income: 1000, expenses: [{ amount: 5000, schedule: 'every' }] })
        .free,
    ).toBe(-4000)
    expect(freePerQuincena({})).toEqual({ income: 0, fixed: 0, goal: 0, free: 0 })
  })

  it('keeps cents exact (dollars)', () => {
    const result = freePerQuincena({
      income: 100.1,
      expenses: [
        { amount: 0.2, schedule: 'every' },
        { amount: 10.05, schedule: 'first' },
      ],
      perMonth: 2,
    })
    expect(result.fixed).toBe(5.23)
    expect(result.free).toBe(94.87)
  })
})

describe('scheduleForOnboarding', () => {
  const today = new Date(2026, 9, 13)

  it('puts the choice in force from the start when nothing is registered', () => {
    expect(
      scheduleForOnboarding(
        DEFAULT_SCHEDULE,
        { mode: 'paydays', day1: 20, day2: 5 },
        today,
        false,
      ),
    ).toEqual([{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }])
    expect(
      scheduleForOnboarding(DEFAULT_SCHEDULE, { mode: 'fixed' }, today, false),
    ).toEqual(DEFAULT_SCHEDULE)
  })

  it('defers the change when there is data, never moving the past', () => {
    const result = scheduleForOnboarding(
      DEFAULT_SCHEDULE,
      { mode: 'paydays', day1: 5, day2: 20 },
      today,
      true,
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(DEFAULT_SCHEDULE[0])
    expect(result[1].from > '2026-10-13').toBe(true)
  })
})

describe('buildFixedExpense', () => {
  it('builds a recurring expense item', () => {
    expect(
      buildFixedExpense({
        name: '  Alquiler ',
        amountText: '250.000',
        schedule: 'first',
        currency: 'CRC',
      }),
    ).toEqual({
      ok: true,
      item: {
        amount: 250000,
        currency: 'CRC',
        type: 'expense',
        categoryId: 3,
        note: 'Alquiler',
        schedule: 'first',
      },
    })
  })

  it('rejects an empty name and a missing or invalid amount', () => {
    expect(buildFixedExpense({ name: ' ', amountText: '100' })).toEqual({
      ok: false,
      reason: 'name',
    })
    expect(buildFixedExpense({ name: 'Luz', amountText: '' })).toEqual({
      ok: false,
      reason: 'amount',
    })
    expect(buildFixedExpense({ name: 'Luz', amountText: '0' })).toEqual({
      ok: false,
      reason: 'amount',
    })
    expect(buildFixedExpense({ name: 'Luz', amountText: 'mucho' })).toEqual({
      ok: false,
      reason: 'amount',
    })
  })

  it('cuts a long name to the note limit and fixes a bad currency', () => {
    const result = buildFixedExpense({
      name: 'n'.repeat(90),
      amountText: '5',
      currency: 'EUR',
    })
    expect(result.item.note).toHaveLength(60)
    expect(result.item.currency).toBe('CRC')
  })
})

describe('buildIncomeItem', () => {
  it('is an income that repeats every quincena', () => {
    expect(buildIncomeItem(450000, 'USD', 'Salario')).toEqual({
      amount: 450000,
      currency: 'USD',
      type: 'income',
      categoryId: null,
      note: 'Salario',
      schedule: 'every',
    })
  })
})

describe('planIncome', () => {
  const income = (changes = {}) => ({
    id: 5,
    type: 'income',
    schedule: 'every',
    amount: 450000,
    currency: 'CRC',
    note: 'Salario',
    lastPeriod: '2026-10-1',
    categoryId: null,
    ...changes,
  })

  it('does nothing when no income was typed', () => {
    expect(
      planIncome({ income: null, currency: 'CRC', note: 'x', recurring: [income()] }),
    ).toEqual({ action: 'none' })
  })

  it('adds the income the first time', () => {
    expect(
      planIncome({ income: 300000, currency: 'CRC', note: 'Salario', recurring: [] }),
    ).toEqual({
      action: 'add',
      item: buildIncomeItem(300000, 'CRC', 'Salario'),
    })
  })

  it('changes the income the welcome created instead of adding another', () => {
    const result = planIncome({
      income: 500000,
      currency: 'CRC',
      note: 'Income',
      previous: { income: 450000, currency: 'CRC' },
      recurring: [income()],
    })
    expect(result.action).toBe('update')
    expect(result.id).toBe(5)
    expect(result.item).toMatchObject({
      amount: 500000,
      note: 'Salario',
      lastPeriod: '2026-10-1',
    })
  })

  it('does nothing when the income did not change, or already exists', () => {
    const same = {
      income: 450000,
      currency: 'CRC',
      note: 'x',
      previous: { income: 450000, currency: 'CRC' },
      recurring: [income()],
    }
    expect(planIncome(same)).toEqual({ action: 'none' })
    expect(planIncome({ ...same, previous: null })).toEqual({ action: 'none' })
  })

  it('adds when the old income was deleted in the meantime', () => {
    const result = planIncome({
      income: 450000,
      currency: 'CRC',
      note: 'Salario',
      previous: { income: 450000, currency: 'CRC' },
      recurring: [],
    })
    expect(result.action).toBe('add')
  })
})
