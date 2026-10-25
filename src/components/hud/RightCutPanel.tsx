'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowUpDown,
  Timer,
  Flame,
  Star,
  Video,
  Focus,
  X,
  Crosshair,
  Sparkles,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useJLStore, doesCutMatchFilters } from '@/store/useJLStore';
import {
  CUT_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';
import { CutDifficulty } from '@/types/jumpleague';
import { parseYouTubeEmbedUrl } from '@/lib/security';

type SortCriterion = 'TIME_SAVED' | 'DIFFICULTY';

const DIFFICULTY_ORDER: Record<CutDifficulty, number> = {
  SAFE: 1,
  MEDIUM: 2,
  HEAVY: 3,
  PIXEL_PERFECT: 4,
};

const CONSISTENCY_LABELS: Record<number, string> = {
  5: 'Sehr konstant (Safe im Run)',
  4: 'Hohe Konstanz',
  3: 'Solide mit Lineup-Übung',
  2: 'Riskant / Enges Timing',
  1: 'Extrem (1-Tick / Pixel-Perfect)',
};

export const RightCutPanel: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortCriterion>('TIME_SAVED');

  const cuts = useJLStore((s) => s.cuts);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const hoveredCutId = useJLStore((s) => s.hoveredCutId);
  const filters = useJLStore((s) => s.filters);

  const selectCut = useJLStore((s) => s.selectCut);
  const setHoveredCut = useJLStore((s) => s.setHoveredCut);

  // Filter APPROVED cuts for the active module according to FilterState and sort them
  const moduleCuts = useMemo(() => {
    const filtered = cuts.filter((cut) => {
      if (cut.moduleId !== selectedModuleId) return false;
      if (cut.status !== 'APPROVED') return false;
      return doesCutMatchFilters(cut, filters);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'TIME_SAVED') {
        return b.timeSavedSeconds - a.timeSavedSeconds;
      }
      const diffDelta =
        DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
      if (diffDelta !== 0) return diffDelta;
      return b.timeSavedSeconds - a.timeSavedSeconds;
    });
  }, [cuts, selectedModuleId, filters, sortBy]);

  const selectedCut = useMemo(
    () => cuts.find((c) => c.id === selectedCutId) ?? null,
    [cuts, selectedCutId]
  );

  const currentIndex = useMemo(() => {
    if (!selectedCut) return -1;
    return moduleCuts.findIndex((c) => c.id === selectedCut.id);
  }, [moduleCuts, selectedCut]);

  const prevCut = currentIndex > 0 ? moduleCuts[currentIndex - 1] : null;
  const nextCut =
    currentIndex >= 0 && currentIndex < moduleCuts.length - 1
      ? moduleCuts[currentIndex + 1]
      : null;

  // Escape key deselects cut
  useEffect(() => {
    if (!selectedCut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectCut(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCut, selectCut]);

  const handleRefocusCamera = () => {
    if (!selectedCut) return;
    const id = selectedCut.id;
    selectCut(null);
    setTimeout(() => selectCut(id), 15);
  };

  // =========================================================================
  // VIEW MODE A: SINGLE SELECTED CUT (Available Cuts HUD is hidden)
  // =========================================================================
  if (selectedCut) {
    const diffCfg = CUT_DIFFICULTY_CONFIG[selectedCut.difficulty];

    return (
      <aside className="pointer-events-auto flex min-h-0 flex-1 w-full flex-col bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
        {/* Navigation & Actions Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/60 p-3 sm:px-4 sm:py-3 gap-2">
          <button
            type="button"
            onClick={() => selectCut(null)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-white/15 hover:text-white transition"
            title="Zurück zur Liste aller Cuts"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Zurück</span>
          </button>

          {moduleCuts.length > 1 && currentIndex >= 0 && (
            <div className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
              <button
                type="button"
                disabled={!prevCut}
                onClick={() => prevCut && selectCut(prevCut.id)}
                className="rounded p-1 hover:bg-white/10 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Vorheriger Cut"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                {currentIndex + 1} / {moduleCuts.length}
              </span>
              <button
                type="button"
                disabled={!nextCut}
                onClick={() => nextCut && selectCut(nextCut.id)}
                className="rounded p-1 hover:bg-white/10 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Nächster Cut"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefocusCamera}
              title="3D-Kamera erneut auf Cut-Lineup ausrichten"
              className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition"
            >
              <Focus className="h-3 w-3" />
              <span>Fokus</span>
            </button>

            <button
              type="button"
              onClick={() => selectCut(null)}
              title="Cut schließen"
              className="rounded-lg border border-white/10 bg-zinc-900/80 p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Cut Details */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Title & Badges */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: diffCfg.color,
                    boxShadow: `0 0 10px ${diffCfg.color}`,
                  }}
                />
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: diffCfg.color }}
                >
                  {diffCfg.label}
                </span>
              </div>

              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300">
                <Timer className="h-3.5 w-3.5" />
                -{selectedCut.timeSavedSeconds.toFixed(1)}s ERSPARNIS
              </span>
            </div>

            <h2 className="mt-1.5 text-base sm:text-lg font-bold text-white tracking-tight">
              {selectedCut.name}
            </h2>
          </div>

          {/* Picture-in-Picture Video Player Card */}
          <div className="overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/90 px-3 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                <Video className="h-3.5 w-3.5" />
                POV LINEUP-CLIP
              </span>
              <span className="font-mono text-[11px] font-extrabold text-emerald-400">
                -{selectedCut.timeSavedSeconds.toFixed(1)}s SAVED
              </span>
            </div>

            <div className="relative aspect-video w-full bg-zinc-950">
              {selectedCut.videoUrl ? (
                (() => {
                  const ytEmbed = parseYouTubeEmbedUrl(selectedCut.videoUrl);
                  if (ytEmbed) {
                    return (
                      <iframe
                        key={selectedCut.id}
                        src={ytEmbed}
                        title={selectedCut.name}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return (
                    <video
                      key={selectedCut.videoUrl}
                      src={selectedCut.videoUrl}
                      autoPlay
                      loop
                      muted
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  );
                })()
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-4 text-center">
                  <Video className="h-6 w-6 text-zinc-600" />
                  <span className="text-xs text-zinc-500">Kein Video-Beweis hinterlegt</span>
                </div>
              )}

              {/* Tactical Block Coordinate Overlay inside PiP Frame */}
              <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-zinc-950/85 border border-white/15 px-2 py-0.5 font-mono text-[10px] text-zinc-200 backdrop-blur-md">
                <Crosshair className="h-3 w-3 text-cyan-400" />
                <span>
                  ({selectedCut.startBlock.x}, {selectedCut.startBlock.y},{' '}
                  {selectedCut.startBlock.z}) → ({selectedCut.endBlock.x},{' '}
                  {selectedCut.endBlock.y}, {selectedCut.endBlock.z})
                </span>
              </div>
            </div>
          </div>

          {/* Consistency Star Rating Card (1-5 Stars) */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Run-Konsistenz
              </div>
              <div className="text-xs font-medium text-zinc-200 mt-0.5">
                {CONSISTENCY_LABELS[selectedCut.consistencyRating] ??
                  'Standard-Konsistenz'}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= selectedCut.consistencyRating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                        : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold text-amber-300">
                {selectedCut.consistencyRating} / 5 STERNE
              </span>
            </div>
          </div>

          {/* Movement-Technique Badges */}
          {selectedCut.techniques && selectedCut.techniques.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Movement-Techniken
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCut.techniques.map((tech) => (
                  <div
                    key={tech}
                    title={MOVEMENT_TECH_CONFIG[tech]?.description}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-300 shadow-sm"
                  >
                    <span>{tech}</span>
                    {MOVEMENT_TECH_CONFIG[tech]?.label && (
                      <span className="text-[10px] font-normal text-cyan-100/80">
                        ({MOVEMENT_TECH_CONFIG[tech].label})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Lineup Description */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/55 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                Schritt-für-Schritt Lineup
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                <User className="h-3 w-3" />
                {selectedCut.submittedBy || 'Anonym'}
              </span>
            </div>

            <div className="space-y-1.5">
              {selectedCut.description ? (
                selectedCut.description
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-white/5 bg-zinc-950/65 px-2.5 py-2 text-xs leading-relaxed text-zinc-200"
                    >
                      {step}
                    </div>
                  ))
              ) : (
                <div className="rounded-lg border border-white/5 bg-zinc-950/40 px-2.5 py-2 text-xs italic text-zinc-500">
                  Keine schriftliche Lineup-Erklärung hinterlegt.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // VIEW MODE B: ALL AVAILABLE CUTS LIST
  // =========================================================================
  return (
    <aside className="pointer-events-auto flex min-h-0 flex-1 w-full flex-col bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
      {/* Header with Title and Sort Controls */}
      <div className="border-b border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Verfügbare Abkürzungen ({moduleCuts.length})
          </h2>

          {/* Sort Switcher: Zeitersparnis vs. Schwierigkeit */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/80 p-1">
            <button
              type="button"
              onClick={() => setSortBy('TIME_SAVED')}
              title="Nach Zeitersparnis sortieren"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] font-bold transition ${
                sortBy === 'TIME_SAVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Timer className="h-3 w-3" />
              <span>Zeit</span>
            </button>

            <button
              type="button"
              onClick={() => setSortBy('DIFFICULTY')}
              title="Nach Schwierigkeit sortieren"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] font-bold transition ${
                sortBy === 'DIFFICULTY'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>Risiko</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Cut Cards List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-4 pr-3 max-h-[calc(100vh-230px)]">
        {moduleCuts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-400">
            Keine Cuts für die aktuellen Filter in Modul{' '}
            <span className="font-mono text-white">{selectedModuleId}</span>{' '}
            gefunden.
          </div>
        ) : (
          moduleCuts.map((cut) => {
            const isHovered = cut.id === hoveredCutId;
            const diffCfg = CUT_DIFFICULTY_CONFIG[cut.difficulty];

            return (
              <button
                key={cut.id}
                type="button"
                onClick={() => selectCut(cut.id)}
                onMouseEnter={() => setHoveredCut(cut.id)}
                onMouseLeave={() => setHoveredCut(null)}
                className={`group w-full rounded-xl border p-2.5 text-left transition-all duration-200 ${
                  isHovered
                    ? 'bg-white/10 border-white/25 scale-[1.01]'
                    : 'bg-zinc-900/55 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
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

                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                    <Timer className="h-3 w-3" />-
                    {cut.timeSavedSeconds.toFixed(1)}s
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <h3 className="truncate text-xs font-bold text-zinc-100 group-hover:text-white">
                    {cut.name}
                  </h3>

                  <div
                    className="flex shrink-0 items-center gap-0.5"
                    title={`Konstanz: ${cut.consistencyRating}/5 Sterne`}
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-2.5 w-2.5 ${
                          s <= cut.consistencyRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-white/10 bg-zinc-900/40 px-4 py-2.5 font-mono text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400" />
          Klicke einen Cut oder 3D-Bogen zum Auswählen
        </span>
      </div>
    </aside>
  );
};
