import { ungzip, inflate } from 'pako';
import {
  JLModule,
  ModuleDifficulty,
  Vector3D,
  VoxelBlock,
} from '@/types/jumpleague';

/**
 * Options for schematic parsing
 */
export interface SchematicParseOptions {
  difficulty?: ModuleDifficulty;
  shortCode?: string;
  name?: string;
}

/**
 * Result of a successfully parsed Minecraft schematic (.schem / .schematic / .nbt)
 */
export interface ParsedSchematic {
  name: string;
  dimensions: Vector3D;
  blockCount: number;
  blocks: VoxelBlock[];
  module: JLModule;
}

/**
 * Normalizes and centers voxel coordinates into JumpLeague 3D world space
 */
export function centerCoordinate(
  x: number,
  y: number,
  z: number,
  halfWidth: number
): Vector3D {
  return {
    x: x - halfWidth,
    y: y + 1,
    z,
  };
}

/**
 * Detects spawn and finish points from metadata (BukkitValues) or pressure plates / tactical blocks
 */
export function detectSpawnAndFinish(
  blocks: VoxelBlock[],
  bukkit?: Record<string, unknown>,
  halfWidth: number = 0
): { spawnPoint?: Vector3D; finishPoint?: Vector3D } {
  let spawnPoint: Vector3D | undefined = undefined;
  let finishPoint: Vector3D | undefined = undefined;

  // 1. Check BukkitValues (modules.top format)
  if (bukkit && typeof bukkit === 'object') {
    const rawStart = bukkit.start || bukkit.Start;
    const rawFinish = bukkit.finish || bukkit.Finish;

    if (Array.isArray(rawStart) && rawStart.length >= 3) {
      spawnPoint = centerCoordinate(
        Number(rawStart[0]),
        Number(rawStart[1]),
        Number(rawStart[2]),
        halfWidth
      );
    }
    if (Array.isArray(rawFinish) && rawFinish.length >= 3) {
      finishPoint = centerCoordinate(
        Number(rawFinish[0]),
        Number(rawFinish[1]),
        Number(rawFinish[2]),
        halfWidth
      );
    }
  }

  // 2. Fallback: Search for pressure plates in blocks
  if (!spawnPoint || !finishPoint) {
    const plates = blocks.filter((b) =>
      b.type.toLowerCase().includes('pressure_plate')
    );

    if (plates.length >= 2) {
      plates.sort((a, b) => a.position.z - b.position.z);
      if (!spawnPoint) spawnPoint = { ...plates[0].position };
      if (!finishPoint) finishPoint = { ...plates[plates.length - 1].position };
    } else if (plates.length === 1 && !spawnPoint) {
      spawnPoint = { ...plates[0].position };
    }
  }

  // 3. Fallback: Search for gold_block (often start) and emerald_block (often finish)
  if (!spawnPoint) {
    const gold = blocks.find((b) => b.type.toLowerCase().includes('gold_block'));
    if (gold) {
      spawnPoint = {
        x: gold.position.x,
        y: gold.position.y + 1,
        z: gold.position.z,
      };
    }
  }

  if (!finishPoint) {
    const emerald = blocks.find((b) =>
      b.type.toLowerCase().includes('emerald_block')
    );
    if (emerald) {
      finishPoint = {
        x: emerald.position.x,
        y: emerald.position.y + 1,
        z: emerald.position.z,
      };
    }
  }

  return { spawnPoint, finishPoint };
}

/**
 * Standard JLModule factory helper with normalized IDs and defaults
 */
export function createJLModule(options: {
  id?: string;
  shortCode?: string;
  name: string;
  difficulty?: ModuleDifficulty;
  dimensions: Vector3D;
  blocks: VoxelBlock[];
  spawnPoint?: Vector3D;
  finishPoint?: Vector3D;
}): JLModule {
  const shortCode =
    options.shortCode ||
    options.id ||
    `U-${options.name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'MOD'}-${Date.now().toString().slice(-4)}`;
  const id = options.id || shortCode;

  return {
    id,
    shortCode,
    name: options.name,
    difficulty: options.difficulty || 'MEDIUM',
    dimensions: options.dimensions,
    blockCount: options.blocks.length,
    blocks: options.blocks,
    spawnPoint: options.spawnPoint,
    finishPoint: options.finishPoint,
  };
}

/**
 * Normalizes legacy or alternative block names to official modern Minecraft 1.20+ IDs
 */
