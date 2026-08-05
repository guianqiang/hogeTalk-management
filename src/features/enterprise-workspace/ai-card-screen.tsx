'use client'

import { useEffect, useState } from 'react'
import { ContactRound, ImagePlus, LoaderCircle, Save, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getEnterpriseAiCard,
  getEnterpriseWorkspace,
  saveEnterpriseAiCard,
  uploadEnterpriseImage,
  type AiCardDto,
  type AiCardWriteInput,
} from '@/api/client/enterprise-workspace'
import { PageHeading } from '@/components/management/page-heading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const emptyCard: AiCardWriteInput = {
  displayName: '',
  displayNameEn: null,
  title: null,
  companyName: '',
  companyNameEn: null,
  subtitle: null,
  phone: null,
  email: null,
  wechat: null,
  address: null,
  bio: null,
  avatarMediaId: null,
  companyLogoMediaId: null,
  theme: 'business',
  displayConfig: { phone: true, email: true, wechat: true, address: true, bio: true },
  visibility: 'private',
  expectedVersion: null,
}

function value(value: string) {
  return value.trim() || null
}

export function AiCardScreen() {
  const [card, setCard] = useState<AiCardDto | null>(null)
  const [form, setForm] = useState<AiCardWriteInput>(emptyCard)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'avatar' | 'logo' | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [canPublish, setCanPublish] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [unbound, setUnbound] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const workspace = await getEnterpriseWorkspace()
        if (!active) return
        if (!workspace.enterprise) {
          setUnbound(true)
          setCanManage(false)
          setCanPublish(false)
          return
        }
        setUnbound(false)
        setCanManage(workspace.permissions.includes('ai_card.manage'))
        setCanPublish(workspace.permissions.includes('ai_card.publish'))
        const result = await getEnterpriseAiCard()
        if (!active) return
        if (!result) {
          setCard(null)
          setAvatarPreview(null)
          setLogoPreview(null)
          setForm(emptyCard)
          return
        }
        setCard(result)
        setAvatarPreview(result?.avatarUrl ?? null)
        setLogoPreview(result?.companyLogoUrl ?? null)
        setForm({
          displayName: result.displayName,
          displayNameEn: result.displayNameEn,
          title: result.title,
          companyName: result.companyName,
          companyNameEn: result.companyNameEn,
          subtitle: result.subtitle,
          phone: result.phone,
          email: result.email,
          wechat: result.wechat,
          address: result.address,
          bio: result.bio,
          avatarMediaId: result.avatarMediaId,
          companyLogoMediaId: result.companyLogoMediaId,
          theme: result.theme,
          displayConfig: result.displayConfig,
          visibility: result.visibility,
          expectedVersion: result.version,
        })
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : 'AI 名片加载失败')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function upload(file: File, field: 'avatar' | 'logo') {
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    setUploading(field)
    try {
      const result = await uploadEnterpriseImage(file, field === 'avatar' ? 'profile' : 'enterprise')
      setForm((current) => ({
        ...current,
        [field === 'avatar' ? 'avatarMediaId' : 'companyLogoMediaId']: result.id,
      }))
      if (field === 'avatar') setAvatarPreview(result.access_url || result.media_url)
      else setLogoPreview(result.access_url || result.media_url)
      toast.success('图片已上传')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败')
    } finally {
      setUploading(null)
    }
  }

  async function save() {
    if (!form.displayName.trim() || !form.companyName.trim()) {
      toast.error('请填写姓名和企业名称')
      return
    }
    setSaving(true)
    try {
      const result = await saveEnterpriseAiCard({
        ...form,
        displayName: form.displayName.trim(),
        displayNameEn: value(form.displayNameEn ?? ''),
        title: value(form.title ?? ''),
        companyName: form.companyName.trim(),
        companyNameEn: value(form.companyNameEn ?? ''),
        subtitle: value(form.subtitle ?? ''),
        phone: value(form.phone ?? ''),
        email: value(form.email ?? ''),
        wechat: value(form.wechat ?? ''),
        address: value(form.address ?? ''),
        bio: value(form.bio ?? ''),
      })
      setCard(result)
      setForm((current) => ({ ...current, expectedVersion: result.version }))
      toast.success('AI 名片已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI 名片保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="grid min-h-64 place-items-center text-sm text-muted-foreground"><LoaderCircle className="mb-2 h-5 w-5 animate-spin" />正在加载 AI 名片…</div>
  }

  return (
    <div>
      <PageHeading
        eyebrow="企业形象"
        title="AI 名片"
        description="维护企业人员名片和公开字段，保存后可按权限发布到网站端。"
        icon={ContactRound}
        action={canManage ? <Button disabled={saving} onClick={() => void save()}><Save className="h-4 w-4" />{saving ? '正在保存…' : '保存名片'}</Button> : null}
      />
      {unbound ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前账号未关联企业，暂无法编辑 AI 名片。请先完成企业入驻后再访问该功能。
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">基础信息</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>姓名</Label><Input disabled={!canManage} value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} /></div>
              <div className="space-y-2"><Label>英文姓名</Label><Input disabled={!canManage} value={form.displayNameEn ?? ''} onChange={(event) => setForm((current) => ({ ...current, displayNameEn: event.target.value }))} /></div>
              <div className="space-y-2"><Label>职务</Label><Input disabled={!canManage} value={form.title ?? ''} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></div>
              <div className="space-y-2"><Label>企业名称</Label><Input disabled={!canManage} value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} /></div>
              <div className="space-y-2"><Label>企业英文名称</Label><Input disabled={!canManage} value={form.companyNameEn ?? ''} onChange={(event) => setForm((current) => ({ ...current, companyNameEn: event.target.value }))} /></div>
              <div className="space-y-2"><Label>名片副标题</Label><Input disabled={!canManage} value={form.subtitle ?? ''} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} /></div>
              <div className="space-y-2"><Label>头像</Label><label className="flex h-24 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 hover:border-ember-300"><span className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-muted">{avatarPreview ? <img src={avatarPreview} alt="头像预览" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}</span><span className="text-xs text-muted-foreground">{uploading === 'avatar' ? '上传中…' : '选择头像图片'}</span><input disabled={!canManage || Boolean(uploading)} type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, 'avatar') }} /></label></div>
              <div className="space-y-2"><Label>企业 Logo</Label><label className="flex h-24 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 hover:border-ember-300"><span className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-muted">{logoPreview ? <img src={logoPreview} alt="企业 Logo 预览" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}</span><span className="text-xs text-muted-foreground">{uploading === 'logo' ? '上传中…' : '选择 Logo 图片'}</span><input disabled={!canManage || Boolean(uploading)} type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, 'logo') }} /></label></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">联系方式与介绍</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>联系电话</Label><Input type="tel" disabled={!canManage} value={form.phone ?? ''} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></div>
              <div className="space-y-2"><Label>邮箱</Label><Input type="email" disabled={!canManage} value={form.email ?? ''} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label>微信</Label><Input disabled={!canManage} value={form.wechat ?? ''} onChange={(event) => setForm((current) => ({ ...current, wechat: event.target.value }))} /></div>
              <div className="space-y-2"><Label>地址</Label><Input disabled={!canManage} value={form.address ?? ''} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>个人介绍</Label><Textarea className="min-h-28" disabled={!canManage} value={form.bio ?? ''} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">展示设置</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>名片主题</Label><select disabled={!canManage} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.theme} onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value as AiCardWriteInput['theme'] }))}><option value="business">商务</option><option value="fashion">时尚</option></select></div>
              <div className="space-y-2"><Label>发布范围</Label><select disabled={!canManage} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as AiCardWriteInput['visibility'] }))}><option value="private">仅企业内可见</option>{canPublish ? <option value="public">网站公开</option> : null}</select>{!canPublish ? <p className="text-xs text-muted-foreground">当前账号没有名片发布权限。</p> : null}</div>
              <div className="border-t pt-4"><Label>公开字段</Label><div className="mt-3 space-y-3">{[['phone', '联系电话'], ['email', '邮箱'], ['wechat', '微信'], ['address', '地址'], ['bio', '个人介绍']].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox disabled={!canManage} checked={form.displayConfig[key] !== false} onCheckedChange={(checked) => setForm((current) => ({ ...current, displayConfig: { ...current.displayConfig, [key]: checked === true } }))} />{label}</label>)}</div></div>
            </CardContent>
          </Card>
          {card?.visibility === 'public' ? <Card><CardContent className="p-5"><div className="flex items-start gap-3"><Share2 className="mt-0.5 h-4 w-4 text-ember-700" /><div><p className="text-sm font-medium">名片已公开</p><p className="mt-1 break-all text-xs leading-5 text-muted-foreground">分享标识：{card.shareId}</p></div></div></CardContent></Card> : null}
        </div>
      </div>
    </div>
  )
}
