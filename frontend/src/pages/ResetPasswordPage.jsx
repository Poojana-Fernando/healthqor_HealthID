import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import LoadingButton from '../components/ui/LoadingButton'

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const initialState = location.state || {}
  const returnTo = initialState.returnTo || (searchParams.get('doctor') === '1' ? '/doctor/login' : '/login')
  const isDoctorPortal = initialState.doctorPortal || searchParams.get('doctor') === '1'
  const [email, setEmail] = useState(initialState.email || '')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [magicToken, setMagicToken] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState(initialState.message || '')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [magicLinkMode, setMagicLinkMode] = useState(false)

  const isDoctorInvite = searchParams.get('invite') === '1'
  const strength = passwordStrength(password)

  useEffect(() => {
    const token = searchParams.get('token')
    const challenge = searchParams.get('challenge')
    if (token && challenge) {
      setChallengeId(challenge)
      setMagicToken(token)
      setMagicLinkMode(true)
    }
  }, [searchParams])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const payload = {
        newPassword: password,
      }
      if (magicLinkMode && challengeId && magicToken) {
        payload.challengeId = challengeId
        payload.token = magicToken
      } else if (challengeId) {
        payload.challengeId = challengeId
        payload.code = code.trim()
      } else {
        payload.email = email
        payload.code = code.trim()
      }

      const res = await api.resetPassword(payload)
      setMessage(res.message || 'Password updated successfully. Please log in.')
      setTimeout(() => navigate(returnTo), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email && !challengeId) {
      setError('Enter your email on the forgot password page first.')
      return
    }
    setError('')
    setMessage('')
    setResending(true)
    try {
      const payload = challengeId ? { challengeId } : { email }
      await api.resendPasswordReset(payload)
      setMessage('If an account with that email exists, we sent new reset instructions.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">
        {isDoctorInvite ? 'Set your password' : 'Reset password'}
      </h1>
      <p className="opacity-70 mb-8">
        {isDoctorInvite
          ? 'Your Health ID doctor account has been created. Choose a password to activate access.'
          : magicLinkMode
            ? 'Choose a new password for your account.'
            : 'Enter the 6-digit code from your email and your new password.'}
      </p>

      <form onSubmit={submit} className="space-y-4">
        {!magicLinkMode && (
          <>
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
              <label className="text-xs text-accent2 block mb-1">Reset code</label>
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
          </>
        )}

        <div>
          <label className="text-xs text-accent2 block mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          />
          {password && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded ${strength >= i ? 'bg-accent' : 'bg-border'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-accent2 block mb-1">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {message && <p className="text-emerald-400 text-sm">{message}</p>}

        <LoadingButton
          type="submit"
          loading={loading}
          loadingLabel="Updating..."
          size="full"
          className="font-medium"
        >
          {isDoctorInvite ? 'Activate account' : 'Update password'}
        </LoadingButton>
      </form>

      {!magicLinkMode && !isDoctorInvite && (
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
          Resend reset email
        </LoadingButton>
      )}

      <p className="text-center text-sm opacity-60 mt-6">
        <Link to={returnTo} className="text-accent2">
          {isDoctorPortal ? 'Back to doctor login' : 'Back to login'}
        </Link>
      </p>
    </main>
  )
}
