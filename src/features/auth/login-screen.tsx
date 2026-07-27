'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useManagement } from '@/lib/management'
import { customerLoginError } from './login-error'

export function LoginScreen() {
  const router = useRouter()
  const {
    hydrated,
    currentUser,
    availableWorkspaces,
    preferredWorkspaceId,
    login,
  } = useManagement()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated || !currentUser || !availableWorkspaces.length) return
    const preferred = availableWorkspaces.find((item) => item.id === preferredWorkspaceId)
    router.replace(`/w/${preferred?.id ?? availableWorkspaces[0].id}`)
  }, [availableWorkspaces, currentUser, hydrated, preferredWorkspaceId, router])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await login(phone, 'CN', password)
      toast.success('登录成功')
    } catch (error) {
      setFormError(customerLoginError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-ink-950 px-12 py-10 text-stone-100 lg:flex lg:flex-col xl:px-20 xl:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_12%_18%,rgba(234,88,12,0.24),transparent_60%),linear-gradient(145deg,transparent_55%,rgba(255,255,255,0.025)_55%)]" />
        <div className="relative">
          <p className="font-display text-[1.4rem] tracking-[-0.02em] text-stone-50">
            华盟<span className="text-ember-400">在线</span>
          </p>
          <p className="mt-1 text-[0.78rem] font-medium tracking-[0.08em] text-stone-400/90">运营管理平台</p>
        </div>

        <div className="relative my-auto max-w-2xl pr-16">
          <div className="mb-7 flex items-center gap-4">
            <span className="h-px w-12 bg-ember-500" />
            <p className="text-[11px] font-semibold tracking-[0.22em] text-ember-400">连接企业 · 见证信用 · 促进协作</p>
          </div>
          <h1 className="font-display text-[46px] font-semibold leading-[1.3] tracking-[-0.03em] xl:text-[54px]">
            把会员企业与认证，
            <br />放在一个工作台。
          </h1>
          <p className="mt-7 max-w-xl text-[15px] leading-8 text-white/58">
            面向华盟平台与商会工作人员，统一管理会员企业资料、商会认证和待完善信息，让每一次协作都有可靠依据。
          </p>
          <div className="mt-12 max-w-xl border-y border-white/10">
            {[
              [Building2, '企业资料', '批量导入会员企业，集中查看状态'],
              [CheckCircle2, '商会认证', '认证期限与平台认证清晰分开'],
              [ShieldCheck, '权限边界', '只展示当前账号获授权的工作空间'],
            ].map(([Icon, title, note], index) => (
              <div key={String(title)} className={`grid grid-cols-[42px_96px_1fr] items-center py-4 ${index < 2 ? 'border-b border-white/10' : ''}`}>
                <Icon className="h-[18px] w-[18px] text-ember-400" />
                <p className="text-sm font-medium">{String(title)}</p>
                <p className="text-xs text-white/40">{String(note)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between pr-16 text-[10px] uppercase tracking-[0.14em] text-white/28">
          <span>HogeTalk · 华盟</span>
          <span>可信组织协作网络</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center border-l border-border/60 bg-background px-5 py-10 sm:px-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
            <p className="font-display text-[1.35rem] tracking-[-0.02em]">
              华盟<span className="text-ember-600">在线</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">运营管理平台</p>
          </div>

          <div className="mb-7 border-b border-border/60 pb-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ember-200 bg-ember-50 px-3 py-1 text-[11px] font-semibold text-ember-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              华盟管理工作台
            </div>
            <h2 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-foreground">欢迎回来</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              使用已开通管理权限的手机号登录。
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                className="font-data"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  if (formError) setFormError(null)
                }}
                autoComplete="tel"
                inputMode="tel"
                placeholder="请输入登录手机号"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  className="px-9"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (formError) setFormError(null)
                  }}
                  autoComplete="current-password"
                  minLength={8}
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setPasswordVisible((current) => !current)}
                  aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <Button className="h-11 w-full" disabled={submitting || !hydrated}>
              {submitting ? '正在登录…' : '登录'}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-7 border-t border-border/60 pt-5 text-center text-xs leading-5 text-muted-foreground">
            <p>无法登录？请联系所属组织管理员确认账号权限。</p>
            <p className="mt-1">请仅在受信任的设备上登录，离开时及时退出账号。</p>
          </div>
        </div>
      </section>
    </main>
  )
}
