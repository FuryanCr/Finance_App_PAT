import { Link } from 'react-router-dom'
import { categoryLabel } from '../../lib/categories'
import { useTransactions } from '../../context/useTransactions'
import { getQuincenaRange, parseDate } from '../../lib/dates'
import { currencies, formatMoney, getTotals, sum } from '../../lib/money'
import { useSettings } from '../../context/useSettings'
import TransactionItem from '../../components/TransactionItem'

export default function HomeScreen() {
  const { locale, t } = useSettings()

  const { start, end } = getQuincenaRange()
  const { transactions, categories } = useTransactions()
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
                <p className="stat">−{formatMoney(spent, code)}</p>
              </div>
            </div>

            <ul className="list divider">
              {categories.map((c) => {
                const total = sum(
                  expenses
                    .filter((tx) => tx.categoryId === c.id)
                    .map((tx) => tx.amount),
                )
                if (total === 0) return null
                return (
                  <li key={c.id}>
                    <div className="row">
                      <span className="row-name">{categoryLabel(c, t)}</span>
                      <span className="row-amount">
                        {formatMoney(total, code)}
                      </span>
                    </div>
                    <div className="mini-bar">
                      <div style={{ width: `${(total / spent) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <div className="btn-row">
        <Link className="btn" to="/add?type=expense">
          {t('addExpense')}
        </Link>
        <Link className="btn secondary" to="/add?type=income">
          {t('addIncome')}
        </Link>
      </div>

      <section className="card">
        <p className="label">{t('recent')}</p>
        <ul className="list">
          {recent.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} />
          ))}
        </ul>
      </section>
    </>
  )
}