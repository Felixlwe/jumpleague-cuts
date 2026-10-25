'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Cut, CutDifficulty, Vector3D, VoxelBlock } from '@/types/jumpleague';
import { useJLStore, doesCutMatchFilters } from '@/store/useJLStore';
import { getCutDifficultyConfig } from '@/constants/jumpleagueConfig';
import { WorldHtml } from './WorldHtml';

export interface CurveSegment {
  curve: THREE.QuadraticBezierCurve3;
  controlPoint: THREE.Vector3;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
}

export interface ComputedTrajectory {
  segments: CurveSegment[];
  apex: [number, number, number];
  startSurface: [number, number, number];
  endSurface: [number, number, number];
  lastTangent: THREE.Vector3;
  lastPoint: THREE.Vector3;
}

/**
 * Calculates surface elevation for a block coordinate (half a block above center, or slab height).
 */
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
    if (found) {
      const type = (found.type || '').toLowerCase();
      if (type.includes('carpet') || type === 'snow' || type.includes('snow_layer')) {
        return coord.y - 0.42;
      }
      if (type.includes('slab')) {
        const slabType =
          found.slabType ||
          found.properties?.type ||
          found.state?.type ||
          'bottom';
        if (slabType === 'bottom') {
          return coord.y + 0.05;
        }
      }
      if (type.includes('trapdoor')) {
        const half = found.half || found.properties?.half || found.state?.half;
        if (half !== 'top') {
          return coord.y - 0.35;
        }
      }
      if (type.includes('daylight_detector')) {
        return coord.y - 0.12;
      }
      if (type.includes('bed')) {
        return coord.y + 0.1;
      }
      if (type.includes('chest')) {
        return coord.y + 0.42;
      }
      if (type.includes('head') || type.includes('skull')) {
        const isWall = type.includes('wall');
        if (!isWall) {
          return coord.y + 0.05;
        }
      }
    }
  }
  return coord.y + 0.55;
}

/**
 * Creates a single parabolic jump curve between two points using THREE.QuadraticBezierCurve3.
 * apexY = Math.max(A.y, B.y) + Math.min(2.8, Math.max(1.25, horizontalDist * 0.35))
 */
function createQuadraticSegment(
  A: THREE.Vector3,
  B: THREE.Vector3
): CurveSegment {
  const dx = B.x - A.x;
  const dz = B.z - A.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const apexY =
    Math.max(A.y, B.y) + Math.min(2.8, Math.max(1.25, horizontalDist * 0.35));

  const controlPoint = new THREE.Vector3(
    (A.x + B.x) / 2,
    apexY,
    (A.z + B.z) / 2
  );

  const curve = new THREE.QuadraticBezierCurve3(A, controlPoint, B);

  return {
    curve,
    controlPoint,
    startPoint: A,
    endPoint: B,
  };
}

/**
 * Computes curved 3D jump parabolas for JumpLeague cuts.
 * If midPoints exist, splits the jump into realistic multi-segment arcs (Start -> Mid -> End).
 */
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

  const waypoints: THREE.Vector3[] = [new THREE.Vector3(...startSurface)];

  if (midPoints && midPoints.length > 0) {
    midPoints.forEach((pt) => {
      waypoints.push(
        new THREE.Vector3(pt.x, getBlockSurfaceY(pt, moduleBlocks), pt.z)
      );
    });
  }

  waypoints.push(new THREE.Vector3(...endSurface));

  const segments: CurveSegment[] = [];
  let highestY = -Infinity;
  let highestPoint = waypoints[0];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = createQuadraticSegment(waypoints[i], waypoints[i + 1]);
    segments.push(seg);

    // Sample points along this segment to find apex for the HUD pill
    const pts = seg.curve.getPoints(16);
    for (const p of pts) {
      if (p.y > highestY) {
        highestY = p.y;
        highestPoint = p;
      }
    }
  }

  const lastCurve = segments[segments.length - 1].curve;
  const lastTangent = lastCurve.getTangent(0.95);
  const lastPoint = lastCurve.getPoint(0.95);

  return {
    segments,
    apex: [highestPoint.x, highestPoint.y + 0.28, highestPoint.z],
    startSurface,
    endSurface,
    lastTangent,
    lastPoint,
  };
}

/**
 * Determines trajectory color based on cut difficulty and selection state.
 */
