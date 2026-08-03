'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Archive,
  ArrowUpDown,
  Boxes,
  Copy,
  Download,
  Eye,
  Filter,
  Globe2,
  ImagePlus,
  KeyRound,
  ListFilter,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnScaffoldedRecord,
  createScaffoldedRecord,
  exportScaffoldedRecords,
  getSiteConfig,
  listCmsCategoryOptions,
  listScaffoldedRecords,
  updateSiteConfig,
  uploadManagementMedia,
  updateScaffoldedRecord,
  type ScaffoldedRecord,
  type SiteConfigResponse,
} from '@/api/client/scaffolded-management'
import {
  createChamberAdminAccount,
  listChamberAdminAccounts,
} from '@/api/client/management'
import type { StaffAssignmentDto } from '@/api/generated/huameng-platform'
import { PageHeading } from '@/components/management/page-heading'
import { CountrySelect } from '@/components/management/country-select'
import { DateTimeField } from '@/components/management/date-time-field'
import { RichTextEditor } from '@/components/management/rich-text-editor'
import { HomeCurationScreen } from '@/features/legacy/home-curation-screen'
import {
  OperationalModuleScreen,
  isOperationalModule,
} from '@/features/legacy/operational-module-screen'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type ModuleKind = 'content' | 'catalog' | 'organization' | 'inquiry' | 'dictionary' | 'settings'

interface ModuleConfig {
  title: string
  description: string
  noun: string
  kind: ModuleKind
  eyebrow: string
  primaryAction?: string
  filters: string[]
  columns: string[]
}

const moduleConfig: Record<string, ModuleConfig> = {
  home: {
    title: '首页管理',
    description: '管理华盟在线首页轮播、推荐内容与展示顺序。',
    noun: '首页内容',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建首页内容',
    filters: ['展示位置', '发布状态'],
    columns: ['标题', '展示位置', '置顶', '发布状态', '更新时间', '操作'],
  },
  news: {
    title: '新闻中心',
    description: '管理新闻资讯、栏目、发布状态与首页推荐。',
    noun: '资讯',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建资讯',
    filters: ['资讯栏目', '发布状态'],
    columns: ['标题', '栏目', '来源', '发布状态', '发布时间', '操作'],
  },
  tour: {
    title: '文化旅游',
    description: '管理中国—东盟文化旅游内容、目的地与推荐顺序。',
    noun: '文旅内容',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建文旅内容',
    filters: ['国家或地区', '发布状态'],
    columns: ['标题', '国家或地区', '首页推荐', '发布状态', '更新时间', '操作'],
  },
  education: {
    title: '教育交流',
    description: '管理院校合作、教育项目和交流活动内容。',
    noun: '教育内容',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建教育内容',
    filters: ['内容栏目', '发布状态'],
    columns: ['标题', '栏目', '关联国家', '发布状态', '更新时间', '操作'],
  },
  investment: {
    title: '经贸合作',
    description: '管理招商项目、经贸资讯和投资合作信息。',
    noun: '经贸内容',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建经贸内容',
    filters: ['内容类型', '发布状态'],
    columns: ['标题', '内容类型', '关联国家', '发布状态', '更新时间', '操作'],
  },
  'supply-chain': {
    title: '供应链平台',
    description: '管理供应链企业、商品与供需展示信息。',
    noun: '供应链内容',
    kind: 'catalog',
    eyebrow: '网站内容',
    primaryAction: '新建供应链内容',
    filters: ['商品分类', '上架状态'],
    columns: ['名称', '所属企业', '商品分类', '上架状态', '更新时间', '操作'],
  },
  associations: {
    title: '商协会',
    description: '管理商协会专题内容、动态和首页推荐。',
    noun: '商协会内容',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建商协会内容',
    filters: ['内容栏目', '发布状态'],
    columns: ['标题', '栏目', '关联商协会', '发布状态', '更新时间', '操作'],
  },
  activities: {
    title: '近期活动',
    description: '管理活动时间、地点、报名入口和发布状态。',
    noun: '活动',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建活动',
    filters: ['活动状态', '发布状态'],
    columns: ['活动名称', '活动时间', '活动地点', '发布状态', '报名状态', '操作'],
  },
  parks: {
    title: '东盟园区',
    description: '管理园区资料、招商信息和园区专题内容。',
    noun: '园区内容',
    kind: 'content',
    eyebrow: '网站内容',
    primaryAction: '新建园区内容',
    filters: ['国家或地区', '发布状态'],
    columns: ['标题', '国家或地区', '关联园区', '发布状态', '更新时间', '操作'],
  },
  chambers: {
    title: '商会管理',
    description: '管理平台内商会主体、基础资料和后台管理员。',
    noun: '商会',
    kind: 'organization',
    eyebrow: '组织与撮合',
    primaryAction: '新建商会',
    filters: ['国家或地区', '启用状态'],
    columns: ['商会名称', '国家或地区', '重点展示', '启用状态', '更新时间', '操作'],
  },
  inquiries: {
    title: '线索管理',
    description: '管理企业合作与咨询线索，记录受理和跟进结果。',
    noun: '线索',
    kind: 'inquiry',
    eyebrow: '组织与撮合',
    filters: ['处理状态', '线索方向', '来源'],
    columns: ['姓名', '联系方式', '公司', '方向', '来源', '状态', '提交时间', '操作'],
  },
  partners: {
    title: '合作伙伴',
    description: '管理合作伙伴标识、官网链接与展示顺序。',
    noun: '合作伙伴',
    kind: 'dictionary',
    eyebrow: '站点与字典',
    primaryAction: '新建合作伙伴',
    filters: ['启用状态'],
    columns: ['伙伴名称', '标识', '官网链接', '排序', '启用状态', '操作'],
  },
  'product-categories': {
    title: '商品分类',
    description: '维护供应链商品分类、层级和展示顺序。',
    noun: '商品分类',
    kind: 'dictionary',
    eyebrow: '站点与字典',
    primaryAction: '新建商品分类',
    filters: ['分类层级', '启用状态'],
    columns: ['分类名称', '上级分类', '层级', '排序', '启用状态', '操作'],
  },
  'article-categories': {
    title: '资讯栏目',
    description: '维护新闻资讯栏目结构、内容类型和展示顺序。',
    noun: '资讯栏目',
    kind: 'dictionary',
    eyebrow: '站点与字典',
    primaryAction: '新建资讯栏目',
    filters: ['内容类型', '启用状态'],
    columns: ['栏目名称', '内容类型', '上级栏目', '排序', '启用状态', '操作'],
  },
  countries: {
    title: '国家管理',
    description: '维护国家与地区名称、代码、旗帜和展示顺序。',
    noun: '国家或地区',
    kind: 'dictionary',
    eyebrow: '站点与字典',
    primaryAction: '新建国家或地区',
    filters: ['启用状态'],
    columns: ['中文名称', '英文名称', '国家代码', '旗帜', '排序', '启用状态', '操作'],
  },
  'site-settings': {
    title: '站点配置',
    description: '管理华盟在线公共信息、SEO、联系方式与社交媒体。',
    noun: '站点配置',
    kind: 'settings',
    eyebrow: '站点与字典',
    filters: [],
    columns: [],
  },
}

