export type LanguageCode = 'te' | 'te_en' | 'en' | 'hi' | 'te_roman';

export interface LanguageOption {
  id: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  label?: string;
}

export const CAPTION_OUTPUT_MODES: LanguageOption[] = [
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', label: 'తెలుగు' },
  { id: 'te_en', name: 'Telugu + English', nativeName: 'Telugu + English', flag: '🇮🇳', label: 'Telugu + English' },
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', label: 'English' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', label: 'हिन्दी' },
  { id: 'te_roman', name: 'Telugu English Letters', nativeName: 'Telugu (English Letters)', flag: '🔤', label: 'Telugu (English Letters)' },
];

export type ProjectStatus = 'uploaded' | 'processing' | 'extracting_audio' | 'transcribing' | 'generating_captions' | 'ready' | 'rendering' | 'completed' | 'failed';

export interface Project {
  id: string;
  name: string;
  user_id?: string;
  status: ProjectStatus;
  language: LanguageCode;
  duration?: number | null;
  file_size?: number;
  filename?: string;
  created_at?: string;
  updated_at?: string;
  thumbnail_bg?: string;
}

export interface ProjectCreateRequest {
  name: string;
  language: LanguageCode;
}
