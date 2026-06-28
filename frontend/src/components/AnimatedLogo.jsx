import HealthIdLogoMark from './HealthIdLogoMark'

export default function AnimatedLogo({ size = 48 }) {
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 medical-logo-pulse" />
      <HealthIdLogoMark className="absolute inset-0 w-full h-full" />
    </div>
  )
}
