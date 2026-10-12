let lockPromise = null

// Only one tab may use the database: every tab keeps its own copy in memory
// and saves the whole thing, so a second tab would overwrite the first.
// Resolves true when this tab holds the lock (kept until the tab closes),
// false when another tab already has it.
export function acquireTabLock() {
  if (!lockPromise) {
    lockPromise = new Promise((resolve) => {
      try {
        if (!navigator.locks) {
          resolve(true)
          return
        }
        navigator.locks
          .request('quincena-db', { ifAvailable: true }, (lock) => {
            if (!lock) {
              resolve(false)
              return undefined
            }
            resolve(true)
            // never settles, so the lock is held until the tab closes
            return new Promise(() => {})
          })
          .catch(() => resolve(true))
      } catch {
        resolve(true)
      }
    })
  }
  return lockPromise
}
