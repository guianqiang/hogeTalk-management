'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle, Search, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  listManagementSupplyDemands,
  reviewManagementSupplyDemand,
  type SupplyDemandDto,
} from '@/api/client/enterprise-workspace'
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

const statusLabels: Record<SupplyDemandDto['status'], string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
  withdrawn: '已撤回',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function SupplyDemandReviewsScreen() {
  const [items, setItems] = useState<SupplyDemandDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<SupplyDemandDto['status'] | 'all'>('pending')
  const [type, setType] = useState<SupplyDemandDto['type'] | 'all'>('all')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [target, setTarget] = useState<SupplyDemandDto | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const size = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listManagementSupplyDemands({
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
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
  }, [keyword, page, status, type])

  useEffect(() => {
    void load()
  }, [load])

  function openReview(item: SupplyDemandDto, nextDecision: 'approve' | 'reject') {
    setTarget(item)
    setDecision(nextDecision)
    setNote('')
  }

  async function submitReview() {
    if (!target) return
    if (decision === 'reject' && !note.trim()) {
      toast.error('驳回时必须填写审核意见')
      return
    }
    setSaving(true)
    try {
      await reviewManagementSupplyDemand(
        target.id,
        decision,
        target.version,
        note,
      )
      setTarget(null)
      toast.success(decision === 'approve' ? '供需已审核通过并发布' : '供需已驳回')
      await load()
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '供需审核失败')
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="组织与撮合"
        title="供需审核"
        description="审核企业提交的供给和需求；通过后立即进入网站公开供需列表，驳回意见返回企业工作台。"
        icon={ShieldCheck}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(240px,1fr)_160px_160px_auto]">
          <Input
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              setPage(1)
              setKeyword(keywordDraft.trim())
              if (keyword === keywordDraft.trim()) void load()
            }}
            placeholder="搜索标题、说明或企业名称"
          />
          <Select value={type} onValueChange={(value) => { setType(value as typeof type); setPage(1) }}>
            <SelectTrigger aria-label="供需类型"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="supply">供给</SelectItem>
              <SelectItem value="demand">需求</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1) }}>
            <SelectTrigger aria-label="审核状态"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="rejected">已驳回</SelectItem>
              <SelectItem value="withdrawn">已撤回</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
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
                setStatus('pending')
                setType('all')
                setPage(1)
              }}
            >重置</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <QueueLoading /> : error ? (
        <QueueError error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <QueueEmpty title="当前没有待处理供需" description="企业提交供需审核后会进入这里。" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">供需信息</th>
                    <th className="px-4 py-3 font-medium">发布企业</th>
                    <th className="px-4 py-3 font-medium">类型 / 分类</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">提交时间</th>
                    <th className="w-[180px] px-5 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 max-w-md line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                        {item.reviewNote ? <p className="mt-2 text-xs text-red-600">审核意见：{item.reviewNote}</p> : null}
                      </td>
                      <td className="px-4 py-4">{item.enterpriseName}</td>
                      <td className="px-4 py-4">
                        <p>{item.type === 'supply' ? '供给' : '需求'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.category}</p>
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={item.status} label={statusLabels[item.status]} /></td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                      <td className="w-[180px] px-5 py-4 text-right">
                        {item.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openReview(item, 'reject')}>
                              <XCircle className="h-4 w-4" />驳回
                            </Button>
                            <Button size="sm" onClick={() => openReview(item, 'approve')}>
                              <CheckCircle2 className="h-4 w-4" />通过
                            </Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">无需处理</span>}
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

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === 'approve' ? '通过供需审核' : '驳回供需审核'}</DialogTitle>
            <DialogDescription>{target ? `${target.enterpriseName} · ${target.title}` : '确认本次审核结论。'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="supply-review-note">审核意见{decision === 'reject' ? '（必填）' : '（选填）'}</Label>
            <Textarea
              id="supply-review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={decision === 'reject' ? '请说明需要修改的具体内容' : '可填写审核备注'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>取消</Button>
            <Button
              variant={decision === 'reject' ? 'destructive' : 'default'}
              disabled={saving || (decision === 'reject' && !note.trim())}
              onClick={() => void submitReview()}
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {decision === 'approve' ? '确认通过' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