export function normalizeBlockName(raw: string): string {
  let clean = raw.toLowerCase().trim().replace(/^minecraft:/i, '');

  // 1.20 Name-Normalisierung:
  if (clean === 'grass') return 'short_grass';
  if (clean === 'tallgrass') return 'tall_grass';
  if (clean === 'sign') return 'oak_sign';
  if (clean === 'wall_sign') return 'oak_wall_sign';
  if (clean === 'skull') return 'skeleton_skull';
  if (clean === 'bed') return 'red_bed';

  // Legacy aliases
  if (clean === 'trapdoor') return 'oak_trapdoor';
  if (clean === 'wooden_door') return 'oak_door';
  if (clean === 'fence') return 'oak_fence';
  if (clean === 'fence_gate') return 'oak_fence_gate';
  if (clean === 'wooden_slab') return 'oak_slab';
  if (clean === 'leaves') return 'oak_leaves';
  if (clean === 'log') return 'oak_log';
  if (clean === 'leaves2') return 'acacia_leaves';
  if (clean === 'log2') return 'acacia_log';
  if (clean === 'banner') return 'white_banner';
  if (clean === 'wall_banner') return 'white_wall_banner';
  if (clean === 'carpet') return 'white_carpet';
  if (clean === 'concrete') return 'white_concrete';
  if (clean === 'concrete_powder') return 'white_concrete_powder';
  if (clean === 'wool') return 'white_wool';
  if (clean === 'stained_hardened_clay' || clean === 'hardened_clay') return 'terracotta';
  if (clean === 'stained_glass') return 'white_stained_glass';
  if (clean === 'stained_glass_pane') return 'white_stained_glass_pane';
  if (clean === 'double_stone_slab') return 'smooth_stone';
  if (clean === 'double_wooden_slab') return 'oak_planks';
  if (clean === 'step') return 'stone_slab';

  return clean;
}

/**
 * Parses block state strings formatted like:
 * "minecraft:oak_stairs[facing=east,half=bottom,waterlogged=false]"
 * or block names with an optional NBT properties compound.
 * Always builds a canonical sorted bracket string (e.g. "minecraft:vine[east=false,north=true]")
 * and a lossless string properties dictionary.
 */
export function parseBlockStateString(
  raw: string,
  additionalProps?: Record<string, unknown>
): {
  type: string;
  cleanName: string;
  facing?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  half?: 'bottom' | 'top';
  slabType?: 'bottom' | 'top' | 'double';
  open?: boolean;
  state: Record<string, string | boolean | number>;
  properties: Record<string, string>;
  isAir: boolean;
} {
  const bracketIdx = raw.indexOf('[');
  const fullName = bracketIdx === -1 ? raw : raw.substring(0, bracketIdx);
  const rawClean = fullName.replace(/^minecraft:/i, '').toLowerCase().trim();
  const cleanName = normalizeBlockName(rawClean);
  const properties: Record<string, string> = {};
  const state: Record<string, string | boolean | number> = {};

  // 1. Parse brackets in raw string
  if (bracketIdx !== -1 && raw.endsWith(']')) {
    const statesInside = raw.substring(bracketIdx + 1, raw.length - 1);
    const pairs = statesInside.split(',');
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const key = pair.substring(0, eqIdx).trim().toLowerCase();
        const val = pair.substring(eqIdx + 1).trim().toLowerCase();
        if (key) {
          properties[key] = val;
          if (val === 'true') state[key] = true;
          else if (val === 'false') state[key] = false;
          else if (!isNaN(Number(val)) && val !== '') state[key] = Number(val);
          else state[key] = val;
        }
      }
    }
  }

  // 2. Merge additionalProps if provided (e.g. from NBT Properties compound)
  if (additionalProps && typeof additionalProps === 'object') {
    for (const [k, v] of Object.entries(additionalProps)) {
      if (v !== undefined && v !== null) {
        const key = k.toLowerCase().trim();
        const valStr = String(v).toLowerCase().trim();
        properties[key] = valStr;
        if (valStr === 'true') state[key] = true;
        else if (valStr === 'false') state[key] = false;
        else if (!isNaN(Number(valStr)) && valStr !== '') state[key] = Number(valStr);
        else state[key] = valStr;
      }
    }
  }

  // 3. Construct canonical formatted type string with sorted properties:
  // e.g. "minecraft:oak_stairs[facing=east,half=bottom,shape=straight]"
  const sortedKeys = Object.keys(properties).sort();
  const formattedType =
    sortedKeys.length > 0
      ? `minecraft:${cleanName}[${sortedKeys.map((k) => `${k}=${properties[k]}`).join(',')}]`
      : `minecraft:${cleanName}`;

  const isAir =
    cleanName === 'air' ||
    cleanName === 'cave_air' ||
    cleanName === 'void_air' ||
    cleanName === 'structure_void' ||
    cleanName === '';

  // Extract explicit properties
  let facing: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | undefined =
    undefined;
  const fVal =
    properties.facing ||
    (typeof state.facing === 'string' ? state.facing : undefined);
  if (fVal && ['north', 'south', 'east', 'west', 'up', 'down'].includes(fVal)) {
    facing = fVal as 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  }

  const hVal = properties.half || state.half;
  const half =
    hVal === 'top' || hVal === 'bottom'
      ? (hVal as 'bottom' | 'top')
      : undefined;

  const tVal = properties.type || state.type;
  const slabType =
    tVal === 'top' || tVal === 'bottom' || tVal === 'double'
      ? (tVal as 'bottom' | 'top' | 'double')
      : undefined;

  const open =
    typeof state.open === 'boolean'
      ? state.open
      : properties.open === 'true'
      ? true
      : properties.open === 'false'
      ? false
      : undefined;

  return {
    type: formattedType,
    cleanName,
    facing,
    half,
    slabType,
    open,
    state,
    properties,
    isAir,
  };
}

