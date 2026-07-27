'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, LoaderCircle, Plus, UserRoundCog } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  getManagementPermissionCatalog,
  inviteManagementStaff,
  listManagementStaff,
  updateManagementStaff,
} from '@/api/client/management'
import type {
  PermissionCatalogDto,
  StaffAssignmentDto,
} from '@/api/generated/huameng-platform'
import { PageHeading } from '@/components/management/page-heading'
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
import { useManagement } from '@/lib/management'
import { QueueEmpty, QueueError, QueueLoading } from '@/features/governance/queue-state'

const roleLabels = {
  platform_admin: '平台管理员',
  platform_operator: '平台运营员',
  chamber_admin: '商会管理员',
} as const

const actionLabels: Record<string, string> = {
  'management.access': '进入管理平台',
  'staff.invite': '邀请后台人员',
  'staff.manage': '管理人员与权限',
  'enterprise.import': '导入会员企业',
  'enterprise.verify': '审核平台认证',
  'claim.review': '审核企业认领',
  'claim.escalate': '发起二次复核',
  'duplicate.review': '处理重复企业',
  'dispute.review': '处理所有权争议',
  'evidence.read': '查看审核材料',
  'audit.read': '查看操作审计',
}

const defaultActionCatalog = [
  'management.access',
  'staff.invite',
  'staff.manage',
  'enterprise.import',
  'enterprise.verify',
  'claim.review',
  'claim.escalate',
  'duplicate.review',
  'dispute.review',
  'evidence.read',
  'audit.read',
].map((action) => ({
  action,
  allowed_scope_types: ['platform', 'country', 'chamber', 'enterprise'] as const,
  delegable: true,
}))

