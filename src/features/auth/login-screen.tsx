'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  MessageSquareText,
  KeyRound,
  Smartphone,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useManagement } from '@/lib/management'
import { completeInitialManagementPassword } from '@/api/client/management'
import { createEnterpriseWorkspaceLoginChallenge } from '@/api/client/enterprise-workspace'
import { customerLoginError } from './login-error'
import type { LoginPortal } from './login-portals'

interface LoginScreenProps {
  portal: LoginPortal
  eyebrow: string
  title: string
  description: string
  submitLabel: string
  allowOtp?: boolean
  className?: string
}

export function LoginScreen({
  portal,
  eyebrow,
  title,
  description,
  submitLabel,
  allowOtp = false,
  className,
}: LoginScreenProps) {
  const router = useRouter()
  const {
    hydrated,
    currentUser,
    availableWorkspaces,
    preferredWorkspaceId,
    login,
    loginWithOtp,
  } = useManagement()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [passwordChangeToken, setPasswordChangeToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const identifierId = `${portal}-identifier`
  const passwordId = `${portal}-password`
  const newPasswordId = `${portal}-new-password`
  const codeId = `${portal}-otp-code`

  useEffect(() => {
    if (!hydrated || !currentUser || !availableWorkspaces.length) return
    const preferred = availableWorkspaces.find((item) => item.id === preferredWorkspaceId)
    router.replace(`/w/${preferred?.id ?? availableWorkspaces[0].id}`)
  }, [availableWorkspaces, currentUser, hydrated, preferredWorkspaceId, router])

  useEffect(() => {
    if (!resendSeconds) return
    const timer = setInterval(() => {
      setResendSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendSeconds])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      if (mode === 'otp') {
        if (!identifier.trim()) {
          setFormError('请输入手机号')
          return
        }
        if (!challengeId) {
          setFormError('请先获取验证码')
          return
        }
        if (!code.trim()) {
          setFormError('请输入验证码')
          return
        }
        await loginWithOtp(portal, challengeId, code.trim())
        toast.success('登录成功')
        return
      }
      const outcome = await login(portal, identifier, 'CN', password)
      if (outcome) {
        setPasswordChangeToken(outcome.password_change_token)
        setPassword('')
        toast.info('首次登录，请先设置新密码')
      } else {
        toast.success('登录成功')
      }
    } catch (error) {
      setFormError(customerLoginError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function requestCode() {
    if (!identifier.trim()) {
      setFormError('请输入手机号')
      return
    }
    setSendingCode(true)
    setFormError(null)
    try {
      const challenge = await createEnterpriseWorkspaceLoginChallenge(identifier.trim())
      setChallengeId(challenge.id)
      setResendSeconds(challenge.resend_after)
      toast.success('验证码已发送')
    } catch (error) {
      setFormError(customerLoginError(error))
    } finally {
      setSendingCode(false)
    }
  }

  function switchMode(nextMode: 'password' | 'otp') {
    if (!allowOtp) return
    setMode(nextMode)
    if (nextMode === 'password') {
      setCode('')
      setChallengeId('')
      setResendSeconds(0)
    }
  }

  async function changeInitialPassword(event: React.FormEvent) {
    event.preventDefault()
    if (!passwordChangeToken) return
    if (newPassword.length < 12) {
      setFormError('新密码至少需要 12 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('两次输入的新密码不一致')
      return
    }
    setFormError(null)
    setSubmitting(true)
    try {
      await completeInitialManagementPassword(passwordChangeToken, newPassword)
      const outcome = await login(portal, identifier, 'CN', newPassword)
      if (outcome) throw new Error('新密码尚未生效，请重新登录')
      toast.success('新密码设置成功，已进入管理后台')
    } catch (error) {
      setFormError(customerLoginError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-7 border-b border-border/70 pb-6">
        <div className={cn(
          'mb-4 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.06em]',
          'border-ember-200 bg-ember-50 text-ember-800',
        )}>
          {eyebrow}
        </div>
        <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[36px]">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {passwordChangeToken ? (
        <form onSubmit={changeInitialPassword} className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-ember-200 bg-ember-50/55 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ember-700" />
            <div>
              <p className="text-sm font-semibold">首次登录需要修改初始密码</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                正在为账号 {identifier} 设置新密码。完成后系统会自动重新登录。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={newPasswordId}>新密码</Label>
            <Input
              id={newPasswordId}
              type="password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value)
                if (formError) setFormError(null)
              }}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              placeholder="至少 12 位，请勿沿用初始密码"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${newPasswordId}-confirm`}>确认新密码</Label>
            <Input
              id={`${newPasswordId}-confirm`}
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                if (formError) setFormError(null)
              }}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              placeholder="请再次输入新密码"
              required
            />
          </div>
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Button className="h-11 w-full bg-ember-700 text-white hover:bg-ember-800" disabled={submitting}>
            {submitting ? '正在设置…' : '设置新密码并登录'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={() => {
              setPasswordChangeToken(null)
              setNewPassword('')
              setConfirmPassword('')
              setFormError(null)
            }}
          >
            返回账号登录
          </Button>
        </form>
      ) : (
      <form onSubmit={submit} className="space-y-6">
        {allowOtp && (
          <div className="inline-flex rounded-full border border-border/80 bg-card/70 p-1 text-xs font-semibold tracking-[0.1em]">
            <button
              type="button"
              className={cn(
                'rounded-full px-4 py-2 transition',
                mode === 'password'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => switchMode('password')}
              aria-pressed={mode === 'password'}
            >
              密码登录
            </button>
            <button
              type="button"
              className={cn(
                'rounded-full px-4 py-2 transition',
                mode === 'otp'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => switchMode('otp')}
              aria-pressed={mode === 'otp'}
            >
              验证码登录
            </button>
          </div>
        )}
        <div className="space-y-2 rounded-xl border border-border/75 bg-card/40 p-4 backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground">
            {mode === 'otp'
              ? <Smartphone className="h-3.5 w-3.5 text-ember-700" />
              : <UserRound className="h-3.5 w-3.5 text-ember-700" />}
            <span>{mode === 'otp' ? '短信快捷登录' : '账号密码登录'}</span>
          </div>
          <Label htmlFor={identifierId}>
            {mode === 'otp'
              ? '手机号'
              : (portal === 'enterprise' ? '企业账号或手机号' : '管理账号或手机号')}
          </Label>
          <Input
            id={identifierId}
            className="h-11 font-data focus-visible:border-ember-500 focus-visible:ring-ember-500/20"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value)
              if (formError) setFormError(null)
            }}
            autoComplete="username"
            placeholder={mode === 'otp'
              ? '请输入手机号'
              : portal === 'enterprise'
                ? '请输入企业账号或已验证手机号'
              : '请输入管理账号或已验证手机号'}
            autoFocus
            required
          />
        </div>
        {mode === 'otp' ? (
          <div className="space-y-2 rounded-xl border border-border/75 bg-card/40 p-4 backdrop-blur-sm">
            <Label htmlFor={codeId}>验证码</Label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                id={codeId}
                inputMode="numeric"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                  if (formError) setFormError(null)
                }}
                placeholder="请输入验证码"
                required
                maxLength={8}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={sendingCode || resendSeconds > 0}
                onClick={() => {
                  void requestCode()
                }}
              >
                {sendingCode ? '发送中…' : resendSeconds > 0 ? `${resendSeconds} 秒后重发` : challengeId ? '重新发送' : '获取验证码'}
              </Button>
            </div>
            {resendSeconds > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                验证码将在 {resendSeconds} 秒后可重新发送。
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              <MessageSquareText className="mr-1 inline h-3.5 w-3.5" />
              请输入最近接收到的 4–8 位数字验证码。
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-border/75 bg-card/40 p-4 backdrop-blur-sm">
            <Label htmlFor={passwordId}>密码</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id={passwordId}
                type={passwordVisible ? 'text' : 'password'}
                className="h-11 pl-9 pr-11 focus-visible:border-ember-500 focus-visible:ring-ember-500/20"
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
                className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => setPasswordVisible((current) => !current)}
                aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {formError && (
          <div
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Button
          className="h-11 min-h-11 w-full bg-ember-700 text-white hover:bg-ember-800 focus-visible:ring-ember-700"
          disabled={submitting || !hydrated}
        >
          {submitting ? '正在登录…' : submitLabel}
          {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>
      )}
    </div>
  )
}
