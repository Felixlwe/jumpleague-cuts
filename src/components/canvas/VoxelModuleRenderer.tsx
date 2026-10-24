'use client';

import React, { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { VoxelBlock, Vector3D } from '@/types/jumpleague';
import { useJLStore } from '@/store/useJLStore';
import { VOXEL_BLOCK_LABELS } from '@/constants/jumpleagueConfig';
import { WorldHtml } from '@/components/three/WorldHtml';
import { DraggableMidPoint } from '@/components/three/DraggableMidPoint';
import { useMinecraftBlockMaterial } from '@/lib/minecraftTextures';

function isSameCoord(a: Vector3D | null, b: Vector3D): boolean {
  if (!a) return false;
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

interface BlockStateParsed {
  facing: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  half: 'bottom' | 'top';
  slabType: 'bottom' | 'top' | 'double';
  isOpen: boolean;
}

function parseBlockState(
  block: VoxelBlock,
  blockMap: Map<string, VoxelBlock>
): BlockStateParsed {
  const { x, y, z } = block.position;

  // Auto-detect facing if not explicitly specified (e.g. for ladders/vines)
  let detectedFacing: 'north' | 'south' | 'east' | 'west' = 'north';
  if (blockMap.has(`${x},${y},${z + 1}`)) detectedFacing = 'north';
  else if (blockMap.has(`${x},${y},${z - 1}`)) detectedFacing = 'south';
  else if (blockMap.has(`${x + 1},${y},${z}`)) detectedFacing = 'west';
  else if (blockMap.has(`${x - 1},${y},${z}`)) detectedFacing = 'east';

  const rawFacing = (
    block.facing ||
    block.state?.facing ||
    block.properties?.facing ||
    detectedFacing
  )
    .toString()
    .toLowerCase();

  const facing = (
    ['north', 'south', 'east', 'west', 'up', 'down'].includes(rawFacing)
      ? rawFacing
      : detectedFacing
  ) as 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

  const rawHalf = (
    block.half ||
    block.state?.half ||
    block.properties?.half ||
    'bottom'
  )
    .toString()
    .toLowerCase();

  const half = rawHalf === 'top' ? 'top' : 'bottom';

  const rawSlabType = (
    block.slabType ||
    block.state?.type ||
    block.properties?.type ||
    (half === 'top' ? 'top' : 'bottom')
  )
    .toString()
    .toLowerCase();

  const slabType = (
    ['bottom', 'top', 'double'].includes(rawSlabType) ? rawSlabType : 'bottom'
  ) as 'bottom' | 'top' | 'double';

  const isOpen = Boolean(
    block.open ??
      (block.state?.open === true || block.state?.open === 'true') ??
      (block.properties?.open === true || block.properties?.open === 'true') ??
      false
  );

  return { facing, half, slabType, isOpen };
}

interface NeighborConnections {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

function getNeighborConnections(
  block: VoxelBlock,
  blockMap: Map<string, VoxelBlock>
): NeighborConnections {
  const { x, y, z } = block.position;

  const canConnectTo = (neighbor: VoxelBlock | undefined) => {
    if (!neighbor) return false;
    const t = neighbor.type.toUpperCase();
    if (
      t === 'AIR' ||
      t.includes('CARPET') ||
      t.includes('PRESSURE_PLATE') ||
      t.includes('LADDER') ||
      t.includes('VINE')
    ) {
      return false;
    }
    // Connects to fences, walls, bars, panes and any solid block
    return true;
  };

  return {
    north: canConnectTo(blockMap.get(`${x},${y},${z - 1}`)),
    south: canConnectTo(blockMap.get(`${x},${y},${z + 1}`)),
    east: canConnectTo(blockMap.get(`${x + 1},${y},${z}`)),
    west: canConnectTo(blockMap.get(`${x - 1},${y},${z}`)),
  };
}

interface SingleVoxelProps {
  block: VoxelBlock;
  blockMap: Map<string, VoxelBlock>;
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
  blockMap,
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
  const material = useMinecraftBlockMaterial(block.type);

  const blockState = useMemo(
    () => parseBlockState(block, blockMap),
    [block, blockMap]
  );
  const connections = useMemo(
    () => getNeighborConnections(block, blockMap),
    [block, blockMap]
  );

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
    if (e.button === 1) {
      e.stopPropagation();
      onPick(block.position, true);
    }
  };

  const blockTypeUpper = block.type.toUpperCase();

  // Determine top surface elevation for cut selection highlight plates
  const topSurfaceElevation = useMemo(() => {
    if (blockTypeUpper.endsWith('_SLAB')) {
      if (blockState.slabType === 'bottom') return 0.0;
      return 0.5;
    }
    if (
      blockTypeUpper.includes('CARPET') ||
      blockTypeUpper.includes('PRESSURE_PLATE')
    ) {
      return -0.4375;
    }
    if (blockTypeUpper.includes('TRAPDOOR') && !blockState.isOpen) {
      if (blockState.half === 'bottom') return -0.3125;
      return 0.5;
    }
    return 0.5;
  }, [blockTypeUpper, blockState]);

  const renderGeometryByType = () => {
    // 1. Slabs (_slab): 1 x 0.5 x 1 (bottom: y-0.25, top: y+0.25, double: 1x1x1)
    if (blockTypeUpper.endsWith('_SLAB')) {
      if (blockState.slabType === 'double') {
        return (
          <mesh material={material} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        );
      }
      const slabY = blockState.slabType === 'top' ? 0.25 : -0.25;
      return (
        <mesh position={[0, slabY, 0]} material={material} castShadow receiveShadow>
          <boxGeometry args={[1, 0.5, 1]} />
        </mesh>
      );
    }

    // 2. Stairs (_stairs): Basis-Slab (1 x 0.5 x 1) + halbe Stufe (1 x 0.5 x 0.5), rotated by facing and half
    if (blockTypeUpper.endsWith('_STAIRS')) {
      const isUpright = blockState.half === 'bottom';
      const baseY = isUpright ? -0.25 : 0.25;
      const stepY = isUpright ? 0.25 : -0.25;

      let stepPos: [number, number, number] = [0, stepY, 0.25];
      let stepSize: [number, number, number] = [1, 0.5, 0.5];

      if (blockState.facing === 'north') {
        stepPos = [0, stepY, 0.25];
        stepSize = [1, 0.5, 0.5];
      } else if (blockState.facing === 'south') {
        stepPos = [0, stepY, -0.25];
        stepSize = [1, 0.5, 0.5];
      } else if (blockState.facing === 'east') {
        stepPos = [-0.25, stepY, 0];
        stepSize = [0.5, 0.5, 1];
      } else if (blockState.facing === 'west') {
        stepPos = [0.25, stepY, 0];
        stepSize = [0.5, 0.5, 1];
      }

      return (
        <group>
          {/* Base half-slab */}
          <mesh position={[0, baseY, 0]} material={material} castShadow receiveShadow>
            <boxGeometry args={[1, 0.5, 1]} />
          </mesh>
          {/* Step block */}
          <mesh position={stepPos} material={material} castShadow receiveShadow>
            <boxGeometry args={stepSize} />
          </mesh>
        </group>
      );
    }

    // 3. Fences (_fence): Mittelpfosten (0.25 x 1 x 0.25) PLUS Verbindungsstreben zu Nachbarblöcken
    if (blockTypeUpper.endsWith('_FENCE')) {
      return (
        <group>
          {/* Mittelpfosten */}
          <mesh material={material} castShadow receiveShadow>
            <boxGeometry args={[0.25, 1, 0.25]} />
          </mesh>

          {/* North Streben (-Z) */}
          {connections.north && (
            <group>
              <mesh position={[0, 0.22, -0.25]} material={material} castShadow>
                <boxGeometry args={[0.125, 0.125, 0.5]} />
              </mesh>
              <mesh position={[0, -0.22, -0.25]} material={material} castShadow>
                <boxGeometry args={[0.125, 0.125, 0.5]} />
              </mesh>
            </group>
          )}

          {/* South Streben (+Z) */}
          {connections.south && (
            <group>
              <mesh position={[0, 0.22, 0.25]} material={material} castShadow>
                <boxGeometry args={[0.125, 0.125, 0.5]} />
              </mesh>
              <mesh position={[0, -0.22, 0.25]} material={material} castShadow>
                <boxGeometry args={[0.125, 0.125, 0.5]} />
              </mesh>
            </group>
          )}

          {/* East Streben (+X) */}
          {connections.east && (
            <group>
              <mesh position={[0.25, 0.22, 0]} material={material} castShadow>
                <boxGeometry args={[0.5, 0.125, 0.125]} />
              </mesh>
              <mesh position={[0.25, -0.22, 0]} material={material} castShadow>
                <boxGeometry args={[0.5, 0.125, 0.125]} />
              </mesh>
            </group>
          )}

          {/* West Streben (-X) */}
          {connections.west && (
            <group>
              <mesh position={[-0.25, 0.22, 0]} material={material} castShadow>
                <boxGeometry args={[0.5, 0.125, 0.125]} />
              </mesh>
              <mesh position={[-0.25, -0.22, 0]} material={material} castShadow>
                <boxGeometry args={[0.5, 0.125, 0.125]} />
              </mesh>
            </group>
          )}
        </group>
      );
    }

    // 4. Walls (_wall): Mittelpfosten (0.3125 x 1 x 0.3125) PLUS Verbindungsstreben
    if (blockTypeUpper.endsWith('_WALL')) {
      return (
        <group>
          <mesh material={material} castShadow receiveShadow>
            <boxGeometry args={[0.3125, 1, 0.3125]} />
          </mesh>
          {connections.north && (
            <mesh position={[0, 0, -0.25]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.875, 0.5]} />
            </mesh>
          )}
          {connections.south && (
            <mesh position={[0, 0, 0.25]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.875, 0.5]} />
            </mesh>
          )}
          {connections.east && (
            <mesh position={[0.25, 0, 0]} material={material} castShadow>
              <boxGeometry args={[0.5, 0.875, 0.25]} />
            </mesh>
          )}
          {connections.west && (
            <mesh position={[-0.25, 0, 0]} material={material} castShadow>
              <boxGeometry args={[0.5, 0.875, 0.25]} />
            </mesh>
          )}
        </group>
      );
    }

    // 5. Iron Bars & Glass Panes (iron_bars, _bars, _pane)
    if (
      blockTypeUpper === 'IRON_BARS' ||
      blockTypeUpper.endsWith('_BARS') ||
      blockTypeUpper.endsWith('_PANE')
    ) {
      const hasAnyConnection =
        connections.north ||
        connections.south ||
        connections.east ||
        connections.west;

      return (
        <group>
          <mesh material={material} castShadow receiveShadow>
            <boxGeometry args={[0.125, 1, 0.125]} />
          </mesh>
          {!hasAnyConnection ? (
            // Isolated post cross
            <group>
              <mesh material={material} castShadow>
                <boxGeometry args={[0.125, 1, 0.875]} />
              </mesh>
              <mesh material={material} castShadow>
                <boxGeometry args={[0.875, 1, 0.125]} />
              </mesh>
            </group>
          ) : (
            // Dynamic neighbor connections
            <group>
              {connections.north && (
                <mesh position={[0, 0, -0.25]} material={material} castShadow>
                  <boxGeometry args={[0.125, 1, 0.5]} />
                </mesh>
              )}
              {connections.south && (
                <mesh position={[0, 0, 0.25]} material={material} castShadow>
                  <boxGeometry args={[0.125, 1, 0.5]} />
                </mesh>
              )}
              {connections.east && (
                <mesh position={[0.25, 0, 0]} material={material} castShadow>
                  <boxGeometry args={[0.5, 1, 0.125]} />
                </mesh>
              )}
              {connections.west && (
                <mesh position={[-0.25, 0, 0]} material={material} castShadow>
                  <boxGeometry args={[0.5, 1, 0.125]} />
                </mesh>
              )}
            </group>
          )}
        </group>
      );
    }

    // 6. Ladders & Vines: Flache Box (1 x 1 x 0.0625), je nach facing an der Kante
    if (blockTypeUpper === 'LADDER' || blockTypeUpper === 'VINE') {
      let ladderPos: [number, number, number] = [0, 0, 0.46875];
      let ladderSize: [number, number, number] = [1, 1, 0.0625];

      if (blockState.facing === 'north') {
        ladderPos = [0, 0, 0.46875];
        ladderSize = [1, 1, 0.0625];
      } else if (blockState.facing === 'south') {
        ladderPos = [0, 0, -0.46875];
        ladderSize = [1, 1, 0.0625];
      } else if (blockState.facing === 'west') {
        ladderPos = [0.46875, 0, 0];
        ladderSize = [0.0625, 1, 1];
      } else if (blockState.facing === 'east') {
        ladderPos = [-0.46875, 0, 0];
        ladderSize = [0.0625, 1, 1];
      }

      return (
        <mesh position={ladderPos} material={material} castShadow>
          <boxGeometry args={ladderSize} />
        </mesh>
      );
    }

    // 7. Trapdoors (_trapdoor): 1 x 0.1875 x 1 (closed) bzw. hochgeklappt 1 x 1 x 0.1875 (open)
    if (blockTypeUpper.endsWith('_TRAPDOOR') || blockTypeUpper === 'TRAPDOOR') {
      if (!blockState.isOpen) {
        // Closed horizontal trapdoor
        const trapdoorY = blockState.half === 'top' ? 0.40625 : -0.40625;
        return (
          <mesh
            position={[0, trapdoorY, 0]}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1, 0.1875, 1]} />
          </mesh>
        );
      }

      // Open vertical trapdoor resting against edge
      let openPos: [number, number, number] = [0, 0, 0.40625];
      let openSize: [number, number, number] = [1, 1, 0.1875];

      if (blockState.facing === 'north') {
        openPos = [0, 0, 0.40625];
        openSize = [1, 1, 0.1875];
      } else if (blockState.facing === 'south') {
        openPos = [0, 0, -0.40625];
        openSize = [1, 1, 0.1875];
      } else if (blockState.facing === 'west') {
        openPos = [0.40625, 0, 0];
        openSize = [0.1875, 1, 1];
      } else if (blockState.facing === 'east') {
        openPos = [-0.40625, 0, 0];
        openSize = [0.1875, 1, 1];
      }

      return (
        <mesh position={openPos} material={material} castShadow receiveShadow>
          <boxGeometry args={openSize} />
        </mesh>
      );
    }

    // 8. Carpets & Pressure Plates: Flache 1 x 0.0625 x 1 Box am Boden
    if (
      blockTypeUpper.endsWith('_CARPET') ||
      blockTypeUpper === 'CARPET' ||
      blockTypeUpper.endsWith('_PRESSURE_PLATE') ||
      blockTypeUpper === 'PRESSURE_PLATE'
    ) {
      const isPressurePlate = blockTypeUpper.includes('PRESSURE_PLATE');
      const boxWidth = isPressurePlate ? 0.8 : 1;
      const boxDepth = isPressurePlate ? 0.8 : 1;

      return (
        <mesh
          position={[0, -0.46875, 0]}
          material={material}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[boxWidth, 0.0625, boxDepth]} />
        </mesh>
      );
    }

    // 9. Cobwebs: Diagonal gekreuzte Ebenen (X-Form)
    if (blockTypeUpper === 'COBWEB' || blockTypeUpper === 'WEB') {
      return (
        <group>
          <mesh rotation={[0, Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </group>
      );
    }

    // 10. Standard Full 1 x 1 x 1 Block
    return (
      <mesh material={material} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    );
  };

  const blockLabel = VOXEL_BLOCK_LABELS[block.type] || block.type;

  return (
    <group
      position={[x, y, z]}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Invisible 1x1x1 Hitbox: Guarantees full clickability across thin slabs, fences, ladders and air */}
      <mesh visible={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>

      {/* 1:1 Minecraft Accurate Rendered Geometry */}
      {renderGeometryByType()}

      {/* Highlight plate when a Cut is selected */}
      {(isSelectedCutStart || isSelectedCutEnd) && !isSubmitMode && (
        <mesh position={[0, topSurfaceElevation + 0.02, 0]}>
          <boxGeometry args={[1.06, 0.04, 1.06]} />
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
              {blockLabel} ({x}, {y}, {z})
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

export const VoxelModuleRenderer: React.FC = () => {
  const modules = useJLStore((s) => s.modules);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const cuts = useJLStore((s) => s.cuts);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const activeMode = useJLStore((s) => s.activeMode);
  const hoveredBlock = useJLStore((s) => s.hoveredBlock);
  const draftStartBlock = useJLStore((s) => s.draftStartBlock);
  const draftMidPoints = useJLStore((s) => s.draftMidPoints);
  const activeDraftMidPointIndex = useJLStore(
    (s) => s.activeDraftMidPointIndex
  );
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

  // O(1) Fast Spatial Lookup for neighbor connectivity and auto-facing
  const blockMap = useMemo(() => {
    const map = new Map<string, VoxelBlock>();
    for (const b of currentModule.blocks) {
      map.set(`${b.position.x},${b.position.y},${b.position.z}`, b);
    }
    return map;
  }, [currentModule.blocks]);

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
            blockMap={blockMap}
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

export { VoxelModuleRenderer as VoxelRenderer };