function dateTime(value: string | null | undefined) {
  if (!value) return '暂无记录'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AccountMembersScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const [items, setItems] = useState<StaffAssignmentDto[]>([])
  const [catalog, setCatalog] = useState<PermissionCatalogDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [keyword, setKeyword] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [roleTemplate, setRoleTemplate] = useState<'platform_admin' | 'platform_operator' | 'chamber_admin'>(
    workspace?.kind === 'chamber' ? 'chamber_admin' : 'platform_operator',
  )
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [scopeType, setScopeType] = useState<'platform' | 'country' | 'chamber' | 'enterprise'>(
    workspace?.kind === 'chamber' ? 'chamber' : 'platform',
  )
  const [scopeId, setScopeId] = useState(workspace?.kind === 'chamber' ? params.workspaceId : 'hm')
  const [countryCode, setCountryCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [invitationCode, setInvitationCode] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<StaffAssignmentDto | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [staff, permissionCatalog] = await Promise.all([
        listManagementStaff(params.workspaceId, { keyword, limit: 20 }),
        getManagementPermissionCatalog(params.workspaceId),
      ])
      setItems(staff.items)
      setCatalog(permissionCatalog)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [keyword, params.workspaceId])

  useEffect(() => {
    void load()
  }, [load])

  const delegableActions = useMemo(
    () => (catalog?.actions ?? defaultActionCatalog).filter((item) => item.delegable),
    [catalog],
  )
  const roleTemplates = catalog?.role_templates
    ?? (workspace?.kind === 'chamber'
      ? ['chamber_admin' as const]
      : ['platform_admin' as const, 'platform_operator' as const])

  function toggleAction(action: string, checked: boolean) {
    setSelectedActions((current) => checked
      ? [...new Set([...current, action])]
      : current.filter((item) => item !== action))
  }

  async function submitInvitation() {
    if (!displayName.trim() || !phone.trim() || !title.trim()) {
      toast.error('请完整填写姓名、手机号和岗位')
      return
    }
    if (!scopeId.trim()) {
      toast.error('请填写授权范围')
      return
    }
    setSubmitting(true)
    try {
      const result = await inviteManagementStaff(params.workspaceId, {
        destination_type: 'phone',
        destination: phone.trim(),
        display_name: displayName.trim(),
        title: title.trim(),
        role_template: roleTemplate,
        grants: selectedActions.map((action) => ({
          action,
          scope_type: scopeType,
          scope_id: scopeId.trim(),
          country_code: scopeType === 'country' ? countryCode.trim().toUpperCase() : null,
        })),
        expires_in_seconds: 86400,
      })
      setInvitationCode(result.invitation_code ?? null)
      toast.success('邀请已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '创建邀请失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function revokeStaff() {
    if (!revokeTarget || !revokeReason.trim() || confirmationToken.trim().length < 16) {
      toast.error('请填写撤销原因和有效的确认凭证')
      return
    }
    setSubmitting(true)
    try {
      const result = await updateManagementStaff(revokeTarget.staff_assignment_id, {
        action: 'revoke',
        reason: revokeReason.trim(),
        confirmation_token: confirmationToken.trim(),
      })
      setItems((current) => current.map((item) => (
        item.staff_assignment_id === result.staff_assignment_id ? result : item
      )))
      setRevokeTarget(null)
      toast.success('账号权限已撤销')
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
        title="账号管理"
        description={`管理可进入${workspace.kind === 'platform' ? '华盟平台' : '当前商会'}后台的人员和实时授权范围。`}
        icon={UserRoundCog}
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            邀请账号
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void load()}
            placeholder="搜索姓名或手机号"
            className="sm:max-w-sm"
          />
          <Button variant="outline" onClick={() => void load()}>搜索</Button>
        </CardContent>
      </Card>

      {loading ? (
        <QueueLoading />
      ) : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty
          title="当前还没有其他后台账号"
          description="邀请人员后，可为其设置岗位、角色模板和精确业务授权。"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.staff_assignment_id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ember-100 bg-ember-50 font-semibold text-ember-700">
                    {item.display_name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.display_name}</p>
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">{roleLabels[item.role_template]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.title} · {item.masked_phone}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.grants.map((grant) => (
                        <span
                          key={grant.reviewer_grant_id}
                          className="inline-flex rounded-full border bg-muted/35 px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {actionLabels[grant.action] ?? grant.action} · {grant.scope_type}:{grant.scope_id}
                        </span>
                      ))}
                      {item.grants.length === 0 && (
                        <span className="text-xs text-muted-foreground">仅可进入工作空间，暂无业务授权</span>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      加入于 {dateTime(item.joined_at)} · 最近活跃 {dateTime(item.last_active_at)}
                    </p>
                  </div>
                  {item.status === 'active' && (
                    <Button
                      variant="outline"
                      className="text-red-700 hover:text-red-700"
                      onClick={() => {
                        setRevokeTarget(item)
                        setRevokeReason('')
                        setConfirmationToken('')
                      }}
                    >
                      撤销权限
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={(open) => {
        setInviteOpen(open)
        if (!open) setInvitationCode(null)
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{invitationCode ? '邀请已创建' : '邀请后台账号'}</DialogTitle>
            <DialogDescription>
              {invitationCode
                ? '邀请码只在本次创建结果中显示，请通过受信任的方式交给被邀请人。'
                : '被邀请人确认手机号后，将获得工作空间身份和你明确选择的授权。'}
            </DialogDescription>
          </DialogHeader>
          {invitationCode ? (
            <div className="rounded-lg border border-ember-200 bg-ember-50/55 p-4">
              <Label>一次性邀请码</Label>
              <div className="mt-2 flex gap-2">
                <Input readOnly value={invitationCode} className="font-data" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void navigator.clipboard.writeText(invitationCode)
                    toast.success('邀请码已复制')
                  }}
                  aria-label="复制邀请码"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">邀请码不会再次显示，也不会写入操作日志。</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-name">姓名</Label>
                  <Input id="staff-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-phone">手机号</Label>
                  <Input id="staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+8613800000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-title">岗位</Label>
                  <Input id="staff-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：平台审核员" />
                </div>
                <div className="space-y-2">
                  <Label>角色模板</Label>
                  <Select value={roleTemplate} onValueChange={(value) => setRoleTemplate(value as typeof roleTemplate)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleTemplates.map((role) => (
                        <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>业务授权</Label>
                <div className="mt-2 grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  {delegableActions.map((permission) => (
                    <label key={permission.action} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50">
                      <Checkbox
                        checked={selectedActions.includes(permission.action)}
                        onCheckedChange={(checked) => toggleAction(permission.action, checked === true)}
                      />
                      {actionLabels[permission.action] ?? permission.action}
                    </label>
                  ))}
                  {delegableActions.length === 0 && (
                    <p className="text-sm text-muted-foreground">当前账号没有可下放的业务授权。</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>授权范围</Label>
                  <Select value={scopeType} onValueChange={(value) => setScopeType(value as typeof scopeType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">整个平台</SelectItem>
                      <SelectItem value="country">指定国家</SelectItem>
                      <SelectItem value="chamber">指定商会</SelectItem>
                      <SelectItem value="enterprise">指定企业</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope-id">范围标识</Label>
                  <Input id="scope-id" value={scopeId} onChange={(event) => setScopeId(event.target.value)} />
                </div>
                {scopeType === 'country' && (
                  <div className="space-y-2">
                    <Label htmlFor="country-code">国家代码</Label>
                    <Input id="country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="CN" />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {invitationCode ? '完成' : '取消'}
            </Button>
            {!invitationCode && (
              <Button disabled={submitting} onClick={() => void submitInvitation()}>
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                创建邀请
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销账号权限</DialogTitle>
            <DialogDescription>
              撤销后，该账号下一次业务请求会立即失去当前工作空间的管理权限。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">撤销原因</Label>
            <Textarea id="revoke-reason" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-confirmation">手机号确认凭证</Label>
            <Input
              id="staff-confirmation"
              value={confirmationToken}
              onChange={(event) => setConfirmationToken(event.target.value)}
              placeholder="完成手机号确认后粘贴凭证"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>取消</Button>
            <Button variant="destructive" disabled={submitting} onClick={() => void revokeStaff()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
