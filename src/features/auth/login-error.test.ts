import { describe, expect, it } from 'vitest'
import { ManagementApiError } from '@/api/client/management'
import { customerLoginError } from './login-error'

describe('customerLoginError', () => {
  it('does not expose infrastructure hints to customers', () => {
    const error = new ManagementApiError(
      502,
      'E_PROVIDER_UNAVAILABLE',
      '无法连接后端',
      '检查 MANAGEMENT_API_BASE_URL',
      'req_test',
    )

    expect(customerLoginError(error)).toBe('管理服务暂时不可用，请稍后重试。')
  })

  it('gives an actionable permission message', () => {
    const error = new ManagementApiError(403, 'E_PERMISSION', '无权访问', null, 'req_test')

    expect(customerLoginError(error)).toBe('当前账号尚未开通管理权限，请联系所属组织管理员。')
  })

  it('mentions both supported login identifiers for invalid credentials', () => {
    const error = new ManagementApiError(401, 'E_AUTH_INVALID', '登录失败', null, 'req_test')

    expect(customerLoginError(error)).toBe('管理账号、手机号或密码不正确，请重新输入。')
  })
})
