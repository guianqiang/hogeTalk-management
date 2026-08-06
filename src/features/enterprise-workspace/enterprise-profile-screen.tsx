'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Send,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  applyEnterpriseDirectory,
  createEnterprise,
  getEnterpriseProfile,
  getEnterpriseWorkspace,
  resubmitEnterpriseDirectory,
  updateEnterpriseSelfProfile,
  type EnterpriseProfileDto,
  type EnterpriseSelfProfileInput,
  type EnterpriseWorkspaceDto,
} from '@/api/client/enterprise-workspace'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useManagement } from '@/lib/management'

const auditStatusLabels: Record<EnterpriseProfileDto['audit_status'], string> = {
  pending: '入驻审核中',
  approved: '入驻已通过',
  rejected: '入驻已打回',
}

const countryOptions: Array<[string, string]> = [
  ['CN', '中国'],
  ['MY', '马来西亚'],
  ['SG', '新加坡'],
  ['TH', '泰国'],
  ['VN', '越南'],
  ['ID', '印度尼西亚'],
  ['PH', '菲律宾'],
  ['KH', '柬埔寨'],
  ['LA', '老挝'],
  ['MM', '缅甸'],
  ['BN', '文莱'],
]

interface ProfileFormState {
  name: string
  declaredCreditCode: string
  legalPerson: string
  contactName: string
  contactPhone: string
  contactEmail: string
  address: string
  mainBusiness: string
  description: string
}

const emptyForm: ProfileFormState = {
  name: '',
  declaredCreditCode: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  mainBusiness: '',
  description: '',
}

function formFromProfile(profile: EnterpriseProfileDto): ProfileFormState {
  return {
    name: profile.name,
    declaredCreditCode: profile.declared_credit_code ?? '',
    legalPerson: profile.legal_person ?? '',
    contactName: profile.contact_name ?? '',
    contactPhone: profile.contact_phone ?? '',
    contactEmail: profile.contact_email ?? '',
    address: profile.address ?? '',
    mainBusiness: profile.main_business ?? '',
    description: profile.description ?? '',
  }
}

