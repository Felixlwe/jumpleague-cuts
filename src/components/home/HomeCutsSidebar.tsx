'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Route,
  Search,
  ArrowUpRight,
  Timer,
  Video,
  X,
  Sparkles,
} from 'lucide-react';
import { Cut, JLModule, ModuleDifficulty } from '@/types/jumpleague';
import {
  CUT_DIFFICULTY_CONFIG,
  MODULE_DIFFICULTY_CONFIG,
  getModuleDifficultyConfig,
} from '@/constants/jumpleagueConfig';
import { compareModuleIds } from '@/lib/moduleUtils';

export type CutSidebarDifficultyFilter = 'ALL' | ModuleDifficulty;

interface HomeCutsSidebarProps {
  cuts: Cut[];
  modules: JLModule[];
  isLoading?: boolean;
  activeDifficulty?: CutSidebarDifficultyFilter;
  onSelectModule?: (moduleId: string) => void;
  onSelectCut?: (cutId: string) => void;
}

export const HomeCutsSidebar: React.FC<HomeCutsSidebarProps> = ({
  cuts,
  modules,
  isLoading = false,
  activeDifficulty = 'ALL',
  onSelectModule,
  onSelectCut,
}) => {
  const [cutSearch, setCutSearch] = useState('');

  // Module difficulty resolver (supports direct module lookups and prefix fallbacks)
  const getModuleDifficulty = useMemo(() => {
    const cache = new Map<string, ModuleDifficulty>();
    for (const m of modules) {
      const cleanId = m.id.replace(/^#+/, '').toLowerCase();
      cache.set(cleanId, m.difficulty);
      if (m.shortCode) {
        cache.set(m.shortCode.replace(/^#+/, '').toLowerCase(), m.difficulty);
      }
    }
    return (modId: string): ModuleDifficulty => {
      const clean = modId.replace(/^#+/, '').toLowerCase();
      if (cache.has(clean)) return cache.get(clean)!;
      const upper = clean.toUpperCase();
      if (upper.startsWith('E')) return 'EASY';
      if (upper.startsWith('M')) return 'MEDIUM';
      if (upper.startsWith('H')) return 'HARD';
      if (upper.startsWith('U')) return 'ULTRA';
      return 'MEDIUM';
    };
  }, [modules]);

  // Active difficulty configuration for styling
  const activeDifficultyConfig = useMemo(() => {
    if (!activeDifficulty || activeDifficulty === 'ALL') return null;
    return MODULE_DIFFICULTY_CONFIG[activeDifficulty] || null;
  }, [activeDifficulty]);

  // 1. Filter approved cuts and apply active difficulty filter if set
  const approvedCuts = useMemo(() => {
    return cuts.filter((c) => {
      if (c.status !== 'APPROVED') return false;
      if (!activeDifficulty || activeDifficulty === 'ALL') return true;
      const modDiff = getModuleDifficulty(c.moduleId);
      return modDiff === activeDifficulty;
    });
  }, [cuts, activeDifficulty, getModuleDifficulty]);

  // 2. Group by moduleId and sort numerically (E1, E2 ... E11, E17, M1, etc.)
  const groupedModuleCuts = useMemo(() => {
    const query = cutSearch.trim().toLowerCase();

    // Group cuts by moduleId
    const map = new Map<string, Cut[]>();
    for (const cut of approvedCuts) {
      const list = map.get(cut.moduleId) ?? [];
      list.push(cut);
      map.set(cut.moduleId, list);
    }

    // Sort module IDs using compareModuleIds
    const sortedModuleIds = Array.from(map.keys()).sort(compareModuleIds);

    const result = sortedModuleIds.map((modId) => {
      const cleanModId = modId.replace(/^#+/, '');
      const mod =
        modules.find((m) => {
          const mClean = m.id.replace(/^#+/, '').toLowerCase();
          return (
            mClean === cleanModId.toLowerCase() ||
            (m.shortCode || '').toLowerCase().replace(/^#+/, '') ===
              cleanModId.toLowerCase()
          );
        }) ?? null;

      const modCuts = (map.get(modId) || []).sort(
        (a, b) => b.timeSavedSeconds - a.timeSavedSeconds
      );

      return {
        moduleId: modId,
        cleanId: cleanModId,
        module: mod,
        cuts: modCuts,
      };
    });

    // If search query is present, filter groups and cuts
    if (!query) return result;

    return result
      .map((group) => {
        const modMatches =
          group.cleanId.toLowerCase().includes(query) ||
          (group.module?.name &&
            group.module.name.toLowerCase().includes(query));

        if (modMatches) {
          // If the module itself matches, keep all its cuts
          return group;
        }

        // Otherwise keep only matching cuts
        const matchingCuts = group.cuts.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.techniques.some((t) => t.toLowerCase().includes(query))
        );

        if (matchingCuts.length === 0) return null;

        return {
          ...group,
          cuts: matchingCuts,
        };
      })
      .filter(
        (g): g is { moduleId: string; cleanId: string; module: JLModule | null; cuts: Cut[] } =>
          g !== null
      );
  }, [approvedCuts, modules, cutSearch]);

  const totalMatchingCuts = useMemo(
    () => groupedModuleCuts.reduce((acc, g) => acc + g.cuts.length, 0),
    [groupedModuleCuts]
  );

  return (
    <aside className="relative flex flex-col rounded-3xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="border-b border-white/10 pb-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl border transition-colors shadow-sm"
              style={{
                borderColor: activeDifficultyConfig
                  ? `${activeDifficultyConfig.color}50`
                  : 'rgba(16, 185, 129, 0.3)',
                backgroundColor: activeDifficultyConfig
                  ? `${activeDifficultyConfig.color}20`
                  : 'rgba(16, 185, 129, 0.15)',
                color: activeDifficultyConfig?.color ?? '#10b981',
                boxShadow: activeDifficultyConfig
                  ? `0 0 15px ${activeDifficultyConfig.color}30`
                  : '0 0 15px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Route className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>
                  {activeDifficultyConfig
                    ? `${activeDifficultyConfig.label} Cuts`
                    : 'Alle Cuts'}
                </span>
                <span className="font-mono text-[11px] font-normal text-zinc-400">
                  (nach Modul)
                </span>
              </h2>
            </div>
          </div>

          <span
            className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold transition-colors"
            style={{
              borderColor: activeDifficultyConfig
                ? `${activeDifficultyConfig.color}50`
                : 'rgba(16, 185, 129, 0.3)',
              backgroundColor: activeDifficultyConfig
                ? `${activeDifficultyConfig.color}18`
                : 'rgba(16, 185, 129, 0.15)',
              color: activeDifficultyConfig?.color ?? '#6ee7b7',
            }}
          >
            <Sparkles className="h-3 w-3" />
            {approvedCuts.length} Cuts
          </span>
        </div>

        {/* Quick Search inside Cuts */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={cutSearch}
            onChange={(e) => setCutSearch(e.target.value)}
            placeholder="Cuts filtern (z.B. E11, Fence)..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-1.5 pl-8 pr-7 text-xs text-zinc-100 placeholder-zinc-500 transition focus:border-cyan-400/60 focus:outline-none"
          />
          {cutSearch && (
            <button
              type="button"
              onClick={() => setCutSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Module-Cuts List */}
      <div className="mt-3.5 space-y-4 overflow-y-auto pr-1.5 max-h-[calc(100vh-220px)]">
        {isLoading ? (
          <div className="space-y-4 py-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-24 rounded bg-zinc-800/60" />
                <div className="h-8 w-full rounded-lg bg-zinc-900/60" />
                <div className="h-8 w-full rounded-lg bg-zinc-900/40" />
              </div>
            ))}
          </div>
        ) : groupedModuleCuts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-400">
            {cutSearch ? (
              <>
                Keine Cuts für <span className="text-white font-mono font-bold">"{cutSearch}"</span> gefunden.
                <button
                  type="button"
                  onClick={() => setCutSearch('')}
                  className="mt-2 block w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-300 hover:text-white"
                >
                  Suche zurücksetzen
                </button>
              </>
            ) : activeDifficultyConfig ? (
              `Bisher wurden noch keine verifizierten Cuts für ${activeDifficultyConfig.label}-Module eingereicht.`
            ) : (
              'Bisher wurden noch keine verifizierten Cuts für die Module eingereicht.'
            )}
          </div>
        ) : (
          groupedModuleCuts.map((group) => {
            const diffCfg = group.module
              ? getModuleDifficultyConfig(group.module.difficulty)
              : {
                  label: 'Modul',
                  color: '#38bdf8',
                  glowColor: '#38bdf840',
                };

            const cleanModuleName = group.module?.name
              ? group.module.name.replace(/^[A-Z0-9]+\s*-\s*/i, '')
              : null;

            return (
              <div
                key={group.moduleId}
                className="space-y-1.5 rounded-2xl border border-white/5 bg-zinc-900/35 p-2.5 transition hover:border-white/15"
              >
                {/* Module Heading */}
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <Link
                    href={`/modules/${encodeURIComponent(group.cleanId)}`}
                    onClick={() => onSelectModule?.(group.moduleId)}
                    className="group/mod flex items-center gap-1.5 min-w-0"
                    title={`Zu Modul ${group.cleanId} springen`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: diffCfg.color,
                        boxShadow: `0 0 8px ${diffCfg.color}`,
                      }}
                    />
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-white group-hover/mod:text-cyan-300 transition">
                      {group.cleanId}
                    </span>
                    {cleanModuleName && (
                      <span className="truncate text-xs text-zinc-400 group-hover/mod:text-zinc-200 transition">
                        · {cleanModuleName}
                      </span>
                    )}
                  </Link>

                  <span className="font-mono text-[10px] font-bold text-zinc-500">
                    {group.cuts.length}{' '}
                    {group.cuts.length === 1 ? 'Cut' : 'Cuts'}
                  </span>
                </div>

                {/* Cuts List under this Module */}
                <div className="space-y-1 pt-0.5">
                  {group.cuts.map((cut) => {
                    const cutDiff = CUT_DIFFICULTY_CONFIG[cut.difficulty];

                    return (
                      <Link
                        key={cut.id}
                        href={`/modules/${encodeURIComponent(
                          group.cleanId
                        )}?cutId=${encodeURIComponent(cut.id)}`}
                        onClick={() => {
                          onSelectModule?.(group.moduleId);
                          onSelectCut?.(cut.id);
                        }}
                        className="group flex items-center justify-between rounded-xl border border-white/5 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white transition shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Prefix Dash / Bullet */}
                          <span className="font-mono text-zinc-500 text-xs select-none">
                            –
                          </span>
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: cutDiff.color }}
                            title={cutDiff.label}
                          />
                          <span className="truncate font-medium text-zinc-200 group-hover:text-white">
                            {cut.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {cut.videoUrl && (
                            <span title="POV Video-Lineup vorhanden">
                              <Video className="h-3 w-3 text-cyan-400/80" />
                            </span>
                          )}

                          {cut.timeSavedSeconds > 0 && (
                            <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25">
                              <Timer className="h-2.5 w-2.5" />-
                              {cut.timeSavedSeconds.toFixed(1)}s
                            </span>
                          )}

                          <ArrowUpRight className="h-3 w-3 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary Bar */}
      <div className="mt-3.5 border-t border-white/10 pt-2.5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
        <span>
          {groupedModuleCuts.length}{' '}
          {groupedModuleCuts.length === 1 ? 'Modul' : 'Module'} mit Cuts
          {activeDifficultyConfig ? ` (${activeDifficultyConfig.label})` : ''}
        </span>
        <span className="text-zinc-400">Klick = Direkt zum Cut</span>
      </div>
    </aside>
  );
};
