// When a quincena starts and ends. Pure functions: no database, no clock.
//
// A schedule is a list of entries, oldest first. Each entry says how the
// quincena was cut from its `from` date (YYYY-MM-DD) on:
//   { from, mode: 'fixed',   day1: 1, day2: 16 }  15/30: days 1 and 16
//   { from, mode: 'paydays', day1: 5, day2: 20 }  the person's pay days;
//                                                 day2 may be null (one a month)
// A quincena STARTS on a pay day and lasts until the day before the next one.
// If the month is too short for a day (31 in April, 30 in February) the last
// day of the month is used. Changing the schedule adds an entry that takes
// effect later, so a date in the past is always cut the way it was then.

export const DEFAULT_SCHEDULE = [
  { from: '2000-01-01', mode: 'fixed', day1: 1, day2: 16 },
]

const DAY = /^\d{4}-\d{2}-\d{2}$/

const isDay = (value) => Number.isInteger(value) && value >= 1 && value <= 31

function ymd(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function fromText(text) {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function cleanEntry(entry) {
  if (!entry || typeof entry.from !== 'string' || !DAY.test(entry.from)) {
    return null
  }
  if (Number.isNaN(fromText(entry.from).getTime())) return null
  if (entry.mode === 'fixed') {
    return { from: entry.from, mode: 'fixed', day1: 1, day2: 16 }
  }
  if (entry.mode !== 'paydays' || !isDay(entry.day1)) return null
  const day2 = isDay(entry.day2) ? entry.day2 : null
  const days = [entry.day1, day2].filter((day) => day !== null).sort((a, b) => a - b)
  return { from: entry.from, mode: 'paydays', day1: days[0], day2: days[1] ?? null }
}

// Anything unusable (missing, damaged, empty) reads as 15/30
export function normalizeSchedule(list) {
  if (!Array.isArray(list)) return DEFAULT_SCHEDULE
  const byDate = new Map()
  for (const item of list) {
    const entry = cleanEntry(item)
    if (entry) byDate.set(entry.from, entry)
  }
  const entries = [...byDate.values()].sort((a, b) => a.from.localeCompare(b.from))
  return entries.length > 0 ? entries : DEFAULT_SCHEDULE
}

// The entry in force on a date; before the first one, the first one
function entryIndexAt(schedule, date) {
  const text = ymd(date)
  let found = 0
  schedule.forEach((entry, index) => {
    if (entry.from <= text) found = index
  })
  return found
}

// The pay days of one month (month is 0-11), sorted, without repeats
function paydaysOf(entry, year, month) {
  const last = new Date(year, month + 1, 0).getDate()
  const days = entry.mode === 'fixed' ? [1, 16] : [entry.day1, entry.day2]
  const resolved = days.filter((day) => day !== null).map((day) => Math.min(day, last))
  return [...new Set(resolved)].sort((a, b) => a - b)
}

// Every pay day of the months around a date, as dates, oldest first
function paydayDates(entry, date) {
  const dates = []
  for (let offset = -1; offset <= 1; offset++) {
    const first = new Date(date.getFullYear(), date.getMonth() + offset, 1)
    for (const day of paydaysOf(entry, first.getFullYear(), first.getMonth())) {
      dates.push(new Date(first.getFullYear(), first.getMonth(), day))
    }
  }
  return dates
}

// The quincena that contains a date: { start, end } with end at 23:59:59
export function rangeFor(date = new Date(), schedule = DEFAULT_SCHEDULE) {
  const index = entryIndexAt(schedule, date)
  const entry = schedule[index]
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const paydays = paydayDates(entry, day)

  let start = paydays[0]
  let next = paydays[paydays.length - 1]
  for (let i = 0; i < paydays.length; i++) {
    if (paydays[i] <= day) start = paydays[i]
    else {
      next = paydays[i]
      break
    }
  }

  // a new schedule does not reach back before the day it starts
  const from = fromText(entry.from)
  if (index > 0 && start < from) start = from
  // and the old one stops where the new one starts
  const following = schedule[index + 1]
  if (following) {
    const limit = fromText(following.from)
    if (limit < next) next = limit
  }

  return {
    start,
    end: new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1, 23, 59, 59),
  }
}

// The kind of month position of the quincena of a date, for monthly items:
// 'first' or 'second' of the month, or 'both' when there is one pay day a
// month (a monthly item is then due every time)
export function halfOf(date = new Date(), schedule = DEFAULT_SCHEDULE) {
  const entry = schedule[entryIndexAt(schedule, date)]
  const { start } = rangeFor(date, schedule)
  const days = paydaysOf(entry, start.getFullYear(), start.getMonth())
  if (days.length < 2) return 'both'
  return start.getDate() >= days[1] ? 'second' : 'first'
}

// Text that identifies a quincena, to remember that something was handled in
// it. 15/30 keeps the old form ('2026-10-1' / '2026-10-2') so values saved by
// earlier versions still match; any other schedule uses the start date.
export function keyFor(date = new Date(), schedule = DEFAULT_SCHEDULE) {
  const entry = schedule[entryIndexAt(schedule, date)]
  if (entry.mode === 'fixed') {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${date.getDate() <= 15 ? 1 : 2}`
  }
  return ymd(rangeFor(date, schedule).start)
}

// The schedule after the person chooses a new way to cut the quincena.
// The quincena in progress is left as it is: the choice takes effect on the
// first day after it. A choice that was waiting to take effect is replaced,
// and choosing what is already in force changes nothing.
export function changeSchedule(schedule, choice, today = new Date()) {
  const current = normalizeSchedule(schedule)
  const todayText = ymd(today)
  const kept = current.filter((entry, index) => index === 0 || entry.from <= todayText)
  const { end } = rangeFor(today, kept)
  const from = ymd(new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1))
  const entry = cleanEntry({ ...choice, from })
  if (!entry) return current

  const inForce = kept[kept.length - 1]
  const same =
    inForce.mode === entry.mode &&
    inForce.day1 === entry.day1 &&
    inForce.day2 === entry.day2
  return same ? kept : [...kept, entry]
}

// What Settings shows: the entry in force today and the one waiting, if any
export function describeSchedule(schedule, today = new Date()) {
  const list = normalizeSchedule(schedule)
  const index = entryIndexAt(list, today)
  const pending = list.find((entry) => entry.from > ymd(today)) ?? null
  return { current: list[index], pending }
}
