'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, MessageSquareText, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { createManagementAuthChallenge } from '@/api/client/management'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PhoneConfirmationField({
  value,
  onChange,
  purpose = 'password_reset',
  disabled = false,
  label = '手机号安全确认',
  description,
  idPrefix = 'phone-confirmation',
}: {
  value: string
  onChange: (value: string) => void
  purpose?: 'password_reset' | 'bind_phone'
  disabled?: boolean
  label?: string
  description?: string
  idPrefix?: string
}) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [maskedDestination, setMaskedDestination] = useState('')
  const [sending, setSending] = useState(false)
  const [resendAfter, setResendAfter] = useState(0)
  const isBindingPhone = purpose === 'bind_phone'
  const resolvedDescription = description ?? (
    isBindingPhone
      ? '验证码将发送到下方填写的手机号，验证成功后会绑定到当前账号。'
      : '验证码只发送到当前账号已验证的手机号，有效期内可用于本次敏感操作。'
  )

  useEffect(() => {
    if (resendAfter <= 0) return
    const timer = window.setInterval(() => {
      setResendAfter((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendAfter])

  async function sendCode() {
    const normalizedPhone = phone.trim()
    if (!/^[+0-9][0-9+\s-]{3,31}$/.test(normalizedPhone)) {
      toast.error(isBindingPhone ? '请输入需要绑定的完整手机号' : '请输入当前账号已验证的完整手机号')
      return
    }
    setSending(true)
    try {
      const result = await createManagementAuthChallenge(normalizedPhone, purpose)
      setChallengeId(result.id)
      setMaskedDestination(result.masked_destination)
      setCode('')
      setResendAfter(result.resend_after)
      onChange('')
      toast.success(`验证码已发送至 ${result.masked_destination}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '验证码发送失败')
    } finally {
      setSending(false)
    }
  }

  function updateCode(nextCode: string) {
    const digits = nextCode.replace(/\D/g, '').slice(0, 8)
    setCode(digits)
    onChange(challengeId && /^\d{4,8}$/.test(digits) ? `${challengeId}.${digits}` : '')
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
      <div>
        <Label htmlFor={`${idPrefix}-phone`}>{label}</Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{resolvedDescription}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          id={`${idPrefix}-phone`}
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            setChallengeId('')
            setMaskedDestination('')
            setCode('')
            onChange('')
          }}
          disabled={disabled || sending}
          inputMode="tel"
          autoComplete="tel"
          placeholder={isBindingPhone ? '请输入需要绑定的完整手机号' : '请输入当前账号绑定的完整手机号'}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || sending || resendAfter > 0}
          onClick={() => void sendCode()}
        >
          {sending
            ? <LoaderCircle className="h-4 w-4 animate-spin" />
            : challengeId
              ? <RotateCcw className="h-4 w-4" />
              : <MessageSquareText className="h-4 w-4" />}
          {sending ? '发送中' : resendAfter > 0 ? `${resendAfter} 秒后重发` : challengeId ? '重新发送' : '发送验证码'}
        </Button>
      </div>
      {challengeId && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-code`}>短信验证码</Label>
          <Input
            id={`${idPrefix}-code`}
            value={code}
            onChange={(event) => updateCode(event.target.value)}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="请输入 4–8 位验证码"
          />
          <p className="text-xs text-muted-foreground">
            已发送至 {maskedDestination}。验证码填写完整后即可提交本次操作。
          </p>
        </div>
      )}
      <input type="hidden" value={value} readOnly aria-hidden />
    </div>
  )
}
