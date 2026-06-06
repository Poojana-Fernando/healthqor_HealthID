import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LiveBackground from './components/LiveBackground'
import ChatbotFab from './components/ChatbotFab'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import EChannelingPage from './pages/EChannelingPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <div className="relative min-h-screen text-text">
      <LiveBackground />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/echanneling" element={<EChannelingPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <ChatbotFab />
    </div>
  )
}
