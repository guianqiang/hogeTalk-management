import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border-border bg-muted/35 text-muted-foreground',
        ember: 'border-ember-200 bg-ember-50 text-ember-700 dark:border-ember-700/40 dark:bg-ember-600/10 dark:text-ember-300',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-600/10 dark:text-emerald-300',
        warning:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-600/10 dark:text-amber-300',
        danger:
          'border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-600/10 dark:text-red-300',
        blue:
          'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-600/10 dark:text-blue-300',
        purple:
          'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700/40 dark:bg-purple-600/10 dark:text-purple-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
