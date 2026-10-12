import { useState } from 'react'
import { useTransactions } from '../../context/useTransactions'
import { parseDate } from '../../lib/dates'
import {
  getCategoryTotals,
  getPeriodStart,
  getSpendingBars,
} from '../../lib/stats'
import { currencies, formatMoney } from '../../lib/money'
import { useSettings } from '../../context/useSettings'
import BarChart from '../../components/BarChart'
import CategoryBars from '../../components/CategoryBars'
import EmptyState from '../../components/EmptyState'
import TransactionItem from '../../components/TransactionItem'

export default function StatisticsScreen() {
  const { locale, t } = useSettings()
  const [period, setPeriod] = useState('week')
  const [currency, setCurrency] = useState('CRC')
  const { transactions, categories } = useTransactions()

  const bars = getSpendingBars(transactions, currency, period, new Date(), locale)
  // same range as the chart: last 7 days, 6 months or 3 years
  const periodStart = getPeriodStart(period)
  const byCategory = getCategoryTotals(
    transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.currency === currency &&
        parseDate(tx.date) >= periodStart,
    ),
    categories,
  ).sort((a, b) => b.total - a.total)
  const recent = transactions
    .filter((tx) => tx.currency === currency)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  if (transactions.length === 0) {
    return (
      <>
        <h1 className="screen-title">{t('statistics')}</h1>
        <EmptyState />
      </>
    )
  }

  return (
    <>
      <h1 className="screen-title">{t('statistics')}</h1>

      <div className="pill-group">
        {['week', 'month', 'year'].map((p) => (
          <button
            key={p}
            className={period === p ? 'pill active' : 'pill'}
            onClick={() => setPeriod(p)}
          >
            {t(p)}
          </button>
        ))}
      </div>

      <div className="pill-group">
        {currencies.map(({ code }) => (
          <button
            key={code}
            className={currency === code ? 'pill active' : 'pill'}
            onClick={() => setCurrency(code)}
          >
            {code}
          </button>
        ))}
      </div>

      <section className="card">
        <p className="label">{t('spending')}</p>
        <BarChart
          bars={bars}
          formatValue={(value) => formatMoney(value, currency)}
        />
      </section>

      <section className="card">
        <p className="label">{t('byCategory')}</p>
        {byCategory.length === 0 ? (
          <p className="sub empty">{t('noSpending')}</p>
        ) : (
          <CategoryBars totals={byCategory} currency={currency} />
        )}
      </section>

      <section className="card">
        <p className="label">{t('transactions')}</p>
        {recent.length === 0 ? (
          <p className="sub empty">{t('noTransactionsCurrency')}</p>
        ) : (
          <ul className="list">
            {recent.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}