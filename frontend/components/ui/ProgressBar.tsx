import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  progress: number;
  label?: string;
  statusText?: string;
  className?: string;
}

export function ProgressBar({ progress, label, statusText, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('space-y-2 w-full', className)}>
      {(label || statusText) && (
        <div className="flex justify-between text-xs font-semibold">
          {label && <span className="text-white">{label}</span>}
          {statusText && <span className="text-primary-400 font-mono">{statusText} ({percent}%)</span>}
        </div>
      )}
      <div className="w-full bg-[#11151A] rounded-full h-2.5 overflow-hidden border border-[#262D36]">
        <div
          className="bg-primary-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
