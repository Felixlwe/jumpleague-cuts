'use client';

import React, { useMemo, useState, useRef, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Layers,
  Route,
  Search,
  ArrowUpRight,
  Zap,
  Compass,
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
import {
  MODULE_DIFFICULTY_CONFIG,
  getModuleDifficultyConfig,
} from '@/constants/jumpleagueConfig';
import {
  sortModulesNumerically,
} from '@/lib/moduleUtils';
import { JLModule, ModuleDifficulty, VoxelBlock } from '@/types/jumpleague';
import { parseSchematicFile } from '@/lib/schematicParser';
import { AdminAuthModal } from '@/components/hud/AdminAuthModal';
import { CreateModuleModal } from '@/components/hud/CreateModuleModal';

type TabCategory = 'ALL' | ModuleDifficulty;

interface TabItem {
  id: TabCategory;
  label: string;
  accentColor: string;
}

const TABS: TabItem[] = [
  { id: 'ALL', label: 'Alle', accentColor: '#38bdf8' },
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

/**
 * 2D Canvas Isometric Silhouette Fallback:
 * Draws an isometric projection from block coordinates or a subtle glowing grid if thumbnail is not yet generated.
 */
const ModuleThumbnailFallback: React.FC<{
  blocks?: VoxelBlock[];
  difficulty: ModuleDifficulty;
}> = ({ blocks, difficulty }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle dark grid background
    ctx.fillStyle = '#141722';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ffffff08';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const themeColor =
      difficulty === 'EASY'
        ? '#10b981'
        : difficulty === 'MEDIUM'
          ? '#06b6d4'
          : difficulty === 'HARD'
            ? '#f97316'
            : '#a855f7';

    if (blocks && blocks.length > 0) {
      let minX = Infinity,
        maxX = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;

      for (const b of blocks) {
        if (b.position.x < minX) minX = b.position.x;
        if (b.position.x > maxX) maxX = b.position.x;
        if (b.position.z < minZ) minZ = b.position.z;
        if (b.position.z > maxZ) maxZ = b.position.z;
      }

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const span = Math.max(maxX - minX, maxZ - minZ, 10);
      const scale = Math.min(w, h) / (span * 1.5);

      const originX = w / 2;
      const originY = h * 0.72;

      ctx.fillStyle = themeColor;

      const sorted = [...blocks].sort((a, b) => {
        const depthA = a.position.x + a.position.z + a.position.y * 0.5;
        const depthB = b.position.x + b.position.z + b.position.y * 0.5;
        return depthA - depthB;
      });

      for (const b of sorted) {
        const rx = b.position.x - centerX;
        const rz = b.position.z - centerZ;
        const ry = b.position.y;

        const ix = originX + (rx - rz) * (scale * 0.65);
        const iy = originY + (rx + rz) * (scale * 0.32) - ry * (scale * 0.55);

        ctx.globalAlpha = 0.55;
        ctx.fillRect(ix - 2, iy - 2, 4, 4);
      }
      ctx.globalAlpha = 1.0;
    } else {
      // Atmospheric isometric cube outline
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = `${themeColor}33`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 24, cy - 16, 48, 32);
    }
  }, [blocks, difficulty]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={110}
      className="absolute inset-0 h-full w-full object-cover opacity-35 transition-opacity duration-300 group-hover:opacity-55 pointer-events-none"
    />
  );
};

/**
 * Polished Skeleton Card displayed during initial Supabase load
 */
const SkeletonModuleCard: React.FC = () => (
  <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/5 bg-zinc-950/40 p-3.5 shadow-lg animate-pulse min-h-[140px]">
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-7 w-9 rounded-lg bg-zinc-800/80" />
          <div className="h-5 w-14 rounded-md bg-zinc-800/60" />
          <div className="h-4 w-24 rounded bg-zinc-800/50" />
        </div>
      </div>
      <div className="mt-4 h-12 w-full rounded-lg bg-zinc-900/60" />
    </div>
    <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-3">
      <div className="h-6 w-16 rounded-md bg-zinc-800/70" />
      <div className="h-4 w-12 rounded bg-zinc-800/50" />
    </div>
  </div>
);

