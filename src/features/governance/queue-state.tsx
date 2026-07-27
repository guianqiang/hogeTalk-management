import { AlertCircle, Inbox, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function QueueLoading() {
  return (
    <div className="space-y-3" aria-label="正在加载">
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent className="space-y-4 p-5">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function QueueEmpty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="grid min-h-64 place-items-center p-8 text-center">
        <div className="max-w-lg">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function QueueError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  return (
    <Card className="border-amber-200 bg-amber-50/35">
      <CardContent className="grid min-h-64 place-items-center p-8 text-center">
        <div className="max-w-xl">
          <AlertCircle className="mx-auto h-9 w-9 text-amber-700" />
          <h2 className="mt-4 font-semibold">暂时无法加载数据</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {error instanceof Error ? error.message : '请检查网络后重试。'}
          </p>
          <Button variant="outline" className="mt-5" onClick={onRetry}>
            <RefreshCcw className="h-4 w-4" />
            重新加载
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
