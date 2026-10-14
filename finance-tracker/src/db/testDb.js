import initSqlJs from 'sql.js'

// An in-memory SQLite (sql.js) that looks like the plugin's connection,
// so tests can run the app's real SQL
export async function createTestDb() {
  const SQL = await initSqlJs()
  const sqlite = new SQL.Database()
  let inTransaction = false

  // The real plugin wraps a call in its own transaction unless false is
  // passed, which corrupts an explicit transaction that is already open
  const checkTransaction = (transaction) => {
    if (inTransaction && transaction !== false) {
      throw new Error(
        'run/execute inside a transaction must pass false as the transaction argument',
      )
    }
  }

  const db = {
    async execute(sql, transaction) {
      checkTransaction(transaction)
      sqlite.exec(sql)
      return { changes: { changes: sqlite.getRowsModified() } }
    },

    async run(sql, params = [], transaction) {
      checkTransaction(transaction)
      const statement = sqlite.prepare(sql)
      try {
        statement.run(params)
      } finally {
        statement.free()
      }
      const changes = sqlite.getRowsModified()
      const lastId = sqlite.exec('SELECT last_insert_rowid()')[0].values[0][0]
      return { changes: { changes, lastId } }
    },

    async query(sql, params = []) {
      const statement = sqlite.prepare(sql)
      const values = []
      try {
        statement.bind(params)
        while (statement.step()) values.push(statement.getAsObject())
      } finally {
        statement.free()
      }
      return { values }
    },

    async beginTransaction() {
      sqlite.exec('BEGIN')
      inTransaction = true
    },

    async commitTransaction() {
      sqlite.exec('COMMIT')
      inTransaction = false
    },

    async rollbackTransaction() {
      sqlite.exec('ROLLBACK')
      inTransaction = false
    },

    async isTransactionActive() {
      return { result: inTransaction }
    },
  }

  await db.execute('PRAGMA foreign_keys = ON', false)
  return db
}
