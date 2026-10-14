import { beforeEach, describe, expect, it } from 'vitest'
import { categories as builtIn } from './mockData'
import { migrations, runMigrations } from './migrations'
import { createTestDb } from './testDb'

let db

beforeEach(async () => {
  db = await createTestDb()
})

const rows = async (sql, params) => (await db.query(sql, params)).values
const version = async () => (await rows('PRAGMA user_version'))[0].user_version
const tableNames = async () =>
  (await rows("SELECT name FROM sqlite_master WHERE type = 'table'")).map(
    (row) => row.name,
  )

// Builds a database as an older version of the app left it
const migrateTo = (n) => runMigrations(db, migrations.slice(0, n))

const insertTx = (categoryId = 1, amountCents = 500) =>
  db.run(
    `INSERT INTO transactions
      (amount_cents, currency, type, category_id, note, date)
      VALUES (?, 'CRC', 'expense', ?, 'n', '2026-10-01')`,
    [amountCents, categoryId],
  )

describe('runMigrations on a new database', () => {
  it('ends at the latest version with every table and the date index', async () => {
    await runMigrations(db)

    expect(migrations).toHaveLength(7)
    expect(await version()).toBe(7)
    const tables = await tableNames()
    for (const table of ['categories', 'transactions', 'budgets', 'recurring', 'savings']) {
      expect(tables).toContain(table)
    }
    const indexes = await rows(
      "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name = 'idx_transactions_date'",
    )
    expect(indexes).toEqual([
      { name: 'idx_transactions_date', tbl_name: 'transactions' },
    ])
    const indexed = await rows('PRAGMA index_info(idx_transactions_date)')
    expect(indexed.map((column) => column.name)).toEqual(['date'])
  })

  it('seeds the built-in categories with a null name', async () => {
    await runMigrations(db)

    const stored = await rows('SELECT * FROM categories ORDER BY id')
    expect(stored).toEqual([
      { id: 1, key: 'food', name: null, color: 'orange' },
      { id: 2, key: 'transport', name: null, color: 'blue' },
      { id: 3, key: 'bills', name: null, color: 'violet' },
      { id: 4, key: 'fun', name: null, color: 'lime' },
    ])
    expect(stored.map(({ id, key, color }) => ({ id, key, color }))).toEqual(
      builtIn,
    )
  })

  it('does nothing when run a second time', async () => {
    await runMigrations(db)
    await db.run("INSERT INTO categories (name, color) VALUES ('Pets', 'cyan')")
    const before = await rows('SELECT * FROM categories ORDER BY id')

    await expect(runMigrations(db)).resolves.toBeUndefined()

    expect(await version()).toBe(7)
    expect(await rows('SELECT * FROM categories ORDER BY id')).toEqual(before)
  })
})

describe('upgrading from an earlier version', () => {
  it('goes from version 1 to the latest and keeps the rows', async () => {
    await migrateTo(1)
    expect(await version()).toBe(1)
    expect(await tableNames()).not.toContain('budgets')
    await db.run("INSERT INTO categories (name, color) VALUES ('Pets', 'cyan')")
    await insertTx(1, 999)
    await insertTx(5, 100)

    await runMigrations(db)

    expect(await version()).toBe(7)
    expect(await tableNames()).toEqual(
      expect.arrayContaining(['budgets', 'recurring', 'savings']),
    )
    expect(
      await rows('SELECT id, amount_cents, category_id FROM transactions'),
    ).toEqual([
      { id: 1, amount_cents: 999, category_id: 1 },
      { id: 2, amount_cents: 100, category_id: 5 },
    ])
    expect(await rows('SELECT name FROM categories WHERE id = 5')).toEqual([
      { name: 'Pets' },
    ])
  })

  it('goes from version 2 to the latest and keeps the rows', async () => {
    await migrateTo(2)
    expect(await version()).toBe(2)
    expect(await tableNames()).not.toContain('recurring')
    await insertTx(2, 700)
    await db.run(
      "INSERT INTO budgets (category_id, currency, amount_cents) VALUES (2, 'USD', 5000)",
    )

    await runMigrations(db)

    expect(await version()).toBe(7)
    expect(await tableNames()).toEqual(
      expect.arrayContaining(['recurring', 'savings']),
    )
    expect(await rows('SELECT amount_cents FROM transactions')).toEqual([
      { amount_cents: 700 },
    ])
    expect(await rows('SELECT * FROM budgets')).toEqual([
      { category_id: 2, currency: 'USD', amount_cents: 5000 },
    ])
  })

  it('goes from version 3 to the latest and keeps the rows', async () => {
    await migrateTo(3)
    expect(await version()).toBe(3)
    expect(await tableNames()).not.toContain('savings')
    await insertTx(1, 300)
    await db.run(
      `INSERT INTO recurring (amount_cents, currency, type, category_id, schedule)
        VALUES (100, 'CRC', 'expense', 1, 'every')`,
    )

    await runMigrations(db)

    expect(await version()).toBe(7)
    expect(await tableNames()).toContain('savings')
    expect(await rows('SELECT * FROM savings')).toEqual([])
    expect(await rows('SELECT amount_cents FROM transactions')).toEqual([
      { amount_cents: 300 },
    ])
    expect(await rows('SELECT amount_cents FROM recurring')).toEqual([
      { amount_cents: 100 },
    ])
  })
})

