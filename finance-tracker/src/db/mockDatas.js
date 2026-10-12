export const categories = [
  { id: 1, name: 'Food' },
  { id: 2, name: 'Transport' },
  { id: 3, name: 'Bills' },
  { id: 4, name: 'Fun' },
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
]