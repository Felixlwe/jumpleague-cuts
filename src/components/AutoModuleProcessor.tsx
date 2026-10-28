'use client';

import { useEffect, useRef } from 'react';
import { useJLStore } from '@/store/useJLStore';
import { useMcmeta } from '@/lib/mcmetaLoader';
import { fetchModuleById } from '@/lib/supabase';
import {
  needsAutoNaming,
  getFrequentBlockNames,
  captureMultiAngleComposite,
} from '@/lib/moduleCapture';
import { JLModule } from '@/types/jumpleague';

/**
 * Invisible background processor for the homepage.
 * Iterates sequentially through modules that lack a thumbnail or require automated AI naming,
 * captures 4 camera angles in a headless 400x400 offscreen WebGL canvas, queries /api/ai-name-module,
 * and updates both the live store and Supabase database.
 */
export function AutoModuleProcessor() {
  const modules = useJLStore((s) => s.modules);
  const updateModuleNameAndThumbnail = useJLStore((s) => s.updateModuleNameAndThumbnail);
  const { mcmeta } = useMcmeta();

  const isProcessingRef = useRef<boolean>(false);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isProcessingRef.current || !mcmeta || !Array.isArray(modules) || modules.length === 0) {
      return;
    }

    // Find the next candidate module needing auto-naming or thumbnail
    const candidate = modules.find((m) => {
      if (!m || !m.id) return false;
      if (processedIdsRef.current.has(m.id)) return false;
      return needsAutoNaming(m) || !m.thumbnailUrl;
    });

    if (!candidate) {
      return;
    }

    let isCancelled = false;
    isProcessingRef.current = true;

    async function processModule(targetMod: JLModule) {
      processedIdsRef.current.add(targetMod.id);

      try {
        // 1. Ensure 3D voxel blocks are loaded (homepage only fetches metadata by default)
        let blocks = targetMod.blocks;
        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
          const fullMod = await fetchModuleById(targetMod.id);
          if (fullMod?.blocks && Array.isArray(fullMod.blocks) && fullMod.blocks.length > 0) {
            blocks = fullMod.blocks;
          }
        }

        if (!blocks || blocks.length === 0 || isCancelled) {
          return;
        }

        // 2. Render 4-angle composite image and Angle 1 thumbnail in offscreen canvas
        const captureResult = await captureMultiAngleComposite({
          blocks,
          mcmeta: mcmeta!,
        });

        if (!captureResult || isCancelled) {
          return;
        }

        const { compositeDataUrl, thumbnailDataUrl } = captureResult;
        let finalAiName: string | undefined = undefined;

        // 3. If module still has a placeholder or ID name, query the Vision AI endpoint
        if (needsAutoNaming(targetMod)) {
          try {
            const res = await fetch('/api/ai-name-module', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                compositeDataUrl,
                frequentBlocks: getFrequentBlockNames(blocks),
                dimensions: targetMod.dimensions,
              }),
            });

            if (res.ok) {
              const data = (await res.json()) as { name?: string };
              if (data?.name && typeof data.name === 'string' && data.name.trim().length > 0) {
                finalAiName = data.name.trim();
              }
            }
          } catch (err) {
            console.warn('[AutoModuleProcessor] AI naming request failed, proceeding with fallback:', err);
          }
        }

        if (isCancelled) return;

        // 4. Persist updated name and/or thumbnail URL live in store and Supabase
        await updateModuleNameAndThumbnail(
          targetMod.id,
          finalAiName,
          targetMod.thumbnailUrl ? undefined : thumbnailDataUrl
        );

        // 5. 1.5 seconds cooldown between modules to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.warn(`[AutoModuleProcessor] Exception processing module ${targetMod.id}:`, err);
      } finally {
        isProcessingRef.current = false;
      }
    }

    void processModule(candidate);

    return () => {
      isCancelled = true;
      isProcessingRef.current = false;
    };
  }, [modules, mcmeta, updateModuleNameAndThumbnail]);

  return null;
}
