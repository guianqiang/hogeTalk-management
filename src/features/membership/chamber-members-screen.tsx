'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { BadgeCheck, Building2, LoaderCircle, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createCurrentChamberLevel,
  deleteCurrentChamberLevel,
  listCurrentChamberLevels,
  updateCurrentChamberLevel,
  type CurrentChamberLevelDto,
} from '@/api/client/management'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { QueueEmpty, QueueError, QueueLoading } from '@/features/governance/queue-state'
import { useManagement } from '@/lib/management'

function date(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}

type LevelForm = {
  name: string
  sortOrder: number
}

const emptyForm: LevelForm = {
  name: '',
  sortOrder: 0,
}

export function ChamberMembersScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces, workspaceData, refreshWorkspace } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const snapshot = workspaceData[params.workspaceId]
  const [levels, setLevels] = useState<CurrentChamberLevelDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CurrentChamberLevelDto | null>(null)
  const [form, setForm] = useState<LevelForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<CurrentChamberLevelDto | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadLevels = useCallback(async () => {
    if (!workspace || workspace.kind !== 'chamber') {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await listCurrentChamberLevels()
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

  function openEdit(level: CurrentChamberLevelDto) {
    setEditing(level)
    setForm({
      name: level.name,
      sortOrder: level.sort,
    })
    setFormOpen(true)
  }

  async function submitLevel() {
    if (!form.name.trim()) {
      toast.error('请填写等级名称')
      return
    }
    setSubmitting(true)
    try {
      const result = editing
        ? await updateCurrentChamberLevel(editing.id, {
          name: form.name.trim(),
          sort: form.sortOrder,
        })
        : await createCurrentChamberLevel({
          name: form.name.trim(),
          sort: form.sortOrder,
        })
      setLevels((current) => [
        result,
        ...current.filter((item) => item.id !== result.id),
      ].sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name)))
      setFormOpen(false)
      toast.success(editing ? '认证等级已更新' : '认证等级已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存认证等级失败')
      await loadLevels()
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDeleteLevel() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteCurrentChamberLevel(deleteTarget.id)
      setLevels((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('认证等级已删除')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '认证等级删除失败')
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
          : '维护商会自己的会员等级；每家会员单位的有效期在会员单位编辑中单独设置。'}
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
            <p className="mt-1 text-sm text-muted-foreground">按排序值从小到大展示，可用于会员单位分级。</p>
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
                <Card key={level.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{level.name}</p>
                        <p className="mt-2 text-sm text-muted-foreground">排序 {level.sort}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(level)}>
                          <Pencil className="h-4 w-4" />编辑
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-700 hover:text-red-700" onClick={() => setDeleteTarget(level)}>
                          <Trash2 className="h-4 w-4" />删除
                        </Button>
                      </div>
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
              等级名称用于会员单位管理；有效期按每家会员单位单独设置。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="level-name">等级名称</Label>
              <Input id="level-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void submitLevel()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除认证等级</DialogTitle>
            <DialogDescription>
              确认删除“{deleteTarget?.name}”？正在被会员单位使用的等级不能删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" disabled={submitting} onClick={() => void confirmDeleteLevel()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
