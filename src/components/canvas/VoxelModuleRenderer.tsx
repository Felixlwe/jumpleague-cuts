'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { VoxelBlock, Vector3D } from '@/types/jumpleague';
import { useJLStore } from '@/store/useJLStore';
import { VOXEL_BLOCK_LABELS } from '@/constants/jumpleagueConfig';
import { WorldHtml } from '@/components/three/WorldHtml';
import { DraggableMidPoint } from '@/components/three/DraggableMidPoint';
import {
  useMinecraftBlockMaterial,
  getMinecraftBlockMaterial,
} from '@/lib/minecraftTextures';
import {
  useMcmeta,
  buildBlockGeometry,
  getAtlasMaterial,
  parseBlockIdentifier,
  NeighborSolidMap,
  McmetaData,
} from '@/lib/mcmetaLoader';

function isSameCoord(a: Vector3D | null, b: Vector3D): boolean {
  if (!a) return false;
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

interface BlockStateParsed {
  facing: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  half: 'bottom' | 'top';
  slabType: 'bottom' | 'top' | 'double';
  isOpen: boolean;
  rotation: number;
  axis: 'x' | 'y' | 'z';
  face: 'floor' | 'ceiling' | 'wall';
  vine: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
    up: boolean;
  };
}

function parseBlockState(
  block: VoxelBlock,
  blockMap: Map<string, VoxelBlock>
): BlockStateParsed {
  const { x, y, z } = block.position;

  // Auto-detect facing if not explicitly specified (e.g. for ladders)
  let detectedFacing: 'north' | 'south' | 'east' | 'west' = 'north';
  if (blockMap.has(`${x},${y},${z + 1}`)) detectedFacing = 'north';
  else if (blockMap.has(`${x},${y},${z - 1}`)) detectedFacing = 'south';
  else if (blockMap.has(`${x + 1},${y},${z}`)) detectedFacing = 'west';
  else if (blockMap.has(`${x - 1},${y},${z}`)) detectedFacing = 'east';

  const parsedId = parseBlockIdentifier(block.type);
  const rawProps: Record<string, any> = {
    ...parsedId.props,
    ...(block.properties || {}),
    ...(block.state || {}),
  };

  const rawFacing = (
    block.facing ||
    rawProps.facing ||
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
    rawProps.half ||
    'bottom'
  )
    .toString()
    .toLowerCase();

  const half = rawHalf === 'top' ? 'top' : 'bottom';

  const rawSlabType = (
    block.slabType ||
    rawProps.type ||
    (half === 'top' ? 'top' : 'bottom')
  )
    .toString()
    .toLowerCase();

  const slabType = (
    ['bottom', 'top', 'double'].includes(rawSlabType) ? rawSlabType : 'bottom'
  ) as 'bottom' | 'top' | 'double';

  const isOpen = Boolean(
    block.open ??
      (rawProps.open === true || rawProps.open === 'true') ??
      false
  );

  const rotation = Number(rawProps.rotation ?? 0) || 0;
  const rawAxis = String(rawProps.axis || 'y').toLowerCase();
  const axis = (['x', 'y', 'z'].includes(rawAxis) ? rawAxis : 'y') as
    | 'x'
    | 'y'
    | 'z';
  const rawFace = String(rawProps.face || 'wall').toLowerCase();
  const face = (['floor', 'ceiling', 'wall'].includes(rawFace)
    ? rawFace
    : 'wall') as 'floor' | 'ceiling' | 'wall';

  const isValTrue = (key: string): boolean => {
    const v = rawProps[key];
    return v === true || v === 'true' || v === 1 || v === '1';
  };

  let vineNorth = isValTrue('north');
  let vineSouth = isValTrue('south');
  let vineEast = isValTrue('east');
  let vineWest = isValTrue('west');
  let vineUp = isValTrue('up');

  // Fallback to adjacent neighbor blocks if all boolean properties are false
  if (!vineNorth && !vineSouth && !vineEast && !vineWest && !vineUp) {
    if (blockMap.has(`${x},${y},${z - 1}`)) vineNorth = true;
    else if (blockMap.has(`${x},${y},${z + 1}`)) vineSouth = true;
    else if (blockMap.has(`${x + 1},${y},${z}`)) vineEast = true;
    else if (blockMap.has(`${x - 1},${y},${z}`)) vineWest = true;
    else if (blockMap.has(`${x},${y + 1},${z}`)) vineUp = true;
    else {
      vineNorth = true;
    }
  }

  return {
    facing,
    half,
    slabType,
    isOpen,
    rotation,
    axis,
    face,
    vine: {
      north: vineNorth,
      south: vineSouth,
      east: vineEast,
      west: vineWest,
      up: vineUp,
    },
  };
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

const voxelGeometryCache = new Map<string, THREE.BufferGeometry>();

/**
 * Creates or retrieves a cached BoxGeometry with proportional UV mapping
 * so textures are not stretched or distorted on thin/irregular voxels.
 */
function getVoxelBoxGeometry(
  width: number,
  height: number,
  depth: number,
  vOffset: number = 0
): THREE.BufferGeometry {
  const key = `${width}_${height}_${depth}_${vOffset}`;
  const existing = voxelGeometryCache.get(key);
  if (existing) return existing;

  const geo = new THREE.BoxGeometry(width, height, depth);
  const uvs = geo.attributes.uv;
  const uvArray = uvs.array as Float32Array;

  const faceDims: [number, number][] = [
    [depth, height], // Face 0: +X (Right)
    [depth, height], // Face 1: -X (Left)
    [width, depth],  // Face 2: +Y (Top)
    [width, depth],  // Face 3: -Y (Bottom)
    [width, height], // Face 4: +Z (Front)
    [width, height], // Face 5: -Z (Back)
  ];

  for (let face = 0; face < 6; face++) {
    const [fw, fh] = faceDims[face];
    const offset = face * 8;
    const vMin = vOffset;
    const vMax = vOffset + Math.min(1, fh);
    const uMin = 0;
    const uMax = Math.min(1, fw);

    uvArray[offset + 0] = uMin;
    uvArray[offset + 1] = vMax;
    uvArray[offset + 2] = uMax;
    uvArray[offset + 3] = vMax;
    uvArray[offset + 4] = uMin;
    uvArray[offset + 5] = vMin;
    uvArray[offset + 6] = uMax;
    uvArray[offset + 7] = vMin;
  }

  uvs.needsUpdate = true;
  voxelGeometryCache.set(key, geo);
  return geo;
}

interface SingleVoxelProps {
  block: VoxelBlock;
  blockMap: Map<string, VoxelBlock>;
  mcmeta: McmetaData | null;
  atlasMaterial: THREE.MeshLambertMaterial | null;
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
  mcmeta,
  atlasMaterial,
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

  const parsedId = useMemo(
    () => parseBlockIdentifier(block.type),
    [block.type]
  );
  const blockTypeUpper = useMemo(
    () => parsedId.name.toUpperCase(),
    [parsedId.name]
  );

  const neighborSolidMap = useMemo<NeighborSolidMap>(() => {
    const isSolidBlock = (b?: VoxelBlock) => {
      if (!b) return false;
      const t = b.type.toUpperCase();
      return !(
        t.includes('AIR') ||
        t.includes('BARRIER') ||
        t.includes('STRUCTURE_VOID') ||
        t.includes('LIGHT') ||
        t.includes('CARPET') ||
        t.includes('PRESSURE_PLATE') ||
        t.includes('VINE') ||
        t.includes('LADDER')
      );
    };

    return {
      north: isSolidBlock(blockMap.get(`${x},${y},${z - 1}`)),
      south: isSolidBlock(blockMap.get(`${x},${y},${z + 1}`)),
      east: isSolidBlock(blockMap.get(`${x + 1},${y},${z}`)),
      west: isSolidBlock(blockMap.get(`${x - 1},${y},${z}`)),
      up: isSolidBlock(blockMap.get(`${x},${y + 1},${z}`)),
    };
  }, [blockMap, x, y, z]);

  const blockGeometry = useMemo(() => {
    if (!mcmeta) return null;
    return buildBlockGeometry(block.type, neighborSolidMap, mcmeta);
  }, [block.type, neighborSolidMap, mcmeta]);

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

  const isAirOrBarrier =
    blockTypeUpper === 'BARRIER' ||
    blockTypeUpper === 'STRUCTURE_VOID' ||
    blockTypeUpper === 'LIGHT' ||
    blockTypeUpper === 'AIR' ||
    blockTypeUpper === 'CAVE_AIR' ||
    blockTypeUpper === 'VOID_AIR';

  if (isAirOrBarrier) {
    const hasCutHighlight =
      (isSelectedCutStart || isSelectedCutEnd) && !isSubmitMode;
    if (!isSubmitMode && !hasCutHighlight) return null;

    return (
      <group
        position={[x, y, z]}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {isSubmitMode && (
          <mesh visible={false}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        )}
        {hasCutHighlight && (
          <mesh position={[0, 0.52, 0]}>
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
      </group>
    );
  }

  // Determine top surface elevation for cut selection highlight plates
  const topSurfaceElevation = useMemo(() => {
    if (blockTypeUpper.endsWith('_SLAB') || blockTypeUpper === 'SLAB') {
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
    if (blockTypeUpper.includes('HEAD') || blockTypeUpper.includes('SKULL')) {
      return 0.0;
    }
    if (blockTypeUpper.includes('DAYLIGHT')) {
      return -0.125;
    }
    if (
      blockTypeUpper.includes('REPEATER') ||
      blockTypeUpper.includes('COMPARATOR')
    ) {
      return -0.375;
    }
    if (blockTypeUpper.includes('CHEST')) {
      return 0.375;
    }
    if (blockTypeUpper === 'LEVER') {
      return -0.21875;
    }
    if (blockTypeUpper.endsWith('_BED') || blockTypeUpper === 'BED') {
      return 0.0625;
    }
    if (blockTypeUpper === 'CAKE') {
      return 0.0;
    }
    if (blockTypeUpper === 'END_PORTAL_FRAME') {
      return 0.3125;
    }
    if (blockTypeUpper.includes('CAMPFIRE')) {
      return -0.25;
    }
    if (blockTypeUpper === 'FLOWER_POT') {
      return -0.125;
    }
    // Ambosse, Zäune, Mauern, Treppen & Vollblöcke haben Oberfläche bei y = 0.5
    return 0.5;
  }, [blockTypeUpper, blockState]);

  const renderGeometryByType = () => {
    // 0. Ambosse (_anvil, anvil, chipped_anvil, damaged_anvil): Detailreiches 3D-Modell mit Fuß, Hals & Kopf
    if (blockTypeUpper.includes('ANVIL')) {
      const isNorthSouth =
        blockState.facing === 'north' || blockState.facing === 'south';

      const baseW = isNorthSouth ? 0.75 : 0.625;
      const baseD = isNorthSouth ? 0.625 : 0.75;
      const neckW = isNorthSouth ? 0.25 : 0.5;
      const neckD = isNorthSouth ? 0.5 : 0.25;
      const headW = isNorthSouth ? 0.625 : 1.0;
      const headD = isNorthSouth ? 1.0 : 0.625;

      const bodyMat = getMinecraftBlockMaterial('anvil');

      return (
        <group>
          {/* Amboss-Fußplatte */}
          <mesh
            position={[0, -0.375, 0]}
            geometry={getVoxelBoxGeometry(baseW, 0.25, baseD)}
            material={bodyMat}
            castShadow
            receiveShadow
          />
          {/* Amboss-Taille / Steg */}
          <mesh
            position={[0, -0.09375, 0]}
            geometry={getVoxelBoxGeometry(neckW, 0.3125, neckD)}
            material={bodyMat}
            castShadow
          />
          {/* Amboss-Kopf mit Schlagfläche (Top-Texture) */}
          <mesh
            position={[0, 0.28125, 0]}
            geometry={getVoxelBoxGeometry(headW, 0.4375, headD)}
            material={material}
            castShadow
            receiveShadow
          />
        </group>
      );
    }

    // 1. Hebel (Lever): Echtes 3D-Modell mit Cobblestone-Sockel und Holzhebel nach Ausrichtung
    if (blockTypeUpper === 'LEVER') {
      const cobbleMat = getMinecraftBlockMaterial('cobblestone');
      let basePos: [number, number, number] = [0, -0.40625, 0];
      let baseArgs: [number, number, number] = [0.3125, 0.1875, 0.4375];
      let leverPos: [number, number, number] = [0, -0.22, 0];
      let leverRot: [number, number, number] = [0.55, 0, 0];

      if (blockState.face === 'ceiling') {
        basePos = [0, 0.40625, 0];
        baseArgs = [0.3125, 0.1875, 0.4375];
        leverPos = [0, 0.22, 0];
        leverRot = [-0.55, 0, 0];
      } else if (
        blockState.face === 'wall' ||
        ['north', 'south', 'east', 'west'].includes(blockState.facing)
      ) {
        if (blockState.facing === 'north') {
          basePos = [0, 0, 0.40625];
          baseArgs = [0.3125, 0.4375, 0.1875];
          leverPos = [0, 0.12, 0.22];
          leverRot = [-0.55, 0, 0];
        } else if (blockState.facing === 'south') {
          basePos = [0, 0, -0.40625];
          baseArgs = [0.3125, 0.4375, 0.1875];
          leverPos = [0, 0.12, -0.22];
          leverRot = [0.55, 0, 0];
        } else if (blockState.facing === 'west') {
          basePos = [0.40625, 0, 0];
          baseArgs = [0.1875, 0.4375, 0.3125];
          leverPos = [0.22, 0.12, 0];
          leverRot = [0, 0, 0.55];
        } else if (blockState.facing === 'east') {
          basePos = [-0.40625, 0, 0];
          baseArgs = [0.1875, 0.4375, 0.3125];
          leverPos = [-0.22, 0.12, 0];
          leverRot = [0, 0, -0.55];
        }
      }

      return (
        <group>
          {/* Cobblestone Grundplatte */}
          <mesh
            position={basePos}
            geometry={getVoxelBoxGeometry(baseArgs[0], baseArgs[1], baseArgs[2])}
            material={cobbleMat}
            castShadow
            receiveShadow
          />
          {/* 3D Hebelgriff mit Alpha-Textur */}
          <mesh
            position={leverPos}
            rotation={leverRot}
            geometry={getVoxelBoxGeometry(0.0625, 0.45, 0.0625)}
            material={material}
            castShadow
          />
        </group>
      );
    }

    // 2. Korallenfächer (_coral_fan / _fan): Flache Fächer auf Boden oder an Wänden
    const isCoralFan =
      blockTypeUpper.endsWith('_FAN') || blockTypeUpper.includes('CORAL_FAN');
    if (isCoralFan) {
      return (
        <mesh
          position={[0, -0.4375, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={material}
        >
          <planeGeometry args={[0.75, 0.75]} />
        </mesh>
      );
    }

    // 3. Korallen, Gestrüpp (Dead Bush), Setzlinge, Blumen, Pilze & Pflanzen: Gekreuzte Ebenen (X-Form)
    const isPlantOrCoral =
      blockTypeUpper.includes('CORAL') ||
      blockTypeUpper === 'DEAD_BUSH' ||
      blockTypeUpper.includes('SAPLING') ||
      blockTypeUpper.includes('FLOWER') ||
      blockTypeUpper.includes('TULIP') ||
      blockTypeUpper.includes('ORCHID') ||
      blockTypeUpper.includes('DAISY') ||
      blockTypeUpper.includes('ALLIUM') ||
      blockTypeUpper.includes('DANDELION') ||
      blockTypeUpper.includes('POPPY') ||
      blockTypeUpper.includes('CORNFLOWER') ||
      blockTypeUpper.includes('LILY_OF_THE_VALLEY') ||
      blockTypeUpper.includes('WITHER_ROSE') ||
      blockTypeUpper.includes('SUNFLOWER') ||
      blockTypeUpper.includes('ROSE_BUSH') ||
      blockTypeUpper.includes('PEONY') ||
      blockTypeUpper.includes('LILAC') ||
      blockTypeUpper.includes('GRASS') ||
      blockTypeUpper.includes('FERN') ||
      blockTypeUpper.includes('MUSHROOM') ||
      blockTypeUpper.includes('FUNGUS') ||
      blockTypeUpper.includes('ROOTS') ||
      blockTypeUpper.includes('SPROUTS') ||
      blockTypeUpper === 'SUGAR_CANE';

    if (isPlantOrCoral) {
      return (
        <group position={[0, -0.05, 0]}>
          <mesh rotation={[0, Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[0.875, 0.875]} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[0.875, 0.875]} />
          </mesh>
        </group>
      );
    }

    // 4. Köpfe & Schädel (Player Head, Skeleton Skull, Creeper Head etc.): 8x8x8 Voxel-Würfel
    if (blockTypeUpper.includes('HEAD') || blockTypeUpper.includes('SKULL')) {
      const isWallHead =
        blockTypeUpper.includes('WALL') ||
        blockState.facing === 'north' ||
        blockState.facing === 'south' ||
        blockState.facing === 'east' ||
        blockState.facing === 'west';

      if (isWallHead && blockTypeUpper.includes('WALL')) {
        let headPos: [number, number, number] = [0, -0.15, 0.25];
        if (blockState.facing === 'north') headPos = [0, -0.15, 0.25];
        else if (blockState.facing === 'south') headPos = [0, -0.15, -0.25];
        else if (blockState.facing === 'west') headPos = [0.25, -0.15, 0];
        else if (blockState.facing === 'east') headPos = [-0.25, -0.15, 0];

        return (
          <mesh
            position={headPos}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
        );
      }

      const rotAngle =
        -(Number(blockState.rotation || 0) * 22.5) * (Math.PI / 180);

      return (
        <group rotation={[0, rotAngle, 0]}>
          <mesh
            position={[0, -0.25, 0]}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
        </group>
      );
    }

    // 5. Endstäbe (End Rod): 3D-Sockel mit leuchtendem Stab in beliebiger Ausrichtung
    if (blockTypeUpper === 'END_ROD') {
      let rodRot: [number, number, number] = [0, 0, 0];
      if (blockState.facing === 'down') rodRot = [Math.PI, 0, 0];
      else if (blockState.facing === 'north') rodRot = [-Math.PI / 2, 0, 0];
      else if (blockState.facing === 'south') rodRot = [Math.PI / 2, 0, 0];
      else if (blockState.facing === 'west') rodRot = [0, 0, Math.PI / 2];
      else if (blockState.facing === 'east') rodRot = [0, 0, -Math.PI / 2];

      return (
        <group rotation={rodRot}>
          {/* Sockelplatte */}
          <mesh position={[0, -0.46875, 0]} material={material}>
            <boxGeometry args={[0.25, 0.0625, 0.25]} />
          </mesh>
          {/* Leuchtender Stab */}
          <mesh position={[0, 0.03125, 0]} material={material}>
            <boxGeometry args={[0.125, 0.9375, 0.125]} />
          </mesh>
        </group>
      );
    }

    // 6. Laternen (Lantern & Soul Lantern): 3D-Körper mit Kappenring
    if (blockTypeUpper.includes('LANTERN')) {
      return (
        <group position={[0, -0.2, 0]}>
          {/* Laternenkörper */}
          <mesh material={material} castShadow>
            <boxGeometry args={[0.375, 0.4375, 0.375]} />
          </mesh>
          {/* Kappe / Kettenöse */}
          <mesh position={[0, 0.25, 0]} material={material}>
            <boxGeometry args={[0.1875, 0.125, 0.1875]} />
          </mesh>
        </group>
      );
    }

    // 7. Fackeln (Torch, Soul Torch, Redstone Torch)
    if (blockTypeUpper.includes('TORCH')) {
      const isWallTorch = blockTypeUpper.includes('WALL');
      let torchPos: [number, number, number] = [0, -0.1875, 0];
      let torchRot: [number, number, number] = [0, 0, 0];
      if (isWallTorch) {
        if (blockState.facing === 'north') {
          torchPos = [0, 0, 0.35];
          torchRot = [-0.35, 0, 0];
        } else if (blockState.facing === 'south') {
          torchPos = [0, 0, -0.35];
          torchRot = [0.35, 0, 0];
        } else if (blockState.facing === 'west') {
          torchPos = [0.35, 0, 0];
          torchRot = [0, 0, 0.35];
        } else if (blockState.facing === 'east') {
          torchPos = [-0.35, 0, 0];
          torchRot = [0, 0, -0.35];
        }
      }
      return (
        <mesh position={torchPos} rotation={torchRot} material={material}>
          <boxGeometry args={[0.125, 0.625, 0.125]} />
        </mesh>
      );
    }

    // 8. Ketten (Chain / Iron Chain): 3D Kette mit Achsenausrichtung (x, y, z)
    if (blockTypeUpper.includes('CHAIN')) {
      let chainSize: [number, number, number] = [0.1875, 1, 0.1875];
      if (blockState.axis === 'x') chainSize = [1, 0.1875, 0.1875];
      else if (blockState.axis === 'z') chainSize = [0.1875, 0.1875, 1];

      return (
        <mesh material={material}>
          <boxGeometry args={chainSize} />
        </mesh>
      );
    }

    // 9. Blumentopf (Flower Pot)
    if (blockTypeUpper === 'FLOWER_POT') {
      return (
        <mesh position={[0, -0.3125, 0]} material={material}>
          <boxGeometry args={[0.375, 0.375, 0.375]} />
        </mesh>
      );
    }

    // 10. Tageslichtsensor (Daylight Detector)
    if (blockTypeUpper.includes('DAYLIGHT')) {
      return (
        <mesh
          position={[0, -0.3125, 0]}
          material={material}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 0.375, 1]} />
        </mesh>
      );
    }

    // 11. Redstone-Verstärker & Komparator
    if (
      blockTypeUpper.includes('REPEATER') ||
      blockTypeUpper.includes('COMPARATOR')
    ) {
      return (
        <group position={[0, -0.4375, 0]}>
          <mesh material={material} castShadow receiveShadow>
            <boxGeometry args={[1, 0.125, 1]} />
          </mesh>
        </group>
      );
    }

    // 12. Knöpfe (Button): 3D-Knopf an Wand, Decke oder Boden
    if (blockTypeUpper.endsWith('_BUTTON') || blockTypeUpper === 'BUTTON') {
      let btnPos: [number, number, number] = [0, -0.425, 0];
      let btnArgs: [number, number, number] = [0.3, 0.15, 0.25];

      if (blockState.face === 'ceiling') {
        btnPos = [0, 0.425, 0];
        btnArgs = [0.3, 0.15, 0.25];
      } else if (
        blockState.face === 'wall' ||
        ['north', 'south', 'east', 'west'].includes(blockState.facing)
      ) {
        if (blockState.facing === 'north') {
          btnPos = [0, 0, 0.425];
          btnArgs = [0.3, 0.25, 0.15];
        } else if (blockState.facing === 'south') {
          btnPos = [0, 0, -0.425];
          btnArgs = [0.3, 0.25, 0.15];
        } else if (blockState.facing === 'west') {
          btnPos = [0.425, 0, 0];
          btnArgs = [0.15, 0.25, 0.3];
        } else if (blockState.facing === 'east') {
          btnPos = [-0.425, 0, 0];
          btnArgs = [0.15, 0.25, 0.3];
        }
      }

      return (
        <mesh position={btnPos} material={material} castShadow>
          <boxGeometry args={btnArgs} />
        </mesh>
      );
    }

    // 13. Truhen (Chest, Ender Chest, Trapped Chest)
    if (blockTypeUpper.includes('CHEST')) {
      return (
        <mesh
          position={[0, -0.0625, 0]}
          material={material}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.875, 0.875, 0.875]} />
        </mesh>
      );
    }

    // 13a. Betten (_bed, bed): 3D-Bettmatratze
    if (blockTypeUpper.endsWith('_BED') || blockTypeUpper === 'BED') {
      return (
        <group>
          <mesh
            position={[0, -0.21875, 0]}
            geometry={getVoxelBoxGeometry(1, 0.5625, 1)}
            material={material}
            castShadow
            receiveShadow
          />
        </group>
      );
    }

    // 13b. Türen (_door, door)
    if (
      (blockTypeUpper.endsWith('_DOOR') || blockTypeUpper === 'DOOR') &&
      !blockTypeUpper.includes('TRAPDOOR')
    ) {
      let doorPos: [number, number, number] = [0, 0, -0.40625];
      let doorSize: [number, number, number] = [1, 1, 0.1875];
      if (blockState.facing === 'north') {
        doorPos = [0, 0, -0.40625];
        doorSize = [1, 1, 0.1875];
      } else if (blockState.facing === 'south') {
        doorPos = [0, 0, 0.40625];
        doorSize = [1, 1, 0.1875];
      } else if (blockState.facing === 'west') {
        doorPos = [-0.40625, 0, 0];
        doorSize = [0.1875, 1, 1];
      } else if (blockState.facing === 'east') {
        doorPos = [0.40625, 0, 0];
        doorSize = [0.1875, 1, 1];
      }
      return (
        <mesh
          position={doorPos}
          geometry={getVoxelBoxGeometry(doorSize[0], doorSize[1], doorSize[2])}
          material={material}
          castShadow
          receiveShadow
        />
      );
    }

    // 13c. Schilder & Hängeschilder (_sign)
    if (blockTypeUpper.includes('SIGN')) {
      const isWallSign =
        blockTypeUpper.includes('WALL') ||
        blockTypeUpper.includes('WALL_SIGN') ||
        blockTypeUpper.includes('WALL_HANGING_SIGN');

      if (isWallSign) {
        let signPos: [number, number, number] = [0, 0.05, 0.46];
        let signArgs: [number, number, number] = [0.875, 0.5, 0.04];

        if (blockState.facing === 'north') {
          signPos = [0, 0.05, 0.46];
          signArgs = [0.875, 0.5, 0.04];
        } else if (blockState.facing === 'south') {
          signPos = [0, 0.05, -0.46];
          signArgs = [0.875, 0.5, 0.04];
        } else if (blockState.facing === 'west') {
          signPos = [0.46, 0.05, 0];
          signArgs = [0.04, 0.5, 0.875];
        } else if (blockState.facing === 'east') {
          signPos = [-0.46, 0.05, 0];
          signArgs = [0.04, 0.5, 0.875];
        }

        return (
          <mesh position={signPos} material={material} castShadow>
            <boxGeometry args={signArgs} />
          </mesh>
        );
      }

      // Stehende Schilder (_sign): Pfahl ([0.1, 0.55, 0.1] bei y = -0.22) und Schild ([1.0, 0.5, 0.08] bei y = +0.15)
      const rotAngle =
        -(Number(blockState.rotation || 0) * 22.5) * (Math.PI / 180);

      return (
        <group rotation={[0, rotAngle, 0]}>
          {/* Pfahl */}
          <mesh position={[0, -0.22, 0]} material={material}>
            <boxGeometry args={[0.1, 0.55, 0.1]} />
          </mesh>
          {/* Schildplatte */}
          <mesh position={[0, 0.15, 0]} material={material} castShadow>
            <boxGeometry args={[1.0, 0.5, 0.08]} />
          </mesh>
        </group>
      );
    }

    // 13d. Banner (_banner)
    if (blockTypeUpper.includes('BANNER')) {
      return (
        <mesh position={[0, 0, 0]} material={material} castShadow>
          <boxGeometry args={[0.875, 1, 0.0625]} />
        </mesh>
      );
    }

    // 13e. Kaktus (Cactus): Leicht eingerückt (14x16x14)
    if (blockTypeUpper === 'CACTUS') {
      return (
        <mesh material={material} castShadow receiveShadow>
          <boxGeometry args={[0.875, 1, 0.875]} />
        </mesh>
      );
    }

    // 13f. Kuchen (Cake)
    if (blockTypeUpper === 'CAKE') {
      return (
        <mesh
          position={[0, -0.25, 0]}
          geometry={getVoxelBoxGeometry(0.875, 0.5, 0.875)}
          material={material}
          castShadow
          receiveShadow
        />
      );
    }

    // 13g. Lagerfeuer (Campfire & Soul Campfire)
    if (blockTypeUpper.includes('CAMPFIRE')) {
      return (
        <group position={[0, -0.25, 0]}>
          <mesh
            position={[0, -0.125, 0]}
            geometry={getVoxelBoxGeometry(1, 0.25, 1)}
            material={material}
            castShadow
            receiveShadow
          />
          <mesh rotation={[0, Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[0.75, 0.6]} />
          </mesh>
        </group>
      );
    }

    // 13h. Endportal-Rahmen (End Portal Frame)
    if (blockTypeUpper === 'END_PORTAL_FRAME') {
      return (
        <mesh
          position={[0, -0.09375, 0]}
          geometry={getVoxelBoxGeometry(1, 0.8125, 1)}
          material={material}
          castShadow
          receiveShadow
        />
      );
    }

    // 13i. Gerüst (Scaffolding)
    if (blockTypeUpper === 'SCAFFOLDING') {
      return (
        <group>
          <mesh position={[0, 0.4375, 0]} material={material} castShadow>
            <boxGeometry args={[1, 0.125, 1]} />
          </mesh>
          <mesh position={[0.4375, 0, 0.4375]} material={material}>
            <boxGeometry args={[0.125, 1, 0.125]} />
          </mesh>
          <mesh position={[-0.4375, 0, 0.4375]} material={material}>
            <boxGeometry args={[0.125, 1, 0.125]} />
          </mesh>
          <mesh position={[0.4375, 0, -0.4375]} material={material}>
            <boxGeometry args={[0.125, 1, 0.125]} />
          </mesh>
          <mesh position={[-0.4375, 0, -0.4375]} material={material}>
            <boxGeometry args={[0.125, 1, 0.125]} />
          </mesh>
        </group>
      );
    }

    // 13j. Glocke (Bell)
    if (blockTypeUpper === 'BELL') {
      return (
        <group>
          <mesh position={[0, 0.4375, 0]} material={material} castShadow>
            <boxGeometry args={[1, 0.125, 0.25]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={material} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
        </group>
      );
    }

    // 13k. Trichter (Hopper)
    if (blockTypeUpper === 'HOPPER') {
      return (
        <group>
          <mesh
            position={[0, 0.3125, 0]}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1, 0.375, 1]} />
          </mesh>
          <mesh position={[0, -0.0625, 0]} material={material} castShadow>
            <boxGeometry args={[0.625, 0.375, 0.625]} />
          </mesh>
          <mesh position={[0, -0.375, 0]} material={material} castShadow>
            <boxGeometry args={[0.375, 0.25, 0.375]} />
          </mesh>
        </group>
      );
    }

    // 13l. Amethystknospen, Cluster & Tropfstein
    if (
      blockTypeUpper === 'AMETHYST_CLUSTER' ||
      blockTypeUpper.endsWith('_AMETHYST_BUD') ||
      blockTypeUpper === 'POINTED_DRIPSTONE'
    ) {
      return (
        <group position={[0, -0.1, 0]}>
          <mesh rotation={[0, Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[0.75, 0.8]} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]} material={material}>
            <planeGeometry args={[0.75, 0.8]} />
          </mesh>
        </group>
      );
    }

    // 14. Slabs (_slab): 1 x 0.5 x 1 mit proportionaler UV-Texturierung
    if (blockTypeUpper.endsWith('_SLAB') || blockTypeUpper === 'SLAB') {
      if (blockState.slabType === 'double') {
        return (
          <mesh material={material} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        );
      }
      const isTop = blockState.slabType === 'top';
      const slabY = isTop ? 0.25 : -0.25;
      return (
        <mesh
          position={[0, slabY, 0]}
          geometry={getVoxelBoxGeometry(1, 0.5, 1, isTop ? 0.5 : 0)}
          material={material}
          castShadow
          receiveShadow
        />
      );
    }

    // 15. Stairs (_stairs): Basis-Slab (1 x 0.5 x 1) + halbe Stufe (1 x 0.5 x 0.5), rotiert nach facing und half
    if (blockTypeUpper.endsWith('_STAIRS') || blockTypeUpper === 'STAIRS') {
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
          {/* Basis Halbstufe */}
          <mesh
            position={[0, baseY, 0]}
            geometry={getVoxelBoxGeometry(1, 0.5, 1, isUpright ? 0 : 0.5)}
            material={material}
            castShadow
            receiveShadow
          />
          {/* Obere Stufe */}
          <mesh
            position={stepPos}
            geometry={getVoxelBoxGeometry(
              stepSize[0],
              stepSize[1],
              stepSize[2],
              isUpright ? 0.5 : 0
            )}
            material={material}
            castShadow
            receiveShadow
          />
        </group>
      );
    }

    // 16. Fences (_fence): Mittelpfosten (0.25 x 1 x 0.25) PLUS Verbindungsstreben mit unverzerrter UV
    if (blockTypeUpper.endsWith('_FENCE') || blockTypeUpper === 'FENCE') {
      return (
        <group>
          {/* Mittelpfosten */}
          <mesh
            geometry={getVoxelBoxGeometry(0.25, 1, 0.25)}
            material={material}
            castShadow
            receiveShadow
          />

          {/* North Streben (-Z) */}
          {connections.north && (
            <group>
              <mesh
                position={[0, 0.22, -0.25]}
                geometry={getVoxelBoxGeometry(0.125, 0.125, 0.5)}
                material={material}
                castShadow
              />
              <mesh
                position={[0, -0.22, -0.25]}
                geometry={getVoxelBoxGeometry(0.125, 0.125, 0.5)}
                material={material}
                castShadow
              />
            </group>
          )}

          {/* South Streben (+Z) */}
          {connections.south && (
            <group>
              <mesh
                position={[0, 0.22, 0.25]}
                geometry={getVoxelBoxGeometry(0.125, 0.125, 0.5)}
                material={material}
                castShadow
              />
              <mesh
                position={[0, -0.22, 0.25]}
                geometry={getVoxelBoxGeometry(0.125, 0.125, 0.5)}
                material={material}
                castShadow
              />
            </group>
          )}

          {/* East Streben (+X) */}
          {connections.east && (
            <group>
              <mesh
                position={[0.25, 0.22, 0]}
                geometry={getVoxelBoxGeometry(0.5, 0.125, 0.125)}
                material={material}
                castShadow
              />
              <mesh
                position={[0.25, -0.22, 0]}
                geometry={getVoxelBoxGeometry(0.5, 0.125, 0.125)}
                material={material}
                castShadow
              />
            </group>
          )}

          {/* West Streben (-X) */}
          {connections.west && (
            <group>
              <mesh
                position={[-0.25, 0.22, 0]}
                geometry={getVoxelBoxGeometry(0.5, 0.125, 0.125)}
                material={material}
                castShadow
              />
              <mesh
                position={[-0.25, -0.22, 0]}
                geometry={getVoxelBoxGeometry(0.5, 0.125, 0.125)}
                material={material}
                castShadow
              />
            </group>
          )}
        </group>
      );
    }

    // 17. Walls (_wall): Mittelpfosten (0.3125 x 1 x 0.3125) PLUS Verbindungsstege mit nativer UV
    if (blockTypeUpper.endsWith('_WALL') || blockTypeUpper === 'WALL') {
      return (
        <group>
          <mesh
            geometry={getVoxelBoxGeometry(0.3125, 1, 0.3125)}
            material={material}
            castShadow
            receiveShadow
          />
          {connections.north && (
            <mesh
              position={[0, 0, -0.25]}
              geometry={getVoxelBoxGeometry(0.25, 0.875, 0.5)}
              material={material}
              castShadow
            />
          )}
          {connections.south && (
            <mesh
              position={[0, 0, 0.25]}
              geometry={getVoxelBoxGeometry(0.25, 0.875, 0.5)}
              material={material}
              castShadow
            />
          )}
          {connections.east && (
            <mesh
              position={[0.25, 0, 0]}
              geometry={getVoxelBoxGeometry(0.5, 0.875, 0.25)}
              material={material}
              castShadow
            />
          )}
          {connections.west && (
            <mesh
              position={[-0.25, 0, 0]}
              geometry={getVoxelBoxGeometry(0.5, 0.875, 0.25)}
              material={material}
              castShadow
            />
          )}
        </group>
      );
    }

    // 18. Iron Bars & Glass Panes (iron_bars, _bars, _pane)
    if (
      blockTypeUpper === 'IRON_BARS' ||
      blockTypeUpper.endsWith('_BARS') ||
      blockTypeUpper.endsWith('_PANE') ||
      blockTypeUpper === 'BARS'
    ) {
      const hasAnyConnection =
        connections.north ||
        connections.south ||
        connections.east ||
        connections.west;

      return (
        <group>
          <mesh
            geometry={getVoxelBoxGeometry(0.125, 1, 0.125)}
            material={material}
            castShadow
            receiveShadow
          />
          {!hasAnyConnection ? (
            // Isolierter Einzel-Pfosten
            <group>
              <mesh
                geometry={getVoxelBoxGeometry(0.125, 1, 0.875)}
                material={material}
                castShadow
              />
              <mesh
                geometry={getVoxelBoxGeometry(0.875, 1, 0.125)}
                material={material}
                castShadow
              />
            </group>
          ) : (
            // Dynamische Verbindungsstege
            <group>
              {connections.north && (
                <mesh
                  position={[0, 0, -0.25]}
                  geometry={getVoxelBoxGeometry(0.125, 1, 0.5)}
                  material={material}
                  castShadow
                />
              )}
              {connections.south && (
                <mesh
                  position={[0, 0, 0.25]}
                  geometry={getVoxelBoxGeometry(0.125, 1, 0.5)}
                  material={material}
                  castShadow
                />
              )}
              {connections.east && (
                <mesh
                  position={[0.25, 0, 0]}
                  geometry={getVoxelBoxGeometry(0.5, 1, 0.125)}
                  material={material}
                  castShadow
                />
              )}
              {connections.west && (
                <mesh
                  position={[-0.25, 0, 0]}
                  geometry={getVoxelBoxGeometry(0.5, 1, 0.125)}
                  material={material}
                  castShadow
                />
              )}
            </group>
          )}
        </group>
      );
    }

    // 19a. Ranken & Flechten (Vine, Glow Lichen, Sculk Vein): Flache Platten an den anliegenden Wänden/Decken (Dicke 0.04)
    const isVineOrLichen =
      blockTypeUpper === 'VINE' ||
      blockTypeUpper === 'GLOW_LICHEN' ||
      blockTypeUpper === 'SCULK_VEIN';

    if (isVineOrLichen) {
      const { north, south, east, west, up } = blockState.vine;
      return (
        <group>
          {north && (
            <mesh position={[0, 0, -0.48]} material={material}>
              <boxGeometry args={[1, 1, 0.04]} />
            </mesh>
          )}
          {south && (
            <mesh position={[0, 0, 0.48]} material={material}>
              <boxGeometry args={[1, 1, 0.04]} />
            </mesh>
          )}
          {west && (
            <mesh position={[-0.48, 0, 0]} material={material}>
              <boxGeometry args={[0.04, 1, 1]} />
            </mesh>
          )}
          {east && (
            <mesh position={[0.48, 0, 0]} material={material}>
              <boxGeometry args={[0.04, 1, 1]} />
            </mesh>
          )}
          {up && (
            <mesh position={[0, 0.48, 0]} material={material}>
              <boxGeometry args={[1, 0.04, 1]} />
            </mesh>
          )}
        </group>
      );
    }

    // 19b. Leitern (Ladder): Volle Höhe 1.0, Dicke 0.04, haftet an entsprechender Wand
    if (blockTypeUpper === 'LADDER') {
      let ladderPos: [number, number, number] = [0, 0, 0.46];
      let ladderSize: [number, number, number] = [1, 1, 0.04];

      if (blockState.facing === 'north') {
        ladderPos = [0, 0, 0.46];
        ladderSize = [1, 1, 0.04];
      } else if (blockState.facing === 'south') {
        ladderPos = [0, 0, -0.46];
        ladderSize = [1, 1, 0.04];
      } else if (blockState.facing === 'west') {
        ladderPos = [0.46, 0, 0];
        ladderSize = [0.04, 1, 1];
      } else if (blockState.facing === 'east') {
        ladderPos = [-0.46, 0, 0];
        ladderSize = [0.04, 1, 1];
      }

      return (
        <mesh position={ladderPos} material={material} castShadow>
          <boxGeometry args={ladderSize} />
        </mesh>
      );
    }

    // 20. Trapdoors (_trapdoor): 1 x 0.1875 x 1 (closed) bzw. hochgeklappt 1 x 1 x 0.1875 (open)
    if (blockTypeUpper.endsWith('_TRAPDOOR') || blockTypeUpper === 'TRAPDOOR') {
      if (!blockState.isOpen) {
        // Horizontale geschlossene Falltür
        const trapdoorY = blockState.half === 'top' ? 0.40625 : -0.40625;
        return (
          <mesh
            position={[0, trapdoorY, 0]}
            geometry={getVoxelBoxGeometry(1, 0.1875, 1)}
            material={material}
            castShadow
            receiveShadow
          />
        );
      }

      // Vertikal aufgeklappte Falltür
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
        <mesh
          position={openPos}
          geometry={getVoxelBoxGeometry(openSize[0], openSize[1], openSize[2])}
          material={material}
          castShadow
          receiveShadow
        />
      );
    }

    // 21. Carpets & Pressure Plates: Flache 1 x 0.0625 x 1 Box am Boden
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
          geometry={getVoxelBoxGeometry(boxWidth, 0.0625, boxDepth)}
          material={material}
          castShadow
          receiveShadow
        />
      );
    }

    // 22. Cobwebs: Diagonal gekreuzte Ebenen (X-Form)
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

    // 23. Standard Full 1 x 1 x 1 Block
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

      {/* 1:1 Minecraft Accurate Rendered Geometry via misode/mcmeta Atlas or Fallback */}
      {blockGeometry && atlasMaterial ? (
        <mesh
          geometry={blockGeometry}
          material={atlasMaterial}
          castShadow
          receiveShadow
        />
      ) : (
        renderGeometryByType()
      )}

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

  // O(1) Fast Spatial Lookup for neighbor connectivity and auto-facing
  const blockMap = useMemo(() => {
    const map = new Map<string, VoxelBlock>();
    if (!currentModule || !Array.isArray(currentModule.blocks)) return map;
    for (const b of currentModule.blocks) {
      map.set(`${b.position.x},${b.position.y},${b.position.z}`, b);
    }
    return map;
  }, [currentModule?.blocks]);

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
            mcmeta={mcmeta}
            atlasMaterial={atlasMaterial}
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
