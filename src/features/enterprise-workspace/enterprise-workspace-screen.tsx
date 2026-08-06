'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Clock3,
  ContactRound,
  PackageSearch,
  Send,
  XCircle,
} from 'lucide-react'
import {
  getEnterpriseWorkspace,
  type EnterpriseWorkspaceDto,
} from '@/api/client/enterprise-workspace'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { useManagement } from '@/lib/management'

function verificationLabel(enterprise: {
  verificationStatus: string
  platformLevel: number
  platformLevelExpireAt: string | null
}) {
  if (enterprise.verificationStatus === 'verified' || enterprise.platformLevel > 0) {
    const level = enterprise.platformLevel > 0 ? `${enterprise.platformLevel} 级` : '已认证'
    if (!enterprise.platformLevelExpireAt) return level
    const expire = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' })
      .format(new Date(enterprise.platformLevelExpireAt))
    return `${level} · 有效至 ${expire}`
  }
  if (enterprise.verificationStatus === 'pending') return '认证审核中'
  if (enterprise.verificationStatus === 'rejected') return '认证未通过'
  return '未认证'
}

const countryLabels: Record<string, string> = {
  CN: '中国',
  MY: '马来西亚',
  SG: '新加坡',
  TH: '泰国',
  VN: '越南',
  ID: '印度尼西亚',
  PH: '菲律宾',
  KH: '柬埔寨',
  LA: '老挝',
  MM: '缅甸',
  BN: '文莱',
}

export function EnterpriseWorkspaceScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const [data, setData] = useState<EnterpriseWorkspaceDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setError(null)
    void getEnterpriseWorkspace()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : '企业工作台加载失败')
      })
    return () => {
      active = false
    }
  }, [])

  if (!workspace) return null
  const counts = data?.supplyDemandCounts ?? {}
  const onboardingStatus = data ? (data.enterprise?.onboardingStatus ?? 'none') : null
  const entries = [
    {
      href: `/w/${workspace.id}/enterprise-profile`,
      label: '企业信息',
      note: '维护入驻申请与对外展示的企业资料。',
      icon: Building2,
      enabled: workspace.menuKeys.includes('enterprise_workspace'),
    },
    {
      href: `/w/${workspace.id}/enterprise-verification`,
      label: '平台认证',
      note: '提交 L1–L3 平台认证申请并查看审核结果。',
      icon: BadgeCheck,
      enabled: workspace.menuKeys.includes('enterprise_workspace'),
    },
    {
      href: `/w/${workspace.id}/supply-demands`,
      label: '供需管理',
      note: '发布企业供需，查看状态并跟进合作咨询。',
      icon: PackageSearch,
      enabled: workspace.menuKeys.includes('supply_demand'),
    },
    {
      href: `/w/${workspace.id}/ai-card`,
      label: 'AI 名片',
      note: '维护企业人员名片和对外展示范围。',
      icon: ContactRound,
      enabled: workspace.menuKeys.includes('ai_card'),
    },
  ].filter((item) => item.enabled)

  return (
    <div>
      <PageHeading
        eyebrow="企业工作台"
        title={workspace.shortName}
        description="统一管理企业供需、合作咨询与对外名片。"
        icon={BriefcaseBusiness}
        action={data?.enterprise ? <StatusBadge status={data.enterprise.onboardingStatus} /> : null}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {onboardingStatus === 'none' ? (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-ember-200 bg-ember-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Send className="mt-0.5 h-5 w-5 shrink-0 text-ember-700" />
            <div>
              <p className="text-sm font-semibold">当前账号还未入驻企业</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                提交企业入驻申请，审核通过后即可使用供需发布、AI 名片等全部功能。
              </p>
            </div>
          </div>
          <Link
            href={`/w/${workspace.id}/enterprise-profile`}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-ember-700 px-4 text-sm font-medium text-white transition hover:bg-ember-800"
          >
            申请企业入驻
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {onboardingStatus === 'pending' ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            企业入驻申请审核中，审核结果会更新在
            <Link href={`/w/${workspace.id}/enterprise-profile`} className="mx-1 font-medium underline underline-offset-2">企业信息</Link>
            页面。
          </p>
        </div>
      ) : null}

      {onboardingStatus === 'rejected' ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">
            企业入驻申请被打回，请前往
            <Link href={`/w/${workspace.id}/enterprise-profile`} className="mx-1 font-medium underline underline-offset-2">企业信息</Link>
            查看打回原因并重新提交。
          </p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.04)]">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-ember-50 px-2 py-1 text-[11px] font-semibold text-ember-700">
                当前企业
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                工作台权限正常
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{workspace.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {data?.enterprise
                ? `${countryLabels[data.enterprise.countryCode] ?? data.enterprise.countryCode} · ${workspace.staffTitle}`
                : workspace.staffTitle}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/15 px-4 py-3">
            <BadgeCheck className="h-5 w-5 text-ember-700" />
            <div>
              <p className="text-xs text-muted-foreground">企业认证状态</p>
              <p className="mt-1 text-sm font-medium">
                {data?.enterprise
                  ? verificationLabel(data.enterprise)
                  : '未关联企业，先完成入驻申请后可查看'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {workspace.menuKeys.includes('supply_demand') ? (
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['全部供需', counts.total ?? 0, '企业已创建的供需'],
            ['待审核', counts.pending ?? 0, '历史待审（新提交已直接发布）'],
            ['已发布', counts.published ?? 0, '网站端公开展示'],
            ['草稿', counts.draft ?? 0, '尚未提交审核'],
          ].map(([label, value, note]) => (
            <Card key={String(label)}>
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="font-data mt-2 text-2xl font-semibold sm:text-3xl">{String(value)}</p>
                <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">{note}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.04)]">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-ember-700">常用功能</p>
          <h2 className="mt-1 text-base font-semibold">企业业务入口</h2>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {entries.map(({ href, label, note, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-lg border border-border bg-background p-4 transition hover:border-ember-200 hover:bg-ember-50/20"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-ember-200 bg-ember-50 text-ember-700">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-ember-700" />
              </div>
              <p className="mt-4 text-base font-semibold">{label}</p>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{note}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
