import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-primary-500/40',
          {
            'bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white shadow-md shadow-primary-600/20':
              variant === 'primary',
            'bg-[#151A21] hover:bg-[#1C232C] active:bg-[#11151A] text-white border border-[#262D36]':
              variant === 'secondary',
            'bg-transparent hover:bg-[#151A21] active:bg-[#11151A] text-brand-muted hover:text-white':
              variant === 'ghost',
            'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-md shadow-red-600/20':
              variant === 'danger',
            'bg-transparent border border-primary-500/50 hover:bg-primary-500/10 text-primary-400':
              variant === 'outline',
          },
          {
            'px-3 py-1.5 text-xs rounded-lg': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
