import { TemplateConfig } from '@/types/template';

export const modernGeometric: TemplateConfig = {
  id: 'modern-geometric',
  name: 'Modern Geometric',
  category: 'Modern',
  description: 'Clean geometric sans-serif font with crisp blue highlight accent.',
  tag: 'Geometric',
  supportedAspectRatios: ['9:16', '16:9', '1:1', '4:5'],
  typography: { fontFamily: 'Poppins', fontWeight: 700, fontSize: 48, letterSpacing: 0, lineHeight: 1.35 },
  layout: { textLayout: 'standard', paddingX: 18, paddingY: 8 },
  colors: { primaryTextColor: '#FFFFFF', highlightColor: '#3B82F6' },
  background: { type: 'rounded-box', color: 'rgba(17, 24, 39, 0.85)', borderRadius: 14 },
  stroke: { enabled: false },
  shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.7)', blur: 8 },
  glow: { enabled: false },
  highlight: { mode: 'active-word', highlightColors: ['#3B82F6'] },
  animation: { entrance: 'slide-up', wordBehavior: 'active-word', characterBehavior: 'none' },
  position: { x: 50, y: 83, anchor: 'center' },
  fontFamily: 'Poppins', fontWeight: 700, fontSize: 48, textColor: '#FFFFFF', highlightColor: '#3B82F6',
};

export const modernThinBorder: TemplateConfig = {
  id: 'modern-thin-border',
  name: 'Modern Thin Border',
  category: 'Modern',
  description: 'Minimalist container with subtle 1px border outline for sleek digital videos.',
  tag: 'Border',
  supportedAspectRatios: ['9:16', '16:9', '1:1'],
  typography: { fontFamily: 'Inter', fontWeight: 600, fontSize: 46, letterSpacing: 0.2, lineHeight: 1.35 },
  layout: { textLayout: 'single-line', maxCaptionWidth: 88, paddingX: 20, paddingY: 10 },
  colors: { primaryTextColor: '#F8FAFC', highlightColor: '#60A5FA' },
  background: { type: 'solid', color: 'rgba(15, 23, 42, 0.9)', borderRadius: 10 },
  stroke: { enabled: true, width: 1, color: '#334155', level: 'thin' },
  shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.6)', blur: 6 },
  glow: { enabled: false },
  highlight: { mode: 'none' },
  animation: { entrance: 'fade', wordBehavior: 'none', characterBehavior: 'none' },
  position: { x: 50, y: 85, anchor: 'bottom-center' },
  fontFamily: 'Inter', fontWeight: 600, fontSize: 46, textColor: '#F8FAFC', highlightColor: '#60A5FA',
};

export const modernTemplates = [
  modernGeometric,
  modernThinBorder,
];
