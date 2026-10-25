'use client';

import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
  Eye,
  EyeOff,
  PlusCircle,
  ShieldCheck,
  Compass,
  Camera,
} from 'lucide-react';
import { useJLStore } from '@/store/useJLStore';
import {
  ALL_CUT_DIFFICULTIES,
  CUT_DIFFICULTY_CONFIG,
} from '@/constants/jumpleagueConfig';

export const BottomToolbar: React.FC = () => {
  const showCutLines = useJLStore((s) => s.showCutLines);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const activeMode = useJLStore((s) => s.activeMode);
  const cuts = useJLStore((s) => s.cuts);
  const isAdminAuthenticated = useJLStore((s) => s.isAdminAuthenticated);
  const isAdminMode = useJLStore((s) => s.isAdminMode);
  const updateModuleThumbnail = useJLStore((s) => s.updateModuleThumbnail);

  const toggleCutLines = useJLStore((s) => s.toggleCutLines);
  const resetCamera = useJLStore((s) => s.resetCamera);
  const setActiveMode = useJLStore((s) => s.setActiveMode);

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSuccess, setCapturedSuccess] = useState(false);

  const handleCaptureThumbnail = async () => {
    if (!selectedModuleId) return;
    setIsCapturing(true);
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/webp', 0.65);
        await updateModuleThumbnail(selectedModuleId, dataUrl);
        setCapturedSuccess(true);
        setTimeout(() => setCapturedSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Screenshot capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const pendingCount = useMemo(
    () => cuts.filter((c) => c.status === 'PENDING').length,
    [cuts]
  );

  return (
    <div className="pointer-events-auto mx-auto flex flex-wrap items-center justify-center gap-2.5 bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 px-4 py-2.5">
      {/* Camera Reset Action */}
      <button
        type="button"
        onClick={resetCamera}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-cyan-400/50 hover:bg-white/10 hover:text-white active:scale-95"
      >
        <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
        <span>Kamera-Reset</span>
        {selectedCutId && (
          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
            Übersicht
          </span>
        )}
      </button>

      {/* Toggle 3D Cut Lines Visibility */}
      <button
        type="button"
        onClick={toggleCutLines}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
          showCutLines
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
            : 'border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {showCutLines ? (
          <>
            <Eye className="h-3.5 w-3.5 text-emerald-400" />
            <span>Cut-Linien: An</span>
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5 text-zinc-500" />
            <span>Cut-Linien: Aus</span>
          </>
        )}
      </button>

      <div className="hidden sm:block h-4 w-px bg-white/15" />

      {/* Interactive Mode Switcher: Explore / Cut einreichen / Admin-Modus */}
      <div className="flex items-center gap-1.5">
        {activeMode !== 'EXPLORE' && (
          <button
            type="button"
            onClick={() => setActiveMode('EXPLORE')}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition"
          >
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span>Explore</span>
          </button>
        )}

        {/* 'Cut einreichen' Mode Toggle */}
        <button
          type="button"
          onClick={() =>
            setActiveMode(activeMode === 'SUBMIT' ? 'EXPLORE' : 'SUBMIT')
          }
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
            activeMode === 'SUBMIT'
              ? 'border-cyan-400 bg-cyan-400 text-zinc-950 shadow-[0_0_18px_rgba(6,182,212,0.5)]'
              : 'border-cyan-500/35 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 hover:text-white'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Cut einreichen</span>
        </button>

        {/* 'Admin-Modus' Toggle with Red Pending Count Badge */}
        <button
          type="button"
          onClick={() =>
            setActiveMode(activeMode === 'ADMIN' ? 'EXPLORE' : 'ADMIN')
          }
          className={`relative flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
            activeMode === 'ADMIN'
              ? 'border-purple-400 bg-purple-500 text-white shadow-[0_0_18px_rgba(168,85,247,0.55)]'
              : 'border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-purple-400/40 hover:text-white'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
          <span>Admin-Modus</span>
          {pendingCount > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-extrabold text-white shadow-[0_0_8px_rgba(244,63,94,0.8)]">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Admin Action: 📸 Aktuelle Ansicht als Vorschaubild speichern */}
        {(isAdminAuthenticated || isAdminMode || activeMode === 'ADMIN') && (
          <button
            type="button"
            onClick={handleCaptureThumbnail}
            disabled={isCapturing}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-95 shadow-sm ${
              capturedSuccess
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/25 hover:text-white'
            }`}
            title="Aktuelle 3D-Kameraansicht als Vorschaubild für dieses Modul speichern"
          >
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              {capturedSuccess
                ? '✓ Gespeichert!'
                : isCapturing
                  ? 'Speichere...'
                  : '📸 Ansicht als Vorschaubild speichern'}
            </span>
          </button>
        )}
      </div>

      <div className="hidden lg:block h-4 w-px bg-white/15" />

      {/* Neon Color Legend for Trajectories */}
      <div className="hidden xl:flex items-center gap-3 px-1">
        {ALL_CUT_DIFFICULTIES.map((diff) => {
          const cfg = CUT_DIFFICULTY_CONFIG[diff];
          return (
            <div key={diff} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: cfg.color,
                  boxShadow: `0 0 8px ${cfg.color}`,
                }}
              />
              <span className="font-mono text-[11px] font-medium text-zinc-300">
                {cfg.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