const legacyStatusLabels: Record<string, string> = {
  active: '已启用',
  inactive: '已停用',
  draft: '草稿',
  published: '已发布',
  withdrawn: '已撤回',
  suspended: '已停用',
  closed: '已关闭',
  pending: '待处理',
  processing: '处理中',
  contacted: '已联系',
  completed: '已完成',
  invalid: '无效线索',
}

function legacyStatusLabel(status: string, kind?: ModuleKind) {
  if (kind === 'organization') {
    return status === 'active' ? '正常' : '已禁用'
  }
  return legacyStatusLabels[status] ?? '待确认'
}

function staffDateTime(value: string | null | undefined) {
  if (!value) return '暂无记录'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function isEnabledRecord(item: ScaffoldedRecord) {
  return item.status === 'published' || item.status === 'active'
}

function recordActionLabel(config: ModuleConfig, item: ScaffoldedRecord) {
  if (config.kind === 'inquiry') return item.status === 'completed' ? '重新跟进' : '标记完成'
  if (config.kind === 'organization') return isEnabledRecord(item) ? '禁用' : '启用'
  if (isEnabledRecord(item)) {
    if (config.kind === 'content' || config.kind === 'catalog') return '下架'
    return '停用'
  }
  if (config.kind === 'content' || config.kind === 'catalog') return '发布'
  return '启用'
}

function recordColumnValue(item: ScaffoldedRecord, column: string) {
  const raw = item.raw ?? {}
  if (column.includes('时间')) {
    const value = item.updated_at ?? item.created_at
    return value
      ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
      : '—'
  }
  if (column.includes('国家')) {
    if (!item.country) return '—'
    try {
      const name = new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(item.country.toUpperCase())
      return name ? `${name}（${item.country.toUpperCase()}）` : item.country
    } catch {
      return item.country
    }
  }
  if (column.includes('上级')) return String(raw.parent_name ?? raw.parent_id ?? '无')
  if (column.includes('栏目') || column.includes('分类')) return item.category ?? '—'
  if (column.includes('会员企业')) return String(raw.member_count ?? raw.member_enterprise_count ?? '—')
  if (column.includes('管理员')) return String(raw.admin_count ?? raw.manager_count ?? '—')
  if (column.includes('官网')) return String(raw.website_url ?? '—')
  if (column.includes('标识')) {
    return raw.logo || raw.logo_url ? '图片可用' : '未上传'
  }
  if (column.includes('旗帜')) {
    return raw.flag || raw.flag_url ? '图片可用' : '未上传'
  }
  if (column.includes('重点展示')) return raw.is_home === true ? '是' : '否'
  if (column.includes('排序')) return String(item.sort ?? 0)
  if (column.includes('英文名称')) return item.subtitle ?? '—'
  if (column.includes('代码')) return String(item.country ?? raw.code ?? '—')
  if (column.includes('层级')) return String(raw.level ?? (raw.parent_id ? '二级分类' : '一级分类'))
  if (column.includes('来源')) return String(raw.source ?? '—')
  if (column.includes('公司')) return String(raw.company_name ?? raw.enterprise_name ?? '—')
  if (column.includes('联系方式')) return String(raw.masked_contact ?? raw.contact ?? raw.phone ?? raw.email ?? '—')
  if (column.includes('方向')) return String(raw.direction ?? '—')
  return '—'
}

function EmptyTable({
  config,
  items,
  loading,
  loadingMore = false,
  hasMore = false,
  error,
  onRetry,
  onLoadMore,
  onEdit,
  onStatusAction,
  onManageAdmins,
}: {
  config: ModuleConfig
  items: ScaffoldedRecord[]
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  error: unknown
  onRetry: () => void
  onLoadMore?: () => void
  onEdit: (item: ScaffoldedRecord) => void
  onStatusAction: (item: ScaffoldedRecord) => void
  onManageAdmins?: (item: ScaffoldedRecord) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left">
            <thead>
              <tr className="border-b bg-muted/45 text-[11px] text-muted-foreground">
                {config.columns.map((column) => (
                  <th key={column} className="px-5 py-3 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="text-sm">
                  {config.columns.map((column, index) => (
                    <td key={column} className="px-5 py-4">
                      {index === 0
                        ? <span className="font-medium">{item.title}</span>
                        : column.includes('状态')
                          ? <span className="rounded-full border px-2 py-1 text-xs">{legacyStatusLabel(item.status, config.kind)}</span>
                          : column === '操作'
                            ? (
                              <div className="flex justify-end gap-1">
                                {config.kind === 'organization' && onManageAdmins && (
                                  <Button size="sm" variant="ghost" onClick={() => onManageAdmins(item)}>
                                    <UsersRound className="h-3.5 w-3.5" />
                                    查看管理员
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                                  {config.kind === 'inquiry' ? '跟进' : '编辑'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => onStatusAction(item)}>
                                  {recordActionLabel(config, item)}
                                </Button>
                              </div>
                            )
                            : recordColumnValue(item, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="grid min-h-64 place-items-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-ember-600" />
          </div>
        ) : error ? (
          <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
            <div className="max-w-md">
              <h2 className="text-base font-semibold">无法加载{config.noun}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {error instanceof Error ? error.message : '服务暂时不可用，请稍后重试'}
              </p>
              <Button className="mt-4" variant="outline" onClick={onRetry}>重新加载</Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border bg-muted/25 text-muted-foreground">
              <Archive className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold">暂无{config.noun}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              暂时没有可展示的数据，请调整筛选条件后重试。
            </p>
          </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
          <span>当前显示 {items.length} 条</span>
          {hasMore && onLoadMore && (
            <Button size="sm" variant="ghost" disabled={loadingMore} onClick={onLoadMore}>
              {loadingMore && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              加载更多
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterBar({
  config,
  keyword,
  status,
  onKeywordChange,
  onStatusChange,
  onSearch,
}: {
  config: ModuleConfig
  keyword: string
  status: string
  onKeywordChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSearch: () => void
}) {
  const statusOptions = config.kind === 'organization'
    ? [
        { value: 'active', label: '正常' },
        { value: 'inactive', label: '已禁用' },
      ]
    : config.kind === 'dictionary'
      ? [
          { value: 'active', label: '已启用' },
          { value: 'inactive', label: '已停用' },
        ]
      : [
          { value: 'published', label: '已发布' },
          { value: 'draft', label: '草稿' },
          { value: 'withdrawn', label: '已下架' },
        ]

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1 xl:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={`搜索${config.noun}名称或编号`}
          />
        </div>
        {config.filters.filter((filter) => filter.includes('状态')).map((filter) => (
          <Select
            key={filter}
            value={status}
            onValueChange={onStatusChange}
          >
            <SelectTrigger className="w-full bg-card xl:w-40">
              <SelectValue placeholder={filter} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部{filter}</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <div className="flex gap-2 xl:ml-auto">
          <Button variant="outline" onClick={onSearch}>
            <Filter className="h-4 w-4" />
            查询
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onKeywordChange('')
              onStatusChange('all')
            }}
          >
            重置
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ContentForm({ config, open, onOpenChange, resource, initial, onSaved }: {
  config: ModuleConfig
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: string
  initial: ScaffoldedRecord | null
  onSaved: (item: ScaffoldedRecord) => void
}) {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [summary, setSummary] = useState('')
  const [source, setSource] = useState('')
  const [country, setCountry] = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [categoryOptions, setCategoryOptions] = useState<ScaffoldedRecord[]>([])
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [sort, setSort] = useState('0')
  const [images, setImages] = useState<File[]>([])
  const [status, setStatus] = useState('draft')
  const [isTop, setIsTop] = useState(false)
  const [isHome, setIsHome] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setSubtitle(initial?.subtitle ?? '')
    setSummary(String(initial?.raw?.summary ?? ''))
    setSource(String(initial?.raw?.source ?? ''))
    setCountry(initial?.country ?? '')
    setCategoryId(String(initial?.raw?.category_id ?? 'none'))
    setTags(Array.isArray(initial?.raw?.tags) ? initial.raw.tags.join(',') : '')
    setContent(String(initial?.raw?.content ?? ''))
    setSort(String(initial?.sort ?? 0))
    setImages([])
    setStatus(initial?.status ?? 'draft')
    setIsTop(initial?.raw?.is_top === true)
    setIsHome(initial?.raw?.is_home === true)
    void listCmsCategoryOptions(resource)
      .then(setCategoryOptions)
      .catch(() => setCategoryOptions([]))
  }, [initial, open, resource])

  async function save() {
    if (!title.trim()) {
      toast.error('请填写标题')
      return
    }
    if (country.trim() && !/^[A-Za-z]{2}$/.test(country.trim())) {
      toast.error('关联国家或地区请填写两位代码，例如 CN')
      return
    }
    setSubmitting(true)
    try {
      const imageUrls = await Promise.all(images.map((file) => uploadManagementMedia(file, 'cms')))
      const existingCoverUrl = String(initial?.raw?.cover ?? initial?.raw?.cover_url ?? '') || null
      const existingImageUrls = Array.isArray(initial?.raw?.images)
        ? initial.raw.images
        : Array.isArray(initial?.raw?.image_urls) ? initial.raw.image_urls : []
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        summary: summary.trim() || null,
        source: source.trim() || null,
        country: country.trim() || null,
        category_id: categoryId === 'none' ? null : categoryId,
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
        content: content.trim() || null,
        sort: Number(sort) || 0,
        cover_url: imageUrls[0] ?? existingCoverUrl,
        image_urls: imageUrls.length > 0 ? imageUrls : existingImageUrls,
        status,
        is_top: isTop,
        is_home: isHome,
        module: config.title,
        expected_version: initial?.version,
        __item: initial ?? undefined,
      }
      let item = initial
        ? await updateScaffoldedRecord(resource, initial.id, payload)
        : await createScaffoldedRecord(resource, payload)
      if (
        initial
        && status === 'published'
        && (item.status !== 'published' || item.raw?.has_unpublished_changes === true)
      ) {
        item = await actOnScaffoldedRecord(resource, item.id, 'enable', {
          expected_version: item.version,
          __item: item,
        })
      }
      onSaved(item)
      onOpenChange(false)
      toast.success(initial ? '内容已更新' : '内容已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑' : '新建'}{config.noun}</DialogTitle>
          <DialogDescription>填写内容信息、展示位置和发布状态。</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">基本信息</h3>
              <p className="mt-1 text-xs text-muted-foreground">设置内容归类以及列表中优先展示的信息。</p>
            </div>
            <div className="space-y-2">
              <Label>所属栏目</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不归栏目</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                栏目来自“资讯栏目”配置；当前内容固定归属于{config.title}。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy-title">标题</Label>
              <Input id="legacy-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`请输入${config.noun}标题`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy-subtitle">副标题</Label>
              <Input
                id="legacy-subtitle"
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="可选，用于补充主标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy-summary">摘要</Label>
              <Textarea
                id="legacy-summary"
                rows={3}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="用于列表摘要和搜索结果"
              />
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-sm font-semibold">内容素材</h3>
              <p className="mt-1 text-xs text-muted-foreground">上传封面与图集，并完成正文编辑。</p>
            </div>
            <label className="block cursor-pointer rounded-lg border border-dashed p-5 transition-colors hover:bg-muted/25">
              <input
                className="hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, 9))}
              />
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">封面图与图集</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {images.length > 0 ? `已选择 ${images.length} 张图片` : '支持封面 1 张、图集最多 9 张。'}
                  </p>
                </div>
              </div>
            </label>
            <div className="space-y-2">
              <Label>正文</Label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-sm font-semibold">归属与检索</h3>
              <p className="mt-1 text-xs text-muted-foreground">补充来源、关联地区和搜索标签。</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="legacy-source">来源</Label>
                <Input id="legacy-source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="例如：华盟在线" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legacy-country">关联国家或地区</Label>
                <CountrySelect value={country} onValueChange={setCountry} allowEmpty />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy-tags">标签</Label>
              <Input id="legacy-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="多个标签用逗号分隔" />
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-sm font-semibold">发布设置</h3>
              <p className="mt-1 text-xs text-muted-foreground">最后确认发布状态和内容展示优先级。</p>
            </div>
            <div className="space-y-2">
              <Label>发布状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{initial ? '保存修改，暂不发布' : '保存草稿'}</SelectItem>
                  <SelectItem value="published">发布</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="legacy-sort">排序</Label>
                <Input id="legacy-sort" className="h-10" type="number" value={sort} onChange={(event) => setSort(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legacy-top">置顶</Label>
                <label
                  htmlFor="legacy-top"
                  className="flex h-10 cursor-pointer items-center justify-between rounded-md border bg-background px-3 text-sm"
                >
                  <span className="text-muted-foreground">{isTop ? '已开启' : '未开启'}</span>
                  <Switch id="legacy-top" checked={isTop} onCheckedChange={setIsTop} />
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="legacy-home">首页推荐</Label>
                <label
                  htmlFor="legacy-home"
                  className="flex h-10 cursor-pointer items-center justify-between rounded-md border bg-background px-3 text-sm"
                >
                  <span className="text-muted-foreground">{isHome ? '已开启' : '未开启'}</span>
                  <Switch id="legacy-home" checked={isHome} onCheckedChange={setIsHome} />
                </label>
              </div>
            </div>
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void save()}>
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {initial ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RecordForm({ config, open, onOpenChange, resource, initial, onSaved }: {
  config: ModuleConfig
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: string
  initial: ScaffoldedRecord | null
  onSaved: (item: ScaffoldedRecord) => void
}) {
  const isCountry = config.title === '国家管理'
  const isChamber = config.kind === 'organization'
  const isPartner = config.title === '合作伙伴'
  const isCategory = config.title === '商品分类' || config.title === '资讯栏目'
  const [name, setName] = useState('')
  const [englishName, setEnglishName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [foundedOn, setFoundedOn] = useState('')
  const [registeredPlace, setRegisteredPlace] = useState('')
  const [address, setAddress] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [parent, setParent] = useState('none')
  const [parentOptions, setParentOptions] = useState<ScaffoldedRecord[]>([])
  const [link, setLink] = useState('')
  const [partnerCategory, setPartnerCategory] = useState('enterprise')
  const [sort, setSort] = useState('0')
  const [status, setStatus] = useState('active')
  const [featured, setFeatured] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.title ?? '')
    setEnglishName(initial?.subtitle ?? '')
    setCountryCode(initial?.country ?? '')
    setLogoUrl(String(initial?.raw?.logo ?? initial?.raw?.logo_url ?? ''))
    setFoundedOn(String(initial?.raw?.founded_at ?? ''))
    setRegisteredPlace(String(initial?.raw?.reg_place ?? ''))
    setAddress(String(initial?.raw?.address ?? ''))
    setContactPhone(String(initial?.raw?.contact_phone ?? ''))
    setContactEmail(String(initial?.raw?.contact_email ?? ''))
    setWebsiteUrl(String(initial?.raw?.website_url ?? ''))
    setIntroduction(String(initial?.raw?.description ?? ''))
    setParent(String(initial?.raw?.parent_id ?? 'none'))
    setLink(String(
      initial?.raw?.website_url
        ?? initial?.raw?.slug
        ?? initial?.raw?.flag
        ?? initial?.raw?.flag_url
        ?? '',
    ))
    setPartnerCategory(String(initial?.raw?.category ?? 'enterprise'))
    setSort(String(initial?.sort ?? 0))
    setStatus(initial?.status ?? 'active')
    setFeatured(initial?.raw?.is_home === true)
    if (isCategory) {
      void listScaffoldedRecords(resource, { status: 'all', limit: 100 })
        .then((result) => setParentOptions(result.items.filter((item) => item.id !== initial?.id)))
        .catch(() => setParentOptions([]))
    } else {
      setParentOptions([])
    }
  }, [initial, isCategory, open, resource])

  async function save() {
    if (!name.trim()) {
      toast.error(`请填写${config.noun}名称`)
      return
    }
    if ((isChamber || isCountry) && !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
      toast.error('请填写两位国家或地区代码')
      return
    }
    if (isCountry && !englishName.trim()) {
      toast.error('请填写英文名称')
      return
    }
    if (isPartner && !logoUrl.trim()) {
      toast.error('请上传或填写合作伙伴标识')
      return
    }
    if (isPartner && link.trim() && !/^https:\/\//i.test(link.trim())) {
      toast.error('合作伙伴官网必须使用 HTTPS 地址')
      return
    }
    if (isCategory && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(link.trim())) {
      toast.error('分类标识仅支持小写字母、数字和中划线')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: name.trim(),
        subtitle: englishName.trim() || null,
        country: countryCode.trim().toUpperCase() || null,
        logo_url: logoUrl.trim() || null,
        founded_on: foundedOn || null,
        registered_place: registeredPlace.trim() || null,
        address: address.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        website_url: websiteUrl.trim() || null,
        introduction: introduction.trim() || null,
        parent_id: parent === 'none' ? null : parent,
        link: link.trim() || null,
        partner_category: partnerCategory,
        sort: Number(sort) || 0,
        status,
        is_featured: featured,
        expected_version: initial?.version,
        __item: initial ?? undefined,
      }
      const item = initial
        ? await updateScaffoldedRecord(resource, initial.id, payload)
        : await createScaffoldedRecord(resource, payload)
      onSaved(item)
      onOpenChange(false)
      toast.success(initial ? `${config.noun}已更新` : `${config.noun}已创建`)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑' : '新建'}{config.noun}</DialogTitle>
          <DialogDescription>
            {isChamber
              ? '维护商会主体资料和使用状态，保存后立即生效。'
              : '请按页面字段填写完整资料，保存后可在列表中继续管理状态。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="record-name">
              {isCountry ? '中文名称' : `${config.noun}名称`}
            </Label>
            <Input
              id="record-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`请输入${config.noun}名称`}
            />
          </div>
          {isCountry && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country-en">英文名称</Label>
                  <Input id="country-en" value={englishName} onChange={(event) => setEnglishName(event.target.value)} placeholder="Thailand" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country-code">国家代码</Label>
                  <Input id="country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="TH" maxLength={2} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>旗帜图片</Label>
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3">
                  <span className="text-sm text-muted-foreground">{link ? '图片已上传' : '尚未上传图片'}</span>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
                    {uploadingLogo
                      ? <LoaderCircle className="h-4 w-4 animate-spin" />
                      : <ImagePlus className="h-4 w-4" />}
                    {uploadingLogo ? '上传中' : link ? '更换图片' : '上传图片'}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setUploadingLogo(true)
                        try {
                          setLink(await uploadManagementMedia(file, 'cms'))
                          toast.success('旗帜图片已上传')
                        } catch (nextError) {
                          toast.error(nextError instanceof Error ? nextError.message : '图片上传失败')
                        } finally {
                          setUploadingLogo(false)
                          event.target.value = ''
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </>
          )}
          {isChamber && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chamber-country">所属国家或地区代码</Label>
                  <CountrySelect value={countryCode} onValueChange={setCountryCode} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>商会 Logo</Label>
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3">
                  <span className="text-sm text-muted-foreground">{logoUrl ? 'Logo 已上传' : '尚未上传 Logo'}</span>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
                    {uploadingLogo
                      ? <LoaderCircle className="h-4 w-4 animate-spin" />
                      : <ImagePlus className="h-4 w-4" />}
                    {uploadingLogo ? '上传中' : logoUrl ? '更换图片' : '上传图片'}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setUploadingLogo(true)
                        try {
                          setLogoUrl(await uploadManagementMedia(file, 'chamber'))
                          toast.success('商会 Logo 已上传')
                        } catch (nextError) {
                          toast.error(nextError instanceof Error ? nextError.message : '图片上传失败')
                        } finally {
                          setUploadingLogo(false)
                          event.target.value = ''
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chamber-founded-on">成立日期</Label>
                  <DateTimeField
                    id="chamber-founded-on"
                    type="date"
                    value={foundedOn}
                    onValueChange={setFoundedOn}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-registered-place">登记注册地</Label>
                <Input
                  id="chamber-registered-place"
                  value={registeredPlace}
                  onChange={(event) => setRegisteredPlace(event.target.value)}
                  placeholder="请输入登记机关所在地区或注册地"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-address">办公地址</Label>
                <Input
                  id="chamber-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="请输入详细办公地址"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chamber-phone">联系电话</Label>
                  <Input
                    id="chamber-phone"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="请输入联系电话"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chamber-email">联系邮箱</Label>
                  <Input
                    id="chamber-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-website">官方网站</Label>
                <Input
                  id="chamber-website"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-intro">商会简介</Label>
                <Textarea id="chamber-intro" rows={5} value={introduction} onChange={(event) => setIntroduction(event.target.value)} />
              </div>
            </>
          )}
          {isPartner && (
            <>
              <div className="space-y-2">
                <Label>合作伙伴标识</Label>
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3">
                  <span className="text-sm text-muted-foreground">{logoUrl ? '标识图片已上传' : '尚未上传标识图片'}</span>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
                    {uploadingLogo
                      ? <LoaderCircle className="h-4 w-4 animate-spin" />
                      : <ImagePlus className="h-4 w-4" />}
                    {uploadingLogo ? '上传中' : logoUrl ? '更换图片' : '上传图片'}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setUploadingLogo(true)
                        try {
                          setLogoUrl(await uploadManagementMedia(file, 'cms'))
                          toast.success('合作伙伴标识已上传')
                        } catch (nextError) {
                          toast.error(nextError instanceof Error ? nextError.message : '图片上传失败')
                        } finally {
                          setUploadingLogo(false)
                          event.target.value = ''
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>合作伙伴类型</Label>
                  <Select value={partnerCategory} onValueChange={setPartnerCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government">政府机构</SelectItem>
                      <SelectItem value="association">商协会</SelectItem>
                      <SelectItem value="enterprise">企业</SelectItem>
                      <SelectItem value="education">教育机构</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-website">官网地址</Label>
                  <Input
                    id="partner-website"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </>
          )}
          {isCategory && (
            <>
              <div className="space-y-2">
                <Label htmlFor="record-parent">上级分类</Label>
                <Select value={parent} onValueChange={setParent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无（作为一级分类）</SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>{option.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="record-link">分类标识</Label>
                <Input
                  id="record-link"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="例如：cross-border-service"
                />
                <p className="text-xs text-muted-foreground">仅支持小写字母、数字和中划线，创建后用于稳定链接。</p>
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="record-sort">排序</Label>
              <Input id="record-sort" type="number" value={sort} onChange={(event) => setSort(event.target.value)} />
            </div>
            {!isChamber && (
              <div className="space-y-2">
                <Label>启用状态</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {isChamber && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-h-20 items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <Label htmlFor="chamber-featured">首页重点展示</Label>
                  <p className="mt-1 text-xs text-muted-foreground">开启后可进入前台重点商会推荐位。</p>
                </div>
                <Switch id="chamber-featured" checked={featured} onCheckedChange={setFeatured} />
              </div>
              <div className="flex min-h-20 items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div>
                  <Label>使用状态</Label>
                  <p className="mt-1 text-xs text-muted-foreground">禁用后不再对外展示，但仍可管理资料和管理员。</p>
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void save()}>
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {initial ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InquiryScreen({ config, resource }: { config: ModuleConfig; resource: string }) {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<ScaffoldedRecord | null>(null)
  const [nextStatus, setNextStatus] = useState('processing')
  const [followUpNote, setFollowUpNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (cursor?: string | null) => {
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listScaffoldedRecords(resource, { keyword, status: statusFilter, cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.next_cursor)
    } catch (nextError) {
      if (append) {
        toast.error(nextError instanceof Error ? nextError.message : '加载更多失败，请稍后重试')
      } else {
        setError(nextError)
      }
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }, [keyword, resource, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function exportRecords() {
    try {
      await exportScaffoldedRecords(resource, keyword ? { keyword } : {})
      toast.success('线索已导出')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '导出失败，请稍后重试')
    }
  }

  async function updateInquiry(item: ScaffoldedRecord, status = nextStatus) {
    setSubmitting(true)
    try {
      const updated = await actOnScaffoldedRecord(resource, item.id, 'update', {
        status,
        follow_up_note: followUpNote.trim() || null,
        expected_version: item.version,
        __item: item,
      })
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
      setSelected(null)
      setFollowUpNote('')
      toast.success('线索处理状态已更新')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '更新失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 xl:flex-row">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full xl:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部处理状态</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
              <SelectItem value="processing">跟进中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="invalid">无效线索</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="姓名 / 联系方式 / 公司"
            className="xl:max-w-xs"
          />
          <Button variant="outline" onClick={() => void load()}>
            <Search className="h-4 w-4" />
            查询
          </Button>
          <Button className="xl:ml-auto" variant="outline" onClick={() => void exportRecords()}>
            <Download className="h-4 w-4" />
            导出 CSV
          </Button>
        </CardContent>
      </Card>
      <EmptyTable
        config={config}
        items={items}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={Boolean(nextCursor)}
        error={error}
        onRetry={() => void load()}
        onLoadMore={() => void load(nextCursor)}
        onEdit={(item) => {
          setSelected(item)
          setNextStatus(item.status === 'completed' ? 'completed' : 'processing')
        }}
        onStatusAction={(item) => void updateInquiry(item, item.status === 'completed' ? 'processing' : 'completed')}
      />
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>线索详情与跟进</DialogTitle>
            <DialogDescription>查看提交信息并记录本次处理结果。</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">当前状态</dt><dd className="mt-1">{legacyStatusLabel(selected.status)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">联系方式</dt><dd className="mt-1">{String(selected.raw?.masked_contact ?? selected.raw?.contact ?? '—')}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">联系人或主题</dt><dd className="mt-1 font-medium">{selected.title}</dd></div>
                <div><dt className="text-xs text-muted-foreground">公司</dt><dd className="mt-1">{String(selected.raw?.company_name ?? '—')}</dd></div>
                <div><dt className="text-xs text-muted-foreground">合作方向</dt><dd className="mt-1">{String(selected.raw?.direction ?? '—')}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">咨询内容</dt><dd className="mt-1 whitespace-pre-wrap">{String(selected.raw?.message ?? '—')}</dd></div>
              </dl>
              <div className="space-y-2">
                <Label>处理状态</Label>
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="processing">跟进中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="invalid">无效线索</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inquiry-follow-up">跟进记录</Label>
                <Textarea
                  id="inquiry-follow-up"
                  value={followUpNote}
                  onChange={(event) => setFollowUpNote(event.target.value)}
                  rows={4}
                  placeholder="记录沟通结果、下一步和负责人"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
            <Button disabled={submitting || !selected} onClick={() => selected && void updateInquiry(selected)}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存处理结果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SettingsScreen({ resource: _resource }: { resource: string }) {
  const [tab, setTab] = useState<SiteConfigResponse['section']>('basic')
  const [config, setConfig] = useState<SiteConfigResponse | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [uploadingSiteLogo, setUploadingSiteLogo] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadSettings = useCallback(async (section: SiteConfigResponse['section']) => {
    setLoading(true)
    try {
      const result = await getSiteConfig(section)
      setConfig(result)
      const payload = result?.payload ?? {}
      setValues(Object.fromEntries(Object.entries(payload).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join('、') : value == null ? '' : String(value),
      ])))
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '站点配置加载失败')
      setConfig(null)
      setValues({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings(tab)
  }, [loadSettings, tab])

  function field(name: string) {
    return {
      value: values[name] ?? '',
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValues((current) => ({ ...current, [name]: event.target.value }))
      },
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      let payload: Record<string, unknown>
      if (tab === 'basic') {
        if (!values.site_name?.trim()) throw new Error('站点名称不能为空')
        payload = {
          site_name: values.site_name.trim(),
          description: values.description?.trim() ?? '',
          logo_url: values.logo_url?.trim() || null,
          icp_number: values.icp_number?.trim() || null,
          copyright: values.copyright?.trim() || null,
        }
      } else if (tab === 'seo') {
        if (!values.title?.trim()) throw new Error('默认页面标题不能为空')
        payload = {
          title: values.title.trim(),
          keywords: (values.keywords ?? '').split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
          description: values.description?.trim() ?? '',
        }
      } else if (tab === 'contact') {
        payload = {
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          address: values.address?.trim() || null,
        }
      } else {
        payload = {
          wechat: values.wechat?.trim() || null,
          weibo_url: values.weibo_url?.trim() || null,
        }
      }
      const result = await updateSiteConfig(tab, payload)
      setConfig(result)
      toast.success('站点配置已保存')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function uploadSiteLogo(file: File) {
    setUploadingSiteLogo(true)
    try {
      const logoUrl = await uploadManagementMedia(file, 'cms')
      setValues((current) => ({ ...current, logo_url: logoUrl }))
      toast.success('站点 Logo 已上传，请保存配置')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '站点 Logo 上传失败')
    } finally {
      setUploadingSiteLogo(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={(value) => setTab(value as SiteConfigResponse['section'])} className="w-full">
            <div className="border-b px-5 pt-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="basic">基础信息</TabsTrigger>
                <TabsTrigger value="seo">搜索展示</TabsTrigger>
                <TabsTrigger value="contact">联系方式</TabsTrigger>
                <TabsTrigger value="social">社交媒体</TabsTrigger>
              </TabsList>
            </div>
            <form className="max-w-3xl p-5" onSubmit={(event) => void saveSettings(event)}>
              {loading && (
                <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  正在读取当前配置…
                </div>
              )}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">站点名称</Label>
                  <Input id="site-name" {...field('site_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-description">站点简介</Label>
                  <Textarea id="site-description" rows={4} {...field('description')} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>站点 Logo</Label>
                    <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3">
                      <span className="text-sm text-muted-foreground">
                        {values.logo_url ? 'Logo 已上传' : '尚未上传 Logo'}
                      </span>
                      <div className="flex items-center gap-2">
                        {values.logo_url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={uploadingSiteLogo || submitting}
                            onClick={() => setValues((current) => ({ ...current, logo_url: '' }))}
                          >
                            移除
                          </Button>
                        ) : null}
                        <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
                          {uploadingSiteLogo
                            ? <LoaderCircle className="h-4 w-4 animate-spin" />
                            : <ImagePlus className="h-4 w-4" />}
                          {uploadingSiteLogo ? '上传中' : values.logo_url ? '更换图片' : '上传图片'}
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/*"
                            disabled={uploadingSiteLogo || submitting}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void uploadSiteLogo(file)
                              event.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">建议使用透明背景的 PNG 或 SVG 图片。</p>
                  </div>
                  <div className="space-y-2"><Label htmlFor="site-icp">备案号</Label><Input id="site-icp" {...field('icp_number')} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="site-copyright">版权信息</Label><Input id="site-copyright" {...field('copyright')} /></div>
                </div>
              </TabsContent>
              <TabsContent value="seo" className="mt-0 space-y-4">
                <div className="space-y-2"><Label htmlFor="seo-title">默认页面标题</Label><Input id="seo-title" {...field('title')} /></div>
                <div className="space-y-2"><Label htmlFor="seo-keywords">关键词</Label><Input id="seo-keywords" {...field('keywords')} placeholder="华盟、东盟、企业服务" /></div>
                <div className="space-y-2"><Label htmlFor="seo-description">搜索摘要</Label><Textarea id="seo-description" {...field('description')} rows={4} /></div>
              </TabsContent>
              <TabsContent value="contact" className="mt-0 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="site-phone">联系电话</Label><Input id="site-phone" {...field('phone')} /></div>
                <div className="space-y-2"><Label htmlFor="site-email">联系邮箱</Label><Input id="site-email" {...field('email')} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="site-address">联系地址</Label><Input id="site-address" {...field('address')} /></div>
              </TabsContent>
              <TabsContent value="social" className="mt-0 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="site-wechat">微信公众号</Label><Input id="site-wechat" {...field('wechat')} /></div>
                <div className="space-y-2"><Label htmlFor="site-weibo">微博主页</Label><Input id="site-weibo" {...field('weibo_url')} placeholder="https://weibo.com/..." /></div>
              </TabsContent>
              <div className="mt-6 flex justify-end gap-2 border-t pt-5">
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  保存配置
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}

function GenericLegacyModuleScreen({ module }: { module: string }) {
  const params = { module }
  const config = moduleConfig[params.module] ?? {
    title: '华盟在线',
    description: '管理华盟在线业务内容。',
    noun: '业务内容',
    kind: 'content' as const,
    eyebrow: '华盟在线',
    primaryAction: '新建内容',
    filters: ['发布状态'],
    columns: ['名称', '状态', '更新时间', '操作'],
  }
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<ScaffoldedRecord | null>(null)
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [adminChamber, setAdminChamber] = useState<ScaffoldedRecord | null>(null)
  const [adminView, setAdminView] = useState<'list' | 'detail' | 'create' | 'created'>('list')
  const [adminItems, setAdminItems] = useState<StaffAssignmentDto[]>([])
  const [adminListLoading, setAdminListLoading] = useState(false)
  const [adminListLoadingMore, setAdminListLoadingMore] = useState(false)
  const [adminListError, setAdminListError] = useState<unknown>(null)
  const [adminNextCursor, setAdminNextCursor] = useState<string | null>(null)
  const [adminKeywordDraft, setAdminKeywordDraft] = useState('')
  const [adminKeyword, setAdminKeyword] = useState('')
  const [adminStatus, setAdminStatus] = useState<'active' | 'revoked' | 'all'>('all')
  const [adminDetail, setAdminDetail] = useState<StaffAssignmentDto | null>(null)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [createdAdmin, setCreatedAdmin] = useState<StaffAssignmentDto | null>(null)
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const resource = `management/legacy/${encodeURIComponent(params.module)}`
  const isContent = config.kind === 'content' || config.kind === 'catalog'
  const icon = useMemo(
    () => config.kind === 'settings'
      ? Settings2
      : config.kind === 'inquiry'
        ? ListFilter
        : config.kind === 'dictionary'
          ? Globe2
          : Boxes,
    [config.kind],
  )

  const load = useCallback(async (cursor?: string | null) => {
    if (params.module === 'home' || config.kind === 'settings' || config.kind === 'inquiry') return
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listScaffoldedRecords(resource, { keyword, status, cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.next_cursor)
    } catch (nextError) {
      if (append) {
        toast.error(nextError instanceof Error ? nextError.message : '加载更多失败，请稍后重试')
      } else {
        setError(nextError)
      }
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }, [config.kind, keyword, params.module, resource, status])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setSelected(null)
    setFormOpen(true)
  }

  function generateAdminPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*'
    const values = crypto.getRandomValues(new Uint32Array(14))
    return `Hm!8${[...values].map((value) => chars[value % chars.length]).join('')}`
  }

  async function loadChamberAdmins(
    chamber: ScaffoldedRecord,
    options: {
      keyword?: string
      status?: 'active' | 'revoked' | 'all'
      cursor?: string | null
    } = {},
  ) {
    const cursor = options.cursor ?? null
    const append = Boolean(cursor)
    append ? setAdminListLoadingMore(true) : setAdminListLoading(true)
    if (!append) setAdminListError(null)
    try {
      const result = await listChamberAdminAccounts(chamber.id, {
        keyword: options.keyword ?? adminKeyword,
        status: options.status ?? adminStatus,
        cursor,
        limit: 20,
      })
      setAdminItems((current) => append ? [...current, ...result.items] : result.items)
      setAdminNextCursor(result.page.next_cursor ?? null)
    } catch (nextError) {
      if (append) {
        toast.error(nextError instanceof Error ? nextError.message : '管理员下一页加载失败')
      } else {
        setAdminListError(nextError)
      }
    } finally {
      append ? setAdminListLoadingMore(false) : setAdminListLoading(false)
    }
  }

  function openAdminDialog(chamber: ScaffoldedRecord) {
    setAdminChamber(chamber)
    setAdminView('list')
    setAdminDetail(null)
    setAdminKeywordDraft('')
    setAdminKeyword('')
    setAdminStatus('all')
    setAdminItems([])
    setAdminNextCursor(null)
    void loadChamberAdmins(chamber, { keyword: '', status: 'all' })
  }

  function openCreateAdminDialog() {
    setAdminUsername('')
    setAdminName('')
    setAdminPhone('')
    setAdminPassword(generateAdminPassword())
    setCreatedAdmin(null)
    setAdminView('create')
  }

  async function submitChamberAdmin() {
    if (!adminChamber) return
    if (!/^[A-Za-z][A-Za-z0-9._-]{3,31}$/.test(adminUsername.trim())) {
      toast.error('登录账号需以字母开头，使用 4–32 位字母、数字、点、下划线或中划线')
      return
    }
    if (!adminName.trim() || adminPassword.length < 12) {
      toast.error('请填写姓名，并使用至少 12 位的初始密码')
      return
    }
    setAdminSubmitting(true)
    try {
      const result = await createChamberAdminAccount(adminChamber.id, {
        username: adminUsername.trim(),
        display_name: adminName.trim(),
        initial_password: adminPassword,
        phone: adminPhone.trim() || null,
        country_code: 'CN',
        title: '商会管理员',
      })
      setCreatedAdmin(result)
      setAdminItems((current) => [
        result,
        ...current.filter((item) => item.staff_assignment_id !== result.staff_assignment_id),
      ])
      setAdminView('created')
      toast.success('商会管理员账号已创建')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '商会管理员创建失败')
    } finally {
      setAdminSubmitting(false)
    }
  }

  function openEdit(item: ScaffoldedRecord) {
    setSelected(item)
    setFormOpen(true)
  }

  function onSaved(item: ScaffoldedRecord) {
    setItems((current) => current.some((entry) => entry.id === item.id)
      ? current.map((entry) => entry.id === item.id ? item : entry)
      : [item, ...current])
  }

  async function changeStatus(item: ScaffoldedRecord) {
    const action = isEnabledRecord(item) ? 'disable' : 'enable'
    try {
      const updated = await actOnScaffoldedRecord(resource, item.id, action, {
        expected_version: item.version,
        __item: item,
      })
      onSaved(updated)
      toast.success(
        action === 'disable'
          ? `${config.noun}${config.kind === 'organization' ? '已禁用' : '已停用'}`
          : `${config.noun}${config.kind === 'organization' || config.kind === 'dictionary' ? '已启用' : '已发布'}`,
      )
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '操作失败，请稍后重试')
    }
  }

  if (params.module === 'home') {
    return <HomeCurationScreen />
  }

  return (
    <div>
      <PageHeading
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        icon={icon}
        action={config.primaryAction ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {config.primaryAction}
          </Button>
        ) : undefined}
      />

      {config.kind === 'settings' ? (
        <SettingsScreen resource={resource} />
      ) : config.kind === 'inquiry' ? (
        <InquiryScreen config={config} resource={resource} />
      ) : (
        <>
          <FilterBar
            config={config}
            keyword={keyword}
            status={status}
            onKeywordChange={setKeyword}
            onStatusChange={setStatus}
            onSearch={() => void load()}
          />
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5" />
              支持按名称和业务状态筛选
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              默认按更新时间倒序
            </span>
          </div>
          <EmptyTable
            config={config}
            items={items}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={Boolean(nextCursor)}
            error={error}
            onRetry={() => void load()}
            onLoadMore={() => void load(nextCursor)}
            onEdit={openEdit}
            onStatusAction={(item) => void changeStatus(item)}
            onManageAdmins={config.kind === 'organization' ? openAdminDialog : undefined}
          />
        </>
      )}

      {isContent ? (
        <ContentForm
          config={config}
          open={formOpen}
          onOpenChange={setFormOpen}
          resource={resource}
          initial={selected}
          onSaved={onSaved}
        />
      ) : (
        <RecordForm
          config={config}
          open={formOpen}
          onOpenChange={setFormOpen}
          resource={resource}
          initial={selected}
          onSaved={onSaved}
        />
      )}

      <Dialog open={Boolean(adminChamber)} onOpenChange={(open) => {
        if (!open) {
          setAdminChamber(null)
          setCreatedAdmin(null)
          setAdminDetail(null)
        }
      }}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {adminView === 'list'
                ? `${adminChamber?.title ?? '商会'}管理员`
                : adminView === 'detail'
                  ? '管理员详情'
                  : adminView === 'created'
                    ? '商会管理员已创建'
                    : '添加商会管理员'}
            </DialogTitle>
            <DialogDescription>
              {adminView === 'list'
                ? '查看该商会下的全部后台管理员，支持按姓名、账号、手机号和状态筛选。'
                : adminView === 'detail'
                  ? '查看管理员账号、登录状态和使用记录。'
                  : adminView === 'created'
                    ? `账号已归属到${adminChamber?.title ?? '所选商会'}，首次登录必须修改初始密码。`
                    : `为${adminChamber?.title ?? '所选商会'}直接创建可用的后台管理员账号。`}
            </DialogDescription>
          </DialogHeader>
          {adminView === 'list' ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border bg-muted/10 p-3 sm:grid-cols-[minmax(220px,1fr)_160px_auto]">
                <Input
                  value={adminKeywordDraft}
                  onChange={(event) => setAdminKeywordDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && adminChamber) {
                      const nextKeyword = adminKeywordDraft.trim()
                      setAdminKeyword(nextKeyword)
                      void loadChamberAdmins(adminChamber, { keyword: nextKeyword, status: adminStatus })
                    }
                  }}
                  placeholder="搜索姓名、登录账号或手机号"
                />
                <Select
                  value={adminStatus}
                  onValueChange={(value) => {
                    const nextStatus = value as 'active' | 'revoked' | 'all'
                    setAdminStatus(nextStatus)
                    if (adminChamber) void loadChamberAdmins(adminChamber, { keyword: adminKeyword, status: nextStatus })
                  }}
                >
                  <SelectTrigger aria-label="管理员状态"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="revoked">已撤销</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      if (!adminChamber) return
                      const nextKeyword = adminKeywordDraft.trim()
                      setAdminKeyword(nextKeyword)
                      void loadChamberAdmins(adminChamber, { keyword: nextKeyword, status: adminStatus })
                    }}
                  >
                    <Search className="h-4 w-4" />查询
                  </Button>
                  <Button onClick={openCreateAdminDialog}><Plus className="h-4 w-4" />新增管理员</Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                        <th className="px-4 py-3 font-medium">管理员</th>
                        <th className="px-4 py-3 font-medium">登录账号</th>
                        <th className="px-4 py-3 font-medium">状态</th>
                        <th className="px-4 py-3 font-medium">最近活跃</th>
                        <th className="px-4 py-3 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {adminItems.map((item) => (
                        <tr key={item.staff_assignment_id} className="text-sm transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4 font-medium">{item.display_name}</td>
                          <td className="px-4 py-4">
                            <p className="font-data">{item.username}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.masked_phone || '未绑定手机号'}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full border px-2 py-1 text-xs">
                              {item.status === 'active' ? '正常' : '已撤销'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{staffDateTime(item.last_active_at)}</td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAdminDetail(item)
                                setAdminView('detail')
                              }}
                            >
                              <Eye className="h-4 w-4" />查看详情
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {adminListLoading ? (
                  <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-ember-600" /></div>
                ) : adminListError ? (
                  <div className="grid min-h-48 place-items-center p-6 text-center">
                    <div>
                      <p className="font-medium">管理员列表加载失败</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {adminListError instanceof Error ? adminListError.message : '服务暂时不可用'}
                      </p>
                      <Button
                        className="mt-3"
                        variant="outline"
                        onClick={() => adminChamber && void loadChamberAdmins(adminChamber)}
                      >
                        重新加载
                      </Button>
                    </div>
                  </div>
                ) : adminItems.length === 0 ? (
                  <div className="grid min-h-48 place-items-center p-6 text-center">
                    <div>
                      <p className="font-medium">暂无管理员</p>
                      <p className="mt-2 text-sm text-muted-foreground">可新增该商会的第一个后台管理员。</p>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                  <span>当前显示 {adminItems.length} 人</span>
                  {adminNextCursor && adminChamber && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={adminListLoadingMore}
                      onClick={() => void loadChamberAdmins(adminChamber, { cursor: adminNextCursor })}
                    >
                      {adminListLoadingMore && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}加载更多
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : adminView === 'detail' && adminDetail ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-ember-100 bg-ember-50 text-lg font-semibold text-ember-700">
                  {adminDetail.display_name.slice(0, 1)}
                </span>
                <div>
                  <p className="font-semibold">{adminDetail.display_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">商会管理员 · {adminDetail.status === 'active' ? '正常' : '已撤销'}</p>
                </div>
              </div>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">登录账号</dt><dd className="font-data mt-1 text-sm">{adminDetail.username}</dd></div>
                <div><dt className="text-xs text-muted-foreground">登录手机号</dt><dd className="mt-1 text-sm">{adminDetail.masked_phone || '未绑定手机号'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">岗位</dt><dd className="mt-1 text-sm">{adminDetail.title}</dd></div>
                <div><dt className="text-xs text-muted-foreground">密码状态</dt><dd className="mt-1 text-sm">{adminDetail.must_change_password ? '首次登录需修改密码' : '正常'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">创建时间</dt><dd className="mt-1 text-sm">{staffDateTime(adminDetail.joined_at)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">最近活跃</dt><dd className="mt-1 text-sm">{staffDateTime(adminDetail.last_active_at)}</dd></div>
              </dl>
              <div className="rounded-lg border bg-muted/15 p-4">
                <p className="text-xs text-muted-foreground">管理范围</p>
                <p className="mt-2 text-sm">所属商会全部后台管理功能</p>
              </div>
            </div>
          ) : adminView === 'created' && createdAdmin ? (
            <div className="rounded-lg border border-ember-200 bg-ember-50/55 p-4">
              <p className="text-sm font-semibold">{createdAdmin.display_name}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>登录账号</Label>
                  <Input className="mt-2 font-data" readOnly value={createdAdmin.username} />
                </div>
                <div>
                  <Label>初始密码</Label>
                  <Input className="mt-2 font-data" readOnly value={adminPassword} />
                </div>
              </div>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(`登录账号：${createdAdmin.username}\n初始密码：${adminPassword}`)
                  toast.success('登录信息已复制')
                }}
              >
                <Copy className="h-4 w-4" />复制登录信息
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">关闭弹窗后，初始密码不会再次显示。</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chamber-admin-name">姓名</Label>
                <Input id="chamber-admin-name" value={adminName} onChange={(event) => setAdminName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-admin-username">登录账号</Label>
                <Input id="chamber-admin-username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} placeholder="例如 jsasean.admin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-admin-phone">手机号（选填）</Label>
                <Input id="chamber-admin-phone" value={adminPhone} onChange={(event) => setAdminPhone(event.target.value)} placeholder="18800001009" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-admin-password">初始密码</Label>
                <div className="flex gap-2">
                  <Input id="chamber-admin-password" className="font-data" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
                  <Button type="button" size="icon" variant="outline" onClick={() => setAdminPassword(generateAdminPassword())} aria-label="重新生成初始密码">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {adminView === 'list' ? (
              <Button variant="outline" onClick={() => setAdminChamber(null)}>关闭</Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setAdminDetail(null)
                  setCreatedAdmin(null)
                  setAdminView('list')
                }}
              >
                返回管理员列表
              </Button>
            )}
            {adminView === 'create' && (
              <Button disabled={adminSubmitting} onClick={() => void submitChamberAdmin()}>
                {adminSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}创建管理员
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function LegacyModuleScreen() {
  const params = useParams<{ module: string }>()
  return isOperationalModule(params.module)
    ? <OperationalModuleScreen module={params.module} />
    : <GenericLegacyModuleScreen module={params.module} />
}
