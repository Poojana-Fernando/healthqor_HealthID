import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import LiveBackground from './components/LiveBackground'
import ChatbotFab from './components/ChatbotFab'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'

import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import HealthcareFacilitiesPage from './pages/HealthcareFacilitiesPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import EChannelingPage from './pages/EChannelingPage'
import AdminPage from './pages/AdminPage'
import AdminAddDoctorPage from './pages/AdminAddDoctorPage'
import DoctorLoginPage from './pages/DoctorLoginPage'
import DoctorForgotPasswordPage from './pages/DoctorForgotPasswordPage'
import DoctorPage from './pages/DoctorPage'
import SupportPage from './pages/SupportPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

import PhoneVerificationGate from './components/phone/PhoneVerificationGate'

import AdminDashboard from './components/admin/AdminDashboard'
import AdminDoctors from './components/admin/AdminDoctors'
import AdminPatients from './components/admin/AdminPatients'

import DoctorDashboard from './components/doctor/DoctorDashboard'
import DoctorAppointments from './components/doctor/DoctorAppointments'
import DoctorSchedule from './components/doctor/DoctorSchedule'
import DoctorProfile from './components/doctor/DoctorProfile'

export default function App() {
  return (
    <div className="relative min-h-screen flex flex-col text-text">
      {/* Scroll to top on navigation */}
      <ScrollToTop />

      {/* Background */}
      <LiveBackground />

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow">
        <PhoneVerificationGate>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/find-care" element={<HealthcareFacilitiesPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
              path="/auth/google/callback"
              element={<GoogleCallbackPage />}
            />
            <Route path="/echanneling" element={<EChannelingPage />} />
            <Route path="/support" element={<SupportPage />} />

            {/* Doctor Authentication */}
            <Route path="/doctor/login" element={<DoctorLoginPage />} />
            <Route
              path="/doctor/forgot-password"
              element={<DoctorForgotPasswordPage />}
            />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminPage />}>
              <Route index element={<AdminDashboard />} />
              <Route path="doctors" element={<AdminDoctors />} />
              <Route path="doctors/new" element={<AdminAddDoctorPage />} />
              <Route path="patients" element={<AdminPatients />} />
            </Route>

            {/* Doctor Routes */}
            <Route path="/doctor" element={<DoctorPage />}>
              <Route index element={<DoctorDashboard />} />
              <Route
                path="appointments"
                element={<DoctorAppointments />}
              />
              <Route path="schedule" element={<DoctorSchedule />} />
              <Route path="profile" element={<DoctorProfile />} />
            </Route>
          </Routes>
        </PhoneVerificationGate>
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Chatbot */}
      <ChatbotFab />
    </div>
  )
}