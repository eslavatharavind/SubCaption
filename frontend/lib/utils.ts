import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

export function getLanguageLabel(code: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    hi: 'Hindi (हिंदी)',
    te: 'Telugu (తెలుగు)',
  };
  return labels[code] || code;
}

export function getLanguageFont(code: string): string {
  const fonts: Record<string, string> = {
    en: 'Inter',
    hi: 'font-hindi',
    te: 'font-telugu',
  };
  return fonts[code] || 'Inter';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