export type NBTTagPayload =
  | number
  | bigint
  | string
  | Uint8Array
  | number[]
  | bigint[]
  | NBTTagPayload[]
  | NBTCompound;

export type NBTCompound = { [key: string]: NBTTagPayload };

/**
 * Complete Browser-Compatible Big-Endian NBT Reader
 */
export class NBTReader {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number = 0;
  private textDecoder = new TextDecoder('utf-8');

  constructor(data: Uint8Array) {
    this.buffer = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  hasRemaining(): boolean {
    return this.offset < this.buffer.length;
  }

  readByte(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readShort(): number {
    const val = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return val;
  }

  readInt(): number {
    const val = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return val;
  }

  readLong(): bigint {
    const val = this.view.getBigInt64(this.offset, false);
    this.offset += 8;
    return val;
  }

  readFloat(): number {
    const val = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return val;
  }

  readDouble(): number {
    const val = this.view.getFloat64(this.offset, false);
    this.offset += 8;
    return val;
  }

  readByteArray(): Uint8Array {
    const length = this.readInt();
    if (length < 0) throw new Error(`Negative ByteArray length: ${length}`);
    const bytes = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  readString(): string {
    const length = this.view.getUint16(this.offset, false);
    this.offset += 2;
    if (length === 0) return '';
    const bytes = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return this.textDecoder.decode(bytes);
  }

  readIntArray(): number[] {
    const length = this.readInt();
    const result: number[] = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.readInt();
    }
    return result;
  }

  readLongArray(): bigint[] {
    const length = this.readInt();
    const result: bigint[] = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.readLong();
    }
    return result;
  }

  readTagPayload(tagType: number): NBTTagPayload | null {
    switch (tagType) {
      case 0: // TAG_End
        return null;
      case 1: // TAG_Byte
        return this.readByte();
      case 2: // TAG_Short
        return this.readShort();
      case 3: // TAG_Int
        return this.readInt();
      case 4: // TAG_Long
        return this.readLong();
      case 5: // TAG_Float
        return this.readFloat();
      case 6: // TAG_Double
        return this.readDouble();
      case 7: // TAG_ByteArray
        return this.readByteArray();
      case 8: // TAG_String
        return this.readString();
      case 9: {
        // TAG_List
        const elemType = this.readByte();
        const length = this.readInt();
        const list: NBTTagPayload[] = [];
        for (let i = 0; i < length; i++) {
          const payload = this.readTagPayload(elemType);
          if (payload !== null) list.push(payload);
        }
        return list;
      }
      case 10: {
        // TAG_Compound
        const compound: NBTCompound = {};
        while (true) {
          const type = this.readByte();
          if (type === 0) break; // TAG_End
          const name = this.readString();
          const payload = this.readTagPayload(type);
          if (payload !== null) compound[name] = payload;
        }
        return compound;
      }
      case 11: // TAG_IntArray
        return this.readIntArray();
      case 12: // TAG_LongArray
        return this.readLongArray();
      default:
        throw new Error(
          `Unknown NBT Tag Type ${tagType} at byte offset ${this.offset}`
        );
    }
  }

  readRoot(): NBTCompound {
    const rootType = this.readByte();
    if (rootType !== 10) {
      throw new Error(`Expected root TAG_Compound (10), got ${rootType}`);
    }
    this.readString();
    return (this.readTagPayload(10) as NBTCompound) || {};
  }
}

/**
 * Decodes a Minecraft VarInt from a byte array (handling unsigned bytes with b & 0xff)
 */
export function decodeVarInt(
  blockData: Uint8Array,
  offset: { val: number }
): number {
  let value = 0,
    shift = 0;
  while (offset.val < blockData.length) {
    const b = blockData[offset.val++] & 0xff;
    value |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
    if (shift >= 35) {
      throw new Error('VarInt too large in BlockData');
    }
  }
  return value;
}

/**
 * Locates the schematic root compound within possible envelopes
 */
function findSchematicCompound(root: NBTCompound): NBTCompound {
  if (root.Schematic && typeof root.Schematic === 'object' && !Array.isArray(root.Schematic)) {
    return root.Schematic as NBTCompound;
  }
  if (
    root.Width !== undefined &&
    (root.Palette !== undefined ||
      root.Blocks !== undefined ||
      root.BlockData !== undefined)
  ) {
    return root;
  }
  for (const key of Object.keys(root)) {
    const val = root[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && (val as NBTCompound).Width !== undefined) {
      return val as NBTCompound;
    }
  }
  return root;
}

/**
 * Legacy block ID to modern Minecraft block name fallback map
 */
const LEGACY_ID_MAP: Record<number, string> = {
  1: 'stone',
  2: 'grass_block',
  3: 'dirt',
  4: 'cobblestone',
  5: 'oak_planks',
  7: 'bedrock',
  12: 'sand',
  13: 'gravel',
  14: 'gold_ore',
  15: 'iron_ore',
  16: 'coal_ore',
  17: 'oak_log',
  18: 'oak_leaves',
  19: 'sponge',
  20: 'glass',
  24: 'sandstone',
  30: 'cobweb',
  35: 'white_wool',
  41: 'gold_block',
  42: 'iron_block',
  43: 'smooth_stone',
  44: 'stone_slab',
  45: 'bricks',
  49: 'obsidian',
  53: 'oak_stairs',
  57: 'diamond_block',
  64: 'oak_door',
  65: 'ladder',
  66: 'rail',
  67: 'cobblestone_stairs',
  71: 'iron_door',
  79: 'ice',
  80: 'snow_block',
  82: 'clay',
  85: 'oak_fence',
  86: 'pumpkin',
  87: 'netherrack',
  88: 'soul_sand',
  89: 'glowstone',
  91: 'carved_pumpkin',
  95: 'white_stained_glass',
  96: 'oak_trapdoor',
  98: 'stone_bricks',
  101: 'iron_bars',
  102: 'glass_pane',
  103: 'melon',
  106: 'vine',
  107: 'oak_fence_gate',
  108: 'brick_stairs',
  109: 'stone_brick_stairs',
  111: 'lily_pad',
  112: 'nether_bricks',
  113: 'nether_brick_fence',
  114: 'nether_brick_stairs',
  121: 'end_stone',
  126: 'oak_slab',
  128: 'sandstone_stairs',
  129: 'emerald_ore',
  133: 'emerald_block',
  134: 'spruce_stairs',
  135: 'birch_stairs',
  136: 'jungle_stairs',
  139: 'cobblestone_wall',
  152: 'redstone_block',
  155: 'quartz_block',
  156: 'quartz_stairs',
  159: 'terracotta',
  160: 'white_stained_glass_pane',
  161: 'acacia_leaves',
  162: 'acacia_log',
  163: 'acacia_stairs',
  164: 'dark_oak_stairs',
  165: 'slime_block',
  167: 'iron_trapdoor',
  168: 'prismarine',
  169: 'sea_lantern',
  170: 'hay_block',
  171: 'white_carpet',
  172: 'terracotta',
  173: 'coal_block',
  174: 'packed_ice',
  179: 'red_sandstone',
  180: 'red_sandstone_stairs',
  181: 'red_sandstone_slab',
  182: 'red_sandstone_slab',
  183: 'spruce_fence_gate',
  184: 'birch_fence_gate',
  185: 'jungle_fence_gate',
  186: 'dark_oak_fence_gate',
  187: 'acacia_fence_gate',
  188: 'spruce_fence',
  189: 'birch_fence',
  190: 'jungle_fence',
  191: 'dark_oak_fence',
  192: 'acacia_fence',
  193: 'spruce_door',
  194: 'birch_door',
  195: 'jungle_door',
  196: 'acacia_door',
  197: 'dark_oak_door',
  198: 'end_rod',
  201: 'purpur_block',
  202: 'purpur_pillar',
  203: 'purpur_stairs',
  205: 'purpur_slab',
  206: 'end_stone_bricks',
  212: 'frosted_ice',
  213: 'magma_block',
  214: 'nether_wart_block',
  215: 'red_nether_bricks',
  216: 'bone_block',
  251: 'white_concrete',
  252: 'white_concrete_powder',
};

/**
 * Unpacks a block state index from a Litematica bit-packed LongArray (64-bit continuous bit stream)
 */
export function getLitematicaBlockIndex(
  blockStates: bigint[],
  index: number,
  bitsPerEntry: number
): number {
  if (!blockStates || blockStates.length === 0) return 0;

  const bitOffset = BigInt(index) * BigInt(bitsPerEntry);
  const startLongIndex = Number(bitOffset / BigInt(64));
  const startBitOffset = Number(bitOffset % BigInt(64));

  if (startLongIndex >= blockStates.length) return 0;

  const mask = (BigInt(1) << BigInt(bitsPerEntry)) - BigInt(1);
  const currentLong = BigInt.asUintN(64, blockStates[startLongIndex]);
  let value = currentLong >> BigInt(startBitOffset);
  const bitsAvailable = 64 - startBitOffset;

  if (bitsAvailable < bitsPerEntry && startLongIndex + 1 < blockStates.length) {
    const nextLong = BigInt.asUintN(64, blockStates[startLongIndex + 1]);
    value |= nextLong << BigInt(bitsAvailable);
  }

  return Number(value & mask);
}

/**
 * Parses a native Litematica (.litematic) NBT root compound
 */
export function parseLitematicaCompound(
  rootCompound: NBTCompound,
  fallbackName: string = 'Litematica Modul',
  options?: SchematicParseOptions
): ParsedSchematic {
  const regions = rootCompound.Regions as NBTCompound | undefined;
  if (!regions || typeof regions !== 'object' || Array.isArray(regions)) {
    throw new Error('Litematica-Datei enthält keine Regionen unter "Regions".');
  }

  const regionNames = Object.keys(regions);
  if (regionNames.length === 0) {
    throw new Error('Litematica-Datei enthält keine Regionen unter "Regions".');
  }

  const primaryRegionName = regionNames[0];
  const region = regions[primaryRegionName] as NBTCompound | undefined;
  if (!region || typeof region !== 'object' || Array.isArray(region)) {
    throw new Error(`Ungültige Litematica-Region "${primaryRegionName}" gefunden.`);
  }

  const sizeTag = (region.Size || region.size) as NBTCompound | undefined;
  if (!sizeTag || typeof sizeTag !== 'object') {
    throw new Error(`Region "${primaryRegionName}" besitzt keinen gültigen Size-Tag.`);
  }

  const rawX = Number(sizeTag.x ?? sizeTag.X ?? 0);
  const rawY = Number(sizeTag.y ?? sizeTag.Y ?? 0);
  const rawZ = Number(sizeTag.z ?? sizeTag.Z ?? 0);

  const width = Math.abs(rawX);
  const height = Math.abs(rawY);
  const length = Math.abs(rawZ);

  if (!width || !height || !length) {
    throw new Error(
      `Ungültige Litematica-Dimensionen in "${primaryRegionName}": x=${rawX}, y=${rawY}, z=${rawZ}`
    );
  }

  const rawPalette: unknown[] = Array.isArray(region.BlockStatePalette)
    ? (region.BlockStatePalette as unknown[])
    : [];

  const paletteMap = rawPalette.map((item) => {
    if (!item || typeof item !== 'object') {
      return parseBlockStateString('minecraft:air');
    }
    const itemObj = item as Record<string, unknown>;
    const blockName = String(itemObj.Name || itemObj.name || 'minecraft:air');
    const props = (itemObj.Properties || itemObj.properties || {}) as Record<string, unknown>;
    return parseBlockStateString(blockName, props);
  });

  const blockStates: bigint[] = Array.isArray(region.BlockStates)
    ? (region.BlockStates as bigint[])
    : [];

  const totalBlocks = width * height * length;
  const paletteCount = Math.max(1, paletteMap.length);

  let bitsPerBlock = Math.max(4, Math.ceil(Math.log2(paletteCount)));

  if (blockStates.length > 0 && totalBlocks > 0) {
    for (let candidate = 2; candidate <= 16; candidate++) {
      if (Math.ceil((totalBlocks * candidate) / 64) === blockStates.length) {
        bitsPerBlock = candidate;
        break;
      }
    }
  }

  const blocks: VoxelBlock[] = [];
  const halfWidth = Math.floor(width / 2);

  let idx = 0;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < length; z++) {
      for (let x = 0; x < width; x++) {
        const flatIndex = idx++;
        const palId =
          blockStates.length > 0
            ? getLitematicaBlockIndex(blockStates, flatIndex, bitsPerBlock)
            : 0;

        const parsed = paletteMap[palId] || parseBlockStateString('minecraft:air');
        if (parsed.isAir) continue;

        const finalX = rawX < 0 ? width - 1 - x : x;
        const finalY = rawY < 0 ? height - 1 - y : y;
        const finalZ = rawZ < 0 ? length - 1 - z : z;

        blocks.push({
          position: centerCoordinate(finalX, finalY, finalZ, halfWidth),
          type: parsed.type,
          facing: parsed.facing,
          half: parsed.half,
          slabType: parsed.slabType,
          open: parsed.open,
          state: parsed.state,
          properties: parsed.properties,
        });
      }
    }
  }

  const { spawnPoint, finishPoint } = detectSpawnAndFinish(blocks);

  const metaName =
    typeof (rootCompound.Metadata as NBTCompound | undefined)?.Name === 'string' &&
    ((rootCompound.Metadata as NBTCompound).Name as string).trim().length > 0
      ? ((rootCompound.Metadata as NBTCompound).Name as string).trim()
      : undefined;

  const cleanModuleName = (
    options?.name ||
    metaName ||
    fallbackName.replace(/\.(schem|schematic|litematic)$/i, '') ||
    (primaryRegionName !== 'Unnamed' ? primaryRegionName : '') ||
    'Litematica Modul'
  )
    .replace(/[_\s-]+/g, ' ')
    .trim();

  const module = createJLModule({
    id: options?.shortCode,
    name: cleanModuleName,
    difficulty: options?.difficulty || 'MEDIUM',
    dimensions: { x: width, y: height, z: length },
    blocks,
    spawnPoint,
    finishPoint,
  });

  return {
    name: cleanModuleName,
    dimensions: { x: width, y: height, z: length },
    blockCount: blocks.length,
    blocks,
    module,
  };
}

