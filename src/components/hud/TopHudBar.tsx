'use client';

import React, { useMemo } from 'react';
import {
  Compass,
  PlusCircle,
  ShieldCheck,
  RotateCcw,
  Boxes,
  Route,
} from 'lucide-react';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';
import { MODULE_DIFFICULTY_CONFIG } from '@/constants/jumpleagueConfig';
import { sortModulesNumerically } from '@/lib/mockModuleGenerator';
import { ModuleDifficulty } from '@/types/jumpleague';

type TabCategory = 'ALL' | ModuleDifficulty;

interface TabItem {
  id: TabCategory;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'ALL', label: 'Alle' },
  { id: 'EASY', label: 'Easy' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HARD', label: 'Hard' },
  { id: 'ULTRA', label: 'Ultra' },
];

export const TopHudBar: React.FC = () => {
  const modules = useJumpLeagueStore((s) => s.modules);
  const cuts = useJumpLeagueStore((s) => s.cuts);
  const selectedModuleId = useJumpLeagueStore((s) => s.selectedModuleId);
  const activeMode = useJumpLeagueStore((s) => s.activeMode);
  const filters = useJumpLeagueStore((s) => s.filters);

  const selectModule = useJumpLeagueStore((s) => s.selectModule);
  const setActiveMode = useJumpLeagueStore((s) => s.setActiveMode);
  const triggerCameraReset = useJumpLeagueStore((s) => s.triggerCameraReset);
  const updateFilters = useJumpLeagueStore((s) => s.updateFilters);

  const pendingCount = useMemo(
    () => cuts.filter((c) => c.status === 'PENDING').length,
    [cuts]
  );

  const activeTab: TabCategory = filters.moduleDifficulty ?? 'ALL';

  const displayedModules = useMemo(() => {
    const filtered =
      activeTab === 'ALL'
        ? modules
        : modules.filter((m) => m.difficulty === activeTab);
    return sortModulesNumerically(filtered);
  }, [modules, activeTab]);

  return (
    <header className="pointer-events-auto flex flex-col gap-2.5 bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 p-3 sm:px-4 sm:py-3">
      {/* Top Row: Brand Identity & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                JumpLeague ShortCuts
              </span>
            </div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              Tactical 3D HUD &amp; Trajectories
            </h1>
          </div>
        </div>

        {/* Tab System: Horizontale Tab-Leiste (Alle, Easy, Medium, Hard, Ultra) */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-900/80 p-1 border border-white/5">
          {TABS.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateFilters({ moduleDifficulty: tab.id })}
                className={`rounded-lg py-1 px-2.5 text-xs font-semibold transition ${
                  isTabActive
                    ? 'bg-white/15 text-white shadow-md border border-white/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Mode Switcher & Camera Overview Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerCameraReset}
            title="Kamera auf Modul-Übersicht zurücksetzen"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">Kamera-Reset</span>
          </button>

          <div className="flex items-center rounded-xl bg-zinc-900/80 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode('EXPLORE')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeMode === 'EXPLORE'
                  ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Explore</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('SUBMIT')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeMode === 'SUBMIT'
                  ? 'bg-cyan-400 text-zinc-950 shadow-[0_0_14px_rgba(6,182,212,0.45)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Cut einreichen</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('ADMIN')}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeMode === 'ADMIN'
                  ? 'bg-purple-500 text-white shadow-[0_0_14px_rgba(168,85,247,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin</span>
              {pendingCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Numerically Sorted Module Tiles (E1, E2, ... E10) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
        {displayedModules.map((mod) => {
          const isSelected = mod.id === selectedModuleId;
          const diffCfg = MODULE_DIFFICULTY_CONFIG[mod.difficulty];
          const moduleCutCount = cuts.filter(
            (c) => c.moduleId === mod.id && c.status === 'APPROVED'
          ).length;
          const cleanName = mod.name.replace(/^[A-Z0-9]+\s*-\s*/i, '');

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => selectModule(mod.id)}
              className={`group relative flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-400/80 bg-emerald-500/15 shadow-[0_0_16px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50 text-white'
                  : 'border-white/5 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200'
              }`}
            >
              {/* 1. Modul-Nummer/ID Badge */}
              <span
                className="flex h-6 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-black"
                style={{
                  color: diffCfg.color,
                  borderColor: `${diffCfg.color}66`,
                  backgroundColor: `${diffCfg.color}1c`,
                }}
              >
                {mod.id}
              </span>

              {/* 2. Modul-Name */}
              <div className="min-w-0 pr-1">
                <div className="truncate text-xs font-semibold leading-tight text-zinc-100 group-hover:text-white">
                  {cleanName}
                </div>
              </div>

              {/* 3. Cut Count mit Route Icon */}
              <div
                className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition ${
                  isSelected
                    ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400'
                }`}
              >
                <Route
                  className={`h-3 w-3 ${
                    isSelected ? 'text-emerald-300' : 'text-cyan-400'
                  }`}
                />
                <span>
                  {moduleCutCount} {moduleCutCount === 1 ? 'Cut' : 'Cuts'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </header>
  );
};
