'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Edit3, LoaderCircle, MessageSquareText, PackageSearch, Plus, Send, Undo2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  actEnterpriseSupplyDemand,
  actEnterpriseSupplyDemandConsultation,
  createEnterpriseSupplyDemand,
  getEnterpriseWorkspace,
  listEnterpriseSupplyDemands,
  listEnterpriseSupplyDemandConsultations,
  updateEnterpriseSupplyDemand,
  type SupplyDemandDto,
  type SupplyDemandConsultationDto,
  type SupplyDemandWriteInput,
} from '@/api/client/enterprise-workspace'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'

const categories = [
  '经贸合作',
  '供应链合作',
  '投资合作',
  '工程机械',
  '汽车及零部件',
  '农产品与食品',
  '医疗健康',
  '绿色制造',
  '文化旅游',
  '技术服务',
  '教育交流',
]
const supplyDemandStatusLabels: Record<SupplyDemandDto['status'], string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
  withdrawn: '已撤回',
}
const consultationStatusLabels: Record<SupplyDemandConsultationDto['status'], string> = {
  new: '待跟进',
  following: '跟进中',
  completed: '已完成',
  closed: '已关闭',
}
const emptyForm: SupplyDemandWriteInput = {
  type: 'demand',
  category: categories[0],
  title: '',
  description: '',
  contactName: '',
  contactPhone: '',
  expiresAt: null,
}

function formatDate(value: string | null) {
  if (!value) return '长期有效'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}

