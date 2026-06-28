import { useAuth } from '../../context/AuthContext'
import PhoneVerificationModal from './PhoneVerificationModal'

export default function PhoneVerificationGate({ children }) {
  const { user, profile, loading, refreshProfile } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-white/50">
        Loading...
      </div>
    )
  }

  const needsPhoneVerification =
    user && profile?.mobile && profile.phoneVerified === false

  return (
    <>
      {children}
      {needsPhoneVerification && (
        <PhoneVerificationModal
          mobile={profile.mobile}
          onVerified={refreshProfile}
        />
      )}
    </>
  )
}
