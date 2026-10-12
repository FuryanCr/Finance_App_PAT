import { Link } from 'react-router-dom'
import { useTransactions } from '../../context/useTransactions'
import {
  daysLeftInQuincena,
  getQuincenaRange,
  parseDate,
} from '../../lib/dates'
import {
  currencies,
  formatMoney,
  getTotals,
  safePerDay,
} from '../../lib/money'
import { getCategoryTotals } from '../../lib/stats'
import { useSettings } from '../../context/useSettings'
import CategoryBars from '../../components/CategoryBars'
import TransactionItem from '../../components/TransactionItem'

export default function HomeScreen() {
  const { locale, t } = useSettings()

  const { start, end } = getQuincenaRange()
  const daysLeft = daysLeftInQuincena()
  const { transactions, categories, budgets } = useTransactions()
  const current = transactions.filter((tx) => {
    const date = parseDate(tx.date)
    return date >= start && date <= end
  })
  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const format = { month: 'short', day: 'numeric' }

  return (
    <>
      <div>
        <h1 className="screen-title">{t('welcome')}</h1>
        <p className="sub">
          {t('quincena')} · {start.toLocaleDateString(locale, format)} -{' '}
          {end.toLocaleDateString(locale, format)}
        </p>
      </div>

      {currencies.map(({ code, labelKey }, index) => {
        const { count, income, spent, net } = getTotals(current, code)
        if (count === 0) return null

        const expenses = current.filter(
          (tx) => tx.currency === code && tx.type === 'expense',
        )
        const pct =
          income > 0 ? Math.min(Math.round((spent / income) * 100), 100) : 0

        return (
          <section className={index === 0 ? 'card hero' : 'card'} key={code}>
            <p className="label">
              {t('leftThisQuincena')} · {t(labelKey)}
            </p>
            <p className="balance">{formatMoney(net, code)}</p>

            <div className="progress" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="sub">
              {pct}% {t('ofIncomeSpent')}
            </p>

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

            {/* hidden until the quincena has income */}
            {income > 0 && (
              <div className="safe-day">
                <p className="label">{t('safePerDay')}</p>
                {net > 0 ? (
                  <>
                    <p className="stat">
                      {formatMoney(safePerDay(net, daysLeft, code), code)}
                    </p>
                    <p className="sub">
                      {daysLeft === 1
                        ? t('lastDay')
                        : `${daysLeft} ${t('daysLeft')}`}
                    </p>
                  </>
                ) : (
                  <p className="stat over">{t('overBudget')}</p>
                )}
              </div>
            )}

            <CategoryBars
              className="list divider"
              totals={getCategoryTotals(expenses, categories)}
              currency={code}
              budgets={budgets.filter((b) => b.currency === code)}
            />
          </section>
        )
      })}

      {current.length === 0 && (
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
    </>
  )
}