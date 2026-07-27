'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, FileCheck2, LoaderCircle, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  getAdminClaim,
  listAdminClaims,
  ManagementApiError,
  reviewAdminClaim,
} from '@/api/client/management'
import type {
  ClaimStatusDto,
  EnterpriseClaimDto,
} from '@/api/generated/huameng-platform'
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

type ClaimAction = 'approve' | 'request_more_info' | 'reject' | 'confirm_approval'

const statusOptions: Array<{ value: ClaimStatusDto | 'all'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'submitted', label: '待审核' },
  { value: 'needs_more_info', label: '待补材料' },
  { value: 'under_review', label: '审核中' },
  { value: 'pending_second_review', label: '待二次复核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'cancelled', label: '已取消' },
]

const actionCopy: Record<ClaimAction, { title: string; description: string; button: string }> = {
  approve: {
    title: '通过认领申请',
    description: '确认材料与企业主体一致后提交审核结论。',
    button: '确认通过',
  },
  request_more_info: {
    title: '要求补充材料',
    description: '明确列出申请人需要补充的材料，便于继续审核。',
    button: '发送补充要求',
  },
  reject: {
    title: '拒绝认领申请',
    description: '填写清晰、可理解的拒绝原因。',
    button: '确认拒绝',
  },
  confirm_approval: {
    title: '完成二次复核',
    description: '高风险申请需要另一位审核员完成手机号确认后才能通过。',
    button: '确认复核通过',
  },
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const riskLabels = { low: '低风险', medium: '中风险', high: '高风险' } as const

export function ClaimsScreen() {
  const [status, setStatus] = useState<ClaimStatusDto | 'all'>('submitted')
  const [items, setItems] = useState<EnterpriseClaimDto[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<EnterpriseClaimDto | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [action, setAction] = useState<ClaimAction | null>(null)
  const [reason, setReason] = useState('')
  const [requiredItems, setRequiredItems] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (cursor?: string | null) => {
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listAdminClaims({ status, cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.page.next_cursor ?? null)
    } catch (nextError) {
      if (!append) setError(nextError)
      else toast.error(nextError instanceof Error ? nextError.message : '无法加载更多申请')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function openClaim(item: EnterpriseClaimDto) {
    setSelected(item)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      setSelected(await getAdminClaim(item.id))
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '无法加载申请详情')
    } finally {
      setDetailLoading(false)
    }
  }

  function beginAction(nextAction: ClaimAction) {
    setDetailOpen(false)
    setAction(nextAction)
    setReason('')
    setRequiredItems('')
    setConfirmationToken('')
  }

  async function submitAction() {
    if (!selected || !action) return
    const normalizedReason = reason.trim()
    const normalizedItems = requiredItems
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)

    if ((action === 'approve' || action === 'reject') && !normalizedReason) {
      toast.error('请填写审核理由')
      return
    }
    if (action === 'request_more_info' && normalizedItems.length === 0) {
      toast.error('请至少填写一项需要补充的材料')
      return
    }
    if (action === 'confirm_approval' && confirmationToken.trim().length < 16) {
      toast.error('请输入有效的确认凭证')
      return
    }

    setSubmitting(true)
    try {
      const result = await reviewAdminClaim(
        selected.id,
        action === 'approve'
          ? { action, decision_reason: normalizedReason }
          : action === 'reject'
            ? { action, reason: normalizedReason }
            : action === 'request_more_info'
              ? { action, required_items: normalizedItems, note: normalizedReason || undefined }
              : { action, confirmation_token: confirmationToken.trim() },
      )
      setSelected(result.claim)
      setItems((current) => current.map((item) => item.id === result.claim.id ? result.claim : item))
      setAction(null)
      toast.success('审核结果已保存')
    } catch (nextError) {
      if (nextError instanceof ManagementApiError && nextError.status === 428) {
        beginAction('confirm_approval')
        toast.info('该申请需要另一位审核员完成二次确认')
      } else {
        toast.error(nextError instanceof Error ? nextError.message : '审核操作失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="审核与治理"
        title="认领审核"
        description="按提交时间处理企业认领申请，先审核等待时间最长的事项。"
        icon={ClipboardCheck}
        action={
          <Select value={status} onValueChange={(value) => setStatus(value as ClaimStatusDto | 'all')}>
            <SelectTrigger className="w-44 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
          title="当前没有需要处理的认领申请"
          description="新的企业认领申请提交后，会按等待时间显示在这里。"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden transition-colors hover:border-ember-200">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <span className={`h-12 w-1 shrink-0 rounded-full ${
                    item.risk_level === 'high' ? 'bg-red-500'
                      : item.risk_level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">企业认领申请</p>
                      <StatusBadge status={item.status} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {riskLabels[item.risk_level]}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-data text-xs text-muted-foreground">
                      企业 {item.enterprise_id}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span>提交于 {dateTime(item.created_at)}</span>
                      <span>{item.evidence?.length ?? 0} 份材料</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => void openClaim(item)}>
                    查看并审核
                  </Button>
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
                <DialogTitle>认领申请详情</DialogTitle>
                <DialogDescription>
                  提交于 {dateTime(selected.created_at)} · {riskLabels[selected.risk_level]}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 rounded-lg border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">企业主体：</span>{selected.enterprise_id}</p>
                <p><span className="text-muted-foreground">申请账号：</span>{selected.claimant_account_id}</p>
                <p><span className="text-muted-foreground">当前状态：</span><StatusBadge status={selected.status} /></p>
                <p><span className="text-muted-foreground">材料数量：</span>{selected.evidence?.length ?? 0}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">材料核验状态</h3>
                <div className="mt-2 space-y-2">
                  {(selected.evidence ?? []).map((evidence) => (
                    <div key={evidence.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                        {evidence.type}
                      </span>
                      <StatusBadge status={evidence.status} />
                    </div>
                  ))}
                  {!selected.evidence?.length && (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      申请人尚未提交可查看的材料。
                    </p>
                  )}
                </div>
              </div>
              {detailLoading && <p className="text-xs text-muted-foreground">正在更新详情…</p>}
              {!['approved', 'rejected', 'cancelled'].includes(selected.status) && (
                <DialogFooter className="sm:justify-between">
                  <Button variant="ghost" onClick={() => beginAction('request_more_info')}>补充材料</Button>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => beginAction('reject')}>拒绝</Button>
                    {selected.status === 'pending_second_review' ? (
                      <Button onClick={() => beginAction('confirm_approval')}>
                        <ShieldAlert className="h-4 w-4" />
                        二次复核
                      </Button>
                    ) : (
                      <Button onClick={() => beginAction('approve')}>通过申请</Button>
                    )}
                  </div>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>{actionCopy[action].title}</DialogTitle>
                <DialogDescription>{actionCopy[action].description}</DialogDescription>
              </DialogHeader>
              {action === 'request_more_info' && (
                <div className="space-y-2">
                  <Label htmlFor="required-items">需要补充的材料</Label>
                  <Input
                    id="required-items"
                    value={requiredItems}
                    onChange={(event) => setRequiredItems(event.target.value)}
                    placeholder="例如：盖章授权书、工商变更证明"
                  />
                  <p className="text-xs text-muted-foreground">多项材料可用逗号分隔。</p>
                </div>
              )}
              {action === 'confirm_approval' ? (
                <div className="space-y-2">
                  <Label htmlFor="confirmation-token">手机号确认凭证</Label>
                  <Input
                    id="confirmation-token"
                    value={confirmationToken}
                    onChange={(event) => setConfirmationToken(event.target.value)}
                    placeholder="完成手机号确认后粘贴凭证"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="review-reason">
                    {action === 'request_more_info' ? '给申请人的说明' : '审核理由'}
                  </Label>
                  <Textarea
                    id="review-reason"
                    rows={4}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="说明核验依据和处理原因"
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAction(null)}>取消</Button>
                <Button
                  disabled={submitting}
                  variant={action === 'reject' ? 'destructive' : 'default'}
                  onClick={() => void submitAction()}
                >
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {actionCopy[action].button}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
