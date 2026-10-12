import { NavLink } from 'react-router-dom'
import { useSettings } from '../context/useSettings'

export default function BottomNav() {
  const { t } = useSettings()

  return (
    <nav>
      <NavLink to="/">{t('home')}</NavLink>
      <NavLink to="/add">{t('add')}</NavLink>
      <NavLink to="/history">{t('history')}</NavLink>
    </nav>
  )
}