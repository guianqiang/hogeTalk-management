import { ManagementShell } from '@/components/management/management-shell'

export const dynamic = 'force-dynamic'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <ManagementShell>{children}</ManagementShell>
}
