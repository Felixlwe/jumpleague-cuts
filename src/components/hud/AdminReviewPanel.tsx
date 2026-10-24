'use client';

import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  Timer,
  User,
  Star,
  Video,
  Focus,
  X,
  Upload,
} from 'lucide-react';
import { useJLStore } from '@/store/useJLStore';
import {
  ALL_CUT_DIFFICULTIES,
  ALL_MOVEMENT_TECHS,
  CUT_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';
import { CutStatus, MovementTech } from '@/types/jumpleague';
import { parseSchematicFile } from '@/lib/schematicParser';

function parseYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.replace('/', '').trim();
    } else if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.replace('/embed/', '').split('/')[0];
      } else {
        videoId = parsed.searchParams.get('v');
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`;
    }
  } catch {
    return null;
  }
  return null;
}

export const AdminReviewPanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<CutStatus>('PENDING');

  const activeMode = useJLStore((s) => s.activeMode);
  const cuts = useJLStore((s) => s.cuts);
  const selectedCutId = useJLStore((s) => s.selectedCutId);

  const selectCut = useJLStore((s) => s.selectCut);
  const setActiveMode = useJLStore((s) => s.setActiveMode);
  const updateCut = useJLStore((s) => s.updateCut);
  const approveCut = useJLStore((s) => s.approveCut);
  const rejectCut = useJLStore((s) => s.rejectCut);
  const deleteCut = useJLStore((s) => s.deleteCut);
  const resetStoreToDefaults = useJLStore((s) => s.resetStoreToDefaults);
  const addModule = useJLStore((s) => s.addModule);
  const triggerCameraReset = useJLStore((s) => s.triggerCameraReset);

  const [isAdminUploading, setIsAdminUploading] = useState(false);
  const [adminUploadMsg, setAdminUploadMsg] = useState<string | null>(null);

  const handleAdminSchematicUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAdminUploading(true);
    setAdminUploadMsg(null);
    try {
      const parsed = await parseSchematicFile(file);
      addModule(parsed.module);
      triggerCameraReset();
      setAdminUploadMsg(`Modul "${parsed.name}" (${parsed.blockCount} Blöcke) geladen!`);
      setTimeout(() => setAdminUploadMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Schematic-Upload fehlgeschlagen: ${msg}`);
    } finally {
      setIsAdminUploading(false);
      e.target.value = '';
    }
  };

  const counts = useMemo(() => {
    return {
      PENDING: cuts.filter((c) => c.status === 'PENDING').length,
      APPROVED: cuts.filter((c) => c.status === 'APPROVED').length,
      REJECTED: cuts.filter((c) => c.status === 'REJECTED').length,
    };
  }, [cuts]);

  const displayedCuts = useMemo(() => {
    return cuts.filter((c) => c.status === statusFilter);
  }, [cuts, statusFilter]);

  const selectedCut = useMemo(
    () => cuts.find((c) => c.id === selectedCutId) ?? null,
    [cuts, selectedCutId]
  );

  if (activeMode !== 'ADMIN') {
    return null;
  }

  const handleToggleTechnique = (tech: MovementTech) => {
    if (!selectedCut) return;
    const exists = selectedCut.techniques.includes(tech);
    const nextTechs = exists
      ? selectedCut.techniques.filter((t) => t !== tech)
      : [...selectedCut.techniques, tech];
    updateCut(selectedCut.id, {
      techniques: nextTechs.length > 0 ? nextTechs : ['TIMING'],
    });
  };

  const handleApproveSelected = () => {
    if (!selectedCut) return;
    approveCut(selectedCut.id);
    // Automatically select the next pending cut if available
    const nextPending = cuts.find(
      (c) => c.status === 'PENDING' && c.id !== selectedCut.id
    );
    if (nextPending) {
      selectCut(nextPending.id);
    }
  };

  const handleRejectSelected = () => {
    if (!selectedCut) return;
    rejectCut(selectedCut.id);
    const nextPending = cuts.find(
      (c) => c.status === 'PENDING' && c.id !== selectedCut.id
    );
    if (nextPending) {
      selectCut(nextPending.id);
    }
  };

  const handleRefocusCamera = () => {
    if (!selectedCut) return;
    const id = selectedCut.id;
    selectCut(null);
    setTimeout(() => selectCut(id), 15);
  };

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-110px)] w-full max-w-md flex-col bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-purple-400">
                {`ADMIN-MODUS // MODERATION`}
              </div>
              <h2 className="text-sm font-bold text-white">
                Community-Einsendungen prüfen
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-1 text-[10px] font-semibold text-purple-300 hover:bg-purple-500/25 hover:text-white transition"
              title="Sponge (.schem), Litematica (.litematic) oder MCEdit (.schematic) hochladen"
            >
              <Upload className="h-3 w-3 text-purple-400" />
              <span>{isAdminUploading ? 'Lade...' : '.schem / .litematic'}</span>
              <input
                type="file"
                accept=".schem,.schematic,.litematic"
                onChange={handleAdminSchematicUpload}
                disabled={isAdminUploading}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={resetStoreToDefaults}
              title="Alle Demo-Daten auf Ausgangszustand zurücksetzen"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/70 px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Demo-Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('EXPLORE')}
              title="Admin-Modus schließen"
              className="rounded-lg border border-white/10 bg-zinc-900/70 p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {adminUploadMsg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            {adminUploadMsg}
          </div>
        )}

        {/* Status Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`rounded-xl border py-1.5 font-mono text-[10px] font-bold transition ${
              statusFilter === 'PENDING'
                ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            PENDING ({counts.PENDING})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`rounded-xl border py-1.5 font-mono text-[10px] font-bold transition ${
              statusFilter === 'APPROVED'
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            APPROVED ({counts.APPROVED})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`rounded-xl border py-1.5 font-mono text-[10px] font-bold transition ${
              statusFilter === 'REJECTED'
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            REJECTED ({counts.REJECTED})
          </button>
        </div>

        {/* Queue List */}
        <div
          className={`space-y-1.5 overflow-y-auto pr-1 ${
            selectedCut ? 'max-h-36' : 'max-h-72'
          }`}
        >
          {displayedCuts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-400">
              Keine Cuts mit Status{' '}
              <span className="font-mono text-white">{statusFilter}</span>{' '}
              vorhanden.
            </div>
          ) : (
            displayedCuts.map((cut) => {
              const isSelected = cut.id === selectedCutId;
              const diffCfg = CUT_DIFFICULTY_CONFIG[cut.difficulty];

              return (
                <button
                  key={cut.id}
                  type="button"
                  onClick={() => selectCut(cut.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? 'border-purple-400/60 bg-purple-500/15 shadow-lg'
                      : 'border-white/10 bg-zinc-900/60 hover:bg-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                        {cut.moduleId}
                      </span>
                      <span
                        className="font-mono text-[10px] font-bold uppercase"
                        style={{ color: diffCfg.color }}
                      >
                        {diffCfg.shortLabel}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        • von {cut.submittedBy}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs font-bold text-white">
                      {cut.name}
                    </div>
                  </div>

                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                    <Timer className="h-3 w-3" />-
                    {cut.timeSavedSeconds.toFixed(1)}s
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* ADMIN INSPECTOR & LIVE RATING / EDITING WORKSPACE                 */}
      {/* ================================================================= */}
      {selectedCut ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Video Preview Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <User className="h-3.5 w-3.5 text-purple-400" />
              <span>Eingereicht von {selectedCut.submittedBy}</span>
            </div>

            <button
              type="button"
              onClick={handleRefocusCamera}
              className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition"
            >
              <Focus className="h-3 w-3" />
              <span>3D-Kamera zentrieren</span>
            </button>
          </div>

          {/* Embedded Video Player */}
          <div className="overflow-hidden rounded-xl border border-white/15 bg-black shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/90 px-3 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-cyan-400">
                <Video className="h-3.5 w-3.5" />
                {`EINGEREICHTES BEWEIS-VIDEO // MODUL ${selectedCut.moduleId}`}
              </span>
              <span className="font-mono text-[10px] font-bold text-amber-300">
                {selectedCut.status}
              </span>
            </div>

            <div className="relative aspect-video w-full bg-zinc-950">
              {(() => {
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
              })()}
            </div>
          </div>

          {/* Admin Editable Fields: Final Difficulty */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
              Finale Schwierigkeit festlegen
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CUT_DIFFICULTIES.map((diff) => {
                const cfg = CUT_DIFFICULTY_CONFIG[diff];
                const isSelected = selectedCut.difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() =>
                      updateCut(selectedCut.id, { difficulty: diff })
                    }
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                      isSelected
                        ? `${cfg.bgClass} ${cfg.borderClass} text-white shadow-md`
                        : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: cfg.color,
                        boxShadow: isSelected
                          ? `0 0 8px ${cfg.color}`
                          : undefined,
                      }}
                    />
                    <span className="font-mono text-[11px]">
                      {cfg.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Editable: Consistency (1-5 Stars) & Time Saved */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-2.5 space-y-1">
              <label className="block font-mono text-[9px] font-bold uppercase text-purple-300">
                Konsistenz (1–5★)
              </label>
              <div className="flex items-center justify-between pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      updateCut(selectedCut.id, { consistencyRating: star })
                    }
                    className="p-0.5 hover:scale-115 transition"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        star <= selectedCut.consistencyRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-2.5 space-y-1">
              <label className="block font-mono text-[9px] font-bold uppercase text-purple-300">
                Zeitersparnis (Sek.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="15"
                value={selectedCut.timeSavedSeconds}
                onChange={(e) =>
                  updateCut(selectedCut.id, {
                    timeSavedSeconds: parseFloat(e.target.value) || 0.5,
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-zinc-950/90 px-2.5 py-1 font-mono text-xs font-extrabold text-emerald-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Admin Editable: Cut Name & Lineup Description */}
          <div className="space-y-2">
            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
                Cut-Name anpassen
              </label>
              <input
                type="text"
                value={selectedCut.name}
                onChange={(e) =>
                  updateCut(selectedCut.id, { name: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
                Lineup-Beschreibung anpassen
              </label>
              <textarea
                rows={3}
                value={selectedCut.description}
                onChange={(e) =>
                  updateCut(selectedCut.id, { description: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-2.5 text-xs text-zinc-100 focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
                Movement-Techniken
              </label>
              <div className="flex flex-wrap gap-1">
                {ALL_MOVEMENT_TECHS.map((tech) => {
                  const active = selectedCut.techniques.includes(tech);
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => handleToggleTechnique(tech)}
                      className={`rounded-lg border px-2 py-0.5 font-mono text-[10px] transition ${
                        active
                          ? 'bg-purple-500/25 border-purple-400/60 text-purple-200 font-bold'
                          : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {MOVEMENT_TECH_CONFIG[tech].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Approve / Reject / Delete Action Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleApproveSelected}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_0_18px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Freigeben (Approve)</span>
            </button>

            <button
              type="button"
              onClick={handleRejectSelected}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 py-2.5 text-xs font-extrabold uppercase tracking-wider text-rose-200 hover:bg-rose-500/35 transition"
            >
              <XCircle className="h-4 w-4" />
              <span>Ablehnen (Reject)</span>
            </button>

            <button
              type="button"
              onClick={() => deleteCut(selectedCut.id)}
              title="Eintrag endgültig löschen"
              className="rounded-xl border border-white/10 bg-zinc-900/80 p-2.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center font-mono text-xs text-zinc-400">
          Wähle oben eine Einsendung aus, um das Modul zu laden, die 3D-Kamera
          auszurichten und den Cut zu bewerten.
        </div>
      )}
    </aside>
  );
};
