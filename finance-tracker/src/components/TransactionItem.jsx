import { Link, useLocation } from 'react-router-dom'
import { categoryColor, categoryLabel } from '../lib/categories'
import { parseDate } from '../lib/dates'
import { formatDate } from '../lib/format'
import { formatMoney } from '../lib/money'
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

  const dot = category && (
    <span className="dot" style={{ background: categoryColor(category) }} />
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
                {showDate ? `${label} · ${date}` : label}
              </p>
            </>
          ) : (
            <>
              {/* no note: the label is the name, so meta is only the date */}
              <p className="row-name">
                {dot}
                {label}
              </p>
              {showDate && <p className="row-meta">{date}</p>}
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
