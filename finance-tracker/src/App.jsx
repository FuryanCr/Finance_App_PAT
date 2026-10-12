import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SettingsProvider from './context/SettingsProvider'
import TransactionsProvider from './context/TransactionsProvider'
import SettingsBar from './components/SettingsBar'
import BottomNav from './components/BottomNav'
import HomeScreen from './features/expenses/HomeScreen'
import AddExpenseScreen from './features/expenses/AddExpenseScreen'
import StatisticsScreen from './features/expenses/StatisticsScreen'
import HistoryScreen from './features/expenses/HistoryScreen'
import Header from './Header'

export default function App() {
  return (
    <SettingsProvider>
      <TransactionsProvider>
        <BrowserRouter>
          <SettingsBar />
          <Header />
          <BottomNav />
          <main>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/add" element={<AddExpenseScreen />} />
              <Route path="/stats" element={<StatisticsScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
            </Routes>
          </main>
        </BrowserRouter>
      </TransactionsProvider>
    </SettingsProvider>
  )
}