import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runMigrations } from './migrations'
import { createTestDb } from './testDb'
import { DEFAULT_SCHEDULE } from '../lib/quincenaSchedule'
import { EMPTY_PROFILE } from '../lib/onboarding'

// Same setup as storage.test.js: storage.js gets its connection from
// ./database, so the mock hands out the in-memory database of each test.
const current = vi.hoisted(() => ({ db: null, persist: null }))

vi.mock('./database', () => ({
  getDb: () => Promise.resolve(current.db),
  persist: (...args) => current.persist(...args),
}))

let storage

beforeEach(async () => {
  current.db = await createTestDb()
  await runMigrations(current.db)
  current.persist = vi.fn().mockResolvedValue(undefined)
  vi.resetModules()
  storage = await import('./storage')
})

const noPending = () =>
  expect(current.db.isTransactionActive()).resolves.toEqual({ result: false })

const recurringItem = (changes = {}) => ({
  amount: 45000,
  currency: 'CRC',
  type: 'expense',
  categoryId: 3,
  note: 'Rent',
  schedule: 'first',
  ...changes,
})

const income = (changes = {}) =>
  recurringItem({
    type: 'income',
    categoryId: null,
    note: 'Salario',
    schedule: 'every',
    ...changes,
  })

const profile = (changes = {}) => ({
  name: 'Ana',
  currency: 'USD',
  income: 1200.5,
  savingsGoal: 100,
  ...changes,
})

const tx = () => ({
  amount: 100,
  currency: 'CRC',
  type: 'expense',
  categoryId: 1,
  note: 'n',
  date: '2026-10-01',
  paymentMethod: 'cash',
})

const base = { categories: [], transactions: [], budgets: [], recurring: [] }

describe('profile and the first-use screen', () => {
  it('reads a new database as a person who has not done the welcome', async () => {
    expect((await storage.loadAll()).profile).toEqual(EMPTY_PROFILE)
  })

  it('completeOnboarding saves profile, schedule and recurring items together', async () => {
    const schedule = [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }]
    const state = await storage.completeOnboarding({
      profile: profile(),
      schedule,
      add: [recurringItem({ amount: 250000, note: 'Alquiler' }), income({ amount: 450000 })],
    })

    expect(state.profile).toEqual({
      name: 'Ana',
      currency: 'USD',
      income: 1200.5,
      savingsGoal: 100,
      onboardedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
    expect(state.quincenaSchedule).toEqual(schedule)
    expect(state.recurring.map((r) => r.note)).toEqual(['Alquiler', 'Salario'])
    expect(await storage.loadAll()).toEqual(state)
    expect(current.persist).toHaveBeenCalledTimes(1)
    await noPending()
  })

  it('leaves the schedule alone when none is given, and cleans the name', async () => {
    const custom = [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: null }]
    await storage.saveQuincenaSchedule(custom)
    const state = await storage.completeOnboarding({
      profile: profile({ name: '   Ana    María ', income: null, savingsGoal: null }),
    })
    expect(state.quincenaSchedule).toEqual(custom)
    expect(state.profile).toMatchObject({ name: 'Ana María', income: null, savingsGoal: null })
  })

  it('changes an existing recurring item when asked to, keeping its last period', async () => {
    const saved = await storage.insertRecurring(income())
    await storage.skipRecurring(saved.id, '2026-10-1')
    const state = await storage.completeOnboarding({
      profile: profile(),
      update: { id: saved.id, item: income({ amount: 99000 }) },
    })
    expect(state.recurring).toHaveLength(1)
    expect(state.recurring[0]).toMatchObject({ amount: 99000, lastPeriod: '2026-10-1' })
  })

  it('is all or nothing: a bad item saves nothing', async () => {
    await expect(
      storage.completeOnboarding({
        profile: profile(),
        schedule: [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }],
        add: [recurringItem(), recurringItem({ amount: 0 })],
      }),
    ).rejects.toThrow()
    const state = await storage.loadAll()
    expect(state.profile).toEqual(EMPTY_PROFILE)
    expect(state.recurring).toEqual([])
    expect(state.quincenaSchedule).toEqual(DEFAULT_SCHEDULE)
    await noPending()
  })

  it('puts everything back when the copy to disk fails, so a retry saves once', async () => {
    const saved = await storage.insertRecurring(income())
    current.persist.mockRejectedValueOnce(new Error('disk'))
    const args = {
      profile: profile(),
      schedule: [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }],
      add: [recurringItem({ note: 'Luz' })],
      update: { id: saved.id, item: income({ amount: 1 }) },
    }
    await expect(storage.completeOnboarding(args)).rejects.toThrow('disk')

    const state = await storage.loadAll()
    expect(state.profile).toEqual(EMPTY_PROFILE)
    expect(state.quincenaSchedule).toEqual(DEFAULT_SCHEDULE)
    expect(state.recurring).toEqual([saved])
    await noPending()

    const done = await storage.completeOnboarding(args)
    expect(done.recurring.map((r) => r.note)).toEqual(['Salario', 'Luz'])
  })

  it('skipOnboarding only marks it done; the name is saved on its own', async () => {
    const skipped = await storage.skipOnboarding()
    expect(skipped).toEqual({ ...EMPTY_PROFILE, onboardedAt: expect.any(String) })
    expect(await storage.saveProfileName('  Jason ')).toMatchObject({ name: 'Jason' })
    expect((await storage.loadAll()).profile.name).toBe('Jason')
    current.persist.mockRejectedValueOnce(new Error('disk'))
    await expect(storage.saveProfileName('Otro')).rejects.toThrow('disk')
    expect((await storage.loadAll()).profile.name).toBe('Jason')
  })

  it('clearAll shows the welcome again and forgets the name and income', async () => {
    await storage.completeOnboarding({ profile: profile() })
    await storage.insertTransaction(tx())
    await storage.clearAll()
    expect((await storage.loadAll()).profile).toEqual(EMPTY_PROFILE)
  })

  it('works when the profile row is missing', async () => {
    await current.db.run('DELETE FROM profile')
    expect((await storage.loadAll()).profile).toEqual(EMPTY_PROFILE)
    const state = await storage.completeOnboarding({ profile: profile() })
    expect(state.profile.name).toBe('Ana')
  })

  it('restoring a backup without a profile marks the welcome done and keeps the rest', async () => {
    await storage.saveProfileName('Ana')
    const state = await storage.restoreAll(base)
    expect(state.profile).toMatchObject({ name: 'Ana', onboardedAt: expect.any(String) })
  })

  it('restoring a backup with a profile uses it and keeps the date already set', async () => {
    await storage.completeOnboarding({ profile: profile({ name: 'Old' }) })
    const before = (await storage.loadAll()).profile.onboardedAt
    const state = await storage.restoreAll({
      ...base,
      profile: { name: 'New', currency: 'CRC', income: 5, savingsGoal: null },
    })
    expect(state.profile).toEqual({
      name: 'New',
      currency: 'CRC',
      income: 5,
      savingsGoal: null,
      onboardedAt: before,
    })
  })

  it('the legacy import marks the welcome done', async () => {
    const saved = {
      categories: [],
      transactions: [
        { id: 5, amount: 10, currency: 'CRC', type: 'expense', categoryId: 1, note: '', date: '2026-10-06' },
      ],
    }
    const store = new Map([['finance-data', JSON.stringify(saved)]])
    globalThis.localStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
    }
    try {
      const state = await storage.loadAll()
      expect(state.transactions).toHaveLength(1)
      expect(state.profile.onboardedAt).toEqual(expect.any(String))
    } finally {
      delete globalThis.localStorage
    }
  })
})

