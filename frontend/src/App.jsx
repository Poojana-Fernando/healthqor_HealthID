import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LiveBackground from './components/LiveBackground'
import ChatbotFab from './components/ChatbotFab'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import EChannelingPage from './pages/EChannelingPage'
import AdminPage from './pages/AdminPage'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminDoctors from './components/admin/AdminDoctors'
import AdminPatients from './components/admin/AdminPatients'
import AdminAddDoctorPage from './pages/AdminAddDoctorPage'
import SupportPage from './pages/SupportPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PhoneVerificationGate from './components/phone/PhoneVerificationGate'

export default function App() {
  return (
    <div className="relative min-h-screen text-text flex flex-col">
      <LiveBackground />
      <Navbar />
      <div className="flex-grow">
        <PhoneVerificationGate>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/echanneling" element={<EChannelingPage />} />
          <Route path="/admin" element={<AdminPage />}>
            <Route index element={<AdminDashboard />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="doctors/new" element={<AdminAddDoctorPage />} />
            <Route path="patients" element={<AdminPatients />} />
          </Route>
          <Route path="/support" element={<SupportPage />} />
          </Routes>
        </PhoneVerificationGate>
      </div>
      <Footer />
      <ChatbotFab />
    </div>
  )
}
