'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { DIAMOND_BOOTS_DATA_URI } from '@/constants/diamondBootsAsset';

export default function ModuleDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ModuleDetailError]', error);
  }, [error]);

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#1c202d] p-6 text-zinc-100 font-sans">
      <div className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-950/85 p-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/15 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-rose-400">
            Ladefehler // JumpLeague 3D
          </div>
          <h1 className="text-lg font-bold text-white">
            Modul-Ansicht konnte nicht geladen werden
          </h1>
          <p className="text-xs text-zinc-400">
            Beim Initialisieren des 3D-Viewports ist ein Fehler aufgetreten.
          </p>
          {error?.message && (
            <div className="mt-2 rounded-lg bg-zinc-900 border border-white/10 p-2 font-mono text-[11px] text-zinc-400 break-words text-left">
              {error.message}
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Erneut versuchen</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/80 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DIAMOND_BOOTS_DATA_URI}
              alt="Diamond Boots"
              width={16}
              height={16}
              className="h-4 w-4 object-contain [image-rendering:pixelated]"
            />
            <span>Zum Modul-Hub</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
