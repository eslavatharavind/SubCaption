import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type = 'text', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-brand-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'w-full bg-[#151A21] border border-[#262D36] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-brand-subtle transition-colors focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
            {
              'border-red-500/70 focus:border-red-500 focus:ring-red-500': Boolean(error),
            },
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-brand-subtle">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
