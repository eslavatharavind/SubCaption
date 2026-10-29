import { ReactNode, useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div className="bg-[#151A21] border border-[#262D36] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-5 shadow-2xl relative">
        <div className="flex items-start justify-between gap-3 border-b border-[#262D36] pb-4">
          <div className="min-w-0">
            {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
            {description && <p className="text-xs text-brand-muted mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 flex items-center justify-center text-xl rounded-lg text-brand-subtle hover:text-white hover:bg-[#1B2129] transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
