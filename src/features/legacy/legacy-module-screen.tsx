'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Archive,
  ArrowUpDown,
  Boxes,
  Copy,
  Download,
  FilePenLine,
  Filter,
  Globe2,
  ImagePlus,
  KeyRound,
  ListFilter,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnScaffoldedRecord,
  actOnSiteConfig,
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
import { createChamberAdminAccount } from '@/api/client/management'
import type { StaffAssignmentDto } from '@/api/generated/huameng-platform'
import { PageHeading } from '@/components/management/page-heading'
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

function legacyStatusLabel(status: string) {
  return legacyStatusLabels[status] ?? '待确认'
}

function isEnabledRecord(item: ScaffoldedRecord) {
  return item.status === 'published' || item.status === 'active'
}

function recordActionLabel(config: ModuleConfig, item: ScaffoldedRecord) {
  if (config.kind === 'inquiry') return item.status === 'completed' ? '重新跟进' : '标记完成'
  if (config.kind === 'organization' && item.status === 'suspended') return '恢复'
  if (isEnabledRecord(item)) {
    if (config.kind === 'organization') return '撤回'
    if (config.kind === 'content' || config.kind === 'catalog') return '下架'
    return '停用'
  }
  if (config.kind === 'organization' || config.kind === 'content' || config.kind === 'catalog') return '发布'
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
    if (raw.logo_access_url) return '图片可用'
    return raw.logo_url ? '需重新上传' : '未上传'
  }
  if (column.includes('旗帜')) {
    if (raw.flag_access_url) return '图片可用'
    return raw.flag_url ? '需重新上传' : '未上传'
  }
  if (column.includes('重点展示')) return raw.is_featured === true ? '是' : '否'
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
  onCreate,
  onRetry,
  onLoadMore,
  onEdit,
  onStatusAction,
  onOrganizationAction,
  onManageAdmins,
}: {
  config: ModuleConfig
  items: ScaffoldedRecord[]
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  error: unknown
  onCreate?: () => void
  onRetry: () => void
  onLoadMore?: () => void
  onEdit: (item: ScaffoldedRecord) => void
  onStatusAction: (item: ScaffoldedRecord) => void
  onOrganizationAction?: (item: ScaffoldedRecord, action: 'suspend' | 'close') => void
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
                          ? <span className="rounded-full border px-2 py-1 text-xs">{legacyStatusLabel(item.status)}</span>
                          : column === '操作'
                            ? (
                              <div className="flex justify-end gap-1">
                                {config.kind === 'organization' && onManageAdmins && (
                                  <Button size="sm" variant="ghost" onClick={() => onManageAdmins(item)}>
                                    <UserPlus className="h-3.5 w-3.5" />
                                    管理员
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                                  {config.kind === 'inquiry' ? '跟进' : '编辑'}
                                </Button>
                                {item.status !== 'closed' && (
                                  <Button size="sm" variant="ghost" onClick={() => onStatusAction(item)}>
                                    {recordActionLabel(config, item)}
                                  </Button>
                                )}
                                {config.kind === 'organization' && item.status === 'active' && onOrganizationAction && (
                                  <Button size="sm" variant="ghost" onClick={() => onOrganizationAction(item, 'suspend')}>
                                    暂停
                                  </Button>
                                )}
                                {config.kind === 'organization' && item.status !== 'closed' && onOrganizationAction && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-700 hover:text-red-700"
                                    onClick={() => onOrganizationAction(item, 'close')}
                                  >
                                    关闭
                                  </Button>
                                )}
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
              没有符合当前筛选条件的记录。你可以调整筛选条件或新建{config.noun}。
            </p>
            {onCreate && (
              <Button className="mt-4" variant="outline" onClick={onCreate}>
                <FilePenLine className="h-4 w-4" />
                检查新建表单
              </Button>
            )}
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
        { value: 'active', label: '正常运营' },
        { value: 'draft', label: '草稿' },
        { value: 'suspended', label: '已暂停' },
        { value: 'closed', label: '已关闭' },
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
      const existingCoverUrl = initial?.raw?.cover_access_url
        ? initial.raw.cover_url
        : null
      const existingImageUrls = Array.isArray(initial?.raw?.image_urls)
        && Array.isArray(initial?.raw?.image_access_urls)
        ? initial.raw.image_urls.filter((_, index) => Boolean((initial.raw?.image_access_urls as unknown[])[index]))
        : []
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
            {Boolean(initial?.raw?.cover_url) && !initial?.raw?.cover_access_url && images.length === 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                原封面媒体已失效，请重新上传封面。若直接保存，系统会清理失效引用，避免后续内容更新失败。
              </p>
            )}
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
                <Input
                  id="legacy-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="两位代码，例如：TH"
                  maxLength={2}
                />
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
  const [displayName, setDisplayName] = useState('')
  const [englishName, setEnglishName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [registeredName, setRegisteredName] = useState('')
  const [foundedOn, setFoundedOn] = useState('')
  const [registeredPlace, setRegisteredPlace] = useState('')
  const [address, setAddress] = useState('')
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
  const expiredExistingMedia = Boolean(
    initial && (
      isCountry
        ? initial.raw?.flag_url && !initial.raw?.flag_access_url
        : initial.raw?.logo_url && !initial.raw?.logo_access_url
    ),
  )

  useEffect(() => {
    if (!open) return
    setName(String(initial?.raw?.legal_name ?? initial?.title ?? ''))
    setDisplayName(String(initial?.raw?.display_name ?? initial?.title ?? ''))
    setEnglishName(initial?.subtitle ?? '')
    setCountryCode(initial?.country ?? '')
    setLogoUrl(initial?.raw?.logo_access_url ? String(initial.raw.logo_url ?? '') : '')
    setRegisteredName(String(initial?.raw?.registered_name ?? ''))
    setFoundedOn(String(initial?.raw?.founded_on ?? ''))
    setRegisteredPlace(String(initial?.raw?.registered_place ?? ''))
    setAddress(String(initial?.raw?.address ?? ''))
    setIntroduction(String(initial?.raw?.description ?? ''))
    setParent(String(initial?.raw?.parent_id ?? 'none'))
    setLink(String(
      initial?.raw?.website_url
        ?? initial?.raw?.slug
        ?? (initial?.raw?.flag_access_url ? initial.raw.flag_url : '')
        ?? '',
    ))
    setPartnerCategory(String(initial?.raw?.category ?? 'enterprise'))
    setSort(String(initial?.sort ?? 0))
    setStatus(initial?.status ?? 'active')
    setFeatured(initial?.raw?.is_featured === true)
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
    if (isChamber && !displayName.trim()) {
      toast.error('请填写商会展示名称')
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
        display_name: displayName.trim() || null,
        subtitle: englishName.trim() || null,
        country: countryCode.trim().toUpperCase() || null,
        logo_url: logoUrl.trim() || null,
        registered_name: registeredName.trim() || null,
        founded_on: foundedOn || null,
        registered_place: registeredPlace.trim() || null,
        address: address.trim() || null,
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
              ? initial
                ? '修改商会主体资料。发布、停用等状态操作请在列表中单独完成。'
                : '按主体登记信息创建商会；创建后为草稿，可在资料确认无误后发布。'
              : '请按页面字段填写完整资料，保存后可在列表中继续管理状态。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="record-name">
              {isCountry ? '中文名称' : isChamber ? '法定名称' : `${config.noun}名称`}
            </Label>
            <Input
              id="record-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isChamber ? '请输入登记的商会全称' : `请输入${config.noun}名称`}
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
                {expiredExistingMedia && !link && (
                  <p className="text-xs leading-5 text-amber-700">原旗帜图片已失效，请重新上传；保存时会清理失效引用。</p>
                )}
              </div>
            </>
          )}
          {isChamber && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chamber-display-name">展示名称</Label>
                  <Input
                    id="chamber-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="用于网站和后台展示"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chamber-country">所属国家或地区代码</Label>
                  <Input
                    id="chamber-country"
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    placeholder="例如：CN"
                    maxLength={2}
                  />
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
                {expiredExistingMedia && !logoUrl && (
                  <p className="text-xs leading-5 text-amber-700">原 Logo 媒体已失效，请重新上传；保存时会清理失效引用。</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chamber-registered-name">登记名称</Label>
                  <Input
                    id="chamber-registered-name"
                    value={registeredName}
                    onChange={(event) => setRegisteredName(event.target.value)}
                    placeholder="如与法定名称一致可不填"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chamber-founded-on">成立日期</Label>
                  <Input
                    id="chamber-founded-on"
                    type="date"
                    value={foundedOn}
                    onChange={(event) => setFoundedOn(event.target.value)}
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
                {expiredExistingMedia && !logoUrl && (
                  <p className="text-xs leading-5 text-amber-700">原标识媒体已失效，请重新上传后再保存，避免继续引用不可用图片。</p>
                )}
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
            {isChamber ? (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <Label htmlFor="chamber-featured">首页重点展示</Label>
                  <p className="mt-1 text-xs text-muted-foreground">开启后可进入前台重点商会推荐位。</p>
                </div>
                <Switch id="chamber-featured" checked={featured} onCheckedChange={setFeatured} />
              </div>
            ) : (
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
      const result = await updateSiteConfig(tab, payload, config?.version ?? 0)
      setConfig(result)
      toast.success('站点配置草稿已保存')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function publicationAction(action: 'publish' | 'withdraw') {
    if (!config) {
      toast.error('请先保存当前配置')
      return
    }
    setSubmitting(true)
    try {
      const result = await actOnSiteConfig(tab, {
        action,
        expected_version: config.version,
      })
      setConfig(result)
      toast.success(action === 'publish' ? '站点配置已发布' : '站点配置已撤回')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '发布状态更新失败')
      await loadSettings(tab)
    } finally {
      setSubmitting(false)
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
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>草稿版本 {config?.version ?? 0}</span>
                <span>·</span>
                <span>当前修订 {config?.current_revision ?? 0}</span>
                <span>·</span>
                <span>{config?.published_revision ? `已发布修订 ${config.published_revision}` : '尚未发布'}</span>
              </div>
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
                  <div className="space-y-2"><Label htmlFor="site-logo">站点 Logo 媒体地址</Label><Input id="site-logo" {...field('logo_url')} placeholder="hoge-media://hma_xxx" /></div>
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
                {config?.published_revision ? (
                  <Button type="button" variant="outline" disabled={submitting} onClick={() => void publicationAction('withdraw')}>撤回发布</Button>
                ) : null}
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  保存配置
                </Button>
                <Button type="button" disabled={submitting || !config} onClick={() => void publicationAction('publish')}>发布当前修订</Button>
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
  const [organizationAction, setOrganizationAction] = useState<{
    item: ScaffoldedRecord
    action: 'suspend' | 'close'
  } | null>(null)
  const [organizationReason, setOrganizationReason] = useState('')
  const [organizationSubmitting, setOrganizationSubmitting] = useState(false)
  const [adminChamber, setAdminChamber] = useState<ScaffoldedRecord | null>(null)
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

  function openAdminDialog(chamber: ScaffoldedRecord) {
    setAdminChamber(chamber)
    setAdminUsername('')
    setAdminName('')
    setAdminPhone('')
    setAdminPassword(generateAdminPassword())
    setCreatedAdmin(null)
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
    const action = config.kind === 'organization' && item.status === 'suspended'
      ? 'restore'
      : isEnabledRecord(item)
        ? 'disable'
        : 'enable'
    try {
      const updated = await actOnScaffoldedRecord(resource, item.id, action, {
        expected_version: item.version,
        __item: item,
      })
      onSaved(updated)
      toast.success(
        action === 'restore'
          ? `${config.noun}已恢复`
          : action === 'disable'
          ? `${config.noun}${config.kind === 'organization' ? '已撤回' : '已停用'}`
          : `${config.noun}${config.kind === 'dictionary' ? '已启用' : '已发布'}`,
      )
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '操作失败，请稍后重试')
    }
  }

  async function submitOrganizationAction() {
    if (!organizationAction || !organizationReason.trim()) {
      toast.error('请填写本次操作原因')
      return
    }
    setOrganizationSubmitting(true)
    try {
      const updated = await actOnScaffoldedRecord(
        resource,
        organizationAction.item.id,
        organizationAction.action,
        {
          reason: organizationReason.trim(),
          expected_version: organizationAction.item.version,
          __item: organizationAction.item,
        },
      )
      onSaved(updated)
      toast.success(
        organizationAction.action === 'suspend' ? '商会已暂停' : '商会已关闭',
      )
      setOrganizationAction(null)
      setOrganizationReason('')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '操作失败，请稍后重试')
      await load()
    } finally {
      setOrganizationSubmitting(false)
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
            onCreate={openCreate}
            onRetry={() => void load()}
            onLoadMore={() => void load(nextCursor)}
            onEdit={openEdit}
            onStatusAction={(item) => void changeStatus(item)}
            onOrganizationAction={(item, action) => {
              setOrganizationAction({ item, action })
              setOrganizationReason('')
            }}
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

      <Dialog open={Boolean(organizationAction)} onOpenChange={(open) => !open && setOrganizationAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{organizationAction?.action === 'suspend' ? '暂停商会' : '关闭商会'}</DialogTitle>
            <DialogDescription>
              {organizationAction?.action === 'suspend'
                ? '暂停后商会暂时不可对外提供服务，可在核实后恢复。'
                : '关闭是终止商会主体运营的状态操作，请确认业务已妥善处理。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="organization-action-reason">操作原因</Label>
            <Textarea
              id="organization-action-reason"
              value={organizationReason}
              onChange={(event) => setOrganizationReason(event.target.value)}
              placeholder="请说明暂停或关闭原因"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrganizationAction(null)}>取消</Button>
            <Button
              variant={organizationAction?.action === 'close' ? 'destructive' : 'default'}
              disabled={organizationSubmitting}
              onClick={() => void submitOrganizationAction()}
            >
              {organizationSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认{organizationAction?.action === 'suspend' ? '暂停' : '关闭'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(adminChamber)} onOpenChange={(open) => {
        if (!open) {
          setAdminChamber(null)
          setCreatedAdmin(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{createdAdmin ? '商会管理员已创建' : `添加商会管理员`}</DialogTitle>
            <DialogDescription>
              {createdAdmin
                ? `账号已归属到${adminChamber?.title ?? '所选商会'}，首次登录必须修改初始密码。`
                : `为${adminChamber?.title ?? '所选商会'}直接创建可用的后台管理员账号。`}
            </DialogDescription>
          </DialogHeader>
          {createdAdmin ? (
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
            <Button variant="outline" onClick={() => setAdminChamber(null)}>{createdAdmin ? '完成' : '取消'}</Button>
            {!createdAdmin && (
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
