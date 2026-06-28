import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingButton from '../components/ui/LoadingButton'

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const initialState = location.state || {}
  const [challengeId, setChallengeId] = useState(initialState.challengeId || '')
  const [maskedEmail, setMaskedEmail] = useState(initialState.maskedEmail || '')
  const [purpose, setPurpose] = useState(initialState.purpose || 'REGISTER')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const challenge = searchParams.get('challenge')
    if (token && challenge) {
      setChallengeId(challenge)
      setLoading(true)
      verifyEmail({ challengeId: challenge, token })
        .then(() => navigate('/profile'))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [searchParams, verifyEmail, navigate])

  const submitCode = async (e) => {
    e.preventDefault()
    if (!challengeId) {
      setError('Missing verification session. Please sign up or log in again.')
      return
    }
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await verifyEmail({ challengeId, code: code.trim() })
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!challengeId) {
      setError('Missing verification session. Please sign up or log in again.')
      return
    }
    setError('')
    setMessage('')
    setResending(true)
    try {
      const res = await resendVerification({ challengeId })
      setChallengeId(res.challengeId)
      setMaskedEmail(res.maskedEmail)
      setPurpose(res.purpose)
      setMessage('A new verification email has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  const purposeLabel = purpose === 'LOGIN' ? 'sign in' : 'complete your registration'

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Verify your email</h1>
      <p className="opacity-70 mb-8">
        We sent a 6-digit code and a verification link to{' '}
        <strong>{maskedEmail || 'your email'}</strong> to {purposeLabel}.
      </p>

      <form onSubmit={submitCode} className="space-y-4">
        <div>
          <label className="text-xs text-accent2 block mb-1">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 tracking-[0.4em] text-center text-lg"
            placeholder="000000"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {message && <p className="text-emerald-400 text-sm">{message}</p>}
        <LoadingButton type="submit" loading={loading} loadingLabel="Verifying..." size="full" className="font-medium">
          Verify email
        </LoadingButton>
      </form>

      <LoadingButton
        type="button"
        onClick={handleResend}
        disabled={resending || loading}
        loading={resending}
        loadingLabel="Sending..."
        variant="glass"
        size="full"
        className="mt-4"
      >
        Resend verification email
      </LoadingButton>

      <p className="text-center text-sm opacity-60 mt-6">
        Wrong email? <Link to={purpose === 'LOGIN' ? '/login' : '/signup'} className="text-accent2">Go back</Link>
      </p>
    </main>
  )
}
