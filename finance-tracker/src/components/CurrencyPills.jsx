import { currencies } from '../lib/money'

export default function CurrencyPills({ value, onChange }) {
  return (
    <div className="pill-group">
      {currencies.map(({ code }) => (
        <button
          key={code}
          type="button"
          className={value === code ? 'pill active' : 'pill'}
          onClick={() => onChange(code)}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
