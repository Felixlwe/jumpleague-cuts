'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useJLStore } from '@/store/useJLStore';
import {
  MODULE_DIFFICULTY_CONFIG,
  getModuleDifficultyConfig,
} from '@/constants/jumpleagueConfig';
import { DIAMOND_BOOTS_DATA_URI } from '@/constants/diamondBootsAsset';

export const TopLeftBar: React.FC = () => {
  const modules = useJLStore((s) => s.modules);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);

  const activeModule = useMemo(() => {
    if (!selectedModuleId) return null;
    const target = selectedModuleId.trim().toLowerCase();
    const cleanTarget = target.replace(/^#+/, '');
    return (
      modules.find((m) => {
        const mId = m.id.toLowerCase();
        const mClean = mId.replace(/^#+/, '');
        const mShort = (m.shortCode || '').toLowerCase().replace(/^#+/, '');
        return (
          mId === target ||
          mClean === cleanTarget ||
          mShort === cleanTarget ||
          mId === `#${cleanTarget}`
        );
      }) ?? null
    );
  }, [modules, selectedModuleId]);

  if (!activeModule) {
    return null;
  }

  const activeDiffCfg = getModuleDifficultyConfig(activeModule.difficulty);
  const cleanName = (activeModule.name || activeModule.id || 'Modul').replace(
    /^[A-Z0-9]+\s*-\s*/i,
    ''
  );

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2.5">
      {/* Diamantschuh-Zurück-Button zurück zum Modul-Hub (/) */}
      <Link
        href="/"
        title="Zurück zur Modul-Übersicht"
        className="group relative flex items-center gap-2.5 rounded-2xl border border-white/15 bg-zinc-950/80 px-3.5 py-2.5 text-zinc-100 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/60 hover:bg-cyan-500/15 hover:shadow-[0_0_24px_rgba(6,182,212,0.4)] active:scale-95"
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 transition-all duration-300 group-hover:border-cyan-400/70 group-hover:bg-cyan-400/20 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.5)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DIAMOND_BOOTS_DATA_URI}
            alt="Minecraft Diamond Boots"
            width={24}
            height={24}
            className="h-6 w-6 object-contain [image-rendering:pixelated] transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]"
          />
        </div>

        <div className="pr-1">
          <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400 transition-colors group-hover:text-cyan-300">
            <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Modul-Hub</span>
          </div>
          <div className="text-xs font-bold tracking-tight text-zinc-200 group-hover:text-white">
            Alle Module
          </div>
        </div>
      </Link>

      {/* Kompaktes Status-Badge des aktuell geladenen 3D-Moduls (ohne Modul-Liste) */}
      <section className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/75 px-4 py-2.5 text-zinc-100 shadow-2xl backdrop-blur-xl">
        <span
          className="flex h-9 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-black text-white shadow-sm"
          style={{
            borderColor: `${activeDiffCfg.color}66`,
            backgroundColor: `${activeDiffCfg.color}1c`,
          }}
        >
          {activeModule.id}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              JumpLeague ShortCuts
            </span>
            <span
              className={`rounded-md border px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${activeDiffCfg.badgeClass}`}
            >
              {activeModule.difficulty}
            </span>
          </div>
          <h1 className="truncate text-sm font-bold tracking-tight text-white">
            {cleanName}
          </h1>
        </div>
      </section>
    </div>
  );
};
