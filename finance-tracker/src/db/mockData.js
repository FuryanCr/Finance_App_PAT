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
