import { Link } from 'react-router-dom'
import { useSettings } from '../context/useSettings'
import Logo from './Logo'

// A card with the logo, a line of text and (unless actions is false) the two
// buttons to add the first expense or income. `text` replaces the default
// "nothing yet" message.
export default function EmptyState({ actions = true, text }) {
  const { t } = useSettings()

  return (
    <section className="card empty-state">
      <Logo className="empty-logo" />
      <p className="sub">{text ?? t('emptyAll')}</p>
      {actions && (
        <div className="btn-row">
          <Link className="btn" to="/add?type=expense">
            {t('addExpense')}
          </Link>
          <Link className="btn secondary" to="/add?type=income">
            {t('addIncome')}
          </Link>
        </div>
      )}
    </section>
  )
}
