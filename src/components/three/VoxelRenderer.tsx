'use client';

import React, { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { VoxelBlock, Vector3D } from '@/types/jumpleague';
import { useJLStore } from '@/store/useJLStore';
import { VOXEL_BLOCK_LABELS } from '@/constants/jumpleagueConfig';
import { WorldHtml } from './WorldHtml';
import { DraggableMidPoint } from './DraggableMidPoint';

function isSameCoord(a: Vector3D | null, b: Vector3D): boolean {
  if (!a) return false;
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

interface SingleVoxelProps {
  block: VoxelBlock;
  isSubmitMode: boolean;
  isHovered: boolean;
  isDraftStart: boolean;
  isDraftEnd: boolean;
  isSelectedCutStart: boolean;
  isSelectedCutEnd: boolean;
  onHover: (pos: Vector3D | null) => void;
  onPick: (pos: Vector3D, forceMidPoint?: boolean) => void;
}

const SingleVoxel: React.FC<SingleVoxelProps> = ({
  block,
  isSubmitMode,
  isHovered,
  isDraftStart,
  isDraftEnd,
  isSelectedCutStart,
  isSelectedCutEnd,
  onHover,
  onPick,
}) => {
  const { x, y, z } = block.position;

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isSubmitMode) return;
    e.stopPropagation();
    onHover(block.position);
    document.body.style.cursor = 'crosshair';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (!isSubmitMode) return;
    e.stopPropagation();
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isSubmitMode) return;
    e.stopPropagation();
    onPick(block.position, e.shiftKey);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isSubmitMode) return;
    // Middle mouse button (button === 1) places a midPoint in the air
    if (e.button === 1) {
      e.stopPropagation();
      onPick(block.position, true);
    }
  };

  const renderGeometryByType = () => {
    switch (block.type) {
      case 'OAK_SLAB':
        return (
          <mesh
            position={[0, -0.25, 0]}
            castShadow
            receiveShadow
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <boxGeometry args={[1, 0.5, 1]} />
            <meshStandardMaterial
              color="#b47b44"
              roughness={0.75}
              metalness={0.08}
            />
            <Edges threshold={15} color="#45270d" />
          </mesh>
        );

      case 'OAK_FENCE':
        return (
          <group
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.28, 1, 0.28]} />
              <meshStandardMaterial
                color="#8c5a2b"
                roughness={0.8}
                metalness={0.05}
              />
              <Edges threshold={15} color="#3b230d" />
            </mesh>
            <mesh position={[0, 0.22, 0]} castShadow>
              <boxGeometry args={[0.42, 0.12, 0.14]} />
              <meshStandardMaterial color="#784b21" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.18, 0]} castShadow>
              <boxGeometry args={[0.42, 0.12, 0.14]} />
              <meshStandardMaterial color="#784b21" roughness={0.85} />
            </mesh>
          </group>
        );

      case 'IRON_BARS':
        return (
          <group
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.14, 1, 0.92]} />
              <meshStandardMaterial
                color="#94a3b8"
                roughness={0.3}
                metalness={0.85}
              />
              <Edges threshold={15} color="#cbd5e1" />
            </mesh>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.92, 1, 0.14]} />
              <meshStandardMaterial
                color="#94a3b8"
                roughness={0.3}
                metalness={0.85}
              />
              <Edges threshold={15} color="#cbd5e1" />
            </mesh>
          </group>
        );

      case 'LADDER':
        return (
          <group
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <mesh visible={false}>
              <boxGeometry args={[0.85, 1, 0.35]} />
            </mesh>
            <mesh position={[-0.32, 0, 0.35]} castShadow>
              <boxGeometry args={[0.1, 1, 0.1]} />
              <meshStandardMaterial color="#a16207" roughness={0.75} />
            </mesh>
            <mesh position={[0.32, 0, 0.35]} castShadow>
              <boxGeometry args={[0.1, 1, 0.1]} />
              <meshStandardMaterial color="#a16207" roughness={0.75} />
            </mesh>
            {[-0.3, 0, 0.3].map((rungY, idx) => (
              <mesh key={idx} position={[0, rungY, 0.35]} castShadow>
                <boxGeometry args={[0.72, 0.09, 0.08]} />
                <meshStandardMaterial color="#ca8a04" roughness={0.7} />
              </mesh>
            ))}
          </group>
        );

      case 'GOLD_BLOCK':
        return (
          <mesh
            castShadow
            receiveShadow
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#facc15"
              emissive="#ca8a04"
              emissiveIntensity={0.35}
              roughness={0.25}
              metalness={0.75}
            />
            <Edges threshold={15} color="#fef08a" />
          </mesh>
        );

      case 'EMERALD_BLOCK':
        return (
          <mesh
            castShadow
            receiveShadow
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#059669"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
            <Edges threshold={15} color="#6ee7b7" />
          </mesh>
        );

      case 'OAK_PLANKS':
        return (
          <mesh
            castShadow
            receiveShadow
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#9a6536"
              roughness={0.78}
              metalness={0.05}
            />
            <Edges threshold={15} color="#45270d" />
          </mesh>
        );

      case 'STONE_BRICKS':
      default:
        return (
          <mesh
            castShadow
            receiveShadow
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#3f3f46"
              roughness={0.85}
              metalness={0.15}
            />
            <Edges threshold={15} color="#18181b" />
          </mesh>
        );
    }
  };

  return (
    <group position={[x, y, z]} onPointerDown={handlePointerDown}>
      {renderGeometryByType()}

      {/* Highlight plate when a Cut is selected */}
      {(isSelectedCutStart || isSelectedCutEnd) && !isSubmitMode && (
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[1.06, 0.05, 1.06]} />
          <meshBasicMaterial
            color={isSelectedCutStart ? '#06b6d4' : '#10b981'}
            transparent
            opacity={0.8}
          />
          <Edges
            color={isSelectedCutStart ? '#67e8f9' : '#6ee7b7'}
            threshold={1}
          />
        </mesh>
      )}

      {/* Raycast Hover Indicator (Glowing Frame) in Submit mode */}
      {isSubmitMode && isHovered && (
        <group>
          <mesh>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#22d3ee" />
          </mesh>
          <WorldHtml position={[0, 0.95, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-md bg-zinc-950/90 border border-cyan-400/50 px-2 py-0.5 text-[10px] font-mono text-cyan-300 shadow-lg">
              {VOXEL_BLOCK_LABELS[block.type]} ({x}, {y}, {z})
            </div>
          </WorldHtml>
        </group>
      )}

      {/* Submit Mode Draft Start / End Markers */}
      {isSubmitMode && isDraftStart && (
        <group>
          <mesh>
            <boxGeometry args={[1.09, 1.09, 1.09]} />
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
              START ({x},{y},{z})
            </div>
          </WorldHtml>
        </group>
      )}

      {isSubmitMode && isDraftEnd && (
        <group>
          <mesh>
            <boxGeometry args={[1.09, 1.09, 1.09]} />
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
              ZIEL ({x},{y},{z})
            </div>
          </WorldHtml>
        </group>
      )}
    </group>
  );
};

