import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { defineCustomElements } from 'jeep-sqlite/loader'
import { runMigrations } from './migrations'

const DB_NAME = 'quincena'

const isWeb = () => Capacitor.getPlatform() === 'web'
const sqlite = new SQLiteConnection(CapacitorSQLite)

async function openConnection() {
  if (isWeb()) {
    defineCustomElements(window)
    if (!document.querySelector('jeep-sqlite')) {
      document.body.appendChild(document.createElement('jeep-sqlite'))
    }
    await customElements.whenDefined('jeep-sqlite')
    await sqlite.initWebStore()
  }

  // A connection can outlive this module (e.g. Vite hot reload)
  const consistent = (await sqlite.checkConnectionsConsistency()).result
  const exists = (await sqlite.isConnection(DB_NAME, false)).result
  const db =
    consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)

  await db.open()
  await db.execute('PRAGMA foreign_keys = ON', false)
  await runMigrations(db)
  // ask the browser not to evict the data; the answer does not matter here
  if (isWeb()) navigator.storage?.persist?.()?.catch(() => {})
  return db
}

let dbPromise = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openConnection()
      .then(async (db) => {
        await persist()
        return db
      })
      .catch((error) => {
        dbPromise = null
        throw error
      })
  }
  return dbPromise
}

// On web the database lives in memory; save it to IndexedDB
export async function persist() {
  if (isWeb()) await sqlite.saveToStore(DB_NAME)
}
