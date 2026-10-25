'use client';

import React, { useState } from 'react';
import { Compass, X } from 'lucide-react';

export const ControlsGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="pointer-events-auto fixed left-4 sm:left-5 top-1/2 -translate-y-1/2 z-20 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-zinc-300 shadow-lg backdrop-blur-sm transition hover:border-cyan-400/50 hover:bg-black/60 hover:text-white active:scale-95"
          title="Steuerung einblenden"
        >
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>Steuerung</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="pointer-events-auto fixed left-4 sm:left-5 top-1/2 -translate-y-1/2 z-20 select-none flex w-52 flex-col gap-2 font-mono text-xs text-zinc-200">
      {/* Header (ohne Kasten-Hintergrund) */}
      <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
            Steuerung
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded p-0.5 text-zinc-400 hover:text-white transition"
          title="Minimieren"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Vertical Keybinds (senkrecht nach unten, ohne Hintergrund) */}
      <div className="flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase text-zinc-300 drop-shadow">Fliegen</span>
          <kbd className="rounded border border-white/20 bg-black/60 px-1.5 py-0.5 font-bold text-cyan-300 shadow">
            W A S D
          </kbd>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase text-zinc-300 drop-shadow">Höhe</span>
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-white/20 bg-black/60 px-1.5 py-0.5 font-bold text-cyan-300 shadow">
              Space
            </kbd>
            <span className="text-zinc-500">/</span>
            <kbd className="rounded border border-white/20 bg-black/60 px-1.5 py-0.5 font-bold text-cyan-300 shadow">
              Shift
            </kbd>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase text-zinc-300 drop-shadow">Boost (2x)</span>
          <kbd className="rounded border border-white/20 bg-black/60 px-1.5 py-0.5 font-bold text-cyan-300 shadow">
            Strg
          </kbd>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase text-zinc-300 drop-shadow">Umschauen</span>
          <span className="rounded border border-cyan-400/40 bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow">
            Rechtsklick
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase text-zinc-300 drop-shadow">Zoom</span>
          <span className="rounded border border-white/20 bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 shadow">
            Mausrad
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px]">
          <span className="font-semibold uppercase text-zinc-300 drop-shadow">Block wählen</span>
          <span className="rounded border border-emerald-500/40 bg-black/60 px-1.5 py-0.5 font-bold text-emerald-300 shadow">
            Linksklick
          </span>
        </div>
      </div>
    </aside>
  );
};
