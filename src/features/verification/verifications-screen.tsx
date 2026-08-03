'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, FileCheck2, LoaderCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  getEnterpriseVerification,
  listEnterpriseVerifications,
  reviewEnterpriseVerification,
} from '@/api/client/management'
import type {
  VerificationApplicationDto,
  VerificationLevelDto,
  VerificationStatusDto,
} from '@/api/generated/huameng-platform'
import { PageHeading } from '@/components/management/page-heading'
import { DateTimeField } from '@/components/management/date-time-field'
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
import { QueueEmpty, QueueError, QueueLoading } from '@/features/governance/queue-state'

type VerificationAction = 'start_review' | 'request_more_info' | 'approve' | 'reject'

const statusOptions: Array<{ value: VerificationStatusDto | 'all'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'submitted', label: '待审核' },
  { value: 'under_review', label: '审核中' },
  { value: 'needs_more_info', label: '待补材料' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'cancelled', label: '已取消' },
]

const levelCopy: Record<VerificationLevelDto, string> = {
  L1: '主体认证',
  L2: '经营认证',
  L3: '深度认证',
}

const evidenceLabels: Record<string, string> = {
  registration_document: '主体登记文件',
  authorization_letter: '授权文件',
  financial_document: '财务材料',
  operation_document: '经营材料',
  other: '其他材料',
}

