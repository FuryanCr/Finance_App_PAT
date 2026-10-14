import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import DialogProvider from './context/DialogProvider'
import SettingsProvider from './context/SettingsProvider'
import TransactionsProvider from './context/TransactionsProvider'
import AppBar from './components/AppBar'
import SkipLink from './components/SkipLink'
import HomeScreen from './features/expenses/HomeScreen'
import AddExpenseScreen from './features/expenses/AddExpenseScreen'
import StatisticsScreen from './features/expenses/StatisticsScreen'
import HistoryScreen from './features/expenses/HistoryScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import CategoriesScreen from './features/settings/CategoriesScreen'
import BudgetsScreen from './features/settings/BudgetsScreen'
import RecurringScreen from './features/settings/RecurringScreen'
import SavingsScreen from './features/settings/SavingsScreen'

export default function App() {
  return (
    <SettingsProvider>
      <DialogProvider>
      <TransactionsProvider>
        <BrowserRouter>
          <SkipLink />
          <AppBar />
          <main id="main" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              {/* different keys so the form starts fresh between add and edit */}
              <Route path="/add" element={<AddExpenseScreen key="add" />} />
              <Route
                path="/edit/:id"
                element={<AddExpenseScreen key="edit" />}
              />
              <Route path="/stats" element={<StatisticsScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route
                path="/settings/categories"
                element={<CategoriesScreen />}
              />
              <Route path="/settings/budgets" element={<BudgetsScreen />} />
              <Route
                path="/settings/recurring"
                element={<RecurringScreen />}
              />
              <Route path="/savings" element={<SavingsScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </TransactionsProvider>
      </DialogProvider>
    </SettingsProvider>
  )
}
