'use client'

import { ManagementProvider } from '@/lib/management'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ManagementProvider>
      {children}
      <Toaster />
    </ManagementProvider>
  )
}
