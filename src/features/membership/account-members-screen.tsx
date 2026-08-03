'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Eye, KeyRound, LoaderCircle, Pencil, Plus, Search, UserRoundCog } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  createChamberAdminAccount,
  createManagementStaffAccount,
  getManagementMenuCatalog,
  listManagementStaff,
  updateManagementStaff,
} from '@/api/client/management'
import type {
  ManagementMenuKey,
  MenuCatalogDto,
  StaffAssignmentDto,
} from '@/api/generated/huameng-platform'
import { PageHeading } from '@/components/management/page-heading'
import { PhoneConfirmationField } from '@/components/management/phone-confirmation-field'
import { StatusBadge } from '@/components/management/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { QueueEmpty, QueueError, QueueLoading } from '@/features/governance/queue-state'
import { useManagement } from '@/lib/management'
import {
  defaultStaffTitle,
  staffMenuSummary,
  validOperatorMenuKeys,
  type StaffRoleTemplate,
} from '@/lib/staff-role-templates'

const roleLabels: Record<StaffRoleTemplate, string> = {
  platform_admin: '平台管理员',
  platform_operator: '运营人员',
  chamber_admin: '商会管理员',
}

const websiteContentSubMenuKeys = new Set<ManagementMenuKey>([
  'content_home',
  'content_news',
  'content_tour',
  'content_education',
  'content_investment',
  'content_supply_chain',
  'content_associations',
  'content_activities',
  'content_parks',
  'content_article_categories',
  'content_countries',
  'content_site_settings',
])