// A database as version 4 of the app left it, with every table filled
async function fillVersion4() {
  await migrateTo(4)
  await db.run("INSERT INTO categories (name, color) VALUES ('Mascotas', 'cyan')")
  const income = await db.run(
    `INSERT INTO transactions
      (amount_cents, currency, type, category_id, note, date)
      VALUES (25000000, 'CRC', 'income', NULL, 'Quincena', '2026-10-01')`,
  )
  const expense = await db.run(
    `INSERT INTO transactions
      (amount_cents, currency, type, category_id, note, date)
      VALUES (850000, 'CRC', 'expense', 1, 'Almuerzo', '2026-10-02')`,
  )
  const dollars = await db.run(
    `INSERT INTO transactions
      (amount_cents, currency, type, category_id, note, date)
      VALUES (999, 'USD', 'expense', 4, 'Streaming', '2026-10-06')`,
  )
  const custom = await db.run(
    `INSERT INTO transactions
      (amount_cents, currency, type, category_id, note, date)
      VALUES (500000, 'CRC', 'expense', 5, '', '2026-10-09')`,
  )
  await db.run(
    "INSERT INTO budgets (category_id, currency, amount_cents) VALUES (1, 'CRC', 9000000)",
  )
  await db.run(
    `INSERT INTO recurring (amount_cents, currency, type, category_id, note, schedule)
      VALUES (4500000, 'CRC', 'expense', 3, 'Luz', 'first')`,
  )
  await db.run(
    `INSERT INTO savings (amount_cents, currency, direction, note, date)
      VALUES (3000000, 'CRC', 'in', 'Fondo', '2026-10-10')`,
  )
  return [income, expense, dollars, custom].map((r) => r.changes.lastId)
}

describe('upgrading from version 4 (payment method, v5)', () => {
  it('keeps every row and reads the old transactions as cash', async () => {
    const ids = await fillVersion4()
    expect(await version()).toBe(4)

    await runMigrations(db)

    expect(await version()).toBe(7)
    const transactions = await rows(
      'SELECT id, amount_cents, currency, type, category_id, note, date, payment_method FROM transactions ORDER BY id',
    )
    expect(transactions).toEqual([
      { id: ids[0], amount_cents: 25000000, currency: 'CRC', type: 'income', category_id: null, note: 'Quincena', date: '2026-10-01', payment_method: 'cash' },
      { id: ids[1], amount_cents: 850000, currency: 'CRC', type: 'expense', category_id: 1, note: 'Almuerzo', date: '2026-10-02', payment_method: 'cash' },
      { id: ids[2], amount_cents: 999, currency: 'USD', type: 'expense', category_id: 4, note: 'Streaming', date: '2026-10-06', payment_method: 'cash' },
      { id: ids[3], amount_cents: 500000, currency: 'CRC', type: 'expense', category_id: 5, note: '', date: '2026-10-09', payment_method: 'cash' },
    ])
  })

  it('leaves the other tables and the date index untouched', async () => {
    await fillVersion4()
    await runMigrations(db)

    expect(await rows('SELECT * FROM budgets')).toEqual([
      { category_id: 1, currency: 'CRC', amount_cents: 9000000 },
    ])
    expect(await rows('SELECT amount_cents, note FROM recurring')).toEqual([
      { amount_cents: 4500000, note: 'Luz' },
    ])
    expect(await rows('SELECT amount_cents, direction FROM savings')).toEqual([
      { amount_cents: 3000000, direction: 'in' },
    ])
    expect(await rows('SELECT name FROM categories WHERE id = 5')).toEqual([
      { name: 'Mascotas' },
    ])
    const indexed = await rows('PRAGMA index_info(idx_transactions_date)')
    expect(indexed.map((column) => column.name)).toEqual(['date'])
  })

  it('accepts cash, card and sinpe and rejects anything else', async () => {
    await runMigrations(db)
    const add = (method) =>
      db.run(
        `INSERT INTO transactions
          (amount_cents, currency, type, category_id, note, date, payment_method)
          VALUES (100, 'CRC', 'expense', 1, '', '2026-10-01', ?)`,
        [method],
      )
    await add('cash')
    await add('card')
    await add('sinpe')
    await expect(add('bitcoin')).rejects.toThrow()
    await expect(add(null)).rejects.toThrow()
    expect(await rows('SELECT payment_method FROM transactions ORDER BY id')).toEqual([
      { payment_method: 'cash' },
      { payment_method: 'card' },
      { payment_method: 'sinpe' },
    ])
  })

  it('gives cash to a row inserted without a method (older code paths)', async () => {
    await runMigrations(db)
    await insertTx(1, 700)
    expect(await rows('SELECT payment_method FROM transactions')).toEqual([
      { payment_method: 'cash' },
    ])
  })

  it('does not run again on a database that is already at version 5', async () => {
    await fillVersion4()
    await runMigrations(db)
    await db.run("UPDATE transactions SET payment_method = 'card' WHERE id = 1")
    await runMigrations(db)
    expect(await version()).toBe(7)
    expect(await rows('SELECT payment_method FROM transactions WHERE id = 1')).toEqual([
      { payment_method: 'card' },
    ])
  })
})