/**
 * Parses a Vanilla Minecraft Structure NBT (.nbt) compound (e.g. from structure blocks or modules.top)
 */
export function parseVanillaStructureCompound(
  rootCompound: NBTCompound,
  fallbackName: string = 'Structure-Module',
  options?: SchematicParseOptions
): ParsedSchematic {
  const sizeArray = (rootCompound.size || rootCompound.Size) as unknown[] | undefined;
  if (!Array.isArray(sizeArray) || sizeArray.length < 3) {
    throw new Error('Vanilla Structure NBT enthält kein gültiges "size" Array.');
  }

  const width = Math.abs(Number(sizeArray[0]));
  const height = Math.abs(Number(sizeArray[1]));
  const length = Math.abs(Number(sizeArray[2]));

  if (!width || !height || !length) {
    throw new Error(
      `Ungültige Structure-Dimensionen: x=${sizeArray[0]}, y=${sizeArray[1]}, z=${sizeArray[2]}`
    );
  }

  const rawPalette: unknown[] = Array.isArray(rootCompound.palette)
    ? (rootCompound.palette as unknown[])
    : Array.isArray(rootCompound.Palette)
    ? (rootCompound.Palette as unknown[])
    : [];

  const paletteMap = rawPalette.map((item) => {
    if (!item || typeof item !== 'object') {
      return parseBlockStateString('minecraft:air');
    }
    const itemObj = item as Record<string, unknown>;
    const blockName = String(itemObj.Name || itemObj.name || 'minecraft:air');
    const props = (itemObj.Properties || itemObj.properties || {}) as Record<string, unknown>;
    return parseBlockStateString(blockName, props);
  });

  const rawBlocks: unknown[] = Array.isArray(rootCompound.blocks)
    ? (rootCompound.blocks as unknown[])
    : Array.isArray(rootCompound.Blocks)
    ? (rootCompound.Blocks as unknown[])
    : [];

  const blocks: VoxelBlock[] = [];
  const halfWidth = Math.floor(width / 2);

  for (const b of rawBlocks) {
    if (!b || typeof b !== 'object') continue;
    const bObj = b as Record<string, unknown>;
    const pos = bObj.pos;
    if (!Array.isArray(pos) || pos.length < 3) continue;

    const bx = Number(pos[0]);
    const by = Number(pos[1]);
    const bz = Number(pos[2]);

    const stateIdx = Number(bObj.state ?? 0);
    const parsed = paletteMap[stateIdx] || parseBlockStateString('minecraft:air');

    if (parsed.isAir) continue;

    blocks.push({
      position: centerCoordinate(bx, by, bz, halfWidth),
      type: parsed.type,
      facing: parsed.facing,
      half: parsed.half,
      slabType: parsed.slabType,
      open: parsed.open,
      state: parsed.state,
      properties: parsed.properties,
    });
  }

  const bukkit = rootCompound.BukkitValues as Record<string, unknown> | undefined;
  const { spawnPoint, finishPoint } = detectSpawnAndFinish(blocks, bukkit, halfWidth);

  let detectedDifficulty: ModuleDifficulty | undefined = undefined;
  let detectedName: string | undefined = undefined;

  if (bukkit && typeof bukkit === 'object') {
    if (typeof bukkit.difficulty === 'string') {
      const d = bukkit.difficulty.toUpperCase();
      if (d === 'EASY' || d === 'MEDIUM' || d === 'HARD' || d === 'ULTRA') {
        detectedDifficulty = d as ModuleDifficulty;
      }
    }
    if (bukkit.name !== undefined && bukkit.name !== null) {
      detectedName = String(bukkit.name).trim();
    }
  }

  const resolvedName =
    options?.name ||
    (detectedName ? `Modul ${detectedName}` : '') ||
    fallbackName
      .replace(/\.(schem|schematic|litematic|nbt)$/i, '')
      .replace(/[_\s-]+/g, ' ')
      .trim() ||
    'Importiertes Modul';

  const resolvedId =
    options?.shortCode ||
    (detectedName ? `#${detectedName}` : '') ||
    fallbackName
      .replace(/\.(schem|schematic|litematic|nbt)$/i, '')
      .trim() ||
    `U-${Date.now().toString().slice(-4)}`;

  const resolvedDifficulty =
    options?.difficulty || detectedDifficulty || 'EASY';

  const module = createJLModule({
    id: resolvedId,
    shortCode: resolvedId,
    name: resolvedName,
    difficulty: resolvedDifficulty,
    dimensions: { x: width, y: height, z: length },
    blocks,
    spawnPoint,
    finishPoint,
  });

  return {
    name: resolvedName,
    dimensions: { x: width, y: height, z: length },
    blockCount: blocks.length,
    blocks,
    module,
  };
}

