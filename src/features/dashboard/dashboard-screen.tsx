'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  GitCompareArrows,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { requestManagementResource } from '@/api/client/scaffolded-management'
import { useManagement } from '@/lib/management'
import { navigationForWorkspace } from '@/lib/navigation'
import { EnterpriseWorkspaceScreen } from '@/features/enterprise-workspace/enterprise-workspace-screen'

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
  const [platformStats, setPlatformStats] = useState<Record<string, unknown> | null>(null)
  const [platformError, setPlatformError] = useState<string | null>(null)

  useEffect(() => {
    if (workspace?.kind !== 'platform') return
    let active = true
    setPlatformError(null)
    void requestManagementResource<Record<string, unknown>>(
      'management/portal/dashboard',
    )
      .then((result) => {
        if (active) setPlatformStats(result)
      })
      .catch((error) => {
        if (active) setPlatformError(error instanceof Error ? error.message : '平台概览加载失败')
      })
    return () => {
      active = false
    }
  }, [workspace?.id, workspace?.kind])

  if (!workspace) return null
  if (workspace.kind === 'enterprise') return <EnterpriseWorkspaceScreen />

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
  const governanceEntries = [
    {
      href: '/claims',
      label: '认领审核',
      note: '核验申请人与企业控制关系',
      icon: ClipboardCheck,
      accent: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      href: '/verifications',
      label: '平台认证',
      note: '审核企业 L1–L3 认证材料',
      icon: BadgeCheck,
      accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
      href: '/duplicates',
      label: '重复企业',
      note: '识别并处置疑似重复主体',
      icon: GitCompareArrows,
      accent: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    {
      href: '/disputes',
      label: '所有权争议',
      note: '复核企业控制权变更申请',
      icon: Scale,
      accent: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  ] as const
  const navigationItems = navigationForWorkspace(workspace).flatMap((group) => group.items)
  const allowedNavigationHrefs = new Set(navigationItems.map((item) => item.href))
  const quickEntries = workspace.role === 'platform_admin'
    ? governanceEntries.filter((item) => allowedNavigationHrefs.has(item.href))
    : navigationItems
      .filter((item) => item.href)
      .slice(0, 4)
      .map((item) => ({
        href: item.href,
        label: item.label,
        note: item.note,
        icon: ArrowRight,
        accent: 'border-ember-200 bg-ember-50 text-ember-700',
      }))
  const platformHeading = workspace.role === 'platform_admin'
    ? {
        title: '平台工作台',
        description: '集中处理企业认领、争议、重复企业与平台认证事务。',
        eyebrow: '治理工作队列',
        sectionTitle: '常用审核入口',
        sectionNote: '按事项类型进入队列，查看材料与处理记录。',
      }
    : {
        title: '运营工作台',
        description: '按照已分配的运营菜单处理内容、线索与平台事务。',
        eyebrow: '当前工作范围',
        sectionTitle: '常用运营入口',
        sectionNote: '快捷入口与左侧菜单保持一致，不展示未分配的功能。',
      }

  return (
    <div>
      <PageHeading
        eyebrow="运营总览"
        title={isPlatform ? platformHeading.title : '商会工作台'}
        description={isPlatform
          ? platformHeading.description
          : '掌握会员企业、认证状态和需要跟进的资料。'}
        icon={CalendarDays}
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-ember-600" />
            {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date())}
          </div>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.04)]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded bg-ember-50 px-2 text-[11px] font-semibold text-ember-700">
                当前管理范围
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                权限正常
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{workspace.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {workspace.shortName} · {workspace.staffTitle}
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
        <div className="grid gap-2 border-t border-border px-5 py-3 text-xs sm:grid-cols-3 sm:px-6">
          <p><span className="text-muted-foreground">管理范围：</span>{isPlatform ? '华盟平台全局' : '当前商会'}</p>
          <p className="sm:text-center"><span className="text-muted-foreground">当前岗位：</span>{workspace.staffTitle}</p>
          <p className="sm:text-right"><span className="text-muted-foreground">数据刷新：</span>{snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString('zh-CN') : '按需加载'}</p>
        </div>
      </section>

      {isPlatform ? (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ['企业总数', 'enterprise_total', '平台当前企业主体'],
              ['已认证企业', 'verified_enterprise_total', '当前平台认证有效'],
              ['商品总数', 'product_total', `已发布 ${String(platformStats?.published_product_total ?? '—')}`],
              ['待处理事务', 'pending_review_total', `未结线索 ${String(platformStats?.inquiry_open_total ?? '—')}`],
            ].map(([label, key, note]) => (
              <Card key={key}>
                <CardContent className="p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="font-data mt-2 text-2xl font-semibold sm:text-3xl">
                    {platformStats ? String(platformStats[key] ?? '—') : '…'}
                  </p>
                  <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">{note}</p>
                </CardContent>
              </Card>
            ))}
          </section>
          <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.04)]">
            <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] text-ember-700">{platformHeading.eyebrow}</p>
                <h2 className="mt-1 text-base font-semibold">{platformHeading.sectionTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{platformHeading.sectionNote}</p>
              </div>
              <span className="w-fit rounded-full border bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                {quickEntries.length} 个快捷入口
              </span>
            </div>
            <div className="p-3 sm:p-4">
              {platformError ? (
                <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">统计数据暂时无法加载</p>
                    <p className="mt-1 text-xs text-red-700">{platformError}</p>
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {quickEntries.map(({ href, label, note, icon: Icon, accent }) => (
                  <Link
                    key={href}
                    href={`/w/${workspace.id}${href}`}
                    className="group relative min-h-32 overflow-hidden rounded-lg border border-border bg-background px-3 py-3 transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-ember-200 hover:bg-ember-50/20 hover:shadow-[0_10px_24px_rgb(31_32_38/0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 sm:min-h-36 sm:px-4 sm:py-4"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-lg border ${accent}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ember-700" />
                    </span>
                    <span className="mt-4 block text-sm font-semibold tracking-[-0.01em] sm:mt-5 sm:text-base">{label}</span>
                    <span className="mt-1.5 block text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">{note}</span>
                    <span className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-ember-600 transition-transform duration-200 group-hover:scale-x-100" />
                  </Link>
                ))}
              </div>
              {Array.isArray(platformStats?.unavailable_metrics) && platformStats.unavailable_metrics.length > 0 && (
                <p className="mt-4 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  暂不可用指标：{platformStats.unavailable_metrics.join('、')}
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map(([label, value, note, Icon]) => (
              <Card key={label}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="font-data mt-2 text-2xl font-semibold sm:text-3xl">{value}</p>
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
