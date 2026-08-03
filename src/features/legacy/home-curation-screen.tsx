'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BookOpenText,
  Building2,
  CalendarDays,
  GraduationCap,
  Handshake,
  Inbox,
  Images,
  Landmark,
  LayoutTemplate,
  LoaderCircle,
  MapPinned,
  Newspaper,
  PackageSearch,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  actOnHomeSectionItem,
  getHomeBanners,
  getHomeStats,
  listHomeSection,
  reorderHomeSection,
  saveHomeBanners,
  saveHomeStats,
  uploadManagementMedia,
  type HomeBannerRow,
  type HomeStatRow,
  type ScaffoldedRecord,
} from '@/api/client/scaffolded-management'
import { PageHeading } from '@/components/management/page-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cn } from '@/lib/utils'

const HOME_SECTIONS = [
  { key: 'news', title: '新闻中心', noun: '资讯', module: 'news', icon: Newspaper },
  { key: 'tour', title: '文化旅游', noun: '文旅内容', module: 'tour', icon: MapPinned },
  { key: 'education', title: '教育交流', noun: '教育内容', module: 'education', icon: GraduationCap },
  { key: 'trade', title: '经贸合作', noun: '经贸内容', module: 'investment', icon: Handshake },
  { key: 'supply', title: '供应链平台', noun: '供应链内容', module: 'supply-chain', icon: PackageSearch },
  { key: 'association', title: '商协会', noun: '商协会内容', module: 'associations', icon: Landmark },
  { key: 'activity', title: '近期活动', noun: '活动', module: 'activities', icon: CalendarDays },
  { key: 'park', title: '东盟园区', noun: '园区内容', module: 'parks', icon: Building2 },
  { key: 'partners', title: '合作伙伴', noun: '合作伙伴', module: 'partners', icon: BookOpenText },
  { key: 'chambers', title: '推荐商会', noun: '商会', module: 'chambers', icon: Landmark },
] as const

type HomeSection = (typeof HOME_SECTIONS)[number]
type ActivePanel = 'stats' | 'banners' | HomeSection['key']

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '加载失败，请稍后重试'
}

function clientRowId() {
  return `local_${crypto.randomUUID()}`
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/15 px-6 text-center">
      <RefreshCcw className="mb-3 h-8 w-8 text-muted-foreground/70" />
      <p className="font-medium text-foreground">数据加载失败</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{errorMessage(error)}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCcw className="h-4 w-4" />
        重新加载
      </Button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      正在加载首页数据
    </div>
  )
}

