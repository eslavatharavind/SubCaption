import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-solid border-primary-500 border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="loading"
    />
  );
}
