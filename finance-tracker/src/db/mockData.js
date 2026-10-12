// color is the name of a --cat-* variable in index.css
// The ids, keys and colors of these built-in categories are written into the
// database by migration 1, so changing them here does not change existing
// installs: add a new migration instead.
export const categories = [
  { id: 1, key: 'food', color: 'orange' },
  { id: 2, key: 'transport', color: 'blue' },
  { id: 3, key: 'bills', color: 'violet' },
  { id: 4, key: 'fun', color: 'lime' },
]

export const transactions = [
  { id: 1, amount: 250000, currency: 'CRC', type: 'income', categoryId: null, note: 'Pay', date: '2026-10-01' },
  { id: 2, amount: 8500, currency: 'CRC', type: 'expense', categoryId: 1, note: 'Lunch', date: '2026-10-02' },
  { id: 3, amount: 3200, currency: 'CRC', type: 'expense', categoryId: 2, note: 'Bus', date: '2026-10-03' },
  { id: 4, amount: 45000, currency: 'CRC', type: 'expense', categoryId: 3, note: 'Electricity', date: '2026-10-05' },
  { id: 5, amount: 12000, currency: 'CRC', type: 'expense', categoryId: 4, note: 'Cinema', date: '2026-10-08' },
  { id: 6, amount: 6400, currency: 'CRC', type: 'expense', categoryId: 1, note: 'Groceries', date: '2026-10-10' },
  { id: 7, amount: 9000, currency: 'CRC', type: 'expense', categoryId: 1, note: 'Dinner', date: '2026-09-28' },
  { id: 8, amount: 100, currency: 'USD', type: 'income', categoryId: null, note: 'Freelance', date: '2026-10-04' },
  { id: 9, amount: 9.99, currency: 'USD', type: 'expense', categoryId: 4, note: 'Streaming', date: '2026-10-06' },
  { id: 10, amount: 15000, currency: 'CRC', type: 'expense', categoryId: 1, note: 'Groceries', date: '2026-09-14' },
  { id: 11, amount: 7000, currency: 'CRC', type: 'expense', categoryId: 2, note: 'Taxi', date: '2026-09-20' },
  { id: 12, amount: 22000, currency: 'CRC', type: 'expense', categoryId: 4, note: 'Concert', date: '2026-08-22' },
  { id: 13, amount: 38000, currency: 'CRC', type: 'expense', categoryId: 3, note: 'Internet', date: '2026-08-05' },
  { id: 14, amount: 18000, currency: 'CRC', type: 'expense', categoryId: 1, note: 'Restaurant', date: '2026-07-18' },
  { id: 15, amount: 52000, currency: 'CRC', type: 'expense', categoryId: 3, note: 'Water bill', date: '2025-11-10' },
]