function HomeStatsPanel() {
  const [items, setItems] = useState<HomeStatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getHomeStats()
      setItems(result.items)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function updateRow(id: string, field: 'label' | 'value', value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  async function submit() {
    const payload = items
      .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
      .filter((item) => item.label || item.value)
    if (payload.some((item) => !item.label || !item.value)) {
      toast.error('每条统计数字都需要填写名称和展示值')
      return
    }

    setSaving(true)
    try {
      const result = await saveHomeStats(payload)
      setItems(result.items)
      toast.success('首页统计数字已保存')
    } catch (nextError) {
      toast.error(errorMessage(nextError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/10 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-ember-600" />
            <CardTitle>首页统计数字</CardTitle>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            维护首页顶部的关键数字。展示值可填写“10+”“$45.6亿”等完整文案。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setItems((current) => [
            ...current,
            { id: clientRowId(), label: '', value: '' },
          ])}
        >
          <Plus className="h-4 w-4" />
          添加一项
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 text-center">
                  <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground/60" />
                  <p className="font-medium">还没有统计数字</p>
                  <p className="mt-1 text-sm text-muted-foreground">添加后将按当前顺序展示在网站首页。</p>
                </div>
              ) : items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-lg border border-border/70 bg-card p-3 sm:grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_40px] sm:items-end"
                >
                  <div className="hidden h-10 items-center justify-center rounded-md bg-muted/60 text-sm font-semibold text-muted-foreground sm:flex">
                    {index + 1}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`stat-label-${item.id}`}>名称</Label>
                    <Input
                      id={`stat-label-${item.id}`}
                      value={item.label}
                      placeholder="例如：合作国家"
                      onChange={(event) => updateRow(item.id, 'label', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`stat-value-${item.id}`}>展示值</Label>
                    <Input
                      id={`stat-value-${item.id}`}
                      value={item.value}
                      placeholder="例如：10+"
                      onChange={(event) => updateRow(item.id, 'value', event.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`删除第 ${index + 1} 项统计数字`}
                    onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end border-t border-border/70 pt-5">
              <Button disabled={saving} onClick={() => void submit()}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存统计数字
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function HomeBannersPanel() {
  const [items, setItems] = useState<HomeBannerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getHomeBanners()
      setItems(result.items)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function update(id: string, field: keyof Omit<HomeBannerRow, 'id'>, value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  async function upload(id: string, file: File) {
    setBusyId(id)
    try {
      const mediaUrl = await uploadManagementMedia(file, 'cms')
      update(id, 'media_url', mediaUrl)
      toast.success('轮播图片已上传')
    } catch (nextError) {
      toast.error(errorMessage(nextError))
    } finally {
      setBusyId(null)
    }
  }

  async function save() {
    if (items.some((item) => !item.title.trim() || !item.media_url.trim())) {
      toast.error('每张轮播都需要标题和图片')
      return
    }
    setSaving(true)
    try {
      await saveHomeBanners(items.map((item) => ({
        ...item,
        title: item.title.trim(),
        subtitle: item.subtitle.trim(),
        media_url: item.media_url.trim(),
        link_url: item.link_url.trim(),
      })))
      await load()
      toast.success('首页轮播已保存')
    } catch (nextError) {
      toast.error(errorMessage(nextError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/10 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Images className="h-4 w-4 text-ember-600" />
            <CardTitle>首页轮播</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            保存后直接更新网站首页展示内容。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setItems((current) => [
            ...current,
            { id: clientRowId(), title: '', subtitle: '', media_url: '', link_url: '' },
          ])}
        >
          <Plus className="h-4 w-4" />
          添加轮播
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={() => void load()} /> : (
          <>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">第 {index + 1} 张</p>
                    <Button variant="ghost" size="icon" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label>标题</Label><Input value={item.title} onChange={(event) => update(item.id, 'title', event.target.value)} /></div>
                    <div className="space-y-1.5"><Label>副标题</Label><Input value={item.subtitle} onChange={(event) => update(item.id, 'subtitle', event.target.value)} /></div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>轮播图片</Label>
                      <div className="flex gap-2">
                        <Input value={item.media_url} readOnly placeholder="上传后生成媒体地址" />
                        <Button variant="outline" asChild disabled={busyId !== null}>
                          <label className="cursor-pointer">
                            {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
                            上传
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) void upload(item.id, file)
                              }}
                            />
                          </label>
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2"><Label>跳转链接</Label><Input value={item.link_url} onChange={(event) => update(item.id, 'link_url', event.target.value)} placeholder="https://..." /></div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="grid min-h-40 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">暂无轮播图片</div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-5">
              <Button disabled={saving} onClick={() => void save()}>
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                保存轮播
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ContentPicker({
  section,
  open,
  onOpenChange,
  currentIds,
  onAdded,
}: {
  section: HomeSection
  open: boolean
  onOpenChange: (open: boolean) => void
  currentIds: Set<string>
  onAdded: () => Promise<void>
}) {
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const cursor = cursorStack[cursorStack.length - 1]

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setError(null)
    try {
      const result = await listHomeSection(section.key, {
        keyword,
        homeOnly: false,
        cursor,
        limit: 8,
      })
      setItems(result.items)
      setNextCursor(result.next_cursor)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [cursor, keyword, open, section.key])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open) setSelected(new Set())
  }, [open])

  function search() {
    setKeyword(keywordInput.trim())
    setCursorStack([null])
  }

  async function submit() {
    if (selected.size === 0) return
    setSubmitting(true)
    try {
      await Promise.all(
        Array.from(selected).map((id) => actOnHomeSectionItem(section.key, id, 'add_to_home')),
      )
      await onAdded()
      onOpenChange(false)
      toast.success(`已将 ${selected.size} 条${section.noun}加入首页`)
    } catch (nextError) {
      toast.error(errorMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88vh,760px)] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 pb-5 pt-6 pr-12">
          <DialogTitle>选择已有{section.noun}</DialogTitle>
          <DialogDescription>
            从「{section.title}」中选择内容加入首页。内容资料仍在原业务模块中维护。
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              search()
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={keywordInput}
                placeholder={`搜索${section.noun}标题`}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">搜索</Button>
          </form>

          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto rounded-lg border border-border">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <div className="p-4">
                <ErrorState error={error} onRetry={() => void load()} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <Inbox className="mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="font-medium">没有找到可选择的内容</p>
                <p className="mt-1 text-sm text-muted-foreground">可以更换关键词后重新搜索。</p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {items.map((item) => {
                  const alreadyAdded = currentIds.has(item.id)
                  const checked = alreadyAdded || selected.has(item.id)
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'flex min-h-20 items-center gap-3 px-4 py-3 transition-colors',
                        alreadyAdded ? 'cursor-default bg-muted/25' : 'cursor-pointer hover:bg-muted/20',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={alreadyAdded}
                        onCheckedChange={(nextChecked) => setSelected((current) => {
                          const next = new Set(current)
                          if (nextChecked) next.add(item.id)
                          else next.delete(item.id)
                          return next
                        })}
                      />
                      <ContentCover item={item} compact />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {item.subtitle || item.category || '暂无补充说明'}
                        </span>
                      </span>
                      {alreadyAdded && <Badge variant="outline">已在首页</Badge>}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>已选择 {selected.size} 条</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={cursorStack.length === 1 || loading}
                onClick={() => setCursorStack((current) => current.slice(0, -1))}
              >
                <ArrowLeft className="h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextCursor || loading}
                onClick={() => nextCursor && setCursorStack((current) => [...current, nextCursor])}
              >
                下一页
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={selected.size === 0 || submitting} onClick={() => void submit()}>
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            加入首页
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContentCover({ item, compact = false }: { item: ScaffoldedRecord; compact?: boolean }) {
  const cover = item.cover || item.cover_url || item.image
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-md border border-border bg-gradient-to-br from-ember-50 to-stone-100 bg-cover bg-center',
        compact ? 'h-12 w-16' : 'h-16 w-24 sm:h-[72px] sm:w-28',
      )}
      style={cover ? { backgroundImage: `url("${cover.replaceAll('"', '\\"')}")` } : undefined}
      aria-hidden="true"
    >
      {!cover && (
        <div className="grid h-full w-full place-items-center">
          <LayoutTemplate className="h-5 w-5 text-ember-300" />
        </div>
      )}
    </div>
  )
}

function HomeSectionPanel({
  section,
  workspaceId,
  onCountChange,
}: {
  section: HomeSection
  workspaceId: string
  onCountChange: (key: HomeSection['key'], count: number) => void
}) {
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listHomeSection(section.key, { homeOnly: true, limit: 50 })
      setItems(result.items)
      onCountChange(section.key, result.items.length)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [onCountChange, section.key])

  useEffect(() => {
    void load()
  }, [load])

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    const ordered = [...items]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(targetIndex, 0, moved)
    setBusyId(moved.id)
    try {
      const result = await reorderHomeSection(section.key, ordered.map((item) => item.id))
      setItems(result.items.length > 0 ? result.items : ordered)
      toast.success('首页展示顺序已更新')
    } catch (nextError) {
      toast.error(errorMessage(nextError))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: ScaffoldedRecord) {
    setBusyId(item.id)
    try {
      await actOnHomeSectionItem(section.key, item.id, 'remove_from_home')
      await load()
      toast.success(`已将「${item.title}」移出首页`)
    } catch (nextError) {
      toast.error(errorMessage(nextError))
    } finally {
      setBusyId(null)
    }
  }

  const currentIds = useMemo(() => new Set(items.map((item) => item.id)), [items])

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/10 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <section.icon className="h-4 w-4 text-ember-600" />
              <CardTitle>{section.title}楼层</CardTitle>
              {!loading && !error && <Badge variant="outline">{items.length} 条</Badge>}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              选择该楼层展示的{section.noun}，并调整它们在首页中的先后顺序。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/w/${encodeURIComponent(workspaceId)}/legacy/${section.module}`}>
                去「{section.title}」新建
              </Link>
            </Button>
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              选择已有内容
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void load()} />
          ) : items.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 px-6 text-center">
              <Inbox className="mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium">这个楼层还没有展示内容</p>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                从已有{section.noun}中选择内容加入首页；如需创建新内容，请前往「{section.title}」。
              </p>
              <Button className="mt-4" size="sm" onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" />
                选择已有内容
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/70 rounded-lg border border-border">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 p-3 sm:grid-cols-[38px_auto_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="hidden h-9 w-9 place-items-center rounded-md bg-muted/60 text-sm font-semibold text-muted-foreground sm:grid">
                    {index + 1}
                  </div>
                  <ContentCover item={item} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.subtitle || item.category || '暂无补充说明'}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0 || busyId !== null}
                      aria-label={`上移「${item.title}」`}
                      onClick={() => void move(index, -1)}
                    >
                      {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === items.length - 1 || busyId !== null}
                      aria-label={`下移「${item.title}」`}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId !== null}
                      aria-label={`将「${item.title}」移出首页`}
                      onClick={() => void remove(item)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContentPicker
        section={section}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentIds={currentIds}
        onAdded={load}
      />
    </>
  )
}

export function HomeCurationScreen() {
  const params = useParams<{ workspaceId: string }>()
  const [active, setActive] = useState<ActivePanel>('stats')
  const [counts, setCounts] = useState<Partial<Record<HomeSection['key'], number>>>({})
  const activeSection = HOME_SECTIONS.find((section) => section.key === active)

  const updateCount = useCallback((key: HomeSection['key'], count: number) => {
    setCounts((current) => current[key] === count ? current : { ...current, [key]: count })
  }, [])

  return (
    <div>
      <PageHeading
        eyebrow="网站内容"
        title="首页管理"
        description="按楼层编排华盟在线首页。这里负责选择、移除和排序已有内容，内容资料仍在对应业务模块中维护。"
        icon={LayoutTemplate}
      />

      <div className="mb-4 lg:hidden">
        <Select value={active} onValueChange={(value) => setActive(value as ActivePanel)}>
          <SelectTrigger aria-label="选择首页区域">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stats">首页顶部 · 统计数字</SelectItem>
            <SelectItem value="banners">首页顶部 · 轮播图</SelectItem>
            {HOME_SECTIONS.map((section, index) => (
              <SelectItem key={section.key} value={section.key}>
                {index + 1}. {section.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <Card className="sticky top-5 hidden overflow-hidden lg:block">
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">首页顶部</p>
          </div>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left text-sm transition-colors',
              active === 'stats' ? 'bg-ember-50 text-ember-800' : 'hover:bg-muted/25',
            )}
            onClick={() => setActive('stats')}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">统计数字</span>
          </button>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left text-sm transition-colors',
              active === 'banners' ? 'bg-ember-50 text-ember-800' : 'hover:bg-muted/25',
            )}
            onClick={() => setActive('banners')}
          >
            <Images className="h-4 w-4" />
            <span className="font-medium">轮播图</span>
          </button>
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">内容楼层</p>
          </div>
          <nav aria-label="首页内容楼层" className="p-2">
            {HOME_SECTIONS.map((section, index) => {
              const Icon = section.icon
              const isActive = active === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-sm transition-colors',
                    isActive ? 'bg-ember-600 text-white' : 'text-foreground hover:bg-muted/40',
                  )}
                  onClick={() => setActive(section.key)}
                >
                  <span className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded text-[11px] font-semibold',
                    isActive ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground',
                  )}>
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{section.title}</span>
                  {counts[section.key] !== undefined && (
                    <span className={cn(
                      'text-xs tabular-nums',
                      isActive ? 'text-white/75' : 'text-muted-foreground',
                    )}>
                      {counts[section.key]}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </Card>

        <main className="min-w-0">
          {active === 'stats' ? (
            <HomeStatsPanel />
          ) : active === 'banners' ? (
            <HomeBannersPanel />
          ) : activeSection ? (
            <HomeSectionPanel
              key={activeSection.key}
              section={activeSection}
              workspaceId={params.workspaceId}
              onCountChange={updateCount}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