// A database as version 5 of the app left it, with every table filled
async function fillVersion5() {
  await fillVersion4()
  await runMigrations(db, migrations.slice(0, 5))
  await db.run("UPDATE transactions SET payment_method = 'card' WHERE id = 2")
}

describe('upgrading from version 5 (configurable quincena, v6)', () => {
  it('keeps every row of every table untouched', async () => {
    await fillVersion5()
    expect(await version()).toBe(5)
    const tables = ['categories', 'transactions', 'budgets', 'recurring', 'savings']
    const before = {}
    for (const table of tables) {
      before[table] = await rows(`SELECT * FROM ${table} ORDER BY 1`)
    }

    await runMigrations(db)

    expect(await version()).toBe(7)
    for (const table of tables) {
      expect(await rows(`SELECT * FROM ${table} ORDER BY 1`)).toEqual(before[table])
    }
  })

  it('leaves the person in 15/30 (days 1 and 16) from the start of time', async () => {
    await fillVersion5()
    await runMigrations(db)
    expect(await rows('SELECT * FROM quincena_config')).toEqual([
      { effective_from: '2000-01-01', mode: 'fixed', day1: 1, day2: 16 },
    ])
  })

  it('seeds 15/30 on a new database too', async () => {
    await runMigrations(db)
    expect(await rows('SELECT mode, day1, day2 FROM quincena_config')).toEqual([
      { mode: 'fixed', day1: 1, day2: 16 },
    ])
  })

  it('accepts one or two pay days and rejects bad modes, days and repeats', async () => {
    await runMigrations(db)
    const add = (from, mode, day1, day2) =>
      db.run(
        'INSERT INTO quincena_config (effective_from, mode, day1, day2) VALUES (?, ?, ?, ?)',
        [from, mode, day1, day2],
      )
    await expect(add('2026-11-05', 'paydays', 5, 20)).resolves.toBeDefined()
    await expect(add('2026-12-01', 'paydays', 31, null)).resolves.toBeDefined()
    await expect(add('2027-01-01', 'weekly', 5, 20)).rejects.toThrow()
    await expect(add('2027-02-01', 'paydays', 0, null)).rejects.toThrow()
    await expect(add('2027-03-01', 'paydays', 5, 32)).rejects.toThrow()
    await expect(add('2026-11-05', 'paydays', 7, null)).rejects.toThrow()
  })

  it('does not seed again on a database that is already at version 6', async () => {
    await fillVersion5()
    await runMigrations(db)
    await db.run("UPDATE quincena_config SET mode = 'paydays', day1 = 5, day2 = 20")
    await runMigrations(db)
    expect(await rows('SELECT mode, day1, day2 FROM quincena_config')).toEqual([
      { mode: 'paydays', day1: 5, day2: 20 },
    ])
  })
})

