'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  createChamberEnterprise,
  deleteChamberEnterprise,
  listChamberEnterpriseImportRows,
  listCurrentChamberLevels,
  setChamberEnterpriseLevel,
  updateChamberEnterprise,
  type CurrentChamberLevelDto,
} from '@/api/client/management'
import type {
  ImportRowDto,
} from '@/api/generated/huameng'
import {
  Building2,
  CircleCheckBig,
  Clock3,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CountrySelect } from '@/components/management/country-select'
import { DateTimeField } from '@/components/management/date-time-field'
import { PageHeading } from '@/components/management/page-heading'
import { StatusBadge } from '@/components/management/status-badge'
import { useManagement } from '@/lib/management'
import {
  isTerminalImportJobStatus,
  nextImportPollDelay,
} from './import-polling'
import type { ChamberAffiliation } from '@/lib/types'
import { PlatformEnterprisesPreview } from './platform-enterprises-preview'

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function dateInputValue(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function countryName(countryCode: string) {
  return new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(countryCode) ?? countryCode
}

const enterpriseTypeLabels: Record<1 | 2 | 3, string> = {
  1: '供应企业',
  2: '采购企业',
  3: '综合企业',
}

interface MemberForm {
  name: string
  countryCode: string
  enterpriseType: '1' | '2' | '3'
  declaredCreditCode: string
  contactPhone: string
  contactEmail: string
  description: string
  levelId: string
  expireAt: string
}

const emptyMemberForm: MemberForm = {
  name: '',
  countryCode: 'CN',
  enterpriseType: '3',
  declaredCreditCode: '',
  contactPhone: '',
  contactEmail: '',
  description: '',
  levelId: 'none',
  expireAt: '',
}

export function EnterprisesScreen() {
  const params = useParams<{ workspaceId: string }>()
  const {
    availableWorkspaces,
    workspaceData,
    refreshWorkspace,
    createEnterpriseImport,
    refreshImportJob,
  } = useManagement()
  const workspace = availableWorkspaces.find((item) => item.id === params.workspaceId)
  const snapshot = workspaceData[params.workspaceId]
  const [keyword, setKeyword] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [validDays, setValidDays] = useState(365)
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false)
  const [checkingJob, setCheckingJob] = useState(false)
  const [pollingNotice, setPollingNotice] = useState<{
    jobId: string
    tone: 'waiting' | 'error'
    message: string
  } | null>(null)
  const [importRowsOpen, setImportRowsOpen] = useState(false)
  const [importRows, setImportRows] = useState<ImportRowDto[]>([])
  const [importRowsLoading, setImportRowsLoading] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<ChamberAffiliation | null>(null)
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm)
  const [deleteTarget, setDeleteTarget] = useState<ChamberAffiliation | null>(null)
  const [levels, setLevels] = useState<CurrentChamberLevelDto[]>([])
  const latestJob = snapshot?.importJobs[0]

  useEffect(() => {
    if (
      !latestJob
      || isTerminalImportJobStatus(latestJob.status)
      || pollingNotice?.jobId === latestJob.jobId
    ) return

    let cancelled = false
    let timer: number | undefined
    let attempt = 0

    const scheduleNextCheck = () => {
      const delay = nextImportPollDelay(attempt)
      if (delay === null) {
        setPollingNotice({
          jobId: latestJob.jobId,
          tone: 'waiting',
          message: '处理时间比平时更长。任务已安全提交，你可以稍后检查结果，无需重复上传。',
        })
        return
      }
      timer = window.setTimeout(() => {
        void refreshImportJob(params.workspaceId, latestJob.jobId)
          .then((job) => {
            if (cancelled || isTerminalImportJobStatus(job.status)) return
            attempt += 1
            scheduleNextCheck()
          })
          .catch(() => {
            if (cancelled) return
            setPollingNotice({
              jobId: latestJob.jobId,
              tone: 'error',
              message: '暂时无法更新处理进度。任务仍保留在后台，请检查网络后再次检查。',
            })
          })
      }, delay)
    }

    scheduleNextCheck()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [
    latestJob?.jobId,
    latestJob?.status,
    params.workspaceId,
    pollingNotice?.jobId,
    refreshImportJob,
  ])

  const affiliations = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return (snapshot?.affiliations ?? []).filter((item) => (
      !normalizedKeyword
      || `${item.enterpriseName}${item.enterpriseId}`.toLowerCase().includes(normalizedKeyword)
    ))
  }, [keyword, snapshot?.affiliations])

  if (!workspace) return null

  if (workspace.kind === 'platform') {
    return <PlatformEnterprisesPreview />
  }

  const progress = latestJob?.totalRows
    ? ((latestJob.succeededRows + latestJob.candidateRows + latestJob.failedRows) / latestJob.totalRows) * 100
    : latestJob && isTerminalImportJobStatus(latestJob.status) ? 100 : 0
  const workspaceId = workspace.id
  const latestJobNotice = pollingNotice?.jobId === latestJob?.jobId ? pollingNotice : null
  const latestJobProcessing = latestJob ? !isTerminalImportJobStatus(latestJob.status) : false

  async function submitImport(event: React.FormEvent) {
    event.preventDefault()
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('请选择 UTF-8 CSV 文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('CSV 文件不能超过 2 MiB')
      return
    }
    if (!responsibilityAccepted) {
      toast.error('请确认商会对导入资料承担核验责任')
      return
    }
    setSubmitting(true)
    try {
      const job = await createEnterpriseImport(workspaceId, {
        file,
        certificationLevelCode: 'BASIC',
        validDays,
        responsibilityAccepted: true,
      })
      setPollingNotice(null)
      setImportOpen(false)
      setFile(null)
      setResponsibilityAccepted(false)
      toast.success('导入任务已提交', { description: `${job.sourceFileName} 正在后台处理，结果会自动更新。` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '企业导入失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function checkLatestImport() {
    if (!latestJob) return
    setCheckingJob(true)
    try {
      const job = await refreshImportJob(workspaceId, latestJob.jobId)
      if (isTerminalImportJobStatus(job.status)) {
        setPollingNotice(null)
        toast.success('导入结果已更新')
      } else {
        setPollingNotice(null)
        toast.info('任务仍在处理中', { description: '页面会继续自动检查，你无需重复上传文件。' })
      }
    } catch {
      setPollingNotice({
        jobId: latestJob.jobId,
        tone: 'error',
        message: '暂时无法更新处理进度。任务仍保留在后台，请检查网络后再次检查。',
      })
    } finally {
      setCheckingJob(false)
    }
  }

  async function loadLevels() {
    try {
      const result = await listCurrentChamberLevels()
      setLevels(result.items)
      return result.items
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '认证等级加载失败')
      return []
    }
  }

  async function openMemberCreate() {
    await loadLevels()
    setEditingMember(null)
    setMemberForm({ ...emptyMemberForm })
    setMemberOpen(true)
  }

  async function openMemberEdit(member: ChamberAffiliation) {
    await loadLevels()
    setEditingMember(member)
    setMemberForm({
      name: member.enterpriseName,
      countryCode: member.countryCode,
      enterpriseType: String(member.enterpriseType) as MemberForm['enterpriseType'],
      declaredCreditCode: member.declaredCreditCode,
      contactPhone: member.contactPhone,
      contactEmail: member.contactEmail,
      description: member.description,
      levelId: member.chamberLevelId ?? 'none',
      expireAt: dateInputValue(member.chamberLevelExpireAt),
    })
    setMemberOpen(true)
  }

  async function submitMember() {
    if (!memberForm.name.trim()) {
      toast.error('请填写会员单位名称')
      return
    }
    if (memberForm.contactEmail && !/^\S+@\S+\.\S+$/.test(memberForm.contactEmail)) {
      toast.error('请填写正确的联系邮箱')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        name: memberForm.name.trim(),
        country_code: memberForm.countryCode,
        enterprise_type: Number(memberForm.enterpriseType) as 1 | 2 | 3,
        declared_credit_code: memberForm.declaredCreditCode.trim() || null,
        contact_phone: memberForm.contactPhone.trim() || null,
        contact_email: memberForm.contactEmail.trim() || null,
        description: memberForm.description.trim() || null,
      }
      let saved = editingMember
        ? await updateChamberEnterprise(editingMember.enterpriseId, editingMember.version, body)
        : await createChamberEnterprise(body)
      const nextLevelId = memberForm.levelId === 'none' ? null : memberForm.levelId
      const levelChanged = !editingMember
        ? nextLevelId !== null
        : editingMember.chamberLevelId !== nextLevelId
          || dateInputValue(editingMember.chamberLevelExpireAt) !== memberForm.expireAt
      if (levelChanged) {
        saved = await setChamberEnterpriseLevel(
          saved.enterprise_id,
          saved.version,
          nextLevelId,
          nextLevelId && memberForm.expireAt ? `${memberForm.expireAt}T23:59:59+08:00` : null,
        )
      }
      await refreshWorkspace(workspaceId)
      setMemberOpen(false)
      toast.success(editingMember ? '会员单位已更新' : '会员单位已录入')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '会员单位保存失败')
      await refreshWorkspace(workspaceId).catch(() => undefined)
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDeleteMember() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteChamberEnterprise(deleteTarget.enterpriseId)
      await refreshWorkspace(workspaceId)
      setDeleteTarget(null)
      toast.success('会员单位已删除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '会员单位删除失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function openImportRows() {
    if (!latestJob) return
    setImportRowsOpen(true)
    setImportRowsLoading(true)
    try {
      const result = await listChamberEnterpriseImportRows(workspaceId, latestJob.jobId)
      setImportRows(result.list)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入行读取失败')
      setImportRows([])
    } finally {
      setImportRowsLoading(false)
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="我的商会"
        title="会员单位"
        description="手动录入或批量导入会员单位，统一维护基础资料、会员等级和有效期。"
        icon={Building2}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void refreshWorkspace(workspace.id)}
              disabled={snapshot?.loading}
            >
              <RefreshCcw className={`h-4 w-4 ${snapshot?.loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" onClick={() => void openMemberCreate()}>
              <Plus className="h-4 w-4" />
              手动录入
            </Button>
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              批量导入
            </Button>
          </div>
        }
      />

      {snapshot?.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {snapshot.error}
        </div>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ['会员单位', snapshot?.affiliations.length ?? 0],
          ['已设置等级', snapshot?.certifications.filter((item) => item.status === 'active').length ?? 0],
          ['待补资料', snapshot?.candidates.filter((item) => item.status === 'needs_identifier').length ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-data mt-2 text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {latestJob && (
        <Card className="mb-4 overflow-hidden border-ember-200">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-ember-600" />
                  <p className="text-sm font-semibold">{latestJob.sourceFileName}</p>
                  <StatusBadge status={latestJob.status} />
                </div>
                <p className="font-data mt-2 text-xs text-muted-foreground">任务编号：{latestJob.jobId}</p>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-xs">
                {[
                  ['总行数', latestJob.totalRows],
                  ['成功', latestJob.succeededRows],
                  ['候选', latestJob.candidateRows],
                  ['失败', latestJob.failedRows],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="font-data text-base font-semibold">{value}</p>
                    <p className="mt-1 text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => void openImportRows()}>
                查看逐行结果
              </Button>
            </div>
            <Progress className="mt-4" value={progress} aria-label="企业导入进度" />
            {latestJobProcessing && !latestJobNotice && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                <LoaderCircle className="h-4 w-4 animate-spin text-ember-600" />
                正在处理导入文件，完成后会自动更新企业和认证信息。
              </div>
            )}
            {latestJobNotice && (
              <div
                className={`mt-4 flex flex-col gap-3 rounded-md border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
                  latestJobNotice.tone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
                aria-live="polite"
              >
                <div className="flex items-start gap-2">
                  {latestJobNotice.tone === 'error'
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    : <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />}
                  <p>{latestJobNotice.message}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 bg-white"
                  onClick={() => void checkLatestImport()}
                  disabled={checkingJob}
                >
                  {checkingJob && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  检查最新进度
                </Button>
              </div>
            )}
            {latestJob.status === 'completed' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-700" aria-live="polite">
                <CircleCheckBig className="h-4 w-4" />
                导入完成，企业关系和认证信息已更新。
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索企业名称"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] text-muted-foreground">
                  <th className="px-5 py-3 font-medium">会员企业</th>
                  <th className="px-4 py-3 font-medium">类型与地区</th>
                  <th className="px-4 py-3 font-medium">会员等级</th>
                  <th className="px-4 py-3 font-medium">平台认证</th>
                  <th className="px-5 py-3 font-medium">更新时间</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {affiliations.map((item) => (
                    <tr key={item.affiliationId}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium">{item.enterpriseName}</p>
                        <p className="font-data mt-1 text-xs text-muted-foreground">
                          {item.declaredCreditCode || item.enterpriseId}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm">{enterpriseTypeLabels[item.enterpriseType]}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{countryName(item.countryCode)}</p>
                      </td>
                      <td className="px-4 py-4">
                        {item.chamberLevelName ? (
                          <div>
                            <p className="text-sm font-medium">{item.chamberLevelName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.chamberLevelExpireAt ? `有效至 ${dateInputValue(item.chamberLevelExpireAt)}` : '长期有效'}
                            </p>
                          </div>
                        ) : <span className="text-sm text-muted-foreground">未设置</span>}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={item.platformVerificationStatus} /></td>
                      <td className="font-data px-5 py-4 text-xs text-muted-foreground">{dateTime(item.updatedAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => void openMemberEdit(item)}>
                            <Pencil className="h-4 w-4" />编辑
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-4 w-4" />删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!affiliations.length && (
            <div className="grid min-h-52 place-items-center text-center">
              <div>
                {snapshot?.loading ? <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-ember-600" /> : <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />}
                <p className="mt-3 text-sm font-medium">{snapshot?.loading ? '正在读取会员单位…' : '暂无会员单位'}</p>
              </div>
            </div>
          )}
          <div className="font-data border-t px-5 py-3 text-xs text-muted-foreground">
            共 {affiliations.length} 条 · {snapshot?.updatedAt ? `更新于 ${dateTime(snapshot.updatedAt)}` : '尚未同步'}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">资料待完善</h2>
            <p className="mt-1 text-xs text-muted-foreground">以下企业缺少可核验的注册标识，完善前不会自动建档或与已有企业合并。</p>
          </div>
          <div className="divide-y">
            {(snapshot?.candidates ?? []).map((item) => (
              <div key={item.candidateId} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{item.legalName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">国家或地区：{item.countryCode}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
            {!snapshot?.candidates.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">暂无候选记录</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={submitImport}>
            <DialogHeader>
              <DialogTitle>导入商会企业</DialogTitle>
              <DialogDescription>
                使用模板整理企业名称、国家或地区和注册标识。没有注册标识的企业会进入资料待完善清单。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="csv-file">企业名单</Label>
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <a href="/templates/enterprise-import-template.csv" download>
                      <Download className="h-4 w-4" />
                      下载 CSV 模板
                    </a>
                  </Button>
                </div>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required
                />
                <p className="text-xs text-muted-foreground">请选择 UTF-8 编码的 CSV 文件，文件大小不超过 2 MiB。</p>
              </div>
              <div className="grid gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">认证类型</p>
                  <p className="mt-1 text-sm font-medium">商会基础认证</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid-days">认证有效期</Label>
                  <Input
                    id="valid-days"
                    type="number"
                    min={1}
                    max={1825}
                    value={validDays}
                    onChange={(event) => setValidDays(Number(event.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">1–1825 天</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border border-ember-200 bg-ember-50/60 p-4">
                <Checkbox
                  id="responsibility"
                  checked={responsibilityAccepted}
                  onCheckedChange={(checked) => setResponsibilityAccepted(checked === true)}
                />
                <Label htmlFor="responsibility" className="text-sm font-normal leading-6">
                  我确认商会已核验本次导入资料并承担责任。导入只代表商会认证，不等同于平台认证。
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>取消</Button>
              <Button disabled={submitting || !responsibilityAccepted}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {submitting ? '正在上传…' : '提交导入任务'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? '编辑会员单位' : '手动录入会员单位'}</DialogTitle>
            <DialogDescription>
              {editingMember ? '修改会员单位资料、会员等级和有效期，保存后立即生效。' : '录入会员单位基础资料，可同时设置首期会员等级。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="border-l-2 border-ember-500 pl-3">
                <h3 className="text-sm font-semibold">基础资料</h3>
                <p className="mt-1 text-xs text-muted-foreground">用于会员单位名录展示和主体识别。</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="member-name">会员单位名称</Label>
                  <Input id="member-name" value={memberForm.name} onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>单位类型</Label>
                  <Select value={memberForm.enterpriseType} onValueChange={(value) => setMemberForm((current) => ({ ...current, enterpriseType: value as MemberForm['enterpriseType'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">供应企业</SelectItem>
                      <SelectItem value="2">采购企业</SelectItem>
                      <SelectItem value="3">综合企业</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>国家或地区</Label>
                  <CountrySelect value={memberForm.countryCode} onValueChange={(value) => setMemberForm((current) => ({ ...current, countryCode: value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="member-credit-code">统一社会信用代码或登记编号</Label>
                  <Input id="member-credit-code" value={memberForm.declaredCreditCode} onChange={(event) => setMemberForm((current) => ({ ...current, declaredCreditCode: event.target.value }))} />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t pt-5">
              <div className="border-l-2 border-ember-500 pl-3">
                <h3 className="text-sm font-semibold">联系与介绍</h3>
                <p className="mt-1 text-xs text-muted-foreground">便于商会日常服务和资料核对。</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="member-phone">联系电话</Label>
                  <Input id="member-phone" value={memberForm.contactPhone} onChange={(event) => setMemberForm((current) => ({ ...current, contactPhone: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-email">联系邮箱</Label>
                  <Input id="member-email" type="email" value={memberForm.contactEmail} onChange={(event) => setMemberForm((current) => ({ ...current, contactEmail: event.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="member-description">单位简介</Label>
                  <Textarea id="member-description" value={memberForm.description} onChange={(event) => setMemberForm((current) => ({ ...current, description: event.target.value }))} />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t pt-5">
              <div className="border-l-2 border-ember-500 pl-3">
                <h3 className="text-sm font-semibold">会员等级</h3>
                <p className="mt-1 text-xs text-muted-foreground">等级由当前商会维护，不影响平台认证等级。</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>会员等级</Label>
                  <Select value={memberForm.levelId} onValueChange={(value) => setMemberForm((current) => ({ ...current, levelId: value, expireAt: value === 'none' ? '' : current.expireAt }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">暂不设置等级</SelectItem>
                      {levels.map((level) => <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-expire-at">有效期至</Label>
                  <DateTimeField id="member-expire-at" type="date" value={memberForm.expireAt} disabled={memberForm.levelId === 'none'} onValueChange={(value) => setMemberForm((current) => ({ ...current, expireAt: value }))} />
                  <p className="text-xs text-muted-foreground">留空表示长期有效。</p>
                </div>
              </div>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void submitMember()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除会员单位</DialogTitle>
            <DialogDescription>
              确认删除“{deleteTarget?.enterpriseName}”？删除后该单位将从当前商会会员名录中移除。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            此操作会同时结束当前会员单位的等级和有效期，请确认后再继续。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" disabled={submitting} onClick={() => void confirmDeleteMember()}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importRowsOpen} onOpenChange={setImportRowsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>导入逐行结果</DialogTitle>
            <DialogDescription>企业解析、归属和认证结果分别展示，失败行保留明确错误。</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            {importRowsLoading ? (
              <div className="grid min-h-40 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-ember-600" /></div>
            ) : (
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2">行</th>
                    <th className="px-3 py-2">企业</th>
                    <th className="px-3 py-2">处理状态</th>
                    <th className="px-3 py-2">企业解析</th>
                    <th className="px-3 py-2">归属</th>
                    <th className="px-3 py-2">认证</th>
                    <th className="px-3 py-2">错误</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importRows.map((row) => (
                    <tr key={row.row_id}>
                      <td className="px-3 py-3 font-data">{row.row_number}</td>
                      <td className="px-3 py-3">{row.legal_name}</td>
                      <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-3 py-3">{row.enterprise_resolution}</td>
                      <td className="px-3 py-3">{row.affiliation_result}</td>
                      <td className="px-3 py-3">{row.chamber_certification_result}</td>
                      <td className="px-3 py-3 text-red-700">{row.error?.message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!importRowsLoading && importRows.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">暂无逐行结果</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportRowsOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