describe('completeOnboarding with a missing recurring item', () => {
  it('fails and saves nothing when the item to update does not exist', async () => {
    await expect(
      storage.completeOnboarding({
        profile: profile(),
        schedule: [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }],
        add: [recurringItem({ note: 'Luz' })],
        update: { id: 999, item: income() },
      }),
    ).rejects.toThrow(/not found/)
    const state = await storage.loadAll()
    expect(state.profile).toEqual(EMPTY_PROFILE)
    expect(state.recurring).toEqual([])
    expect(state.quincenaSchedule).toEqual(DEFAULT_SCHEDULE)
    await noPending()
  })

  it('clearAll puts the quincena back to 15/30 and the welcome can be done again', async () => {
    await storage.completeOnboarding({
      profile: profile(),
      schedule: [{ from: '2000-01-01', mode: 'paydays', day1: 5, day2: 20 }],
    })
    await storage.clearAll()
    const state = await storage.loadAll()
    expect(state.quincenaSchedule).toEqual(DEFAULT_SCHEDULE)
    const again = await storage.completeOnboarding({ profile: profile({ name: 'Otra' }) })
    expect(again.profile.name).toBe('Otra')
  })
})

describe('completeOnboarding with new categories', () => {
  const withNew = (name, changes = {}) =>
    recurringItem({ categoryId: null, newCategory: name, ...changes })

  it('creates the category and uses it, once for repeated names', async () => {
    const state = await storage.completeOnboarding({
      profile: profile(),
      add: [
        withNew('Pasajes', { note: 'Bus' }),
        withNew('pasajes', { note: 'Taxi' }),
        withNew('Mascota', { note: 'Comida' }),
      ],
    })
    const custom = state.categories.filter((c) => c.name)
    expect(custom.map((c) => c.name)).toEqual(['Pasajes', 'Mascota'])
    const byNote = Object.fromEntries(state.recurring.map((r) => [r.note, r.categoryId]))
    expect(byNote.Bus).toBe(custom[0].id)
    expect(byNote.Taxi).toBe(custom[0].id)
    expect(byNote.Comida).toBe(custom[1].id)
    expect(custom[0].color).not.toBe(custom[1].color)
  })

  it('reuses a category that already exists, built-in ones in any language', async () => {
    const state = await storage.completeOnboarding({
      profile: profile(),
      add: [withNew('Transport'), withNew('transporte')],
    })
    expect(state.categories.filter((c) => c.name)).toEqual([])
    expect(state.recurring.map((r) => r.categoryId)).toEqual([2, 2])
  })

  it('undoes the new categories when the copy to disk fails', async () => {
    current.persist.mockRejectedValueOnce(new Error('disk'))
    await expect(
      storage.completeOnboarding({ profile: profile(), add: [withNew('Pasajes')] }),
    ).rejects.toThrow('disk')
    const state = await storage.loadAll()
    expect(state.categories.filter((c) => c.name)).toEqual([])
    expect(state.recurring).toEqual([])
    await noPending()
  })

  it('creates no category when a later item fails', async () => {
    await expect(
      storage.completeOnboarding({
        profile: profile(),
        add: [withNew('Pasajes'), recurringItem({ amount: 0 })],
      }),
    ).rejects.toThrow()
    expect((await storage.loadAll()).categories.filter((c) => c.name)).toEqual([])
  })
})

