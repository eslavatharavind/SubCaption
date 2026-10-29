'use client';

import { InputHTMLAttributes, useState } from 'react';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
}

/** Password input with an accessible show/hide toggle. Only the input's type changes; the value is untouched. */
export function PasswordField({ id, className = '', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={`input-base w-full pr-12 ${className}`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Keep focus in the input when toggling with a mouse/touch so the caret position is preserved.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-[#7C8696] transition-colors hover:text-white focus:outline-none focus-visible:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60"
      >
        <span className="relative h-5 w-5">
          <svg
            className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${visible ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 5.6A9.9 9.9 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3.2 4M6.4 6.9C3.9 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 004.2 4.2" />
          </svg>
        </span>
      </button>
    </div>
  );
}
