'use client';

import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { TopLeftBar } from '@/components/hud/TopLeftBar';
import { FilterDrawer } from '@/components/hud/FilterDrawer';
import { RightCutPanel } from '@/components/hud/RightCutPanel';
import { SubmissionModal } from '@/components/hud/SubmissionModal';
import { AdminReviewPanel } from '@/components/hud/AdminReviewPanel';
import { AdminAuthModal } from '@/components/hud/AdminAuthModal';
import { BottomToolbar } from '@/components/hud/BottomToolbar';
import { useJLStore } from '@/store/useJLStore';
import { DIAMOND_BOOTS_DATA_URI } from '@/constants/diamondBootsAsset';

// Load main 3D Canvas strictly client-side (ssr: false)
const ModuleScene = dynamic(
  () =>
    import('@/components/three/ModuleScene').then((mod) => mod.ModuleScene),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex h-screen w-screen items-center justify-center bg-[#1c202d] font-mono text-xs text-zinc-400">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span>LOADING 3D JUMPLEAGUE MODULE VIEWPORT...</span>
        </div>
      </div>
    ),
  }
);

const emptySubscribe = () => () => {};

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function ClientModuleDetailHud() {
  const activeMode = useJLStore((s) => s.activeMode);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-5">
      {/* Top/Middle Workspace: TopLeftBar (Diamond Boots Back-Button + Active Module Badge) on Left; Explore / Submit / Admin on Right */}
      <div className="flex flex-1 items-start justify-between gap-4 overflow-hidden">
        <TopLeftBar />

        {activeMode === 'SUBMIT' ? (
          <SubmissionModal />
        ) : activeMode === 'ADMIN' ? (
          <AdminReviewPanel />
        ) : (
          <div className="flex max-h-[calc(100vh-110px)] w-full max-w-md flex-col items-end gap-2 overflow-hidden">
            <FilterDrawer />
            <RightCutPanel />
          </div>
        )}
      </div>

      {/* Bottom Floating Toolbar: Camera Reset, Cut-Lines Toggle, Cut einreichen & Admin-Modus */}
      <BottomToolbar />

      {/* Admin Security Clearance Password Modal */}
      <AdminAuthModal />
    </div>
  );
}

interface ModuleDetailClientProps {
  moduleId: string;
}

export const ModuleDetailClient: React.FC<ModuleDetailClientProps> = ({
  moduleId,
}) => {
  const isMounted = useIsMounted();
  const rawModuleId = typeof moduleId === 'string' ? decodeURIComponent(moduleId) : '';

  const modules = useJLStore((s) => s.modules);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const selectModule = useJLStore((s) => s.selectModule);

  const matchedModule = useMemo(() => {
    if (!rawModuleId) return null;
    const target = rawModuleId.trim().toLowerCase();
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
  }, [modules, rawModuleId]);

  // Automatically load and activate the module specified by the URL parameter [id]
  useEffect(() => {
    if (!isMounted || !matchedModule) return;
    if (selectedModuleId !== matchedModule.id) {
      selectModule(matchedModule.id);
    }
  }, [isMounted, matchedModule, selectedModuleId, selectModule]);

  if (!isMounted) {
    return (
      <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#1c202d] font-mono text-xs text-zinc-400">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span>INITIALIZING JUMPLEAGUE 3D VIEWPORT...</span>
        </div>
      </main>
    );
  }

  if (!matchedModule) {
    return (
      <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#1c202d] p-6 text-zinc-100">
        <div className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-950/85 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/40 bg-orange-500/15 text-orange-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-orange-400">
              404 // Modul nicht gefunden
            </div>
            <h1 className="text-lg font-bold text-white">
              Modul &bdquo;{rawModuleId}&ldquo; existiert nicht
            </h1>
            <p className="text-xs text-zinc-400">
              Das angeforderte JumpLeague-Modul konnte im Katalog nicht geladen werden.
            </p>
          </div>
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/25 hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DIAMOND_BOOTS_DATA_URI}
              alt="Diamond Boots"
              width={20}
              height={20}
              className="h-5 w-5 object-contain [image-rendering:pixelated] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110"
            />
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Zurück zum Modul-Hub</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#1c202d]">
      {/* Fullscreen 3D Viewport (fixed inset-0) */}
      <ModuleScene />

      {/* Client-Only Tactical HUD Overlay (without Module List) */}
      <ClientModuleDetailHud />
    </main>
  );
};
