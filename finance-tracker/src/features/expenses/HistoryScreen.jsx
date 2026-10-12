import { useSettings } from '../../context/useSettings'

export default function HistoryScreen() {
  const { t } = useSettings()
  return <h1>{t('history')}</h1>
}