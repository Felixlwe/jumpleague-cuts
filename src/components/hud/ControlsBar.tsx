'use client';

import React from 'react';
import { Mouse, Zap } from 'lucide-react';

export const ControlsBar: React.FC = () => {
  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-1.5 font-mono text-[11px] text-zinc-300 shadow-2xl backdrop-blur-xl select-none">
      {/* 1. WASD: Bewegen */}
      <div className="flex items-center gap-1.5">
        <kbd className="rounded border border-white/20 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-sm">
          WASD
        </kbd>
        <span className="text-zinc-300">Bewegen</span>
      </div>

      <span className="text-zinc-600">|</span>

      {/* 2. Space / Shift: Hoch / Runter */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          <kbd className="rounded border border-white/20 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-sm">
            Space
          </kbd>
          <span className="text-zinc-500">/</span>
          <kbd className="rounded border border-white/20 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-sm">
            Shift
          </kbd>
        </div>
        <span className="text-zinc-300">Hoch / Runter</span>
      </div>

      <span className="text-zinc-600">|</span>

      {/* 3. Strg: Boost */}
      <div className="flex items-center gap-1.5">
        <kbd className="flex items-center gap-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 shadow-sm">
          <Zap className="h-2.5 w-2.5" />
          <span>Strg</span>
        </kbd>
        <span className="text-zinc-300">Boost</span>
      </div>

      <span className="text-zinc-600">|</span>

      {/* 4. Rechtsklick halten: Umschauen */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-950/40 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-sm">
          <Mouse className="h-3 w-3" />
          <span>Rechtsklick</span>
        </span>
        <span className="text-zinc-300">Umschauen</span>
      </div>

      <span className="hidden sm:inline text-zinc-600">|</span>

      {/* 5. Mausrad: Zoom */}
      <div className="hidden sm:flex items-center gap-1.5">
        <kbd className="rounded border border-white/20 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 shadow-sm">
          Mausrad
        </kbd>
        <span className="text-zinc-400">Zoom</span>
      </div>

      <span className="hidden md:inline text-zinc-600">|</span>

      {/* 6. Linksklick: Block wählen */}
      <div className="hidden md:flex items-center gap-1.5">
        <kbd className="rounded border border-white/20 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 shadow-sm">
          Linksklick
        </kbd>
        <span className="text-zinc-400">Block wählen</span>
      </div>
    </div>
  );
};