// A database as version 6 of the app left it, with every table filled
async function fillVersion6() {
  await fillVersion5()
  await runMigrations(db, migrations.slice(0, 6))
}

const profileRows = () => rows('SELECT * FROM profile')

describe('upgrading from version 6 (profile and first-use screen, v7)', () => {
  it('marks a person with real data as done, so they never see the welcome', async () => {
    await fillVersion6()
    expect(await version()).toBe(6)

    await runMigrations(db)

    expect(await version()).toBe(7)
    const [profile] = await profileRows()
    expect(profile.id).toBe(1)
    expect(profile.onboarded_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(profile).toMatchObject({
      name: '',
      income_cents: null,
      currency: 'CRC',
      savings_goal_cents: null,
    })
  })

  it('keeps every row of every table untouched', async () => {
    await fillVersion6()
    const tables = [
      'categories', 'transactions', 'budgets', 'recurring', 'savings', 'quincena_config',
    ]
    const before = {}
    for (const table of tables) {
      before[table] = await rows(`SELECT * FROM ${table} ORDER BY 1`)
    }
    await runMigrations(db)
    for (const table of tables) {
      expect(await rows(`SELECT * FROM ${table} ORDER BY 1`)).toEqual(before[table])
    }
  })

  it.each([
    ['transactions', () => insertTx(1)],
    [
      'recurring',
      () =>
        db.run(
          `INSERT INTO recurring (amount_cents, currency, type, schedule)
            VALUES (100, 'CRC', 'income', 'every')`,
        ),
    ],
    [
      'savings',
      () =>
        db.run(
          `INSERT INTO savings (amount_cents, currency, direction, date)
            VALUES (100, 'CRC', 'in', '2026-10-01')`,
        ),
    ],
    [
      'budgets',
      () =>
        db.run(
          "INSERT INTO budgets (category_id, currency, amount_cents) VALUES (1, 'CRC', 100)",
        ),
    ],
    [
      'a custom category',
      () => db.run("INSERT INTO categories (name, color) VALUES ('Mascota', 'pink')"),
    ],
    [
      'a changed quincena',
      () =>
        db.run(
          "INSERT INTO quincena_config (effective_from, mode, day1, day2) VALUES ('2026-06-01', 'paydays', 5, 20)",
        ),
    ],
  ])('marks a person whose only data is %s as done', async (_name, addData) => {
    await migrateTo(6)
    await addData()
    await runMigrations(db)
    expect((await profileRows())[0].onboarded_at).not.toBeNull()
  })

  it('leaves a really new install (and an opened but empty one) to see the welcome', async () => {
    await runMigrations(db)
    expect(await profileRows()).toEqual([
      {
        id: 1,
        name: '',
        income_cents: null,
        currency: 'CRC',
        savings_goal_cents: null,
        onboarded_at: null,
      },
    ])

    const old = await createTestDb()
    db = old
    await migrateTo(6)
    await runMigrations(db)
    expect((await profileRows())[0].onboarded_at).toBeNull()
  })

  it('does not run again on a database that is already at version 7', async () => {
    await fillVersion6()
    await runMigrations(db)
    await db.run("UPDATE profile SET name = 'Ana', onboarded_at = '2026-10-01'")
    await runMigrations(db)
    expect(await profileRows()).toHaveLength(1)
    expect((await profileRows())[0]).toMatchObject({
      name: 'Ana',
      onboarded_at: '2026-10-01',
    })
  })

  it('allows only one row and valid values', async () => {
    await runMigrations(db)
    await expect(db.run('INSERT INTO profile (id) VALUES (2)')).rejects.toThrow()
    await expect(db.run("UPDATE profile SET currency = 'EUR'")).rejects.toThrow()
    await expect(db.run('UPDATE profile SET income_cents = 0')).rejects.toThrow()
    await expect(db.run('UPDATE profile SET savings_goal_cents = -1')).rejects.toThrow()
    await expect(
      db.run("UPDATE profile SET currency = 'USD', income_cents = 5000"),
    ).resolves.toBeDefined()
  })
})

describe('schema constraints', () => {
  beforeEach(async () => {
    await runMigrations(db)
  })

  it('rejects an amount of 0 and a negative amount', async () => {
    await expect(insertTx(1, 0)).rejects.toThrow()
    await expect(insertTx(1, -5)).rejects.toThrow()
    expect(await rows('SELECT * FROM transactions')).toEqual([])
  })

  it('rejects a transaction with an unknown category', async () => {
    await expect(insertTx(99)).rejects.toThrow(/FOREIGN KEY/i)
    expect(await rows('SELECT * FROM transactions')).toEqual([])
  })

  it('needs a category to have a key or a name, not both or neither', async () => {
    await expect(
      db.run("INSERT INTO categories (key, name, color) VALUES ('x', 'X', 'red')"),
    ).rejects.toThrow()
    await expect(
      db.run("INSERT INTO categories (color) VALUES ('red')"),
    ).rejects.toThrow()
    expect(await rows('SELECT id FROM categories')).toHaveLength(4)
  })

  it('rejects a duplicate budget for the same category and currency', async () => {
    const add = (currency) =>
      db.run(
        'INSERT INTO budgets (category_id, currency, amount_cents) VALUES (1, ?, 100)',
        [currency],
      )
    await add('CRC')
    await expect(add('CRC')).rejects.toThrow()
    await expect(add('USD')).resolves.toBeDefined()
    expect(await rows('SELECT currency FROM budgets ORDER BY currency')).toEqual(
      [{ currency: 'CRC' }, { currency: 'USD' }],
    )
  })

  it('deletes budgets and clears recurring items when a category is deleted', async () => {
    await db.run("INSERT INTO categories (id, name, color) VALUES (9, 'Pets', 'cyan')")
    await db.run(
      "INSERT INTO budgets (category_id, currency, amount_cents) VALUES (9, 'CRC', 100), (1, 'CRC', 100)",
    )
    await db.run(
      `INSERT INTO recurring (amount_cents, currency, type, category_id, schedule)
        VALUES (100, 'CRC', 'expense', 9, 'every'),
               (100, 'CRC', 'expense', 1, 'every')`,
    )

    await db.run('DELETE FROM categories WHERE id = 9')

    expect(await rows('SELECT category_id FROM budgets')).toEqual([
      { category_id: 1 },
    ])
    expect(
      await rows('SELECT id, category_id FROM recurring ORDER BY id'),
    ).toEqual([
      { id: 1, category_id: null },
      { id: 2, category_id: 1 },
    ])
  })

  it('rejects a savings move with a bad direction, currency or amount', async () => {
    const add = (amountCents, currency, direction) =>
      db.run(
        `INSERT INTO savings (amount_cents, currency, direction, date)
          VALUES (?, ?, ?, '2026-10-01')`,
        [amountCents, currency, direction],
      )
    await expect(add(100, 'CRC', 'sideways')).rejects.toThrow()
    await expect(add(100, 'EUR', 'in')).rejects.toThrow()
    await expect(add(0, 'CRC', 'in')).rejects.toThrow()
    await expect(add(-5, 'CRC', 'out')).rejects.toThrow()
    expect(await rows('SELECT * FROM savings')).toEqual([])
    await expect(add(100, 'CRC', 'in')).resolves.toBeDefined()
    await expect(add(100, 'USD', 'out')).resolves.toBeDefined()
    expect(await rows('SELECT note FROM savings')).toEqual([
      { note: '' },
      { note: '' },
    ])
  })

  it('refuses to delete a category that still has transactions', async () => {
    await insertTx(1)
    await expect(db.run('DELETE FROM categories WHERE id = 1')).rejects.toThrow(
      /FOREIGN KEY/i,
    )
  })
})

describe('a migration that fails part-way', () => {
  it('keeps the old version and rolls back what it did', async () => {
    const failing = async (database) => {
      await database.execute('CREATE TABLE half_done (id INTEGER)', false)
      await database.run('INSERT INTO half_done (id) VALUES (1)', [], false)
      await database.run('INSERT INTO nope (id) VALUES (1)', [], false)
    }

    await expect(
      runMigrations(db, [...migrations.slice(0, 2), failing]),
    ).rejects.toThrow(/nope/)

    expect(await version()).toBe(2)
    expect(await tableNames()).not.toContain('half_done')
    expect(await tableNames()).toContain('budgets')
    expect((await db.isTransactionActive()).result).toBe(false)
  })

  it('does not apply later migrations after a failure', async () => {
    const boom = async () => {
      throw new Error('boom')
    }
    await expect(
      runMigrations(db, [migrations[0], boom, migrations[1]]),
    ).rejects.toThrow('boom')

    expect(await version()).toBe(1)
    expect(await tableNames()).not.toContain('budgets')
  })
})
