import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function DoctorLoginPage() {
  const { doctorLogin } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await doctorLogin(identifier.trim(), password)
      if (res.role === 'ADMIN') {
        setError('Use the main login page for admin access.')
        return
      }
      if (res.role !== 'DOCTOR') {
        setError('This portal is for registered doctors only. Use the main login for patients.')
        return
      }
      navigate('/doctor')
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
        <h1 className="text-3xl font-bold mb-2">Doctor Portal Login</h1>
        <p className="opacity-60 text-sm text-center">
          Sign in with your registered email or SLMC license number
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-accent2 block mb-1">Email or SLMC License Number</label>
          <input
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            placeholder="you@hospital.lk or SLMC-12345"
          />
        </div>
        <div>
          <label className="text-xs text-accent2 block mb-1">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent2 py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in to Doctor Portal'}
        </button>
      </form>

      <p className="text-center text-sm opacity-60 mt-4">
        <Link to="/doctor/forgot-password" className="text-accent2 hover:text-accent transition">
          Forgot password?
        </Link>
      </p>

      <p className="text-center text-sm opacity-60 mt-6">
        Patient?{' '}
        <Link to="/login" className="text-accent2 hover:text-accent transition">
          Main login
        </Link>
      </p>
    </main>
  )
}
