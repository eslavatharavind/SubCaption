import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#1B2129] border border-[#262D36]/50 rounded-xl',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#151A21] border border-[#262D36] rounded-2xl p-6 space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
