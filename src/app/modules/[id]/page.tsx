import React, { Suspense } from 'react';
import { ModuleDetailClient } from '@/components/module-detail/ModuleDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return [{ id: 'E1' }];
}

async function ModuleDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  return <ModuleDetailClient moduleId={id} />;
}

export default function ModuleDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex h-screen w-screen items-center justify-center bg-[#1c202d] font-mono text-xs text-zinc-400">
          <div className="flex flex-col items-center gap-2.5">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>LOADING JUMPLEAGUE 3D MODULE...</span>
          </div>
        </div>
      }
    >
      <ModuleDetailContent paramsPromise={params} />
    </Suspense>
  );
}
