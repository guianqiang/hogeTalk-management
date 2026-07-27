'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  BadgeCheck,
  Building2,
  ChevronDown,
  CircleGauge,
  ClipboardCheck,
  Globe2,
  Handshake,
  LogOut,
  Menu,
  Newspaper,
  Settings2,
  UserRound,
  UserRoundCog,
  UsersRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useManagement } from '@/lib/management'
import { navigationForWorkspace, type ManagementNavIcon } from '@/lib/navigation'
import type { WorkspaceRole } from '@/lib/types'
import { cn } from '@/lib/utils'

const navIcons = {
  dashboard: CircleGauge,
  enterprise: Building2,
  account: UserRoundCog,
  membership: UsersRound,
  audit: Activity,
  review: ClipboardCheck,
  verification: BadgeCheck,
  duplicate: Building2,
  dispute: Activity,
  content: Newspaper,
  globe: Globe2,
  settings: Settings2,
  partner: Handshake,
} satisfies Record<ManagementNavIcon, typeof CircleGauge>

const roleLabels: Record<WorkspaceRole, string> = {
  platform_admin: '华盟管理员',
  platform_operator: '华盟运营',
  chamber_admin: '商会管理员',
}

export function ManagementShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspaceId: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const {
    hydrated,
    currentUser,
    availableWorkspaces,
    workspaceData,
    logout,
    switchWorkspace: persistWorkspace,
    refreshWorkspace,
  } = useManagement()
  const [mobileOpen, setMobileOpen] = useState(false)
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)

  useEffect(() => {
    if (!hydrated) return
    if (!currentUser) {
      router.replace('/login')
      return
    }
    if (!workspace && availableWorkspaces[0]) {
      router.replace(`/w/${availableWorkspaces[0].id}`)
    }
  }, [availableWorkspaces, currentUser, hydrated, router, workspace])

  useEffect(() => setMobileOpen(false), [pathname])
  useEffect(() => {
    if (workspace?.kind !== 'chamber') return
    void refreshWorkspace(workspace.id).catch((error) => {
      toast.error(error instanceof Error ? error.message : '工作空间数据加载失败')
    })
  }, [refreshWorkspace, workspace?.id, workspace?.kind])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const visibleNavGroups = useMemo(
    () => workspace ? navigationForWorkspace(workspace) : [],
    [workspace],
  )
  const currentNavItem = useMemo(() => {
    if (!workspace) return undefined
    return visibleNavGroups
      .flatMap((group) => group.items)
      .find((item) => {
        const href = `/w/${workspace.id}${item.href}`
        return item.href === '' ? pathname === `/w/${workspace.id}` : pathname.startsWith(href)
      })
  }, [pathname, visibleNavGroups, workspace])
  const pageTitle = pathname.endsWith('/account') ? '账号资料' : currentNavItem?.label ?? '华盟管理台'

  if (!hydrated || !currentUser || !workspace) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted-foreground">正在校验管理会话与实时工作空间…</p>
      </div>
    )
  }

  const pendingCount = workspaceData[workspace.id]?.candidates.filter((item) => (
    item.status === 'needs_identifier' || item.status === 'conflict'
  )).length ?? 0

  async function switchWorkspace(workspaceId: string) {
    try {
      await persistWorkspace(workspaceId)
      router.push(`/w/${workspaceId}`)
      toast.success('已切换实时工作空间')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '工作空间切换失败')
    }
  }

  async function signOut() {
    try {
      await logout()
    } finally {
      router.replace('/login')
    }
  }

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-border/70 bg-card text-foreground shadow-[6px_0_24px_rgb(31_32_38/0.025)]">
      <div className="flex h-[76px] items-center border-b border-border/45 px-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-bold leading-none tracking-[-0.045em]">
            华盟<span className="text-ember-600">在线</span>
          </p>
          <p className="mt-2 truncate text-[11px] leading-none tracking-[0.08em] text-muted-foreground">运营管理平台</p>
        </div>
      </div>

      <div className="px-3 pb-2 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background/55 px-3 py-3 text-left shadow-[0_1px_2px_rgb(31_32_38/0.035)] transition-[border-color,background-color] hover:border-ember-200 hover:bg-ember-50/45">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-ember-100 bg-ember-50 font-display text-sm font-bold text-ember-700">
                {workspace.shortName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] tracking-[0.04em] text-muted-foreground">{workspace.name}</p>
                <p className="mt-1 truncate text-[13px] font-semibold">{workspace.shortName}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-64">
            <DropdownMenuLabel>切换工作空间</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableWorkspaces.map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => switchWorkspace(item.id)}>
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{roleLabels[item.role]}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {visibleNavGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground/65">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const href = `/w/${workspace.id}${item.href}`
                const active = item.href === ''
                  ? pathname === `/w/${workspace.id}`
                  : pathname.startsWith(href)
                const Icon = navIcons[item.icon]
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13px] font-normal transition-[color,background-color,box-shadow] duration-150',
                      active
                        ? 'bg-ember-50 font-semibold text-ember-700 shadow-[inset_0_0_0_1px_rgb(254_215_170/0.35)] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-ember-600'
                        : 'text-muted-foreground hover:bg-accent/75 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-[15px] w-[15px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/60 bg-background/30 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent">
              <Avatar className="h-8 w-8 rounded-[5px]">
                <AvatarFallback className="rounded-[5px] border border-ember-200 bg-ember-50 text-xs font-semibold text-ember-700">{currentUser.avatarText}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{currentUser.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{roleLabels[workspace.role]}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-52">
            <DropdownMenuLabel>{currentUser.account}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/w/${workspace.id}/account`)}>
              <UserRound className="h-4 w-4" />
              账号资料
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[224px] lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} aria-label="关闭导航" />
          <div className="relative h-full w-[280px]">
            {sidebar}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-foreground"
              onClick={() => setMobileOpen(false)}
              aria-label="关闭导航"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="lg:pl-[224px]">
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-border/60 bg-card/95 px-4 shadow-[0_1px_6px_rgb(31_32_38/0.035)] backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="打开导航">
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-[13px] font-semibold text-foreground">{pageTitle}</p>
              <p className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">{workspace.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workspace.kind === 'chamber' && (
              <Link
                href={`/w/${workspace.id}/enterprises`}
                className="hidden h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
              >
                <ClipboardCheck className="h-4 w-4" />
                待补标识
                {pendingCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ember-600 px-1 font-data text-[10px] font-semibold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-7 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
