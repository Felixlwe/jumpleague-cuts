'use client';

import React, { useState } from 'react';
import { Compass, X, HelpCircle } from 'lucide-react';

export const ControlsGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="pointer-events-auto fixed bottom-4 right-4 z-30 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/85 px-3 py-2 font-mono text-xs font-semibold text-zinc-300 shadow-2xl backdrop-blur-xl transition hover:border-cyan-400/50 hover:bg-zinc-900 hover:text-white active:scale-95"
          title="Steuerungs-Anleitung öffnen"
        >
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>Steuerung</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
            ?
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className="pointer-events-auto fixed bottom-4 right-4 z-30 w-72 select-none rounded-2xl border border-white/10 bg-zinc-950/90 p-3.5 font-mono text-xs text-zinc-300 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Steuerung (Spectator)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          title="Anleitung minimieren"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Shortcuts List */}
      <div className="space-y-1.5 pt-2.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-400">Fliegen (horizontal)</span>
          <kbd className="rounded border border-white/15 bg-zinc-900 px-1.5 py-0.5 font-bold text-cyan-300">
            W A S D
          </kbd>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-400">Hoch / Runter</span>
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-white/15 bg-zinc-900 px-1.5 py-0.5 font-bold text-cyan-300">
              Space
            </kbd>
            <span className="text-zinc-600">/</span>
            <kbd className="rounded border border-white/15 bg-zinc-900 px-1.5 py-0.5 font-bold text-cyan-300">
              Shift
            </kbd>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-400">Speed-Boost (2x)</span>
          <kbd className="rounded border border-white/15 bg-zinc-900 px-1.5 py-0.5 font-bold text-cyan-300">
            Strg halten
          </kbd>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-400">Umschauen</span>
          <span className="rounded border border-cyan-400/30 bg-cyan-950/40 px-1.5 py-0.5 font-bold text-cyan-300">
            Rechtsklick halten
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-400">Zoom / Step</span>
          <span className="rounded border border-white/15 bg-zinc-900 px-1.5 py-0.5 font-bold text-zinc-300">
            Mausrad
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px]">
          <span className="text-zinc-400">Block wählen (Editor)</span>
          <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 font-bold text-emerald-300">
            Linksklick
          </span>
        </div>
      </div>
    </aside>
  );
};
