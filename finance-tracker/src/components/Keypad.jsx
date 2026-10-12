import { useSettings } from '../context/useSettings'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

export default function Keypad({ onKey }) {
  const { t } = useSettings()

  return (
    <div className="keypad">
      {keys.map((key) => (
        <button
          type="button"
          key={key}
          className="key"
          onClick={() => onKey(key)}
          aria-label={key === '⌫' ? t('delete') : key}
        >
          {key}
        </button>
      ))}
    </div>
  )
}