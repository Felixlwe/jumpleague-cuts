import { Cut, JLModule, VoxelBlock } from '@/types/jumpleague';

function addPlatform(
  blocks: VoxelBlock[],
  xMin: number,
  xMax: number,
  y: number,
  zMin: number,
  zMax: number,
  type: VoxelBlock['type']
) {
  for (let x = xMin; x <= xMax; x++) {
    for (let z = zMin; z <= zMax; z++) {
      blocks.push({ position: { x, y, z }, type });
    }
  }
}

function addPillar(
  blocks: VoxelBlock[],
  x: number,
  yMin: number,
  yMax: number,
  z: number,
  type: VoxelBlock['type'] = 'STONE_BRICKS'
) {
  for (let y = yMin; y <= yMax; y++) {
    blocks.push({ position: { x, y, z }, type });
  }
}

/**
 * Natural numerical sort for JumpLeague Module IDs:
 * E.g. E1, E2, E3, E10 (NOT alphabetical E1, E10, E2)
 * Tier hierarchy when sorted across all categories: E -> M -> H -> U
 */
export function compareModuleIds(a: string, b: string): number {
  const matchA = a.match(/^([a-zA-Z]+)(\d+)$/);
  const matchB = b.match(/^([a-zA-Z]+)(\d+)$/);

  if (matchA && matchB) {
    const [, prefixA, numA] = matchA;
    const [, prefixB, numB] = matchB;

    if (prefixA.toUpperCase() !== prefixB.toUpperCase()) {
      const tierOrder: Record<string, number> = { E: 1, M: 2, H: 3, U: 4 };
      const orderA = tierOrder[prefixA.toUpperCase()] ?? 99;
      const orderB = tierOrder[prefixB.toUpperCase()] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return prefixA.localeCompare(prefixB);
    }

    return parseInt(numA, 10) - parseInt(numB, 10);
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortModulesNumerically(modules: JLModule[]): JLModule[] {
  return [...modules].sort((a, b) => compareModuleIds(a.id, b.id));
}

// ============================================================================
// 1. EASY MODULES (E1, E2, E3, E10)
// ============================================================================

export function generateModuleE1(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 1, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' });
  addPillar(blocks, -2, 1, 3, -1, 'STONE_BRICKS');
  addPillar(blocks, 2, 1, 4, -1, 'STONE_BRICKS');

  blocks.push({ position: { x: 2, y: 1, z: 3 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 4, y: 2, z: 5 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 3, y: 2, z: 7 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 2, y: 2, z: 9 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 1, y: 2, z: 5 }, type: 'OAK_SLAB' });
  addPlatform(blocks, -1, 1, 2, 9, 10, 'STONE_BRICKS');

  blocks.push({ position: { x: -3, y: 2, z: 12 }, type: 'OAK_PLANKS' });
  addPillar(blocks, -4, 3, 4, 15, 'STONE_BRICKS');
  blocks.push({ position: { x: -4, y: 3, z: 14 }, type: 'LADDER' });
  blocks.push({ position: { x: -4, y: 4, z: 14 }, type: 'LADDER' });
  blocks.push({ position: { x: -3, y: 4, z: 18 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: -1, y: 4, z: 20 }, type: 'OAK_PLANKS' });

  blocks.push({ position: { x: 1, y: 3, z: 13 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 2, y: 3, z: 15 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 1, y: 4, z: 17 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 4, 20, 22, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 4, z: 21 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 4, z: 24 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: -1, y: 4, z: 24 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 1, y: 4, z: 24 }, type: 'STONE_BRICKS' });
  addPillar(blocks, -1, 5, 7, 24, 'STONE_BRICKS');
  addPillar(blocks, 1, 5, 7, 24, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 7, z: 24 }, type: 'STONE_BRICKS' });

  blocks.push({ position: { x: 3, y: 4, z: 26 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 4, y: 5, z: 28 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: 3, y: 5, z: 31 }, type: 'OAK_SLAB' });

  blocks.push({ position: { x: 0, y: 5, z: 29 }, type: 'OAK_SLAB' });
  addPlatform(blocks, -1, 1, 5, 32, 33, 'STONE_BRICKS');

  blocks.push({ position: { x: -3, y: 6, z: 35 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: -4, y: 6, z: 38 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: -3, y: 7, z: 41 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: -1, y: 7, z: 43 }, type: 'OAK_PLANKS' });

  blocks.push({ position: { x: 0, y: 6, z: 35 }, type: 'OAK_SLAB' });
  addPillar(blocks, 0, 6, 9, 37, 'STONE_BRICKS');
  blocks.push({ position: { x: -1, y: 7, z: 37 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: 0, y: 7, z: 40 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 7, 43, 45, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 7, z: 44 }, type: 'EMERALD_BLOCK' });
  addPillar(blocks, -2, 7, 9, 45, 'STONE_BRICKS');
  addPillar(blocks, 2, 7, 9, 45, 'STONE_BRICKS');

  return {
    id: 'E1',
    name: 'Ruinen-Parkour',
    difficulty: 'EASY',
    dimensions: { x: 10, y: 10, z: 46 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleE2(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 1, -1, 1, 'OAK_PLANKS');
  blocks.push({ position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 2, z: 4 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 2, y: 2, z: 7 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: -2, y: 3, z: 9 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 0, y: 3, z: 12 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 2, y: 4, z: 15 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 4, z: 18 }, type: 'OAK_FENCE' });

  addPlatform(blocks, -1, 1, 5, 22, 24, 'OAK_PLANKS');
  blocks.push({ position: { x: 0, y: 5, z: 23 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'E2',
    name: 'Bibliotheks-Sprung',
    difficulty: 'EASY',
    dimensions: { x: 8, y: 7, z: 26 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleE3(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 1, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 2, y: 2, z: 3 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 3, y: 2, z: 6 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 0, y: 3, z: 9 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: -2, y: 3, z: 12 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 0, y: 4, z: 16 }, type: 'STONE_BRICKS' });

  addPlatform(blocks, -1, 1, 5, 20, 22, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 5, z: 21 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'E3',
    name: 'Dschungel-Pfad',
    difficulty: 'EASY',
    dimensions: { x: 9, y: 7, z: 24 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleE10(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 1, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 2, z: 4 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 3, y: 3, z: 7 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 1, y: 3, z: 10 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: -2, y: 4, z: 14 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 0, y: 4, z: 18 }, type: 'GOLD_BLOCK' }); // CP
  blocks.push({ position: { x: 2, y: 5, z: 22 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 6, z: 26 }, type: 'IRON_BARS' });

  addPlatform(blocks, -1, 1, 7, 30, 32, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 7, z: 31 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'E10',
    name: 'Tempel-Gipfel',
    difficulty: 'EASY',
    dimensions: { x: 10, y: 9, z: 34 },
    blockCount: blocks.length,
    blocks,
  };
}

// ============================================================================
// 2. MEDIUM MODULES (M1, M2, M14)
// ============================================================================

export function generateModuleM1(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 1, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 2, z: 4 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 2, y: 2, z: 7 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: -2, y: 2, z: 6 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: -3, y: 3, z: 9 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 0, y: 3, z: 11 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 0, y: 6, z: 11 }, type: 'STONE_BRICKS' });

  addPlatform(blocks, -1, 1, 4, 15, 17, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 4, z: 16 }, type: 'GOLD_BLOCK' });

  addPillar(blocks, 0, 5, 7, 20, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 5, z: 19 }, type: 'LADDER' });
  blocks.push({ position: { x: 0, y: 6, z: 19 }, type: 'LADDER' });
  blocks.push({ position: { x: 3, y: 5, z: 22 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 2, y: 6, z: 25 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 6, z: 24 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 7, 28, 30, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 7, z: 29 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'M1',
    name: 'Festungs-Graben',
    difficulty: 'MEDIUM',
    dimensions: { x: 9, y: 8, z: 32 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleM2(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 2, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 2, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 2, z: 4 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: -2, y: 3, z: 8 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: 1, y: 3, z: 11 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 4, z: 15 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 2, y: 5, z: 19 }, type: 'OAK_FENCE' });

  addPlatform(blocks, -1, 1, 6, 24, 26, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 6, z: 25 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'M2',
    name: 'Minenschacht-Tunnel',
    difficulty: 'MEDIUM',
    dimensions: { x: 8, y: 8, z: 28 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleM14(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 1, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 2, z: 3 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 0, y: 5, z: 3 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 3, y: 2, z: 4 }, type: 'OAK_PLANKS' });
  blocks.push({ position: { x: 0, y: 3, z: 7 }, type: 'OAK_SLAB' });

  addPillar(blocks, 0, 4, 6, 11, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 4, z: 10 }, type: 'LADDER' });
  blocks.push({ position: { x: 0, y: 5, z: 10 }, type: 'LADDER' });
  blocks.push({ position: { x: 0, y: 6, z: 10 }, type: 'LADDER' });
  blocks.push({ position: { x: 0, y: 7, z: 11 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 1, y: 6, z: 13 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: 1, y: 7, z: 16 }, type: 'IRON_BARS' });

  addPlatform(blocks, 0, 2, 8, 19, 21, 'STONE_BRICKS');
  blocks.push({ position: { x: 1, y: 8, z: 20 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'M14',
    name: 'Leiterturm & Gitter',
    difficulty: 'MEDIUM',
    dimensions: { x: 10, y: 9, z: 23 },
    blockCount: blocks.length,
    blocks,
  };
}

// ============================================================================
// 3. HARD MODULES (H1, H2, H8)
// ============================================================================

export function generateModuleH1(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 2, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 2, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 3, z: 3 }, type: 'OAK_PLANKS' });
  addPillar(blocks, 0, 4, 6, 5, 'STONE_BRICKS');
  blocks.push({ position: { x: -3, y: 3, z: 5 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: -3, y: 4, z: 8 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 0, y: 4, z: 8 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 5, 12, 14, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 5, z: 13 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 1, y: 6, z: 17 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: -1, y: 6, z: 20 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 1, y: 7, z: 23 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 8, 26, 28, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 8, z: 27 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'H1',
    name: 'Katakomben-Gitterturm',
    difficulty: 'HARD',
    dimensions: { x: 9, y: 9, z: 30 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleH2(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 2, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 2, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 2, y: 3, z: 4 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: -2, y: 4, z: 8 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: 0, y: 4, z: 12 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 3, y: 5, z: 16 }, type: 'STONE_BRICKS' });

  addPlatform(blocks, -1, 1, 7, 22, 24, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 7, z: 23 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'H2',
    name: 'Lava-Schlucht',
    difficulty: 'HARD',
    dimensions: { x: 8, y: 8, z: 26 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleH8(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 2, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 2, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 3, z: 3 }, type: 'OAK_PLANKS' });
  addPillar(blocks, 0, 4, 6, 4, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 3, z: 6 }, type: 'OAK_SLAB' });

  blocks.push({ position: { x: 1, y: 4, z: 9 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 1, y: 5, z: 13 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 1, y: 6, z: 15 }, type: 'IRON_BARS' });
  addPlatform(blocks, 0, 2, 7, 18, 20, 'STONE_BRICKS');
  blocks.push({ position: { x: 1, y: 7, z: 19 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'H8',
    name: 'Doppel-Säulen-Neo',
    difficulty: 'HARD',
    dimensions: { x: 11, y: 8, z: 22 },
    blockCount: blocks.length,
    blocks,
  };
}

// ============================================================================
// 4. ULTRA MODULES (U1, U2, U3)
// ============================================================================

export function generateModuleU1(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 3, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 3, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 4, z: 4 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 3, y: 4, z: 3 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: 4, y: 5, z: 7 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 5, z: 8 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 6, 12, 13, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 6, z: 12 }, type: 'GOLD_BLOCK' });
  blocks.push({ position: { x: 0, y: 9, z: 12 }, type: 'STONE_BRICKS' });

  blocks.push({ position: { x: 0, y: 7, z: 17 }, type: 'IRON_BARS' });
  addPillar(blocks, 0, 8, 10, 20, 'STONE_BRICKS');
  blocks.push({ position: { x: -3, y: 7, z: 16 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: -3, y: 8, z: 20 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 8, z: 22 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 9, 26, 28, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 9, z: 27 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'U1',
    name: 'Void-Sanctum',
    difficulty: 'ULTRA',
    dimensions: { x: 10, y: 11, z: 30 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleU2(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 3, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 3, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 2, y: 4, z: 4 }, type: 'IRON_BARS' });
  blocks.push({ position: { x: -2, y: 5, z: 9 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 0, y: 6, z: 14 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 3, y: 7, z: 19 }, type: 'STONE_BRICKS' });

  addPlatform(blocks, -1, 1, 8, 24, 26, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 8, z: 25 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'U2',
    name: 'End-Kristall-Sprung',
    difficulty: 'ULTRA',
    dimensions: { x: 9, y: 10, z: 28 },
    blockCount: blocks.length,
    blocks,
  };
}

export function generateModuleU3(): JLModule {
  const blocks: VoxelBlock[] = [];
  addPlatform(blocks, -1, 1, 3, -1, 1, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 3, z: 0 }, type: 'GOLD_BLOCK' });

  blocks.push({ position: { x: 0, y: 4, z: 4 }, type: 'OAK_FENCE' });
  blocks.push({ position: { x: 0, y: 5, z: 8 }, type: 'OAK_SLAB' });
  blocks.push({ position: { x: 0, y: 6, z: 11 }, type: 'GOLD_BLOCK' });
  blocks.push({ position: { x: 0, y: 9, z: 11 }, type: 'STONE_BRICKS' });
  blocks.push({ position: { x: 0, y: 7, z: 15 }, type: 'OAK_SLAB' });

  addPlatform(blocks, -1, 1, 8, 20, 22, 'STONE_BRICKS');
  blocks.push({ position: { x: 0, y: 8, z: 21 }, type: 'EMERALD_BLOCK' });

  return {
    id: 'U3',
    name: 'Pixel-Blip Sanctum',
    difficulty: 'ULTRA',
    dimensions: { x: 10, y: 10, z: 24 },
    blockCount: blocks.length,
    blocks,
  };
}

