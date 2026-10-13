import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '../../context/useTransactions'
import {
  byNewest,
  daysLeftInQuincena,
  getQuincenaRange,
  parseDate,
  quincenaKey,
  todayString,
} from '../../lib/dates'
import { useToday } from '../../lib/useToday'
import {
  currencies,
  formatMoney,
  getTotals,
  laterTotal,
  safePerDay,
  sum,
} from '../../lib/money'
import { isBackupDue } from '../../lib/backup'
import { readPref, writePref } from '../../lib/prefs'
import { isDue, pendingTotal } from '../../lib/recurring'
import {
  leftInRange,
  previousQuincenaRange,
  savingsBalance,
  savingsInRange,
} from '../../lib/savings'
import { getCategoryTotals } from '../../lib/stats'
import { useSettings } from '../../context/useSettings'
import CategoryBars from '../../components/CategoryBars'
import RecurringRow from '../../components/RecurringRow'
import TransactionItem from '../../components/TransactionItem'

const skipKey = (code) => `rolloverSkipped.${code}`

export default function HomeScreen() {
  const { locale, t } = useSettings()

  const today = useToday()
  const { start, end } = getQuincenaRange(today)
  const daysLeft = daysLeftInQuincena(today)
  const {
    transactions,
    categories,
    budgets,
    recurring,
    savings,
    confirmRecurring,
    skipRecurring,
    addSavingsMove,
  } = useTransactions()
  const [busy, setBusy] = useState(false)
  // the quincena each currency's rollover offer was skipped for
  const [skipped, setSkipped] = useState(() =>
    Object.fromEntries(currencies.map((c) => [c.code, readPref(skipKey(c.code))])),
  )
  const current = transactions.filter((tx) => {
    const date = parseDate(tx.date)
    return date >= start && date <= end
  })
  const recent = [...transactions]
    .sort(byNewest)
    .slice(0, 5)

  const due = recurring.filter((item) => isDue(item, today))

  // last quincena's leftover is offered once per currency
  const previous = previousQuincenaRange(today)
  const previousKey = quincenaKey(previous.start)
  const offers = currencies
    .map(({ code }) => ({
      code,
      leftover: leftInRange(
        transactions,
        savings,
        code,
        previous.start,
        previous.end,
      ),
    }))
    .filter(({ code, leftover }) => leftover > 0 && skipped[code] !== previousKey)

  // one action at a time; a failed write is reported, not swallowed
  const run = async (action) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } catch (error) {
      console.error(error)
      window.alert(t('saveError'))
    } finally {
      setBusy(false)
    }
  }

  // dated the last day of the previous quincena, so that period closes at
  // zero and this quincena is not touched
  const moveLeftover = (code, leftover) =>
    run(() =>
      addSavingsMove({
        amount: leftover,
        currency: code,
        direction: 'in',
        note: t('rolloverNote'),
        date: todayString(previous.end),
      }),
    )

  const skipLeftover = (code) =>
    run(async () => {
      writePref(skipKey(code), previousKey)
      setSkipped((prev) => ({ ...prev, [code]: previousKey }))
    })

  const format = { month: 'short', day: 'numeric' }

  // a currency gets a card when it has transactions, pending bills or savings
  // moves; the first one is highlighted
  const shown = currencies
    .map((c) => ({
      ...c,
      ...getTotals(current, c.code),
      ...savingsInRange(savings, c.code, start, end),
      // due bills are not transactions yet, but the money is spoken for
      pending: pendingTotal(recurring, c.code, today),
    }))
    .filter(
      (c) =>
        c.count > 0 || c.pending > 0 || c.toSavings > 0 || c.fromSavings > 0,
    )

  const renderCard = (
    { code, labelKey, income, spent, net, pending, toSavings, fromSavings },
    index,
  ) => {
    const expenses = current.filter(
      (tx) => tx.currency === code && tx.type === 'expense',
    )
    const left = sum([net, -toSavings, fromSavings])
    const pct =
      income > 0 ? Math.min(Math.round((spent / income) * 100), 100) : 0
    const available = sum([left, -pending])
    const later = laterTotal(current, code, today)
    const laterIncome = laterTotal(current, code, today, 'income')
    const categoryTotals = getCategoryTotals(expenses, categories)
    const daysText =
      daysLeft === 1 ? t('lastDay') : `${daysLeft} ${t('daysLeft')}`

    return (
      <section className={index === 0 ? 'card hero' : 'card'} key={code}>
        <p className="label">
          {t('leftThisQuincena')} · {t(labelKey)}
        </p>
        <p className="balance">{formatMoney(left, code)}</p>

        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="sub">
          {pct}% {t('ofIncomeSpent')}
          {later > 0 && ` · ${t('includesLater')} ${formatMoney(later, code)}`}
        </p>
        {laterIncome > 0 && (
          <p className="sub">
            {t('includesLaterIncome')} {formatMoney(laterIncome, code)}
          </p>
        )}

        <div className="stats-row">
          <div>
            <p className="label">{t('income')}</p>
            <p className="stat income">+{formatMoney(income, code)}</p>
          </div>
          <div>
            <p className="label">{t('spent')}</p>
            <p className="stat spending">−{formatMoney(spent, code)}</p>
          </div>
        </div>

        {(toSavings > 0 || fromSavings > 0) && (
          <div className="stats-row">
            {toSavings > 0 && (
              <div>
                <p className="label">{t('toSavings')}</p>
                <p className="stat">−{formatMoney(toSavings, code)}</p>
              </div>
            )}
            {fromSavings > 0 && (
              <div>
                <p className="label">{t('fromSavings')}</p>
                <p className="stat">+{formatMoney(fromSavings, code)}</p>
              </div>
            )}
          </div>
        )}

        {/* hidden until the quincena has income or money taken from savings */}
        {income > 0 || fromSavings > 0 ? (
          <div className="safe-day">
            <p className="label">{t('safePerDay')}</p>
            {available > 0 ? (
              <>
                <p className="stat">
                  {formatMoney(safePerDay(available, daysLeft, code), code)}
                </p>
                <p className="sub">
                  {daysText}
                  {pending > 0 &&
                    ` · ${t('afterPending')} ${formatMoney(pending, code)}`}
                </p>
              </>
            ) : left > 0 ? (
              <>
                <p className="stat over">{t('pendingExceeds')}</p>
                <p className="sub">
                  {t('afterPending')} {formatMoney(pending, code)}
                </p>
              </>
            ) : (
              <p className="stat over">{t('overBudget')}</p>
            )}
          </div>
        ) : (
          pending > 0 && (
            <div className="safe-day">
              <p className="label">{t('pendingBills')}</p>
              <p className="stat">{formatMoney(pending, code)}</p>
            </div>
          )
        )}

        {categoryTotals.length > 0 && (
          <CategoryBars
            className="list divider"
            totals={categoryTotals}
            currency={code}
            budgets={budgets.filter((b) => b.currency === code)}
            limit={index === 0 ? undefined : 3}
          />
        )}
      </section>
    )
  }

  const balancesText =
    currencies
      .map(({ code }) => ({ code, balance: savingsBalance(savings, code) }))
      .filter(({ balance }) => balance !== 0)
      .map(({ code, balance }) => formatMoney(balance, code))
      .join(' · ') || formatMoney(0, 'CRC')

  return (
    <>
      <div>
        <h1 className="screen-title">{t('welcome')}</h1>
        <p className="sub">
          {t('quincena')} · {start.toLocaleDateString(locale, format)} -{' '}
          {end.toLocaleDateString(locale, format)}
        </p>
      </div>

      {offers.length > 0 && (
        <section className="card">
          <p className="label">{t('lastQuincenaLeft')}</p>
          <ul className="list">
            {offers.map(({ code, leftover }) => (
              <li key={code}>
                <div className="row">
                  <span className="row-name">{t('moveItToSavings')}</span>
                  <span className="row-amount">
                    {formatMoney(leftover, code)}
                  </span>
                </div>
                <div className="due-actions">
                  <button
                    type="button"
                    className="pill active"
                    disabled={busy}
                    onClick={() => moveLeftover(code, leftover)}
                  >
                    {t('moveToSavings')}
                  </button>
                  <button
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={() => skipLeftover(code)}
                  >
                    {t('skip')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shown.slice(0, 1).map((c) => renderCard(c, 0))}

      {due.length > 0 && (
        <section className="card">
          <p className="label">{t('dueThisQuincena')}</p>
          <ul className="list">
            {due.map((item) => (
              <li key={item.id}>
                <RecurringRow item={item} />
                <div className="due-actions">
                  <button
                    type="button"
                    className="pill active"
                    disabled={busy}
                    onClick={() => run(() => confirmRecurring(item))}
                  >
                    {t('confirm')}
                  </button>
                  <button
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={() => run(() => skipRecurring(item))}
                  >
                    {t('skip')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shown.slice(1).map((c, i) => renderCard(c, i + 1))}

      <Link className="card link-card" to="/savings">
        <span className="row-name">{t('savings')}</span>
        <span className="row-amount">{balancesText}</span>
      </Link>

      {shown.length === 0 && (
        <section className="card">
          <p className="sub empty">
            {transactions.length === 0 ? t('emptyAll') : t('emptyQuincena')}
          </p>
        </section>
      )}

      <div className="btn-row">
        <Link className="btn" to="/add?type=expense">
          {t('addExpense')}
        </Link>
        <Link className="btn secondary" to="/add?type=income">
          {t('addIncome')}
        </Link>
      </div>

      {recent.length > 0 && (
        <section className="card">
          <p className="label">{t('recent')}</p>
          <ul className="list">
            {recent.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </ul>
        </section>
      )}

      {transactions.length > 0 && isBackupDue(readPref('lastBackup'), today) && (
        <p className="sub backup-line">
          {t('backupReminder')}{' '}
          <Link className="text-link" to="/settings">
            {t('goToBackup')}
          </Link>
        </p>
      )}
    </>
  )
}
