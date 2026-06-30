import { cn } from '../../lib/utils'
import LoadingButton from './LoadingButton'

const variants = {
  default: 'bg-accent text-navy hover:bg-accent2 font-semibold',
  outline: 'border border-white/20 bg-transparent hover:bg-white/10 text-text',
  ghost: 'bg-transparent hover:bg-white/10 text-text',
}

const sizes = {
  default: 'h-10 px-4 py-2',
  lg: 'h-11 px-6',
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  disabled,
  loading = false,
  loadingLabel,
  children,
  ...props
}) {
  if (loading) {
    return (
      <LoadingButton
        className={className}
        variant={variant}
        size={size}
        type={type}
        disabled={disabled}
        loading
        loadingLabel={loadingLabel}
        {...props}
      >
        {children}
      </LoadingButton>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
