import { categories } from '../db/mockData'
import { parseDate } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useSettings } from '../context/useSettings'

export default function TransactionItem({ tx }) {
  const { lang, t } = useSettings()
  const locale = lang === 'es' ? 'es-CR' : 'en-US'
  const category = categories.find((c) => c.id === tx.categoryId)
  const label = category ? t(`category.${category.key}`) : t('income')
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
          {label} · {date}
        </p>
      </div>
      <p className={isIncome ? 'row-amount income' : 'row-amount'}>
        {isIncome ? '+' : '-'}
        {formatMoney(tx.amount, tx.currency)}
      </p>
    </li>
  )
}