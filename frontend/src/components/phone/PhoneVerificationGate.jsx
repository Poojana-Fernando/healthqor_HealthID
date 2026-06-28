import { useAuth } from '../../context/AuthContext'
import PhoneVerificationModal from './PhoneVerificationModal'
import HealthIdLoadingIcon from '../ui/HealthIdLoadingIcon'

export default function PhoneVerificationGate({ children }) {
  const { user, profile, loading, refreshProfile } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-white/50">
        <HealthIdLoadingIcon size="md" label="Loading" showLabel />
      </div>
    )
  }

  const needsPhoneVerification =
    user && user.role === 'CITIZEN' && profile?.mobile && profile.phoneVerified === false

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
