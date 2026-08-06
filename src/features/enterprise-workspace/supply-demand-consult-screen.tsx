'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, LoaderCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  createSupplyDemandConsultation,
  getEnterpriseAccount,
  getEnterpriseWorkspace,
  getPublicSupplyDemand,
  type SupplyDemandDto,
} from '@/api/client/enterprise-workspace'
import { PageHeading } from '@/components/management/page-heading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const typeLabels: Record<SupplyDemandDto['type'], string> = {
  supply: '供应',
  demand: '需求',
}

export function SupplyDemandConsultScreen() {
  const params = useParams<{ workspaceId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const workspaceId = params.workspaceId
  const itemId = searchParams.get('itemId')?.trim() ?? ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [item, setItem] = useState<SupplyDemandDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!itemId || !/^\d+$/.test(itemId)) {
        setError('缺少有效的供需信息编号')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const workspace = await getEnterpriseWorkspace()
        if (!workspace.enterprise) {
          if (!active) return
          setError('当前账号尚未绑定企业，无法发起合作咨询')
          setItem(null)
          return
        }
        const [supply, account] = await Promise.all([
          getPublicSupplyDemand(itemId),
          getEnterpriseAccount().catch(() => null),
        ])
        if (!active) return
        if (supply.enterpriseId === workspace.enterprise.id) {
          setError('不能咨询本企业发布的供需信息')
          setItem(supply)
          return
        }
        setItem(supply)
        setContactName((current) => current || account?.display_name || '')
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : '加载供需信息失败')
        setItem(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [itemId])

  async function submit() {
    if (!item) return
    if (!contactName.trim() || !contactPhone.trim() || message.trim().length < 2) {
      toast.error('请完整填写联系人、联系电话和咨询内容')
      return
    }
    setSaving(true)
    try {
      await createSupplyDemandConsultation(item.id, {
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        message: message.trim(),
      })
      toast.success('咨询已发送')
      router.replace(`/w/${workspaceId}/supply-demands`)
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : '咨询提交失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <PageHeading
        eyebrow="企业工作台"
        title="发起合作咨询"
        description="向发布方发送合作意向，对方可在企业工作台跟进。"
      />

      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/w/${workspaceId}/supply-demands`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            返回供需
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          正在加载供需信息…
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
          {error}
        </div>
      ) : null}

      {!loading && item && !error ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">
              {typeLabels[item.type]} · {item.category}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em]">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">发布企业：{item.enterpriseName}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
              {item.description}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
            <h3 className="font-display text-base font-semibold">咨询内容</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="consult-contact-name">联系人</Label>
                <Input
                  id="consult-contact-name"
                  value={contactName}
                  maxLength={64}
                  onChange={(event) => setContactName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consult-contact-phone">联系电话</Label>
                <Input
                  id="consult-contact-phone"
                  type="tel"
                  value={contactPhone}
                  maxLength={64}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="consult-message">合作意向</Label>
                <Textarea
                  id="consult-message"
                  className="min-h-32"
                  value={message}
                  maxLength={5000}
                  placeholder="简要说明贵司能力、意向合作方式与可联系时间"
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button disabled={saving} onClick={() => void submit()}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {saving ? '发送中…' : '发送咨询'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
