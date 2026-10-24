'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CatmullRomLine } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { Cut, Vector3D, VoxelBlock } from '@/types/jumpleague';
import { useJLStore, doesCutMatchFilters } from '@/store/useJLStore';
import {
  CUT_DIFFICULTY_CONFIG,
  getCutDifficultyConfig,
} from '@/constants/jumpleagueConfig';
import { WorldHtml } from './WorldHtml';

export interface ComputedTrajectory {
  points: [number, number, number][];
  apex: [number, number, number];
  startSurface: [number, number, number];
  endSurface: [number, number, number];
}

function getBlockSurfaceY(
  coord: Vector3D,
  moduleBlocks?: VoxelBlock[]
): number {
  if (moduleBlocks) {
    const found = moduleBlocks.find(
      (b) =>
        b.position.x === coord.x &&
        b.position.y === coord.y &&
        b.position.z === coord.z
    );
    if (found?.type === 'OAK_SLAB') {
      return coord.y + 0.04;
    }
  }
  return coord.y + 0.54;
}

export function computeJumpTrajectory(
  startBlock: Vector3D,
  endBlock: Vector3D,
  midPoints?: Vector3D[],
  moduleBlocks?: VoxelBlock[]
): ComputedTrajectory {
  const startSurface: [number, number, number] = [
    startBlock.x,
    getBlockSurfaceY(startBlock, moduleBlocks),
    startBlock.z,
  ];
  const endSurface: [number, number, number] = [
    endBlock.x,
    getBlockSurfaceY(endBlock, moduleBlocks),
    endBlock.z,
  ];

  const dx = endSurface[0] - startSurface[0];
  const dz = endSurface[2] - startSurface[2];
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  const controlVectors: THREE.Vector3[] = [
    new THREE.Vector3(...startSurface),
  ];

  if (midPoints && midPoints.length > 0) {
    midPoints.forEach((pt) => {
      controlVectors.push(new THREE.Vector3(pt.x, pt.y, pt.z));
    });
  } else {
    // Realistic Minecraft jump parabola (1.25m to 2.2m arc height)
    const arcBoost = Math.min(2.25, Math.max(1.3, horizontalDist * 0.32));
    const maxY = Math.max(startSurface[1], endSurface[1]);

    const quarterPoint = new THREE.Vector3(
      startSurface[0] + dx * 0.25,
      THREE.MathUtils.lerp(startSurface[1], maxY + arcBoost, 0.72),
      startSurface[2] + dz * 0.25
    );
    const midApex = new THREE.Vector3(
      startSurface[0] + dx * 0.5,
      maxY + arcBoost,
      startSurface[2] + dz * 0.5
    );
    const threeQuarterPoint = new THREE.Vector3(
      startSurface[0] + dx * 0.75,
      THREE.MathUtils.lerp(endSurface[1], maxY + arcBoost, 0.72),
      startSurface[2] + dz * 0.75
    );

    controlVectors.push(quarterPoint, midApex, threeQuarterPoint);
  }

  controlVectors.push(new THREE.Vector3(...endSurface));

  // Sample curve to locate exact highest point (apex) for the <Html> badge
  const curve = new THREE.CatmullRomCurve3(
    controlVectors,
    false,
    'centripetal',
    0.5
  );
  const sampledPoints = curve.getPoints(48);

  let highestPt = sampledPoints[0];
  for (const pt of sampledPoints) {
    if (pt.y > highestPt.y) {
      highestPt = pt;
    }
  }

  return {
    points: sampledPoints.map((v) => [v.x, v.y, v.z]),
    apex: [highestPt.x, highestPt.y + 0.24, highestPt.z],
    startSurface,
    endSurface,
  };
}

interface SingleTrajectoryProps {
  cut: Cut;
  moduleBlocks: VoxelBlock[];
  isSelected: boolean;
  isHovered: boolean;
  hasActiveSelection: boolean;
  onSelect: (cutId: string) => void;
  onHover: (cutId: string | null) => void;
}

