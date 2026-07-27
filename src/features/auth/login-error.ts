import { ManagementApiError } from '@/api/client/management'

export function customerLoginError(error: unknown) {
  if (!(error instanceof ManagementApiError)) {
    return '暂时无法登录，请稍后重试。'
  }
  if (error.status === 401) {
    return '手机号或密码不正确，请重新输入。'
  }
  if (error.status === 403) {
    return '当前账号尚未开通管理权限，请联系所属组织管理员。'
  }
  if (error.status === 429) {
    return '登录尝试次数较多，请稍后再试。'
  }
  if (error.status >= 500) {
    return '管理服务暂时不可用，请稍后重试。'
  }
  return error.message || '暂时无法登录，请稍后重试。'
}
