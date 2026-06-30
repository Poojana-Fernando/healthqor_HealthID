import { cn } from '../../lib/utils'
import HealthIdLoadingIcon from './HealthIdLoadingIcon'

const variants = {
  default: 'bg-accent text-navy hover:bg-accent2 font-semibold',
  outline: 'border border-white/20 bg-transparent hover:bg-white/10 text-text',
  ghost: 'bg-transparent hover:bg-white/10 text-text',
  glass: 'glass hover:border-accent text-text',
  enterprise: 'pe-edit-save',
}

const sizes = {
  default: 'h-10 px-4 py-2 text-sm rounded-2xl',
  lg: 'h-11 px-6 text-sm rounded-2xl',
  full: 'w-full py-3 rounded-xl text-sm',
  cta: 'cta-premium px-6 py-2.5 text-xs rounded-xl',
}

const spinnerSizes = {
  default: 'sm',
  lg: 'sm',
  full: 'sm',
  cta: 'xs',
}

export default function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  disabled,
  spinnerSize,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2.5 whitespace-nowrap transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:pointer-events-none disabled:opacity-60',
        loading && 'cursor-wait',
        variants[variant],
        sizes[size],
        className,
      )}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <HealthIdLoadingIcon
          size={spinnerSize || spinnerSizes[size] || 'sm'}
          label={loadingLabel || 'Loading'}
        />
      )}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  )
}
