import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SettingsProvider from './context/SettingsProvider'
import SettingsBar from './components/SettingsBar'
import HomeScreen from './features/expenses/HomeScreen'
import AddExpenseScreen from './features/expenses/AddExpenseScreen'
import HistoryScreen from './features/expenses/HistoryScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <SettingsBar />
        <main>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/add" element={<AddExpenseScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
          </Routes>
        </main>
        <BottomNav />
      </BrowserRouter>
    </SettingsProvider>
  )
}