export const VoxelRenderer: React.FC = () => {
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
  const setActiveDraftMidPointIndex = useJLStore(
    (s) => s.setActiveDraftMidPointIndex
  );
  const updateDraftMidPoint = useJLStore((s) => s.updateDraftMidPoint);

  const currentModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) ?? modules[0],
    [modules, selectedModuleId]
  );

  const selectedCut = useMemo(
    () => cuts.find((c) => c.id === selectedCutId) ?? null,
    [cuts, selectedCutId]
  );

  const isSubmitMode = activeMode === 'SUBMIT';

  return (
    <group>
      {currentModule.blocks.map((block, index) => {
        const key = `${block.position.x}-${block.position.y}-${block.position.z}-${index}`;
        const isHovered = isSameCoord(hoveredBlock, block.position);
        const isDraftStart = isSameCoord(draftStartBlock, block.position);
        const isDraftEnd = isSameCoord(draftEndBlock, block.position);
        const isSelectedCutStart =
          selectedCut !== null &&
          isSameCoord(selectedCut.startBlock, block.position);
        const isSelectedCutEnd =
          selectedCut !== null &&
          isSameCoord(selectedCut.endBlock, block.position);

        return (
          <SingleVoxel
            key={key}
            block={block}
            isSubmitMode={isSubmitMode}
            isHovered={isHovered}
            isDraftStart={isDraftStart}
            isDraftEnd={isDraftEnd}
            isSelectedCutStart={isSelectedCutStart}
            isSelectedCutEnd={isSelectedCutEnd}
            onHover={setHoveredBlock}
            onPick={pickBlockInScene}
          />
        );
      })}

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
