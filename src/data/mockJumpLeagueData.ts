import { Cut, JLModule, VoxelBlock } from '@/types/jumpleague';

function createPlatform(
  xStart: number,
  xEnd: number,
  y: number,
  zStart: number,
  zEnd: number,
  type: VoxelBlock['type']
): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  for (let x = xStart; x <= xEnd; x++) {
    for (let z = zStart; z <= zEnd; z++) {
      blocks.push({ position: { x, y, z }, type });
    }
  }
  return blocks;
}

// ============================================================================
// MODULE E1: "Eichen-Ruine & Zaunpfad" (EASY)
// ============================================================================
const moduleE1Blocks: VoxelBlock[] = [
  // Start Platform (Gold Block at center 0, 1, 0)
  ...createPlatform(-1, 1, 1, -1, 1, 'STONE_BRICKS'),
  { position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' },

  // Normal route stepping stones (curving right towards +X, +Z)
  { position: { x: 2, y: 1, z: 2 }, type: 'OAK_PLANKS' },
  { position: { x: 4, y: 2, z: 3 }, type: 'OAK_PLANKS' },
  { position: { x: 5, y: 2, z: 5 }, type: 'OAK_SLAB' },
  { position: { x: 4, y: 3, z: 7 }, type: 'OAK_PLANKS' },

  // Direct Cut Target 1: Oak Slab shortcut at (1, 2, 5)
  { position: { x: 1, y: 2, z: 5 }, type: 'OAK_SLAB' },

  // Mid Checkpoint Platform around (1, 3, 9)
  ...createPlatform(0, 2, 3, 8, 10, 'STONE_BRICKS'),
  { position: { x: 1, y: 3, z: 9 }, type: 'GOLD_BLOCK' },

  // Fence Pillar & Neo Wall section
  { position: { x: -2, y: 4, z: 11 }, type: 'OAK_FENCE' },
  { position: { x: -2, y: 5, z: 11 }, type: 'STONE_BRICKS' },
  // Neo Obstacle Wall at x=1, z=12, y=4..6
  { position: { x: 1, y: 4, z: 12 }, type: 'STONE_BRICKS' },
  { position: { x: 1, y: 5, z: 12 }, type: 'STONE_BRICKS' },
  { position: { x: 1, y: 6, z: 12 }, type: 'STONE_BRICKS' },

  // Normal detour around left of the wall
  { position: { x: -3, y: 4, z: 13 }, type: 'OAK_PLANKS' },
  { position: { x: -2, y: 5, z: 15 }, type: 'OAK_SLAB' },
  { position: { x: 0, y: 5, z: 16 }, type: 'OAK_PLANKS' },

  // Post-wall landing block for the Neo cut
  { position: { x: 1, y: 4, z: 14 }, type: 'OAK_SLAB' },
  { position: { x: 1, y: 4, z: 15 }, type: 'OAK_PLANKS' },

  // Final ascent to Goal
  { position: { x: 2, y: 5, z: 17 }, type: 'OAK_PLANKS' },
  ...createPlatform(0, 2, 6, 19, 21, 'STONE_BRICKS'),
  { position: { x: 1, y: 6, z: 20 }, type: 'EMERALD_BLOCK' },
];

// ============================================================================
// MODULE M14: "Festungs-Gitter & Leiter-Turm" (MEDIUM)
// ============================================================================
const moduleM14Blocks: VoxelBlock[] = [
  // Start Platform
  ...createPlatform(-1, 1, 1, -1, 1, 'STONE_BRICKS'),
  { position: { x: 0, y: 1, z: 0 }, type: 'GOLD_BLOCK' },

  // First section: Headhitter ceiling + gap
  { position: { x: 0, y: 2, z: 3 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 5, z: 3 }, type: 'STONE_BRICKS' }, // Headhitter ceiling block
  { position: { x: 3, y: 2, z: 4 }, type: 'OAK_PLANKS' },
  { position: { x: 5, y: 3, z: 6 }, type: 'OAK_SLAB' },
  { position: { x: 3, y: 3, z: 8 }, type: 'OAK_PLANKS' },

  // Direct Headhitter landing platform
  { position: { x: 0, y: 3, z: 7 }, type: 'OAK_SLAB' },
  { position: { x: 0, y: 3, z: 8 }, type: 'OAK_PLANKS' },

  // Central Ladder Tower at x=0, z=11
  { position: { x: 0, y: 4, z: 11 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 5, z: 11 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 6, z: 11 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 4, z: 10 }, type: 'LADDER' },
  { position: { x: 0, y: 5, z: 10 }, type: 'LADDER' },
  { position: { x: 0, y: 6, z: 10 }, type: 'LADDER' },
  { position: { x: 0, y: 7, z: 11 }, type: 'GOLD_BLOCK' },

  // Iron Bars precision bridge vs normal side path
  { position: { x: 1, y: 6, z: 13 }, type: 'IRON_BARS' },
  { position: { x: 1, y: 7, z: 16 }, type: 'IRON_BARS' },
  // Normal side stairs
  { position: { x: -3, y: 6, z: 12 }, type: 'OAK_PLANKS' },
  { position: { x: -4, y: 7, z: 14 }, type: 'OAK_PLANKS' },
  { position: { x: -3, y: 7, z: 16 }, type: 'OAK_SLAB' },
  { position: { x: -1, y: 8, z: 18 }, type: 'OAK_PLANKS' },

  // Goal Platform
  ...createPlatform(0, 2, 8, 19, 21, 'STONE_BRICKS'),
  { position: { x: 1, y: 8, z: 20 }, type: 'EMERALD_BLOCK' },
];

// ============================================================================
// MODULE H8: "Katakomben-Doppel-Neo" (HARD)
// ============================================================================
const moduleH8Blocks: VoxelBlock[] = [
  // Start Platform
  ...createPlatform(-1, 1, 2, -1, 1, 'STONE_BRICKS'),
  { position: { x: 0, y: 2, z: 0 }, type: 'GOLD_BLOCK' },

  // Normal winding path left
  { position: { x: -3, y: 3, z: 2 }, type: 'STONE_BRICKS' },
  { position: { x: -5, y: 3, z: 5 }, type: 'OAK_SLAB' },
  { position: { x: -4, y: 4, z: 8 }, type: 'OAK_FENCE' },
  { position: { x: -2, y: 4, z: 10 }, type: 'STONE_BRICKS' },

  // Center Neo Pillar #1
  { position: { x: 0, y: 3, z: 3 }, type: 'OAK_PLANKS' },
  { position: { x: 0, y: 4, z: 4 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 5, z: 4 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 6, z: 4 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 3, z: 6 }, type: 'OAK_SLAB' },

  // Fence Alignment & Blip Slab section
  { position: { x: 1, y: 4, z: 9 }, type: 'OAK_FENCE' },
  { position: { x: 1, y: 5, z: 12 }, type: 'OAK_SLAB' },
  { position: { x: 1, y: 5, z: 13 }, type: 'GOLD_BLOCK' },

  // Second Half: Iron Bar Neo to Goal
  { position: { x: 1, y: 6, z: 15 }, type: 'IRON_BARS' },
  { position: { x: 1, y: 7, z: 15 }, type: 'IRON_BARS' },
  { position: { x: 4, y: 6, z: 14 }, type: 'OAK_PLANKS' },
  { position: { x: 5, y: 7, z: 17 }, type: 'OAK_SLAB' },
  { position: { x: 3, y: 7, z: 19 }, type: 'OAK_PLANKS' },

  // Goal Platform
  ...createPlatform(0, 2, 7, 18, 20, 'STONE_BRICKS'),
  { position: { x: 1, y: 7, z: 19 }, type: 'EMERALD_BLOCK' },
];

// ============================================================================
// MODULE U3: "Void-Sanctum & Pixel-Blip" (ULTRA)
// ============================================================================
const moduleU3Blocks: VoxelBlock[] = [
  // Start Platform
  ...createPlatform(-1, 1, 3, -1, 1, 'STONE_BRICKS'),
  { position: { x: 0, y: 3, z: 0 }, type: 'GOLD_BLOCK' },

  // Normal ultra path (right arc)
  { position: { x: 3, y: 4, z: 2 }, type: 'OAK_FENCE' },
  { position: { x: 5, y: 5, z: 5 }, type: 'IRON_BARS' },
  { position: { x: 4, y: 5, z: 8 }, type: 'OAK_SLAB' },
  { position: { x: 2, y: 6, z: 10 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 6, z: 11 }, type: 'GOLD_BLOCK' },

  // Direct Fence-to-Slab Blip shortcut blocks
  { position: { x: 0, y: 4, z: 4 }, type: 'OAK_FENCE' },
  { position: { x: 0, y: 5, z: 8 }, type: 'OAK_SLAB' },

  // Upper Void Section
  { position: { x: -3, y: 7, z: 13 }, type: 'IRON_BARS' },
  { position: { x: -4, y: 8, z: 16 }, type: 'OAK_FENCE' },
  { position: { x: -2, y: 8, z: 19 }, type: 'OAK_SLAB' },

  // Ultra Headhitter + Pillar Neo directly toward Goal
  { position: { x: 0, y: 9, z: 11 }, type: 'STONE_BRICKS' }, // Headhitter block above Checkpoint
  { position: { x: 0, y: 7, z: 15 }, type: 'OAK_SLAB' },
  { position: { x: 0, y: 8, z: 16 }, type: 'STONE_BRICKS' },
  { position: { x: 0, y: 9, z: 16 }, type: 'STONE_BRICKS' },

  // Goal Platform
  ...createPlatform(-1, 1, 8, 20, 22, 'STONE_BRICKS'),
  { position: { x: 0, y: 8, z: 21 }, type: 'EMERALD_BLOCK' },
];

export const INITIAL_MODULES: JLModule[] = [
  {
    id: 'E1',
    name: 'Eichen-Ruine & Zaunpfad',
    difficulty: 'EASY',
    dimensions: { x: 9, y: 7, z: 23 },
    blockCount: moduleE1Blocks.length,
    blocks: moduleE1Blocks,
  },
  {
    id: 'M14',
    name: 'Festungs-Gitter & Leiter-Turm',
    difficulty: 'MEDIUM',
    dimensions: { x: 10, y: 9, z: 23 },
    blockCount: moduleM14Blocks.length,
    blocks: moduleM14Blocks,
  },
  {
    id: 'H8',
    name: 'Katakomben-Doppel-Neo',
    difficulty: 'HARD',
    dimensions: { x: 11, y: 8, z: 22 },
    blockCount: moduleH8Blocks.length,
    blocks: moduleH8Blocks,
  },
  {
    id: 'U3',
    name: 'Void-Sanctum & Pixel-Blip',
    difficulty: 'ULTRA',
    dimensions: { x: 10, y: 10, z: 24 },
    blockCount: moduleU3Blocks.length,
    blocks: moduleU3Blocks,
  },
];

export const INITIAL_CUTS: Cut[] = [
  // ======================== MODULE E1 CUTS ========================
  {
    id: 'cut-e1-spawn-skip',
    moduleId: 'E1',
    name: 'Spawn-Plattform Diagonal-Skip auf Eichenstufe',
    description:
      '1. Stelle dich auf den vorderen rechten Rand von Block (1, 1, 1) neben dem Goldblock.\n2. Richte dein Fadenkreuz ca. 12° leicht nach links auf die Eichenholzstufe bei (1, 2, 5).\n3. Sprinte mit 45°-Strafe an und springe am letzten Pixel der Steinziegel-Kante ab – du überspringst damit komplett die 4 äußeren Holzblöcke.',
    timeSavedSeconds: 2.4,
    difficulty: 'SAFE',
    consistencyRating: 5,
    techniques: ['STRAFE_45', 'TIMING'],
    startBlock: { x: 1, y: 1, z: 1 },
    endBlock: { x: 1, y: 2, z: 5 },
    cameraPosition: { x: 6.5, y: 5.2, z: -1.5 },
    cameraTarget: { x: 1, y: 2, z: 3.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'VeniCraft_JL',
    createdAt: '2026-10-15T14:20:00.000Z',
  },
  {
    id: 'cut-e1-pillar-neo',
    moduleId: 'E1',
    name: 'Checkpoint-Säulen-Neo auf Halbstufe',
    description:
      '1. Nach dem Checkpoint (1, 3, 9) läufst du bis zur vorderen Kante von (1, 3, 10).\n2. Statt den langen Umweg links über den Zaunpfad zu nehmen, springst du rechts um die 3-Block hohe Steinziegel-Säule bei (1, 4, 12).\n3. Ziehe die Maus im Scheitelpunkt um ~35° nach links (A+W Strafe) und lande direkt auf der Eichenstufe (1, 4, 14).',
    timeSavedSeconds: 3.2,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['NEO', 'STRAFE_45'],
    startBlock: { x: 1, y: 3, z: 10 },
    midPoints: [{ x: 2.6, y: 5.1, z: 12.0 }],
    endBlock: { x: 1, y: 4, z: 14 },
    cameraPosition: { x: 6.8, y: 6.8, z: 9.2 },
    cameraTarget: { x: 1.2, y: 4.2, z: 12.2 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'APPROVED',
    submittedBy: 'KevJumpZ',
    createdAt: '2026-10-16T18:05:00.000Z',
  },
  {
    id: 'cut-e1-fence-boost',
    moduleId: 'E1',
    name: 'Zaun-Alignment Direkt-Finish',
    description:
      '1. Nutze die erhöhte 1.5-Block Hitbox des Eichenholzzauns bei (-2, 4, 11), indem du seitlich an den Steinblock darüber streifst.\n2. Von der Zaun-Oberkante kannst du den Zwischenblock bei (-3, 4, 13) komplett auslassen und direkt auf (0, 5, 16) springen.',
    timeSavedSeconds: 1.7,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: -2, y: 4, z: 11 },
    endBlock: { x: 0, y: 5, z: 16 },
    cameraPosition: { x: -6.5, y: 7.4, z: 10.5 },
    cameraTarget: { x: -1, y: 4.8, z: 13.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'BastiGHG_Fan',
    createdAt: '2026-10-18T11:30:00.000Z',
  },

  // ======================== MODULE M14 CUTS ========================
  {
    id: 'cut-m14-headhitter-gap',
    moduleId: 'M14',
    name: 'Headhitter-Momentum-Skip über 4-Block-Lücke',
    description:
      '1. Springe vom Start auf Block (0, 2, 3), über dem sich auf (0, 5, 3) der Deckenblock befindet.\n2. Positioniere dich ans hintere Drittel von (0, 2, 3), starte den Sprint und drücke im letzten Moment Leertaste (Delayed Headhitter).\n3. Durch den Decken-Boost erreichst du direkt die Halbstufe (0, 3, 7) und sparst die komplette rechte Schlaufe.',
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
    id: 'cut-m14-ladder-ledge',
    moduleId: 'M14',
    name: 'Leiter-Kanten-Cut auf Eisengitter',
    description:
      '1. Klettere am Leiter-Turm (0, 5, 10) nur bis zur zweiten Sprosse und halte Shift auf der schmalen 0.1875-Block-Hitbox.\n2. Drehe dich um 160° nach rechts hinten zum ersten Eisengitter (1, 6, 13).\n3. Ein kurzer Shift-Release + W-Tap-Sprung bringt dich direkt auf das obere Gitter, ohne den Turm ganz hochzuklettern.',
    timeSavedSeconds: 1.9,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['LADDER_CUT', 'FENCE_ALIGNMENT'],
    startBlock: { x: 0, y: 5, z: 10 },
    midPoints: [{ x: 1.8, y: 6.9, z: 11.5 }],
    endBlock: { x: 1, y: 6, z: 13 },
    cameraPosition: { x: 5.5, y: 8.2, z: 9.5 },
    cameraTarget: { x: 0.6, y: 6.0, z: 11.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'APPROVED',
    submittedBy: 'LukasPK',
    createdAt: '2026-10-19T16:40:00.000Z',
  },
  {
    id: 'cut-m14-ironbar-chain',
    moduleId: 'M14',
    name: 'Eisengitter-Doppelsprung ins Ziel',
    description:
      '1. Statt den linken Holzweg (-3, 6, 12 -> -4, 7, 14) zu nehmen, bleibst du auf der dünnen Eisengitter-Route.\n2. Nutze auf (1, 6, 13) ein F3+B Hitbox-Alignment exakt mittig auf dem Kreuzgitter.\n3. Springe im 45°-Winkel auf (1, 7, 16) und von dort ohne Stopp direkt auf die Ziel-Plattform (1, 8, 19).',
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

  // ======================== MODULE H8 CUTS ========================
  {
    id: 'cut-h8-double-neo',
    moduleId: 'H8',
    name: 'Katakomben-Säulen-Neo (3-Block Bypass)',
    description:
      '1. Springe vom Start direkt auf (0, 3, 3) vor der massiven 3-Block-Steinziegelsäule.\n2. Hole maximalen Schwung von der hinteren Kante (z = 2.3) und springe rechts an der Säule (0, 4, 4) vorbei.\n3. Lande perfekt auf der Eichenstufe (0, 3, 6) – du sparst den gesamten linken 4-Sprünge-Bogen!',
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
  {
    id: 'cut-h8-ironbar-neo-finish',
    moduleId: 'H8',
    name: 'Pixel-Perfect Eisengitter-Neo zum Smaragdblock',
    description:
      '1. Vom Checkpoint (1, 5, 13) visierst du die linke Außenkante des doppelten Eisengitters bei (1, 6, 15) an.\n2. Da Eisengitter eine schmalere Kollisionsbox als volle Blöcke haben, kannst du einen engen Links-Neo mit +1Y Höhengewinn direkt auf die Zielplattform (1, 7, 18) ziehen.\n3. Erfordert Frame-genauen Absprung (1-Tick-Window).',
    timeSavedSeconds: 4.5,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 1,
    techniques: ['NEO', 'FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 1, y: 5, z: 13 },
    midPoints: [{ x: -0.4, y: 7.4, z: 15.5 }],
    endBlock: { x: 1, y: 7, z: 18 },
    cameraPosition: { x: -5.2, y: 9.2, z: 13.5 },
    cameraTarget: { x: 0.5, y: 6.5, z: 15.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-loop-42694-large.mp4',
    status: 'APPROVED',
    submittedBy: 'PixelGod_99',
    createdAt: '2026-10-21T15:30:00.000Z',
  },

  // ======================== MODULE U3 CUTS ========================
  {
    id: 'cut-u3-void-blip',
    moduleId: 'U3',
    name: 'Void-Fence-Blip direkt zum Checkpoint',
    description:
      '1. Vom Start (0, 3, 0) springst du geradeaus auf den einzelnen Eichenzaun (0, 4, 4).\n2. Triff die untere Kante der Eichenstufe (0, 5, 8) für einen Tick-genauen Slab-Blip und springe direkt weiter auf den Checkpoint (0, 6, 11).\n3. Spart die gesamte rechte Eisengitter-Schleife.',
    timeSavedSeconds: 3.8,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 2,
    techniques: ['BLIP', 'FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 0, y: 3, z: 0 },
    midPoints: [
      { x: 0, y: 5.7, z: 4.0 },
      { x: 0, y: 6.4, z: 8.0 },
    ],
    endBlock: { x: 0, y: 6, z: 11 },
    cameraPosition: { x: -6.8, y: 8.0, z: 3.8 },
    cameraTarget: { x: 0, y: 5.0, z: 5.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'APPROVED',
    submittedBy: 'CrytexJL',
    createdAt: '2026-10-22T10:00:00.000Z',
  },
  {
    id: 'cut-u3-headhitter-sanctum-skip',
    moduleId: 'U3',
    name: 'Sanctum Headhitter-Neo ins Modul-Ziel',
    description:
      '1. Nutze den Headhitter-Block (0, 9, 11) direkt über dem Checkpoint (0, 6, 11) für maximalen Vorwärts-Speed.\n2. Lande im vollen Lauf auf der Halbstufe (0, 7, 15) und ziehe sofort einen Rechts-Neo um die Säule (0, 8, 16) direkt auf den Smaragdblock (0, 8, 21).',
    timeSavedSeconds: 4.8,
    difficulty: 'PIXEL_PERFECT',
    consistencyRating: 1,
    techniques: ['HEADHITTER', 'NEO', 'STRAFE_45', 'TIMING'],
    startBlock: { x: 0, y: 6, z: 11 },
    midPoints: [
      { x: 0, y: 7.8, z: 15.0 },
      { x: 1.7, y: 9.2, z: 17.5 },
    ],
    endBlock: { x: 0, y: 8, z: 21 },
    cameraPosition: { x: 6.8, y: 11.0, z: 14.0 },
    cameraTarget: { x: 0.4, y: 8.0, z: 16.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'APPROVED',
    submittedBy: 'PixelGod_99',
    createdAt: '2026-10-22T19:45:00.000Z',
  },

  // ======================== PENDING COMMUNITY SUBMISSIONS (FOR ADMIN CHECK) ========================
  {
    id: 'cut-pending-e1-slab-transfer',
    moduleId: 'E1',
    name: 'Halbstufen-Blip auf den Checkpoint',
    description:
      '1. Von der ersten Shortcut-Halbstufe (1, 2, 5) musst du nicht über (4, 3, 7) springen.\n2. Mit einem präzisen 45°-Strafe + Jam-Timing erreichst du direkt die Vorderkante der Checkpoint-Plattform bei (1, 3, 8).',
    timeSavedSeconds: 1.5,
    difficulty: 'MEDIUM',
    consistencyRating: 4,
    techniques: ['STRAFE_45', 'BLIP'],
    startBlock: { x: 1, y: 2, z: 5 },
    endBlock: { x: 1, y: 3, z: 8 },
    cameraPosition: { x: -5.2, y: 5.8, z: 4.5 },
    cameraTarget: { x: 1, y: 2.8, z: 6.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-hud-screen-interface-99790-large.mp4',
    status: 'PENDING',
    submittedBy: 'Felix_JLCuts',
    createdAt: '2026-10-23T12:15:00.000Z',
  },
  {
    id: 'cut-pending-h8-fence-skip',
    moduleId: 'H8',
    name: 'Zaun-Pfosten-Transfer zum Checkpoint',
    description:
      '1. Nach dem ersten Säulen-Neo auf (0, 3, 6) springst du direkt auf den Eichenholzzaun (1, 4, 9).\n2. Von der 1.5-Block-Zaunhöhe schaffst du mit sauberem Jam-Absprung den 4-Block-Transfer direkt auf den Gold-Checkpoint (1, 5, 13).',
    timeSavedSeconds: 2.2,
    difficulty: 'HEAVY',
    consistencyRating: 3,
    techniques: ['FENCE_ALIGNMENT', 'TIMING'],
    startBlock: { x: 0, y: 3, z: 6 },
    midPoints: [{ x: 1, y: 5.8, z: 9 }],
    endBlock: { x: 1, y: 5, z: 13 },
    cameraPosition: { x: 6.2, y: 7.5, z: 8.0 },
    cameraTarget: { x: 0.8, y: 4.5, z: 9.5 },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-99786-large.mp4',
    status: 'PENDING',
    submittedBy: 'TrymacsSub_04',
    createdAt: '2026-10-23T14:00:00.000Z',
  },
];
