'use client';

import React from 'react';
import { MousePointerClick, Move3d } from 'lucide-react';
import {
  ALL_CUT_DIFFICULTIES,
  CUT_DIFFICULTY_CONFIG,
} from '@/constants/jumpleagueConfig';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';

export const BottomHudBar: React.FC = () => {
  const activeMode = useJumpLeagueStore((s) => s.activeMode);
  const pickStage = useJumpLeagueStore((s) => s.pickStage);

  return (
    <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl text-zinc-100 px-4 py-2 text-xs">
      {/* Left: Neon Trajectory Difficulty Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          3D-Flugbahnen:
        </span>
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
              <span className="font-mono text-[11px] font-medium text-zinc-200">
                {cfg.shortLabel}
              </span>
            </div>
          );
        })}

        <span className="hidden lg:inline-block h-3 w-px bg-white/15" />

        <div className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-zinc-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-yellow-400" />
            <span>Start / CP</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-400" />
            <span>Modul-Ziel</span>
          </span>
        </div>
      </div>

      {/* Right: Interactive 3D Controls Hint */}
      <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
        {activeMode === 'SUBMIT' ? (
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span>
              Raycast aktiv: Klicke im 3D-Raum auf{' '}
              {pickStage === 'START'
                ? 'den Absprung-Block (START)'
                : pickStage === 'MID'
                  ? 'einen Neo-Zwischenblock (MID)'
                  : 'den Lande-Block (ZIEL)'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Move3d className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Links: Orbit • Rechts: Pan • Scroll: Zoom • Cut anklicken:
              Kamera-Flug
            </span>
          </div>
        )}
      </div>
    </footer>
  );
};
