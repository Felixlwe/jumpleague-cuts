'use client';

import React, { useMemo, useState, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Layers,
  Route,
  Search,
  ArrowUpRight,
  Zap,
  Compass,
  Sparkles,
  Trash2,
  Upload,
  Plus,
  Lock,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useJLStore } from '@/store/useJLStore';
import { MODULE_DIFFICULTY_CONFIG } from '@/constants/jumpleagueConfig';
import { sortModulesNumerically } from '@/lib/mockModuleGenerator';
import { JLModule, ModuleDifficulty } from '@/types/jumpleague';
import { parseSchematicFile } from '@/lib/schematicParser';
import { AdminAuthModal } from '@/components/hud/AdminAuthModal';
import { CreateModuleModal } from '@/components/hud/CreateModuleModal';

type TabCategory = ModuleDifficulty;

interface TabItem {
  id: TabCategory;
  label: string;
  accentColor: string;
}

const TABS: TabItem[] = [
  { id: 'EASY', label: 'Easy', accentColor: '#10b981' },
  { id: 'MEDIUM', label: 'Medium', accentColor: '#06b6d4' },
  { id: 'HARD', label: 'Hard', accentColor: '#f97316' },
  { id: 'ULTRA', label: 'Ultra', accentColor: '#a855f7' },
];

