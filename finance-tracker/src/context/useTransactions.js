import { useContext } from 'react'
import { TransactionsContext } from './TransactionsContext'

export function useTransactions() {
  return useContext(TransactionsContext)
}