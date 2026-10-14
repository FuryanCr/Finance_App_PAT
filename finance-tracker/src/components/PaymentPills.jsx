import { paymentMethods } from '../lib/payment'
import { useSettings } from '../context/useSettings'

// Cash, card or SINPE: the same pills as the currency, with translated names
export default function PaymentPills({ value, onChange }) {
  const { t } = useSettings()
  return (
    <div className="pill-group payment">
      {paymentMethods.map(({ code, labelKey }) => (
        <button
          key={code}
          type="button"
          className={value === code ? 'pill active' : 'pill'}
          aria-pressed={value === code}
          onClick={() => onChange(code)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}
