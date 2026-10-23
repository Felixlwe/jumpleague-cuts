'use client';

import React, { useMemo } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  Star,
  Timer,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useJLStore, doesCutMatchFilters } from '@/store/useJLStore';
import {
  ALL_CUT_DIFFICULTIES,
  ALL_MOVEMENT_TECHS,
  CUT_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';

export const FilterDrawer: React.FC = () => {
  const filters = useJLStore((s) => s.filters);
  const cuts = useJLStore((s) => s.cuts);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const isFilterDrawerOpen = useJLStore((s) => s.isFilterDrawerOpen);

  const toggleFilterDrawer = useJLStore((s) => s.toggleFilterDrawer);
  const updateFilters = useJLStore((s) => s.updateFilters);
  const toggleCutDifficultyFilter = useJLStore(
    (s) => s.toggleCutDifficultyFilter
  );
  const toggleTechniqueFilter = useJLStore((s) => s.toggleTechniqueFilter);
  const resetFilters = useJLStore((s) => s.resetFilters);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cutDifficulties.length > 0) count += 1;
    if (filters.techniques.length > 0) count += 1;
    if (filters.minTimeSaved > 0) count += 1;
    if (filters.minConsistency > 1) count += 1;
    if (filters.searchQuery.trim() !== '') count += 1;
    return count;
  }, [filters]);

  const matchingCountInActiveModule = useMemo(() => {
    return cuts.filter(
      (c) =>
        c.moduleId === selectedModuleId &&
        c.status === 'APPROVED' &&
        doesCutMatchFilters(c, filters)
    ).length;
  }, [cuts, selectedModuleId, filters]);

  // Compact collapsed state: small sleek pill bar
  if (!isFilterDrawerOpen) {
    return (
      <div className="pointer-events-auto flex items-center gap-1.5 bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl text-zinc-100 px-3 py-1.5">
        <button
          type="button"
          onClick={toggleFilterDrawer}
          className="flex items-center gap-2 text-left text-xs font-semibold text-zinc-200 hover:text-white transition"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-1.5 py-0.2 font-mono text-[10px] font-bold text-cyan-300">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            title="Alle Filter zurücksetzen"
            className="ml-1 flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300 hover:bg-white/20 hover:text-white transition"
          >
            <RotateCcw className="h-2.5 w-2.5 text-cyan-400" />
          </button>
        )}
      </div>
    );
  }

  // Expanded state above the Cut-Index
  return (
    <section className="pointer-events-auto w-full bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden transition-all duration-200">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10">
        <button
          type="button"
          onClick={toggleFilterDrawer}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-100">Filter</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
              {activeFilterCount} aktiv
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] text-emerald-400 font-semibold">
            {matchingCountInActiveModule} Treffer
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              title="Alle Filter zurücksetzen"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-200 hover:bg-white/20 hover:text-white transition"
            >
              <RotateCcw className="h-3 w-3 text-cyan-400" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleFilterDrawer}
            className="rounded-lg border border-white/10 bg-zinc-900/70 p-1 text-zinc-400 hover:text-white transition"
            title="Filter einklappen"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Filter Controls Body */}
      <div className="max-h-72 overflow-y-auto p-3.5 space-y-3.5">
        {/* Quick Text Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            placeholder="Cut-Name, Lineup oder Technik suchen..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>

        {/* 1. Cut-Schwierigkeit */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Cut-Schwierigkeit
            </label>
            {filters.cutDifficulties.length > 0 && (
              <button
                type="button"
                onClick={() => updateFilters({ cutDifficulties: [] })}
                className="font-mono text-[10px] text-cyan-400 hover:underline"
              >
                Alle zeigen
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ALL_CUT_DIFFICULTIES.map((diff) => {
              const cfg = CUT_DIFFICULTY_CONFIG[diff];
              const isSelected = filters.cutDifficulties.includes(diff);

              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => toggleCutDifficultyFilter(diff)}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${
                    isSelected
                      ? `${cfg.bgClass} ${cfg.borderClass} text-white shadow-md`
                      : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: cfg.color,
                      boxShadow: isSelected
                        ? `0 0 8px ${cfg.color}`
                        : undefined,
                    }}
                  />
                  <span className="truncate font-mono text-[10px]">
                    {cfg.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Movement-Techniken */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Movement-Techniken
            </label>
            {filters.techniques.length > 0 && (
              <button
                type="button"
                onClick={() => updateFilters({ techniques: [] })}
                className="font-mono text-[10px] text-cyan-400 hover:underline"
              >
                Auswahl löschen
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {ALL_MOVEMENT_TECHS.map((tech) => {
              const isSelected = filters.techniques.includes(tech);
              const techInfo = MOVEMENT_TECH_CONFIG[tech];

              return (
                <button
                  key={tech}
                  type="button"
                  onClick={() => toggleTechniqueFilter(tech)}
                  title={techInfo.description}
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[10px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                      : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  {techInfo.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Mindest-Zeitersparnis & 5. Mindest-Konsistenz side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-zinc-900/55 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-zinc-400">
                <Timer className="h-3 w-3 text-emerald-400" />
                Min. Zeit
              </span>
              <span className="font-mono text-[11px] font-extrabold text-emerald-400">
                ≥ {filters.minTimeSaved.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={filters.minTimeSaved}
              onChange={(e) =>
                updateFilters({ minTimeSaved: parseFloat(e.target.value) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-emerald-400"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/55 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-zinc-400">
                <Star className="h-3 w-3 text-amber-400" />
                Konsistenz
              </span>
              <span className="font-mono text-[11px] font-extrabold text-amber-400">
                ≥ {filters.minConsistency}★
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isActive = starVal <= filters.minConsistency;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => updateFilters({ minConsistency: starVal })}
                    className="p-0.5 transition hover:scale-110"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        isActive
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
