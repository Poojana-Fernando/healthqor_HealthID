import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { startGoogleOAuth } from '../utils/googleAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = () => {
    setError('')
    try {
      startGoogleOAuth()
    } catch (e) {
      setError(e.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.requiresVerification) {
        navigate('/verify-email', {
          state: {
            challengeId: res.challengeId,
            maskedEmail: res.maskedEmail,
            purpose: res.purpose,
          },
        })
        return
      }
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Login</h1>
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
        <div>
          <label className="text-xs text-accent2 block mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          />
          <div className="text-right mt-1">
            <Link to="/forgot-password" className="text-sm text-accent2">Forgot password?</Link>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent2 py-3 rounded-xl disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs opacity-50">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full glass flex items-center justify-center gap-3 py-3 rounded-xl hover:border-accent transition"
      >
        <span className="text-xl">G</span> Continue with Google
      </button>

      <p className="text-center text-sm opacity-60 mt-6">
        No account? <Link to="/signup" className="text-accent2">Sign up</Link>
      </p>
    </main>
  )
}
