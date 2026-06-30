import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { api } from '../api/client'

const RESET_SENT_MESSAGE =
  'If a doctor account matches that email or SLMC license number, we sent password reset instructions to the registered email.'

export default function DoctorForgotPasswordPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.doctorForgotPassword({ identifier: identifier.trim() })
      navigate('/reset-password', {
        state: {
          message: RESET_SENT_MESSAGE,
          returnTo: '/doctor/login',
          doctorPortal: true,
        },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mb-4">
          <Stethoscope className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Forgot doctor password</h1>
        <p className="opacity-70 text-sm text-center">
          Enter your registered email or SLMC license number. We will send reset instructions to your account email if a password-based doctor account exists.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-accent2 block mb-1">Email or SLMC License Number</label>
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            placeholder="you@hospital.lk or SLMC-12345"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent2 py-3 rounded-xl disabled:opacity-50">
          {loading ? 'Sending...' : 'Send reset instructions'}
        </button>
      </form>

      <p className="text-center text-sm opacity-60 mt-6">
        Remember your password?{' '}
        <Link to="/doctor/login" className="text-accent2 hover:text-accent transition">
          Back to doctor login
        </Link>
      </p>
    </main>
  )
}
