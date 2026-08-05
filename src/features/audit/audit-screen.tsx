'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Activity, Download, LoaderCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  exportManagementAudit,
  listManagementAudit,
  listManagementAuditActionTypes,
  listManagementAuditOperators,
  type ManagementAuditOperator,
  type ManagementAuditRecord,
} from '@/api/client/scaffolded-management'
import { PageHeading } from '@/components/management/page-heading'
import { DateTimeField } from '@/components/management/date-time-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useManagement } from '@/lib/management'

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `huameng-audit-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const auditActionLabels: Record<string, string> = {
  'account.profile_updated': '修改账号资料',
  'chamber_level.created': '新建会员等级',
  'chamber_level.update': '更新会员等级',
  'session.logout': '退出登录',
  'session.refresh_replayed': '安全会话校验',
}

const auditObjectLabels: Record<string, string> = {
  account: '账号',
  chamber_level: '会员等级',
  device_session: '登录会话',
  enterprise: '企业',
  chamber: '商会',
  cms_article: '网站内容',
  product: '商品',
  plan: '套餐',
  staff_assignment: '后台人员',
}

const auditMetadataLabels: Record<string, string> = {
  display_name: '显示名称',
  title: '岗位',
  status: '状态',
  reason: '操作原因',
  scope_type: '授权范围',
  country_code: '国家代码',
  changed_fields: '变更字段',
}

function auditActionLabel(action: string) {
  return auditActionLabels[action] ?? '业务操作'
}

function auditObjectLabel(objectType: string) {
  return auditObjectLabels[objectType] ?? '业务对象'
}

function auditMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return `${value.length} 项`
  if (typeof value === 'object') return '已记录'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

export function AuditScreen() {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const scope = useMemo(() => workspace ? ({
    scopeType: workspace.kind === 'platform' ? 'platform' as const : 'chamber' as const,
    scopeId: workspace.kind === 'platform' ? 'hm' : workspace.id,
  }) : null, [workspace])
  const [keyword, setKeyword] = useState('')
  const [objectType, setObjectType] = useState('all')
  const [action, setAction] = useState('all')
  const [actor, setActor] = useState('all')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [items, setItems] = useState<ManagementAuditRecord[]>([])
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [operators, setOperators] = useState<ManagementAuditOperator[]>([])
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<ManagementAuditRecord | null>(null)
  const [exporting, setExporting] = useState(false)
  const objectTypes = useMemo(
    () => [...new Set(items.map((item) => item.object_type))],
    [items],
  )

  const filters = useMemo(() => scope ? ({
    ...scope,
    keyword: keyword.trim() || undefined,
    objectType: objectType === 'all' ? undefined : objectType,
    actionPrefix: action === 'all' ? undefined : action,
    actorAccountId: actor === 'all' ? undefined : actor,
    start: start ? new Date(start).toISOString() : undefined,
    end: end ? new Date(end).toISOString() : undefined,
  }) : null, [action, actor, end, keyword, objectType, scope, start])

  const load = useCallback(async () => {
    if (!filters) return
    setLoading(true)
    setError(null)
    try {
      const [result, actions, auditOperators] = await Promise.all([
        listManagementAudit(filters),
        listManagementAuditActionTypes(filters),
        listManagementAuditOperators(filters),
      ])
      setItems(result.list)
      setNextPage(result.size < result.total ? 2 : null)
      setActionTypes(actions)
      setOperators(auditOperators)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    if (!filters || !nextPage) return
    setLoadingMore(true)
    try {
      const result = await listManagementAudit({ ...filters, page: nextPage })
      setItems((current) => [...current, ...result.list])
      setNextPage(nextPage * result.size < result.total ? nextPage + 1 : null)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '下一页读取失败')
    } finally {
      setLoadingMore(false)
    }
  }

  async function exportLogs() {
    if (!filters) return
    setExporting(true)
    try {
      downloadBlob(await exportManagementAudit(filters))
      toast.success('审计记录已导出')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  if (!workspace) return null

  return (
    <div>
      <PageHeading
        eyebrow="系统"
        title="操作审计"
        description="在当前唯一企业的实时授权范围内，按操作人、对象、动作和时间追溯服务端审计账。"
        icon={Activity}
        action={
          <Button variant="outline" disabled={exporting} onClick={() => void exportLogs()}>
            {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            导出审计记录
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-3 xl:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void load()}
              placeholder="操作人、对象编号或请求编号"
            />
          </div>
          <Select value={objectType} onValueChange={setObjectType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部业务对象</SelectItem>
              {objectTypes.map((item) => (
                <SelectItem key={item} value={item}>{auditObjectLabel(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部动作</SelectItem>
              {actionTypes.map((item) => <SelectItem key={item} value={item}>{auditActionLabel(item)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actor} onValueChange={setActor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部操作人</SelectItem>
              {operators.map((item) => (
                <SelectItem key={item.account_id} value={item.account_id}>{item.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}>查询</Button>
          <div className="lg:col-span-3">
            <label htmlFor="audit-start" className="text-xs text-muted-foreground">开始时间</label>
            <DateTimeField id="audit-start" type="datetime-local" value={start} onValueChange={setStart} />
          </div>
          <div className="lg:col-span-3">
            <label htmlFor="audit-end" className="text-xs text-muted-foreground">结束时间</label>
            <DateTimeField id="audit-end" type="datetime-local" value={end} onValueChange={setEnd} />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left">
              <thead>
                <tr className="border-b bg-muted/45 text-[11px] text-muted-foreground">
                  {['发生时间', '操作人', '对象类型', '动作', '业务对象', '原因', '详情'].map((column) => (
                    <th key={column} className="px-5 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-4 text-muted-foreground">{dateTime(item.occurred_at)}</td>
                    <td className="px-5 py-4">
                      <p>{item.actor_display_name}</p>
                    </td>
                    <td className="px-5 py-4">{auditObjectLabel(item.object_type)}</td>
                    <td className="px-5 py-4">{auditActionLabel(item.action)}</td>
                    <td className="px-5 py-4 text-muted-foreground">相关{auditObjectLabel(item.object_type)}</td>
                    <td className="px-5 py-4">{item.reason_code ? '已记录原因' : '—'}</td>
                    <td className="px-5 py-4"><Button size="sm" variant="ghost" onClick={() => setSelected(item)}>查看</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? (
            <div className="grid min-h-72 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-ember-600" /></div>
          ) : error ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <p className="font-semibold">无法加载审计记录</p>
                <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : '服务暂时不可用'}</p>
                <Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-72 place-items-center text-sm text-muted-foreground">没有符合筛选条件的审计记录。</div>
          ) : null}
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <span>已加载 {items.length} 条</span>
            {nextPage && (
              <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}
                加载更多
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审计记录详情</DialogTitle>
            <DialogDescription>服务端审计摘要、请求标识和不可变元数据。</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">记录编号</dt><dd className="mt-1 font-data">{selected.id}</dd></div>
                <div><dt className="text-xs text-muted-foreground">序列号</dt><dd className="mt-1 font-data">{selected.sequence}</dd></div>
                <div><dt className="text-xs text-muted-foreground">请求编号</dt><dd className="mt-1 font-data">{selected.request_id ?? '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">企业编号</dt><dd className="mt-1 font-data">{selected.enterprise_id ?? '—'}</dd></div>
              </dl>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">业务变更摘要</p>
                {Object.keys(selected.metadata).length > 0 ? (
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {Object.entries(selected.metadata).map(([key, value]) => (
                      <div key={key} className="rounded-md bg-muted/35 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{auditMetadataLabels[key] ?? '补充信息'}</dt>
                        <dd className="mt-1 text-sm">{auditMetadataValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">本次操作没有额外业务变更信息。</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
