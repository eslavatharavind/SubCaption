import { TemplateConfig } from '@/types/template';

export const cinematic: TemplateConfig = {
  id: 'cinematic-drama',
  name: 'Cinematic Drama',
  category: 'Cinematic',
  description: 'Refined serif typography with wider tracking and smooth fade entrance.',
  tag: 'Film',
  supportedAspectRatios: ['16:9', '21:9', '9:16'],
  typography: { fontFamily: 'Playfair Display', fontWeight: 600, fontSize: 40, letterSpacing: 2, lineHeight: 1.4, italic: true },
  layout: { textLayout: 'two-line', maxCaptionWidth: 85 },
  colors: { primaryTextColor: '#F8FAFC', highlightColor: '#E2E8F0' },
  background: { type: 'shadow-only' },
  stroke: { enabled: false },
  shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.95)', blur: 12 },
  glow: { enabled: false },
  highlight: { mode: 'none' },
  animation: { entrance: 'fade', wordBehavior: 'none', characterBehavior: 'none' },
  position: { x: 50, y: 88, anchor: 'bottom-center' },
  fontFamily: 'Playfair Display', fontWeight: 600, fontSize: 40, textColor: '#F8FAFC', highlightColor: '#E2E8F0',
};

export const epicLetterbox: TemplateConfig = {
  id: 'epic-letterbox',
  name: 'Epic Letterbox',
  category: 'Cinematic',
  description: 'Subtle film documentary style with solid dark bar backing.',
  tag: 'Documentary',
  supportedAspectRatios: ['16:9', '21:9'],
  typography: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 38, letterSpacing: 1.5, lineHeight: 1.35 },
  layout: { textLayout: 'two-line', paddingX: 24, paddingY: 8 },
  colors: { primaryTextColor: '#E2E8F0', highlightColor: '#FFFFFF' },
  background: { type: 'solid', color: 'rgba(0, 0, 0, 0.85)', borderRadius: 4 },
  stroke: { enabled: false },
  shadow: { enabled: false },
  glow: { enabled: false },
  highlight: { mode: 'none' },
  animation: { entrance: 'fade', wordBehavior: 'none', characterBehavior: 'none' },
  position: { x: 50, y: 90, anchor: 'bottom-center' },
  fontFamily: 'Roboto', fontWeight: 400, fontSize: 38, textColor: '#E2E8F0', highlightColor: '#FFFFFF',
};

export const cinematicAmberGold: TemplateConfig = {
  id: 'cinematic-amber-gold',
  name: 'Cinematic Amber Gold',
  category: 'Cinematic',
  description: 'Filmic serif text with warm gold keyword emphasis.',
  tag: 'Gold',
  supportedAspectRatios: ['16:9', '21:9', '9:16'],
  typography: { fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 42, letterSpacing: 1.5, lineHeight: 1.4 },
  layout: { textLayout: 'two-line', maxCaptionWidth: 82 },
  colors: { primaryTextColor: '#FDF8F6', highlightColor: '#F59E0B' },
  background: { type: 'shadow-only' },
  stroke: { enabled: false },
  shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.95)', blur: 14 },
  glow: { enabled: false },
  highlight: { mode: 'one-keyword', highlightColors: ['#F59E0B'] },
  animation: { entrance: 'fade', wordBehavior: 'none', characterBehavior: 'none' },
  position: { x: 50, y: 88, anchor: 'bottom-center' },
  fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 42, textColor: '#FDF8F6', highlightColor: '#F59E0B',
};

export const cinematicTemplates = [
  cinematic,
  epicLetterbox,
  cinematicAmberGold,
];
