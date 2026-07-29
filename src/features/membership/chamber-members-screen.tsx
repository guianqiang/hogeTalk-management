'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { BadgeCheck, Building2, LoaderCircle, Pencil, Plus, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnChamberCertificationLevel,
  createChamberCertificationLevel,
  listChamberCertificationLevels,
} from '@/api/client/management'
import type { CertificationLevelDto } from '@/api/generated/huameng'
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
import { useManagement } from '@/lib/management'

function date(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}

type LevelForm = {
  code: string
  name: string
  description: string
  sortOrder: number
  validDays: number
  isDefault: boolean
}

const emptyForm: LevelForm = {
  code: '',
  name: '',
  description: '',
  sortOrder: 0,
  validDays: 365,
  isDefault: false,
}

export function ChamberMembersScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces, workspaceData, refreshWorkspace } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const snapshot = workspaceData[params.workspaceId]
  const [levels, setLevels] = useState<CertificationLevelDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CertificationLevelDto | null>(null)
  const [form, setForm] = useState<LevelForm>(emptyForm)
  const [actionTarget, setActionTarget] = useState<{
    level: CertificationLevelDto
    action: 'enable' | 'disable' | 'set_default'
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadLevels = useCallback(async () => {
    if (!workspace || workspace.kind !== 'chamber') {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await listChamberCertificationLevels(workspace.id)
      setLevels(page.items)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    void loadLevels()
  }, [loadLevels])

  const certifications = useMemo(
    () => snapshot?.certifications ?? [],
    [snapshot?.certifications],
  )

  if (!workspace) return null

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(level: CertificationLevelDto) {
    setEditing(level)
    setForm({
      code: level.code,
      name: level.name,
      description: level.description,
      sortOrder: level.sort_order,
      validDays: level.default_valid_days,
      isDefault: level.is_default,
    })
    setFormOpen(true)
  }

  async function submitLevel() {
    if (!form.name.trim() || (!editing && !/^[A-Z][A-Z0-9_]{0,39}$/.test(form.code.trim().toUpperCase()))) {
      toast.error('请填写名称，并使用合法的英文大写等级代码')
      return
    }
    if (form.validDays < 1 || form.validDays > 1825) {
      toast.error('默认有效期必须在 1–1825 天之间')
      return
    }
    setSubmitting(true)
    try {
      const result = editing
        ? await actOnChamberCertificationLevel(params.workspaceId, editing.id, {
          action: 'update',
          name: form.name.trim(),
          description: form.description.trim(),
          sort_order: form.sortOrder,
          default_valid_days: form.validDays,
          expected_version: editing.version,
        })
        : await createChamberCertificationLevel(params.workspaceId, {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          description: form.description.trim(),
          sort_order: form.sortOrder,
          default_valid_days: form.validDays,
          is_default: form.isDefault,
        })
      setLevels((current) => [
        result,
        ...current.filter((item) => item.id !== result.id),
      ].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name)))
      setFormOpen(false)
      toast.success(editing ? '认证等级已更新' : '认证等级已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存认证等级失败')
      await loadLevels()
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmLevelAction() {
    if (!actionTarget) return
    setSubmitting(true)
    try {
      const result = await actOnChamberCertificationLevel(
        params.workspaceId,
        actionTarget.level.id,
        {
          action: actionTarget.action,
          expected_version: actionTarget.level.version,
        },
      )
      setLevels((current) => current.map((item) => {
        if (actionTarget.action === 'set_default' && item.id !== result.id) {
          return { ...item, is_default: false }
        }
        return item.id === result.id ? result : item
      }))
      setActionTarget(null)
      toast.success(
        actionTarget.action === 'set_default'
          ? '默认认证等级已切换'
          : actionTarget.action === 'enable' ? '认证等级已启用' : '认证等级已停用',
      )
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '等级状态更新失败')
      await loadLevels()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow={workspace.kind === 'platform' ? '会员运营' : '我的商会'}
        title={workspace.kind === 'platform' ? '商会认证' : '认证等级'}
        description={workspace.kind === 'platform'
          ? '查看商会签发的企业认证；商会认证与平台企业认证相互独立。'
          : '维护商会自己的认证等级、默认有效期和启停状态，并查看已签发认证。'}
        icon={BadgeCheck}
        action={workspace.kind === 'chamber' ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              void Promise.all([loadLevels(), refreshWorkspace(workspace.id)])
            }}>
              <RefreshCcw className="h-4 w-4" />
              刷新
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建等级
            </Button>
          </div>
        ) : undefined}
      />

      {workspace.kind === 'chamber' && (
        <section className="mb-6">
          <div className="mb-3">
            <h2 className="font-display text-lg font-semibold">等级规则</h2>
            <p className="mt-1 text-sm text-muted-foreground">每个商会只能有一个启用中的默认等级。</p>
          </div>
          {loading ? (
            <QueueLoading />
          ) : error ? (
            <QueueError error={error} onRetry={() => void loadLevels()} />
          ) : levels.length === 0 ? (
            <QueueEmpty
              title="还没有认证等级"
              description="先创建等级，再为会员企业签发或续期商会认证。"
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {levels.map((level) => (
                <Card key={level.id} className={!level.is_enabled ? 'opacity-70' : undefined}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{level.name}</p>
                          <span className="rounded-full border bg-muted/40 px-2 py-0.5 font-data text-[11px]">{level.code}</span>
                          {level.is_default && <span className="rounded-full bg-ember-100 px-2 py-0.5 text-[11px] text-ember-800">默认</span>}
                          <StatusBadge status={level.is_enabled ? 'active' : 'suspended'} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{level.description || '暂无说明'}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          默认有效期 {level.default_valid_days} 天 · 排序 {level.sort_order} · 版本 {level.version}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openEdit(level)}>
                        <Pencil className="h-4 w-4" />
                        编辑
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {!level.is_default && level.is_enabled && (
                        <Button variant="outline" size="sm" onClick={() => setActionTarget({ level, action: 'set_default' })}>
                          设为默认
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionTarget({
                          level,
                          action: level.is_enabled ? 'disable' : 'enable',
                        })}
                      >
                        {level.is_enabled ? '停用' : '启用'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">已签发认证</h2>
          <p className="mt-1 text-sm text-muted-foreground">展示当前认证周期及平台认证的独立状态。</p>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
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
                        {date(item.validFrom)} 至 {date(item.validUntil)}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-4"><StatusBadge status={item.platformVerificationStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {certifications.length === 0 && (
              <div className="grid min-h-44 place-items-center text-center text-sm text-muted-foreground">
                暂无已签发认证
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑认证等级' : '新建认证等级'}</DialogTitle>
            <DialogDescription>
              等级代码创建后不可修改；已签发的历史认证周期不会被覆盖。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="level-code">等级代码</Label>
              <Input
                id="level-code"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                placeholder="GOLD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level-name">等级名称</Label>
              <Input id="level-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level-days">默认有效期（天）</Label>
              <Input
                id="level-days"
                type="number"
                min={1}
                max={1825}
                value={form.validDays}
                onChange={(event) => setForm((current) => ({ ...current, validDays: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level-sort">排序</Label>
              <Input
                id="level-sort"
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="level-description">说明</Label>
            <Textarea id="level-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          {!editing && (
            <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <Checkbox checked={form.isDefault} onCheckedChange={(checked) => setForm((current) => ({ ...current, isDefault: checked === true }))} />
              创建后设为默认等级
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void submitLevel()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === 'set_default'
                ? '切换默认认证等级'
                : actionTarget?.action === 'enable' ? '启用认证等级' : '停用认证等级'}
            </DialogTitle>
            <DialogDescription>
              将对“{actionTarget?.level.name}”执行操作。服务端会按当前版本校验并发变更。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>取消</Button>
            <Button disabled={submitting} onClick={() => void confirmLevelAction()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
