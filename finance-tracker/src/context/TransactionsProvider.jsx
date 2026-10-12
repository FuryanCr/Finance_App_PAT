import { useState } from 'react'
import { TransactionsContext } from './TransactionsContext'
import {
  categories as initialCategories,
  transactions as initialTransactions,
} from '../db/mockData'

export default function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [categories, setCategories] = useState(initialCategories)

  const addTransaction = (tx) => {
    setTransactions((current) => {
      const id = Math.max(0, ...current.map((item) => item.id)) + 1
      return [...current, { ...tx, id }]
    })
  }

  // Returns the id of the new category, or of an existing one with that name
  const addCategory = (name) => {
    const existing = categories.find(
      (c) => c.name?.toLowerCase() === name.toLowerCase(),
    )
    if (existing) return existing.id

    const id = Math.max(0, ...categories.map((c) => c.id)) + 1
    setCategories([...categories, { id, name }])
    return id
  }

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, categories, addCategory }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}
