import { cn } from '../../lib/utils'

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-navy/50 px-3 py-2 text-sm text-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-all duration-300',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
