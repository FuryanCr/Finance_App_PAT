import { Link, useLocation } from 'react-router-dom'
import { categoryColor, categoryLabel } from '../lib/categories'
import { parseDate } from '../lib/dates'
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
  const date = parseDate(tx.date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <li>
      {/* "from" tells the edit screen where to go back to */}
      <Link
        className="row row-link"
        to={`/edit/${tx.id}`}
        state={{ from: pathname }}
      >
        <div>
          <p className="row-name">{tx.note || label}</p>
          <p className="row-meta">
            {category && (
              <span
                className="dot"
                style={{ background: categoryColor(category) }}
              />
            )}
            {showDate ? `${label} · ${date}` : label}
          </p>
        </div>
        <p className={isIncome ? 'row-amount income' : 'row-amount spending'}>
          {isIncome ? '+' : '−'}
          {formatMoney(tx.amount, tx.currency)}
        </p>
      </Link>
    </li>
  )
}
