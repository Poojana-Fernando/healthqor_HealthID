import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import LoadingButton from '../components/ui/LoadingButton'

const RESET_SENT_MESSAGE =
  'If an account with that email exists, we sent password reset instructions.'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword({ email })
      navigate('/reset-password', { state: { email, message: RESET_SENT_MESSAGE } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Forgot password</h1>
      <p className="opacity-70 mb-8">
        Enter your account email and we will send reset instructions if a password-based account exists.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-accent2 block mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <LoadingButton type="submit" loading={loading} loadingLabel="Sending..." size="full" className="font-medium">
          Send reset instructions
        </LoadingButton>
      </form>

      <p className="text-center text-sm opacity-60 mt-6">
        Remember your password? <Link to="/login" className="text-accent2">Back to login</Link>
      </p>
    </main>
  )
}
