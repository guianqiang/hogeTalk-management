'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { BadgeCheck, Building2, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { useManagement } from '@/lib/management'
import type { CertificationStatus } from '@/lib/types'

function date(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}

export function ChamberMembersScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces, workspaceData } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const snapshot = workspaceData[params.workspaceId]
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'all' | CertificationStatus>('all')

  const certifications = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return (snapshot?.certifications ?? []).filter((item) => (
      (!normalizedKeyword || `${item.enterpriseName}${item.enterpriseId}${item.levelName}`.toLowerCase().includes(normalizedKeyword))
      && (status === 'all' || item.status === status)
    ))
  }, [keyword, snapshot?.certifications, status])

  if (!workspace) return null

  return (
    <div>
      <PageHeading
        eyebrow={workspace.kind === 'platform' ? '会员运营' : '我的商会'}
        title={workspace.kind === 'platform' ? '商会认证' : '等级设置'}
        description={workspace.kind === 'platform'
          ? '检索各商会签发的企业认证，查看等级、有效期和平台认证状态。'
          : '查看会员单位的认证等级、有效期和平台认证状态。商会认证与平台企业认证相互独立。'}
        icon={BadgeCheck}
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ['认证总数', snapshot?.certifications.length ?? 0],
          ['有效认证', snapshot?.certifications.filter((item) => item.status === 'active').length ?? 0],
          ['已到期', snapshot?.certifications.filter((item) => item.status === 'expired').length ?? 0],
          ['平台未认证', snapshot?.certifications.filter((item) => item.platformVerificationStatus === 'unverified').length ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-data mt-2 text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索企业、企业 ID 或认证等级"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部认证状态</SelectItem>
                <SelectItem value="active">有效</SelectItem>
                <SelectItem value="expired">已到期</SelectItem>
                <SelectItem value="revoked">已撤销</SelectItem>
                <SelectItem value="inactive_affiliation">关系已失效</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] text-muted-foreground">
                  <th className="px-5 py-3 font-medium">企业</th>
                  <th className="px-4 py-3 font-medium">认证等级</th>
                  <th className="px-4 py-3 font-medium">有效期</th>
                  <th className="px-4 py-3 font-medium">商会认证</th>
                  <th className="px-5 py-3 font-medium">平台认证</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {certifications.map((item) => (
                  <tr key={item.certificationId}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-md border bg-muted/40">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{item.enterpriseName}</p>
                          <p className="font-data mt-1 text-xs text-muted-foreground">{item.enterpriseId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium">{item.levelName}</p>
                      <p className="font-data mt-1 text-xs text-muted-foreground">{item.levelCode}</p>
                    </td>
                    <td className="font-data px-4 py-4 text-xs text-muted-foreground">
                      <p>{date(item.validFrom)}</p>
                      <p className="mt-1">至 {date(item.validUntil)}</p>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-4"><StatusBadge status={item.platformVerificationStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!certifications.length && (
            <div className="grid min-h-56 place-items-center text-center">
              <div>
                <BadgeCheck className="mx-auto h-9 w-9 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">{snapshot?.loading ? '正在读取实时认证…' : '暂无符合条件的认证'}</p>
              </div>
            </div>
          )}
          <div className="font-data border-t px-5 py-3 text-xs text-muted-foreground">共 {certifications.length} 条认证</div>
        </CardContent>
      </Card>
    </div>
  )
}
