import { cn } from '../../lib/utils'
import HealthIdLogoMark from '../HealthIdLogoMark'

const sizes = {
  xs: 16,
  sm: 22,
  md: 32,
  lg: 48,
  xl: 64,
}

/**
 * Branded loader — animated Health ID logo (shield + ECG) with orbit ring.
 */
export default function HealthIdLoadingIcon({
  size = 'md',
  className,
  label = 'Loading',
  showLabel = false,
}) {
  const px = typeof size === 'number' ? size : sizes[size] || sizes.md

  return (
    <span
      className={cn('hq-logo-loader', className)}
      style={{ width: px, height: px }}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <span className="hq-logo-loader__orbit" aria-hidden="true" />
      <span className="hq-logo-loader__ring" aria-hidden="true" />
      <HealthIdLogoMark className="hq-logo-loader__mark" loading />
      {showLabel && (
        <span className="hq-logo-loader__label">{label}</span>
      )}
    </span>
  )
}
