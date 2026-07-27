'use client'

import { useEffect, useState } from 'react'
import { Building2, KeyRound, LoaderCircle, Pencil, UserRound } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  changeManagementPassword,
  updateManagementProfile,
} from '@/api/client/scaffolded-management'
import { PageHeading } from '@/components/management/page-heading'
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

export function AccountProfileScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { currentUser, availableWorkspaces } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [displayName, setDisplayName] = useState(currentUser?.name ?? '')
  const [savedDisplayName, setSavedDisplayName] = useState(currentUser?.name ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    setDisplayName(currentUser.name)
    setSavedDisplayName(currentUser.name)
  }, [currentUser])

  if (!currentUser || !workspace) return null

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
      toast.success('账号资料已更新')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存资料失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function changePassword() {
    if (newPassword.length < 12 || !confirmationToken.trim()) {
      toast.error('请填写至少 12 位新密码和安全确认凭证')
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

  return (
    <div>
      <PageHeading
        eyebrow="个人中心"
        title="账号资料"
        description="查看账号、维护个人资料并管理当前登录安全。"
        icon={UserRound}
        action={
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            编辑资料
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-xl border border-ember-200 bg-ember-50 font-display text-xl font-bold text-ember-700">
                {savedDisplayName.slice(0, 1)}
              </span>
              <div>
                <p className="font-semibold">{savedDisplayName}</p>
                <p className="mt-1 font-data text-xs text-muted-foreground">{currentUser.id}</p>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">当前身份</p>
                <p className="mt-1.5 font-medium">{roleLabels[workspace.role]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">当前工作空间</p>
                <p className="mt-1.5 font-medium">{workspace.name}</p>
              </div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">手机号属于登录标识，修改时需要验证码或确认凭证。</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-ember-600" />
                已授权工作空间
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableWorkspaces.map((item) => (
                <div key={item.id} className="rounded-lg border px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{roleLabels[item.role]}</span>
                  </div>
                  <p className="mt-1 font-data text-[11px] text-muted-foreground">{item.id}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">账号安全</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  管理端权限会在每次操作时实时校验，退出登录后当前管理会话立即失效。
                </p>
                <Button className="mt-3" size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>
                  修改密码
                </Button>
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
              <Label htmlFor="profile-account-id">账号编号</Label>
              <Input id="profile-account-id" value={currentUser.id} readOnly className="font-data" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">登录手机号</Label>
              <Input id="profile-phone" value="由身份服务脱敏返回" readOnly />
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
            <div className="space-y-2">
              <Label htmlFor="profile-confirmation">安全确认凭证</Label>
              <Input
                id="profile-confirmation"
                value={confirmationToken}
                onChange={(event) => setConfirmationToken(event.target.value)}
                placeholder="完成手机号确认后填写"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void changePassword()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              修改密码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
