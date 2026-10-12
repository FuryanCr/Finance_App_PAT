import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { categories } from '../../db/mockData'
import { useSettings } from '../../context/useSettings'
import { useTransactions } from '../../context/useTransactions'
import Keypad from '../../components/Keypad'

function todayString() {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export default function AddExpenseScreen() {
  const { t } = useSettings()
  const { addTransaction } = useTransactions()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const type = params.get('type') === 'income' ? 'income' : 'expense'
  const [currency, setCurrency] = useState('CRC')
  const [amountText, setAmountText] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayString)

  const amount = parseFloat(amountText) || 0
  const symbol = currency === 'USD' ? '$' : '₡'

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

  const handleSave = () => {
    if (amount <= 0) return
    const category = categories.find((c) => c.id === categoryId)
    const defaultNote =
      type === 'expense' ? t(`category.${category.key}`) : t('typeIncome')

    addTransaction({
      amount,
      currency,
      type,
      categoryId: type === 'expense' ? categoryId : null,
      note: note.trim() || defaultNote,
      date,
    })
    navigate('/')
  }

  return (
    <>
      <h1 className="screen-title">
        {type === 'income' ? t('addIncome') : t('addExpense')}
      </h1>

      <div className="pill-group">
        {['expense', 'income'].map((tp) => (
          <button
            key={tp}
            type="button"
            className={type === tp ? 'pill active' : 'pill'}
            onClick={() => setParams({ type: tp })}
          >
            {tp === 'expense' ? t('typeExpense') : t('typeIncome')}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="pill-group">
          {['CRC', 'USD'].map((code) => (
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
                {t(`category.${c.key}`)}
              </button>
            ))}
          </div>
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
      </section>

      <button
        type="button"
        className="btn"
        disabled={amount <= 0}
        onClick={handleSave}
      >
        {t('save')}
      </button>
    </>
  )
}