export const INITIAL_MODULES: JLModule[] = sortModulesNumerically([
  generateModuleE1(),
  generateModuleE2(),
  generateModuleE3(),
  generateModuleE10(),
  generateModuleM1(),
  generateModuleM2(),
  generateModuleM14(),
  generateModuleH1(),
  generateModuleH2(),
  generateModuleH8(),
  generateModuleU1(),
  generateModuleU2(),
  generateModuleU3(),
]);

/**
 * Realistic cuts across the module catalogue
 */
export const INITIAL_CUTS: Cut[] = [
  // =========================================================================
  // E1 CUTS
  // =========================================================================
  {
    id: 'e1-cut-safe-spawn-slab',
    moduleId: 'E1',
    name: 'Spawn-Diagonal-Skip auf Eichenstufe',
    description:
      '1. Stelle dich auf die vordere rechte Ecke der Start-Plattform bei (1, 1, 1).\n2. Visiere die halbe Eichenholzstufe bei (1, 2, 5) im leichten 45°-Strafe-Winkel an.\n3. Springe mit vollem Sprint ab und laufe in einer fließenden Bewegung direkt weiter auf das Ruinen-Plateau bei (0, 2, 9).',
    timeSavedSeconds: 1.8,
    difficulty: 'SAFE',
    consistencyRating: 5,
    techniques: ['STRAFE_45', 'TIMING'],
    startBlock: { x: 1, y: 1, z: 1 },
    midPoints: [{ x: 1, y: 3.1, z: 5 }],
    endBlock: { x: 0, y: 2, z: 9 },
    cameraPosition: { x: 7.5, y: 5.5, z: -1.0 },
    cameraTarget: { x: 0.8, y: 2.0, z: 5.0 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'VeniCraft_JL',
    createdAt: '2026-10-20T14:00:00.000Z',
  },
  {
    id: 'e1-cut-medium-fence-alignment',
    moduleId: 'E1',
    name: 'Zaun-Neo & Alignment zum Mittel-Checkpoint',
    description:
      '1. Statt links über die Leiter bei (-4, 3, 14) zu klettern, springst du von (1, 2, 10) direkt auf den Eichenholzzaun bei (1, 3, 13).\n2. Durch die 1.5-Block hohe Kollisionsbox des Zauns gewinnst du automatisch 0.5 Blöcke Extrahöhe.\n3. Springe vom Zaun über die Halbstufe (1, 4, 17) direkt auf den Checkpoint-Goldblock (0, 4, 21).',
    timeSavedSeconds: 2.6,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['FENCE_ALIGNMENT', 'STRAFE_45'],
    startBlock: { x: 1, y: 2, z: 10 },
    midPoints: [
      { x: 1, y: 4.8, z: 13 },
      { x: 1, y: 5.3, z: 17 },
    ],
    endBlock: { x: 0, y: 4, z: 20 },
    cameraPosition: { x: 7.8, y: 7.2, z: 11.5 },
    cameraTarget: { x: 0.5, y: 3.8, z: 15.5 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'APPROVED',
    submittedBy: 'KevJumpZ',
    createdAt: '2026-10-21T10:30:00.000Z',
  },
  {
    id: 'e1-cut-heavy-headhitter-boost',
    moduleId: 'E1',
    name: 'Ruinen-Headhitter über 5-Block-Abgrund',
    description:
      '1. Laufe vom Checkpoint (0, 4, 21) auf den Torbogen-Block (0, 4, 24), über dem sich der Headhitter-Deckenblock (0, 7, 24) befindet.\n2. Stelle dich an die hintere Kante von (0, 4, 24), sprinte los und drücke erst an der vorderen Kante Leertaste (Delayed Headhitter).\n3. Der Decken-Impuls katapultiert dich direkt auf die Eichenstufe (0, 5, 29).',
    timeSavedSeconds: 3.3,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['HEADHITTER', 'TIMING'],
    startBlock: { x: 0, y: 4, z: 24 },
    endBlock: { x: 0, y: 5, z: 29 },
    cameraPosition: { x: -6.8, y: 7.4, z: 23.0 },
    cameraTarget: { x: 0, y: 5.0, z: 26.5 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'xStrafeKing',
    createdAt: '2026-10-22T09:15:00.000Z',
  },
  {
    id: 'e1-cut-pixel-perfect-pillar-neo',
    moduleId: 'E1',
    name: 'Pixel-Perfect Säulen-Neo direkt zum Smaragd-Ziel',
    description:
      '1. Springe vom Plateau (0, 5, 33) auf die Vorstufe (0, 6, 35) direkt vor der massiven Steinziegelsäule (0, 6..9, 37).\n2. Da links das Eisengitter (-1, 7, 37) blockiert, musst du rechts einen extrem engen +1Y Aufwärts-Neo um die Säule ziehen.\n3. Triff die vordere Kante der Halbstufe (0, 7, 40) für einen direkten Blip-Weiterflug auf die Smaragd-Zielplattform (0, 7, 43).',
    timeSavedSeconds: 4.4,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 1,
    techniques: ['NEO', 'BLIP', 'STRAFE_45', 'TIMING'],
    startBlock: { x: 0, y: 6, z: 35 },
    midPoints: [
      { x: 1.75, y: 8.1, z: 37.2 },
      { x: 0, y: 8.3, z: 40.0 },
    ],
    endBlock: { x: 0, y: 7, z: 43 },
    cameraPosition: { x: 7.2, y: 10.2, z: 34.0 },
    cameraTarget: { x: 0.3, y: 7.0, z: 39.0 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'PixelGod_99',
    createdAt: '2026-10-22T18:45:00.000Z',
  },

  // =========================================================================
  // E2 CUTS
  // =========================================================================
  {
    id: 'e2-cut-diagonal-skip',
    moduleId: 'E2',
    name: 'Bibliotheks-Regal-Diagonal-Cut',
    description: 'Vom Startblock direkt im 45°-Winkel auf das Eichenstufen-Regal abspringen.',
    timeSavedSeconds: 1.6,
    difficulty: 'SAFE',
    consistencyRating: 5,
    techniques: ['STRAFE_45'],
    startBlock: { x: 0, y: 1, z: 0 },
    endBlock: { x: 2, y: 2, z: 7 },
    cameraPosition: { x: 6, y: 6, z: 2 },
    cameraTarget: { x: 0, y: 2, z: 5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'BücherWurm_JL',
    createdAt: '2026-10-21T12:00:00.000Z',
  },
  {
    id: 'e2-cut-fence-leap',
    moduleId: 'E2',
    name: 'Zaun-Skip zum Ziel-Podest',
    description: 'Von der Holzstufe (2, 4, 15) direkt mit Strafe auf den Eichenholzzaun springen.',
    timeSavedSeconds: 2.3,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 2, y: 4, z: 15 },
    endBlock: { x: 0, y: 5, z: 22 },
    cameraPosition: { x: -6, y: 7, z: 16 },
    cameraTarget: { x: 0, y: 4, z: 18 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'APPROVED',
    submittedBy: 'KevJumpZ',
    createdAt: '2026-10-21T14:30:00.000Z',
  },

  // =========================================================================
  // E3 CUTS
  // =========================================================================
  {
    id: 'e3-cut-jungle-fence-hop',
    moduleId: 'E3',
    name: 'Dschungel-Zaun-Doppel-Hop',
    description: 'Überspringe den äußeren Holzblock via Zaun-Kollision direkt zur Halbstufe.',
    timeSavedSeconds: 2.0,
    difficulty: 'SAFE',
    consistencyRating: 4,
    techniques: ['FENCE_ALIGNMENT'],
    startBlock: { x: 2, y: 2, z: 3 },
    endBlock: { x: 0, y: 3, z: 9 },
    cameraPosition: { x: 6, y: 5, z: 4 },
    cameraTarget: { x: 0, y: 3, z: 6 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'Tarzan_JL',
    createdAt: '2026-10-21T16:00:00.000Z',
  },

  // =========================================================================
  // E10 CUTS
  // =========================================================================
  {
    id: 'e10-cut-temple-cp-skip',
    moduleId: 'E10',
    name: 'Gipfel-Checkpoint-Direktsprung',
    description: 'Vom Goldblock-Checkpoint (0, 4, 18) direkt auf die entfernte Eichenstufe zielen.',
    timeSavedSeconds: 2.5,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['TIMING', 'STRAFE_45'],
    startBlock: { x: 0, y: 4, z: 18 },
    endBlock: { x: 2, y: 5, z: 22 },
    cameraPosition: { x: 7, y: 8, z: 16 },
    cameraTarget: { x: 1, y: 5, z: 20 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'SummitRunner',
    createdAt: '2026-10-22T08:00:00.000Z',
  },
  {
    id: 'e10-cut-iron-bars-finish',
    moduleId: 'E10',
    name: 'Eisengitter-Alignment ins Ziel',
    description: 'Vollgas-Sprint auf die obere Kante des Eisengitters bei (0, 6, 26).',
    timeSavedSeconds: 3.1,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 2, y: 5, z: 22 },
    endBlock: { x: 0, y: 7, z: 30 },
    cameraPosition: { x: -6, y: 9, z: 24 },
    cameraTarget: { x: 0, y: 6, z: 27 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'SummitRunner',
    createdAt: '2026-10-22T10:00:00.000Z',
  },

  // =========================================================================
  // M1 CUTS
  // =========================================================================
  {
    id: 'm1-cut-headhitter-trench',
    moduleId: 'M1',
    name: 'Graben-Headhitter auf Checkpoint-Plateau',
    description:
      '1. Nutze den Deckenblock über (0, 3, 11) für einen direkten Momentum-Headhitter.\n2. Damit erreichst du ohne Zwischenblock direkt die Vorderkante des Checkpoints (0, 4, 15).',
    timeSavedSeconds: 2.5,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['HEADHITTER', 'TIMING'],
    startBlock: { x: 0, y: 3, z: 11 },
    endBlock: { x: 0, y: 4, z: 15 },
    cameraPosition: { x: 6.5, y: 6.8, z: 9.5 },
    cameraTarget: { x: 0, y: 4.0, z: 13.0 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'APPROVED',
    submittedBy: 'LukasPK',
    createdAt: '2026-10-22T20:10:00.000Z',
  },

  // =========================================================================
  // M2 CUTS
  // =========================================================================
  {
    id: 'm2-cut-tunnel-skip',
    moduleId: 'M2',
    name: 'Minen-Eisengitter-Skip',
    description: 'Vom Holzblock direkt auf die schmale Kante des Eisengitters bei (-2, 3, 8) abspringen.',
    timeSavedSeconds: 2.1,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['FENCE_ALIGNMENT', 'STRAFE_45'],
    startBlock: { x: 0, y: 2, z: 4 },
    endBlock: { x: 1, y: 3, z: 11 },
    cameraPosition: { x: -6, y: 6, z: 6 },
    cameraTarget: { x: 0, y: 3, z: 8 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'MineMaster',
    createdAt: '2026-10-22T11:00:00.000Z',
  },

  // =========================================================================
  // M14 CUTS
  // =========================================================================
  {
    id: 'm14-cut-headhitter-gap',
    moduleId: 'M14',
    name: 'Headhitter-Momentum-Skip',
    description: 'Delayed Headhitter bei (0, 2, 3) katapultiert dich direkt auf (0, 3, 7).',
    timeSavedSeconds: 2.9,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['HEADHITTER', 'TIMING'],
    startBlock: { x: 0, y: 2, z: 3 },
    endBlock: { x: 0, y: 3, z: 7 },
    cameraPosition: { x: -5.8, y: 5.5, z: 2.5 },
    cameraTarget: { x: 0, y: 3.2, z: 5.0 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'xStrafeKing',
    createdAt: '2026-10-19T09:15:00.000Z',
  },
  {
    id: 'm14-cut-ironbar-chain',
    moduleId: 'M14',
    name: 'Eisengitter-Doppelsprung ins Ziel',
    description: 'Präziser Doppel-Sprung von Gitter zu Gitter direkt in den Zielbereich.',
    timeSavedSeconds: 3.6,
    difficulty: 'SAFE',
    consistencyRating: 4,
    techniques: ['FENCE_ALIGNMENT', 'STRAFE_45'],
    startBlock: { x: 1, y: 6, z: 13 },
    midPoints: [{ x: 1.0, y: 8.2, z: 16.0 }],
    endBlock: { x: 1, y: 8, z: 19 },
    cameraPosition: { x: 6.4, y: 10.2, z: 14.5 },
    cameraTarget: { x: 1, y: 7.5, z: 16.0 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'VeniCraft_JL',
    createdAt: '2026-10-20T12:10:00.000Z',
  },

  // =========================================================================
  // H1 CUTS
  // =========================================================================
  {
    id: 'h1-cut-catacomb-neo',
    moduleId: 'H1',
    name: 'Katakomben-Säulen-Neo auf Halbstufe',
    description:
      '1. Springe von (0, 3, 3) rechts um die 3-Block-Säule bei (0, 4, 5) herum.\n2. Lande direkt auf (0, 4, 8) und spare den linken Zaun-Umweg.',
    timeSavedSeconds: 3.7,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['NEO', 'STRAFE_45'],
    startBlock: { x: 0, y: 3, z: 3 },
    midPoints: [{ x: 1.7, y: 5.2, z: 5.5 }],
    endBlock: { x: 0, y: 4, z: 8 },
    cameraPosition: { x: 6.5, y: 7.0, z: 2.0 },
    cameraTarget: { x: 0.4, y: 4.2, z: 5.5 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'NoRisk_Parkour',
    createdAt: '2026-10-23T08:00:00.000Z',
  },

  // =========================================================================
  // H2 CUTS
  // =========================================================================
  {
    id: 'h2-cut-lava-gap-neo',
    moduleId: 'H2',
    name: 'Lava-Gitter-Neo auf Halbstufe',
    description: 'Enge Kurve um die Wand mit 45°-Strafe über dem Lava-Graben.',
    timeSavedSeconds: 3.4,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['NEO', 'TIMING'],
    startBlock: { x: 2, y: 3, z: 4 },
    midPoints: [{ x: 0, y: 4.8, z: 6 }],
    endBlock: { x: 0, y: 4, z: 12 },
    cameraPosition: { x: 7, y: 7, z: 8 },
    cameraTarget: { x: 0, y: 4, z: 8 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'LavaKing',
    createdAt: '2026-10-22T14:00:00.000Z',
  },

  // =========================================================================
  // H8 CUTS
  // =========================================================================
  {
    id: 'h8-cut-double-neo',
    moduleId: 'H8',
    name: 'Katakomben-Säulen-Neo (3-Block Bypass)',
    description: 'Springe rechts an der Säule (0, 4, 4) vorbei auf die Eichenstufe (0, 3, 6).',
    timeSavedSeconds: 4.1,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['NEO', 'STRAFE_45', 'TIMING'],
    startBlock: { x: 0, y: 3, z: 3 },
    midPoints: [{ x: 1.65, y: 4.9, z: 4.5 }],
    endBlock: { x: 0, y: 3, z: 6 },
    cameraPosition: { x: 5.5, y: 6.5, z: 2.0 },
    cameraTarget: { x: 0.4, y: 4.0, z: 4.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'NoRisk_Parkour',
    createdAt: '2026-10-20T20:00:00.000Z',
  },

  // =========================================================================
  // U1 CUTS
  // =========================================================================
  {
    id: 'u1-cut-void-sanctum-neo',
    moduleId: 'U1',
    name: 'Void-Gitter-Neo direkt vor das Ziel',
    description:
      '1. Vom Eisengitter (0, 7, 17) ziehst du einen engen Pixel-Neo um die Säule (0, 8, 20) auf die Stufe (0, 8, 22).\n2. Von dort erreichst du mit einem letzten 45°-Strafe direkt das Smaragd-Plateau (0, 9, 26).',
    timeSavedSeconds: 4.6,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 1,
    techniques: ['NEO', 'FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 0, y: 7, z: 17 },
    midPoints: [{ x: 1.65, y: 9.2, z: 20.0 }],
    endBlock: { x: 0, y: 8, z: 22 },
    cameraPosition: { x: 6.8, y: 11.2, z: 16.0 },
    cameraTarget: { x: 0.4, y: 8.2, z: 20.0 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'CrytexJL',
    createdAt: '2026-10-23T11:30:00.000Z',
  },

  // =========================================================================
  // U2 CUTS
  // =========================================================================
  {
    id: 'u2-cut-crystal-neo',
    moduleId: 'U2',
    name: 'Kristall-Gitter-Neo zu End-Plattform',
    description: 'Extrem präziser 45°-Neo um die Eisenstrebe.',
    timeSavedSeconds: 4.3,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 1,
    techniques: ['NEO', 'TIMING'],
    startBlock: { x: 2, y: 4, z: 4 },
    midPoints: [{ x: 0, y: 6.5, z: 7 }],
    endBlock: { x: -2, y: 5, z: 9 },
    cameraPosition: { x: 8, y: 8, z: 6 },
    cameraTarget: { x: 0, y: 5, z: 7 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'PixelGod_99',
    createdAt: '2026-10-22T19:00:00.000Z',
  },

  // =========================================================================
  // U3 CUTS
  // =========================================================================
  {
    id: 'u3-cut-void-blip',
    moduleId: 'U3',
    name: 'Void-Fence-Blip zum Checkpoint',
    description: 'Frame-genauer Doppel-Jump an der Eichenzaun-Kante.',
    timeSavedSeconds: 3.8,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 2,
    techniques: ['BLIP', 'FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 0, y: 3, z: 0 },
    midPoints: [{ x: 0, y: 5.7, z: 4.0 }],
    endBlock: { x: 0, y: 6, z: 11 },
    cameraPosition: { x: -6.8, y: 8.0, z: 3.8 },
    cameraTarget: { x: 0, y: 5.0, z: 5.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'CrytexJL',
    createdAt: '2026-10-22T10:00:00.000Z',
  },

  // =========================================================================
  // PENDING COMMUNITY SUBMISSIONS FOR ADMIN REVIEW
  // =========================================================================
  {
    id: 'e1-pending-ladder-skip',
    moduleId: 'E1',
    name: 'Leiter-Kanten-Skip auf Halbstufe',
    description:
      '1. Springe von (-3, 2, 12) an die seitliche Leiter-Hitbox bei (-4, 3, 14).\n2. Statt komplett hochzuklettern, drücke auf halber Höhe Shift + Space und ziehe direkt auf die Eichenstufe (-3, 4, 18).',
    timeSavedSeconds: 1.9,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['LADDER_CUT', 'TIMING'],
    startBlock: { x: -3, y: 2, z: 12 },
    midPoints: [{ x: -3.6, y: 4.5, z: 14.5 }],
    endBlock: { x: -3, y: 4, z: 18 },
    cameraPosition: { x: -9.5, y: 6.8, z: 11.0 },
    cameraTarget: { x: -3.2, y: 3.6, z: 15.0 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'PENDING',
    submittedBy: 'CommunityJumper99',
    createdAt: '2026-10-23T15:10:00.000Z',
  },
  {
    id: 'm1-pending-ironbar-transfer',
    moduleId: 'M1',
    name: 'Eisengitter-45°-Transfer vor den Headhitter',
    description:
      '1. Springe vom ersten Holzblock (0, 2, 4) direkt auf das dünne Eisengitter bei (2, 2, 7).\n2. Nutze Fence-Alignment an der Innenkante und ziehe direkt auf (0, 3, 11) unter den Headhitter.',
    timeSavedSeconds: 2.2,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['FENCE_ALIGNMENT', 'STRAFE_45'],
    startBlock: { x: 0, y: 2, z: 4 },
    midPoints: [{ x: 2.0, y: 3.6, z: 7.0 }],
    endBlock: { x: 0, y: 3, z: 11 },
    cameraPosition: { x: 7.2, y: 6.2, z: 4.0 },
    cameraTarget: { x: 0.8, y: 2.8, z: 7.5 },
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'PENDING',
    submittedBy: 'BastiGHG_Sub',
    createdAt: '2026-10-23T16:05:00.000Z',
  },
];
