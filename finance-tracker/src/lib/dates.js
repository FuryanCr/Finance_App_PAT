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
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parseDate(value).getTime())
  )
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Parses 'YYYY-MM-DD' as a local date (avoids timezone shifts)
export function parseDate(value) {
  return new Date(`${value}T00:00:00`)
}