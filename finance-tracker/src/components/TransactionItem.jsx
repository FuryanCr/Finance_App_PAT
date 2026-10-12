import { categoryLabel } from '../lib/categories'
import { parseDate } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useSettings } from '../context/useSettings'
import { useTransactions } from '../context/useTransactions'

export default function TransactionItem({ tx, showDate = true }) {
  const { locale, t } = useSettings()
  const { categories } = useTransactions()
  const category = categories.find((c) => c.id === tx.categoryId)
  const label = category ? categoryLabel(category, t) : t('income')
  const date = parseDate(tx.date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
  const isIncome = tx.type === 'income'

  return (
    <li className="row">
      <div>
        <p className="row-name">{tx.note}</p>
        <p className="row-meta">
          {showDate ? `${label} · ${date}` : label}
        </p>
      </div>
      <p className={isIncome ? 'row-amount income' : 'row-amount'}>
        {isIncome ? '+' : '-'}
        {formatMoney(tx.amount, tx.currency)}
      </p>
    </li>
  )
}