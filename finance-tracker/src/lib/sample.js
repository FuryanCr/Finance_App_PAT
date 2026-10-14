import { getQuincenaRange, todayString } from './dates'
import { DEFAULT_SCHEDULE } from './quincenaSchedule'
import { previousQuincenaRange } from './savings'

// Notes of the sample data, in the language of the interface
const NOTES = {
  es: {
    pay: 'Sueldo',
    lunch: 'Almuerzo',
    bus: 'Bus',
    electricity: 'Recibo de luz',
    cinema: 'Cine',
    groceries: 'Supermercado',
    freelance: 'Trabajo extra',
    films: 'Suscripción de películas',
    dinner: 'Cena',
    taxi: 'Taxi',
    concert: 'Concierto',
    internet: 'Internet',
    restaurant: 'Restaurante',
    water: 'Recibo de agua',
  },
  en: {
    pay: 'Pay',
    lunch: 'Lunch',
    bus: 'Bus',
    electricity: 'Electricity',
    cinema: 'Cinema',
    groceries: 'Groceries',
    freelance: 'Freelance',
    films: 'Streaming',
    dinner: 'Dinner',
    taxi: 'Taxi',
    concert: 'Concert',
    internet: 'Internet',
    restaurant: 'Restaurant',
    water: 'Water bill',
  },
}

// Example transactions for "Load sample data", dated around `today` so they
// show up on Home whatever day it is: the current quincena (never later than
// today), the previous one, and a few older months. Categories are the
// built-in ones (1 food, 2 transport, 3 bills, 4 fun).
export function sampleTransactions(
  today = new Date(),
  lang = 'es',
  schedule = DEFAULT_SCHEDULE,
) {
  const notes = NOTES[lang] ?? NOTES.es
  // never later than today, and never past the end of that quincena (a quincena
  // with other pay days can be shorter than 15 days)
  const dayOf = ({ start, end }, offset) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    return date > today ? today : date > last ? last : date
  }
  const current = getQuincenaRange(today, schedule)
  const previous = previousQuincenaRange(today, schedule)
  const monthsAgo = (count, day) =>
    new Date(today.getFullYear(), today.getMonth() - count, day)

  const entry = (date, amount, type, categoryId, note, currency = 'CRC') => ({
    amount,
    currency,
    type,
    categoryId,
    note,
    date: todayString(date),
  })

  return [
    entry(dayOf(current, 0), 250000, 'income', null, notes.pay),
    entry(dayOf(current, 1), 8500, 'expense', 1, notes.lunch),
    entry(dayOf(current, 2), 3200, 'expense', 2, notes.bus),
    entry(dayOf(current, 4), 45000, 'expense', 3, notes.electricity),
    entry(dayOf(current, 7), 12000, 'expense', 4, notes.cinema),
    entry(dayOf(current, 9), 6400, 'expense', 1, notes.groceries),
    entry(dayOf(current, 3), 100, 'income', null, notes.freelance, 'USD'),
    entry(dayOf(current, 5), 9.99, 'expense', 4, notes.films, 'USD'),
    entry(dayOf(previous, 13), 9000, 'expense', 1, notes.dinner),
    entry(dayOf(previous, 0), 15000, 'expense', 1, notes.groceries),
    entry(dayOf(previous, 6), 7000, 'expense', 2, notes.taxi),
    entry(monthsAgo(2, 22), 22000, 'expense', 4, notes.concert),
    entry(monthsAgo(2, 5), 38000, 'expense', 3, notes.internet),
    entry(monthsAgo(3, 18), 18000, 'expense', 1, notes.restaurant),
    entry(monthsAgo(11, 10), 52000, 'expense', 3, notes.water),
  ]
}
