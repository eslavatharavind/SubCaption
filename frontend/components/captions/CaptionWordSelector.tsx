'use client';

import React, { useState, useMemo } from 'react';
import { CaptionSegment, CaptionWord, HighlightData } from '@/types/caption';

export interface CaptionWordSelectorProps {
  segments: CaptionSegment[];
  selectedSegmentId: string | null;
  selectedWordIndex: number | null;
  onSelectWord: (segmentId: string, wordIndex: number, word: CaptionWord) => void;
  onSelectPhrase?: (segmentId: string, startIndex: number, endIndex: number) => void;
  onClearSelection: () => void;
  highlightData?: HighlightData;
}

/**
 * Format seconds float into MM:SS timestamp string
 */
function formatTime(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Authoritative Full Voice Script & Transcript Word Selector
 * Provides access to the ENTIRE transcribed voice script across all segments.
 * Supports Search, Phrase selection (Shift+Click), Segment Navigation, and Stable Target Badges.
 */
export function CaptionWordSelector({
  segments,
  selectedSegmentId,
  selectedWordIndex,
  onSelectWord,
  onSelectPhrase,
  onClearSelection,
  highlightData,
}: CaptionWordSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'current' | 'full'>('current');

  const activeSegment = useMemo(() => {
    return segments.find((s) => s.id === selectedSegmentId) || segments[0] || null;
  }, [segments, selectedSegmentId]);

  // Handle Search Filtering across entire transcript
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matches: { segment: CaptionSegment; wordIndex: number; word: CaptionWord }[] = [];

    segments.forEach((seg) => {
      const words = seg.words && seg.words.length > 0
        ? seg.words
        : seg.text.split(' ').map((t, idx) => ({ text: t, start: seg.start, end: seg.end }));

      words.forEach((w, idx) => {
        if (w.text.toLowerCase().includes(q)) {
          matches.push({ segment: seg, wordIndex: idx, word: w });
        }
      });
    });

    return matches;
  }, [searchQuery, segments]);

  if (!segments || segments.length === 0) {
    return (
      <div className="p-3 bg-[#151A21] border border-[#262D36] rounded-xl text-xs text-brand-muted text-center">
        No voice script transcript available.
      </div>
    );
  }

  const handleWordClick = (segmentId: string, wIdx: number, w: CaptionWord, e: React.MouseEvent) => {
    if (e.shiftKey && selectedSegmentId === segmentId && selectedWordIndex !== null && onSelectPhrase) {
      const start = Math.min(selectedWordIndex, wIdx);
      const end = Math.max(selectedWordIndex, wIdx);
      onSelectPhrase(segmentId, start, end);
    } else {
      onSelectWord(segmentId, wIdx, w);
    }
  };

  const renderSegmentWords = (seg: CaptionSegment) => {
    const isCurrent = seg.id === selectedSegmentId;
    const words: CaptionWord[] = seg.words && seg.words.length > 0
      ? seg.words
      : seg.text.split(' ').map((t, idx) => ({ text: t, start: seg.start, end: seg.end }));

    const hlData = isCurrent ? highlightData || seg.highlight_data : seg.highlight_data;
    const targets = hlData?.targets || [];

    return (
      <div
        key={seg.id}
        className={`p-2.5 rounded-xl border transition-all ${
          isCurrent
            ? 'bg-[#151A21] border-primary-500/60 ring-1 ring-primary-500/20'
            : 'bg-[#11151A] border-[#262D36] hover:border-brand-subtle'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-brand-subtle border-b border-[#262D36] pb-1">
          <span className="font-bold text-primary-400">⏱ {formatTime(seg.start)} - {formatTime(seg.end)}</span>
          <span className="truncate max-w-[200px] text-brand-muted">{seg.text}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {words.map((w, wIdx) => {
            const target = targets.find((t) => t.wordIndex === wIdx || (t.wordId && t.wordId === w.id));
            const isSelected = isCurrent && selectedWordIndex === wIdx;
            const wordFont = target?.styleOverrides?.fontFamily || w.fontFamily || w.font;
            const wordColor = target?.styleOverrides?.textColor || (target ? hlData?.color : undefined);

            return (
              <button
                key={wIdx}
                type="button"
                onClick={(e) => handleWordClick(seg.id, wIdx, w, e)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-primary-600 border-primary-400 text-white font-bold ring-2 ring-primary-500/50 shadow-md scale-105'
                    : target
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-[#0B0D10] border-[#262D36] text-white hover:border-brand-subtle hover:bg-[#151A21]'
                }`}
              >
                <span className="text-[9px] text-brand-muted font-mono">#{wIdx + 1}</span>
                <span style={{ color: wordColor }}>{w.text}</span>
                {wordFont && <span className="text-[9px] text-amber-400 font-normal">({wordFont})</span>}
                {target?.emphasis?.effect && target.emphasis.effect !== 'none' && (
                  <span className="text-[8px] bg-primary-500/30 text-primary-300 px-1 rounded uppercase font-mono">
                    {target.emphasis.effect}
                  </span>
                )}
                {target && (
                  <span className="text-[9px] text-emerald-400" title="Target Active">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          <span>Full Voice Script Transcript</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedWordIndex !== null && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-[10px] text-primary-400 hover:underline font-normal normal-case cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Search Input & View Tabs */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0D10] border border-[#262D36] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-brand-muted focus:outline-none focus:border-primary-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-xs text-brand-muted hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex bg-[#0B0D10] border border-[#262D36] rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('current')}
            className={`px-2 py-1 text-[10px] font-bold rounded ${
              viewMode === 'current' ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-white'
            }`}
          >
            Current Segment
          </button>
          <button
            type="button"
            onClick={() => setViewMode('full')}
            className={`px-2 py-1 text-[10px] font-bold rounded ${
              viewMode === 'full' ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-white'
            }`}
          >
            Full Transcript ({segments.length})
          </button>
        </div>
      </div>

      {/* Search Results Display */}
      {searchQuery.trim() ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <div className="text-[10px] font-semibold text-brand-muted uppercase">
            Found {searchResults.length} matching occurrences for "{searchQuery}":
          </div>
          {searchResults.length === 0 ? (
            <div className="text-xs text-brand-subtle p-2 text-center">No words match "{searchQuery}"</div>
          ) : (
            searchResults.map((item, resIdx) => (
              <button
                key={resIdx}
                type="button"
                onClick={(e) => handleWordClick(item.segment.id, item.wordIndex, item.word, e)}
                className="w-full p-2 rounded-lg bg-[#0B0D10] border border-[#262D36] hover:border-primary-500 text-left flex items-center justify-between text-xs transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-primary-400">[{formatTime(item.word.start)}]</span>
                  <span className="font-bold text-white">"{item.word.text}"</span>
                  <span className="text-[10px] text-brand-muted truncate max-w-[180px]">in "{item.segment.text}"</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">Word #{item.wordIndex + 1}</span>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Segment Transcript List */
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {viewMode === 'current' && activeSegment ? (
            renderSegmentWords(activeSegment)
          ) : (
            segments.map((seg) => renderSegmentWords(seg))
          )}
        </div>
      )}

      <div className="flex justify-between items-center text-[10px] text-brand-muted pt-1 border-t border-[#262D36]">
        <span>
          {selectedWordIndex !== null && activeSegment
            ? `Targeting word #${selectedWordIndex + 1} "${activeSegment.words?.[selectedWordIndex]?.text}". Overrides apply to this word.`
            : 'Click ANY word in the transcript to target it (Shift+Click to select a phrase).'}
        </span>
        <span className="text-brand-subtle font-mono">
          {segments.reduce((acc, s) => acc + (s.words?.length || s.text.split(' ').length), 0)} total words
        </span>
      </div>
    </div>
  );
}
