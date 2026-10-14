// Quincena = 1st-15th, or 16th-end of month
export function getQuincenaRange(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  if (date.getDate() <= 15) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15, 23, 59, 59),
    }
  }
  return {
    start: new Date(year, month, 16),
    end: new Date(year, month + 1, 0, 23, 59, 59),
  }
}

// Whole days from a to b, ignoring the time of day
export function daysBetween(a, b) {
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((end - start) / 86400000)
}

// Days remaining in the quincena, counting today (the last day gives 1)
export function daysLeftInQuincena(date = new Date()) {
  return daysBetween(date, getQuincenaRange(date).end) + 1
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = parseDate(value)
  // the engine rolls 2026-02-31 over to March 3: reject dates that moved
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Sort order for transactions: newest date first; on the same date, the one
// added last comes first
export function byNewest(a, b) {
  return b.date.localeCompare(a.date) || b.id - a.id
}

// Parses 'YYYY-MM-DD' as a local date (avoids timezone shifts)
export function parseDate(value) {
  return new Date(`${value}T00:00:00`)
}

// Local 'YYYY-MM-DD'
export function todayString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// 'YYYY-MM-1' for days 1-15, 'YYYY-MM-2' for the rest of the month
export function quincenaKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${date.getDate() <= 15 ? 1 : 2}`
}

// True when the two dates fall on different calendar days
export function dayChanged(previous, now) {
  return todayString(previous) !== todayString(now)
}

// Milliseconds until one second after the next local midnight
export function msUntilTomorrow(now = new Date()) {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1,
  )
  return tomorrow.getTime() - now.getTime()
}