function getTrajectoryColor(difficulty: CutDifficulty, isSelected: boolean): string {
  if (isSelected) return '#06b6d4'; // Cyan when selected
  switch (difficulty) {
    case 'SAFE':
      return '#22c55e'; // Green for Easy / Safe
    case 'MEDIUM':
      return '#eab308'; // Yellow for Medium
    case 'HEAVY':
      return '#f97316'; // Orange / Red for Heavy
    case 'PIXEL_PERFECT':
      return '#ef4444'; // Red for Pixel Perfect / Expert
    default:
      return '#eab308';
  }
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

  const { segments, apex, startSurface, endSurface, lastTangent, lastPoint } =
    useMemo(
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
  const color = useMemo(
    () => getTrajectoryColor(cut.difficulty, isSelected),
    [cut.difficulty, isSelected]
  );

  // Dim non-selected trajectories when another cut is selected
  const lineOpacity = isSelected
    ? 0.95
    : isHovered
      ? 0.92
      : hasActiveSelection
        ? 0.22
        : 0.85;

  const tubeRadius = isSelected ? 0.088 : isHovered ? 0.078 : 0.065;

  // Arrowhead rotation aligned with tangent at 95% of the final curve
  const arrowRotation = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, lastTangent.clone().normalize());
    return q;
  }, [lastTangent]);

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
      {/* 1. Curved 3D Jump Tube Geometry Segments */}
      {segments.map((seg, idx) => (
        <mesh
          key={`seg-${idx}`}
          onClick={handleSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <tubeGeometry args={[seg.curve, 32, tubeRadius, 8, false]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.75 : isHovered ? 0.5 : 0.28}
            transparent
            opacity={lineOpacity}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* 2. Arrowhead Cone at 95% of the curve pointing towards landing block */}
      <mesh
        position={lastPoint}
        quaternion={arrowRotation}
        onClick={handleSelect}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <coneGeometry args={[0.18, 0.4, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : 0.35}
          transparent
          opacity={lineOpacity}
          roughness={0.2}
        />
      </mesh>

      {/* 3. Takeoff Ring on Start Block */}
      <group position={startSurface}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <ringGeometry
            args={[isHighlighted ? 0.18 : 0.14, isHighlighted ? 0.36 : 0.28, 28]}
          />
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
            transparent
            opacity={lineOpacity}
          />
        </mesh>
        {isHighlighted && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.12, 20]} />
            <meshBasicMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent
              opacity={0.45}
            />
          </mesh>
        )}
      </group>

      {/* 4. Landing Target Ring on Target Block */}
      <group position={endSurface}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <ringGeometry
            args={[isHighlighted ? 0.22 : 0.18, isHighlighted ? 0.42 : 0.34, 28]}
          />
          <meshBasicMaterial
            color={color}
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

      {/* 5. Floating <WorldHtml center> Pill Badge at the Apex of the Curve */}
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
            borderColor: isHighlighted ? color : undefined,
          }}
          className={`pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-tight backdrop-blur-md transition-all duration-200 ${
            isSelected
              ? 'scale-115 bg-zinc-950 text-white ring-2 ring-cyan-400'
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
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}`,
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

  // Filter APPROVED cuts of the active module matching current FilterState
  const visibleCuts = useMemo(() => {
    if (!selectedModuleId) return [];
    const selClean = selectedModuleId.trim().toLowerCase().replace(/^#+/, '');
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

  const draftTrajectory = useMemo(() => {
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

  const draftArrowRotation = useMemo(() => {
    if (!draftTrajectory) return null;
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, draftTrajectory.lastTangent.clone().normalize());
    return q;
  }, [draftTrajectory]);

  return (
    <group>
      {visibleCuts.map((cut) => (
        <SingleCutTrajectory
          key={cut.id}
          cut={cut}
          moduleBlocks={currentModule?.blocks || []}
          isSelected={selectedCutId === cut.id}
          isHovered={hoveredCutId === cut.id}
          hasActiveSelection={selectedCutId !== null}
          onSelect={selectCut}
          onHover={setHoveredCut}
        />
      ))}

      {/* Live Preview Curve when creating a new Cut in Submit mode */}
      {draftTrajectory && (
        <group>
          {draftTrajectory.segments.map((seg, idx) => (
            <mesh key={`draft-seg-${idx}`}>
              <tubeGeometry args={[seg.curve, 32, 0.08, 8, false]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#06b6d4"
                emissiveIntensity={0.8}
                transparent
                opacity={0.9}
                roughness={0.2}
              />
            </mesh>
          ))}

          {draftArrowRotation && (
            <mesh
              position={draftTrajectory.lastPoint}
              quaternion={draftArrowRotation}
            >
              <coneGeometry args={[0.18, 0.4, 12]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#06b6d4"
                emissiveIntensity={0.9}
                transparent
                opacity={0.9}
              />
            </mesh>
          )}

          <WorldHtml position={draftTrajectory.apex} center>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-cyan-500/90 border border-white/40 px-2.5 py-0.5 text-[11px] font-mono font-bold text-zinc-950 shadow-lg">
              NEUER CUT PREVIEW
            </div>
          </WorldHtml>
        </group>
      )}
    </group>
  );
};
