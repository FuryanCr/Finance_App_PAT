import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SettingsProvider from './context/SettingsProvider'
import SettingsBar from './components/SettingsBar'
import BottomNav from './components/BottomNav'
import HomeScreen from './features/expenses/HomeScreen'
import AddExpenseScreen from './features/expenses/AddExpenseScreen'
import StatisticsScreen from './features/expenses/StatisticsScreen'
import HistoryScreen from './features/expenses/HistoryScreen'

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <SettingsBar />
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
    </SettingsProvider>
  )
}