import React, { Suspense } from 'react';
import { ModuleDetailClient } from '@/components/module-detail/ModuleDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export function generateStaticParams() {
  return [{ id: 'E1' }];
}

async function ModuleDetailContent({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
  searchParamsPromise?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await paramsPromise;
  const sp = searchParamsPromise ? await searchParamsPromise : undefined;
  const initialCutId = typeof sp?.cutId === 'string' ? sp.cutId : undefined;
  return <ModuleDetailClient moduleId={id} initialCutId={initialCutId} />;
}

export default function ModuleDetailPage({ params, searchParams }: PageProps) {
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
      <ModuleDetailContent
        paramsPromise={params}
        searchParamsPromise={searchParams}
      />
    </Suspense>
  );
}
