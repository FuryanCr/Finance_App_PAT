import { categoryColor, categoryLabel } from '../lib/categories'
import { formatMoney } from '../lib/money'
import { useSettings } from '../context/useSettings'
import { useTransactions } from '../context/useTransactions'

// One recurring item: name, category and schedule, and the signed amount.
// The children go after the amount (the Edit pill on the settings screen).
export default function RecurringRow({ item, children }) {
  const { t } = useSettings()
  const { categories } = useTransactions()
  const isIncome = item.type === 'income'
  const category = isIncome
    ? undefined
    : categories.find((c) => c.id === item.categoryId)
  const fallback = isIncome ? t('income') : t('typeExpense')
  const label = category ? categoryLabel(category, t) : fallback

  return (
    <div className="row">
      <div>
        <p className="row-name">{item.note || label}</p>
        <p className="row-meta">
          {category && (
            <span
              className="dot"
              aria-hidden="true"
              style={{ background: categoryColor(category) }}
            />
          )}
          {label} · {t(`schedule.${item.schedule}`)}
        </p>
      </div>
      <div className="row-side">
        <p className={isIncome ? 'row-amount income' : 'row-amount spending'}>
          {isIncome ? '+' : '−'}
          {formatMoney(item.amount, item.currency)}
        </p>
        {children}
      </div>
    </div>
  )
}
