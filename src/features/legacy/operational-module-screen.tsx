'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Activity,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  listScaffoldedRecords,
  requestManagementResource,
  type ScaffoldedRecord,
} from '@/api/client/scaffolded-management'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Switch } from '@/components/ui/switch'
import { useManagement } from '@/lib/management'

type JsonRecord = Record<string, unknown>
type ModuleKey = 'tour' | 'education' | 'supply-chain' | 'activities' | 'accounts' | 'plans' | 'notifications'

const moduleMeta: Record<ModuleKey, {
  title: string
  description: string
  noun: string
  icon: typeof Boxes
  statuses: Array<{ value: string; label: string }>
}> = {
  tour: {
    title: '文化旅游',
    description: '审核文旅产品、补件、发布治理与首页推荐。',
    noun: '文旅产品',
    icon: Boxes,
    statuses: [
      { value: 'submitted', label: '待审核' },
      { value: 'under_review', label: '审核中' },
      { value: 'needs_more_info', label: '待补件' },
      { value: 'approved', label: '已批准' },
      { value: 'rejected', label: '已驳回' },
    ],
  },
  education: {
    title: '教育交流',
    description: '审核教育产品、补件、发布治理与首页推荐。',
    noun: '教育产品',
    icon: Boxes,
    statuses: [
      { value: 'submitted', label: '待审核' },
      { value: 'under_review', label: '审核中' },
      { value: 'needs_more_info', label: '待补件' },
      { value: 'approved', label: '已批准' },
      { value: 'rejected', label: '已驳回' },
    ],
  },
  'supply-chain': {
    title: '供应链平台',
    description: '审核商品、处理补件和下架，并维护展示排序。',
    noun: '商品',
    icon: Boxes,
    statuses: [
      { value: 'submitted', label: '待审核' },
      { value: 'under_review', label: '审核中' },
      { value: 'needs_more_info', label: '待补件' },
      { value: 'approved', label: '已批准' },
      { value: 'rejected', label: '已驳回' },
    ],
  },
  activities: {
    title: '近期活动',
    description: '查看活动详情、报名记录与纪要发送状态。',
    noun: '活动',
    icon: Activity,
    statuses: [
      { value: 'draft', label: '草稿' },
      { value: 'published', label: '已发布' },
      { value: 'cancelled', label: '已取消' },
      { value: 'archived', label: '已归档' },
    ],
  },
  accounts: {
    title: '企业账号管理',
    description: '按“一账号一企业”查看企业归属，并管理账号状态、登录会话、订阅和额度。',
    noun: '企业账号',
    icon: UsersRound,
    statuses: [
      { value: 'active', label: '正常' },
      { value: 'suspended', label: '已停用' },
    ],
  },
  plans: {
    title: '套餐与权益',
    description: '维护套餐版本、权益项、计费周期和启用状态。',
    noun: '套餐',
    icon: CircleDollarSign,
    statuses: [
      { value: 'draft', label: '草稿' },
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '停用' },
      { value: 'retired', label: '退役' },
    ],
  },
  notifications: {
    title: '业务通知',
    description: '处理当前管理范围内的系统通知和风险提醒。',
    noun: '通知',
    icon: Bell,
    statuses: [
      { value: 'unread', label: '未读' },
      { value: 'read', label: '已读' },
    ],
  },
}

const productModules = new Set<ModuleKey>(['tour', 'education', 'supply-chain'])

const actionLabels: Record<string, string> = {
  start_review: '开始审核',
  request_changes: '要求补件',
  approve: '批准',
  reject: '驳回',
  force_withdraw: '强制下架',
  curate: '调整推荐',
  suspend: '停用账号',
  restore: '恢复账号',
  force_logout: '强制退出',
  assign_subscription: '分配套餐',
  cancel_subscription: '取消套餐',
  adjust_quota: '调整配额',
  update: '更新套餐',
  set_status: '变更状态',
  mark_read: '标记已读',
  create: '新建套餐',
}

