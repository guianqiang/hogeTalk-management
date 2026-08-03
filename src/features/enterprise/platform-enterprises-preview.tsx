'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  FileSearch,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createPlatformEnterprise,
  listPlatformEnterprises,
  setPlatformEnterpriseStatus,
  updatePlatformEnterprise,
} from '@/api/client/management'
import type { CurrentChamberEnterpriseDto } from '@/api/generated/huameng'
import { PageHeading } from '@/components/management/page-heading'
import { CountrySelect } from '@/components/management/country-select'
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

const enterpriseTypeLabels: Record<number, string> = {
  1: '供应企业',
  2: '采购企业',
  3: '综合企业',
}

export function PlatformEnterprisesPreview() {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [items, setItems] = useState<CurrentChamberEnterpriseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<CurrentChamberEnterpriseDto | null>(null)
  const [name, setName] = useState('')
  const [enterpriseType, setEnterpriseType] = useState('3')
  const [country, setCountry] = useState('CN')
  const [identifierValue, setIdentifierValue] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listPlatformEnterprises({
        keyword,
        status: status === 'all' ? undefined : status as 'enabled' | 'disabled',
        limit: 100,
      })
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
    setName(selected?.name ?? '')
    setEnterpriseType(String(selected?.enterprise_type ?? 3))
    setCountry(selected?.country_code ?? 'CN')
    setIdentifierValue(selected?.declared_credit_code ?? '')
    setPhone(selected?.contact_phone ?? '')
    setEmail(selected?.contact_email ?? '')
    setDescription(selected?.description ?? '')
  }, [formOpen, selected])

  const stats = useMemo(() => [
    ['企业主体', String(items.length), '当前查询范围内的企业主体'],
    ['待审核', String(items.filter((item) => item.audit_status === 'pending').length), '等待平台审核的企业'],
    ['已认证', String(items.filter((item) => item.is_verified).length), '已完成企业认证'],
    ['已停用', String(items.filter((item) => item.status === 'disabled').length), '当前不可用的企业'],
  ], [items])

  function upsertItem(item: CurrentChamberEnterpriseDto) {
    setItems((current) => current.some((entry) => entry.enterprise_id === item.enterprise_id)
      ? current.map((entry) => entry.enterprise_id === item.enterprise_id ? item : entry)
      : [item, ...current])
  }

  function openCreate() {
    setSelected(null)
    setFormOpen(true)
  }

  function openEdit(item: CurrentChamberEnterpriseDto) {
    setSelected(item)
    setFormOpen(true)
  }

  async function saveEnterprise() {
    if (!name.trim()) {
      toast.error('请填写企业名称')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        country_code: country.trim().toUpperCase(),
        enterprise_type: Number(enterpriseType) as 1 | 2 | 3,
        description: description.trim() || null,
        contact_phone: phone.trim() || null,
        contact_email: email.trim() || null,
        declared_credit_code: identifierValue.trim() || null,
      }
      const item = selected
        ? await updatePlatformEnterprise(selected.enterprise_id, selected.version, payload)
        : await createPlatformEnterprise(payload)
      upsertItem(item)
      setFormOpen(false)
      toast.success(selected ? '企业资料已更新' : '企业主体已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存企业失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(item: CurrentChamberEnterpriseDto) {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled'
    try {
      upsertItem(await setPlatformEnterpriseStatus(item.enterprise_id, item.version, nextStatus))
      toast.success(nextStatus === 'disabled' ? '企业已停用' : '企业已启用')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '操作失败，请稍后重试')
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新建企业
          </Button>
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
              <SelectItem value="enabled">正常</SelectItem>
              <SelectItem value="disabled">已停用</SelectItem>
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
                  <tr key={item.enterprise_id} className="text-sm">
                    <td className="px-5 py-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 font-data text-xs text-muted-foreground">{item.enterprise_id}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{enterpriseTypeLabels[item.enterprise_type]} · {item.country_code}</td>
                    <td className="px-5 py-4"><span className="rounded-full border px-2 py-1 text-xs">{item.status === 'enabled' ? '正常' : '已停用'}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{item.updated_at}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void changeStatus(item)}>
                          {item.status === 'enabled' ? '停用' : '启用'}
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
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">
            <span>共 {items.length} 条</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? '编辑企业主体' : '新建企业主体'}</DialogTitle>
            <DialogDescription>企业名称统一使用一个字段；海外企业允许不填写信用代码。</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="enterprise-name">企业名称</Label>
                <Input id="enterprise-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>企业类型</Label>
                <Select value={enterpriseType} onValueChange={setEnterpriseType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">供应企业</SelectItem>
                    <SelectItem value="2">采购企业</SelectItem>
                    <SelectItem value="3">综合企业</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enterprise-country">国家或地区</Label>
                <CountrySelect value={country} onValueChange={setCountry} />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-semibold">权威标识</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                国内企业可填写统一社会信用代码；未经验证的名称和域名不会自动合并企业。
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enterprise-id-value">统一社会信用代码或登记编号</Label>
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
