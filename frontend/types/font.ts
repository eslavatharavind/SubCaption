export type FontCategory =
  | 'Sans Serif'
  | 'Bold / Heavy'
  | 'Serif'
  | 'Display'
  | 'Script'
  | 'Handwritten'
  | 'Monospace'
  | 'Condensed'
  | 'Rounded'
  | 'Retro'
  | 'Futuristic'
  | 'Pixel'
  | 'Telugu'
  | 'Hindi';

export interface FontMetadata {
  id: string;
  name: string;
  family: string;
  category: FontCategory;
  subcategory?: string;
  fontFile?: string;
  fontFiles?: Record<string, string>;
  supportedScripts: string[];
  supportedLanguages: string[];
  weights: number[];
  styles: string[];
  variable?: boolean;
  license: string;
  licenseUrl: string;
  tags: string[];
  previewText: string;
  isMultilingual: boolean;
  isDefaultCompatible: boolean;
  googleFontName?: string;
}

export interface WordFontOverride {
  wordIndex: number;
  wordText: string;
  fontFamily: string;
  fontWeight?: number;
  color?: string;
}
