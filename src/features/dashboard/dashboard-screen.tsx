'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { useManagement } from '@/lib/management'
import type { WorkspaceRole } from '@/lib/types'

const roleLabels: Record<WorkspaceRole, string> = {
  platform_admin: '平台管理员',
  platform_operator: '平台运营员',
  chamber_admin: '商会管理员',
}

function date(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function DashboardScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces, workspaceData } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const snapshot = workspaceData[params.workspaceId]
  if (!workspace) return null

  const isPlatform = workspace.kind === 'platform'
  const activeAffiliations = snapshot?.affiliations.filter((item) => item.status === 'active') ?? []
  const activeCertifications = snapshot?.certifications.filter((item) => item.status === 'active') ?? []
  const pendingCandidates = snapshot?.candidates.filter((item) => (
    item.status === 'needs_identifier' || item.status === 'conflict'
  )) ?? []
  const platformUnverified = activeAffiliations.filter((item) => (
    item.platformVerificationStatus === 'unverified'
  ))
  const expiringCertifications = [...activeCertifications]
    .sort((left, right) => new Date(left.validUntil).getTime() - new Date(right.validUntil).getTime())
    .slice(0, 5)
  const stats = [
    ['会员企业', activeAffiliations.length, '已建立有效商会关系', Building2],
    ['有效商会认证', activeCertifications.length, '当前仍在有效期内', BadgeCheck],
    ['资料待完善', pendingCandidates.length, '需要补充可核验注册标识', FileSpreadsheet],
    ['平台未认证', platformUnverified.length, '商会认证不等同于平台认证', CheckCircle2],
  ] as const

  return (
    <div>
      <PageHeading
        eyebrow="运营总览"
        title={isPlatform ? '平台工作台' : '商会工作台'}
        description={isPlatform
          ? '集中处理企业认领、争议、重复企业与平台认证事务。'
          : '掌握会员企业、认证状态和需要跟进的资料。'}
        icon={CalendarDays}
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-ember-600" />
            {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date())}
          </div>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded bg-ember-50 px-2 text-[11px] font-semibold text-ember-700">
                当前工作空间
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                权限正常
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{workspace.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {workspace.shortName} · {roleLabels[workspace.role]}
            </p>
          </div>
          {!isPlatform && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/w/${workspace.id}/chamber-members`}>
                  <BadgeCheck className="h-4 w-4" />
                  查看认证
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/w/${workspace.id}/enterprises`}>
                  <FileSpreadsheet className="h-4 w-4" />
                  导入企业
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="grid gap-2 border-t border-border/60 px-5 py-3 text-xs sm:grid-cols-3 sm:px-6">
          <p><span className="text-muted-foreground">工作空间：</span>{isPlatform ? '华盟平台' : '所属商会'}</p>
          <p className="sm:text-center"><span className="text-muted-foreground">我的角色：</span>{roleLabels[workspace.role]}</p>
          <p className="sm:text-right"><span className="text-muted-foreground">数据更新：</span>{snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString('zh-CN') : '按需加载'}</p>
        </div>
      </section>

      {isPlatform ? (
        <>
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground">可用工作空间</p>
                <p className="font-data mt-2 text-3xl font-semibold">{availableWorkspaces.length}</p>
                <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">当前账号获授权进入的范围</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground">当前角色</p>
                <p className="mt-3 text-xl font-semibold">{roleLabels[workspace.role]}</p>
                <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">具体操作仍按每项业务权限校验</p>
              </CardContent>
            </Card>
          </section>
          <Card className="mt-4">
            <CardContent className="grid min-h-64 place-items-center p-8 text-center">
              <div className="max-w-xl">
                <CalendarClock className="mx-auto h-9 w-9 text-ember-600" />
                <h2 className="mt-4 font-semibold">平台运营概览正在接入</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  企业认领、二次复核、所有权争议和重复企业处置将集中显示在这里。数据接入前不展示可能误导判断的空统计。
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(([label, value, note, Icon]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="font-data mt-2 text-3xl font-semibold">{value}</p>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-lg border bg-muted/35 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">{note}</p>
                </CardContent>
              </Card>
            ))}
          </section>
          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h2 className="font-semibold">最近加入的企业</h2>
                    <p className="mt-1 text-xs text-muted-foreground">优先关注新建立的会员企业关系</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/w/${workspace.id}/enterprises`}>查看全部<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
                <div className="divide-y">
                  {activeAffiliations.slice(0, 5).map((item) => (
                    <div key={item.affiliationId} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.enterpriseName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">加入于 {date(item.joinedAt)}</p>
                      </div>
                      <StatusBadge status={item.platformVerificationStatus} />
                    </div>
                  ))}
                  {!activeAffiliations.length && (
                    <div className="px-5 py-12 text-center">
                      <p className="text-sm font-medium">还没有会员企业</p>
                      <p className="mt-1 text-xs text-muted-foreground">导入已核验的企业名单后，这里会显示最新结果。</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h2 className="font-semibold">认证到期提醒</h2>
                    <p className="mt-1 text-xs text-muted-foreground">按到期日期由近到远排列</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/w/${workspace.id}/chamber-members`}>查看全部<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
                <div className="divide-y">
                  {expiringCertifications.map((item) => (
                    <div key={item.certificationId} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.enterpriseName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.levelName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium">{date(item.validUntil)}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">认证到期</p>
                      </div>
                    </div>
                  ))}
                  {!expiringCertifications.length && (
                    <div className="px-5 py-12 text-center">
                      <p className="text-sm font-medium">暂无有效认证</p>
                      <p className="mt-1 text-xs text-muted-foreground">完成企业导入并签发认证后，这里会显示到期提醒。</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
