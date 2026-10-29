'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { ALL_TEMPLATES, BASIC_TEMPLATES, ADVANCED_TEMPLATES, getCategoryCounts, getCategoriesForTier, getTierCounts, TemplateTier } from '@/lib/templates';
import { TemplateConfig, TemplateCategory, AspectRatio } from '@/types/template';
import { LiveTemplatePreview } from '@/components/templates/LiveTemplatePreview';

const ASPECT_RATIOS: AspectRatio[] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9'];

export default function TemplatesPage() {
  const [tier, setTier] = useState<TemplateTier>('basic');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewLang, setPreviewLang] = useState<'en' | 'te' | 'hi'>('en');
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null);

  const sampleTexts = {
    en: { line1: 'New AI technology is', line2: 'changing everything' },
    te: { line1: 'కొత్త AI టెక్నాలజీ', line2: 'ప్రపంచాన్ని మార్చుతోంది' },
    hi: { line1: 'नई AI तकनीक', line2: 'दुनिया को बदल रही है' },
  };

  const [visibleBatchCount, setVisibleBatchCount] = useState<number>(100);

  const categoryCounts = useMemo(() => getCategoryCounts(), []);
  const availableCategories = useMemo(() => getCategoriesForTier(tier), [tier]);
  const tierCounts = useMemo(() => getTierCounts(), []);
  const tierTemplates = tier === 'advanced' ? ADVANCED_TEMPLATES : BASIC_TEMPLATES;

  const filteredTemplates = useMemo(() => {
    return tierTemplates.filter((tmpl) => {
      const matchesCategory = activeCategory === 'All' || tmpl.category === activeCategory;
      const matchesAspect = selectedAspectRatio === 'All' || !tmpl.supportedAspectRatios || tmpl.supportedAspectRatios.includes(selectedAspectRatio as AspectRatio);
      const matchesSearch = !searchQuery || tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesAspect && matchesSearch;
    });
  }, [tierTemplates, activeCategory, selectedAspectRatio, searchQuery]);

  const displayedTemplates = useMemo(() => {
    return filteredTemplates.slice(0, visibleBatchCount);
  }, [filteredTemplates, visibleBatchCount]);


  return (
    <AppShell title="Template Gallery">
      <div className="space-y-8 pb-12">
        {/* Header Banner */}
        <div className="bg-[#151A21] border border-[#262D36] p-6 md:p-8 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 inline-block">
                Showing {filteredTemplates.length} of {tierTemplates.length} {tier === 'advanced' ? 'Advanced' : 'Basic'} presets · {tierCounts.basic} Basic + {tierCounts.advanced} Advanced = {tierCounts.total} total
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Caption Template Gallery
              </h2>
              <p className="text-brand-muted text-sm max-w-2xl">
                Configuration-driven caption presets featuring live animated previews for English, Telugu, and Hindi videos.
              </p>
            </div>

            {/* Language Switcher for Preview */}
            <div className="flex items-center gap-1.5 bg-[#11151A] p-1.5 rounded-xl border border-[#262D36] max-w-full overflow-x-auto">
              <span className="text-[11px] font-semibold text-brand-muted px-2 whitespace-nowrap hidden min-[400px]:inline">Preview Text:</span>
              <button
                onClick={() => setPreviewLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewLang === 'en'
                    ? 'bg-primary-600 text-white'
                    : 'text-brand-muted hover:text-white'
                }`}
              >
                English 🇬🇧
              </button>
              <button
                onClick={() => setPreviewLang('te')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewLang === 'te'
                    ? 'bg-primary-600 text-white'
                    : 'text-brand-muted hover:text-white'
                }`}
              >
                Telugu 🇮🇳
              </button>
              <button
                onClick={() => setPreviewLang('hi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewLang === 'hi'
                    ? 'bg-primary-600 text-white'
                    : 'text-brand-muted hover:text-white'
                }`}
              >
                Hindi 🇮🇳
              </button>
            </div>
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="pt-2 flex flex-col md:flex-row gap-3 items-center justify-between border-t border-[#262D36]/60">
            {/* Search Input */}
            <div className="w-full md:w-72 relative">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#11151A] border border-[#262D36] rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-brand-subtle focus:outline-none focus:border-primary-500"
              />
              <svg className="w-4 h-4 text-brand-subtle absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              <span className="text-[11px] font-semibold text-brand-subtle whitespace-nowrap shrink-0">Aspect Ratio:</span>
              <button
                onClick={() => setSelectedAspectRatio('All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedAspectRatio === 'All'
                    ? 'bg-primary-600 text-white'
                    : 'bg-[#11151A] border border-[#262D36] text-brand-muted hover:text-white'
                }`}
              >
                All
              </button>
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  onClick={() => setSelectedAspectRatio(ar)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedAspectRatio === ar
                      ? 'bg-primary-600 text-white'
                      : 'bg-[#11151A] border border-[#262D36] text-brand-muted hover:text-white'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Library tier switch (extends the existing category filter) */}
        <div role="tablist" aria-label="Template library" className="inline-flex rounded-xl border border-[#262D36] bg-[#11151A] p-1">
          {([
            ['basic', 'Basic', tierCounts.basic],
            ['advanced', 'Advanced', tierCounts.advanced],
          ] as const).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tier === id}
              onClick={() => {
                setTier(id);
                setActiveCategory('All');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                tier === id ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-white'
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${tier === id ? 'bg-white/20' : 'bg-[#151A21] text-brand-subtle'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Category Pills Bar with Dynamic Category Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#262D36]">
          {availableCategories.map((cat) => {
            const count = cat === 'All' ? tierTemplates.length : categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'bg-[#151A21] border border-[#262D36] text-brand-muted hover:text-white hover:bg-[#1B2129]'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    activeCategory === cat ? 'bg-white/20 text-white' : 'bg-[#11151A] text-brand-subtle'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>


        {/* Template Grid featuring Live Animated Previews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayedTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              onMouseEnter={() => setHoveredTemplateId(tmpl.id)}
              onMouseLeave={() => setHoveredTemplateId(null)}
              onTouchStart={() => setHoveredTemplateId(tmpl.id)}
              className="bg-[#151A21] border border-[#262D36] rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 hover:border-brand-subtle transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded-full border border-primary-500/20">
                    {tmpl.tag || tmpl.category}
                  </span>
                  <span className="text-xs text-brand-subtle">{tmpl.category}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-primary-400 transition-colors">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-brand-muted line-clamp-2">
                  {tmpl.description}
                </p>
              </div>

              {/* LIVE ANIMATED PREVIEW CARD */}
              <LiveTemplatePreview
                template={tmpl}
                previewText={tmpl.advanced && previewLang === 'en' ? undefined : sampleTexts[previewLang]}
                isHovered={hoveredTemplateId === tmpl.id}
              />

              {/* Specifications Footer */}
              <div className="pt-2 border-t border-[#262D36] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-brand-muted">
                <span>Font: <strong className="text-white">{tmpl.typography?.fontFamily || tmpl.fontFamily}</strong></span>
                <span>Anim: <strong className="text-white capitalize">{tmpl.animation?.entrance || 'fade'}</strong></span>
                <Link
                  href="/dashboard"
                  className="text-xs text-primary-400 font-bold hover:underline"
                >
                  Apply Preset &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Pagination Button for Large Library Scaling */}
        {visibleBatchCount < filteredTemplates.length && (
          <div className="pt-6 text-center">
            <button
              onClick={() => setVisibleBatchCount((prev) => prev + 24)}
              className="px-6 py-2.5 bg-[#151A21] hover:bg-[#1B2129] border border-[#262D36] text-xs font-bold text-primary-400 rounded-xl transition-all shadow-lg hover:border-primary-500"
            >
              Load More Presets ({filteredTemplates.length - visibleBatchCount} Remaining) &darr;
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
