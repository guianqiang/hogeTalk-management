'use client'

import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CalendarDays, Check, Clock3, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DayPicker, type Matcher } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface DateTimeFieldProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  type: 'date' | 'datetime-local'
  disabled?: boolean
  min?: string
  max?: string
  placeholder?: string
  className?: string
  'aria-label'?: string
}

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function parseLocalValue(value?: string) {
  if (!value) return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!match) return undefined
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toLocalValue(value: Date, type: DateTimeFieldProps['type']) {
  const date = format(value, 'yyyy-MM-dd')
  return type === 'date' ? date : `${date}T${format(value, 'HH:mm')}`
}

function displayValue(value: Date, type: DateTimeFieldProps['type']) {
  return format(value, type === 'date' ? 'yyyy年M月d日' : 'yyyy年M月d日 HH:mm', { locale: zhCN })
}

function todayAtDefaultTime(type: DateTimeFieldProps['type']) {
  const today = new Date()
  today.setSeconds(0, 0)
  if (type === 'date') today.setHours(0, 0, 0, 0)
  return today
}

export function DateTimeField({
  id,
  value,
  onValueChange,
  type,
  disabled,
  min,
  max,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: DateTimeFieldProps) {
  const selected = parseLocalValue(value)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date | undefined>(selected)
  const PickerIcon = type === 'date' ? CalendarDays : Clock3
  const disabledDays = useMemo(() => {
    const matchers: Matcher[] = []
    const minimum = parseLocalValue(min)
    const maximum = parseLocalValue(max)
    if (minimum) matchers.push({ before: minimum })
    if (maximum) matchers.push({ after: maximum })
    return matchers
  }, [max, min])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) setDraft(selected)
  }

  function selectDay(day?: Date) {
    if (!day) {
      setDraft(undefined)
      return
    }
    const previous = draft ?? selected
    day.setHours(previous?.getHours() ?? 9, previous?.getMinutes() ?? 0, 0, 0)
    setDraft(new Date(day))
  }

  function setTime(part: 'hour' | 'minute', nextValue: string) {
    const next = new Date(draft ?? todayAtDefaultTime(type))
    if (part === 'hour') next.setHours(Number(nextValue))
    else next.setMinutes(Number(nextValue))
    next.setSeconds(0, 0)
    setDraft(next)
  }

  function applyValue() {
    if (!draft) return
    onValueChange(toLocalValue(draft, type))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'h-11 w-full justify-between border-stone-300 bg-card px-3 text-left font-normal shadow-sm',
            'hover:border-stone-400 hover:bg-card focus-visible:border-ember-500 focus-visible:ring-2 focus-visible:ring-ember-100',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className={cn('truncate', selected && 'font-data text-foreground')}>
            {selected ? displayValue(selected, type) : (placeholder ?? (type === 'date' ? '请选择日期' : '请选择日期和时间'))}
          </span>
          <span className="ml-3 flex size-7 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-500">
            <PickerIcon className="size-4" strokeWidth={1.8} />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="w-[316px] overflow-hidden border-stone-200 bg-card shadow-xl"
      >
        <DayPicker
          mode="single"
          locale={zhCN}
          selected={draft}
          defaultMonth={draft ?? selected ?? new Date()}
          onSelect={selectDay}
          disabled={disabledDays}
          showOutsideDays
          classNames={{
            root: 'p-2',
            months: 'relative',
            month: 'space-y-1.5',
            month_caption: 'flex h-7 items-center justify-center',
            caption_label: 'text-sm font-semibold text-stone-800',
            nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
            button_previous: 'relative z-10 flex size-7 items-center justify-center rounded-md text-stone-500 transition hover:bg-ember-50 hover:text-ember-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-200',
            button_next: 'relative z-10 flex size-7 items-center justify-center rounded-md text-stone-500 transition hover:bg-ember-50 hover:text-ember-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-200',
            chevron: 'size-4 fill-current',
            month_grid: 'w-full border-collapse',
            weekdays: 'border-b border-stone-100',
            weekday: 'h-6 text-center text-[11px] font-medium text-stone-400',
            weeks: '',
            week: '',
            day: 'p-0 text-center',
            day_button: 'mx-auto flex size-7 items-center justify-center rounded-md text-xs text-stone-700 transition hover:bg-ember-50 hover:text-ember-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-200',
            selected: '[&>button]:bg-ember-700 [&>button]:font-semibold [&>button]:text-white [&>button]:shadow-sm [&>button:hover]:bg-ember-700 [&>button:hover]:text-white',
            today: '[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-ember-300 [&>button]:font-semibold',
            outside: '[&>button]:text-stone-300',
            disabled: '[&>button]:cursor-not-allowed [&>button]:text-stone-200 [&>button]:hover:bg-transparent',
            hidden: 'invisible',
          }}
        />
        {type === 'datetime-local' && (
          <div className="flex items-center gap-2 border-t border-stone-100 bg-stone-50/60 px-3 py-2">
            <Clock3 className="size-4 text-ember-700" />
            <span className="mr-auto text-xs font-medium text-stone-600">时间</span>
            <Select value={String(draft?.getHours() ?? 9).padStart(2, '0')} onValueChange={(next) => setTime('hour', next)}>
              <SelectTrigger aria-label="小时" className="h-8 w-[74px] bg-card font-data"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">{hours.map((hour) => <SelectItem key={hour} value={hour}>{hour} 时</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-stone-400">:</span>
            <Select value={String(draft?.getMinutes() ?? 0).padStart(2, '0')} onValueChange={(next) => setTime('minute', next)}>
              <SelectTrigger aria-label="分钟" className="h-8 w-[74px] bg-card font-data"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">{minutes.map((minute) => <SelectItem key={minute} value={minute}>{minute} 分</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-stone-100 px-2.5 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              onValueChange('')
              setDraft(undefined)
              setOpen(false)
            }}
          >
            <RotateCcw className="mr-1.5 size-3.5" />清空
          </Button>
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setDraft(todayAtDefaultTime(type))}>
            今天
          </Button>
          <Button type="button" size="sm" disabled={!draft} onClick={applyValue}>
            <Check className="mr-1.5 size-3.5" />应用
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
