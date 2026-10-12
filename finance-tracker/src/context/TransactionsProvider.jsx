import { useEffect, useState } from 'react'
import { TransactionsContext } from './TransactionsContext'
import {
  categories as builtInCategories,
  transactions as sampleTransactions,
} from '../db/mockData'
import {
  clearAll,
  deleteCategory as removeCategory,
  deleteTransaction as removeTransaction,
  insertCategory,
  insertTransaction,
  insertTransactions,
  loadAll,
  setBudget as saveBudget,
  updateCategory as replaceCategory,
  updateTransaction as replaceTransaction,
} from '../db/storage'
import { customColorAt, findCategoryByName } from '../lib/categories'
import { useSettings } from './useSettings'

export default function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState(builtInCategories)
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { t } = useSettings()

  useEffect(() => {
    let ignore = false
    loadAll()
      .then((data) => {
        if (ignore) return
        setTransactions(data.transactions)
        setCategories(data.categories)
        setBudgets(data.budgets)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        if (ignore) return
        setError(true)
        setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const addTransaction = async (tx) => {
    const saved = await insertTransaction(tx)
    setTransactions((current) => [...current, saved])
    return saved
  }

  const updateTransaction = async (id, tx) => {
    const saved = await replaceTransaction(id, tx)
    setTransactions((current) =>
      current.map((item) => (item.id === id ? saved : item)),
    )
  }

  const deleteTransaction = async (id) => {
    await removeTransaction(id)
    setTransactions((current) => current.filter((item) => item.id !== id))
  }

  // Returns the id of the new category, or of an existing one with that name
  const addCategory = async (name) => {
    const existing = findCategoryByName(categories, name)
    if (existing) return existing.id

    // the color is saved with the category so it never changes
    const color = customColorAt(categories.length - builtInCategories.length)
    const saved = await insertCategory({ name, color })
    setCategories((current) => [...current, saved])
    return saved.id
  }

  const updateCategory = async (id, changes) => {
    const saved = await replaceCategory(id, changes)
    setCategories((current) =>
      current.map((item) => (item.id === id ? saved : item)),
    )
  }

  // its transactions move to moveToId
  const deleteCategory = async (id, moveToId) => {
    await removeCategory(id, moveToId)
    setCategories((current) => current.filter((item) => item.id !== id))
    setTransactions((current) =>
      current.map((item) =>
        item.categoryId === id ? { ...item, categoryId: moveToId } : item,
      ),
    )
    // the database already removed them
    setBudgets((current) => current.filter((item) => item.categoryId !== id))
  }

  // an amount of 0 removes the budget
  const setBudget = async (categoryId, currency, amount) => {
    const saved = await saveBudget(categoryId, currency, amount)
    setBudgets((current) => {
      const rest = current.filter(
        (item) => item.categoryId !== categoryId || item.currency !== currency,
      )
      return saved ? [...rest, saved] : rest
    })
  }

  const loadSampleData = async () => {
    setTransactions(await insertTransactions(sampleTransactions))
  }

  const clearAllData = async () => {
    await clearAll()
    setTransactions([])
    setCategories(builtInCategories)
    setBudgets([])
  }

  // screens never see a half-loaded state
  if (loading) return null

  if (error) {
    return (
      <main>
        <section className="card empty-state">
          <p className="sub">{t('dbError')}</p>
          <button
            type="button"
            className="btn"
            onClick={() => window.location.reload()}
          >
            {t('retry')}
          </button>
        </section>
      </main>
    )
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        budgets,
        setBudget,
        loadSampleData,
        clearAllData,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}