export function SupplyDemandsScreen() {
  const [rows, setRows] = useState<SupplyDemandDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [type, setType] = useState<SupplyDemandDto['type'] | ''>('')
  const [status, setStatus] = useState<SupplyDemandDto['status'] | ''>('')
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [canManageConsultations, setCanManageConsultations] = useState(false)
  const [consultations, setConsultations] = useState<SupplyDemandConsultationDto[]>([])
  const [unbound, setUnbound] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SupplyDemandDto | null>(null)
  const [form, setForm] = useState<SupplyDemandWriteInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const size = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const workspace = await getEnterpriseWorkspace()
      if (!workspace.enterprise) {
        setUnbound(true)
        setRows([])
        setTotal(0)
        setConsultations([])
        setCanManage(false)
        setCanManageConsultations(false)
        return
      }
      setUnbound(false)
      const mayManageConsultations = workspace.permissions.includes('supply_demand.consultation.manage')
      const [result, consultationResult] = await Promise.all([
        listEnterpriseSupplyDemands({
          keyword: appliedKeyword,
          type: type || undefined,
          status: status || undefined,
          page,
          size,
        }),
        mayManageConsultations
          ? listEnterpriseSupplyDemandConsultations({ direction: 'received', page: 1, size: 10 })
          : Promise.resolve({ total: 0, page: 1, size: 10, list: [] }),
      ])
      setRows(result.list)
      setTotal(result.total)
      setCanManage(workspace.permissions.includes('supply_demand.manage'))
      setCanManageConsultations(mayManageConsultations)
      setConsultations(consultationResult.list)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '供需数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [appliedKeyword, page, status, type])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(item: SupplyDemandDto) {
    setEditing(item)
    setForm({
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      expiresAt: item.expiresAt,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !form.description.trim() || !form.contactName.trim() || !form.contactPhone.trim()) {
      toast.error('请完整填写标题、说明与联系人信息')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateEnterpriseSupplyDemand(editing.id, {
          ...form,
          expectedVersion: editing.version,
        })
        toast.success('供需信息已更新')
      } else {
        await createEnterpriseSupplyDemand(form)
        toast.success('供需草稿已创建')
      }
      setDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function act(item: SupplyDemandDto, action: 'submit' | 'withdraw') {
    try {
      await actEnterpriseSupplyDemand(item.id, action, item.version)
      toast.success(action === 'submit' ? '已提交平台审核' : '供需信息已撤回')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  async function actConsultation(
    item: SupplyDemandConsultationDto,
    action: 'follow' | 'complete' | 'close',
  ) {
    try {
      await actEnterpriseSupplyDemandConsultation(item.id, action, item.version)
      toast.success(action === 'follow' ? '咨询已进入跟进' : action === 'complete' ? '咨询已完成' : '咨询已关闭')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '咨询状态更新失败')
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="企业业务"
        title="供需"
        description="创建企业供给或需求，提交平台审核后在网站端公开展示。"
        icon={PackageSearch}
        action={canManage ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新建供需
          </Button>
        ) : null}
      />
      {unbound ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前账号未关联企业，暂无法查看供需数据。请先完成企业入驻后再访问该功能。
        </div>
      ) : null}

      <form
        className="rounded-xl border border-border/70 bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setAppliedKeyword(keyword.trim())
        }}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标题或说明"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(event) => {
              setPage(1)
              setType(event.target.value as typeof type)
            }}
            aria-label="供需类型"
          >
            <option value="">全部类型</option>
            <option value="supply">供给</option>
            <option value="demand">需求</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value as typeof status)
            }}
            aria-label="发布状态"
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="pending">待审核</option>
            <option value="published">已发布</option>
            <option value="rejected">已驳回</option>
            <option value="withdrawn">已撤回</option>
          </select>
          <Button type="submit" variant="outline">查询</Button>
        </div>
      </form>

      <section className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b bg-muted/25 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">供需信息</th>
                <th className="px-4 py-3 font-medium">类型 / 分类</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">有效期</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="w-[210px] px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />正在加载供需数据…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">暂无符合条件的供需信息</td></tr>
              ) : rows.map((item) => (
                <tr key={item.id} className="align-top hover:bg-muted/15">
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 max-w-md line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    {item.reviewNote ? <p className="mt-2 text-xs text-red-600">审核意见：{item.reviewNote}</p> : null}
                  </td>
                  <td className="px-4 py-4"><span className="font-medium">{item.type === 'supply' ? '供给' : '需求'}</span><p className="mt-1 text-xs text-muted-foreground">{item.category}</p></td>
                  <td className="px-4 py-4"><StatusBadge status={item.status} label={supplyDemandStatusLabels[item.status]} /></td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(item.expiresAt)}</td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(item.updatedAt)}</td>
                  <td className="px-5 py-4">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        {['draft', 'rejected', 'withdrawn'].includes(item.status) ? (
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Edit3 className="h-3.5 w-3.5" />编辑</Button>
                        ) : null}
                        {['draft', 'rejected', 'withdrawn'].includes(item.status) ? (
                          <Button size="sm" onClick={() => void act(item, 'submit')}><Send className="h-3.5 w-3.5" />提交</Button>
                        ) : null}
                        {['pending', 'published'].includes(item.status) ? (
                          <Button size="sm" variant="outline" onClick={() => void act(item, 'withdraw')}><Undo2 className="h-3.5 w-3.5" />撤回</Button>
                        ) : null}
                      </div>
                    ) : <p className="text-right text-xs text-muted-foreground">只读</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</Button>
            <span>第 {page} / {Math.max(1, Math.ceil(total / size))} 页</span>
            <Button size="sm" variant="outline" disabled={page * size >= total} onClick={() => setPage((value) => value + 1)}>下一页</Button>
          </div>
        </div>
      </section>

      {canManageConsultations ? (
        <section className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <MessageSquareText className="h-4 w-4 text-ember-700" />
                收到的合作咨询
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">查看网站访客针对已发布供需提交的合作意向。</p>
            </div>
            <span className="text-xs text-muted-foreground">最近 {consultations.length} 条</span>
          </div>
          {consultations.length ? (
            <div className="divide-y">
              {consultations.map((item) => (
                <article key={item.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.supplyDemandTitle}</p>
                      <StatusBadge status={item.status} label={consultationStatusLabels[item.status]} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.message}</p>
                    {item.followupNote ? <p className="mt-1 text-xs text-ember-700">跟进记录：{item.followupNote}</p> : null}
                  </div>
                  <div className="text-xs leading-6 text-muted-foreground">
                    <p className="font-medium text-foreground">{item.contactName}</p>
                    <p>{item.contactPhone}</p>
                    <p>{formatDate(item.createdAt)}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    {item.status === 'new' ? (
                      <Button size="sm" variant="outline" onClick={() => void actConsultation(item, 'follow')}>
                        <MessageSquareText className="h-3.5 w-3.5" />跟进
                      </Button>
                    ) : null}
                    {['new', 'following'].includes(item.status) ? (
                      <>
                        <Button size="sm" onClick={() => void actConsultation(item, 'complete')}>
                          <CheckCircle2 className="h-3.5 w-3.5" />完成
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void actConsultation(item, 'close')}>
                          <XCircle className="h-3.5 w-3.5" />关闭
                        </Button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">暂无收到的合作咨询</div>
          )}
        </section>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑供需' : '新建供需'}</DialogTitle>
            <DialogDescription>保存后为草稿，确认内容无误后再提交平台审核。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2"><Label>类型</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value as SupplyDemandWriteInput['type'] }))}><option value="demand">需求</option><option value="supply">供给</option></select></div>
            <div className="space-y-2"><Label>业务分类</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2 sm:col-span-2"><Label>标题</Label><Input value={form.title} maxLength={200} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>详细说明</Label><Textarea className="min-h-32" value={form.description} maxLength={10000} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></div>
            <div className="space-y-2"><Label>联系人</Label><Input value={form.contactName} onChange={(event) => setForm((value) => ({ ...value, contactName: event.target.value }))} /></div>
            <div className="space-y-2"><Label>联系电话</Label><Input type="tel" value={form.contactPhone} onChange={(event) => setForm((value) => ({ ...value, contactPhone: event.target.value }))} /></div>
            <div className="space-y-2"><Label>有效期至</Label><Input type="date" value={form.expiresAt?.slice(0, 10) ?? ''} onChange={(event) => setForm((value) => ({ ...value, expiresAt: event.target.value ? `${event.target.value}T23:59:59+08:00` : null }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button disabled={saving} onClick={() => void save()}>{saving ? '正在保存…' : '保存草稿'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
