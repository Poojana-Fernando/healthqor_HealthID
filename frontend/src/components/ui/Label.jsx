import { cn } from '../../lib/utils'

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('text-xs font-medium text-accent2 block mb-1.5', className)}
      {...props}
    />
  )
}
