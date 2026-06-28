import { cn } from '../../lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('premium-glass rounded-3xl overflow-hidden text-text', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-6 pb-2', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-xl font-semibold leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-white/60', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-2', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-6 pt-4', className)} {...props} />
}
