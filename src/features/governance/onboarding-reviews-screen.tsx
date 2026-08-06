'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, CheckCircle2, LoaderCircle, Search, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { CurrentChamberEnterpriseDto } from '@/api/generated/huameng'
import {
  auditPlatformEnterprise,
  listPlatformEnterprises,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { QueueEmpty, QueueError, QueueLoading } from '@/features/governance/queue-state'

type AuditStatus = CurrentChamberEnterpriseDto['audit_status']

const auditStatusLabels: Record<AuditStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已打回',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function OnboardingReviewsScreen() {
  const [items, setItems] = useState<CurrentChamberEnterpriseDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [auditStatus, setAuditStatus] = useState<AuditStatus | 'all'>('pending')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [detail, setDetail] = useState<CurrentChamberEnterpriseDto | null>(null)
  const [target, setTarget] = useState<CurrentChamberEnterpriseDto | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const size = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listPlatformEnterprises({
        auditStatus: auditStatus === 'all' ? undefined : auditStatus,
        keyword,
        page,
        size,
      })
      setItems(result.list)
      setTotal(result.total)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [auditStatus, keyword, page])

  useEffect(() => {
    void load()
  }, [load])

  function openReview(item: CurrentChamberEnterpriseDto, nextDecision: 'approve' | 'reject') {
    setTarget(item)
    setDecision(nextDecision)
    setRemark('')
  }

  async function submitReview() {
    if (!target) return
    if (decision === 'reject' && !remark.trim()) {
      toast.error('打回时必须填写原因')
      return
    }
    setSaving(true)
    try {
      await auditPlatformEnterprise(target.enterprise_id, {
        approved: decision === 'approve',
        remark,
        expectedVersion: target.version,
      })
      setTarget(null)
      toast.success(decision === 'approve' ? '入驻申请已通过' : '入驻申请已打回')
      await load()
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '入驻审核失败')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const detailRows: Array<[string, string | null]> = detail ? [
    ['企业名称', detail.name],
    ['注册国家 / 地区', detail.country_code],
    ['统一社会信用代码', detail.declared_credit_code],
    ['法定代表人', detail.legal_person],
    ['联系人', detail.contact_name],
    ['联系电话', detail.contact_phone],
    ['联系邮箱', detail.contact_email],
    ['企业地址', detail.address],
    ['主营业务', detail.main_business],
    ['企业简介', detail.description],
    ['最近审核时间', formatDateTime(detail.audited_at)],
    ['最近审核意见', detail.audit_remark],
  ] : []

  return (
    <div>
      <PageHeading
        eyebrow="审核与治理"
        title="入驻审核"
        description="审核企业入驻申请；通过后企业进入公开名录并解锁工作台业务功能，打回原因会展示在企业工作台。"
        icon={Building2}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(240px,1fr)_160px_auto]">
          <Input
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              setPage(1)
              setKeyword(keywordDraft.trim())
              if (keyword === keywordDraft.trim()) void load()
            }}
            placeholder="搜索企业名称"
          />
          <Select
            value={auditStatus}
            onValueChange={(value) => { setAuditStatus(value as typeof auditStatus); setPage(1) }}
          >
            <SelectTrigger aria-label="入驻状态"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="rejected">已打回</SelectItem>
              <SelectItem value="all">全部状态</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPage(1)
                setKeyword(keywordDraft.trim())
                if (keyword === keywordDraft.trim()) void load()
              }}
            ><Search className="h-4 w-4" />查询</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setKeywordDraft('')
                setKeyword('')
                setAuditStatus('pending')
                setPage(1)
              }}
            >重置</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <QueueLoading /> : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty title="当前没有待处理的入驻申请" description="企业提交入驻申请后会进入这里。" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">企业</th>
                    <th className="px-4 py-3 font-medium">联系方式</th>
                    <th className="px-4 py-3 font-medium">主营业务</th>
                    <th className="px-4 py-3 font-medium">入驻状态</th>
                    <th className="px-4 py-3 font-medium">申请 / 更新时间</th>
                    <th className="w-[240px] px-5 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.enterprise_id} className="align-top transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.country_code}{item.declared_credit_code ? ` · ${item.declared_credit_code}` : ''}
                        </p>
                        {item.audit_status === 'rejected' && item.audit_remark ? (
                          <p className="mt-2 text-xs text-red-600">打回原因：{item.audit_remark}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <p>{item.contact_name?.trim() || '—'}</p>
                        <p className="mt-1">{item.contact_phone?.trim() || '—'}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-4">
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.main_business?.trim() || item.description?.trim() || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.audit_status} label={auditStatusLabels[item.audit_status]} />
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(item.updated_at)}</td>
                      <td className="w-[240px] px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setDetail(item)}>详情</Button>
                          {item.audit_status === 'pending' ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openReview(item, 'reject')}>
                                <XCircle className="h-4 w-4" />打回
                              </Button>
                              <Button size="sm" onClick={() => openReview(item, 'approve')}>
                                <CheckCircle2 className="h-4 w-4" />通过
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
              <span>共 {total} 条，第 {page} / {Math.max(1, Math.ceil(total / size))} 页</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * size >= total} onClick={() => setPage((value) => value + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>企业入驻资料</DialogTitle>
            <DialogDescription>{detail ? detail.name : ''}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div key={label} className={label === '企业简介' || label === '主营业务' ? 'sm:col-span-2' : undefined}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{value?.trim() || '—'}</p>
              </div>
            ))}
          </div>
          {detail?.audit_status === 'pending' ? (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  openReview(detail, 'reject')
                  setDetail(null)
                }}
              ><XCircle className="h-4 w-4" />打回</Button>
              <Button
                onClick={() => {
                  openReview(detail, 'approve')
                  setDetail(null)
                }}
              ><CheckCircle2 className="h-4 w-4" />通过</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === 'approve' ? '通过入驻申请' : '打回入驻申请'}</DialogTitle>
            <DialogDescription>
              {target
                ? decision === 'approve'
                  ? `通过后「${target.name}」将进入公开企业名录并解锁工作台业务功能。`
                  : `打回后「${target.name}」需修改资料重新提交，打回原因会展示在企业工作台。`
                : '确认本次审核结论。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="onboarding-review-remark">审核意见{decision === 'reject' ? '（必填）' : '（选填）'}</Label>
            <Textarea
              id="onboarding-review-remark"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              maxLength={1000}
              placeholder={decision === 'reject' ? '请说明打回原因及需要补充修改的内容' : '可填写审核备注'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>取消</Button>
            <Button
              variant={decision === 'reject' ? 'destructive' : 'default'}
              disabled={saving || (decision === 'reject' && !remark.trim())}
              onClick={() => void submitReview()}
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {decision === 'approve' ? '确认通过' : '确认打回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
