import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusLabels: Record<string, string> = {
  active: '正常',
  inactive: '已停用',
  draft: '草稿',
  published: '已发布',
  unread: '未读',
  read: '已读',
  closed: '已关闭',
  processing: '处理中',
  contacted: '已联系',
  invalid: '无效',
  pending: '待完善',
  suspended: '已暂停',
  revoked: '已撤销',
  submitted: '待审核',
  needs_more_info: '待补材料',
  under_review: '审核中',
  pending_second_review: '待二次复核',
  approved: '已通过',
  cancelled: '已取消',
  received: '已收到',
  expired: '已到期',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  terminated: '已终止',
  success: '成功',
  ended: '已结束',
  unverified: '平台未认证',
  verified: '平台已认证',
  inactive_affiliation: '关系已失效',
  uploaded: '已上传',
  validating: '校验中',
  applying: '导入中',
  completed: '已完成',
  partial_failed: '部分失败',
  failed: '失败',
  needs_identifier: '待补标识',
  resolving: '处理中',
  resolved: '已解决',
  open: '待处理',
  ignored: '已忽略',
  confirmed: '已确认',
  merged: '已合并',
  accepted: '已接受',
  conflict: '待处理冲突',
  discarded: '已丢弃',
  archived: '已归档',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
        status === 'active' || status === 'success' || status === 'completed' || status === 'verified' || status === 'approved' || status === 'resolved' || status === 'merged' || status === 'accepted'
          ? 'border-green-200 bg-green-50 text-green-700'
          : status === 'pending' || status === 'submitted' || status === 'uploaded' || status === 'validating' || status === 'applying' || status === 'needs_identifier' || status === 'needs_more_info' || status === 'under_review' || status === 'pending_second_review' || status === 'received' || status === 'open'
            ? 'border-ember-200 bg-ember-50 text-ember-700'
            : status === 'suspended' || status === 'failed' || status === 'partial_failed' || status === 'conflict' || status === 'rejected'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-border bg-muted/50 text-muted-foreground',
      )}
    >
      {label ?? statusLabels[status] ?? status}
    </Badge>
  )
}
