import { useState } from 'react'
import { useTransactions } from '../../context/useTransactions'
import { getSpendingBars } from '../../lib/stats'
import { formatMoney } from '../../lib/money'
import { useSettings } from '../../context/useSettings'
import BarChart from '../../components/BarChart'
import TransactionItem from '../../components/TransactionItem'

export default function StatisticsScreen() {
  const { lang, t } = useSettings()
  const locale = lang === 'es' ? 'es-CR' : 'en-US'
  const [period, setPeriod] = useState('week')
  const [currency, setCurrency] = useState('CRC')
  const { transactions } = useTransactions()

  const bars = getSpendingBars(transactions, currency, period, new Date(), locale)
  const recent = transactions
    .filter((tx) => tx.currency === currency)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

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
        {['CRC', 'USD'].map((code) => (
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
        <p className="label">{t('transactions')}</p>
        <ul className="list">
          {recent.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} />
          ))}
        </ul>
      </section>
    </>
  )
}