const emptySubscribe = () => () => {};

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function ModuleHubPage() {
  const isMounted = useIsMounted();

  const modules = useJLStore((s) => s.modules);
  const cuts = useJLStore((s) => s.cuts);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const filters = useJLStore((s) => s.filters);
  const selectModule = useJLStore((s) => s.selectModule);
  const updateFilters = useJLStore((s) => s.updateFilters);

  // Global Admin Store
  const isAdminAuthenticated = useJLStore((s) => s.isAdminAuthenticated);
  const isAdminMode = useJLStore((s) => s.isAdminMode);
  const toggleAdminMode = useJLStore((s) => s.toggleAdminMode);
  const setAdminAuthenticated = useJLStore((s) => s.setAdminAuthenticated);
  const setAdminAuthModalOpen = useJLStore((s) => s.setAdminAuthModalOpen);
  const addModule = useJLStore((s) => s.addModule);
  const deleteModule = useJLStore((s) => s.deleteModule);
  const replaceModuleSchematic = useJLStore((s) => s.replaceModuleSchematic);

  // Local Page State
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<JLModule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moduleToReplace, setModuleToReplace] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTab: TabCategory =
    filters.moduleDifficulty && filters.moduleDifficulty !== 'ALL'
      ? filters.moduleDifficulty
      : 'EASY';

  // Count modules per difficulty category
  const tabCounts = useMemo(() => {
    const counts: Record<TabCategory, number> = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
      ULTRA: 0,
    };
    modules.forEach((m) => {
      if (counts[m.difficulty] !== undefined) {
        counts[m.difficulty]++;
      }
    });
    return counts;
  }, [modules]);

  // Filter modules strictly by active difficulty tab and optional search query, then sort numerically
  const visibleModules = useMemo(() => {
    const byTab = modules.filter((m) => m.difficulty === activeTab);

    const q = searchQuery.trim().toLowerCase();
    const bySearch = q
      ? byTab.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q)
        )
      : byTab;

    return sortModulesNumerically(bySearch);
  }, [modules, activeTab, searchQuery]);

  const totalApprovedCuts = useMemo(
    () => cuts.filter((c) => c.status === 'APPROVED').length,
    [cuts]
  );

  const handleTriggerReplace = (e: React.MouseEvent, modId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setModuleToReplace(modId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !moduleToReplace) return;

    setIsReplacing(true);
    try {
      const parsed = await parseSchematicFile(file);
      await replaceModuleSchematic(
        moduleToReplace,
        parsed.blocks,
        parsed.dimensions,
        parsed.name
      );
      setToast({
        type: 'success',
        message: `Modul "${moduleToReplace}" erfolgreich aktualisiert (${parsed.blockCount} Blöcke)!`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      console.error('Failed to replace schematic:', err);
      setToast({
        type: 'error',
        message: `Fehler beim Ersetzen: ${err.message || 'Ungültige Schematic-Datei'}`,
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setIsReplacing(false);
      setModuleToReplace(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!moduleToDelete) return;
    setIsDeleting(true);
    try {
      const modId = moduleToDelete.id;
      await deleteModule(modId);
      setToast({
        type: 'success',
        message: `Modul "${modId}" wurde gelöscht.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete module:', err);
      setToast({
        type: 'error',
        message: `Fehler beim Löschen: ${err.message || 'Konnte Modul nicht entfernen'}`,
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setIsDeleting(false);
      setModuleToDelete(null);
    }
  };

  if (!isMounted) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#11141e] font-mono text-xs text-zinc-400">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span>INITIALIZING JUMPLEAGUE SHORTCUTS HUB...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-[#11141e] text-zinc-100">
      {/* Subtle Tactical Grid & Ambient Background Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:36px_36px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-40 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px]"
      />

      {/* Floating Admin Controls in the top-right corner on the checkered background */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {isAdminAuthenticated ? (
          <>
            {/* 1. 'Admin-Modus an' / 'ADMIN-MODUS AKTIV' Button (links neben dem Ausloggen-Button) */}
            <button
              type="button"
              onClick={toggleAdminMode}
              title={
                isAdminMode
                  ? 'Admin-Modus deaktivieren'
                  : 'Admin-Modus aktivieren'
              }
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-bold shadow-xl backdrop-blur-md transition ${
                isAdminMode
                  ? 'border-purple-400/80 bg-purple-600/30 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/60'
                  : 'border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-purple-300'
              }`}
            >
              {isAdminMode ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-300" />
                  <span className="tracking-wide">ADMIN-MODUS AKTIV</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Admin-Modus an</span>
                </>
              )}
            </button>

            {/* 2. Ausloggen-Button (rechts daneben) */}
            <button
              type="button"
              onClick={() => setAdminAuthenticated(false)}
              title="Admin abmelden"
              className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-400 shadow-xl backdrop-blur-md transition hover:border-rose-500/50 hover:bg-rose-500/15 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              <span>Ausloggen</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAdminAuthModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 shadow-xl backdrop-blur-md transition hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-300"
          >
            <Lock className="h-3.5 w-3.5 text-zinc-500" />
            <span>Admin Login</span>
          </button>
        )}
      </div>

      {/* Hidden File Input for .schem / .litematic replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".schem,.schematic,.litematic"
        onChange={handleReplaceFile}
        className="hidden"
      />

      {/* Main Content Container (pt-16 places the main box directly below the floating buttons) */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        {/* Top Hero & Branding Header */}
        <header className="mb-8 flex flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-zinc-950/75 p-6 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center">
          <div className="flex items-start gap-4 sm:items-center">
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/10 p-1.5 shadow-[0_0_30px_rgba(34,211,238,0.25)] backdrop-blur-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/jumpleague-logo.png"
                alt="JumpLeague Cuts Logo"
                className="h-full w-full object-contain [image-rendering:pixelated] drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                  JumpLeague ShortCuts
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Modul Übersicht / Cuts
              </h1>
              <p className="max-w-2xl text-xs text-zinc-400 sm:text-sm">
                Wähle ein JumpLeague-Modul aus, um ein interaktives Rendering mit allen Cuts und dem dazugehörigen Erklärvideo zu sehen
              </p>
            </div>
          </div>

          {/* Global Stats Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-2.5">
              <Layers className="h-4 w-4 text-cyan-400" />
              <div>
                <div className="font-mono text-[10px] uppercase text-zinc-400">
                  Module
                </div>
                <div className="font-mono text-sm font-black text-white">
                  {modules.length} geladen
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-2.5">
              <Route className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-mono text-[10px] uppercase text-zinc-400">
                  Verifizierte Cuts
                </div>
                <div className="font-mono text-sm font-black text-emerald-400">
                  {totalApprovedCuts} Cuts
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Control Bar: Horizontal Difficulty Tabs (Easy / Medium / Hard / Ultra) + Search */}
        <section className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/75 p-3.5 shadow-xl backdrop-blur-xl md:flex-row md:items-center">
          {/* Tab-System: Horizontale Tab-Leiste */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/5 bg-zinc-900/80 p-1.5">
            {TABS.map((tab) => {
              const isTabActive = activeTab === tab.id;
              const count = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateFilters({ moduleDifficulty: tab.id })}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
                    isTabActive
                      ? 'border shadow-lg'
                      : 'border border-transparent hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                  style={
                    isTabActive
                      ? {
                          color: tab.accentColor,
                          borderColor: `${tab.accentColor}66`,
                          backgroundColor: `${tab.accentColor}18`,
                          boxShadow: `0 0 16px ${tab.accentColor}2b`,
                        }
                      : {
                          color: tab.accentColor,
                        }
                  }
                >
                  <span className="font-bold">{tab.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold transition ${
                      isTabActive
                        ? 'bg-white/15 text-white'
                        : 'bg-zinc-950/70 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Result Count */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Modul-ID oder Name suchen (z.B. E1, Void)..."
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-2 pl-10 pr-3.5 text-xs text-zinc-100 placeholder-zinc-500 transition focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="hidden font-mono text-xs text-zinc-400 sm:block">
              <span className="font-bold text-white">
                {visibleModules.length}
              </span>{' '}
              {visibleModules.length === 1 ? 'Modul' : 'Module'}
            </div>
          </div>
        </section>

        {/* Modul-Grid (Numerisch sortiert: E1, E2, ... E10) & Admin '+ Neues Modul' Card */}
        {visibleModules.length === 0 && !isAdminMode ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-950/60 p-12 text-center backdrop-blur-xl">
            <Compass className="mb-3 h-10 w-10 text-zinc-600" />
            <h2 className="text-base font-bold text-zinc-200">
              Keine passenden Module gefunden
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Versuche eine andere Schwierigkeits-Kategorie oder setze deine Suche zurück.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
              }}
              className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              Suche zurücksetzen
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* ADMIN ONLY: First Card in Grid to Add a New Module */}
            {isAdminMode && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="group relative flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-purple-500/50 bg-purple-500/10 p-4 text-center transition-all duration-200 hover:border-purple-400 hover:bg-purple-500/20 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/50 bg-purple-500/25 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-transform duration-200 group-hover:scale-110">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-purple-300">
                    + Neues Modul hinzufügen
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    .schem / .litematic für {activeTab} importieren
                  </div>
                </div>
              </button>
            )}

            {visibleModules.map((mod) => {
              const isSelected = mod.id === selectedModuleId;
              const diffCfg = MODULE_DIFFICULTY_CONFIG[mod.difficulty];

              // Approved cuts in this module
              const moduleCuts = cuts.filter(
                (c) => c.moduleId === mod.id && c.status === 'APPROVED'
              );
              const cutCount = moduleCuts.length;
              const maxTimeSaved =
                moduleCuts.length > 0
                  ? Math.max(...moduleCuts.map((c) => c.timeSavedSeconds))
                  : 0;

              // Clean display name (strip leading 'E1 - ' if present)
              const cleanName = mod.name.replace(/^[A-Z0-9]+\s*-\s*/i, '');

              return (
                <Link
                  key={mod.id}
                  href={`/modules/${mod.id}`}
                  onClick={() => selectModule(mod.id)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 text-left backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-emerald-400/80 bg-zinc-950/90 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-1 ring-emerald-400/50'
                      : 'border-white/10 bg-zinc-950/75 shadow-lg hover:border-white/20 hover:bg-zinc-900/80 hover:shadow-xl'
                  }`}
                >
                  {/* Top Accent Glow Bar */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 transition-opacity duration-300"
                    style={{
                      backgroundColor: diffCfg.color,
                      opacity: isSelected ? 1 : 0.45,
                    }}
                  />

                  <div>
                    {/* Top Row: Modul-Nummer/ID Badge + Difficulty Pill + Modul-Name + Admin Icons */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-black text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
                          style={{
                            borderColor: `${diffCfg.color}66`,
                            backgroundColor: `${diffCfg.color}1c`,
                          }}
                        >
                          {mod.id}
                        </span>

                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${diffCfg.badgeClass}`}
                        >
                          {diffCfg.label}
                        </span>

                        <h2
                          className="truncate text-xs font-bold tracking-tight text-white transition-colors group-hover:text-emerald-300"
                          title={cleanName}
                        >
                          {cleanName}
                        </h2>
                      </div>

                      {/* Top Right: Admin Action Icons or Active Badge */}
                      {isAdminMode ? (
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            title="Schematic (.schem / .litematic) ersetzen"
                            onClick={(e) => handleTriggerReplace(e, mod.id)}
                            disabled={isReplacing && moduleToReplace === mod.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 hover:text-white transition shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {isReplacing && moduleToReplace === mod.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Modul löschen"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setModuleToDelete(mod);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/30 hover:border-rose-400 hover:text-white transition shadow-sm active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        isSelected && (
                          <span className="shrink-0 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Aktiv</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Cut-Anzahl + Max-Zeitersparnis & Arrow */}
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5 font-mono text-xs mt-3">
                    <div
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                        isSelected
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-zinc-900/90 text-zinc-300 group-hover:border-cyan-400/40 group-hover:text-white'
                      }`}
                    >
                      <Route
                        className={`h-3 w-3 ${
                          isSelected ? 'text-emerald-300' : 'text-cyan-400'
                        }`}
                      />
                      <span>
                        {cutCount} {cutCount === 1 ? 'Cut' : 'Cuts'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {maxTimeSaved > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-400">
                          <Zap className="h-3 w-3" />
                          <span>-{maxTimeSaved.toFixed(1)}s</span>
                        </span>
                      )}
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {moduleToDelete && (
        <div
          onClick={() => setModuleToDelete(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/40 bg-zinc-950/95 p-6 shadow-[0_0_60px_rgba(244,63,94,0.25)] text-zinc-100"
          >
            <div className="flex items-start gap-3.5 border-b border-white/10 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.35)]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-rose-400">
                  BESTÄTIGUNG ERFORDERLICH
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Modul wirklich löschen?
                </h3>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-zinc-300">
              Möchtest du das Modul{' '}
              <strong className="text-white font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-white/10">
                [{moduleToDelete.id}] {moduleToDelete.name}
              </strong>{' '}
              unwiderruflich entfernen? Das Modul wird aus der Übersicht und Datenbank gelöscht.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-5 border-t border-white/10 mt-5">
              <button
                type="button"
                onClick={() => setModuleToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:bg-rose-500 transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Lösche...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ja, Modul löschen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[130] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
              : 'border-rose-500/50 bg-rose-950/90 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-zinc-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modals: Admin Authentication & Create Module Modal */}
      <AdminAuthModal />
      <CreateModuleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultDifficulty={activeTab}
        onSave={async (newMod) => {
          await addModule(newMod);
          setToast({
            type: 'success',
            message: `Modul "${newMod.id} - ${newMod.name}" erfolgreich angelegt!`,
          });
          setTimeout(() => setToast(null), 5000);
        }}
      />
    </main>
  );
}
