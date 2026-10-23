'use client';

import React, { useState } from 'react';
import {
  Crosshair,
  Camera,
  Send,
  RotateCcw,
  Star,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';
import {
  ALL_CUT_DIFFICULTIES,
  ALL_MOVEMENT_TECHS,
  CUT_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';
import { CutDifficulty, MovementTech } from '@/types/jumpleague';

export const CutSubmissionPanel: React.FC = () => {
  const activeMode = useJumpLeagueStore((s) => s.activeMode);
  const selectedModuleId = useJumpLeagueStore((s) => s.selectedModuleId);
  const pickStage = useJumpLeagueStore((s) => s.pickStage);
  const draftStartBlock = useJumpLeagueStore((s) => s.draftStartBlock);
  const draftMidPoints = useJumpLeagueStore((s) => s.draftMidPoints);
  const draftEndBlock = useJumpLeagueStore((s) => s.draftEndBlock);
  const draftCameraPosition = useJumpLeagueStore((s) => s.draftCameraPosition);
  const draftCameraTarget = useJumpLeagueStore((s) => s.draftCameraTarget);
  const liveCameraPosition = useJumpLeagueStore((s) => s.liveCameraPosition);
  const liveCameraTarget = useJumpLeagueStore((s) => s.liveCameraTarget);

  const setPickStage = useJumpLeagueStore((s) => s.setPickStage);
  const removeDraftMidPoint = useJumpLeagueStore((s) => s.removeDraftMidPoint);
  const clearDraftMidPoints = useJumpLeagueStore((s) => s.clearDraftMidPoints);
  const captureCurrentCameraForDraft = useJumpLeagueStore(
    (s) => s.captureCurrentCameraForDraft
  );
  const resetDraft = useJumpLeagueStore((s) => s.resetDraft);
  const submitCut = useJumpLeagueStore((s) => s.submitCut);
  const setActiveMode = useJumpLeagueStore((s) => s.setActiveMode);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timeSavedSeconds, setTimeSavedSeconds] = useState(2.1);
  const [difficulty, setDifficulty] = useState<CutDifficulty>('MEDIUM');
  const [consistencyRating, setConsistencyRating] = useState<number>(4);
  const [techniques, setTechniques] = useState<MovementTech[]>(['STRAFE_45']);
  const [videoUrl, setVideoUrl] = useState(
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4'
  );
  const [submittedBy, setSubmittedBy] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (activeMode !== 'SUBMIT') {
    return null;
  }

  const toggleTech = (tech: MovementTech) => {
    setTechniques((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!draftStartBlock || !draftEndBlock) {
      setErrorMessage(
        'Bitte klicke zuerst im 3D-Viewport auf den Absprung-Block (Start) und den Lande-Block (Ziel).'
      );
      return;
    }

    if (!name.trim() || !description.trim() || !submittedBy.trim()) {
      setErrorMessage(
        'Bitte fülle Name, Lineup-Beschreibung und deinen Ingame-Namen aus.'
      );
      return;
    }

    const camPos = draftCameraPosition ?? liveCameraPosition;
    const camTarget = draftCameraTarget ?? liveCameraTarget;

    submitCut({
      moduleId: selectedModuleId,
      name: name.trim(),
      description: description.trim(),
      timeSavedSeconds: Number(timeSavedSeconds),
      difficulty,
      consistencyRating,
      techniques: techniques.length > 0 ? techniques : ['TIMING'],
      startBlock: draftStartBlock,
      midPoints: draftMidPoints.length > 0 ? draftMidPoints : undefined,
      endBlock: draftEndBlock,
      cameraPosition: {
        x: Number(camPos.x.toFixed(2)),
        y: Number(camPos.y.toFixed(2)),
        z: Number(camPos.z.toFixed(2)),
      },
      cameraTarget: {
        x: Number(camTarget.x.toFixed(2)),
        y: Number(camTarget.y.toFixed(2)),
        z: Number(camTarget.z.toFixed(2)),
      },
      videoUrl:
        videoUrl.trim() ||
        'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
      submittedBy: submittedBy.trim(),
    });

    setName('');
    setDescription('');
    setSubmittedSuccess(true);
  };

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-140px)] w-full max-w-md flex-col bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              INTERACTIVE 3D RAYCAST BUILDER
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white">
              MODUL {selectedModuleId}
            </span>
          </div>
          <h2 className="text-sm font-bold text-white mt-0.5">
            Neuen JumpLeague Cut einreichen
          </h2>
        </div>

        <button
          type="button"
          onClick={resetDraft}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/70 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Punkte Reset</span>
        </button>
      </div>

      {/* Form Content */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {submittedSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Cut erfolgreich als PENDING eingereicht!</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              Dein Cut wurde lokal gespeichert und kann jetzt im Admin-Panel
              geprüft und freigegeben werden.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmittedSuccess(false);
                  setActiveMode('ADMIN');
                }}
                className="rounded-lg bg-emerald-400 px-3 py-1 text-[11px] font-bold text-zinc-950 hover:bg-emerald-300"
              >
                Zum Admin-Check wechseln
              </button>
              <button
                type="button"
                onClick={() => setSubmittedSuccess(false)}
                className="rounded-lg bg-white/10 px-3 py-1 text-[11px] text-white hover:bg-white/20"
              >
                Weiteren Cut anlegen
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Step 1: 3D Block Picking Mode Selector */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-cyan-300">
              <Crosshair className="h-3.5 w-3.5" />
              1. 3D-Blöcke im Viewport anklicken
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Hover = Neon-Rahmen
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPickStage('START')}
              className={`rounded-xl border p-2 text-left transition ${
                pickStage === 'START'
                  ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-mono text-[10px] font-bold text-emerald-400">
                START-BLOCK
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-zinc-200 truncate">
                {draftStartBlock
                  ? `(${draftStartBlock.x}, ${draftStartBlock.y}, ${draftStartBlock.z})`
                  : 'Klicken...'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPickStage('MID')}
              className={`rounded-xl border p-2 text-left transition ${
                pickStage === 'MID'
                  ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-mono text-[10px] font-bold text-cyan-400">
                NEO / MID ({draftMidPoints.length})
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-zinc-200 truncate">
                {draftMidPoints.length > 0
                  ? `${draftMidPoints.length} Punkt(e)`
                  : 'Optional'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPickStage('END')}
              className={`rounded-xl border p-2 text-left transition ${
                pickStage === 'END'
                  ? 'border-purple-400 bg-purple-500/20 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-mono text-[10px] font-bold text-purple-400">
                LANDE-BLOCK
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-zinc-200 truncate">
                {draftEndBlock
                  ? `(${draftEndBlock.x}, ${draftEndBlock.y}, ${draftEndBlock.z})`
                  : 'Klicken...'}
              </div>
            </button>
          </div>

          {draftMidPoints.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-white/10">
              <div className="flex flex-wrap gap-1">
                {draftMidPoints.map((pt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => removeDraftMidPoint(i)}
                    className="flex items-center gap-1 rounded bg-cyan-500/20 border border-cyan-400/30 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200 hover:bg-rose-500/30"
                    title="Punkt entfernen"
                  >
                    <span>
                      #{i + 1} ({pt.x},{pt.y.toFixed(1)},{pt.z})
                    </span>
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={clearDraftMidPoints}
                className="text-[10px] font-mono text-zinc-400 hover:text-white"
              >
                Alle löschen
              </button>
            </div>
          )}

          {/* Camera Perspective Capture */}
          <div className="pt-1">
            <button
              type="button"
              onClick={captureCurrentCameraForDraft}
              className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-cyan-400/50 hover:text-white transition"
            >
              <span className="flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                <span>Aktuelle 3D-Kameraperspektive speichern</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400">
                {draftCameraPosition ? 'Gespeichert ✓' : 'Auto / Live'}
              </span>
            </button>
          </div>
        </div>

        {/* Step 2: Cut Name & Submitter */}
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Cut-Bezeichnung *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Zaun-Neo auf Eichenstufe"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Dein Ingame-Name *
              </label>
              <input
                type="text"
                required
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="z.B. TryJump_DE"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Zeitersparnis (Sek.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="15"
                value={timeSavedSeconds}
                onChange={(e) =>
                  setTimeSavedSeconds(parseFloat(e.target.value) || 0.5)
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-emerald-400 font-bold focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Cut Difficulty & Consistency */}
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Cut-Schwierigkeit &amp; Farbcodierung
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CUT_DIFFICULTIES.map((diff) => {
                const cfg = CUT_DIFFICULTY_CONFIG[diff];
                const active = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                      active
                        ? `${cfg.bgClass} ${cfg.borderClass} text-white`
                        : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span>{cfg.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2">
            <span className="font-mono text-[10px] uppercase text-zinc-400">
              Konstanz im Run (1–5 Sterne)
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setConsistencyRating(star)}
                  className="p-0.5 hover:scale-110 transition"
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= consistencyRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-700'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Movement Techs */}
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            Verwendete Movement-Techniken
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_MOVEMENT_TECHS.map((tech) => {
              const selected = techniques.includes(tech);
              return (
                <button
                  key={tech}
                  type="button"
                  onClick={() => toggleTech(tech)}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] transition ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                      : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {MOVEMENT_TECH_CONFIG[tech].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 5: Step-by-Step Lineup Description & Video URL */}
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Schritt-für-Schritt Lineup-Erklärung *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="1. Positioniere dich an der rechten Kante...\n2. Ziele im 45°-Winkel auf die Halbstufe...\n3. Springe im letzten Tick ab..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-2.5 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Video-URL (.mp4/.webm oder YouTube-Link)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] text-zinc-200 placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-2.5 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.45)] transition hover:bg-cyan-300"
        >
          <Send className="h-4 w-4" />
          <span>Cut zur Freigabe einreichen</span>
        </button>
      </form>
    </aside>
  );
};
