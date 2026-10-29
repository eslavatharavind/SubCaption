import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'info' | 'error' | 'neutral';
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        {
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': variant === 'success',
          'bg-amber-500/10 text-amber-400 border-amber-500/20': variant === 'warning',
          'bg-primary-500/10 text-primary-400 border-primary-500/20': variant === 'info',
          'bg-red-500/10 text-red-400 border-red-500/20': variant === 'error',
          'bg-[#1B2129] text-brand-muted border-[#262D36]': variant === 'neutral',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
