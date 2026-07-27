'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Archive,
  ArrowUpDown,
  Boxes,
  Download,
  FilePenLine,
  Filter,
  Globe2,
  ImagePlus,
  ListFilter,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
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
import { RichTextEditor } from '@/components/management/rich-text-editor'
import { HomeCurationScreen } from '@/features/legacy/home-curation-screen'
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
    columns: ['商会名称', '国家或地区', '会员企业', '管理员', '启用状态', '操作'],
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

function EmptyTable({
  config,
  items,
  loading,
  error,
  onCreate,
  onRetry,
  onEdit,
  onStatusAction,
}: {
  config: ModuleConfig
  items: ScaffoldedRecord[]
  loading: boolean
  error: unknown
  onCreate?: () => void
  onRetry: () => void
  onEdit: (item: ScaffoldedRecord) => void
  onStatusAction: (item: ScaffoldedRecord) => void
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
                          ? <span className="rounded-full border px-2 py-1 text-xs">{item.status}</span>
                          : column === '操作'
                            ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>编辑</Button>
                                <Button size="sm" variant="ghost" onClick={() => onStatusAction(item)}>
                                  {item.status === 'published' ? '下架' : '发布'}
                                </Button>
                              </div>
                            )
                            : column.includes('时间')
                              ? item.updated_at ?? item.created_at ?? '—'
                              : column.includes('国家')
                                ? item.country ?? '—'
                                : column.includes('栏目') || column.includes('分类')
                                  ? item.category ?? '—'
                                  : '—'}
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
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          共 {items.length} 条 · 支持稳定分页、筛选、排序和详情操作
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
        {config.filters.map((filter, index) => (
          <Select
            key={filter}
            value={index === config.filters.length - 1 ? status : undefined}
            defaultValue={index === config.filters.length - 1 ? undefined : 'all'}
            onValueChange={(value) => index === config.filters.length - 1 && onStatusChange(value)}
          >
            <SelectTrigger className="w-full bg-card xl:w-40">
              <SelectValue placeholder={filter} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部{filter}</SelectItem>
              {filter.includes('状态') ? (
                <>
                  <SelectItem value="active">启用 / 已发布</SelectItem>
                  <SelectItem value="draft">草稿 / 待处理</SelectItem>
                  <SelectItem value="inactive">停用 / 已下架</SelectItem>
                </>
              ) : (
                <SelectItem value="configured">已配置</SelectItem>
              )}
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
    setSummary('')
    setSource('')
    setCountry(initial?.country ?? '')
    setTags('')
    setContent('')
    setSort(String(initial?.sort ?? 0))
    setImages([])
    setStatus(initial?.status ?? 'draft')
    setIsTop(false)
    setIsHome(false)
  }, [initial, open])

  async function save() {
    if (!title.trim()) {
      toast.error('请填写标题')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        summary: summary.trim() || null,
        source: source.trim() || null,
        country: country.trim() || null,
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
        content: content.trim() || null,
        sort: Number(sort) || 0,
        images: await Promise.all(images.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          content_base64: await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`))
            reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '')
            reader.readAsDataURL(file)
          }),
        }))),
        status,
        is_top: isTop,
        is_home: isHome,
        module: config.title,
      }
      const item = initial
        ? await updateScaffoldedRecord(resource, initial.id, payload)
        : await createScaffoldedRecord(resource, payload)
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>内容类型</Label>
                <Select defaultValue={config.title}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={config.title}>{config.title}</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>栏目</Label>
                <Select defaultValue="none">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">不归栏目</SelectItem></SelectContent>
                </Select>
              </div>
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
                <Input id="legacy-country" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="例如：泰国" />
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
                  <SelectItem value="draft">保存草稿</SelectItem>
                  <SelectItem value="published">发布</SelectItem>
                  <SelectItem value="offline">下架</SelectItem>
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
  const [name, setName] = useState('')
  const [englishName, setEnglishName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [parent, setParent] = useState('none')
  const [link, setLink] = useState('')
  const [sort, setSort] = useState('0')
  const [status, setStatus] = useState('active')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.title ?? '')
    setEnglishName(initial?.subtitle ?? '')
    setCountryCode(initial?.country ?? '')
    setContact('')
    setAddress('')
    setIntroduction('')
    setParent('none')
    setLink('')
    setSort(String(initial?.sort ?? 0))
    setStatus(initial?.status ?? 'active')
  }, [initial, open])

  async function save() {
    if (!name.trim()) {
      toast.error(`请填写${config.noun}名称`)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: name.trim(),
        subtitle: englishName.trim() || null,
        country: countryCode.trim().toUpperCase() || null,
        contact: contact.trim() || null,
        address: address.trim() || null,
        introduction: introduction.trim() || null,
        parent_id: parent === 'none' ? null : parent,
        link: link.trim() || null,
        sort: Number(sort) || 0,
        status,
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
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑' : '新建'}{config.noun}</DialogTitle>
          <DialogDescription>保留旧系统录入字段，并补充新平台需要的启用状态和权限边界。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="record-name">{isCountry ? '中文名称' : `${config.noun}名称`}</Label>
            <Input
              id="record-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`请输入${config.noun}名称`}
            />
          </div>
          {isCountry && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country-en">英文名称</Label>
                <Input id="country-en" value={englishName} onChange={(event) => setEnglishName(event.target.value)} placeholder="Thailand" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country-code">国家代码</Label>
                <Input id="country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="TH" />
              </div>
            </div>
          )}
          {isChamber && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chamber-country">国家或地区</Label>
                  <Input id="chamber-country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="CN" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chamber-contact">联系电话</Label>
                  <Input id="chamber-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="企业联系方式，不作为账号标识" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-address">地址</Label>
                <Input id="chamber-address" value={address} onChange={(event) => setAddress(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chamber-intro">商会简介</Label>
                <Textarea id="chamber-intro" rows={5} value={introduction} onChange={(event) => setIntroduction(event.target.value)} />
              </div>
            </>
          )}
          {!isCountry && !isChamber && (
            <>
              <div className="space-y-2">
                <Label htmlFor="record-parent">上级分类或关联对象</Label>
                <Select value={parent} onValueChange={setParent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">无</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="record-link">链接或标识</Label>
                <Input id="record-link" value={link} onChange={(event) => setLink(event.target.value)} placeholder="官网链接、分类标识或业务代码" />
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="record-sort">排序</Label>
              <Input id="record-sort" type="number" value={sort} onChange={(event) => setSort(event.target.value)} />
            </div>
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
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<ScaffoldedRecord | null>(null)
  const [nextStatus, setNextStatus] = useState('processing')
  const [followUpNote, setFollowUpNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listScaffoldedRecords(resource, { keyword, limit: 20 })
      setItems(result.items)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [keyword, resource])

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
          {config.filters.map((filter) => (
            <Select key={filter} defaultValue="all">
              <SelectTrigger className="w-full xl:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部{filter}</SelectItem>
              </SelectContent>
            </Select>
          ))}
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
        error={error}
        onRetry={() => void load()}
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
                <div><dt className="text-xs text-muted-foreground">线索编号</dt><dd className="mt-1 font-data">{selected.id}</dd></div>
                <div><dt className="text-xs text-muted-foreground">当前状态</dt><dd className="mt-1">{selected.status}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">联系人或主题</dt><dd className="mt-1 font-medium">{selected.title}</dd></div>
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

function SettingsScreen({ resource }: { resource: string }) {
  const [tab, setTab] = useState('basic')
  const [submitting, setSubmitting] = useState(false)

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget))
      await createScaffoldedRecord(resource, { section: tab, values })
      toast.success('站点配置已保存')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="border-b px-5 pt-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="basic">基础信息</TabsTrigger>
                <TabsTrigger value="seo">搜索展示</TabsTrigger>
                <TabsTrigger value="contact">联系方式</TabsTrigger>
                <TabsTrigger value="social">社交媒体</TabsTrigger>
              </TabsList>
            </div>
            <form className="max-w-3xl p-5" onSubmit={(event) => void saveSettings(event)}>
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">站点名称</Label>
                  <Input id="site-name" name="site_name" defaultValue="华盟在线" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-description">站点简介</Label>
                  <Textarea id="site-description" name="site_description" rows={4} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="site-icp">备案号</Label><Input id="site-icp" name="icp_number" /></div>
                  <div className="space-y-2"><Label htmlFor="site-copyright">版权信息</Label><Input id="site-copyright" name="copyright" /></div>
                </div>
              </TabsContent>
              <TabsContent value="seo" className="mt-0 space-y-4">
                <div className="space-y-2"><Label htmlFor="seo-title">默认页面标题</Label><Input id="seo-title" name="seo_title" /></div>
                <div className="space-y-2"><Label htmlFor="seo-keywords">关键词</Label><Input id="seo-keywords" name="seo_keywords" /></div>
                <div className="space-y-2"><Label htmlFor="seo-description">搜索摘要</Label><Textarea id="seo-description" name="seo_description" rows={4} /></div>
              </TabsContent>
              <TabsContent value="contact" className="mt-0 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="site-phone">联系电话</Label><Input id="site-phone" name="contact_phone" /></div>
                <div className="space-y-2"><Label htmlFor="site-email">联系邮箱</Label><Input id="site-email" name="contact_email" /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="site-address">联系地址</Label><Input id="site-address" name="contact_address" /></div>
              </TabsContent>
              <TabsContent value="social" className="mt-0 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="site-wechat">微信公众号</Label><Input id="site-wechat" name="wechat" /></div>
                <div className="space-y-2"><Label htmlFor="site-weibo">微博主页</Label><Input id="site-weibo" name="weibo" /></div>
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

export function LegacyModuleScreen() {
  const params = useParams<{ module: string }>()
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
  const [error, setError] = useState<unknown>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
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

  const load = useCallback(async () => {
    if (params.module === 'home' || config.kind === 'settings' || config.kind === 'inquiry') return
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
  }, [config.kind, keyword, params.module, resource, status])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setSelected(null)
    setFormOpen(true)
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
    const action = item.status === 'published' || item.status === 'active' ? 'disable' : 'enable'
    try {
      const updated = await actOnScaffoldedRecord(resource, item.id, action)
      onSaved(updated)
      toast.success(action === 'disable' ? `${config.noun}已停用` : `${config.noun}已启用`)
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
              支持按旧系统条件筛选
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
            error={error}
            onCreate={openCreate}
            onRetry={() => void load()}
            onEdit={openEdit}
            onStatusAction={(item) => void changeStatus(item)}
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
    </div>
  )
}
