import { CutDifficulty, ModuleDifficulty, MovementTech, VoxelBlock } from '@/types/jumpleague';

export const CUT_DIFFICULTY_CONFIG: Record<
  CutDifficulty,
  {
    label: string;
    shortLabel: string;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    glowShadow: string;
  }
> = {
  SAFE: {
    label: 'Safe (Sicher)',
    shortLabel: 'SAFE',
    color: '#10b981',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    glowShadow: '0 0 16px rgba(16, 185, 129, 0.45)',
  },
  MEDIUM: {
    label: 'Medium (Mittel)',
    shortLabel: 'MEDIUM',
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/15',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/40',
    glowShadow: '0 0 16px rgba(6, 182, 212, 0.45)',
  },
  HEAVY: {
    label: 'Heavy (Risiko)',
    shortLabel: 'HEAVY',
    color: '#f97316',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/40',
    glowShadow: '0 0 16px rgba(249, 115, 22, 0.45)',
  },
  PIXEL_PERFECT: {
    label: 'Pixel Perfect (Extrem)',
    shortLabel: 'PIXEL PERFECT',
    color: '#a855f7',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    glowShadow: '0 0 18px rgba(168, 85, 247, 0.55)',
  },
};

export const MODULE_DIFFICULTY_CONFIG: Record<
  ModuleDifficulty,
  {
    label: string;
    color: string;
    badgeClass: string;
  }
> = {
  EASY: {
    label: 'Easy',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  MEDIUM: {
    label: 'Medium',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  HARD: {
    label: 'Hard',
    color: '#f97316',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
  ULTRA: {
    label: 'Ultra',
    color: '#a855f7',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
};

export const MOVEMENT_TECH_CONFIG: Record<
  MovementTech,
  {
    label: string;
    description: string;
  }
> = {
  NEO: {
    label: 'Neo',
    description: 'Sprung um eine Wand oder Säule herum in der Luft',
  },
  HEADHITTER: {
    label: 'Headhitter',
    description: 'Deckenblock über dem Kopf für maximalen Momentum-Boost nutzen',
  },
  STRAFE_45: {
    label: '45° Strafe',
    description: 'Diagonales Laufen + Kamera-Winkel für erhöhte Sprungweite',
  },
  LADDER_CUT: {
    label: 'Ladder Cut',
    description: 'Leiter-Hitbox als Absprungkante oder Skip nutzen',
  },
  TRAPDOOR: {
    label: 'Trapdoor',
    description: 'Präzise Kanten-Kollision an dünnen Stufen oder Klappen',
  },
  BLIP: {
    label: 'Blip',
    description: 'Tick-genauer Doppel-Jump an einer Stufen-/Blockkante',
  },
  FENCE_ALIGNMENT: {
    label: 'Fence Alignment',
    description: 'Exaktes Einrasten an der schmalen Hitbox eines Zauns oder Eisengitters',
  },
  TIMING: {
    label: 'Jump Timing',
    description: 'Perfekter Absprung am äußersten Pixel der Blockkante (Jam / Delayed Jump)',
  },
};

export const ALL_CUT_DIFFICULTIES: CutDifficulty[] = [
  'SAFE',
  'MEDIUM',
  'HEAVY',
  'PIXEL_PERFECT',
];

export const ALL_MOVEMENT_TECHS: MovementTech[] = [
  'NEO',
  'HEADHITTER',
  'STRAFE_45',
  'LADDER_CUT',
  'TRAPDOOR',
  'BLIP',
  'FENCE_ALIGNMENT',
  'TIMING',
];

export const VOXEL_BLOCK_LABELS: Record<string, string> = {
  STONE_BRICKS: 'Steinziegel',
  OAK_PLANKS: 'Eichenholzbretter',
  OAK_SLAB: 'Eichenholzstufe',
  OAK_FENCE: 'Eichenholzzaun',
  IRON_BARS: 'Eisengitter',
  LADDER: 'Leiter',
  GOLD_BLOCK: 'Goldblock (Start/CP)',
  EMERALD_BLOCK: 'Smaragdblock (Ziel)',
  GRASS_BLOCK: 'Grasblock',
  OAK_LOG: 'Eichenstamm',
  OAK_LEAVES: 'Eichenlaub',
  GLASS: 'Glas',
  COBWEB: 'Spinnennetz',
  VINE: 'Ranken',
  LILY_PAD: 'Seerosenblatt',
};
