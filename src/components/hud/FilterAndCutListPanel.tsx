'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Star,
  Timer,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Crosshair,
  User,
} from 'lucide-react';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';
import {
  ALL_CUT_DIFFICULTIES,
  ALL_MOVEMENT_TECHS,
  CUT_DIFFICULTY_CONFIG,
  MODULE_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';
import { ModuleDifficulty } from '@/types/jumpleague';

const MODULE_DIFF_OPTIONS: (ModuleDifficulty | 'ALL')[] = [
  'ALL',
  'EASY',
  'MEDIUM',
  'HARD',
  'ULTRA',
];

export const FilterAndCutListPanel: React.FC = () => {
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const cuts = useJumpLeagueStore((s) => s.cuts);
  const selectedModuleId = useJumpLeagueStore((s) => s.selectedModuleId);
  const selectedCutId = useJumpLeagueStore((s) => s.selectedCutId);
  const hoveredCutId = useJumpLeagueStore((s) => s.hoveredCutId);
  const filters = useJumpLeagueStore((s) => s.filters);

  const selectCut = useJumpLeagueStore((s) => s.selectCut);
  const setHoveredCut = useJumpLeagueStore((s) => s.setHoveredCut);
  const updateFilters = useJumpLeagueStore((s) => s.updateFilters);
  const toggleCutDifficultyFilter = useJumpLeagueStore(
    (s) => s.toggleCutDifficultyFilter
  );
  const toggleTechniqueFilter = useJumpLeagueStore(
    (s) => s.toggleTechniqueFilter
  );
  const resetFilters = useJumpLeagueStore((s) => s.resetFilters);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.moduleDifficulty !== 'ALL' ||
      filters.searchQuery.trim() !== '' ||
      filters.cutDifficulties.length > 0 ||
      filters.techniques.length > 0 ||
      filters.minTimeSaved > 0 ||
      filters.minConsistency > 1
    );
  }, [filters]);

  const filteredCuts = useMemo(() => {
    return cuts
      .filter((cut) => {
        if (cut.status !== 'APPROVED') return false;
        if (cut.moduleId !== selectedModuleId) return false;

        if (
          filters.cutDifficulties.length > 0 &&
          !filters.cutDifficulties.includes(cut.difficulty)
        ) {
          return false;
        }
        if (
          filters.techniques.length > 0 &&
          !filters.techniques.some((t) => cut.techniques.includes(t))
        ) {
          return false;
        }
        if (cut.timeSavedSeconds < filters.minTimeSaved) {
          return false;
        }
        if (cut.consistencyRating < filters.minConsistency) {
          return false;
        }
        if (filters.searchQuery.trim() !== '') {
          const q = filters.searchQuery.toLowerCase();
          const matchName = cut.name.toLowerCase().includes(q);
          const matchDesc = cut.description.toLowerCase().includes(q);
          const matchUser = cut.submittedBy.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchUser) return false;
        }
        return true;
      })
      .sort((a, b) => b.timeSavedSeconds - a.timeSavedSeconds);
  }, [cuts, selectedModuleId, filters]);

  const totalTimeSavedInModule = useMemo(
    () =>
      filteredCuts.reduce((acc, cut) => acc + cut.timeSavedSeconds, 0),
    [filteredCuts]
  );

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-140px)] w-full max-w-sm flex-col bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
      {/* Top Search & Filter Toggle Header */}
      <div className="border-b border-white/10 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Tactical Cut-Filter
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:bg-white/20 hover:text-white transition"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersExpanded((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
            >
              <span>{filtersExpanded ? 'Einklappen' : 'Filter öffnen'}</span>
              {filtersExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            placeholder="Cut, Lineup oder Spieler suchen..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>

        {/* Collapsible Advanced Filters */}
        {filtersExpanded && (
          <div className="space-y-3 pt-1">
            {/* Module Difficulty Filter */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Modul-Schwierigkeit
              </label>
              <div className="grid grid-cols-5 gap-1">
                {MODULE_DIFF_OPTIONS.map((diff) => {
                  const active = filters.moduleDifficulty === diff;
                  const color =
                    diff === 'ALL'
                      ? '#e4e4e7'
                      : MODULE_DIFFICULTY_CONFIG[diff].color;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => updateFilters({ moduleDifficulty: diff })}
                      className={`rounded-lg border py-1 font-mono text-[10px] font-bold transition ${
                        active
                          ? 'bg-white/15 border-white/40 text-white'
                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                      style={active ? { color } : undefined}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cut Difficulty Multi-Select (Neon Accent Badges) */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Cut-Risiko (Farbcodierung)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_CUT_DIFFICULTIES.map((diff) => {
                  const cfg = CUT_DIFFICULTY_CONFIG[diff];
                  const selected = filters.cutDifficulties.includes(diff);
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => toggleCutDifficultyFilter(diff)}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-semibold transition ${
                        selected
                          ? `${cfg.bgClass} ${cfg.borderClass} text-white`
                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: cfg.color,
                          boxShadow: selected
                            ? `0 0 8px ${cfg.color}`
                            : undefined,
                        }}
                      />
                      <span className="truncate">{cfg.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Movement Techniques Filter Chips */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Movement-Techniken
              </label>
              <div className="flex flex-wrap gap-1">
                {ALL_MOVEMENT_TECHS.map((tech) => {
                  const selected = filters.techniques.includes(tech);
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => toggleTechniqueFilter(tech)}
                      title={MOVEMENT_TECH_CONFIG[tech].description}
                      className={`rounded-lg border px-2 py-0.5 font-mono text-[10px] transition ${
                        selected
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-semibold'
                          : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {MOVEMENT_TECH_CONFIG[tech].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders: Min Time Saved (0-5s) & Min Consistency (1-5 Stars) */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>MIN. ZEITERSPARNIS</span>
                  <span className="text-emerald-400 font-bold">
                    {filters.minTimeSaved.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={filters.minTimeSaved}
                  onChange={(e) =>
                    updateFilters({ minTimeSaved: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>KONSTANZ</span>
                  <span className="text-amber-400 font-bold">
                    ≥ {filters.minConsistency}★
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateFilters({ minConsistency: star })}
                      className="p-0.5 transition hover:scale-110"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          star <= filters.minConsistency
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Module Cut Summary Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/40 px-3.5 py-2 text-[11px]">
        <span className="font-mono text-zinc-400">
          MODUL <strong className="text-white">{selectedModuleId}</strong> •{' '}
          {filteredCuts.length} Cuts
        </span>
        <span className="font-mono text-emerald-400 font-semibold">
          Potenzial: -{totalTimeSavedInModule.toFixed(1)}s
        </span>
      </div>

      {/* Scrollable Cuts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredCuts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-xs text-zinc-400">
              Keine Cuts für die aktiven Filter in Modul{' '}
              <span className="font-mono text-white">{selectedModuleId}</span>{' '}
              gefunden.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-white/15"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          filteredCuts.map((cut) => {
            const isSelected = cut.id === selectedCutId;
            const isHovered = cut.id === hoveredCutId;
            const diffCfg = CUT_DIFFICULTY_CONFIG[cut.difficulty];

            return (
              <div
                key={cut.id}
                role="button"
                tabIndex={0}
                onClick={() => selectCut(cut.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') selectCut(cut.id);
                }}
                onMouseEnter={() => setHoveredCut(cut.id)}
                onMouseLeave={() => setHoveredCut(null)}
                className={`group cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
                  isSelected
                    ? 'bg-white/12 border-white/35 shadow-lg'
                    : isHovered
                      ? 'bg-white/8 border-white/20'
                      : 'bg-zinc-900/55 border-white/10 hover:bg-white/8 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: diffCfg.color,
                        boxShadow: `0 0 8px ${diffCfg.color}`,
                      }}
                    />
                    <span
                      className="font-mono text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: diffCfg.color }}
                    >
                      {diffCfg.shortLabel}
                    </span>
                  </div>

                  {/* Time Saved Pill */}
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                    <Timer className="h-3 w-3" />-{cut.timeSavedSeconds.toFixed(1)}s
                  </span>
                </div>

                <h3 className="mt-1.5 text-xs font-bold text-zinc-100 group-hover:text-white leading-snug">
                  {cut.name}
                </h3>

                {/* Techniques & Consistency Stars */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {cut.techniques.map((tech) => (
                      <span
                        key={tech}
                        className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300"
                      >
                        {MOVEMENT_TECH_CONFIG[tech].label}
                      </span>
                    ))}
                  </div>

                  <div
                    className="flex items-center gap-0.5"
                    title={`Konstanz: ${cut.consistencyRating}/5 Sterne`}
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= cut.consistencyRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Coordinates & Submitter Footer */}
                <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5 font-mono text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Crosshair className="h-3 w-3 text-cyan-400" />({cut.startBlock.x},
                    {cut.startBlock.y},{cut.startBlock.z}) → ({cut.endBlock.x},
                    {cut.endBlock.y},{cut.endBlock.z})
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <User className="h-2.5 w-2.5" />
                    {cut.submittedBy}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
