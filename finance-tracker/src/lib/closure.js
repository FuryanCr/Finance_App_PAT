import { getTotals, sum } from './money'
import { parseDate, todayString } from './dates'
import { savingsInRange } from './savings'

// Pure rules for closing a quincena. Nothing here touches the database: the
// stored form of a closure (migration v7, still to come) is the object that
// closeQuincena returns, with amounts in whole units like the rest of lib/.
//
// A closure is a frozen summary of one finished quincena in ONE currency
// (colones and dollars are never mixed: there is no exchange rate):
//   { code, start, end, income, spent, toSavings, fromSavings,
//     closingIncome, leftover, carryIn, carryOut, adjusted }
// dates are 'YYYY-MM-DD'; leftover and carryOut can be negative (a deficit).

function inPeriod(items, start, end) {
  return items.filter((item) => {
    const date = parseDate(item.date)
    return date >= start && date <= end
  })
}

// Income dated on the closing day (the 15th or the last day of the month):
// money meant for the quincena that starts next.
function closingDayIncome(transactions, code, endText) {
  return sum(
    transactions
      .filter(
        (tx) =>
          tx.type === 'income' && tx.currency === code && tx.date === endText,
      )
      .map((tx) => tx.amount),
  )
}

// The figures of a quincena in one currency, from the data as it is now.
function periodFigures({ transactions, savings }, code, range) {
  const { income, spent } = getTotals(
    inPeriod(transactions, range.start, range.end),
    code,
  )
  const { toSavings, fromSavings } = savingsInRange(
    savings,
    code,
    range.start,
    range.end,
  )
  const closingIncome = closingDayIncome(
    transactions,
    code,
    todayString(range.end),
  )
  // what the period really had left: income - spent - saved + taken out
  const balance = sum([income, -spent, -toSavings, fromSavings])
  return { income, spent, toSavings, fromSavings, closingIncome, balance }
}

// RULE (closing a quincena). Once a quincena has ended, its summary is frozen
// and what is left of it, plus what it brought in, enters the next one:
//   leftover  = income - spent - toSavings + fromSavings, without the income
//               dated on the closing day (that pay is for the next quincena,
//               so it is not "left over" from this one);
//   carryOut  = carryIn + leftover + closingIncome, the whole balance that
//               passes to the next quincena (a deficit passes as a negative
//               number). Nothing is lost: the closing-day pay is not counted
//               as leftover but it is carried.
// Money moved to savings inside the quincena is already out of the leftover;
// money moved later, in the new quincena, comes out of that quincena's carry.
// Returns null while the quincena has not ended yet.
export function closeQuincena(data, code, range, carryIn = 0, today = new Date()) {
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  if (range.end >= todayDate) return null

  const figures = periodFigures(data, code, range)
  const leftover = sum([figures.balance, -figures.closingIncome])
  return {
    code,
    start: todayString(range.start),
    end: todayString(range.end),
    income: figures.income,
    spent: figures.spent,
    toSavings: figures.toSavings,
    fromSavings: figures.fromSavings,
    closingIncome: figures.closingIncome,
    leftover,
    carryIn,
    carryOut: sum([carryIn, figures.balance]),
    adjusted: 0,
  }
}

// RULE (late entries). A closure is never rewritten. A transaction or savings
// move added later but dated inside a closed quincena changes what that
// quincena "really" had; the difference between today's figures and the
// frozen ones (minus what was already absorbed, closure.adjusted) is the late
// adjustment, and it is charged to the quincena that is open now. A late
// expense gives a negative number, a late income a positive one.
export function lateAdjustment(closure, data) {
  const range = {
    start: parseDate(closure.start),
    end: parseDate(closure.end),
  }
  const now = periodFigures(data, closure.code, range)
  const frozen = sum([
    closure.income,
    -closure.spent,
    -closure.toSavings,
    closure.fromSavings,
  ])
  return sum([now.balance, -frozen, -closure.adjusted])
}

// RULE (opening balance). What the open quincena starts with in one currency:
// the carryOut of the latest closure plus the late adjustments of all the
// closures of that currency that have not been absorbed yet. With no closure
// there is nothing to carry. Each currency is its own: a dollar deficit stays
// a dollar deficit and never touches colones.
export function openingCarry(closures, data, code) {
  const own = closures
    .filter((closure) => closure.code === code)
    .sort((a, b) => (a.end < b.end ? -1 : 1))
  if (own.length === 0) return { carry: 0, late: 0, total: 0 }
  const carry = own[own.length - 1].carryOut
  const late = sum(own.map((closure) => lateAdjustment(closure, data)))
  return { carry, late, total: sum([carry, late]) }
}
