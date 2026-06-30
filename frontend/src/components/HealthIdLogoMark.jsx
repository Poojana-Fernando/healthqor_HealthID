import { useId } from 'react'
import { cn } from '../lib/utils'

/**
 * Shared Health ID logo SVG — shield, cross, and ECG line.
 * Used by AnimatedLogo and HealthIdLoadingIcon.
 */
export default function HealthIdLogoMark({ className, loading = false }) {
  const uid = useId().replace(/:/g, '')
  const shieldGrad = `shieldGrad-${uid}`
  const crossGrad = `crossGrad-${uid}`

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(className, loading && 'hq-logo-mark--loading')}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={shieldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={crossGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>

      <path
        d="M50 10 L78 22 V46 C78 64 50 82 50 82 S22 64 22 46 V22 Z"
        fill={`url(#${shieldGrad})`}
        stroke="#34d399"
        strokeWidth="1.8"
        className={loading ? 'hq-logo-mark__shield' : 'medical-shield'}
      />

      <rect x="44" y="30" width="12" height="34" rx="2.5" fill={`url(#${crossGrad})`} />
      <rect x="33" y="41" width="34" height="12" rx="2.5" fill={`url(#${crossGrad})`} />

      <path
        d="M12 74 H28 L34 60 L40 80 L46 54 L52 74 H88"
        fill="none"
        stroke="#5eead4"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={loading ? 'hq-logo-mark__ecg' : 'medical-ecg'}
      />
    </svg>
  )
}
