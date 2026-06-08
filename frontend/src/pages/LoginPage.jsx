import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google OAuth not configured. Set VITE_GOOGLE_CLIENT_ID.')
      return
    }
    const redirectUri = window.location.origin + '/login'
    const scope = 'openid profile email'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`
    window.location.href = url
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      setLoading(true)
      const redirectUri = window.location.origin + '/login'
      googleLogin(code, redirectUri)
        .then(() => navigate('/profile'))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [googleLogin, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
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
        onClick={handleGoogle}
        className="w-full glass flex items-center justify-center gap-3 py-3 rounded-xl mb-6 hover:border-accent transition"
      >
        <span className="text-xl">G</span> Continue with Google
      </button>
      <p className="text-center text-sm opacity-60 mt-6">
        No account? <Link to="/signup" className="text-accent2">Sign up</Link>
      </p>
    </main>
  )
}
