'use client'

import { useCallback, useEffect, useState } from 'react'
import { GitCompareArrows, LoaderCircle, Merge } from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnEnterpriseDuplicate,
  listEnterpriseDuplicates,
} from '@/api/client/management'
import type { DuplicateCaseDto } from '@/api/generated/huameng-platform'
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
import { Textarea } from '@/components/ui/textarea'
import { QueueEmpty, QueueError, QueueLoading } from './queue-state'

type DuplicateAction = 'ignore' | 'confirm_duplicate' | 'merge'

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function DuplicatesScreen() {
  const [items, setItems] = useState<DuplicateCaseDto[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<DuplicateCaseDto | null>(null)
  const [action, setAction] = useState<DuplicateAction | null>(null)
  const [reason, setReason] = useState('')
  const [survivorId, setSurvivorId] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (cursor?: string | null) => {
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listEnterpriseDuplicates({ cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.page.next_cursor ?? null)
    } catch (nextError) {
      if (!append) setError(nextError)
      else toast.error(nextError instanceof Error ? nextError.message : '无法加载更多重复企业')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function beginAction(item: DuplicateCaseDto, nextAction: DuplicateAction) {
    setSelected(item)
    setAction(nextAction)
    setReason('')
    setSurvivorId(item.source_enterprise_id)
    setConfirmationToken('')
  }

  async function submitAction() {
    if (!selected || !action) return
    if (action !== 'merge' && !reason.trim()) {
      toast.error('请填写处置原因')
      return
    }
    if (action === 'merge' && (!survivorId.trim() || confirmationToken.trim().length < 16)) {
      toast.error('请选择保留主体并填写有效的确认凭证')
      return
    }

    setSubmitting(true)
    try {
      const result = await actOnEnterpriseDuplicate(
        selected.id,
        action === 'ignore'
          ? { action, reason: reason.trim() }
          : action === 'confirm_duplicate'
            ? { action, reason: reason.trim() }
            : {
              action,
              survivor_enterprise_id: survivorId.trim(),
              confirmation_token: confirmationToken.trim(),
            },
      )
      setItems((current) => current.map((item) => item.id === result.id ? result : item))
      setAction(null)
      setSelected(null)
      toast.success('重复企业处置结果已保存')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '处置失败')
    } finally {
      setSubmitting(false)
    }
  }

  const actionTitle = action === 'ignore'
    ? '忽略重复提示'
    : action === 'confirm_duplicate' ? '确认重复企业' : '合并企业主体'

  return (
    <div>
      <PageHeading
        eyebrow="审核与治理"
        title="重复企业"
        description="优先核查风险分数较高的主体，名称或域名相似不会自动触发合并。"
        icon={GitCompareArrows}
      />

      {loading ? (
        <QueueLoading />
      ) : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty
          title="当前没有待核查的重复企业"
          description="系统发现新的重复候选后，会按照风险分数从高到低显示。"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border bg-muted/30">
                    <div className="text-center">
                      <p className="font-data text-lg font-semibold">{Math.round(item.risk_score * 100)}</p>
                      <p className="text-[10px] text-muted-foreground">风险分</p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">疑似重复企业主体</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-2 grid gap-1 font-data text-xs text-muted-foreground sm:grid-cols-2">
                      <p className="truncate">主体 A：{item.source_enterprise_id}</p>
                      <p className="truncate">主体 B：{item.candidate_enterprise_id}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">发现于 {dateTime(item.created_at)}</p>
                  </div>
                  {item.status === 'open' && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => beginAction(item, 'ignore')}>忽略</Button>
                      <Button variant="outline" onClick={() => beginAction(item, 'confirm_duplicate')}>确认重复</Button>
                      <Button onClick={() => beginAction(item, 'merge')}>
                        <Merge className="h-4 w-4" />
                        合并主体
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" disabled={loadingMore} onClick={() => void load(nextCursor)}>
                {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}
                加载更多
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription>
              {action === 'merge'
                ? '合并后，被合并主体不再作为独立主体使用。请明确选择保留主体。'
                : '处置原因会进入操作记录，便于后续复核。'}
            </DialogDescription>
          </DialogHeader>
          {action === 'merge' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="survivor-enterprise">保留的企业主体</Label>
                <Input
                  id="survivor-enterprise"
                  value={survivorId}
                  onChange={(event) => setSurvivorId(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  可选：{selected?.source_enterprise_id} 或 {selected?.candidate_enterprise_id}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duplicate-confirmation">手机号确认凭证</Label>
                <Input
                  id="duplicate-confirmation"
                  value={confirmationToken}
                  onChange={(event) => setConfirmationToken(event.target.value)}
                  placeholder="完成手机号确认后粘贴凭证"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="duplicate-reason">处置原因</Label>
              <Textarea
                id="duplicate-reason"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="说明判断依据"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>取消</Button>
            <Button disabled={submitting} onClick={() => void submitAction()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存处置结果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
