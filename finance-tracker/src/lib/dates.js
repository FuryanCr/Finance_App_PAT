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

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Parses 'YYYY-MM-DD' as a local date (avoids timezone shifts)
export function parseDate(value) {
  return new Date(`${value}T00:00:00`)
}