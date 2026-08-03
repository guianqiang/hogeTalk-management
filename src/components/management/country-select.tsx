'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  listManagementCountryOptions,
  type ManagementCountryOption,
} from '@/api/client/scaffolded-management'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CountrySelect({
  value,
  onValueChange,
  allowEmpty = false,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  allowEmpty?: boolean
  disabled?: boolean
}) {
  const [countries, setCountries] = useState<ManagementCountryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void listManagementCountryOptions()
      .then((items) => {
        if (active) setCountries(items)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const options = useMemo(() => {
    const normalized = value.toUpperCase()
    if (!normalized || countries.some((item) => item.code === normalized)) return countries
    return [{ code: normalized, name: normalized }, ...countries]
  }, [countries, value])

  return (
    <Select value={value || (allowEmpty ? 'none' : undefined)} onValueChange={(next) => onValueChange(next === 'none' ? '' : next)} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? '正在加载国家数据…' : '请选择国家或地区'} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="none">不关联国家或地区</SelectItem>}
        {options.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.name}（{country.code}）
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
