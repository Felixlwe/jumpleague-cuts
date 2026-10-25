'use client';

import React, { useRef, useState } from 'react';
import {
  Crosshair,
  Camera,
  Send,
  RotateCcw,
  Star,
  CheckCircle2,
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
import {
  isValidVideoUrl,
  MAX_CUT_NAME_LENGTH,
  MAX_CUT_DESCRIPTION_LENGTH,
  MAX_CUT_AUTHOR_LENGTH,
} from '@/lib/security';

export const SubmissionModal: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMode = useJLStore((s) => s.activeMode);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const pickStage = useJLStore((s) => s.pickStage);
  const draftStartBlock = useJLStore((s) => s.draftStartBlock);
  const draftEndBlock = useJLStore((s) => s.draftEndBlock);
  const draftCameraPosition = useJLStore((s) => s.draftCameraPosition);
  const draftCameraTarget = useJLStore((s) => s.draftCameraTarget);
  const liveCameraPosition = useJLStore((s) => s.liveCameraPosition);
  const liveCameraTarget = useJLStore((s) => s.liveCameraTarget);

  const setPickStage = useJLStore((s) => s.setPickStage);
  const captureCurrentCameraForDraft = useJLStore(
    (s) => s.captureCurrentCameraForDraft
  );
  const resetDraft = useJLStore((s) => s.resetDraft);
  const submitCut = useJLStore((s) => s.submitCut);
  const setActiveMode = useJLStore((s) => s.setActiveMode);

  const [submittedBy, setSubmittedBy] = useState('');
  const [name, setName] = useState('');
  const [timeSavedSeconds, setTimeSavedSeconds] = useState<string>('2.1');
  const [difficulty, setDifficulty] = useState<CutDifficulty>('MEDIUM');
  const [consistencyRating, setConsistencyRating] = useState<number>(4);
  const [techniques, setTechniques] = useState<MovementTech[]>(['STRAFE_45']);
  const [description, setDescription] = useState('');
  const [videoSourceType, setVideoSourceType] = useState<'URL' | 'FILE'>('URL');
  const [videoUrl, setVideoUrl] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!draftStartBlock || !draftEndBlock) {
      setErrorMessage(
        'Bitte wähle im 3D-Raum zuerst den Start-Block (1. Klick) und den Ziel-Block (2. Klick) aus.'
      );
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Bitte gib einen Cut-Namen ein.');
      return;
    }

    if (trimmedName.length > MAX_CUT_NAME_LENGTH) {
      setErrorMessage(
        `Der Cut-Name darf maximal ${MAX_CUT_NAME_LENGTH} Zeichen lang sein (aktuell: ${trimmedName.length}).`
      );
      return;
    }

    const trimmedAuthor = submittedBy.trim() || 'Community';
    const trimmedDesc = description.trim();
    const trimmedVideo = videoUrl.trim();

    if (trimmedDesc.length > MAX_CUT_DESCRIPTION_LENGTH) {
      setErrorMessage(
        `Die Lineup-Erklärung darf maximal ${MAX_CUT_DESCRIPTION_LENGTH} Zeichen lang sein (aktuell: ${trimmedDesc.length}).`
      );
      return;
    }

    // Video ist optional. Falls angegeben (URL), Format auf YouTube oder .mp4/.webm prüfen:
    if (trimmedVideo && videoSourceType === 'URL') {
      if (!isValidVideoUrl(trimmedVideo)) {
        setErrorMessage(
          'Ungültige Video-URL: Erlaubt sind ausschließlich sichere https://-Links von YouTube (youtube.com, youtu.be) oder direkte .mp4 / .webm Videodateien.'
        );
        return;
      }
    }

    // Zeitersparnis parsen (falls leer, Standard 1.0s verwenden)
    const parsedTime = parseFloat(timeSavedSeconds);
    const validatedTimeSaved =
      !isNaN(parsedTime) && parsedTime > 0
        ? Number(parsedTime.toFixed(1))
        : 1.0;

    const camPos = draftCameraPosition ?? liveCameraPosition;
    const camTarget = draftCameraTarget ?? liveCameraTarget;

    submitCut({
      moduleId: selectedModuleId,
      name: trimmedName.slice(0, MAX_CUT_NAME_LENGTH),
      description: trimmedDesc.slice(0, MAX_CUT_DESCRIPTION_LENGTH),
      timeSavedSeconds: validatedTimeSaved,
      difficulty,
      consistencyRating,
      techniques: techniques.length > 0 ? techniques : ['TIMING'],
      startBlock: draftStartBlock,
      midPoints: undefined,
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
      videoUrl: trimmedVideo,
      submittedBy: trimmedAuthor.slice(0, MAX_CUT_AUTHOR_LENGTH),
    });

    setName('');
    setDescription('');
    setVideoUrl('');
    setLocalVideoName(null);
    setTimeSavedSeconds('2.1');
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

          <div className="grid grid-cols-2 gap-2">
            {/* 1. Klick: Start-Block */}
            <button
              type="button"
              onClick={() => setPickStage('START')}
              className={`rounded-xl border p-2.5 text-left transition ${
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

            {/* 2. Klick: Ziel-Block */}
            <button
              type="button"
              onClick={() => setPickStage('END')}
              className={`rounded-xl border p-2.5 text-left transition ${
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
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Spielername (optional)</span>
                <span className="text-[9px] text-zinc-500">max. {MAX_CUT_AUTHOR_LENGTH}</span>
              </div>
              <input
                type="text"
                maxLength={MAX_CUT_AUTHOR_LENGTH}
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="z.B. VeniCraft_JL"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Zeitersparnis (Sek.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="15"
                value={timeSavedSeconds}
                onChange={(e) => setTimeSavedSeconds(e.target.value)}
                placeholder="z.B. 2.1"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-xs font-bold text-emerald-400 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <span>Cut-Name *</span>
              <span className={`text-[9px] ${name.length >= MAX_CUT_NAME_LENGTH ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                {name.length}/{MAX_CUT_NAME_LENGTH}
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={MAX_CUT_NAME_LENGTH}
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
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <span>Lineup-Erklärung (optional)</span>
              <span className={`text-[9px] ${description.length >= MAX_CUT_DESCRIPTION_LENGTH ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                {description.length}/{MAX_CUT_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={MAX_CUT_DESCRIPTION_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional: 1. Stelle dich an die rechte Kante von...\n2. Ziele auf die Eichenstufe...\n3. Springe im 45°-Strafe ab..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-2.5 text-xs text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          {/* Video Clip Input: URL or Local File via ObjectURL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Beweis- &amp; Erklär-Video (optional)
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
                placeholder="Optional: https://... (.mp4, .webm oder YouTube-URL)"
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-zinc-900/70 py-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="truncate">
                      {localVideoName
                        ? `Ausgewählt: ${localVideoName}`
                        : 'Optional: Lokale .mp4 / .webm Datei auswählen'}
                    </span>
                  </button>
                  {localVideoName && (
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUrl('');
                        setLocalVideoName(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      title="Ausgewählte Datei entfernen"
                      className="rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
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
