import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import HealthIdLoadingIcon from '../ui/HealthIdLoadingIcon'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import { maskMobile } from '../../lib/phoneUtils'

const RESEND_COOLDOWN_SEC = 60

// Survives React Strict Mode remounts (component refs reset on each mount).
const autoSendIssuedForMobile = new Set()

export default function PhoneVerificationModal({ mobile, onVerified }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [sendFailed, setSendFailed] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const sendOtp = useCallback(async (isResend = false) => {
    setError('')
    setMessage('')
    setSendFailed(false)
    setSending(true)
    try {
      const res = isResend ? await api.resendPhoneOtp() : await api.sendPhoneOtp()
      if (res.message?.includes('already verified')) {
        onVerified()
        return
      }
      setOtpSent(true)
      setMessage(res.message || 'Verification code sent')
      if (res.devOtp) {
        setCode(res.devOtp)
      }
      setCooldown(RESEND_COOLDOWN_SEC)
    } catch (err) {
      setSendFailed(true)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }, [onVerified])

  useEffect(() => {
    if (!mobile || autoSendIssuedForMobile.has(mobile)) {
      return undefined
    }
    autoSendIssuedForMobile.add(mobile)
    sendOtp(false)
  }, [mobile, sendOtp])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setVerifying(true)
    try {
      await api.verifyPhone({ code: code.trim() })
      onVerified()
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = () => {
    if (cooldown > 0 || sending) return
    sendOtp(true)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-navy/85 backdrop-blur-md">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your mobile number</CardTitle>
          <CardDescription>
            For your Health ID security, confirm the number you registered:
            <span className="block mt-2 text-accent font-medium">{maskMobile(mobile)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {otpSent ? (
              <div className="space-y-2">
                <Label htmlFor="phone-otp">6-digit verification code</Label>
                <Input
                  id="phone-otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-white/60">
                {sending ? (
                  <>
                    <HealthIdLoadingIcon size="md" label="Sending code" />
                    <span>Sending code...</span>
                  </>
                ) : sendFailed ? (
                  <>
                    <span className="text-center text-sm">Could not send a verification code.</span>
                    <Button type="button" onClick={() => sendOtp(false)} disabled={sending}>
                      Send verification code
                    </Button>
                  </>
                ) : (
                  <span>Preparing verification...</span>
                )}
              </div>
            )}

            {message && <p className="text-accent text-sm">{message}</p>}
            {import.meta.env.DEV && code.length === 6 && otpSent && (
              <p className="text-xs text-white/50">Dev OTP prefilled from backend noop provider.</p>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={!otpSent || code.length !== 6}
              loading={verifying}
              loadingLabel="Verifying..."
              className="w-full"
            >
              Verify phone number
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || sending || !otpSent}
                className="text-sm text-accent2 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>

          {import.meta.env.DEV && (
            <p className="mt-4 text-xs text-white/40 text-center">
              Dev mode: when Twilio is not configured, the OTP is logged in the backend console and may appear above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
