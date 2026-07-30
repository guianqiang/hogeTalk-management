'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { verifyManagementPhone } from '@/api/client/management'
import {
  changeManagementPassword,
  getManagementAccount,
  updateManagementProfile,
} from '@/api/client/scaffolded-management'
import { PageHeading } from '@/components/management/page-heading'
import { PhoneConfirmationField } from '@/components/management/phone-confirmation-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useManagement } from '@/lib/management'

const roleLabels = {
  platform_admin: '华盟管理员',
  platform_operator: '华盟运营',
  chamber_admin: '商会管理员',
} as const

interface AccountDetails {
  status: string
  maskedPhone: string
  createdAt: string | null
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function formatDate(value: string | null) {
  if (!value) return '暂未提供'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂未提供'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function AccountProfileScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { currentUser, availableWorkspaces, refreshAccount } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [displayName, setDisplayName] = useState(currentUser?.name ?? '')
  const [savedDisplayName, setSavedDisplayName] = useState(currentUser?.name ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')
  const [phoneConfirmationToken, setPhoneConfirmationToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    setDisplayName(currentUser.name)
    setSavedDisplayName(currentUser.name)
  }, [currentUser])

  useEffect(() => {
    let active = true
    setAccountLoading(true)
    setAccountError(null)
    void getManagementAccount()
      .then((account) => {
        if (!active) return
        setAccountDetails({
          status: stringValue(account.status),
          maskedPhone: stringValue(account.masked_phone),
          createdAt: stringValue(account.created_at) || null,
        })
      })
      .catch((error) => {
        if (!active) return
        setAccountError(error instanceof Error ? error.message : '账号信息暂时无法加载')
      })
      .finally(() => {
        if (active) setAccountLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (!currentUser || !workspace) return null

  const isActive = accountDetails?.status === 'active'
  const statusText = accountLoading
    ? '校验中'
    : isActive
      ? '账号正常'
      : accountDetails?.status === 'suspended'
        ? '账号已停用'
        : '状态待确认'
  const statusTone = isActive
    ? 'bg-emerald-50 text-emerald-700'
    : accountDetails?.status === 'suspended'
      ? 'bg-red-50 text-red-700'
      : 'bg-muted text-muted-foreground'
  const organizationType = workspace.kind === 'platform' ? '华盟平台' : '商会组织'
  const managementScope = workspace.kind === 'platform'
    ? '可按当前角色处理华盟平台范围内的管理事项'
    : '仅可管理当前所属商会及其授权业务'
  const phoneText = accountLoading
    ? '正在获取…'
    : accountDetails?.maskedPhone || '暂未提供'

  async function saveProfile() {
    if (!currentUser) return
    if (!displayName.trim()) {
      toast.error('请填写展示名称')
      return
    }
    setSubmitting(true)
    try {
      await updateManagementProfile(currentUser.id, displayName.trim())
      setSavedDisplayName(displayName.trim())
      setEditOpen(false)
      try {
        await refreshAccount()
      } catch {
        toast.warning('资料已保存，账号信息将在下次刷新时同步')
      }
      toast.success('账号资料已更新')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存资料失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function changePassword() {
    if (newPassword.length < 12 || !confirmationToken.trim()) {
      toast.error('请填写至少 12 位新密码并完成手机验证码确认')
      return
    }
    setSubmitting(true)
    try {
      await changeManagementPassword(newPassword, confirmationToken.trim())
      toast.success('密码已修改，请重新登录')
      window.location.assign('/login')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '修改密码失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function bindPhone() {
    const [challengeId, code] = phoneConfirmationToken.split('.', 2)
    if (!challengeId || !/^\d{4,8}$/.test(code ?? '')) {
      toast.error('请先完成手机号验证码确认')
      return
    }
    setSubmitting(true)
    try {
      const result = await verifyManagementPhone(challengeId, code)
      setAccountDetails((current) => current
        ? { ...current, maskedPhone: result.masked_value }
        : {
          status: 'active',
          maskedPhone: result.masked_value,
          createdAt: null,
        })
      setPhoneOpen(false)
      setPhoneConfirmationToken('')
      toast.success('登录手机号已完成验证')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '手机号验证失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="个人中心"
        title="账号资料"
        description="维护展示名称，查看所属组织、当前权限与登录安全信息。"
        icon={UserRound}
        action={
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            编辑资料
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.7fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-ember-500 via-amber-400 to-transparent" />
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-ember-200 bg-ember-50 font-display text-2xl font-bold text-ember-700 shadow-sm">
                  {savedDisplayName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-xl font-semibold">{savedDisplayName}</h2>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {statusText}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {roleLabels[workspace.role]} · {workspace.shortName}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3.5">
                  <Phone className="mt-0.5 h-4 w-4 text-ember-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">登录手机号</p>
                    <p className="mt-1 text-sm font-medium">{phoneText}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3.5">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-ember-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">账号开通时间</p>
                    <p className="mt-1 text-sm font-medium">{formatDate(accountDetails?.createdAt ?? null)}</p>
                  </div>
                </div>
              </div>
              {accountError && (
                <p className="mt-3 text-xs text-amber-700">账号详情暂未同步：{accountError}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-ember-600" />
                所属组织与管理范围
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">所属组织</p>
                  <p className="mt-1.5 text-sm font-medium">{workspace.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">组织类型</p>
                  <p className="mt-1.5 text-sm font-medium">{organizationType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">当前角色</p>
                  <p className="mt-1.5 text-sm font-medium">{roleLabels[workspace.role]}</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-ember-100 bg-ember-50/45 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
                <div>
                  <p className="text-sm font-medium text-foreground">{managementScope}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    一个账号对应一个所属组织，具体功能权限以当前角色的实时授权为准。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-ember-600" />
                登录与安全
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">登录密码</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  修改密码后，现有管理会话将失效，需要使用新密码重新登录。
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewPassword('')
                    setConfirmationToken('')
                    setPasswordOpen(true)
                  }}
                >
                  修改密码
                </Button>
              </div>
              <div className="mt-3 rounded-xl border p-4">
                <p className="text-sm font-medium">登录手机号</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {accountDetails?.maskedPhone
                    ? `当前已验证手机号：${accountDetails.maskedPhone}`
                    : '当前账号尚未绑定手机号，敏感操作和手机号登录将无法完成。'}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPhoneConfirmationToken('')
                    setPhoneOpen(true)
                  }}
                >
                  {accountDetails?.maskedPhone ? '验证新手机号' : '绑定手机号'}
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3.5 py-3 text-xs text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                敏感操作均进行身份与权限实时校验
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑账号资料</DialogTitle>
            <DialogDescription>展示名称用于管理台识别，不改变账号授权和手机号登录标识。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-display-name">展示名称</Label>
              <Input id="profile-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">登录手机号</Label>
              <Input id="profile-phone" value={phoneText} readOnly />
              <p className="text-xs text-muted-foreground">手机号变更会使用独立验证流程，不在本弹窗内修改。</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void saveProfile()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存资料
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>密码变更后应撤销全部身份域的现有会话，并要求重新登录。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-new-password">新密码</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="至少 12 位，包含字母、数字和符号"
              />
            </div>
            <PhoneConfirmationField
              idPrefix="profile-password"
              value={confirmationToken}
              onChange={setConfirmationToken}
              disabled={submitting}
              description="验证码只发送到当前账号已验证的手机号；填写完成后即可修改密码。"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>取消</Button>
            <Button
              disabled={submitting || newPassword.length < 12 || !confirmationToken}
              onClick={() => void changePassword()}
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              修改密码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{accountDetails?.maskedPhone ? '验证新手机号' : '绑定登录手机号'}</DialogTitle>
            <DialogDescription>
              验证成功后可使用该手机号登录，并可接收敏感操作的安全验证码。
            </DialogDescription>
          </DialogHeader>
          <PhoneConfirmationField
            idPrefix="profile-phone-bind"
            purpose="bind_phone"
            value={phoneConfirmationToken}
            onChange={setPhoneConfirmationToken}
            disabled={submitting}
            label="待验证手机号"
            description="验证码将发送到下面填写的手机号，验证成功后绑定到当前管理账号。"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneOpen(false)}>取消</Button>
            <Button disabled={submitting || !phoneConfirmationToken} onClick={() => void bindPhone()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              完成验证
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
