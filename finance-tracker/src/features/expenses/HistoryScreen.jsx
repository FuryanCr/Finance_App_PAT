import { useState } from 'react'
import { useTransactions } from '../../context/useTransactions'
import { isSameMonth, parseDate } from '../../lib/dates'
import { currencies, formatMoney, getTotals } from '../../lib/money'
import { useSettings } from '../../context/useSettings'
import TransactionItem from '../../components/TransactionItem'

function formatSigned(amount, code) {
  return (amount < 0 ? '' : '+') + formatMoney(amount, code)
}

export default function HistoryScreen() {
  const { locale, t } = useSettings()
  const { transactions } = useTransactions()

  const today = new Date()
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const isCurrentMonth = isSameMonth(month, today)

  const changeMonth = (step) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + step, 1))
  }

  const list = transactions
    .filter((tx) => isSameMonth(parseDate(tx.date), month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

  // one group per day, newest first
  const days = []
  for (const tx of list) {
    const last = days[days.length - 1]
    if (last && last.date === tx.date) last.items.push(tx)
    else days.push({ date: tx.date, items: [tx] })
  }

  const summaries = currencies
    .map((c) => ({ ...c, ...getTotals(list, c.code) }))
    .filter((c) => c.count > 0)

  return (
    <>
      <h1 className="screen-title">{t('history')}</h1>

      <div className="month-nav">
        <button
          type="button"
          className="month-btn"
          aria-label={t('prevMonth')}
          onClick={() => changeMonth(-1)}
        >
          ‹
        </button>
        <p className="month-name">
          {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          className="month-btn"
          aria-label={t('nextMonth')}
          disabled={isCurrentMonth}
          onClick={() => changeMonth(1)}
        >
          ›
        </button>
      </div>

      {list.length === 0 ? (
        <section className="card">
          <p className="sub empty">{t('noTransactions')}</p>
        </section>
      ) : (
        <>
          <section className="card hero">
            {summaries.map((s, index) => (
              <div className={index === 0 ? undefined : 'divider'} key={s.code}>
                <p className="label">
                  {t('balance')} · {t(s.labelKey)}
                </p>
                <p className="month-balance">{formatMoney(s.net, s.code)}</p>
                <div className="stats-row">
                  <div>
                    <p className="label">{t('income')}</p>
                    <p className="stat income">
                      +{formatMoney(s.income, s.code)}
                    </p>
                  </div>
                  <div>
                    <p className="label">{t('spent')}</p>
                    <p className="stat">−{formatMoney(s.spent, s.code)}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="card">
            {days.map((day, index) => (
              <div className={index === 0 ? undefined : 'divider'} key={day.date}>
                <div className="row">
                  <p className="label">
                    {parseDate(day.date).toLocaleDateString(locale, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  <p className="sub">
                    {currencies
                      .map((c) => ({ ...c, ...getTotals(day.items, c.code) }))
                      .filter((c) => c.count > 0)
                      .map((c) => formatSigned(c.net, c.code))
                      .join(' · ')}
                  </p>
                </div>
                <ul className="list">
                  {day.items.map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} showDate={false} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  )
}
