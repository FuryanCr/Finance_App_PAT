import { useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryColor, categoryLabel } from '../../lib/categories'
import { parseAmount } from '../../lib/money'
import { useSettings } from '../../context/useSettings'
import { useTransactions } from '../../context/useTransactions'
import CurrencyPills from '../../components/CurrencyPills'

function BudgetForm({ currency }) {
  const { t } = useSettings()
  const { categories, budgets, setBudget } = useTransactions()

  const current = (categoryId) =>
    budgets.find((b) => b.categoryId === categoryId && b.currency === currency)
      ?.amount ?? 0

  const [texts, setTexts] = useState(() =>
    Object.fromEntries(
      categories.map((c) => [c.id, current(c.id) > 0 ? String(current(c.id)) : '']),
    ),
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [saved, setSaved] = useState(false)

  const invalid = categories.some((c) => parseAmount(texts[c.id] ?? '') === null)

  const handleChange = (id, value) => {
    setTexts((prev) => ({ ...prev, [id]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (saving || invalid) return
    setSaving(true)
    setSaveError(false)
    setSaved(false)
    try {
      for (const c of categories) {
        const value = parseAmount(texts[c.id] ?? '')
        if (value !== current(c.id)) await setBudget(c.id, currency, value)
      }
      setSaving(false)
      setSaved(true)
    } catch (error) {
      console.error(error)
      setSaving(false)
      setSaveError(true)
    }
  }

  return (
    <>
      <section className="card">
        <ul className="list">
          {categories.map((c) => (
            <li className="row" key={c.id}>
              <span className="row-name">
                <span
                  className="dot"
                  aria-hidden="true"
                  style={{ background: categoryColor(c) }}
                />
                {categoryLabel(c, t)}
              </span>
              <input
                className="budget-input"
                type="text"
                inputMode="decimal"
                placeholder={t('noLimit')}
                aria-label={categoryLabel(c, t)}
                value={texts[c.id] ?? ''}
                onChange={(e) => handleChange(c.id, e.target.value)}
              />
            </li>
          ))}
        </ul>
      </section>

      {invalid && <p className="field-note error" role="alert">{t('invalidAmount')}</p>}
      {saveError && <p className="field-note error" role="alert">{t('saveError')}</p>}

      <button
        type="button"
        className="btn"
        disabled={saving || invalid}
        onClick={handleSave}
      >
        {t('save')}
      </button>
      {/* always in the page, so a screen reader announces the change */}
      <p className="sub" role="status">
        {saved ? t('saved') : ''}
      </p>
    </>
  )
}

export default function BudgetsScreen() {
  const { t } = useSettings()
  const [currency, setCurrency] = useState('CRC')

  return (
    <>
      <Link className="back-link" to="/settings">
        ‹ {t('settings')}
      </Link>
      <h1 className="screen-title">{t('budgets')}</h1>
      <p className="sub">{t('budgetHint')}</p>

      <div className="narrow">
        <CurrencyPills value={currency} onChange={setCurrency} />

        <BudgetForm key={currency} currency={currency} />
      </div>
    </>
  )
}
