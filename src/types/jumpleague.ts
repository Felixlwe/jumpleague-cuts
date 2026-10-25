export type ModuleDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'ULTRA';
export type CutDifficulty = 'SAFE' | 'MEDIUM' | 'HEAVY' | 'PIXEL_PERFECT';
export type CutStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type MovementTech =
  | 'NEO'
  | 'HEADHITTER'
  | 'STRAFE_45'
  | 'LADDER_CUT'
  | 'TRAPDOOR'
  | 'BLIP'
  | 'FENCE_ALIGNMENT'
  | 'TIMING';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Cut {
  id: string;
  moduleId: string;
  name: string;                  // z.B. "Zaun-Neo auf Eichenstufe"
  description: string;           // Schritt-für-Schritt Lineup-Erklärung
  timeSavedSeconds: number;      // z.B. 2.1
  difficulty: CutDifficulty;
  consistencyRating: number;     // 1 bis 5 Sterne (Wie konstant im Run machbar?)
  techniques: MovementTech[];
  startBlock: Vector3D;          // Absprung-Block
  midPoints?: Vector3D[];        // Optional für Um-die-Ecke-Sprünge (Neos)
  endBlock: Vector3D;            // Lande-Block
  cameraPosition: Vector3D;      // Gespeicherte Kamera-Position
  cameraTarget: Vector3D;        // Punkt, auf den die Kamera schaut
  videoUrl: string;              // URL zu .mp4/.webm Clip oder YouTube-Embed
  status: CutStatus;             // 'PENDING' für Community-Einsendungen, 'APPROVED' nach Admin-Check
  verified?: boolean;            // false für unüberprüfte Community-Cuts, true nach Admin-Freigabe
  submittedBy: string;           // Ingame-Name des Einsenders
  createdAt: string;
}

export interface JLModule {
  id: string;                    // z.B. "E1", "M14", "H8", "U3"
  shortCode?: string;
  name: string;
  difficulty: ModuleDifficulty;
  description?: string;
  thumbnailUrl?: string;         // Vorschaubild (3D-Screenshot oder Data-URI)
  dimensions: Vector3D;
  blockCount: number;
  blocks: VoxelBlock[];          // Für das Test-Modul & geparste Schematics
  spawnPoint?: Vector3D;
  finishPoint?: Vector3D;
  isDeleted?: boolean;
  createdAt?: string;
}

export type VoxelBlockType =
  | 'STONE_BRICKS'
  | 'OAK_PLANKS'
  | 'OAK_SLAB'
  | 'OAK_FENCE'
  | 'IRON_BARS'
  | 'LADDER'
  | 'GOLD_BLOCK'
  | 'EMERALD_BLOCK'
  | 'GRASS_BLOCK'
  | 'OAK_LOG'
  | 'OAK_LEAVES'
  | 'GLASS'
  | 'COBWEB'
  | 'VINE'
  | 'LILY_PAD'
  | (string & {});

export interface VoxelBlock {
  position: Vector3D;
  type: VoxelBlockType;
  facing?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | string;
  half?: 'bottom' | 'top' | string;
  slabType?: 'bottom' | 'top' | 'double' | string;
  open?: boolean;
  state?: Record<string, string | boolean | number>;
  properties?: Record<string, string | boolean | number>;
}

export interface FilterState {
  moduleDifficulty: ModuleDifficulty | 'ALL';
  searchQuery: string;
  cutDifficulties: CutDifficulty[];
  techniques: MovementTech[];
  minTimeSaved: number;          // Slider-Wert in Sekunden (0 bis 5s)
  minConsistency: number;        // 1 bis 5 Sterne
}
