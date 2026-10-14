import { Link, useLocation } from 'react-router-dom'
import { categoryColor, categoryLabel } from '../lib/categories'
import { parseDate } from '../lib/dates'
import { formatDate } from '../lib/format'
import { formatMoney } from '../lib/money'
import { paymentNote } from '../lib/payment'
import { useSettings } from '../context/useSettings'
import { useTransactions } from '../context/useTransactions'

export default function TransactionItem({ tx, showDate = true }) {
  const { locale, t } = useSettings()
  const { categories } = useTransactions()
  const { pathname } = useLocation()
  const isIncome = tx.type === 'income'
  const category = categories.find((c) => c.id === tx.categoryId)
  const fallback = isIncome ? t('income') : t('typeExpense')
  const label = category ? categoryLabel(category, t) : fallback
  const date = formatDate(parseDate(tx.date), locale, { year: false })
  // card and SINPE are named in the row; cash is the default and says nothing
  const method = paymentNote(tx.paymentMethod, t)
  const join = (...parts) => parts.filter(Boolean).join(' · ')

  const dot = category && (
    <span
      className="dot"
      aria-hidden="true"
      style={{ background: categoryColor(category) }}
    />
  )

  return (
    <li>
      {/* "from" tells the edit screen where to go back to */}
      <Link
        className="row row-link"
        to={`/edit/${tx.id}`}
        state={{ from: pathname }}
      >
        <div>
          {tx.note ? (
            <>
              <p className="row-name">{tx.note}</p>
              <p className="row-meta">
                {dot}
                {showDate ? join(label, date, method) : join(label, method)}
              </p>
            </>
          ) : (
            <>
              {/* no note: the label is the name, so meta is only the date */}
              <p className="row-name">
                {dot}
                {label}
              </p>
              {(showDate || method) && (
                <p className="row-meta">{join(showDate && date, method)}</p>
              )}
            </>
          )}
        </div>
        <p className={isIncome ? 'row-amount income' : 'row-amount spending'}>
          {isIncome ? '+' : '−'}
          {formatMoney(tx.amount, tx.currency)}
        </p>
      </Link>
    </li>
  )
}
