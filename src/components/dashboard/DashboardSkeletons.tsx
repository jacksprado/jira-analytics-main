import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton({ className = "h-[300px]" }: { className?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48 mb-1" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className={`${className} flex items-end justify-around gap-2 pt-8`}>
          <Skeleton className="w-8 h-[40%] rounded-t" />
          <Skeleton className="w-8 h-[70%] rounded-t" />
          <Skeleton className="w-8 h-[55%] rounded-t" />
          <Skeleton className="w-8 h-[85%] rounded-t" />
          <Skeleton className="w-8 h-[60%] rounded-t" />
          <Skeleton className="w-8 h-[45%] rounded-t" />
          <Skeleton className="w-8 h-[75%] rounded-t" />
          <Skeleton className="w-8 h-[50%] rounded-t" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              {[...Array(6)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-16" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FiltersSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Filters */}
      <FiltersSkeleton />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* Charts */}
      <ChartSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
