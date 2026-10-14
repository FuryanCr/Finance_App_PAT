import { useSettings } from '../context/useSettings'
import { keypadKeys } from '../lib/keypad'

export default function Keypad({ onKey, currency }) {
  const { t } = useSettings()

  return (
    <div className="keypad">
      {keypadKeys(currency).map((key) => (
        <button
          type="button"
          key={key}
          className="key"
          onClick={() => onKey(key)}
          aria-label={key === '⌫' ? t('deleteDigit') : key}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
