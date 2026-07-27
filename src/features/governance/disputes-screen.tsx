'use client'

import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Scale } from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnOwnershipDispute,
  getOwnershipDispute,
  listOwnershipDisputes,
} from '@/api/client/management'
import type { OwnershipDisputeDto } from '@/api/generated/huameng-platform'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { QueueEmpty, QueueError, QueueLoading } from './queue-state'

type DisputeAction = 'request_more_info' | 'reject' | 'resolve'

const statusOptions = [
  ['all', '全部状态'],
  ['submitted', '待处理'],
  ['needs_more_info', '待补材料'],
  ['under_review', '处理中'],
  ['approved', '已解决'],
  ['rejected', '已拒绝'],
  ['cancelled', '已取消'],
] as const

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function DisputesScreen() {
  const [status, setStatus] = useState('submitted')
  const [items, setItems] = useState<OwnershipDisputeDto[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<OwnershipDisputeDto | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [action, setAction] = useState<DisputeAction | null>(null)
  const [reason, setReason] = useState('')
  const [requiredItems, setRequiredItems] = useState('')
  const [ownerIds, setOwnerIds] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (cursor?: string | null) => {
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listOwnershipDisputes({ status, cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.page.next_cursor ?? null)
    } catch (nextError) {
      if (!append) setError(nextError)
      else toast.error(nextError instanceof Error ? nextError.message : '无法加载更多争议')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function openDetail(item: OwnershipDisputeDto) {
    setSelected(item)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      setSelected(await getOwnershipDispute(item.id))
    } catch (nextError) {
      setDetailOpen(false)
      setSelected(null)
      toast.error(nextError instanceof Error ? nextError.message : '无法加载争议详情')
    } finally {
      setDetailLoading(false)
    }
  }

  function beginAction(nextAction: DisputeAction) {
    setDetailOpen(false)
    setAction(nextAction)
    setReason('')
    setRequiredItems('')
    setOwnerIds('')
    setConfirmationToken('')
  }

  async function submitAction() {
    if (!selected || !action) return
    const normalizedItems = requiredItems
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
    const normalizedOwners = ownerIds
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (action === 'request_more_info' && normalizedItems.length === 0) {
      toast.error('请至少填写一项需要补充的材料')
      return
    }
    if (action === 'reject' && !reason.trim()) {
      toast.error('请填写拒绝原因')
      return
    }
    if (
      action === 'resolve'
      && (!reason.trim() || normalizedOwners.length === 0 || confirmationToken.trim().length < 16)
    ) {
      toast.error('请填写解决方案、owner 账号和有效的确认凭证')
      return
    }

    setSubmitting(true)
    try {
      const result = await actOnOwnershipDispute(
        selected.id,
        action === 'request_more_info'
          ? { action, required_items: normalizedItems, note: reason.trim() || undefined }
          : action === 'reject'
            ? { action, reason: reason.trim() }
            : {
              action,
              resolution: reason.trim(),
              owner_account_ids: normalizedOwners,
              confirmation_token: confirmationToken.trim(),
            },
      )
      setSelected(result)
      setItems((current) => current.map((item) => item.id === result.id ? result : item))
      setAction(null)
      toast.success('争议处理结果已保存')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '争议处理失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="审核与治理"
        title="所有权争议"
        description="核验企业控制权变化，在证据完整前不会自动撤销现有 owner。"
        icon={Scale}
        action={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <QueueLoading />
      ) : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty
          title="当前没有需要处理的所有权争议"
          description="企业提交控制权争议后，会按照受理时间显示在这里。"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="transition-colors hover:border-ember-200">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-muted/30 text-muted-foreground">
                  <Scale className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">企业所有权争议</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-data text-xs text-muted-foreground">
                    <span>企业 {item.enterprise_id}</span>
                    <span>受理于 {dateTime(item.created_at)}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => void openDetail(item)}>查看并处理</Button>
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

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open && !action) setSelected(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>所有权争议详情</DialogTitle>
                <DialogDescription>受理于 {dateTime(selected.created_at)}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 rounded-lg border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">企业主体：</span>{selected.enterprise_id}</p>
                <p><span className="text-muted-foreground">申请账号：</span>{selected.claimant_account_id}</p>
                <p><span className="text-muted-foreground">当前状态：</span><StatusBadge status={selected.status} /></p>
                <p><span className="text-muted-foreground">更新时间：</span>{dateTime(selected.updated_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">争议说明</h3>
                <p className="mt-2 rounded-lg border p-4 text-sm leading-6 text-muted-foreground">{selected.reason}</p>
              </div>
              {selected.resolution && (
                <div>
                  <h3 className="text-sm font-semibold">处理结论</h3>
                  <p className="mt-2 rounded-lg border p-4 text-sm leading-6">{selected.resolution}</p>
                </div>
              )}
              {detailLoading && <p className="text-xs text-muted-foreground">正在更新详情…</p>}
              {!['approved', 'rejected', 'cancelled'].includes(selected.status) && (
                <DialogFooter className="sm:justify-between">
                  <Button variant="ghost" onClick={() => beginAction('request_more_info')}>补充材料</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => beginAction('reject')}>拒绝</Button>
                    <Button onClick={() => beginAction('resolve')}>解决争议</Button>
                  </div>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'request_more_info' ? '要求补充材料' : action === 'reject' ? '拒绝争议申请' : '解决所有权争议'}
            </DialogTitle>
            <DialogDescription>
              {action === 'resolve'
                ? 'owner 变化需要手机号确认，提交后将由服务端原子更新权限。'
                : '处理说明会提供给申请人并进入操作记录。'}
            </DialogDescription>
          </DialogHeader>
          {action === 'request_more_info' && (
            <div className="space-y-2">
              <Label htmlFor="dispute-required-items">需要补充的材料</Label>
              <Input
                id="dispute-required-items"
                value={requiredItems}
                onChange={(event) => setRequiredItems(event.target.value)}
                placeholder="例如：工商变更证明、授权书"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="dispute-reason">
              {action === 'resolve' ? '解决方案' : action === 'reject' ? '拒绝原因' : '给申请人的说明'}
            </Label>
            <Textarea
              id="dispute-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="说明核验依据和处理结果"
            />
          </div>
          {action === 'resolve' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="owner-accounts">确认后的 owner 账号</Label>
                <Input
                  id="owner-accounts"
                  value={ownerIds}
                  onChange={(event) => setOwnerIds(event.target.value)}
                  placeholder="acc_xxx，多位账号用逗号分隔"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispute-confirmation">手机号确认凭证</Label>
                <Input
                  id="dispute-confirmation"
                  value={confirmationToken}
                  onChange={(event) => setConfirmationToken(event.target.value)}
                  placeholder="完成手机号确认后粘贴凭证"
                />
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>取消</Button>
            <Button
              disabled={submitting}
              variant={action === 'reject' ? 'destructive' : 'default'}
              onClick={() => void submitAction()}
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存处理结果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
