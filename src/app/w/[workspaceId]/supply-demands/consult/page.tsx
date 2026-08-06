import { Suspense } from 'react'
import { SupplyDemandConsultScreen } from '@/features/enterprise-workspace/supply-demand-consult-screen'

export const metadata = { title: '发起合作咨询' }

export default function SupplyDemandConsultPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-muted-foreground">加载中…</div>}>
      <SupplyDemandConsultScreen />
    </Suspense>
  )
}
