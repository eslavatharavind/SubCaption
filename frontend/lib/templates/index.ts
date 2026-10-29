import { TemplateConfig } from '@/types/template';
import { REFERENCE_TEMPLATES } from './referenceTemplates';
import { NEW_TEMPLATES_V2 } from './v2Templates';
import { ADVANCED_TEMPLATES } from './advancedTemplates';

export * from './referenceTemplates';
export * from './v2Templates';
export * from './advancedTemplates';

/** Basic library: the original 88 presets (44 reference + 44 V2), unchanged. */
export const BASIC_TEMPLATES: TemplateConfig[] = [...REFERENCE_TEMPLATES, ...NEW_TEMPLATES_V2];

/** Advanced library: 100 opt-in dynamic templates rendered by AdvancedCaptionRenderer. */
export { ADVANCED_TEMPLATES };

export type TemplateTier = 'basic' | 'advanced';
export const isAdvancedTemplate = (t: TemplateConfig) => Boolean(t.advanced);
export const getTemplateTier = (t: TemplateConfig): TemplateTier => (t.advanced ? 'advanced' : 'basic');

/**
 * Authoritative Central Template Registry: 88 Basic + 100 Advanced = 188.
 * Basic templates come first so ALL_TEMPLATES[0] (the editor default) is unchanged.
 */
export const ALL_TEMPLATES: TemplateConfig[] = [...BASIC_TEMPLATES, ...ADVANCED_TEMPLATES];

// Runtime Validation Check for Unique IDs and Required Configuration Properties
const templateIdSet = new Set<string>();
ALL_TEMPLATES.forEach((template, index) => {
  if (!template.id) {
    console.error(`[TemplateRegistry Error] Template at index ${index} is missing an 'id'.`, template);
  } else if (templateIdSet.has(template.id)) {
    console.warn(`[TemplateRegistry Warning] Duplicate template ID detected: '${template.id}'. This may cause silent UI overwrites.`);
  } else {
    templateIdSet.add(template.id);
  }
});

/**
 * Validates a single TemplateConfig instance for required fields and configuration integrity.
 */
export function validateTemplateConfig(template: TemplateConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!template.id) errors.push('Missing unique template id');
  if (!template.name) errors.push('Missing template name');
  if (!template.category) errors.push('Missing template category');
  if (!template.description) errors.push('Missing template description');

  const font = template.typography?.fontFamily || template.fontFamily;
  if (!font) errors.push(`Template '${template.id}' missing typography fontFamily`);

  const textColor = template.colors?.primaryTextColor || template.textColor;
  if (!textColor) errors.push(`Template '${template.id}' missing primary text color`);

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates the entire central template registry. Returns full diagnostic validation status.
 */
export function validateRegistry(): { isValid: boolean; totalCount: number; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();

  ALL_TEMPLATES.forEach((tmpl, idx) => {
    if (!tmpl.id) {
      errors.push(`Template at index ${idx} has no id`);
    } else if (seenIds.has(tmpl.id)) {
      errors.push(`Duplicate template ID '${tmpl.id}' detected at index ${idx}`);
    } else {
      seenIds.add(tmpl.id);
    }

    const { isValid, errors: tmplErrors } = validateTemplateConfig(tmpl);
    if (!isValid) {
      tmplErrors.forEach((e) => errors.push(e));
    }
  });

  return {
    isValid: errors.length === 0,
    totalCount: ALL_TEMPLATES.length,
    errors,
    warnings,
  };
}

// Execute startup validation check
const registryDiagnostic = validateRegistry();
if (!registryDiagnostic.isValid) {
  console.warn('[TemplateRegistry Validation Warning]', registryDiagnostic.errors);
}

/**
 * Retrieve a template configuration by its unique ID with fallback to default.
 */
export function getTemplateById(id: string): TemplateConfig {
  return ALL_TEMPLATES.find((t) => t.id === id) || ALL_TEMPLATES[0];
}

/**
 * Computes exact dynamic category template counts from the registered library.
 */
export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = { All: ALL_TEMPLATES.length };
  ALL_TEMPLATES.forEach((tmpl) => {
    const cat = tmpl.category || 'Uncategorized';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}

/**
 * Returns list of categories that actually contain registered templates.
 */
export function getAvailableCategories(): string[] {
  const categories = new Set<string>();
  ALL_TEMPLATES.forEach((t) => {
    if (t.category) categories.add(t.category);
  });
  return ['All', ...Array.from(categories).sort()];
}

/** Category list for one library tier (Advanced keeps its curated order). */
export function getCategoriesForTier(tier: TemplateTier): string[] {
  const source = tier === 'advanced' ? ADVANCED_TEMPLATES : BASIC_TEMPLATES;
  const seen: string[] = [];
  source.forEach((t) => {
    if (t.category && !seen.includes(t.category)) seen.push(t.category);
  });
  return ['All', ...(tier === 'advanced' ? seen : seen.sort())];
}

export function getTierCounts() {
  return { basic: BASIC_TEMPLATES.length, advanced: ADVANCED_TEMPLATES.length, total: ALL_TEMPLATES.length };
}
