import { Link } from 'react-router-dom'
import { useSettings } from '../context/useSettings'

export default function EmptyState() {
  const { t } = useSettings()

  return (
    <section className="card empty-state">
      <p className="sub">{t('emptyAll')}</p>
      <div className="btn-row">
        <Link className="btn" to="/add?type=expense">
          {t('addExpense')}
        </Link>
        <Link className="btn secondary" to="/add?type=income">
          {t('addIncome')}
        </Link>
      </div>
    </section>
  )
}
