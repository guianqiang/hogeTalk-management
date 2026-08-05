'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, LoaderCircle, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  getEnterpriseWorkspacePermissionCatalog,
  listEnterpriseWorkspaceAccounts,
  updateEnterpriseWorkspacePermissions,
  type EnterpriseWorkspaceAccountDto,
  type WorkspacePermission,
  type WorkspacePermissionCatalogDto,
} from '@/api/client/enterprise-workspace'
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
import { Textarea } from '@/components/ui/textarea'
import { QueueEmpty, QueueError, QueueLoading } from '@/features/governance/queue-state'

const roleLabels: Record<EnterpriseWorkspaceAccountDto['role'], string> = {
  owner: '企业所有者',
  admin: '企业管理员',
  member: '企业成员',
}

const statusLabels: Record<EnterpriseWorkspaceAccountDto['status'], string> = {
  active: '正常',
  suspended: '已停用',
  left: '已退出',
  revoked: '已撤销',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function permissionSummary(
  item: EnterpriseWorkspaceAccountDto,
  catalog: WorkspacePermissionCatalogDto | null,
) {
  if (item.role === 'owner') return ['全部企业工作台权限']
  const names = new Map(catalog?.items.map((option) => [option.code, option.name]) ?? [])
  return item.permissions.map((permission) => names.get(permission) ?? permission)
}

export function EnterpriseAccountsScreen() {
  const [items, setItems] = useState<EnterpriseWorkspaceAccountDto[]>([])
  const [catalog, setCatalog] = useState<WorkspacePermissionCatalogDto | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<EnterpriseWorkspaceAccountDto | null>(null)
  const [selected, setSelected] = useState<WorkspacePermission[]>([])
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const size = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accounts, permissionCatalog] = await Promise.all([
        listEnterpriseWorkspaceAccounts({ keyword, page, size }),
        getEnterpriseWorkspacePermissionCatalog(),
      ])
      setItems(accounts.list)
      setTotal(accounts.total)
      setCatalog(permissionCatalog)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [keyword, page])

  useEffect(() => {
    void load()
  }, [load])

  function openEdit(item: EnterpriseWorkspaceAccountDto) {
    setEditing(item)
    setSelected(item.permissions)
    setReason('')
  }

  function togglePermission(code: WorkspacePermission, checked: boolean) {
    setSelected((current) => {
      const next = checked
        ? [...new Set([...current, code])]
        : current.filter((permission) => permission !== code)
      if (checked && code !== 'enterprise_workspace.access') {
        return [...new Set(['enterprise_workspace.access' as WorkspacePermission, ...next])]
      }
      if (!checked && code === 'enterprise_workspace.access') return []
      return next
    })
  }

  async function save() {
    if (!editing) return
    if (reason.trim().length < 2) {
      toast.error('请填写本次权限调整原因')
      return
    }
    setSaving(true)
    try {
      const updated = await updateEnterpriseWorkspacePermissions(
        editing.membershipId,
        selected,
        editing.version,
        reason,
      )
      setItems((current) => current.map((item) => (
        item.membershipId === updated.membershipId ? updated : item
      )))
      setEditing(null)
      toast.success('企业工作台权限已更新')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '权限更新失败')
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="系统"
        title="企业账号权限"
        description="企业账号来自已生效的企业成员关系；这里只配置工作台功能权限，不改变账号所属企业和成员角色。"
        icon={KeyRound}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(260px,1fr)_auto]">
          <Input
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              setPage(1)
              setKeyword(keywordDraft.trim())
              if (keyword === keywordDraft.trim()) void load()
            }}
            placeholder="搜索账号姓名或企业名称"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPage(1)
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
                setPage(1)
              }}
            >重置</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <QueueLoading /> : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty title="没有可配置的企业账号" description="账号完成企业入驻、认领或加入后，会在这里显示。" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">账号</th>
                    <th className="px-5 py-3 font-medium">所属企业</th>
                    <th className="px-5 py-3 font-medium">企业角色</th>
                    <th className="px-5 py-3 font-medium">工作台权限</th>
                    <th className="px-5 py-3 font-medium">状态</th>
                    <th className="px-5 py-3 font-medium">更新时间</th>
                    <th className="w-[120px] px-5 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.membershipId} className="text-sm transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4 font-medium">{item.displayName}</td>
                      <td className="px-5 py-4">{item.enterpriseName}</td>
                      <td className="px-5 py-4">{roleLabels[item.role]}</td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-[360px] flex-wrap gap-1.5">
                          {permissionSummary(item, catalog).length ? permissionSummary(item, catalog).map((label) => (
                            <span key={label} className="rounded-full border bg-muted/30 px-2 py-0.5 text-[11px]">{label}</span>
                          )) : <span className="text-xs text-muted-foreground">未开通</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={item.status} label={statusLabels[item.status]} /></td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                      <td className="w-[120px] px-5 py-4 text-right">
                        {item.role === 'owner' ? (
                          <span className="text-xs text-muted-foreground">固定全部权限</span>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />配置
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
              <span>共 {total} 个企业账号，第 {page} / {Math.max(1, Math.ceil(total / size))} 页</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * size >= total} onClick={() => setPage((value) => value + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置企业工作台权限</DialogTitle>
            <DialogDescription>
              {editing ? `${editing.displayName} · ${editing.enterpriseName}` : '按实际职责授予最小权限。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {catalog?.items.map((option) => {
                const checked = selected.includes(option.code)
                return (
                  <label
                    key={option.code}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${checked ? 'border-ember-300 bg-ember-50/55' : 'hover:bg-muted/30'}`}
                  >
                    <Checkbox checked={checked} onCheckedChange={(value) => togglePermission(option.code, value === true)} />
                    <span>
                      <span className="block text-sm font-medium">{option.name}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-permission-reason">调整原因</Label>
              <Textarea
                id="workspace-permission-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="例如：负责企业供需发布与合作咨询跟进"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button disabled={saving || reason.trim().length < 2} onClick={() => void save()}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}保存权限
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
