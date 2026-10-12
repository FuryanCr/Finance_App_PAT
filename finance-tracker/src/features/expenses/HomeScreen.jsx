import { transactions, categories } from '../../db/mockData'
import { getQuincenaRange, parseDate } from '../../lib/dates'
import { formatMoney, sum } from '../../lib/money'
import { useSettings } from '../../context/useSettings'

const currencies = [
  { code: 'CRC', labelKey: 'colones' },
  { code: 'USD', labelKey: 'dollars' },
]

export default function HomeScreen() {
  const { lang, t } = useSettings()
  const locale = lang === 'es' ? 'es-CR' : 'en-US'

  const { start, end } = getQuincenaRange()
  const current = transactions.filter((tx) => {
    const date = parseDate(tx.date)
    return date >= start && date <= end
  })

  const format = { month: 'short', day: 'numeric' }

  return (
    <>
      <h1>{t('quincena')}</h1>
      <p>
        {start.toLocaleDateString(locale, format)} -{' '}
        {end.toLocaleDateString(locale, format)}
      </p>

      {currencies.map(({ code, labelKey }) => {
        const list = current.filter((tx) => tx.currency === code)
        if (list.length === 0) return null

        const income = sum(
          list.filter((tx) => tx.type === 'income').map((tx) => tx.amount),
        )
        const expenses = list.filter((tx) => tx.type === 'expense')
        const spent = sum(expenses.map((tx) => tx.amount))

        return (
          <section key={code}>
            <h2>{t(labelKey)}</h2>
            <h3>
              {t('left')}: {formatMoney(sum([income, -spent]), code)}
            </h3>
            <p>
              {t('income')} {formatMoney(income, code)} · {t('spent')}{' '}
              {formatMoney(spent, code)}
            </p>
            <h4>{t('byCategory')}</h4>
            <ul>
              {categories.map((c) => {
                const total = sum(
                  expenses
                    .filter((tx) => tx.categoryId === c.id)
                    .map((tx) => tx.amount),
                )
                return (
                  <li key={c.id}>
                    {t(`category.${c.key}`)}: {formatMoney(total, code)}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </>
  )
}