describe('manual quincena schedule', () => {
  const manual = [
    DEFAULT_SCHEDULE[0],
    { from: '2026-10-11', mode: 'manual', day1: 1, day2: null },
    { from: '2026-10-26', mode: 'manual', day1: 1, day2: null },
  ]

  it('is saved, read back and restored from a backup', async () => {
    expect(await storage.saveQuincenaSchedule(manual)).toEqual(manual)
    expect((await storage.loadAll()).quincenaSchedule).toEqual(manual)
    const state = await storage.restoreAll({ ...base, quincenaSchedule: manual })
    expect(state.quincenaSchedule).toEqual(manual)
  })

  it('goes back to 15/30 when everything is cleared', async () => {
    await storage.saveQuincenaSchedule(manual)
    await storage.clearAll()
    expect((await storage.loadAll()).quincenaSchedule).toEqual(DEFAULT_SCHEDULE)
  })
})

describe('backup round trip with a manual schedule and a profile', () => {
  const manualSchedule = [
    DEFAULT_SCHEDULE[0],
    { from: '2026-10-11', mode: 'manual', day1: 1, day2: null },
  ]

  it('comes back exactly, with one manual row and no leftovers', async () => {
    const { buildBackup, inspectBackup } = await import('../lib/backup')
    await storage.completeOnboarding({
      profile: profile(),
      schedule: manualSchedule,
      add: [recurringItem({ note: 'Luz' })],
    })
    const before = await storage.loadAll()
    const text = JSON.stringify(buildBackup(before))
    const inspected = inspectBackup(text, before.categories.filter((c) => c.key))
    expect(inspected.ok).toBe(true)

    await storage.clearAll()
    const after = await storage.restoreAll(inspected.data)

    expect(after.quincenaSchedule).toEqual(manualSchedule)
    expect(after.profile).toMatchObject({ name: 'Ana', currency: 'USD', income: 1200.5, savingsGoal: 100 })
    expect(typeof after.profile.onboardedAt).toBe('string')
    expect(after.recurring.map((r) => r.note)).toEqual(['Luz'])
    const manualRows = (await current.db.query('SELECT start_date FROM quincena_manual')).values
    expect(manualRows).toEqual([{ start_date: '2026-10-11' }])
  })

  it('restoring a backup without manual days empties the manual table', async () => {
    await storage.saveQuincenaSchedule(manualSchedule)
    await storage.restoreAll({ ...base, quincenaSchedule: DEFAULT_SCHEDULE })
    const count = (await current.db.query('SELECT COUNT(*) AS n FROM quincena_manual')).values[0].n
    expect(count).toBe(0)
  })

  it('reads one entry per date when both tables have the same day', async () => {
    await current.db.run("INSERT INTO quincena_config VALUES ('2026-10-11', 'fixed', 1, 16)")
    await current.db.run("INSERT INTO quincena_manual VALUES ('2026-10-11')")
    const { quincenaSchedule } = await storage.loadAll()
    expect(quincenaSchedule.filter((e) => e.from === '2026-10-11')).toEqual([
      { from: '2026-10-11', mode: 'manual', day1: 1, day2: null },
    ])
  })
})
