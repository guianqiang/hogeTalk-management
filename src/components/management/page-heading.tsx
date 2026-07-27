import type { LucideIcon } from 'lucide-react'

export function PageHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  icon?: LucideIcon
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="section-kicker mb-2 flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {eyebrow}
        </div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[28px]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
