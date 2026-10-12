import { useSettings } from '../../context/useSettings'

export default function AddExpenseScreen() {
  const { t } = useSettings()
  return <h1>{t('addExpense')}</h1>
}