import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-brand-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full bg-[#151A21] border border-[#262D36] rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            {
              'border-red-500/70 focus:border-red-500 focus:ring-red-500': Boolean(error),
            },
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#151A21] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
