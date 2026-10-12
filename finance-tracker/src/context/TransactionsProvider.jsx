import { useState } from 'react'
import { TransactionsContext } from './TransactionsContext'
import { transactions as initialTransactions } from '../db/mockData'

export default function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState(initialTransactions)

  const addTransaction = (tx) => {
    setTransactions((current) => {
      const id = Math.max(0, ...current.map((item) => item.id)) + 1
      return [...current, { ...tx, id }]
    })
  }

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  )
}