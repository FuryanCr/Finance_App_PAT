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

    expect(migrations).toHaveLength(4)
    expect(await version()).toBe(4)
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

    expect(await version()).toBe(4)
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

    expect(await version()).toBe(4)
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

    expect(await version()).toBe(4)
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

    expect(await version()).toBe(4)
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
