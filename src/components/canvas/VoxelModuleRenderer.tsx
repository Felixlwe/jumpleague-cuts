'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { VoxelBlock, Vector3D } from '@/types/jumpleague';
import { useJLStore } from '@/store/useJLStore';
import { VOXEL_BLOCK_LABELS } from '@/constants/jumpleagueConfig';
import { WorldHtml } from '@/components/three/WorldHtml';
import { DraggableMidPoint } from '@/components/three/DraggableMidPoint';
import {
  useMcmeta,
  buildMergedModuleGeometry,
  getAtlasMaterial,
  getTranslucentAtlasMaterial,
} from '@/lib/mcmetaLoader';

export const VoxelModuleRenderer: React.FC = () => {
  const modules = useJLStore((s) => s.modules);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const cuts = useJLStore((s) => s.cuts);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const activeMode = useJLStore((s) => s.activeMode);
  const hoveredBlock = useJLStore((s) => s.hoveredBlock);
  const draftStartBlock = useJLStore((s) => s.draftStartBlock);
  const draftMidPoints = useJLStore((s) => s.draftMidPoints);
  const activeDraftMidPointIndex = useJLStore((s) => s.activeDraftMidPointIndex);
  const draftEndBlock = useJLStore((s) => s.draftEndBlock);
  const setHoveredBlock = useJLStore((s) => s.setHoveredBlock);
  const pickBlockInScene = useJLStore((s) => s.pickBlockInScene);
  const setActiveDraftMidPointIndex = useJLStore((s) => s.setActiveDraftMidPointIndex);
  const updateDraftMidPoint = useJLStore((s) => s.updateDraftMidPoint);
  const loadModuleBlocks = useJLStore((s) => s.loadModuleBlocks);

  const currentModule = useMemo(() => {
    if (!selectedModuleId) return modules[0] ?? null;
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
      }) ??
      modules[0] ??
      null
    );
  }, [modules, selectedModuleId]);

  useEffect(() => {
    if (
      currentModule &&
      (!currentModule.blocks || currentModule.blocks.length === 0)
    ) {
      void loadModuleBlocks(currentModule.id);
    }
  }, [currentModule?.id, currentModule?.blocks?.length, loadModuleBlocks]);

  const selectedCut = useMemo(
    () => cuts.find((c) => c.id === selectedCutId) ?? null,
    [cuts, selectedCutId]
  );

  const isSubmitMode = activeMode === 'SUBMIT';
  const { mcmeta } = useMcmeta();

  const atlasMaterial = useMemo(() => {
    if (!mcmeta) return null;
    return getAtlasMaterial(mcmeta.atlasTexture);
  }, [mcmeta]);

  const translucentMaterial = useMemo(() => {
    if (!mcmeta) return null;
    return getTranslucentAtlasMaterial(mcmeta.atlasTexture);
  }, [mcmeta]);

  // Fast O(1) Spatial Map: "x,y,z" -> VoxelBlock
  const blockMap = useMemo(() => {
    const map = new Map<string, VoxelBlock>();
    if (!currentModule || !Array.isArray(currentModule.blocks)) return map;
    for (const b of currentModule.blocks) {
      map.set(`${b.position.x},${b.position.y},${b.position.z}`, b);
    }
    return map;
  }, [currentModule?.blocks]);

  // High-Performance Merged BufferGeometry: 1 Draw Call for opaque blocks + 1 Draw Call for translucent blocks
  const mergedResult = useMemo(() => {
    if (
      !mcmeta ||
      !currentModule ||
      !Array.isArray(currentModule.blocks) ||
      currentModule.blocks.length === 0
    ) {
      return null;
    }
    return buildMergedModuleGeometry(currentModule.blocks, mcmeta);
  }, [mcmeta, currentModule?.blocks]);

  // Fast Voxel Raycasting: determines the clicked/hovered voxel coordinate from intersection point & normal
  const getVoxelCoordFromHit = useCallback((e: ThreeEvent<any>): Vector3D | null => {
    if (!e.face) return null;
    const hitPos = e.point.clone().sub(e.face.normal.clone().multiplyScalar(0.01));
    const bx = Math.round(hitPos.x);
    const by = Math.round(hitPos.y);
    const bz = Math.round(hitPos.z);
    return { x: bx, y: by, z: bz };
  }, []);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isSubmitMode) return;
      e.stopPropagation();
      const coord = getVoxelCoordFromHit(e);
      if (!coord) return;

      // Throttle: only update state if hovered coordinate actually changed
      if (
        !hoveredBlock ||
        hoveredBlock.x !== coord.x ||
        hoveredBlock.y !== coord.y ||
        hoveredBlock.z !== coord.z
      ) {
        const key = `${coord.x},${coord.y},${coord.z}`;
        const block = blockMap.get(key);
        if (block) {
          setHoveredBlock(coord);
          document.body.style.cursor = 'crosshair';
        } else {
          setHoveredBlock(null);
          document.body.style.cursor = 'auto';
        }
      }
    },
    [isSubmitMode, getVoxelCoordFromHit, hoveredBlock, blockMap, setHoveredBlock]
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isSubmitMode) return;
      e.stopPropagation();
      setHoveredBlock(null);
      document.body.style.cursor = 'auto';
    },
    [isSubmitMode, setHoveredBlock]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isSubmitMode) return;
      e.stopPropagation();
      const coord = getVoxelCoordFromHit(e);
      if (!coord) return;
      const key = `${coord.x},${coord.y},${coord.z}`;
      const block = blockMap.get(key);
      if (block) {
        pickBlockInScene(block.position, e.shiftKey);
      }
    },
    [isSubmitMode, getVoxelCoordFromHit, blockMap, pickBlockInScene]
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isSubmitMode) return;
      if (e.button === 1) {
        // Middle click: force add as midpoint waypoint
        e.stopPropagation();
        const coord = getVoxelCoordFromHit(e);
        if (!coord) return;
        const key = `${coord.x},${coord.y},${coord.z}`;
        const block = blockMap.get(key);
        if (block) {
          pickBlockInScene(block.position, true);
        }
      }
    },
    [isSubmitMode, getVoxelCoordFromHit, blockMap, pickBlockInScene]
  );

  const hoveredBlockLabel = useMemo(() => {
    if (!hoveredBlock) return '';
    const key = `${hoveredBlock.x},${hoveredBlock.y},${hoveredBlock.z}`;
    const b = blockMap.get(key);
    if (!b) return '';
    return VOXEL_BLOCK_LABELS[b.type] || b.type;
  }, [hoveredBlock, blockMap]);

  if (
    !currentModule ||
    !Array.isArray(currentModule.blocks) ||
    currentModule.blocks.length === 0
  ) {
    return (
      <WorldHtml position={[0, 4, 10]} center>
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-zinc-950/90 px-4 py-2 font-mono text-xs text-emerald-400 shadow-2xl backdrop-blur-md">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span>Lade 3D-Blöcke für {currentModule?.name || 'Modul'}...</span>
        </div>
      </WorldHtml>
    );
  }

  return (
    <group>
      {/* 1. OPAQUE & ALPHA-TESTED MESH (Solid blocks, leaves, ladders, fences, etc. in 1 single Draw Call) */}
      {mergedResult?.opaqueGeometry && atlasMaterial && (
        <mesh
          geometry={mergedResult.opaqueGeometry}
          material={atlasMaterial}
          castShadow
          receiveShadow
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        />
      )}

      {/* 2. TRANSLUCENT MESH (Water, ice, stained glass, slime in 1 Draw Call with smooth alpha blending) */}
      {mergedResult?.translucentGeometry && translucentMaterial && (
        <mesh
          geometry={mergedResult.translucentGeometry}
          material={translucentMaterial}
          castShadow
          receiveShadow
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        />
      )}

      {/* Selected Cut Start & End Highlight Plates (in Explore / Admin mode) */}
      {!isSubmitMode && selectedCut && (
        <>
          <mesh
            position={[
              selectedCut.startBlock.x,
              selectedCut.startBlock.y + 0.52,
              selectedCut.startBlock.z,
            ]}
          >
            <boxGeometry args={[1.06, 0.04, 1.06]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
            <Edges color="#67e8f9" threshold={1} />
          </mesh>
          <mesh
            position={[
              selectedCut.endBlock.x,
              selectedCut.endBlock.y + 0.52,
              selectedCut.endBlock.z,
            ]}
          >
            <boxGeometry args={[1.06, 0.04, 1.06]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
            <Edges color="#6ee7b7" threshold={1} />
          </mesh>
        </>
      )}

      {/* Submit Mode: Hover Wireframe Box & Tooltip (Only rendered for the currently hovered block!) */}
      {isSubmitMode && hoveredBlock && (
        <group position={[hoveredBlock.x, hoveredBlock.y, hoveredBlock.z]}>
          <mesh>
            <boxGeometry args={[1.02, 1.02, 1.02]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#22d3ee" />
          </mesh>
          <WorldHtml position={[0, 0.95, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-md border border-cyan-400/50 bg-zinc-950/90 px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow-lg">
              {hoveredBlockLabel} ({hoveredBlock.x}, {hoveredBlock.y},{' '}
              {hoveredBlock.z})
            </div>
          </WorldHtml>
        </group>
      )}

      {/* Submit Mode: Draft Start Marker */}
      {isSubmitMode && draftStartBlock && (
        <group position={[draftStartBlock.x, draftStartBlock.y, draftStartBlock.z]}>
          <mesh>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.24}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#34d399" />
          </mesh>
          <WorldHtml position={[0, 1.05, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-950 shadow-lg">
              START ({draftStartBlock.x},{draftStartBlock.y},{draftStartBlock.z})
            </div>
          </WorldHtml>
        </group>
      )}

      {/* Submit Mode: Draft End Marker */}
      {isSubmitMode && draftEndBlock && (
        <group position={[draftEndBlock.x, draftEndBlock.y, draftEndBlock.z]}>
          <mesh>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.24}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#c084fc" />
          </mesh>
          <WorldHtml position={[0, 1.05, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-purple-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-lg">
              ZIEL ({draftEndBlock.x},{draftEndBlock.y},{draftEndBlock.z})
            </div>
          </WorldHtml>
        </group>
      )}

      {/* Interactive Draggable Mid-Point Waypoints in Submit Mode */}
      {isSubmitMode &&
        draftMidPoints.map((pt, idx) => (
          <DraggableMidPoint
            key={`mid-${idx}`}
            index={idx}
            point={pt}
            isActive={
              activeDraftMidPointIndex === idx ||
              (activeDraftMidPointIndex === null && idx === 0)
            }
            onSelect={() => setActiveDraftMidPointIndex(idx)}
            onUpdate={(nextPt) => updateDraftMidPoint(idx, nextPt)}
          />
        ))}
    </group>
  );
};

export { VoxelModuleRenderer as VoxelRenderer };
