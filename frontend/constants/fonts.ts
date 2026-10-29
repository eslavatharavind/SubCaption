import { FONT_REGISTRY, getFontsByCategory, getFontById } from '@/lib/fonts/fontRegistry';
import { FontMetadata } from '@/types/font';

export interface FontItem {
  id: string;
  name: string;
  family: string;
  category: string;
  indicSupport: boolean;
  sampleEn: string;
  sampleTe: string;
  sampleHi: string;
  weights: number[];
}

export const FONT_LIBRARY: FontItem[] = FONT_REGISTRY.map((f: FontMetadata) => ({
  id: f.id,
  name: f.name,
  family: f.family,
  category: f.category,
  indicSupport: f.supportedScripts.includes('Telugu') || f.supportedScripts.includes('Devanagari'),
  sampleEn: f.previewText && f.previewText.includes('CAPTION') ? f.previewText : 'THIS IS A CAPTION',
  sampleTe: f.previewText && f.previewText.includes('తెలుగు') ? f.previewText : 'ఇది ఒక క్యాప్షన్ 2026',
  sampleHi: f.previewText && f.previewText.includes('कैप्शन') ? f.previewText : 'यह एक कैप्शन है 2026',
  weights: f.weights,
}));

export { FONT_REGISTRY, getFontsByCategory, getFontById };
