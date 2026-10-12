import { categoryColor, categoryLabel } from '../lib/categories'
import { formatMoney, sum } from '../lib/money'
import { useSettings } from '../context/useSettings'

// One row per category: name, amount and a bar with its share of the total.
// totals is a list of { category, total }.
// budgets is optional: the { categoryId, currency, amount } budgets for this
// currency. A category with a budget shows "total / budget", and its bar fills
// against the budget instead (amber from 80%, red when exceeded).
export default function CategoryBars({
  totals,
  currency,
  budgets = [],
  className = 'list',
}) {
  const { t } = useSettings()
  const all = sum(totals.map((item) => item.total))

  return (
    <ul className={className}>
      {totals.map(({ category, total }) => {
        const budget = budgets.find((b) => b.categoryId === category.id)
        const ratio = budget ? total / budget.amount : 0
        const barWidth = budget ? Math.min(ratio, 1) * 100 : (total / all) * 100
        let barColor = categoryColor(category)
        if (budget && ratio >= 1) barColor = 'var(--danger)'
        else if (budget && ratio >= 0.8) barColor = 'var(--warning)'

        return (
          <li key={category.id}>
            <div className="row">
              <span className="row-name">
                <span
                  className="dot"
                  style={{ background: categoryColor(category) }}
                />
                {categoryLabel(category, t)}
              </span>
              <span className="row-amount">
                {formatMoney(total, currency)}
                {budget && ` / ${formatMoney(budget.amount, currency)}`}
              </span>
            </div>
            <div className="mini-bar">
              <div style={{ width: `${barWidth}%`, background: barColor }} />
            </div>
            {budget && ratio >= 1 && (
              <p className="budget-note over">{t('overBudget')}</p>
            )}
            {budget && ratio >= 0.8 && ratio < 1 && (
              <p className="budget-note near">
                {Math.round(ratio * 100)}% {t('ofBudget')}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