function MenuScopeSelector({
  items,
  selectedKeys,
  onToggle,
}: {
  items: MenuCatalogDto['items']
  selectedKeys: ManagementMenuKey[]
  onToggle: (key: ManagementMenuKey, checked: boolean) => void
}) {
  const primaryItems = items.filter((item) => !websiteContentSubMenuKeys.has(item.menu_key))
  const contentItems = items.filter((item) => websiteContentSubMenuKeys.has(item.menu_key))

  function option(item: MenuCatalogDto['items'][number], nested = false) {
    const checked = selectedKeys.includes(item.menu_key)
    return (
      <label
        key={item.menu_key}
        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${nested ? 'bg-background' : ''} ${checked ? 'border-ember-300 bg-ember-50/55' : 'hover:bg-muted/30'}`}
      >
        <Checkbox checked={checked} onCheckedChange={(value) => onToggle(item.menu_key, value === true)} />
        <span>
          <span className="block text-sm font-medium">{item.display_name}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
        </span>
      </label>
    )
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {primaryItems.map((item) => option(item))}
      {contentItems.length > 0 && (
        <div className="space-y-3 rounded-xl border border-ember-100 bg-ember-50/25 p-3 sm:col-span-2">
          <div>
            <p className="text-sm font-semibold">网站内容子权限</p>
            <p className="mt-1 text-xs text-muted-foreground">首页、资讯、各业务频道和站点配置均可独立授权。</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {contentItems.map((item) => option(item, true))}
          </div>
        </div>
      )}
    </div>
  )
}

function dateTime(value: string | null | undefined) {
  if (!value) return '暂无记录'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function generateInitialPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*'
  const values = crypto.getRandomValues(new Uint32Array(14))
  return `Hm!8${[...values].map((value) => chars[value % chars.length]).join('')}`
}

export function AccountMembersScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const [items, setItems] = useState<StaffAssignmentDto[]>([])
  const [catalog, setCatalog] = useState<MenuCatalogDto | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<StaffRoleTemplate | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'revoked' | 'all'>('all')
  const [detailTarget, setDetailTarget] = useState<StaffAssignmentDto | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createdAccount, setCreatedAccount] = useState<StaffAssignmentDto | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [initialPassword, setInitialPassword] = useState('')
  const [roleTemplate, setRoleTemplate] = useState<StaffRoleTemplate>('platform_operator')
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<ManagementMenuKey[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffAssignmentDto | null>(null)
  const [editRole, setEditRole] = useState<StaffRoleTemplate>('platform_operator')
  const [editMenuKeys, setEditMenuKeys] = useState<ManagementMenuKey[]>([])
  const [revokeTarget, setRevokeTarget] = useState<StaffAssignmentDto | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')

  const load = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      const staffRequest = listManagementStaff({
        keyword,
        roleTemplate: workspace.kind === 'chamber' ? 'chamber_admin' : roleFilter,
        status: statusFilter,
        limit: 20,
      })
      const [staff, menuCatalog] = await Promise.all([
        staffRequest,
        workspace.kind === 'platform' ? getManagementMenuCatalog() : Promise.resolve(null),
      ])
      setItems(staff.items)
      setNextCursor(staff.page.next_cursor ?? null)
      setCatalog(menuCatalog)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [keyword, roleFilter, statusFilter, workspace])

  useEffect(() => {
    void load()
  }, [load])

  const menuItems = catalog?.items ?? []
  const createRoleOptions: StaffRoleTemplate[] = ['platform_admin', 'platform_operator']

  function resetCreate() {
    const nextRole = workspace?.kind === 'chamber' ? 'chamber_admin' : 'platform_operator'
    setUsername('')
    setDisplayName('')
    setPhone('')
    setInitialPassword(generateInitialPassword())
    setRoleTemplate(nextRole)
    setSelectedMenuKeys([])
    setCreatedAccount(null)
  }

  function openCreate() {
    resetCreate()
    setCreateOpen(true)
  }

  function toggleMenu(
    setter: React.Dispatch<React.SetStateAction<ManagementMenuKey[]>>,
    key: ManagementMenuKey,
    checked: boolean,
  ) {
    setter((current) => {
      if (key === 'content_management') {
        return checked
          ? [...new Set([...current, key, ...websiteContentSubMenuKeys])]
          : current.filter((item) => item !== key && !websiteContentSubMenuKeys.has(item))
      }
      if (!checked && websiteContentSubMenuKeys.has(key)) {
        return current.filter((item) => item !== key && item !== 'content_management')
      }
      return checked
        ? [...new Set([...current, key])]
        : current.filter((item) => item !== key)
    })
  }

  async function submitCreate() {
    if (!/^[A-Za-z][A-Za-z0-9._-]{3,31}$/.test(username.trim())) {
      toast.error('登录账号需以字母开头，使用 4–32 位字母、数字、点、下划线或中划线')
      return
    }
    if (!displayName.trim()) {
      toast.error('请填写人员姓名')
      return
    }
    if (initialPassword.length < 12) {
      toast.error('初始密码至少需要 12 位')
      return
    }
    if (roleTemplate === 'platform_operator' && selectedMenuKeys.length === 0) {
      toast.error('请至少选择一个可见菜单')
      return
    }
    setSubmitting(true)
    try {
      const base = {
        username: username.trim(),
        display_name: displayName.trim(),
        initial_password: initialPassword,
        phone: phone.trim() || null,
        country_code: 'CN',
        title: defaultStaffTitle(roleTemplate),
      }
      const result = workspace?.kind === 'chamber'
        ? await createChamberAdminAccount(workspace.id, base)
        : await createManagementStaffAccount({
          ...base,
          role_template: roleTemplate,
          menu_keys: roleTemplate === 'platform_operator'
            ? validOperatorMenuKeys(selectedMenuKeys, menuItems)
            : [],
        })

      setCreatedAccount(result)
      setItems((current) => [
        result,
        ...current.filter((item) => item.staff_assignment_id !== result.staff_assignment_id),
      ])
      toast.success(`${roleLabels[result.role_template]}账号已创建`)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '账号创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const result = await listManagementStaff({
        keyword,
        roleTemplate: workspace?.kind === 'chamber' ? 'chamber_admin' : roleFilter,
        status: statusFilter,
        cursor: nextCursor,
        limit: 20,
      })
      setItems((current) => [...current, ...result.items])
      setNextCursor(result.page.next_cursor ?? null)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '下一页人员读取失败')
    } finally {
      setLoadingMore(false)
    }
  }

  function openEdit(item: StaffAssignmentDto) {
    setEditTarget(item)
    setEditRole(item.role_template)
    setEditMenuKeys(item.menu_keys)
  }

  async function saveStaff() {
    if (!editTarget) return
    if (editRole === 'platform_operator' && editMenuKeys.length === 0) {
      toast.error('请至少选择一个可见菜单')
      return
    }
    setSubmitting(true)
    try {
      const result = await updateManagementStaff(editTarget.staff_assignment_id, {
        action: 'update',
        role_template: editRole,
        title: defaultStaffTitle(editRole),
        menu_keys: editRole === 'platform_operator'
          ? validOperatorMenuKeys(editMenuKeys, menuItems)
          : [],
        expected_version: editTarget.version,
      })
      setItems((current) => current.map((item) => (
        item.staff_assignment_id === result.staff_assignment_id ? result : item
      )))
      setEditTarget(null)
      toast.success('人员类型与可见菜单已更新')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '更新失败')
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  async function revokeStaff() {
    if (!revokeTarget || !revokeReason.trim() || confirmationToken.trim().length < 6) {
      toast.error('请填写撤销原因并完成手机验证码确认')
      return
    }
    setSubmitting(true)
    try {
      const result = await updateManagementStaff(revokeTarget.staff_assignment_id, {
        action: 'revoke',
        reason: revokeReason.trim(),
        confirmation_token: confirmationToken.trim(),
        expected_version: revokeTarget.version,
      })
      setItems((current) => current.map((item) => (
        item.staff_assignment_id === result.staff_assignment_id ? result : item
      )))
      setRevokeTarget(null)
      toast.success('后台账号权限已撤销')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '撤销失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!workspace) return null

  return (
    <div>
      <PageHeading
        eyebrow="系统"
        title="人员管理"
        description={workspace.kind === 'platform'
          ? '管理平台管理员和运营人员账号；商会管理员请在对应商会下管理。'
          : '管理可进入当前商会后台的商会管理员账号。'}
        icon={UserRoundCog}
        action={<Button onClick={() => openCreate()}><Plus className="h-4 w-4" />新建后台账号</Button>}
      />

      <Card className="mb-4">
        <CardContent className={`grid gap-3 p-4 ${workspace.kind === 'platform'
          ? 'md:grid-cols-[minmax(240px,1fr)_180px_160px_auto]'
          : 'md:grid-cols-[minmax(240px,1fr)_160px_auto]'}`}>
          <Input
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setKeyword(keywordDraft.trim())
                if (keyword === keywordDraft.trim()) void load()
              }
            }}
            placeholder="搜索姓名、登录账号或手机号"
          />
          {workspace.kind === 'platform' ? (
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as StaffRoleTemplate | 'all')}>
              <SelectTrigger aria-label="角色类型"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="platform_admin">平台管理员</SelectItem>
                <SelectItem value="platform_operator">运营人员</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'active' | 'revoked' | 'all')}>
            <SelectTrigger aria-label="账号状态"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="revoked">已撤销</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setKeyword(keywordDraft.trim())
                if (keyword === keywordDraft.trim()) void load()
              }}
            >
              <Search className="h-4 w-4" />查询
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setKeywordDraft('')
                setKeyword('')
                setRoleFilter('all')
                setStatusFilter('all')
              }}
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <QueueLoading /> : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty title="当前还没有后台账号" description="新建后账号立即生效，人员首次登录时必须修改初始密码。" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className={`w-full text-left ${workspace.kind === 'platform' ? 'min-w-[860px]' : 'min-w-[720px]'}`}>
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">人员</th>
                    <th className="px-5 py-3 font-medium">登录账号</th>
                    {workspace.kind === 'platform' && <th className="px-5 py-3 font-medium">角色类型</th>}
                    <th className="px-5 py-3 font-medium">状态</th>
                    <th className="px-5 py-3 font-medium">最近活跃</th>
                    <th className="px-5 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.staff_assignment_id} className="text-sm transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ember-100 bg-ember-50 font-semibold text-ember-700">
                            {item.display_name.slice(0, 1)}
                          </span>
                          <div>
                            <p className="font-medium">{item.display_name}</p>
                            {item.staff_assignment_id === workspace.staffAssignmentId && (
                              <p className="mt-0.5 text-[11px] text-ember-700">当前账号</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-data">{item.username}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.masked_phone || '未绑定手机号'}</p>
                      </td>
                      {workspace.kind === 'platform' && <td className="px-5 py-4">{roleLabels[item.role_template]}</td>}
                      <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-4 text-muted-foreground">{dateTime(item.last_active_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDetailTarget(item)}>
                          <Eye className="h-4 w-4" />查看详情
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
              <span>当前显示 {items.length} 人</span>
              {nextCursor && (
                <Button size="sm" variant="ghost" disabled={loadingMore} onClick={() => void loadMore()}>
                  {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}加载更多
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(detailTarget)} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>人员详情</DialogTitle>
            <DialogDescription>{workspace.kind === 'platform' ? '查看账号、角色和当前工作范围。' : '查看账号与当前状态。'}</DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-ember-100 bg-ember-50 text-lg font-semibold text-ember-700">
                  {detailTarget.display_name.slice(0, 1)}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{detailTarget.display_name}</p>
                    <StatusBadge status={detailTarget.status} />
                    {detailTarget.staff_assignment_id === workspace.staffAssignmentId && (
                      <span className="rounded-full border border-ember-200 bg-ember-50 px-2 py-0.5 text-[11px] text-ember-700">当前账号</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{workspace.kind === 'platform'
                    ? `${roleLabels[detailTarget.role_template]} · ${detailTarget.title}`
                    : detailTarget.title}</p>
                </div>
              </div>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">登录账号</dt><dd className="font-data mt-1 text-sm">{detailTarget.username}</dd></div>
                <div><dt className="text-xs text-muted-foreground">登录手机号</dt><dd className="mt-1 text-sm">{detailTarget.masked_phone || '未绑定手机号'}</dd></div>
                {workspace.kind === 'platform' && (
                  <div><dt className="text-xs text-muted-foreground">角色类型</dt><dd className="mt-1 text-sm">{roleLabels[detailTarget.role_template]}</dd></div>
                )}
                <div><dt className="text-xs text-muted-foreground">密码状态</dt><dd className="mt-1 text-sm">{detailTarget.must_change_password ? '首次登录需修改密码' : '正常'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">创建时间</dt><dd className="mt-1 text-sm">{dateTime(detailTarget.joined_at)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">最近活跃</dt><dd className="mt-1 text-sm">{dateTime(detailTarget.last_active_at)}</dd></div>
              </dl>
              {workspace.kind === 'platform' && <div>
                <p className="text-xs text-muted-foreground">工作范围</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {staffMenuSummary(detailTarget.role_template, detailTarget.menu_keys, menuItems).map((summary) => (
                    <span key={summary} className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs">{summary}</span>
                  ))}
                </div>
              </div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)}>关闭</Button>
            {detailTarget?.status === 'active' && detailTarget.staff_assignment_id !== workspace.staffAssignmentId && (
              <>
                {workspace.kind === 'platform' && <Button
                  variant="outline"
                  onClick={() => {
                    const target = detailTarget
                    setDetailTarget(null)
                    openEdit(target)
                  }}
                >
                  <Pencil className="h-4 w-4" />编辑
                </Button>}
                <Button
                  variant="destructive"
                  onClick={() => {
                    const target = detailTarget
                    setDetailTarget(null)
                    setRevokeTarget(target)
                    setRevokeReason('')
                    setConfirmationToken('')
                  }}
                >
                  撤销权限
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open)
        if (!open) setCreatedAccount(null)
      }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createdAccount ? '后台账号已创建' : '新建后台账号'}</DialogTitle>
            <DialogDescription>
              {createdAccount
                ? '请通过受信任方式把登录账号和初始密码交给该人员；首次登录会强制设置新密码。'
                : '账号创建后立即生效，不再经过邀请和接受流程。'}
            </DialogDescription>
          </DialogHeader>
          {createdAccount ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-ember-200 bg-ember-50/55 p-4">
                <p className="text-sm font-semibold">{createdAccount.display_name}{workspace.kind === 'platform'
                  ? ` · ${roleLabels[createdAccount.role_template]}`
                  : ''}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>登录账号</Label>
                    <Input className="mt-2 font-data" readOnly value={createdAccount.username} />
                  </div>
                  <div>
                    <Label>初始密码</Label>
                    <Input className="mt-2 font-data" readOnly value={initialPassword} />
                  </div>
                </div>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(`登录账号：${createdAccount.username}\n初始密码：${initialPassword}`)
                    toast.success('登录信息已复制')
                  }}
                >
                  <Copy className="h-4 w-4" />复制登录信息
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                初始密码不会由接口返回，也不会在关闭弹窗后再次显示。
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-display-name">姓名</Label>
                  <Input id="staff-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-username">登录账号</Label>
                  <Input id="staff-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例如 zhangsan.ops" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-phone">手机号（选填）</Label>
                  <Input id="staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="18800001009" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-initial-password">初始密码</Label>
                  <div className="flex gap-2">
                    <Input id="staff-initial-password" className="font-data" value={initialPassword} onChange={(event) => setInitialPassword(event.target.value)} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setInitialPassword(generateInitialPassword())} aria-label="重新生成初始密码">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {workspace.kind === 'platform' && <div className="space-y-2 sm:col-span-2">
                  <Label>人员类型</Label>
                  <Select value={roleTemplate} onValueChange={(value) => {
                    setRoleTemplate(value as StaffRoleTemplate)
                    setSelectedMenuKeys([])
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {createRoleOptions.map((role) => <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>}
              </div>
              {workspace.kind === 'platform' && (roleTemplate === 'platform_operator' ? (
                <div>
                  <Label>工作范围</Label>
                  <p className="mt-1 text-xs text-muted-foreground">与左侧功能保持一致，选中后系统自动配置对应业务权限。</p>
                  <MenuScopeSelector
                    items={menuItems}
                    selectedKeys={selectedMenuKeys}
                    onToggle={(key, checked) => toggleMenu(setSelectedMenuKeys, key, checked)}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-ember-200 bg-ember-50/45 p-4">
                  <p className="text-sm font-semibold">平台全部管理权限</p>
                  <p className="mt-1 text-xs text-muted-foreground">该人员类型无需逐项配置菜单。</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{createdAccount ? '完成' : '取消'}</Button>
            {!createdAccount && (
              <Button disabled={submitting} onClick={() => void submitCreate()}>
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}创建账号
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑后台人员</DialogTitle>
            <DialogDescription>保存后人员类型和可见菜单立即生效。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>人员类型</Label>
              {editTarget?.role_template === 'chamber_admin' || workspace.kind === 'chamber' ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/25 px-3 text-sm font-medium">商会管理员</div>
              ) : (
                <Select value={editRole} onValueChange={(value) => {
                  setEditRole(value as StaffRoleTemplate)
                  if (value !== 'platform_operator') setEditMenuKeys([])
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_admin">平台管理员</SelectItem>
                    <SelectItem value="platform_operator">运营人员</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {editRole === 'platform_operator' ? (
              <div>
                <Label>工作范围</Label>
                <MenuScopeSelector
                  items={menuItems}
                  selectedKeys={editMenuKeys}
                  onToggle={(key, checked) => toggleMenu(setEditMenuKeys, key, checked)}
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm">该人员类型默认拥有对应组织的全部管理功能。</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button disabled={submitting} onClick={() => void saveStaff()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}保存变更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销账号权限</DialogTitle>
            <DialogDescription>撤销后该账号会立即失去对应组织的后台管理权限。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">撤销原因</Label>
            <Textarea id="revoke-reason" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} />
          </div>
          <PhoneConfirmationField
            idPrefix="staff-revoke"
            value={confirmationToken}
            onChange={setConfirmationToken}
            disabled={submitting}
            description="验证码只发送到当前操作人的已验证手机号；服务端还会保护组织内最后一位有效管理员。"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              disabled={submitting || !revokeReason.trim() || !confirmationToken}
              onClick={() => void revokeStaff()}
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