/**
 * Decompresses and parses a .schem (Sponge v1/v2/v3), native .litematic, Vanilla structure .nbt or legacy .schematic file
 */
export async function parseSchematicData(
  rawData: Uint8Array,
  fallbackName: string = 'Uploaded-Module',
  options?: SchematicParseOptions
): Promise<ParsedSchematic> {
  // 1. Gzip / Zlib decompression
  let decompressed: Uint8Array;
  try {
    if (rawData[0] === 0x1f && rawData[1] === 0x8b) {
      decompressed = ungzip(rawData);
    } else {
      try {
        decompressed = inflate(rawData);
      } catch {
        decompressed = rawData;
      }
    }
  } catch {
    decompressed = rawData;
  }

  // 2. Parse NBT structure
  const reader = new NBTReader(decompressed);
  const rootCompound = reader.readRoot();

  // Check if native Litematica format (.litematic)
  if (
    rootCompound.Regions &&
    typeof rootCompound.Regions === 'object' &&
    !Array.isArray(rootCompound.Regions)
  ) {
    return parseLitematicaCompound(rootCompound, fallbackName, options);
  }

  // Check if Vanilla Structure NBT (.nbt / modules.top)
  if (
    (rootCompound.size && (rootCompound.palette || rootCompound.blocks)) ||
    (rootCompound.Size && (rootCompound.Palette || rootCompound.Blocks))
  ) {
    return parseVanillaStructureCompound(rootCompound, fallbackName, options);
  }

  const schem = findSchematicCompound(rootCompound);

  const width = Number(schem.Width);
  const height = Number(schem.Height);
  const length = Number(schem.Length);

  if (!width || !height || !length) {
    throw new Error(
      `Ungültige Schematic-Dimensionen: Width=${width}, Height=${height}, Length=${length}`
    );
  }

  const blocks: VoxelBlock[] = [];
  const halfWidth = Math.floor(width / 2);

  // 3. Sponge Schematic Parsing (.schem v1, v2, v3)
  const isSponge =
    schem.Palette !== undefined ||
    schem.BlockData !== undefined ||
    (schem.Blocks && (schem.Blocks as NBTCompound).Palette !== undefined);

  if (isSponge) {
    const paletteTag =
      schem.Palette || (schem.Blocks && (schem.Blocks as NBTCompound).Palette);
    const rawBlockData =
      schem.BlockData ??
      (schem.Blocks && typeof schem.Blocks === 'object'
        ? (schem.Blocks as NBTCompound).Data
        : undefined);
    const blockDataTag = rawBlockData instanceof Uint8Array ? rawBlockData : undefined;

    if (!blockDataTag) {
      throw new Error('Schematic enthält kein BlockData-Array.');
    }

    const paletteMap: string[] = [];
    if (paletteTag && typeof paletteTag === 'object') {
      if (Array.isArray(paletteTag)) {
        for (let i = 0; i < paletteTag.length; i++) {
          paletteMap[i] = String(paletteTag[i]);
        }
      } else {
        for (const [stateStr, idVal] of Object.entries(paletteTag as Record<string, unknown>)) {
          paletteMap[Number(idVal)] = stateStr;
        }
      }
    }

    const totalBlocks = width * height * length;
    const offset = { val: 0 };
    const blockPaletteIds: number[] = new Array(totalBlocks);

    for (let i = 0; i < totalBlocks; i++) {
      blockPaletteIds[i] = decodeVarInt(blockDataTag, offset);
    }

    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const palId = blockPaletteIds[idx++];
          const rawBlock = paletteMap[palId] || 'minecraft:air';
          const parsed = parseBlockStateString(rawBlock);

          if (parsed.isAir) continue;

          blocks.push({
            position: centerCoordinate(x, y, z, halfWidth),
            type: parsed.type,
            facing: parsed.facing,
            half: parsed.half,
            slabType: parsed.slabType,
            open: parsed.open,
            state: parsed.state,
            properties: parsed.properties,
          });
        }
      }
    }
  } else if (schem.Blocks && schem.Data) {
    // 4. Legacy MCEdit .schematic Parsing
    const rawBlocks = schem.Blocks as Uint8Array;
    const rawData = schem.Data as Uint8Array;
    let idx = 0;

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const blockId = rawBlocks[idx];
          const meta = rawData[idx];
          idx++;

          if (blockId === 0) continue;

          const typeName = LEGACY_ID_MAP[blockId] || 'stone';
          let facing: 'north' | 'south' | 'east' | 'west' | undefined = undefined;
          let half: 'bottom' | 'top' | undefined = undefined;

          if (typeName.endsWith('stairs')) {
            const dir = meta & 0x03;
            if (dir === 0) facing = 'east';
            else if (dir === 1) facing = 'west';
            else if (dir === 2) facing = 'south';
            else if (dir === 3) facing = 'north';
            half = (meta & 0x04) !== 0 ? 'top' : 'bottom';
          }

          const legacyProps: Record<string, string> = {};
          if (facing) legacyProps.facing = facing;
          if (half) legacyProps.half = half;
          const parsed = parseBlockStateString(`minecraft:${typeName}`, legacyProps);

          blocks.push({
            position: centerCoordinate(x, y, z, halfWidth),
            type: parsed.type,
            facing: parsed.facing,
            half: parsed.half,
            state: parsed.state,
            properties: parsed.properties,
          });
        }
      }
    }
  } else {
    throw new Error(
      'Unbekanntes Schematic-Format. Weder Sponge .schem noch MCEdit .schematic erkannt.'
    );
  }

  const { spawnPoint, finishPoint } = detectSpawnAndFinish(blocks);

  const cleanModuleName = (
    options?.name ||
    fallbackName
      .replace(/\.(schem|schematic|litematic)$/i, '')
      .replace(/[_\s-]+/g, ' ')
      .trim() ||
    'Schematic Modul'
  );

  const module = createJLModule({
    id: options?.shortCode,
    name: cleanModuleName,
    difficulty: options?.difficulty || 'MEDIUM',
    dimensions: { x: width, y: height, z: length },
    blocks,
    spawnPoint,
    finishPoint,
  });

  return {
    name: cleanModuleName,
    dimensions: { x: width, y: height, z: length },
    blockCount: blocks.length,
    blocks,
    module,
  };
}

/**
 * Convenient browser file loader: Takes a File from an <input type="file">
 */
export async function parseSchematicFile(file: File): Promise<ParsedSchematic> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  return parseSchematicData(uint8, file.name);
}

/**
 * Converts a Base64 string to a Uint8Array across browser and Node environments
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.trim().replace(/\s/g, '');
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  const binaryString = atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses a Base64-encoded Minecraft NBT / Schematic string (.schem, structure .nbt, or .litematic)
 */
export async function parseBase64Schematic(
  base64String: string,
  fallbackName: string = 'Imported-Module',
  options?: SchematicParseOptions
): Promise<ParsedSchematic> {
  const rawData = base64ToUint8Array(base64String);
  return parseSchematicData(rawData, fallbackName, options);
}