export default function ModuleHubPage() {
  const isMounted = useIsMounted();

  const modules = useJLStore((s) => s.modules);
  const cuts = useJLStore((s) => s.cuts);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const filters = useJLStore((s) => s.filters);
  const isLoading = useJLStore((s) => s.isLoading);
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
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
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

  // On the homepage, no module should be active or loaded
  useEffect(() => {
    selectModule('');
  }, [selectModule]);

  const activeTab: TabCategory =
    filters.moduleDifficulty &&
    (filters.moduleDifficulty === 'ALL' ||
      filters.moduleDifficulty === 'EASY' ||
      filters.moduleDifficulty === 'MEDIUM' ||
      filters.moduleDifficulty === 'HARD' ||
      filters.moduleDifficulty === 'ULTRA')
      ? (filters.moduleDifficulty as TabCategory)
      : 'ALL';

  // Count modules per difficulty category
  const tabCounts = useMemo(() => {
    const counts: Record<TabCategory, number> = {
      ALL: modules.length,
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

  // Filter modules strictly by active tab and optional search query, then sort numerically
  const visibleModules = useMemo(() => {
    const byTab =
      activeTab === 'ALL'
        ? modules
        : modules.filter((m) => m.difficulty === activeTab);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ungültige Schematic-Datei';
      console.error('Failed to replace schematic:', err);
      setToast({
        type: 'error',
        message: `Fehler beim Ersetzen: ${msg}`,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Konnte Modul nicht entfernen';
      console.error('Failed to delete module:', err);
      setToast({
        type: 'error',
        message: `Fehler beim Löschen: ${msg}`,
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setIsDeleting(false);
      setModuleToDelete(null);
    }
  };

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
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        {isMounted && (isAdminAuthenticated ? (
          <>
            {/* 1. 'Admin-Modus an' / 'ADMIN-MODUS AKTIV' Button */}
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

            {/* 2. Ausloggen-Button */}
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
        ))}
      </div>

      {/* Hidden File Input for .schem / .litematic replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".schem,.schematic,.litematic"
        onChange={handleReplaceFile}
        className="hidden"
      />

      {/* Main Content Container */}
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

        {/* Control Bar: Horizontal Difficulty Tabs (Alle / Easy / Medium / Hard / Ultra) + Search */}
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

            <div className="font-mono text-xs text-zinc-400">
              <span className="font-bold text-white">
                {visibleModules.length}
              </span>{' '}
              von <span className="font-bold text-white">{modules.length}</span> Modulen
            </div>
          </div>
        </section>

        {/* Modul-Grid: Skeletons while loading; Numerisch sortierte Kacheln with Background Thumbnails */}
        {isLoading ? (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, idx) => (
              <SkeletonModuleCard key={`skel-${idx}`} />
            ))}
          </section>
        ) : visibleModules.length === 0 && !isAdminMode ? (
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
                updateFilters({ moduleDifficulty: 'ALL' });
              }}
              className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <section
            onMouseLeave={() => setHoveredModuleId(null)}
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 py-2"
          >
            {/* ADMIN ONLY: First Card in Grid to Add a New Module */}
            {isAdminMode && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                onMouseEnter={() => setHoveredModuleId('__ADD_MODULE__')}
                onMouseLeave={() => setHoveredModuleId(null)}
                onPointerEnter={() => setHoveredModuleId('__ADD_MODULE__')}
                onPointerLeave={() => setHoveredModuleId(null)}
                className="group relative flex min-h-[140px] flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-purple-500/50 bg-purple-500/10 p-4 text-center cursor-pointer select-none"
                style={{
                  transform:
                    hoveredModuleId === '__ADD_MODULE__'
                      ? 'translateY(-10px) scale(1.035)'
                      : hoveredModuleId !== null
                        ? 'scale(0.975)'
                        : 'translateY(0) scale(1)',
                  borderColor:
                    hoveredModuleId === '__ADD_MODULE__'
                      ? '#c084fc'
                      : 'rgba(168, 85, 247, 0.5)',
                  backgroundColor:
                    hoveredModuleId === '__ADD_MODULE__'
                      ? 'rgba(168, 85, 247, 0.25)'
                      : 'rgba(168, 85, 247, 0.1)',
                  boxShadow:
                    hoveredModuleId === '__ADD_MODULE__'
                      ? '0 24px 48px -8px rgba(0, 0, 0, 0.95), 0 0 32px rgba(168, 85, 247, 0.7)'
                      : 'none',
                  zIndex: hoveredModuleId === '__ADD_MODULE__' ? 40 : 1,
                  opacity:
                    hoveredModuleId !== null &&
                    hoveredModuleId !== '__ADD_MODULE__'
                      ? 0.45
                      : 1,
                  transition:
                    'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease, opacity 0.22s ease, background-color 0.22s ease',
                }}
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
              const diffCfg = getModuleDifficultyConfig(mod.difficulty);
              const isHovered = hoveredModuleId === mod.id;
              const isOtherHovered =
                hoveredModuleId !== null && !isHovered;

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
              const cleanHrefId = mod.id.replace(/^#+/, '');

              return (
                <Link
                  key={mod.id}
                  href={`/modules/${encodeURIComponent(cleanHrefId)}`}
                  onClick={() => selectModule(mod.id)}
                  onMouseEnter={() => setHoveredModuleId(mod.id)}
                  onMouseLeave={() => setHoveredModuleId(null)}
                  onPointerEnter={() => setHoveredModuleId(mod.id)}
                  onPointerLeave={() => setHoveredModuleId(null)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 text-left backdrop-blur-xl min-h-[140px] cursor-pointer select-none"
                  style={{
                    transform: isHovered
                      ? 'translateY(-10px) scale(1.035)'
                      : isOtherHovered
                        ? 'scale(0.975)'
                        : 'translateY(0) scale(1)',
                    borderColor: isHovered
                      ? diffCfg.color
                      : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: isHovered
                      ? `0 24px 48px -8px rgba(0, 0, 0, 0.95), 0 0 32px ${diffCfg.color}99, inset 0 0 16px ${diffCfg.color}20`
                      : '0 8px 24px -6px rgba(0, 0, 0, 0.5)',
                    zIndex: isHovered ? 40 : 1,
                    opacity: isOtherHovered ? 0.45 : 1,
                    backgroundColor: isHovered
                      ? '#181c28'
                      : 'rgba(12, 14, 23, 0.82)',
                    transition:
                      'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease, opacity 0.22s ease, background-color 0.22s ease',
                  }}
                >
                  {/* Background Thumbnail Image or 2D Isometric Silhouette Fallback */}
                  {mod.thumbnailUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-500 ease-out"
                      style={{
                        backgroundImage: `url(${mod.thumbnailUrl})`,
                        transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                        opacity: isHovered ? 0.95 : 0.6,
                      }}
                    />
                  ) : (
                    <ModuleThumbnailFallback
                      blocks={mod.blocks}
                      difficulty={mod.difficulty}
                    />
                  )}

                  {/* Dark subtle gradient overlay ensuring text readability */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-transparent pointer-events-none transition-colors duration-300"
                    style={{
                      opacity: isHovered ? 0.85 : 0.95,
                    }}
                  />

                  {/* Subtle Radial Ambient Spotlight on Hover */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
                    style={{
                      opacity: isHovered ? 1 : 0,
                      background: `radial-gradient(circle at top left, ${diffCfg.color}33, transparent 75%)`,
                    }}
                  />

                  {/* Top Accent Glow Bar */}
                  <div
                    className="absolute inset-x-0 top-0 transition-all duration-300 z-10"
                    style={{
                      height: isHovered ? '6px' : '4px',
                      backgroundColor: diffCfg.color,
                      opacity: isHovered ? 1 : 0.5,
                      boxShadow: isHovered
                        ? `0 0 18px ${diffCfg.color}`
                        : 'none',
                    }}
                  />

                  <div className="relative z-10">
                    {/* Top Row: Modul-Nummer/ID Badge + Difficulty Pill + Modul-Name + Admin Icons */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-black text-white shadow-sm transition-all duration-300"
                          style={{
                            borderColor: isHovered
                              ? `${diffCfg.color}cc`
                              : `${diffCfg.color}66`,
                            backgroundColor: isHovered
                              ? `${diffCfg.color}40`
                              : `${diffCfg.color}1c`,
                            transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                            boxShadow: isHovered
                              ? `0 0 14px ${diffCfg.color}80`
                              : 'none',
                          }}
                        >
                          {mod.id}
                        </span>

                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase transition-transform duration-300 ${diffCfg.badgeClass}`}
                          style={{
                            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                          }}
                        >
                          {diffCfg.label}
                        </span>

                        <h2
                          className="truncate text-xs font-bold tracking-tight transition-colors duration-200"
                          style={{
                            color: isHovered ? '#ffffff' : '#e4e4e7',
                            textShadow: isHovered
                              ? `0 0 10px ${diffCfg.color}80`
                              : 'none',
                          }}
                          title={cleanName}
                        >
                          {cleanName}
                        </h2>
                      </div>

                      {/* Top Right: Admin Action Icons */}
                      {isAdminMode && (
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
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 hover:text-white transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
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
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/30 hover:border-rose-400 hover:text-white transition shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Cut-Anzahl + Max-Zeitersparnis & Arrow */}
                  <div className="relative z-10 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5 font-mono text-xs mt-3">
                    <div
                      className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all duration-200"
                      style={{
                        borderColor: isHovered
                          ? 'rgba(6, 182, 212, 0.7)'
                          : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isHovered
                          ? 'rgba(6, 182, 212, 0.2)'
                          : 'rgba(24, 24, 27, 0.9)',
                        color: isHovered ? '#a5f3fc' : '#d4d4d8',
                        boxShadow: isHovered
                          ? '0 0 12px rgba(6, 182, 212, 0.35)'
                          : 'none',
                      }}
                    >
                      <Route className="h-3 w-3 text-cyan-400" />
                      <span>
                        {cutCount} {cutCount === 1 ? 'Cut' : 'Cuts'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {maxTimeSaved > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-400 transition-transform duration-200"
                          style={{
                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                          }}
                        >
                          <Zap className="h-3 w-3" />
                          <span>-{maxTimeSaved.toFixed(1)}s</span>
                        </span>
                      )}
                      <ArrowUpRight
                        className="h-3.5 w-3.5 transition-all duration-200"
                        style={{
                          transform: isHovered
                            ? 'translate(2px, -2px) scale(1.15)'
                            : 'none',
                          color: isHovered ? '#67e8f9' : '#a1a1aa',
                        }}
                      />
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
        defaultDifficulty={activeTab === 'ALL' ? 'EASY' : activeTab}
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
