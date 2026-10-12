import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import SettingsProvider from './context/SettingsProvider'
import TransactionsProvider from './context/TransactionsProvider'
import SettingsBar from './components/SettingsBar'
import TopNav from './components/TopNav'
import HomeScreen from './features/expenses/HomeScreen'
import AddExpenseScreen from './features/expenses/AddExpenseScreen'
import StatisticsScreen from './features/expenses/StatisticsScreen'
import HistoryScreen from './features/expenses/HistoryScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import CategoriesScreen from './features/settings/CategoriesScreen'
import BudgetsScreen from './features/settings/BudgetsScreen'
import RecurringScreen from './features/settings/RecurringScreen'
import Header from './Header'

export default function App() {
  return (
    <SettingsProvider>
      <TransactionsProvider>
        <BrowserRouter>
          <SettingsBar />
          <Header />
          <TopNav />
          <main>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </TransactionsProvider>
    </SettingsProvider>
  )
}
