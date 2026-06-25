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
import SupportPage from './pages/SupportPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'

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
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/echanneling" element={<EChannelingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Routes>
      <ChatbotFab />
    </div>
  )
}