const SingleCutTrajectory: React.FC<SingleTrajectoryProps> = ({
  cut,
  moduleBlocks,
  isSelected,
  isHovered,
  hasActiveSelection,
  onSelect,
  onHover,
}) => {
  const diffConfig = getCutDifficultyConfig(cut.difficulty);

  const { points, apex, startSurface, endSurface } = useMemo(
    () =>
      computeJumpTrajectory(
        cut.startBlock,
        cut.endBlock,
        cut.midPoints,
        moduleBlocks
      ),
    [cut.startBlock, cut.endBlock, cut.midPoints, moduleBlocks]
  );

  const isHighlighted = isSelected || isHovered;

  // Dim non-selected trajectories when a cut is selected so the active parabola stands out clearly
  const lineOpacity = isSelected
    ? 1.0
    : isHovered
      ? 0.95
      : hasActiveSelection
        ? 0.2
        : 0.86;

  const lineWidth = isSelected
    ? 5.5
    : isHovered
      ? 4.2
      : hasActiveSelection
        ? 1.8
        : 3.0;

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(cut.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(cut.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group>
      {/* Primary 3D Jump Parabola */}
      <CatmullRomLine
        points={points}
        curveType="centripetal"
        tension={0.5}
        color={diffConfig.color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
        onClick={handleSelect}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* Bright Neon Aura Halo when Selected or Hovered */}
      {isHighlighted && (
        <CatmullRomLine
          points={points}
          curveType="centripetal"
          tension={0.5}
          color={diffConfig.color}
          lineWidth={lineWidth + 5.5}
          transparent
          opacity={isSelected ? 0.3 : 0.18}
        />
      )}

      {/* Takeoff Ring on Start Block */}
      <group position={startSurface}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <ringGeometry
            args={[isHighlighted ? 0.2 : 0.16, isHighlighted ? 0.38 : 0.3, 28]}
          />
          <meshBasicMaterial
            color={diffConfig.color}
            side={THREE.DoubleSide}
            transparent
            opacity={lineOpacity}
          />
        </mesh>
        {isHighlighted && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.14, 20]} />
            <meshBasicMaterial
              color={diffConfig.color}
              side={THREE.DoubleSide}
              transparent
              opacity={0.45}
            />
          </mesh>
        )}
      </group>

      {/* Landing Ring on Target Block */}
      <group position={endSurface}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <ringGeometry
            args={[isHighlighted ? 0.24 : 0.2, isHighlighted ? 0.44 : 0.36, 28]}
          />
          <meshBasicMaterial
            color={diffConfig.color}
            side={THREE.DoubleSide}
            transparent
            opacity={lineOpacity}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.12, 20]} />
          <meshBasicMaterial
            color="#ffffff"
            side={THREE.DoubleSide}
            transparent
            opacity={lineOpacity * 0.9}
          />
        </mesh>
      </group>

      {/* Floating <WorldHtml center> Pill Badge at the Apex of the Curve */}
      <WorldHtml position={apex} center>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(cut.id);
          }}
          onMouseEnter={() => onHover(cut.id)}
          onMouseLeave={() => onHover(null)}
          style={{
            boxShadow: isHighlighted ? diffConfig.glowShadow : undefined,
            borderColor: isHighlighted ? diffConfig.color : undefined,
          }}
          className={`pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-tight backdrop-blur-md transition-all duration-200 ${
            isSelected
              ? 'scale-115 bg-zinc-950 text-white ring-2 ring-white/20'
              : isHovered
                ? 'scale-110 bg-zinc-950/95 text-white'
                : hasActiveSelection
                  ? 'scale-90 opacity-40 hover:opacity-95 bg-zinc-950/75 text-zinc-300 border-white/15'
                  : 'bg-zinc-950/85 text-zinc-100 border-white/20 hover:scale-105'
          }`}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{
              backgroundColor: diffConfig.color,
              boxShadow: `0 0 8px ${diffConfig.color}`,
            }}
          />
          <span>-{cut.timeSavedSeconds.toFixed(1)}s</span>
        </button>
      </WorldHtml>
    </group>
  );
};

export const CutTrajectories: React.FC = () => {
  const modules = useJLStore((s) => s.modules);
  const cuts = useJLStore((s) => s.cuts);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const hoveredCutId = useJLStore((s) => s.hoveredCutId);
  const filters = useJLStore((s) => s.filters);
  const activeMode = useJLStore((s) => s.activeMode);
  const selectCut = useJLStore((s) => s.selectCut);
  const setHoveredCut = useJLStore((s) => s.setHoveredCut);

  const draftStartBlock = useJLStore((s) => s.draftStartBlock);
  const draftMidPoints = useJLStore((s) => s.draftMidPoints);
  const draftEndBlock = useJLStore((s) => s.draftEndBlock);

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

  // Filter APPROVED cuts of the active module matching current FilterState
  const visibleCuts = useMemo(() => {
    const selClean = (selectedModuleId || '').trim().toLowerCase().replace(/^#+/, '');
    return cuts.filter((cut) => {
      const cutModClean = (cut.moduleId || '').trim().toLowerCase().replace(/^#+/, '');
      if (cut.moduleId !== selectedModuleId && cutModClean !== selClean) return false;

      if (activeMode !== 'ADMIN') {
        if (cut.status !== 'APPROVED' && cut.id !== selectedCutId) {
          return false;
        }
      } else {
        if (cut.status === 'REJECTED' && cut.id !== selectedCutId) {
          return false;
        }
      }

      return doesCutMatchFilters(cut, filters);
    });
  }, [cuts, selectedModuleId, activeMode, selectedCutId, filters]);

  const draftPreview = useMemo(() => {
    if (activeMode !== 'SUBMIT' || !draftStartBlock || !draftEndBlock) {
      return null;
    }
    return computeJumpTrajectory(
      draftStartBlock,
      draftEndBlock,
      draftMidPoints,
      currentModule?.blocks
    );
  }, [
    activeMode,
    draftStartBlock,
    draftEndBlock,
    draftMidPoints,
    currentModule?.blocks,
  ]);

  return (
    <group>
      {visibleCuts.map((cut) => (
        <SingleCutTrajectory
          key={cut.id}
          cut={cut}
          moduleBlocks={currentModule.blocks}
          isSelected={selectedCutId === cut.id}
          isHovered={hoveredCutId === cut.id}
          hasActiveSelection={selectedCutId !== null}
          onSelect={selectCut}
          onHover={setHoveredCut}
        />
      ))}

      {/* Live Preview Curve when creating a new Cut in Submit mode */}
      {draftPreview && (
        <group>
          <CatmullRomLine
            points={draftPreview.points}
            curveType="centripetal"
            tension={0.5}
            color="#22d3ee"
            lineWidth={4}
            dashed
            dashScale={3}
            dashSize={0.6}
            gapSize={0.3}
          />
          <WorldHtml position={draftPreview.apex} center>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-cyan-500/90 border border-white/40 px-2.5 py-0.5 text-[11px] font-mono font-bold text-zinc-950 shadow-lg">
              NEUER CUT PREVIEW
            </div>
          </WorldHtml>
        </group>
      )}
    </group>
  );
};
