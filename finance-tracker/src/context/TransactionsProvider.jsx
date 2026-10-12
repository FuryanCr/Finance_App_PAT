import { useEffect, useState } from 'react'
import { TransactionsContext } from './TransactionsContext'
import {
  categories as builtInCategories,
  transactions as sampleTransactions,
} from '../db/mockData'
import {
  clearAll,
  confirmRecurring as saveConfirmedRecurring,
  deleteCategory as removeCategory,
  deleteRecurring as removeRecurring,
  deleteTransaction as removeTransaction,
  insertCategory,
  insertRecurring,
  insertTransaction,
  insertTransactions,
  loadAll,
  restoreAll,
  setBudget as saveBudget,
  skipRecurring as saveSkippedRecurring,
  updateCategory as replaceCategory,
  updateRecurring as replaceRecurring,
  updateTransaction as replaceTransaction,
} from '../db/storage'
import { acquireTabLock } from '../db/tabLock'
import { customColorAt, findCategoryByName } from '../lib/categories'
import { quincenaKey, todayString } from '../lib/dates'
import { useSettings } from './useSettings'

export default function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState(builtInCategories)
  const [budgets, setBudgets] = useState([])
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const { t } = useSettings()

  useEffect(() => {
    let ignore = false
    acquireTabLock()
      .then((hasLock) => {
        if (!hasLock) {
          if (ignore) return null
          setBlocked(true)
          setLoading(false)
          return null
        }
        return loadAll()
      })
      .then((data) => {
        if (ignore || !data) return
        setTransactions(data.transactions)
        setCategories(data.categories)
        setBudgets(data.budgets)
        setRecurring(data.recurring)
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
    setRecurring((current) =>
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

  const addRecurring = async (item) => {
    const saved = await insertRecurring(item)
    setRecurring((current) => [...current, saved])
  }

  const updateRecurring = async (id, item) => {
    const saved = await replaceRecurring(id, item)
    setRecurring((current) =>
      current.map((existing) => (existing.id === id ? saved : existing)),
    )
  }

  const deleteRecurring = async (id) => {
    await removeRecurring(id)
    setRecurring((current) => current.filter((item) => item.id !== id))
  }

  // handled for this quincena, without adding anything
  const skipRecurring = async (item) => {
    const period = quincenaKey()
    await saveSkippedRecurring(item.id, period)
    setRecurring((current) =>
      current.map((existing) =>
        existing.id === item.id ? { ...existing, lastPeriod: period } : existing,
      ),
    )
  }

  // adds a real transaction dated today and marks the item as handled
  const confirmRecurring = async (item) => {
    const period = quincenaKey()
    const tx = {
      amount: item.amount,
      currency: item.currency,
      type: item.type,
      categoryId: item.type === 'expense' ? item.categoryId : null,
      note: item.note,
      date: todayString(),
    }
    const saved = await saveConfirmedRecurring(item.id, period, tx)
    setTransactions((current) => [...current, saved])
    setRecurring((current) =>
      current.map((existing) =>
        existing.id === item.id ? { ...existing, lastPeriod: period } : existing,
      ),
    )
  }

  const loadSampleData = async () => {
    const saved = await insertTransactions(sampleTransactions)
    setTransactions((current) => [...current, ...saved])
  }

  const clearAllData = async () => {
    await clearAll()
    setTransactions([])
    setCategories(builtInCategories)
    setBudgets([])
    setRecurring([])
  }

  // replaces everything with the (already cleaned) data of a backup
  const restoreData = async (data) => {
    const state = await restoreAll(data)
    setTransactions(state.transactions)
    setCategories(state.categories)
    setBudgets(state.budgets)
    setRecurring(state.recurring)
  }

  // screens never see a half-loaded state
  if (loading) {
    return (
      <main>
        <p className="sub empty">{t('loading')}</p>
      </main>
    )
  }

  if (blocked) {
    return (
      <main>
        <section className="card empty-state">
          <p className="sub">{t('otherTab')}</p>
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
        recurring,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        skipRecurring,
        confirmRecurring,
        loadSampleData,
        clearAllData,
        restoreData,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}
