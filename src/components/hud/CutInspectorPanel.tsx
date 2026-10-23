'use client';

import React, { useMemo } from 'react';
import {
  X,
  Video,
  Star,
  Timer,
  Focus,
  CheckCircle2,
  XCircle,
  Sparkles,
  User,
  Calendar,
  MapPin,
} from 'lucide-react';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';
import {
  CUT_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes('youtube.com') ||
      parsed.hostname.includes('youtu.be')
    ) {
      if (parsed.pathname.startsWith('/embed/')) return url;
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const shortId = parsed.pathname.replace('/', '');
      if (shortId) return `https://www.youtube.com/embed/${shortId}`;
    }
  } catch {
    return null;
  }
  return null;
}

export const CutInspectorPanel: React.FC = () => {
  const cuts = useJumpLeagueStore((s) => s.cuts);
  const selectedCutId = useJumpLeagueStore((s) => s.selectedCutId);
  const activeMode = useJumpLeagueStore((s) => s.activeMode);
  const selectCut = useJumpLeagueStore((s) => s.selectCut);
  const approveCut = useJumpLeagueStore((s) => s.approveCut);
  const rejectCut = useJumpLeagueStore((s) => s.rejectCut);

  const selectedCut = useMemo(
    () => cuts.find((c) => c.id === selectedCutId) ?? null,
    [cuts, selectedCutId]
  );

  if (!selectedCut || activeMode === 'SUBMIT') {
    return null;
  }

  const diffCfg = CUT_DIFFICULTY_CONFIG[selectedCut.difficulty];
  const youtubeEmbed = getYouTubeEmbedUrl(selectedCut.videoUrl);

  const steps = selectedCut.description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const handleRefocusCamera = () => {
    // Re-trigger camera effect by briefly clearing and setting cut ID
    const id = selectedCut.id;
    selectCut(null);
    setTimeout(() => selectCut(id), 15);
  };

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-140px)] w-full max-w-md flex-col bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: diffCfg.color,
                borderColor: `${diffCfg.color}55`,
                backgroundColor: `${diffCfg.color}18`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: diffCfg.color }}
              />
              {diffCfg.label}
            </span>

            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-300">
              MODUL {selectedCut.moduleId}
            </span>

            {selectedCut.status === 'PENDING' && (
              <span className="rounded bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                PENDING REVIEW
              </span>
            )}
          </div>

          <h2 className="text-base font-bold text-white leading-snug">
            {selectedCut.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => selectCut(null)}
          className="rounded-xl border border-white/10 bg-zinc-900/70 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          title="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Embedded Explanation Video Player */}
        <div className="overflow-hidden rounded-xl border border-white/15 bg-zinc-900/90 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950/70 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
              <Video className="h-3.5 w-3.5" />
              <span>POV LINEUP &amp; EXECUTION CLIP</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 font-bold">
              -{selectedCut.timeSavedSeconds.toFixed(1)}s SAVED
            </span>
          </div>

          <div className="relative aspect-video w-full bg-black">
            {youtubeEmbed ? (
              <iframe
                src={youtubeEmbed}
                title={selectedCut.name}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                key={selectedCut.videoUrl}
                src={selectedCut.videoUrl}
                controls
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            )}

            {/* Subtle Tactical Crosshair Overlay in Corner */}
            <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-zinc-950/80 border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
              Start ({selectedCut.startBlock.x}, {selectedCut.startBlock.y},{' '}
              {selectedCut.startBlock.z}) → Ziel ({selectedCut.endBlock.x},{' '}
              {selectedCut.endBlock.y}, {selectedCut.endBlock.z})
            </div>
          </div>
        </div>

        {/* Key Telemetry Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-zinc-400">
              <Timer className="h-3.5 w-3.5 text-emerald-400" />
              <span>Zeitersparnis</span>
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-emerald-400">
              -{selectedCut.timeSavedSeconds.toFixed(1)}s
            </div>
            <div className="text-[10px] text-zinc-500">
              gegenüber Standard-Route
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-zinc-400">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              <span>Run-Konstanz</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= selectedCut.consistencyRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
              <span className="ml-1 font-mono text-xs font-bold text-zinc-200">
                {selectedCut.consistencyRating}/5
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">
              Reproduzierbarkeit im Match
            </div>
          </div>
        </div>

        {/* Camera Focus Action Button */}
        <button
          type="button"
          onClick={handleRefocusCamera}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/25 hover:text-white"
        >
          <Focus className="h-4 w-4" />
          <span>3D-Kamera auf gespeichertes Lineup gleiten lassen</span>
        </button>

        {/* Step-by-Step Lineup Explanation */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-200">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Schritt-für-Schritt Lineup-Anleitung</span>
          </div>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-zinc-950/60 border border-white/5 p-2.5 text-xs leading-relaxed text-zinc-200"
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Movement Techniques Breakdown */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            Benötigte Movement-Techniken
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {selectedCut.techniques.map((tech) => (
              <div
                key={tech}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/45 px-3 py-2"
              >
                <span className="font-mono text-xs font-bold text-cyan-300">
                  {MOVEMENT_TECH_CONFIG[tech].label}
                </span>
                <span className="text-[11px] text-zinc-400 text-right max-w-[220px]">
                  {MOVEMENT_TECH_CONFIG[tech].description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Block Vector Telemetry */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3 font-mono text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-400" />
              Absprung-Block:
            </span>
            <span className="text-zinc-200">
              X:{selectedCut.startBlock.x} Y:{selectedCut.startBlock.y} Z:
              {selectedCut.startBlock.z}
            </span>
          </div>
          {selectedCut.midPoints && selectedCut.midPoints.length > 0 && (
            <div className="flex items-center justify-between text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-cyan-400" />
                Neo-Scheitelpunkt(e):
              </span>
              <span className="text-cyan-300">
                {selectedCut.midPoints
                  .map((p) => `(${p.x}, ${p.y}, ${p.z})`)
                  .join(' → ')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-purple-400" />
              Lande-Block:
            </span>
            <span className="text-zinc-200">
              X:{selectedCut.endBlock.x} Y:{selectedCut.endBlock.y} Z:
              {selectedCut.endBlock.z}
            </span>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-zinc-500" />
            Eingereicht von{' '}
            <strong className="text-zinc-200">{selectedCut.submittedBy}</strong>
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
            <Calendar className="h-3 w-3" />
            {new Date(selectedCut.createdAt).toLocaleDateString('de-DE')}
          </span>
        </div>

        {/* Quick Admin Actions if Cut is PENDING */}
        {selectedCut.status === 'PENDING' && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => approveCut(selectedCut.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Cut freigeben</span>
            </button>
            <button
              type="button"
              onClick={() => rejectCut(selectedCut.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition"
            >
              <XCircle className="h-4 w-4" />
              <span>Ablehnen</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
