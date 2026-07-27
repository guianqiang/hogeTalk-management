'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, CalendarDays, Download, LoaderCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  exportScaffoldedRecords,
  listScaffoldedRecords,
  type ScaffoldedRecord,
} from '@/api/client/scaffolded-management'
import { PageHeading } from '@/components/management/page-heading'
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

const resource = 'management/audit-logs'

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'huameng-audit-logs.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AuditScreen() {
  const [keyword, setKeyword] = useState('')
  const [module, setModule] = useState('all')
  const [action, setAction] = useState('all')
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<ScaffoldedRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listScaffoldedRecords(resource, {
        keyword,
        status: action,
        limit: 20,
      })
      setItems(module === 'all'
        ? result.items
        : result.items.filter((item) => item.category === module))
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [action, keyword, module])

  useEffect(() => {
    void load()
  }, [load])

  async function exportLogs() {
    try {
      const blob = await exportScaffoldedRecords(resource, {
        ...(keyword ? { keyword } : {}),
        ...(module !== 'all' ? { module } : {}),
        ...(action !== 'all' ? { action } : {}),
      })
      downloadBlob(blob)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '导出失败，请稍后重试')
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="系统"
        title="操作审计"
        description="按操作人、业务对象和动作追溯管理端变更。审计账只读取服务端真源。"
        icon={Activity}
        action={
          <Button variant="outline" onClick={() => void exportLogs()}>
            <Download className="h-4 w-4" />
            导出审计记录
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void load()}
              placeholder="操作人、对象名称或对象编号"
            />
          </div>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部业务模块</SelectItem>
              <SelectItem value="enterprise">企业</SelectItem>
              <SelectItem value="claim">认领审核</SelectItem>
              <SelectItem value="verification">平台认证</SelectItem>
              <SelectItem value="staff">账号权限</SelectItem>
              <SelectItem value="content">网站内容</SelectItem>
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部动作</SelectItem>
              <SelectItem value="create">新建</SelectItem>
              <SelectItem value="update">修改</SelectItem>
              <SelectItem value="review">审核</SelectItem>
              <SelectItem value="publish">发布</SelectItem>
              <SelectItem value="revoke">撤销</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="justify-start font-normal">
            <CalendarDays className="h-4 w-4" />
            选择时间范围
          </Button>
          <Button variant="outline" onClick={() => void load()}>查询</Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b bg-muted/45 text-[11px] text-muted-foreground">
                  {['发生时间', '操作人', '业务模块', '动作', '业务对象', '结果', '详情'].map((column) => (
                    <th key={column} className="px-5 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-4 text-muted-foreground">{item.created_at ?? '—'}</td>
                    <td className="px-5 py-4">{item.subtitle ?? '—'}</td>
                    <td className="px-5 py-4">{item.category ?? '—'}</td>
                    <td className="px-5 py-4">{item.status}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 font-data text-xs text-muted-foreground">{item.id}</p>
                    </td>
                    <td className="px-5 py-4"><span className="rounded-full border px-2 py-1 text-xs">成功</span></td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(item)}>查看</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? (
            <div className="grid min-h-72 place-items-center">
              <LoaderCircle className="h-7 w-7 animate-spin text-ember-600" />
            </div>
          ) : error ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div className="max-w-lg">
                <h2 className="text-base font-semibold">无法加载审计记录</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {error instanceof Error ? error.message : '服务暂时不可用，请稍后重试'}
                </p>
                <Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div className="max-w-lg">
                <Activity className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-base font-semibold">暂无审计记录</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">没有符合当前筛选条件的操作记录。</p>
              </div>
            </div>
          ) : null}
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">共 {items.length} 条审计记录</div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审计记录详情</DialogTitle>
            <DialogDescription>展示该动作的服务端审计摘要和业务对象。</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">记录编号</dt><dd className="mt-1 font-data">{selected.id}</dd></div>
              <div><dt className="text-xs text-muted-foreground">发生时间</dt><dd className="mt-1">{selected.created_at ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">业务模块</dt><dd className="mt-1">{selected.category ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">动作</dt><dd className="mt-1">{selected.status}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">业务对象</dt><dd className="mt-1">{selected.title}</dd></div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
