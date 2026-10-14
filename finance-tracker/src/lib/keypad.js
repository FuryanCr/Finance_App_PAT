import { MAX_AMOUNT } from './money'

// The keys of the on-screen keypad. Colones are typed in whole colones, so
// they get "000" where dollars have the decimal point.
export function keypadKeys(currency) {
  return [
    '1', '2', '3', '4', '5', '6', '7', '8', '9',
    currency === 'USD' ? '.' : '000',
    '0',
    '⌫',
  ]
}

// The digits typed so far with one key applied. `text` is the amount as typed
// ('' , '3600', '12.5'); the result is the new text. Keys that would give an
// invalid amount (a second point, more than two decimals, above the cap,
// leading zeros) do nothing. Used by the keypad and by the physical keyboard.
export function applyKey(text, key, currency) {
  if (key === '⌫') return text.slice(0, -1)

  if (key === '.' || key === ',') {
    // colones have no decimals; a second point does nothing
    if (currency !== 'USD' || text.includes('.')) return text
    return text === '' ? '0.' : `${text}.`
  }

  let next
  if (key === '000') {
    // nothing to multiply yet, and no thousands inside the decimals
    if (text === '' || text === '0' || text.includes('.')) return text
    next = `${text}000`
  } else if (/^[0-9]$/.test(key)) {
    if (text === '0') next = key
    else next = `${text}${key}`
  } else {
    return text
  }

  if (next.includes('.') && next.split('.')[1].length > 2) return text
  if (Number(next) > MAX_AMOUNT) return text
  return next
}

// What is shown while typing: thousands grouped the way money is shown
// elsewhere. '3600' -> '3.600' (colones), '1234.5' -> '1,234.5' (dollars).
// A trailing point is kept so the user sees it was typed.
export function formatTyping(text, currency) {
  if (text === '') return ''
  const [whole, fraction] = text.split('.')
  const separator = currency === 'USD' ? ',' : '.'
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  if (fraction === undefined) return grouped
  return `${grouped}${currency === 'USD' ? '.' : ','}${fraction}`
}
