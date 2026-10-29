'use client';

import { FontMetadata } from '@/types/font';
import { FONT_REGISTRY } from './fontRegistry';

const loadedFonts = new Set<string>();

/**
 * Dynamically injects Google Font stylesheet into document head on demand.
 */
export function loadFontOnDemand(fontFamilyOrObj: string | FontMetadata): void {
  if (typeof window === 'undefined') return;

  let fontObj: FontMetadata | undefined;
  if (typeof fontFamilyOrObj === 'string') {
    fontObj = FONT_REGISTRY.find(
      (f) => f.family.toLowerCase() === fontFamilyOrObj.toLowerCase() || f.id === fontFamilyOrObj.toLowerCase()
    );
  } else {
    fontObj = fontFamilyOrObj;
  }

  const googleName = fontObj?.googleFontName || (typeof fontFamilyOrObj === 'string' ? fontFamilyOrObj : fontObj?.family);
  if (!googleName) return;

  const fontKey = googleName.toLowerCase().trim();
  if (loadedFonts.has(fontKey)) return;

  try {
    const linkId = `google-font-${fontKey.replace(/[^a-z0-9]/g, '-')}`;
    if (document.getElementById(linkId)) {
      loadedFonts.add(fontKey);
      return;
    }

    const weights = fontObj?.weights?.length ? fontObj.weights.sort((a, b) => a - b).join(';') : '400;700';
    const formattedName = googleName.replace(/\s+/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@${weights}&display=swap`;

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);

    loadedFonts.add(fontKey);
  } catch (err) {
    console.warn('Font dynamic load error:', err);
  }
}

/**
 * Ensures fallback font stack is constructed for Telugu and Hindi multilingual rendering.
 * Prevents missing glyph squares when Latin-only fonts are used on Indic text.
 */
export function getFontFamilyWithFallback(userFont: string, targetLanguage?: string): string {
  if (!userFont) return '"Inter", "Noto Sans Telugu", "Noto Sans Devanagari", sans-serif';

  const cleanFont = userFont.replace(/['"]/g, '');
  const fallbacks = ['"Noto Sans Telugu"', '"Noto Sans Devanagari"', '"Inter"', 'sans-serif'];

  if (targetLanguage === 'te' || targetLanguage === 'te_en' || targetLanguage === 'te_roman') {
    return `"${cleanFont}", ${fallbacks.join(', ')}`;
  }
  if (targetLanguage === 'hi') {
    return `"${cleanFont}", ${fallbacks[1]}, ${fallbacks[0]}, ${fallbacks[2]}, ${fallbacks[3]}`;
  }

  return `"${cleanFont}", ${fallbacks.join(', ')}`;
}
