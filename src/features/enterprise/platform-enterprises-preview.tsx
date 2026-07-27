'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  Download,
  FileSearch,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnScaffoldedRecord,
  createScaffoldedRecord,
  exportScaffoldedRecords,
  listScaffoldedRecords,
  updateScaffoldedRecord,
  type ScaffoldedRecord,
} from '@/api/client/scaffolded-management'
import { PageHeading } from '@/components/management/page-heading'
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

const resource = 'management/enterprises'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function PlatformEnterprisesPreview() {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<ScaffoldedRecord | null>(null)
  const [legalName, setLegalName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [enterpriseType, setEnterpriseType] = useState('company')
  const [country, setCountry] = useState('CN')
  const [identifierType, setIdentifierType] = useState('')
  const [identifierValue, setIdentifierValue] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listScaffoldedRecords(resource, { keyword, status, limit: 20 })
      setItems(result.items)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [keyword, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!formOpen) return
    setLegalName(selected?.title ?? '')
    setDisplayName(selected?.subtitle ?? '')
    setEnterpriseType(selected?.category ?? 'company')
    setCountry(selected?.country ?? 'CN')
    setIdentifierType('')
    setIdentifierValue('')
    setPhone('')
    setEmail('')
    setDescription('')
  }, [formOpen, selected])

  const stats = useMemo(() => [
    ['企业主体', String(items.length), '当前查询范围内的企业主体'],
    ['待认领', String(items.filter((item) => item.status === 'unclaimed').length), '尚未形成 owner membership'],
    ['待平台认证', String(items.filter((item) => item.status === 'pending_verification').length), '已提交 L1–L3 申请'],
    ['重复候选', String(items.filter((item) => item.status === 'duplicate_candidate').length), '只产生候选，不自动合并'],
  ], [items])

  function upsertItem(item: ScaffoldedRecord) {
    setItems((current) => current.some((entry) => entry.id === item.id)
      ? current.map((entry) => entry.id === item.id ? item : entry)
      : [item, ...current])
  }

  function openCreate() {
    setSelected(null)
    setFormOpen(true)
  }

  function openEdit(item: ScaffoldedRecord) {
    setSelected(item)
    setFormOpen(true)
  }

  async function saveEnterprise() {
    if (!legalName.trim()) {
      toast.error('请填写企业法定名称')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        legal_name: legalName.trim(),
        display_name: displayName.trim() || legalName.trim(),
        type: enterpriseType,
        country_code: country.trim().toUpperCase(),
        authoritative_identifier: identifierValue.trim()
          ? { type: identifierType.trim(), value: identifierValue.trim() }
          : null,
        contacts: [
          ...(phone.trim() ? [{ type: 'phone', value: phone.trim() }] : []),
          ...(email.trim() ? [{ type: 'email', value: email.trim() }] : []),
        ],
        description: description.trim() || null,
      }
      const item = selected
        ? await updateScaffoldedRecord(resource, selected.id, payload)
        : await createScaffoldedRecord(resource, payload)
      upsertItem(item)
      setFormOpen(false)
      toast.success(selected ? '企业资料已更新' : '企业主体已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存企业失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(item: ScaffoldedRecord) {
    const action = item.status === 'active' ? 'disable' : 'enable'
    try {
      upsertItem(await actOnScaffoldedRecord(resource, item.id, action))
      toast.success(action === 'disable' ? '企业已停用' : '企业已启用')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '操作失败，请稍后重试')
    }
  }

  async function importEnterprises(file: File) {
    setImporting(true)
    try {
      const content = await file.text()
      await createScaffoldedRecord('management/enterprise-imports', {
        source_file_name: file.name,
        content,
      })
      toast.success('企业导入任务已创建')
      await load()
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '导入失败，请稍后重试')
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  async function exportEnterprises() {
    try {
      const blob = await exportScaffoldedRecords(resource, {
        ...(keyword ? { keyword } : {}),
        ...(status !== 'all' ? { status } : {}),
      })
      downloadBlob(blob, 'huameng-enterprises.csv')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '导出失败，请稍后重试')
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="组织与撮合"
        title="企业管理"
        description="统一检索企业主体，跟进企业资料、认证、认领和重复候选。"
        icon={Building2}
        action={
          <div className="flex gap-2">
            <input
              ref={importInputRef}
              className="hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importEnterprises(file)
              }}
            />
            <Button variant="outline" disabled={importing} onClick={() => importInputRef.current?.click()}>
              {importing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              批量导入
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建企业
            </Button>
          </div>
        }
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, note]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-data mt-2 text-3xl font-semibold">{value}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 xl:flex-row">
          <div className="relative flex-1 xl:max-w-sm">
            <FileSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void load()}
              placeholder="企业名称或企业编号"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full xl:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部企业状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="unclaimed">待认领</SelectItem>
              <SelectItem value="pending_verification">待平台认证</SelectItem>
              <SelectItem value="inactive">已停用</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            <Filter className="h-4 w-4" />
            查询
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b bg-muted/45 text-[11px] text-muted-foreground">
                  {['企业主体', '类型与地区', '状态', '更新时间', '操作'].map((column) => (
                    <th key={column} className="px-5 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-4">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 font-data text-xs text-muted-foreground">{item.id}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{item.category ?? '企业'} · {item.country ?? '—'}</td>
                    <td className="px-5 py-4"><span className="rounded-full border px-2 py-1 text-xs">{item.status}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{item.updated_at ?? item.created_at ?? '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void changeStatus(item)}>
                          {item.status === 'active' ? '停用' : '启用'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? (
            <div className="grid min-h-72 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-ember-600" /></div>
          ) : error ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div className="max-w-lg">
                <h2 className="text-base font-semibold">无法加载企业记录</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {error instanceof Error ? error.message : '服务暂时不可用，请稍后重试'}
                </p>
                <Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div className="max-w-lg">
                <Building2 className="mx-auto h-9 w-9 text-muted-foreground" />
                <h2 className="mt-4 text-base font-semibold">暂无企业记录</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  没有符合当前筛选条件的企业，你可以调整筛选条件或新建企业。
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <span>共 {items.length} 条</span>
            <Button variant="ghost" size="sm" onClick={() => void exportEnterprises()}>
              <Download className="h-4 w-4" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? '编辑企业主体' : '新建企业主体'}</DialogTitle>
            <DialogDescription>企业主体、联系方式和权威标识分别保存，海外企业允许不填写信用代码。</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="enterprise-legal-name">企业法定名称</Label>
                <Input id="enterprise-legal-name" value={legalName} onChange={(event) => setLegalName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enterprise-display-name">展示名称</Label>
                <Input id="enterprise-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>企业类型</Label>
                <Select value={enterpriseType} onValueChange={setEnterpriseType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">企业</SelectItem>
                    <SelectItem value="chamber">商会</SelectItem>
                    <SelectItem value="platform">平台主体</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enterprise-country">国家或地区</Label>
                <Input id="enterprise-country" value={country} onChange={(event) => setCountry(event.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-semibold">权威标识</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                国内企业可填写统一社会信用代码；未经验证的名称和域名不会自动合并企业。
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enterprise-id-type">标识类型</Label>
                  <Input id="enterprise-id-type" value={identifierType} onChange={(event) => setIdentifierType(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enterprise-id-value">标识值</Label>
                  <Input id="enterprise-id-value" value={identifierValue} onChange={(event) => setIdentifierValue(event.target.value)} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="enterprise-phone">企业联系电话</Label>
                <Input id="enterprise-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enterprise-email">企业联系邮箱</Label>
                <Input id="enterprise-email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enterprise-description">企业简介</Label>
              <Textarea id="enterprise-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void saveEnterprise()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {selected ? '保存' : '创建企业'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
