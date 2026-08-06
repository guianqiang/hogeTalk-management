'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BadgeCheck,
  Clock3,
  LoaderCircle,
  Send,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { VerificationLevelDto } from '@/api/generated/huameng-platform'
import {
  cancelEnterpriseVerification,
  getCurrentEnterpriseVerification,
  getEnterpriseWorkspace,
  resubmitEnterpriseVerification,
  submitEnterpriseVerification,
  uploadEnterpriseImage,
  type EnterpriseVerificationApplicationDto,
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

const statusLabels: Record<EnterpriseVerificationApplicationDto['status'], string> = {
  submitted: '已提交',
  needs_more_info: '需补充材料',
  under_review: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function EnterpriseVerificationScreen() {
  const [workspace, setWorkspace] = useState<EnterpriseWorkspaceDto | null>(null)
  const [application, setApplication] = useState<EnterpriseVerificationApplicationDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestedLevel, setRequestedLevel] = useState<VerificationLevelDto>('L1')
  const [statement, setStatement] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const workspaceDto = await getEnterpriseWorkspace()
      setWorkspace(workspaceDto)
      if (!workspaceDto.enterprise) {
        setApplication(null)
        return
      }
      const current = await getCurrentEnterpriseVerification(workspaceDto.enterprise.id)
      setApplication(current)
      if (current) {
        setRequestedLevel(current.requested_level)
        setStatement(current.statement ?? '')
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '平台认证信息加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit() {
    if (!workspace?.enterprise) return
    if (!evidenceFile) {
      toast.error('请上传至少一份认证材料')
      return
    }
    setSaving(true)
    try {
      const uploaded = await uploadEnterpriseImage(evidenceFile, 'enterprise')
      if (!uploaded.object_key || !uploaded.sha256) {
        throw new Error('上传结果缺少 object_key 或 sha256，请重建后端后再试')
      }
      const evidence = [{
        type: 'registration_document' as const,
        objectKey: uploaded.object_key,
        sha256: uploaded.sha256,
        note: evidenceFile.name,
      }]
      const canResubmit = application
        && ['rejected', 'needs_more_info', 'cancelled'].includes(application.status)
      const result = canResubmit
        ? await resubmitEnterpriseVerification(application.id, {
          requestedLevel,
          statement,
          evidence,
        })
        : await submitEnterpriseVerification(workspace.enterprise.id, {
          requestedLevel,
          statement,
          evidence,
        })
      setApplication(result)
      setEvidenceFile(null)
      toast.success('平台认证申请已提交')
      await load()
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '提交认证申请失败')
    } finally {
      setSaving(false)
    }
  }

  async function cancel() {
    if (!application) return
    setSaving(true)
    try {
      await cancelEnterpriseVerification(application.id)
      toast.success('已取消认证申请')
      await load()
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : '取消失败')
    } finally {
      setSaving(false)
    }
  }

  const onboardingApproved = workspace?.enterprise?.onboardingStatus === 'approved'
  const verified = workspace?.enterprise?.verificationStatus === 'verified'
  const pendingStatuses = new Set(['submitted', 'under_review', 'needs_more_info'])
  const showForm = onboardingApproved && !verified && (
    !application
    || ['rejected', 'needs_more_info', 'cancelled'].includes(application.status)
  )

  return (
    <div>
      <PageHeading
        eyebrow="企业工作台"
        title="平台认证"
        description="提交企业 L1–L3 平台认证申请；审核通过后工作台将展示对应认证等级。"
        icon={BadgeCheck}
        action={application ? (
          <StatusBadge status={application.status} label={statusLabels[application.status]} />
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
      ) : !workspace?.enterprise ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          当前账号还未入驻企业，请先完成企业入驻后再申请平台认证。
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">认证状态</p>
                <p className="mt-1 text-sm font-medium">
                  {verified
                    ? `已认证 · ${workspace.enterprise.platformLevel || '—'} 级`
                    : workspace.enterprise.verificationStatus === 'pending'
                      ? '认证审核中'
                      : workspace.enterprise.verificationStatus === 'rejected'
                        ? '认证未通过'
                        : '未认证'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平台等级</p>
                <p className="mt-1 text-sm font-medium">
                  {workspace.enterprise.platformLevel > 0
                    ? `${workspace.enterprise.platformLevel} 级`
                    : '未设置'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">有效期</p>
                <p className="mt-1 text-sm font-medium">
                  {workspace.enterprise.platformLevelExpireAt
                    ? formatDateTime(workspace.enterprise.platformLevelExpireAt)
                    : (workspace.enterprise.platformLevel > 0 ? '长期有效' : '—')}
                </p>
              </div>
            </CardContent>
          </Card>

          {!onboardingApproved ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                企业入驻尚未通过，暂不能申请平台认证。请先完成入驻审核。
              </p>
            </div>
          ) : null}

          {application && pendingStatuses.has(application.status) ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  认证申请{statusLabels[application.status]}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  申请等级 {application.requested_level}
                  {application.reviewer_note ? ` · 审核意见：${application.reviewer_note}` : ''}
                </p>
                {application.required_items?.length ? (
                  <p className="mt-1 text-xs text-amber-700">
                    需补充：{application.required_items.join('、')}
                  </p>
                ) : null}
              </div>
              {application.status === 'submitted' ? (
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void cancel()}>
                  取消申请
                </Button>
              ) : null}
            </div>
          ) : null}

          {application?.status === 'rejected' ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-700">认证申请被驳回</p>
                <p className="mt-1 text-xs text-red-600">
                  {application.reviewer_note?.trim() || '平台未填写具体原因'}
                </p>
              </div>
            </div>
          ) : null}

          {verified && application?.status === 'approved' ? (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  平台认证已通过（{application.approved_level ?? application.requested_level}）
                </p>
                <p className="mt-1 text-xs text-green-700">
                  有效期：{application.valid_until ? formatDateTime(application.valid_until) : '长期有效'}
                </p>
              </div>
            </div>
          ) : null}

          {showForm ? (
            <Card>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start gap-3 rounded-lg border border-ember-200 bg-ember-50/60 p-4">
                  <Send className="mt-0.5 h-5 w-5 shrink-0 text-ember-700" />
                  <div>
                    <p className="text-sm font-semibold">提交平台认证申请</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      请选择申请等级并上传营业执照或其他登记材料，平台审核通过后会同步更新认证状态与等级。
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>申请等级</Label>
                    <Select value={requestedLevel} onValueChange={(value) => setRequestedLevel(value as VerificationLevelDto)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L1">L1</SelectItem>
                        <SelectItem value="L2">L2</SelectItem>
                        <SelectItem value="L3">L3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verification-evidence">认证材料（必传）</Label>
                    <Input
                      id="verification-evidence"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="verification-statement">申请说明</Label>
                    <Textarea
                      id="verification-statement"
                      rows={3}
                      value={statement}
                      onChange={(event) => setStatement(event.target.value)}
                      maxLength={2000}
                      placeholder="可说明企业资质、材料清单或合作诉求"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button disabled={saving || !evidenceFile} onClick={() => void submit()}>
                    {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {application && ['rejected', 'needs_more_info', 'cancelled'].includes(application.status)
                      ? '重新提交申请'
                      : '提交认证申请'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