const actionFieldLabels: Record<string, string> = {
  code: '套餐代码',
  name: '名称',
  description: '说明',
  billing_period: '计费周期',
  price_minor: '价格（分）',
  currency: '币种代码',
  recommended: '推荐套餐',
  sort_order: '排序',
  entitlements: '套餐权益',
  reason: '操作原因',
  confirmation_token: '安全确认凭证',
  required_items: '需要补充的材料',
  status: '目标状态',
  plan_id: '套餐标识',
  valid_from: '生效时间',
  valid_to: '到期时间',
  entitlement_key: '权益项目',
  delta: '调整数量',
}

function actionFieldLabel(key: string) {
  return actionFieldLabels[key] ?? '业务参数'
}

function managementDateTime(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function parsePayload(value: string) {
  const parsed = JSON.parse(value) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('动作参数必须是 JSON 对象')
  }
  return parsed as JsonRecord
}

function EntitlementsEditor({
  value,
  onChange,
}: {
  value: unknown
  onChange: (value: JsonRecord[]) => void
}) {
  const items = Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []

  function update(index: number, patch: JsonRecord) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const valueType = String(item.value_type ?? 'integer')
        const unlimited = item.unlimited === true
        return (
          <div key={`${String(item.key ?? 'new')}-${index}`} className="rounded-lg border bg-muted/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">权益 {index + 1}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-700 hover:text-red-700"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>权益项目代码</Label>
                <Input value={String(item.key ?? '')} onChange={(event) => update(index, { key: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>数值类型</Label>
                <Select value={valueType} onValueChange={(nextValue) => update(index, { value_type: nextValue })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="integer">数量</SelectItem>
                    <SelectItem value="boolean">开关</SelectItem>
                    <SelectItem value="string">文本</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>单位</Label>
                <Input value={String(item.unit ?? '')} onChange={(event) => update(index, { unit: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>重置周期</Label>
                <Select
                  value={String(item.reset_period ?? 'none')}
                  onValueChange={(nextValue) => update(index, { reset_period: nextValue })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不重置</SelectItem>
                    <SelectItem value="subscription">按订阅周期</SelectItem>
                    <SelectItem value="month">每月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label>不限量</Label>
                  <p className="text-xs text-muted-foreground">开启后忽略具体数值。</p>
                </div>
                <Switch checked={unlimited} onCheckedChange={(checked) => update(index, { unlimited: checked })} />
              </div>
              {!unlimited && (
                <div className="space-y-2">
                  <Label>权益值</Label>
                  {valueType === 'boolean' ? (
                    <Select
                      value={item.boolean_value === true ? 'true' : 'false'}
                      onValueChange={(nextValue) => update(index, { boolean_value: nextValue === 'true' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">开启</SelectItem>
                        <SelectItem value="false">关闭</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={valueType === 'integer' ? 'number' : 'text'}
                      value={String(valueType === 'integer' ? item.integer_value ?? '' : item.string_value ?? '')}
                      onChange={(event) => update(index, valueType === 'integer'
                        ? { integer_value: event.target.value === '' ? null : Number(event.target.value) }
                        : { string_value: event.target.value })}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...items, {
          key: '',
          value_type: 'integer',
          boolean_value: null,
          integer_value: 0,
          string_value: null,
          unlimited: false,
          unit: 'count',
          reset_period: 'none',
        }])}
      >
        <Plus className="h-4 w-4" />
        添加权益
      </Button>
    </div>
  )
}

function ActionPayloadFields({
  payload,
  onChange,
}: {
  payload: JsonRecord
  onChange: (key: string, value: unknown) => void
}) {
  const fields = Object.entries(payload).filter(([key]) => (
    key !== 'action' && !key.startsWith('expected_')
  ))

  return (
    <div className="space-y-4">
      {fields.map(([key, value]) => {
        if (key === 'entitlements') {
          return (
            <div key={key} className="space-y-2">
              <Label>{actionFieldLabel(key)}</Label>
              <EntitlementsEditor value={value} onChange={(nextValue) => onChange(key, nextValue)} />
            </div>
          )
        }
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`action-${key}`}>{actionFieldLabel(key)}</Label>
              <Textarea
                id={`action-${key}`}
                rows={4}
                value={value.join('\n')}
                onChange={(event) => onChange(key, event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                placeholder="每行填写一项"
              />
            </div>
          )
        }
        if (typeof value === 'boolean') {
          return (
            <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label htmlFor={`action-${key}`}>{actionFieldLabel(key)}</Label>
              <Switch id={`action-${key}`} checked={value} onCheckedChange={(checked) => onChange(key, checked)} />
            </div>
          )
        }
        if (key === 'billing_period' || key === 'status') {
          const options = key === 'billing_period'
            ? [
              { value: 'month', label: '按月' },
              { value: 'custom', label: '自定义周期' },
            ]
            : [
              { value: 'draft', label: '草稿' },
              { value: 'active', label: '启用' },
              { value: 'inactive', label: '停用' },
              { value: 'retired', label: '退役' },
            ]
          return (
            <div key={key} className="space-y-2">
              <Label>{actionFieldLabel(key)}</Label>
              <Select value={String(value ?? '')} onValueChange={(nextValue) => onChange(key, nextValue)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }
        const isLongText = key === 'reason' || key === 'description'
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={`action-${key}`}>{actionFieldLabel(key)}</Label>
            {isLongText ? (
              <Textarea
                id={`action-${key}`}
                rows={3}
                value={String(value ?? '')}
                onChange={(event) => onChange(key, event.target.value)}
              />
            ) : (
              <Input
                id={`action-${key}`}
                type={typeof value === 'number' || key === 'price_minor' || key === 'delta' ? 'number' : 'text'}
                value={String(value ?? '')}
                onChange={(event) => onChange(
                  key,
                  typeof value === 'number' || key === 'price_minor' || key === 'delta'
                    ? event.target.value === '' ? null : Number(event.target.value)
                    : event.target.value,
                )}
                placeholder={key === 'confirmation_token' ? '请粘贴本次操作的安全确认凭证' : undefined}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function actionsFor(module: ModuleKey, item: ScaffoldedRecord) {
  if (productModules.has(module)) {
    const actions: string[] = []
    if (item.status === 'submitted') actions.push('start_review')
    if (item.status === 'submitted' || item.status === 'under_review') {
      actions.push('request_changes', 'approve', 'reject')
    }
    if (item.raw?.publication_status === 'published') actions.push('force_withdraw')
    if (item.raw?.publication_status !== 'archived') actions.push('curate')
    return actions
  }
  if (module === 'accounts') {
    return item.status === 'suspended'
      ? ['restore', 'force_logout', 'assign_subscription', 'cancel_subscription', 'adjust_quota']
      : ['suspend', 'force_logout', 'assign_subscription', 'cancel_subscription', 'adjust_quota']
  }
  if (module === 'plans') return ['update', 'set_status']
  if (module === 'notifications' && item.status === 'unread') return ['mark_read']
  return []
}

function initialActionPayload(module: ModuleKey, item: ScaffoldedRecord, action: string) {
  const version = item.version ?? Number(item.raw?.version ?? 0)
  if (productModules.has(module)) {
    if (action === 'request_changes') {
      return { action, expected_version: version, reason: '', required_items: [] }
    }
    if (action === 'reject' || action === 'force_withdraw') {
      return { action, expected_version: version, reason: '' }
    }
    if (action === 'curate') {
      return {
        action,
        expected_version: version,
        sort_order: Number(item.raw?.sort_order ?? 0),
        is_top: item.raw?.is_top === true,
        is_home: item.raw?.is_home === true,
      }
    }
    return { action, expected_version: version }
  }
  if (module === 'accounts') {
    if (action === 'assign_subscription') {
      const validFrom = new Date()
      const validTo = new Date(validFrom)
      validTo.setFullYear(validTo.getFullYear() + 1)
      return {
        action: 'assign',
        plan_id: '',
        valid_from: validFrom.toISOString(),
        valid_to: validTo.toISOString(),
        reason: '',
        confirmation_token: '',
        expected_subscription_version: 0,
      }
    }
    if (action === 'cancel_subscription') {
      return { action: 'cancel', reason: '', confirmation_token: '', expected_subscription_version: 0 }
    }
    if (action === 'adjust_quota') {
      return {
        action: 'adjust',
        entitlement_key: '',
        delta: 0,
        reason: '',
        confirmation_token: '',
        expected_balance_version: 0,
      }
    }
    return {
      action,
      reason: '',
      confirmation_token: '',
      expected_version: version,
    }
  }
  if (module === 'plans') {
    if (action === 'set_status') {
      return {
        action,
        status: item.status === 'active' ? 'inactive' : 'active',
        reason: '',
        confirmation_token: '',
        expected_version: version,
      }
    }
    return {
      action: 'update',
      name: item.raw?.name ?? item.title,
      description: item.raw?.description ?? null,
      billing_period: item.raw?.billing_period ?? 'month',
      price_minor: item.raw?.price_minor ?? null,
      currency: item.raw?.currency ?? 'CNY',
      recommended: item.raw?.recommended === true,
      sort_order: item.raw?.sort_order ?? 0,
      entitlements: item.raw?.entitlements ?? [],
      reason: '',
      confirmation_token: '',
      expected_version: version,
    }
  }
  return { action: 'mark_read' }
}

function initialPlanCreatePayload() {
  return {
    code: '',
    name: '',
    description: '',
    billing_period: 'month',
    price_minor: 0,
    currency: 'CNY',
    recommended: false,
    sort_order: 0,
    entitlements: [],
    reason: '',
    confirmation_token: '',
  }
}

function actionPath(module: ModuleKey, item: ScaffoldedRecord, action: string) {
  if (productModules.has(module)) return `management/products/${encodeURIComponent(item.id)}/action`
  if (module === 'accounts') {
    if (action === 'assign_subscription' || action === 'cancel_subscription') {
      return `management/accounts/${encodeURIComponent(item.id)}/subscription/action`
    }
    if (action === 'adjust_quota') return `management/accounts/${encodeURIComponent(item.id)}/quota/action`
    return `management/accounts/${encodeURIComponent(item.id)}/action`
  }
  if (module === 'plans') return `management/plans/${encodeURIComponent(item.id)}/action`
  return `management/notifications/${encodeURIComponent(item.id)}/action`
}

const detailFieldLabels: Record<string, string> = {
  code: '业务代码',
  name: '名称',
  title: '标题',
  display_name: '姓名',
  masked_phone: '手机号',
  enterprise: '所属企业',
  enterprise_name: '所属企业',
  description: '说明',
  kind: '业务类型',
  category_name: '分类',
  country: '国家或地区',
  status: '状态',
  review_status: '审核状态',
  publication_status: '发布状态',
  billing_period: '计费周期',
  price_minor: '价格（分）',
  currency: '币种',
  recommended: '推荐套餐',
  subscriber_count: '订阅企业数',
  entitlements: '套餐权益',
  active_session_count: '当前登录设备',
  last_active_at: '最近活跃时间',
  created_at: '创建时间',
  updated_at: '更新时间',
  sort_order: '排序',
  is_top: '置顶',
  is_home: '首页推荐',
  message: '通知内容',
  notification_type: '通知类型',
  read: '阅读状态',
  registrations: '报名记录',
  minutes_sends: '纪要发送记录',
}

const entitlementLabels: Record<string, string> = {
  'agent.tokens': 'AI 令牌',
  'talk.sessions': '通话场次',
  'asr.seconds': '语音识别时长',
  'storage.bytes': '存储空间',
  'matching.level': '供需匹配等级',
  'certification.acceleration': '认证加速',
  'enterprise.member_limit': '企业成员上限',
  'customer_success.dedicated': '专属客户成功',
  'chamber.certification_fast_track': '商会认证快速通道',
}

function detailFieldLabel(key: string) {
  return detailFieldLabels[key] ?? '补充信息'
}

function entitlementValue(value: JsonRecord) {
  if (value.unlimited === true) return '不限量'
  if (value.value_type === 'boolean') return value.boolean_value === true ? '已开启' : '未开启'
  if (value.value_type === 'integer') return `${String(value.integer_value ?? 0)} ${String(value.unit ?? '')}`.trim()
  return String(value.string_value ?? '—')
}

function ValuePreview({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  if (typeof value === 'boolean') return <span>{value ? '是' : '否'}</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">暂无记录</span>
    return (
      <div className="space-y-2">
        {value.map((entry, index) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return <p key={index} className="text-sm">{String(entry)}</p>
          }
          const item = entry as JsonRecord
          if (typeof item.key === 'string' && typeof item.value_type === 'string') {
            return (
              <div key={`${item.key}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                <span>{entitlementLabels[item.key] ?? '自定义权益'}</span>
                <span className="text-xs text-muted-foreground">{entitlementValue(item)}</span>
              </div>
            )
          }
          return (
            <div key={index} className="rounded-md bg-muted/40 px-3 py-2">
              <p className="font-medium">
                {String(item.name ?? item.title ?? item.display_name ?? `第 ${index + 1} 项`)}
              </p>
              {Boolean(item.status) && <p className="mt-1 text-xs text-muted-foreground">状态：{String(item.status)}</p>}
            </div>
          )
        })}
      </div>
    )
  }
  if (typeof value === 'object') {
    const item = value as JsonRecord
    if (typeof item.display_name === 'string') return <span>{item.display_name}</span>
    const entries = Object.entries(item).filter(([key]) => !['id', 'version'].includes(key))
    if (entries.length === 0) return <span className="text-muted-foreground">暂无记录</span>
    return (
      <dl className="space-y-2">
        {entries.slice(0, 8).map(([key, entry]) => (
          <div key={key} className="flex items-start justify-between gap-3">
            <dt className="text-xs text-muted-foreground">{detailFieldLabel(key)}</dt>
            <dd className="text-right text-xs">{typeof entry === 'object' ? '已记录' : String(entry ?? '—')}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return <span className="break-all">{String(value)}</span>
}

export function OperationalModuleScreen({ module }: { module: ModuleKey }) {
  const params = useParams<{ workspaceId: string }>()
  const { availableWorkspaces } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const meta = moduleMeta[module]
  const Icon = meta.icon
  const resource = `management/legacy/${module}`
  const [items, setItems] = useState<ScaffoldedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<ScaffoldedRecord | null>(null)
  const [related, setRelated] = useState<JsonRecord | null>(null)
  const [actionName, setActionName] = useState<string | null>(null)
  const [actionPayload, setActionPayload] = useState('{}')
  const [submitting, setSubmitting] = useState(false)
  const parsedActionPayload = useMemo(() => {
    try {
      return parsePayload(actionPayload)
    } catch {
      return {}
    }
  }, [actionPayload])

  const load = useCallback(async (cursor?: string | null) => {
    const append = Boolean(cursor)
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setError(null)
    try {
      const result = await listScaffoldedRecords(resource, { keyword, status, cursor, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.next_cursor)
    } catch (nextError) {
      if (!append) setError(nextError)
      else toast.error(nextError instanceof Error ? nextError.message : '加载下一页失败')
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }, [keyword, resource, status])

  useEffect(() => {
    void load()
  }, [load])

  const details = useMemo(
    () => Object.entries(selected?.raw ?? {}).filter(([key]) => ![
      'id',
      'version',
      'auth_version',
      'scope_id',
      'scope_type',
    ].includes(key)),
    [selected],
  )

  async function openDetails(item: ScaffoldedRecord) {
    setSelected(item)
    setRelated(null)
    if (module === 'activities') {
      try {
        const query = `scope_type=${item.raw?.scope_type ?? 'platform'}&scope_id=${item.raw?.scope_id ?? 'hm'}&limit=20`
        const [registrations, minutes] = await Promise.all([
          requestManagementResource<JsonRecord>(
            `management/activities/${encodeURIComponent(item.id)}/registrations?${query}`,
          ),
          requestManagementResource<JsonRecord>(
            `management/activities/${encodeURIComponent(item.id)}/minutes-sends?${query}`,
          ),
        ])
        setRelated({ registrations, minutes_sends: minutes })
      } catch (nextError) {
        toast.error(nextError instanceof Error ? nextError.message : '活动关联记录加载失败')
      }
    } else if (module === 'accounts') {
      try {
        const [subscription, quota] = await Promise.all([
          requestManagementResource<JsonRecord>(
            `management/accounts/${encodeURIComponent(item.id)}/subscription`,
          ),
          requestManagementResource<JsonRecord>(
            `management/accounts/${encodeURIComponent(item.id)}/quota-ledger?limit=20`,
          ),
        ])
        setRelated({ subscription, quota_ledger: quota })
      } catch (nextError) {
        toast.error(nextError instanceof Error ? nextError.message : '账号订阅信息加载失败')
      }
    }
  }

  function openAction(item: ScaffoldedRecord, action: string) {
    setSelected(item)
    setActionName(action)
    setActionPayload(pretty(initialActionPayload(module, item, action)))
  }

  function openCreatePlan() {
    setSelected(null)
    setActionName('create')
    setActionPayload(pretty(initialPlanCreatePayload()))
  }

  function updateActionPayloadField(key: string, value: unknown) {
    setActionPayload(pretty({ ...parsedActionPayload, [key]: value }))
  }

  async function submitAction() {
    if (!actionName || (actionName !== 'create' && !selected)) return
    const payload = parsePayload(actionPayload)
    if (typeof payload.reason === 'string' && payload.reason.trim().length < 3) {
      toast.error('请填写不少于 3 个字的操作原因')
      return
    }
    if (typeof payload.confirmation_token === 'string' && payload.confirmation_token.trim().length < 14) {
      toast.error('请填写本次操作的有效安全确认凭证')
      return
    }
    if (actionName === 'create' && (
      !/^[a-z][a-z0-9_-]{1,31}$/.test(String(payload.code ?? ''))
      || !String(payload.name ?? '').trim()
    )) {
      toast.error('请填写套餐名称，并使用小写字母开头的套餐代码')
      return
    }
    if (actionName === 'request_changes' && (
      !Array.isArray(payload.required_items) || payload.required_items.length === 0
    )) {
      toast.error('请至少填写一项需要补充的材料')
      return
    }
    if (actionName === 'assign_subscription' && !String(payload.plan_id ?? '').trim()) {
      toast.error('请填写要分配的套餐标识')
      return
    }
    if (actionName === 'adjust_quota' && !String(payload.entitlement_key ?? '').trim()) {
      toast.error('请填写要调整的权益项目')
      return
    }
    setSubmitting(true)
    try {
      const result = await requestManagementResource<JsonRecord>(
        actionName === 'create'
          ? 'management/plans'
          : actionPath(module, selected as ScaffoldedRecord, actionName),
        { method: 'POST', body: JSON.stringify(payload) },
      )
      if (module === 'notifications') {
        setItems((current) => current.map((item) => item.id === selected?.id
          ? { ...item, status: 'read', raw: result }
          : item))
      } else {
        await load()
      }
      setActionName(null)
      setSelected(null)
      toast.success(`${actionLabels[actionName] ?? '操作'}已完成`)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '操作失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function markAllNotificationsRead() {
    setSubmitting(true)
    try {
      await requestManagementResource<JsonRecord>('management/notifications/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'mark_all_read',
          scope_type: 'platform',
          scope_id: 'hm',
          before: new Date().toISOString(),
        }),
      })
      await load()
      toast.success('当前通知已全部标记为已读')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '批量标记失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="华盟在线"
        title={meta.title}
        description={meta.description}
        icon={Icon}
        action={module === 'notifications' ? (
          <Button variant="outline" disabled={submitting} onClick={() => void markAllNotificationsRead()}>
            <ShieldCheck className="h-4 w-4" />
            全部标记已读
          </Button>
        ) : module === 'plans' ? (
          <Button onClick={openCreatePlan}>
            <Plus className="h-4 w-4" />
            新建套餐
          </Button>
        ) : undefined}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void load()}
              placeholder={`搜索${meta.noun}名称或编号`}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {meta.statuses.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b bg-muted/45 text-[11px] text-muted-foreground">
                  {['名称', '归属 / 类型', '状态', '更新时间', '操作'].map((column) => (
                    <th key={column} className="px-5 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-4">
                      <p className="max-w-sm truncate font-medium">{item.title}</p>
                      {item.subtitle && <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {item.category ?? item.country ?? (module === 'accounts' ? '尚未加入企业' : '—')}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-4 text-muted-foreground">{managementDateTime(item.updated_at ?? item.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openDetails(item)}>详情</Button>
                        {actionsFor(module, item).length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                操作<ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actionsFor(module, item).map((action) => (
                                <DropdownMenuItem key={action} onClick={() => openAction(item, action)}>
                                  {actionLabels[action] ?? action}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
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
                <h2 className="font-semibold">无法加载{meta.noun}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : '服务暂时不可用，请稍后重试'}
                </p>
                <Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border bg-muted/25 text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">暂无{meta.noun}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {productModules.has(module)
                    ? `${meta.noun}由企业端创建并提交，平台后台负责审核、补件和推荐管理。`
                    : '暂时没有可展示的数据，请调整筛选条件后重试。'}
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <span>已加载 {items.length} 条 · 当前管理范围 {workspace?.shortName ?? '当前组织'}</span>
            {nextCursor && (
              <Button size="sm" variant="ghost" disabled={loadingMore} onClick={() => void load(nextCursor)}>
                {loadingMore && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                加载更多
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected) && !actionName} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? `${meta.noun}详情`}</DialogTitle>
            <DialogDescription>服务端实时详情及相关记录。</DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 sm:grid-cols-2">
            {details.map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-muted/15 p-3">
                <dt className="text-xs text-muted-foreground">{detailFieldLabel(key)}</dt>
                <dd className="mt-1.5 text-sm"><ValuePreview value={value} /></dd>
              </div>
            ))}
          </dl>
          {related && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">关联记录</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(related).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-muted/25 p-3">
                    <p className="text-xs text-muted-foreground">{detailFieldLabel(key)}</p>
                    <div className="mt-2 text-sm"><ValuePreview value={value} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionName)} onOpenChange={(open) => !open && setActionName(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{actionName ? actionLabels[actionName] ?? actionName : '确认操作'}</DialogTitle>
            <DialogDescription>
              请按业务字段完成本次操作。涉及账号、订阅、额度和套餐的高风险变更需要安全确认凭证。
            </DialogDescription>
          </DialogHeader>
          <ActionPayloadFields payload={parsedActionPayload} onChange={updateActionPayloadField} />
          <p className="text-xs text-muted-foreground">若数据已被其他管理员更新，页面会提示刷新后重新操作，避免覆盖最新内容。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionName(null)}>取消</Button>
            <Button disabled={submitting} onClick={() => void submitAction()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function isOperationalModule(value: string): value is ModuleKey {
  return value in moduleMeta
}
