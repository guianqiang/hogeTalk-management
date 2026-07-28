'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useManagement } from '@/lib/management'
import { customerLoginError } from './login-error'
import type { LoginPortal } from './login-portals'

interface LoginScreenProps {
  portal: LoginPortal
  eyebrow: string
  title: string
  description: string
  submitLabel: string
  className?: string
}

export function LoginScreen({
  portal,
  eyebrow,
  title,
  description,
  submitLabel,
  className,
}: LoginScreenProps) {
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
  const phoneId = `${portal}-phone`
  const passwordId = `${portal}-password`

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

      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={phoneId}>手机号</Label>
          <Input
            id={phoneId}
            className="h-11 font-data focus-visible:border-ember-500 focus-visible:ring-ember-500/20"
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
    </div>
  )
}