function profileBody(form: ProfileFormState): EnterpriseSelfProfileInput {
  return {
    name: form.name.trim(),
    declared_credit_code: form.declaredCreditCode.trim() || null,
    legal_person: form.legalPerson.trim() || null,
    contact_name: form.contactName.trim() || null,
    contact_phone: form.contactPhone.trim() || null,
    contact_email: form.contactEmail.trim() || null,
    address: form.address.trim() || null,
    main_business: form.mainBusiness.trim() || null,
    description: form.description.trim() || null,
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function EnterpriseProfileScreen() {
  const router = useRouter()
  const { bootstrap } = useManagement()
  const [workspaceDto, setWorkspaceDto] = useState<EnterpriseWorkspaceDto | null>(null)
  const [profile, setProfile] = useState<EnterpriseProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileFormState>(emptyForm)
  const [countryCode, setCountryCode] = useState('CN')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const workspace = await getEnterpriseWorkspace()
      setWorkspaceDto(workspace)
      if (workspace.enterprise) {
        const nextProfile = await getEnterpriseProfile()
        setProfile(nextProfile)
        setForm(formFromProfile(nextProfile))
      } else {
        setProfile(null)
        setForm(emptyForm)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '企业信息加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function setField(field: keyof ProfileFormState) {
    return (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const value = event.target.value
      setForm((current) => ({ ...current, [field]: value }))
    }
  }

  function validateForm() {
    if (!form.name.trim()) {
      toast.error('请填写企业名称')
      return false
    }
    return true
  }

  async function submitApplication() {
    if (!validateForm()) return
    setSaving(true)
    try {
      const created = await createEnterprise({
        legalName: form.name,
        displayName: form.name,
        countryCode,
      })
      try {
        await applyEnterpriseDirectory(profileBody(form))
      } catch (applyError) {
        toast.error(applyError instanceof Error ? applyError.message : '入驻资料提交失败，可稍后在企业信息页补充')
      }
      toast.success('入驻申请已提交，等待平台审核')
      await bootstrap('enterprise')
      router.replace(`/w/${created.enterprise.id}/enterprise-profile`)
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '入驻申请提交失败')
    } finally {
      setSaving(false)
    }
  }

  async function resubmitApplication() {
    if (!profile || !validateForm()) return
    setSaving(true)
    try {
      const updated = await updateEnterpriseSelfProfile(profile.version, profileBody(form))
      await resubmitEnterpriseDirectory(updated.version)
      toast.success('已重新提交入驻申请，等待平台审核')
      await load()
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '重新提交失败')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const mode: 'apply' | 'pending' | 'rejected' | 'approved' | null = !workspaceDto
    ? null
    : workspaceDto.enterprise === null
      ? 'apply'
      : profile?.audit_status === 'rejected'
        ? 'rejected'
        : profile?.audit_status === 'approved'
          ? 'approved'
          : 'pending'

  const showForm = mode === 'apply' || mode === 'rejected'

  const formFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ep-name">企业名称（必填）</Label>
        <Input id="ep-name" value={form.name} onChange={setField('name')} maxLength={200} placeholder="请填写营业执照上的企业全称" required />
      </div>
      {mode === 'apply' ? (
        <div className="space-y-2">
          <Label>注册国家 / 地区</Label>
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger aria-label="注册国家"><SelectValue /></SelectTrigger>
            <SelectContent>
              {countryOptions.map(([code, label]) => (
                <SelectItem key={code} value={code}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="ep-credit-code">统一社会信用代码</Label>
        <Input id="ep-credit-code" value={form.declaredCreditCode} onChange={setField('declaredCreditCode')} maxLength={100} placeholder="选填" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-legal-person">法定代表人</Label>
        <Input id="ep-legal-person" value={form.legalPerson} onChange={setField('legalPerson')} maxLength={80} placeholder="选填" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-contact-name">联系人</Label>
        <Input id="ep-contact-name" value={form.contactName} onChange={setField('contactName')} maxLength={80} placeholder="选填" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-contact-phone">联系电话</Label>
        <Input id="ep-contact-phone" value={form.contactPhone} onChange={setField('contactPhone')} maxLength={80} placeholder="选填" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-contact-email">联系邮箱</Label>
        <Input id="ep-contact-email" value={form.contactEmail} onChange={setField('contactEmail')} maxLength={320} placeholder="选填" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ep-address">企业地址</Label>
        <Input id="ep-address" value={form.address} onChange={setField('address')} maxLength={1000} placeholder="选填" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ep-main-business">主营业务</Label>
        <Textarea id="ep-main-business" value={form.mainBusiness} onChange={setField('mainBusiness')} maxLength={2000} rows={2} placeholder="简要说明企业主营的产品或服务" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ep-description">企业简介</Label>
        <Textarea id="ep-description" value={form.description} onChange={setField('description')} maxLength={5000} rows={4} placeholder="介绍企业的业务范围、优势与合作意向，审核人员会参考该信息" />
      </div>
    </div>
  )

  const profileView = profile ? (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {[
        ['企业名称', profile.name],
        ['注册国家 / 地区', countryOptions.find(([code]) => code === profile.country_code)?.[1] ?? profile.country_code],
        ['统一社会信用代码', profile.declared_credit_code],
        ['法定代表人', profile.legal_person],
        ['联系人', profile.contact_name],
        ['联系电话', profile.contact_phone],
        ['联系邮箱', profile.contact_email],
        ['企业地址', profile.address],
        ['主营业务', profile.main_business],
        ['企业简介', profile.description],
      ].map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{value?.trim() || '—'}</p>
        </div>
      ))}
      <div>
        <p className="text-xs text-muted-foreground">最近审核时间</p>
        <p className="mt-1 text-sm">{formatDateTime(profile.audited_at)}</p>
      </div>
    </div>
  ) : null

  return (
    <div>
      <PageHeading
        eyebrow="企业工作台"
        title="企业信息"
        description="维护企业入驻申请与对外展示的企业资料。"
        icon={Building2}
        action={profile ? (
          <StatusBadge status={profile.audit_status} label={auditStatusLabels[profile.audit_status]} />
        ) : null}
      />

      {loading ? (
        <div className="grid place-items-center rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.04)] py-20">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {mode === 'apply' ? (
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-ember-200 bg-ember-50/60 p-4">
                  <Send className="mt-0.5 h-5 w-5 shrink-0 text-ember-700" />
                  <div>
                    <p className="text-sm font-semibold">申请企业入驻</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      当前账号尚未关联企业。填写企业信息并提交后，平台会进行入驻审核；审核通过后即可使用供需发布、AI 名片等全部功能。
                    </p>
                  </div>
                </div>
                {formFields}
                <div className="mt-6 flex justify-end">
                  <Button disabled={saving} onClick={() => void submitApplication()}>
                    {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    提交入驻申请
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {mode === 'pending' ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">入驻申请审核中</p>
                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    平台正在审核你的入驻申请，审核结果会直接更新在本页面，请耐心等待。
                  </p>
                </div>
              </div>
              <Card>
                <CardContent className="p-5 sm:p-6">{profileView}</CardContent>
              </Card>
            </>
          ) : null}

          {mode === 'rejected' && profile ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-700">入驻申请被打回</p>
                  <p className="mt-1 text-xs leading-5 text-red-600">
                    打回原因：{profile.audit_remark?.trim() || '平台未填写具体原因'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    请根据打回原因修改下方资料后重新提交。
                  </p>
                </div>
              </div>
              <Card>
                <CardContent className="p-5 sm:p-6">
                  {formFields}
                  <div className="mt-6 flex justify-end">
                    <Button disabled={saving} onClick={() => void resubmitApplication()}>
                      {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      修改并重新提交
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {mode === 'approved' && profile ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">企业已完成入驻</p>
                  <p className="mt-1 text-xs leading-5 text-green-700">
                    入驻资料已锁定为只读；如需调整平台认证等级，请前往「平台认证」申请。
                  </p>
                </div>
              </div>
              <Card>
                <CardContent className="p-5 sm:p-6">{profileView}</CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
