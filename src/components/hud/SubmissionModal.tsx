'use client';

import React, { useRef, useState } from 'react';
import {
  Crosshair,
  Camera,
  Plus,
  Send,
  RotateCcw,
  Star,
  CheckCircle2,
  Trash2,
  Upload,
  Link2,
  X,
} from 'lucide-react';
import { useJLStore } from '@/store/useJLStore';
import {
  ALL_CUT_DIFFICULTIES,
  ALL_MOVEMENT_TECHS,
  CUT_DIFFICULTY_CONFIG,
  MOVEMENT_TECH_CONFIG,
} from '@/constants/jumpleagueConfig';
import { CutDifficulty, MovementTech } from '@/types/jumpleague';

export const SubmissionModal: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMode = useJLStore((s) => s.activeMode);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const pickStage = useJLStore((s) => s.pickStage);
  const draftStartBlock = useJLStore((s) => s.draftStartBlock);
  const draftMidPoints = useJLStore((s) => s.draftMidPoints);
  const activeDraftMidPointIndex = useJLStore((s) => s.activeDraftMidPointIndex);
  const draftEndBlock = useJLStore((s) => s.draftEndBlock);
  const draftCameraPosition = useJLStore((s) => s.draftCameraPosition);
  const draftCameraTarget = useJLStore((s) => s.draftCameraTarget);
  const liveCameraPosition = useJLStore((s) => s.liveCameraPosition);
  const liveCameraTarget = useJLStore((s) => s.liveCameraTarget);

  const setPickStage = useJLStore((s) => s.setPickStage);
  const addInterpolatedMidPoint = useJLStore((s) => s.addInterpolatedMidPoint);
  const setActiveDraftMidPointIndex = useJLStore(
    (s) => s.setActiveDraftMidPointIndex
  );
  const updateDraftMidPoint = useJLStore((s) => s.updateDraftMidPoint);
  const removeDraftMidPoint = useJLStore((s) => s.removeDraftMidPoint);
  const captureCurrentCameraForDraft = useJLStore(
    (s) => s.captureCurrentCameraForDraft
  );
  const resetDraft = useJLStore((s) => s.resetDraft);
  const submitCut = useJLStore((s) => s.submitCut);
  const setActiveMode = useJLStore((s) => s.setActiveMode);

  const [submittedBy, setSubmittedBy] = useState('');
  const [name, setName] = useState('');
  const [timeSavedSeconds, setTimeSavedSeconds] = useState<number>(2.1);
  const [difficulty, setDifficulty] = useState<CutDifficulty>('MEDIUM');
  const [consistencyRating, setConsistencyRating] = useState<number>(4);
  const [techniques, setTechniques] = useState<MovementTech[]>(['STRAFE_45']);
  const [description, setDescription] = useState('');
  const [videoSourceType, setVideoSourceType] = useState<'URL' | 'FILE'>('URL');
  const [videoUrl, setVideoUrl] = useState(
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4'
  );
  const [localVideoName, setLocalVideoName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (activeMode !== 'SUBMIT') {
    return null;
  }

  const toggleTechnique = (tech: MovementTech) => {
    setTechniques((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setLocalVideoName(file.name);
  };

  const nudgeMidPoint = (
    idx: number,
    dx: number,
    dy: number,
    dz: number
  ) => {
    const pt = draftMidPoints[idx];
    if (!pt) return;
    updateDraftMidPoint(idx, {
      x: Number((pt.x + dx).toFixed(1)),
      y: Number((pt.y + dy).toFixed(1)),
      z: Number((pt.z + dz).toFixed(1)),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!draftStartBlock || !draftEndBlock) {
      setErrorMessage(
        'Bitte wähle im 3D-Raum zuerst den Start-Block (1. Klick) und den Ziel-Block (2. Klick) aus.'
      );
      return;
    }

    if (!submittedBy.trim() || !name.trim() || !description.trim()) {
      setErrorMessage(
        'Bitte fülle deinen Spielernamen, den Cut-Namen und die Lineup-Erklärung aus.'
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
    <aside className="pointer-events-auto flex max-h-[calc(100vh-110px)] w-full max-w-md flex-col bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              {`CUT-EDITOR // MODUL ${selectedModuleId}`}
            </span>
          </div>
          <h2 className="text-sm font-bold text-white mt-0.5">
            Community-Cut einreichen
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetDraft}
            title="Ausgewählte 3D-Punkte zurücksetzen"
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/70 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('EXPLORE')}
            title="Editor schließen"
            className="rounded-xl border border-white/10 bg-zinc-900/70 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Form Body */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {submittedSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs text-emerald-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Cut erfolgreich als PENDING eingereicht!</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              Dein Cut befindet sich jetzt in der Warteschlange und kann im
              Admin-Modus geprüft, angepasst und freigegeben werden.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmittedSuccess(false);
                  setActiveMode('ADMIN');
                }}
                className="rounded-lg bg-emerald-400 px-3 py-1.5 text-[11px] font-bold text-zinc-950 hover:bg-emerald-300 transition"
              >
                Im Admin-Panel prüfen
              </button>
              <button
                type="button"
                onClick={() => setSubmittedSuccess(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-white hover:bg-white/20 transition"
              >
                Weiteren Cut erstellen
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 1: INTERACTIVE 3D BLOCK PICKING & CAMERA CAPTURE           */}
        {/* =============================================================== */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-cyan-300">
              <Crosshair className="h-3.5 w-3.5" />
              1. 3D-Punkte im Modul klicken
            </span>
            <span className="font-mono text-[10px] text-cyan-200/70">
              Cyan-Wireframe = Hover
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* 1. Klick: Start-Block */}
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
                1. START-BLOCK
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-zinc-100 truncate">
                {draftStartBlock
                  ? `(${draftStartBlock.x}, ${draftStartBlock.y}, ${draftStartBlock.z})`
                  : 'Im 3D klicken'}
              </div>
            </button>

            {/* Optional: + Zwischenpunkt */}
            <button
              type="button"
              onClick={() => {
                if (draftStartBlock && draftEndBlock && draftMidPoints.length === 0) {
                  addInterpolatedMidPoint(1.6);
                } else {
                  setPickStage('MID');
                }
              }}
              className={`rounded-xl border p-2 text-left transition ${
                pickStage === 'MID'
                  ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-0.5 font-mono text-[10px] font-bold text-cyan-400">
                <Plus className="h-3 w-3" />
                <span>ZWISCHENPUNKT</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-zinc-100 truncate">
                {draftMidPoints.length > 0
                  ? `${draftMidPoints.length} Neo-Punkt(e)`
                  : 'Mittelklick / +'}
              </div>
            </button>

            {/* 2. Klick: Ziel-Block */}
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
                2. ZIEL-BLOCK
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-zinc-100 truncate">
                {draftEndBlock
                  ? `(${draftEndBlock.x}, ${draftEndBlock.y}, ${draftEndBlock.z})`
                  : 'Im 3D klicken'}
              </div>
            </button>
          </div>

          {/* Fine-tune or add Neo Mid-Points in Air */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-300">
                Neo-Kurvenpunkt in der Luft:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => addInterpolatedMidPoint(-1.7)}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/25 transition"
                >
                  + Links-Neo
                </button>
                <button
                  type="button"
                  onClick={() => addInterpolatedMidPoint(1.7)}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/25 transition"
                >
                  + Rechts-Neo
                </button>
                <button
                  type="button"
                  onClick={() => addInterpolatedMidPoint(0)}
                  className="rounded-lg border border-purple-400/30 bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-300 hover:bg-purple-500/25 transition"
                  title="Zwischenpunkt mittig auf der Sprungbahn setzen (perfekt für Z- & Höhen-Justierung)"
                >
                  + Mitte
                </button>
              </div>
            </div>

            {draftMidPoints.map((pt, idx) => {
              const isPtActive =
                activeDraftMidPointIndex === idx ||
                (activeDraftMidPointIndex === null && idx === 0);

              return (
                <div
                  key={idx}
                  onClick={() => setActiveDraftMidPointIndex(idx)}
                  className={`space-y-1.5 rounded-xl border p-2.5 font-mono text-[10px] transition cursor-pointer ${
                    isPtActive
                      ? 'border-cyan-400/70 bg-cyan-950/25 ring-1 ring-cyan-400/40'
                      : 'border-white/10 bg-zinc-900/90 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-cyan-300">
                        Zwischenpunkt #{idx + 1}
                      </span>
                      {isPtActive && (
                        <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-[8px] font-bold text-cyan-300 border border-cyan-400/30">
                          3D-Fokus
                        </span>
                      )}
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-zinc-300">
                        X: {pt.x.toFixed(1)} | Y: {pt.y.toFixed(1)} | Z: {pt.z.toFixed(1)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDraftMidPoint(idx);
                      }}
                      title="Zwischenpunkt löschen"
                      className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-500/40 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Löschen</span>
                    </button>
                  </div>

                {/* 3 Axes Controls: X, Y, Z */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* X-Achse */}
                  <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-zinc-950/70 p-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-rose-400">X (Breite)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pt.x}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateDraftMidPoint(idx, { ...pt, x: Number(val.toFixed(1)) });
                          }
                        }}
                        className="w-12 rounded border border-white/15 bg-black/60 px-1 py-0.5 text-right font-mono text-[10px] text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => nudgeMidPoint(idx, -0.5, 0, 0)}
                        title="Nach links (-0.5 X)"
                        className="rounded bg-white/10 py-1 text-center font-bold text-zinc-200 hover:bg-white/20 active:scale-95 transition"
                      >
                        -X
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeMidPoint(idx, 0.5, 0, 0)}
                        title="Nach rechts (+0.5 X)"
                        className="rounded bg-white/10 py-1 text-center font-bold text-zinc-200 hover:bg-white/20 active:scale-95 transition"
                      >
                        +X
                      </button>
                    </div>
                  </div>

                  {/* Y-Achse */}
                  <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-zinc-950/70 p-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-400">Y (Höhe)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pt.y}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateDraftMidPoint(idx, { ...pt, y: Number(val.toFixed(1)) });
                          }
                        }}
                        className="w-12 rounded border border-white/15 bg-black/60 px-1 py-0.5 text-right font-mono text-[10px] text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => nudgeMidPoint(idx, 0, -0.4, 0)}
                        title="Tiefer (-0.4 Y)"
                        className="rounded bg-white/10 py-1 text-center font-bold text-zinc-200 hover:bg-white/20 active:scale-95 transition"
                      >
                        -Y
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeMidPoint(idx, 0, 0.4, 0)}
                        title="Höher (+0.4 Y)"
                        className="rounded bg-white/10 py-1 text-center font-bold text-zinc-200 hover:bg-white/20 active:scale-95 transition"
                      >
                        +Y
                      </button>
                    </div>
                  </div>

                  {/* Z-Achse */}
                  <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-zinc-950/70 p-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-cyan-400">Z (Tiefe)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pt.z}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateDraftMidPoint(idx, { ...pt, z: Number(val.toFixed(1)) });
                          }
                        }}
                        className="w-12 rounded border border-white/15 bg-black/60 px-1 py-0.5 text-right font-mono text-[10px] text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => nudgeMidPoint(idx, 0, 0, -0.5)}
                        title="Zurück / Näher (-0.5 Z)"
                        className="rounded bg-white/10 py-1 text-center font-bold text-zinc-200 hover:bg-white/20 active:scale-95 transition"
                      >
                        -Z
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeMidPoint(idx, 0, 0, 0.5)}
                        title="Vor / Weiter (+0.5 Z)"
                        className="rounded bg-white/10 py-1 text-center font-bold text-zinc-200 hover:bg-white/20 active:scale-95 transition"
                      >
                        +Z
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          {/* Save Current Camera Angle Button */}
          <button
            type="button"
            onClick={captureCurrentCameraForDraft}
            className="flex w-full items-center justify-between rounded-xl border border-cyan-400/40 bg-zinc-900/90 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-cyan-500/15 hover:border-cyan-400 transition"
          >
            <span className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              <span>Aktuellen Kamerawinkel speichern</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400">
              {draftCameraPosition
                ? `(${draftCameraPosition.x.toFixed(0)}, ${draftCameraPosition.y.toFixed(0)}, ${draftCameraPosition.z.toFixed(0)}) ✓`
                : 'Übernehmen'}
            </span>
          </button>
        </div>

        {/* =============================================================== */}
        {/* STEP 2: PLAYER NAME, CUT NAME & TIME SAVED                      */}
        {/* =============================================================== */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Spielername *
              </label>
              <input
                type="text"
                required
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="z.B. VeniCraft_JL"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Zeitersparnis (Sek.) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="15"
                required
                value={timeSavedSeconds}
                onChange={(e) =>
                  setTimeSavedSeconds(parseFloat(e.target.value) || 0.5)
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-xs font-bold text-emerald-400 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Cut-Name *
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
        </div>

        {/* =============================================================== */}
        {/* STEP 3: DIFFICULTY, CONSISTENCY & MOVEMENT TECHS                */}
        {/* =============================================================== */}
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Eingeschätzte Schwierigkeit
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CUT_DIFFICULTIES.map((diff) => {
                const cfg = CUT_DIFFICULTY_CONFIG[diff];
                const isSelected = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                      isSelected
                        ? `${cfg.bgClass} ${cfg.borderClass} text-white`
                        : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="font-mono text-[11px]">
                      {cfg.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2">
            <span className="font-mono text-[10px] font-bold uppercase text-zinc-400">
              Konsistenz (1–5 Sterne)
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

          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Verwendete Techniken
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MOVEMENT_TECHS.map((tech) => {
                const isSelected = techniques.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleTechnique(tech)}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] transition ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold'
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

        {/* =============================================================== */}
        {/* STEP 4: LINEUP DESCRIPTION & VIDEO (URL OR LOCAL FILE)          */}
        {/* =============================================================== */}
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Lineup-Erklärung (Schritt für Schritt) *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="1. Stelle dich an die rechte Kante von...\n2. Ziele auf die Eichenstufe...\n3. Springe im 45°-Strafe ab..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-2.5 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          {/* Video Clip Input: URL or Local File via ObjectURL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Beweis- &amp; Erklär-Video
              </label>

              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setVideoSourceType('URL')}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] transition ${
                    videoSourceType === 'URL'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Link2 className="h-3 w-3" />
                  <span>Video-Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSourceType('FILE')}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] transition ${
                    videoSourceType === 'FILE'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Upload className="h-3 w-3" />
                  <span>Lokale Datei</span>
                </button>
              </div>
            </div>

            {videoSourceType === 'URL' ? (
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://... (.mp4, .webm oder YouTube-URL)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] text-zinc-200 placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-zinc-900/70 py-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 transition"
                >
                  <Upload className="h-4 w-4" />
                  <span>
                    {localVideoName
                      ? `Ausgewählt: ${localVideoName}`
                      : 'Lokale .mp4 / .webm Datei auswählen'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-2.5 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.45)] transition hover:bg-cyan-300"
        >
          <Send className="h-4 w-4" />
          <span>Cut als PENDING einreichen</span>
        </button>
      </form>
    </aside>
  );
};