const actionCopy: Record<VerificationAction, { title: string; description: string; button: string }> = {
  start_review: {
    title: '开始审核',
    description: '接手后申请将进入审核中状态，其他审核员仍可看到最新进度。',
    button: '开始审核',
  },
  request_more_info: {
    title: '要求补充材料',
    description: '列出完成本级认证还缺少的材料，企业可按要求创建新修订。',
    button: '发送补充要求',
  },
  approve: {
    title: '通过平台认证',
    description: '认证等级和有效期会同步更新到企业平台认证状态。',
    button: '确认通过',
  },
  reject: {
    title: '拒绝平台认证',
    description: '说明无法通过核验的具体原因，企业可修正后重新提交。',
    button: '确认拒绝',
  },
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function levelRail(level: VerificationLevelDto) {
  const levels: VerificationLevelDto[] = ['L1', 'L2', 'L3']
  return (
    <div className="flex items-center gap-1" aria-label={`申请等级 ${level}`}>
      {levels.map((item) => (
        <span
          key={item}
          className={`grid h-7 min-w-9 place-items-center rounded-md border px-2 font-data text-[11px] font-semibold ${
            item === level
              ? 'border-ember-300 bg-ember-50 text-ember-700'
              : 'border-border bg-muted/20 text-muted-foreground/55'
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export function VerificationsScreen() {
  const [status, setStatus] = useState<VerificationStatusDto | 'all'>('submitted')
  const [items, setItems] = useState<VerificationApplicationDto[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<VerificationApplicationDto | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [action, setAction] = useState<VerificationAction | null>(null)
  const [reason, setReason] = useState('')
  const [requiredItems, setRequiredItems] = useState('')
  const [approvedLevel, setApprovedLevel] = useState<VerificationLevelDto>('L1')
  const [validUntil, setValidUntil] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (cursor?: string | null) => {
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listEnterpriseVerifications({ status, cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.page.next_cursor ?? null)
    } catch (nextError) {
      if (!append) setError(nextError)
      else toast.error(nextError instanceof Error ? nextError.message : '无法加载更多认证申请')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function openDetail(item: VerificationApplicationDto) {
    setSelected(item)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      setSelected(await getEnterpriseVerification(item.id))
    } catch (nextError) {
      setDetailOpen(false)
      setSelected(null)
      toast.error(nextError instanceof Error ? nextError.message : '无法读取认证详情')
    } finally {
      setDetailLoading(false)
    }
  }

  function beginAction(nextAction: VerificationAction) {
    setDetailOpen(false)
    setAction(nextAction)
    setReason('')
    setRequiredItems('')
    setApprovedLevel(selected?.requested_level ?? 'L1')
    setValidUntil('')
  }

  async function submitAction() {
    if (!selected || !action) return
    const normalizedReason = reason.trim()
    const normalizedItems = requiredItems
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (action === 'request_more_info' && normalizedItems.length === 0) {
      toast.error('请至少填写一项需要补充的材料')
      return
    }
    if ((action === 'approve' || action === 'reject') && !normalizedReason) {
      toast.error('请填写审核理由')
      return
    }

    let validUntilIso: string | null = null
    if (action === 'approve' && validUntil) {
      const date = new Date(validUntil)
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        toast.error('认证有效期必须晚于当前时间')
        return
      }
      validUntilIso = date.toISOString()
    }

    setSubmitting(true)
    try {
      const result = await reviewEnterpriseVerification(
        selected.id,
        action === 'start_review'
          ? { action }
          : action === 'request_more_info'
            ? { action, required_items: normalizedItems, note: normalizedReason || undefined }
            : action === 'approve'
              ? {
                action,
                approved_level: approvedLevel,
                decision_reason: normalizedReason,
                valid_until: validUntilIso,
              }
              : { action, reason: normalizedReason },
      )
      setSelected(result)
      setItems((current) => current.map((item) => item.id === result.id ? result : item))
      setAction(null)
      toast.success(
        action === 'start_review'
          ? '认证申请已进入审核'
          : action === 'approve'
            ? '平台认证已通过'
            : action === 'reject'
              ? '平台认证已拒绝'
              : '补充要求已发送',
      )
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '认证审核操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="审核与治理"
        title="平台认证"
        description="审核企业 L1–L3 平台认证。认领状态和商会认证不会替代本流程。"
        icon={BadgeCheck}
        action={
          <Select value={status} onValueChange={(value) => setStatus(value as VerificationStatusDto | 'all')}>
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
          title="当前没有需要处理的平台认证"
          description="企业提交平台认证后，会按等待时间显示在这里。"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden transition-colors hover:border-ember-200">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ember-100 bg-ember-50 text-ember-700">
                    <BadgeCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{item.enterprise.display_name}</p>
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">第 {item.revision} 次提交</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{item.enterprise.legal_name}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {levelRail(item.requested_level)}
                      <span className="text-xs text-muted-foreground">
                        {item.enterprise.country_code} · {item.evidence.length} 份材料 · {dateTime(item.submitted_at)}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => void openDetail(item)}>
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
        <DialogContent className="max-h-[86vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.enterprise.display_name}</DialogTitle>
                <DialogDescription>
                  {selected.enterprise.legal_name} · 第 {selected.revision} 次提交
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-lg border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">申请等级</p>
                  <div className="mt-2">{levelRail(selected.requested_level)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{levelCopy[selected.requested_level]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">当前状态</p>
                  <div className="mt-2"><StatusBadge status={selected.status} /></div>
                </div>
                <p><span className="text-muted-foreground">国家或地区：</span>{selected.enterprise.country_code}</p>
                <p><span className="text-muted-foreground">申请账号：</span>{selected.applicant_account_id}</p>
              </div>

              {selected.statement && (
                <div>
                  <h3 className="text-sm font-semibold">申请说明</h3>
                  <p className="mt-2 rounded-lg border p-4 text-sm leading-6 text-muted-foreground">
                    {selected.statement}
                  </p>
                </div>
              )}

              {(selected.required_items?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/45 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">待补材料</h3>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900/80">
                    {selected.required_items?.map((item) => <li key={item}>· {item}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold">认证材料</h3>
                <div className="mt-2 space-y-2">
                  {selected.evidence.map((evidence) => (
                    <div key={evidence.id} className="flex items-start justify-between gap-4 rounded-lg border px-3 py-3 text-sm">
                      <span className="inline-flex min-w-0 items-start gap-2">
                        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>
                          <span className="block font-medium">{evidenceLabels[evidence.type] ?? evidence.type}</span>
                          {evidence.note && (
                            <span className="mt-1 block text-xs text-muted-foreground">{evidence.note}</span>
                          )}
                        </span>
                      </span>
                      <StatusBadge status={evidence.status} />
                    </div>
                  ))}
                  {selected.evidence.length === 0 && (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      暂无可查看的认证材料。
                    </p>
                  )}
                </div>
              </div>

              {selected.reviewer_note && (
                <p className="rounded-lg border bg-muted/20 p-4 text-sm">
                  <span className="font-medium">审核记录：</span>{selected.reviewer_note}
                </p>
              )}

              {detailLoading && <p className="text-xs text-muted-foreground">正在更新认证详情…</p>}

              {['submitted', 'under_review'].includes(selected.status) && (
                <DialogFooter className="sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {selected.status === 'submitted' && (
                      <Button variant="outline" onClick={() => beginAction('start_review')}>
                        开始审核
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => beginAction('request_more_info')}>补充材料</Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => beginAction('reject')}>拒绝</Button>
                    <Button onClick={() => beginAction('approve')}>
                      <ShieldCheck className="h-4 w-4" />
                      通过认证
                    </Button>
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
                  <Label htmlFor="verification-required-items">需要补充的材料</Label>
                  <Input
                    id="verification-required-items"
                    value={requiredItems}
                    onChange={(event) => setRequiredItems(event.target.value)}
                    placeholder="例如：最近一期经营证明、盖章授权书"
                  />
                  <p className="text-xs text-muted-foreground">多项材料可用逗号分隔。</p>
                </div>
              )}

              {action === 'approve' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>批准等级</Label>
                    <Select value={approvedLevel} onValueChange={(value) => setApprovedLevel(value as VerificationLevelDto)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['L1', 'L2', 'L3'] as const).map((level) => (
                          <SelectItem key={level} value={level}>{level} · {levelCopy[level]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verification-valid-until">认证有效期</Label>
                    <DateTimeField
                      id="verification-valid-until"
                      type="datetime-local"
                      value={validUntil}
                      onValueChange={setValidUntil}
                    />
                    <p className="text-xs text-muted-foreground">可不填写，由服务端按规则处理。</p>
                  </div>
                </div>
              )}

              {action !== 'start_review' && (
                <div className="space-y-2">
                  <Label htmlFor="verification-reason">
                    {action === 'request_more_info' ? '给企业的说明' : '审核理由'}
                  </Label>
                  <Textarea
                    id="verification-reason"
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
