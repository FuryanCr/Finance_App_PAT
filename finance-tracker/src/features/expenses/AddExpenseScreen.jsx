import { useState } from 'react'
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { categoryLabel } from '../../lib/categories'
import { daysBetween, isValidDate, parseDate } from '../../lib/dates'
import { currencies } from '../../lib/money'
import { useSettings } from '../../context/useSettings'
import { useTransactions } from '../../context/useTransactions'
import Keypad from '../../components/Keypad'

// A warning shows when the date is more than this many days ahead
const FUTURE_DAYS_LIMIT = 3

function todayString() {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// Used for both /add and /edit/:id
export default function AddExpenseScreen() {
  const { t } = useSettings()
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    categories,
    addCategory,
  } = useTransactions()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [params] = useSearchParams()

  const editing = id ? transactions.find((tx) => tx.id === Number(id)) : null
  const backTo = location.state?.from ?? '/history'

  const [type, setType] = useState(
    editing?.type ?? (params.get('type') === 'income' ? 'income' : 'expense'),
  )
  const [currency, setCurrency] = useState(editing?.currency ?? 'CRC')
  const [amountText, setAmountText] = useState(
    editing ? String(editing.amount) : '',
  )
  // categoryId is null while a custom category is being typed
  const [categoryId, setCategoryId] = useState(
    editing?.categoryId ?? categories[0].id,
  )
  const [customName, setCustomName] = useState('')
  const [note, setNote] = useState(editing?.note ?? '')
  const [date, setDate] = useState(editing?.date ?? todayString)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  // the id in the address does not exist, or was just deleted: go back
  if (id && !editing) return <Navigate to={backTo} replace />

  const amount = parseFloat(amountText) || 0
  const { symbol } = currencies.find((c) => c.code === currency)
  const isCustom = type === 'expense' && categoryId === null
  const dateValid = isValidDate(date)
  const isFarFuture =
    dateValid && daysBetween(new Date(), parseDate(date)) > FUTURE_DAYS_LIMIT
  const canSave =
    amount > 0 && dateValid && (!isCustom || customName.trim() !== '')

  const handleKey = (key) => {
    setAmountText((text) => {
      if (key === '⌫') return text.slice(0, -1)
      if (key === '.') {
        if (text.includes('.')) return text
        return text === '' ? '0.' : text + '.'
      }
      if (text.length >= 10) return text
      if (text.includes('.') && text.split('.')[1].length >= 2) return text
      if (text === '0') return key
      return text + key
    })
  }

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setSaveError(false)
    try {
      const savedCategoryId = isCustom
        ? await addCategory(customName.trim())
        : categoryId
      const tx = {
        amount,
        currency,
        type,
        categoryId: type === 'expense' ? savedCategoryId : null,
        note: note.trim(),
        date,
      }

      if (editing) {
        await updateTransaction(editing.id, tx)
        navigate(backTo)
      } else {
        await addTransaction(tx)
        navigate('/')
      }
    } catch (error) {
      console.error(error)
      setSaving(false)
      setSaveError(true)
    }
  }

  const handleDelete = async () => {
    if (saving) return
    // once deleted, the check above sends the screen back
    if (!window.confirm(t('confirmDelete'))) return
    try {
      await deleteTransaction(editing.id)
    } catch (error) {
      console.error(error)
      setSaveError(true)
    }
  }

  let title = type === 'income' ? t('addIncome') : t('addExpense')
  if (editing) title = t('editTransaction')

  return (
    <>
      <h1 className="screen-title">{title}</h1>

      <div className="pill-group">
        {['expense', 'income'].map((tp) => (
          <button
            key={tp}
            type="button"
            className={type === tp ? 'pill active' : 'pill'}
            onClick={() => setType(tp)}
          >
            {tp === 'expense' ? t('typeExpense') : t('typeIncome')}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="pill-group">
          {currencies.map(({ code }) => (
            <button
              key={code}
              type="button"
              className={currency === code ? 'pill active' : 'pill'}
              onClick={() => setCurrency(code)}
            >
              {code}
            </button>
          ))}
        </div>
        <p className="label amount-label">{t('amount')}</p>
        <p className="amount-display">
          {symbol}
          {amountText || '0'}
        </p>
        <Keypad onKey={handleKey} />
      </section>

      {type === 'expense' && (
        <section className="card">
          <p className="label">{t('category')}</p>
          <div className="pill-group wrap">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={categoryId === c.id ? 'pill active' : 'pill'}
                onClick={() => setCategoryId(c.id)}
              >
                {categoryLabel(c, t)}
              </button>
            ))}
            <button
              type="button"
              className={isCustom ? 'pill active' : 'pill'}
              onClick={() => setCategoryId(null)}
            >
              + {t('customCategory')}
            </button>
          </div>
          {isCustom && (
            <label className="field">
              <span className="label">{t('categoryName')}</span>
              <input
                type="text"
                value={customName}
                maxLength={24}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </label>
          )}
        </section>
      )}

      <section className="card">
        <label className="field">
          <span className="label">{t('note')}</span>
          <input
            type="text"
            value={note}
            maxLength={60}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">{t('date')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {!dateValid && <p className="field-note error">{t('invalidDate')}</p>}
        {isFarFuture && (
          <p className="field-note warning">{t('futureDateWarning')}</p>
        )}
      </section>

      {saveError && <p className="field-note error">{t('saveError')}</p>}

      <button
        type="button"
        className="btn"
        disabled={!canSave || saving}
        onClick={handleSave}
      >
        {t('save')}
      </button>

      {editing && (
        <button type="button" className="btn danger" onClick={handleDelete}>
          {t('delete')}
        </button>
      )}
    </>
  )
}
