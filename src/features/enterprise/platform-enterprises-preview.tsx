'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Clock3,
  FileSearch,
  Filter,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatManagementDateTime } from '@/lib/management-date-time'
import {
  createPlatformEnterprise,
  listPlatformEnterprises,
  setPlatformEnterpriseLevel,
  setPlatformEnterpriseStatus,
  updatePlatformEnterprise,
} from '@/api/client/management'
import { listManagementCountryOptions } from '@/api/client/scaffolded-management'
import type { CurrentChamberEnterpriseDto } from '@/api/generated/huameng'
import { PageHeading } from '@/components/management/page-heading'
import { CountrySelect } from '@/components/management/country-select'
import { DateTimeField } from '@/components/management/date-time-field'
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

function dateInputValue(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
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
  const [platformLevel, setPlatformLevel] = useState('0')
  const [platformLevelExpireAt, setPlatformLevelExpireAt] = useState('')
  const [countryNames, setCountryNames] = useState<Record<string, string>>({})
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
    setPlatformLevel(String(selected?.platform_level ?? 0))
    setPlatformLevelExpireAt(dateInputValue(selected?.platform_level_expire_at ?? null))
  }, [formOpen, selected])

  useEffect(() => {
    void listManagementCountryOptions()
      .then((countries) => setCountryNames(Object.fromEntries(countries.map((item) => [item.code, item.name]))))
      .catch(() => setCountryNames({}))
  }, [])

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
      let item = selected
        ? await updatePlatformEnterprise(selected.enterprise_id, selected.version, payload)
        : await createPlatformEnterprise(payload)
      const nextLevel = Math.max(0, Number(platformLevel) || 0)
      const nextExpireAt = nextLevel > 0 && platformLevelExpireAt
        ? `${platformLevelExpireAt}T23:59:59+08:00`
        : null
      if (
        item.platform_level !== nextLevel
        || dateInputValue(item.platform_level_expire_at) !== (nextLevel > 0 ? platformLevelExpireAt : '')
      ) {
        item = await setPlatformEnterpriseLevel(
          item.enterprise_id,
          item.version,
          nextLevel,
          nextExpireAt,
        )
      }
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
            <table className="w-full min-w-[1120px] text-left">
              <thead>
                <tr className="border-b bg-muted/45 text-[11px] text-muted-foreground">
                  {['企业主体', '类型与地区', '平台认证', '状态', '更新时间', '操作'].map((column) => (
                    <th key={column} className="px-5 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.enterprise_id} className="text-sm">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ember-50 text-sm font-semibold text-ember-700">
                          {item.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="mt-1 font-data text-[11px] text-muted-foreground">{item.enterprise_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{enterpriseTypeLabels[item.enterprise_type]}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {countryNames[item.country_code] ?? item.country_code}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-ember-600" />
                        {item.platform_level > 0 ? `${item.platform_level} 级` : '未设置'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.platform_level > 0
                          ? item.platform_level_expire_at
                            ? `有效至 ${dateInputValue(item.platform_level_expire_at)}`
                            : '长期有效'
                          : '未设置有效期'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={item.status === 'enabled'
                        ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                        : 'inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600'}>
                        {item.status === 'enabled' ? '正常' : '已停用'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="inline-flex items-center gap-1.5 font-data text-xs text-foreground">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatManagementDateTime(item.updated_at)}
                      </p>
                    </td>
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
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? '编辑企业主体' : '新建企业主体'}</DialogTitle>
            <DialogDescription>企业名称统一使用一个字段；海外企业允许不填写信用代码。</DialogDescription>
          </DialogHeader>
          <div className="space-y-7">
            <section className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold">主体资料</h3>
                <p className="mt-1 text-xs text-muted-foreground">企业名称、业务类型与登记所在国家。</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="enterprise-id-value">统一社会信用代码或登记编号</Label>
                  <Input
                    id="enterprise-id-value"
                    value={identifierValue}
                    onChange={(event) => setIdentifierValue(event.target.value)}
                    placeholder="中国企业填写统一社会信用代码，海外企业填写当地登记编号"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold">联系与介绍</h3>
                <p className="mt-1 text-xs text-muted-foreground">用于管理侧联络与企业目录介绍。</p>
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="enterprise-description">企业简介</Label>
                  <Textarea id="enterprise-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-l-2 border-ember-400 pl-4">
              <div>
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-ember-600" />
                  平台认证
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  仅设置华盟平台认证；商会等级由所属商会独立维护，互不覆盖。
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enterprise-platform-level">平台认证等级</Label>
                  <Select value={platformLevel} onValueChange={setPlatformLevel}>
                    <SelectTrigger id="enterprise-platform-level" className="h-11">
                      <SelectValue placeholder="请选择认证等级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">未设置平台认证</SelectItem>
                      <SelectItem value="1">1 级</SelectItem>
                      <SelectItem value="2">2 级</SelectItem>
                      <SelectItem value="3">3 级</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">平台等级与商会等级分别维护。</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enterprise-platform-expire">平台认证有效期</Label>
                  <DateTimeField
                    id="enterprise-platform-expire"
                    type="date"
                    value={platformLevelExpireAt}
                    disabled={Number(platformLevel) <= 0}
                    onValueChange={setPlatformLevelExpireAt}
                  />
                  <p className="text-xs text-muted-foreground">留空表示长期有效。</p>
                </div>
              </div>
              {selected?.chamber_level_name && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  当前商会等级：{selected.chamber_level_name}
                  {selected.chamber_level_expire_at ? `，有效至 ${dateInputValue(selected.chamber_level_expire_at)}` : '，长期有效'}
                </p>
              )}
            </section>
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
