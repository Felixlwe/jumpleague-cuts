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
 * Parses block state strings formatted like:
 * "minecraft:oak_stairs[facing=east,half=bottom,waterlogged=false]"
 */
export function parseBlockStateString(raw: string): {
  type: string;
  facing?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  half?: 'bottom' | 'top';
  slabType?: 'bottom' | 'top' | 'double';
  open?: boolean;
  state: Record<string, string | boolean | number>;
  isAir: boolean;
} {
  const bracketIdx = raw.indexOf('[');
  const fullName = bracketIdx === -1 ? raw : raw.substring(0, bracketIdx);
  const cleanName = fullName.replace(/^minecraft:/, '').toLowerCase().trim();
  const state: Record<string, string | boolean | number> = {};

  if (bracketIdx !== -1 && raw.endsWith(']')) {
    const statesInside = raw.substring(bracketIdx + 1, raw.length - 1);
    const pairs = statesInside.split(',');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k && v) {
        const key = k.trim().toLowerCase();
        const val = v.trim().toLowerCase();
        if (val === 'true') state[key] = true;
        else if (val === 'false') state[key] = false;
        else if (!isNaN(Number(val))) state[key] = Number(val);
        else state[key] = val;
      }
    }
  }

  const isAir =
    cleanName === 'air' ||
    cleanName === 'cave_air' ||
    cleanName === 'void_air' ||
    cleanName === '';

  // Extract explicit properties
  let facing: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | undefined =
    undefined;
  if (
    typeof state.facing === 'string' &&
    ['north', 'south', 'east', 'west', 'up', 'down'].includes(state.facing)
  ) {
    facing = state.facing as 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  }

  const half =
    state.half === 'top' || state.half === 'bottom'
      ? (state.half as 'bottom' | 'top')
      : undefined;

  const slabType =
    state.type === 'top' || state.type === 'bottom' || state.type === 'double'
      ? (state.type as 'bottom' | 'top' | 'double')
      : undefined;

  const open = typeof state.open === 'boolean' ? state.open : undefined;

  return {
    type: cleanName,
    facing,
    half,
    slabType,
    open,
    state,
    isAir,
  };
}

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

  readTagPayload(tagType: number): any {
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
        const list: any[] = [];
        for (let i = 0; i < length; i++) {
          list.push(this.readTagPayload(elemType));
        }
        return list;
      }
      case 10: {
        // TAG_Compound
        const compound: Record<string, any> = {};
        while (true) {
          const type = this.readByte();
          if (type === 0) break; // TAG_End
          const name = this.readString();
          compound[name] = this.readTagPayload(type);
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

  readRoot(): Record<string, any> {
    const rootType = this.readByte();
    if (rootType !== 10) {
      throw new Error(`Expected root TAG_Compound (10), got ${rootType}`);
    }
    // Read root compound name (usually "" or "Schematic")
    this.readString();
    return this.readTagPayload(10);
  }
}

/**
 * Decodes a Minecraft VarInt from a byte array
 */
function decodeVarInt(data: Uint8Array, offset: { val: number }): number {
  let result = 0;
  let shift = 0;
  while (offset.val < data.length) {
    const byte = data[offset.val++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      break;
    }
    shift += 7;
    if (shift >= 35) {
      throw new Error('VarInt too large in BlockData');
    }
  }
  return result;
}

/**
 * Locates the schematic root compound within possible envelopes
 */
function findSchematicCompound(root: Record<string, any>): Record<string, any> {
  if (root.Schematic && typeof root.Schematic === 'object') {
    return root.Schematic;
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
    if (val && typeof val === 'object' && val.Width !== undefined) {
      return val;
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
  20: 'glass',
  24: 'sandstone',
  30: 'cobweb',
  35: 'white_wool',
  41: 'gold_block',
  42: 'iron_block',
  44: 'oak_slab',
  45: 'bricks',
  49: 'obsidian',
  53: 'oak_stairs',
  57: 'diamond_block',
  65: 'ladder',
  85: 'oak_fence',
  96: 'oak_trapdoor',
  98: 'stone_bricks',
  101: 'iron_bars',
  102: 'glass_pane',
  106: 'vine',
  108: 'brick_stairs',
  109: 'stone_brick_stairs',
  111: 'lily_pad',
  112: 'nether_bricks',
  113: 'nether_brick_fence',
  114: 'nether_brick_stairs',
  126: 'oak_slab',
  133: 'emerald_block',
  134: 'spruce_stairs',
  135: 'birch_stairs',
  136: 'jungle_stairs',
  139: 'cobblestone_wall',
  171: 'white_carpet',
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

  // If the entry crosses the 64-bit boundary into the next long
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
  rootCompound: Record<string, any>,
  fallbackName: string
): ParsedSchematic {
  const regions = rootCompound.Regions as Record<string, any>;
  const regionNames = Object.keys(regions);
  if (regionNames.length === 0) {
    throw new Error('Litematica-Datei enthält keine Regionen unter "Regions".');
  }

  // 1. Gehe in den ersten Schlüssel unter Regions (meist 'Unnamed' oder benutzerdefinierter Name)
  const primaryRegionName = regionNames[0];
  const region = regions[primaryRegionName];
  if (!region || typeof region !== 'object') {
    throw new Error(
      `Ungültige Litematica-Region "${primaryRegionName}" gefunden.`
    );
  }

  // 2. Lese dort die Dimensionen aus dem Size-Tag (x, y, z)
  const sizeTag = region.Size || region.size;
  if (!sizeTag || typeof sizeTag !== 'object') {
    throw new Error(
      `Region "${primaryRegionName}" besitzt keinen gültigen Size-Tag.`
    );
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

  // 3. Lese die BlockStatePalette (Array aus Objekten mit Name und optionalen Properties)
  const rawPalette: any[] = Array.isArray(region.BlockStatePalette)
    ? region.BlockStatePalette
    : [];

  const paletteMap = rawPalette.map((item) => {
    if (!item || typeof item !== 'object') {
      return parseBlockStateString('minecraft:air');
    }
    const blockName = String(item.Name || item.name || 'minecraft:air');
    const props = item.Properties || item.properties;

    if (props && typeof props === 'object' && Object.keys(props).length > 0) {
      const propStr = Object.entries(props)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      return parseBlockStateString(`${blockName}[${propStr}]`);
    }

    return parseBlockStateString(blockName);
  });

  // 4. Lese das BlockStates Array (Bit-Packed Long Array)
  const blockStates: bigint[] = Array.isArray(region.BlockStates)
    ? region.BlockStates
    : [];

  const totalBlocks = width * height * length;
  const paletteCount = Math.max(1, paletteMap.length);

  // Bit-Größe pro Block flexibel (basierend auf Math.max(4, Math.ceil(Math.log2(palette.length))))
  let bitsPerBlock = Math.max(4, Math.ceil(Math.log2(paletteCount)));

  // Adaptive Prüfung falls Litematica mit kleinerer Bitbreite (z. B. 2 oder 3 Bits) gepackt wurde
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

        const parsed =
          paletteMap[palId] || parseBlockStateString('minecraft:air');
        if (parsed.isAir) continue;

        // Vorzeichen-orientierte Achsenkorrektur bei negativen Size-Werten
        const finalX = rawX < 0 ? width - 1 - x : x;
        const finalY = rawY < 0 ? height - 1 - y : y;
        const finalZ = rawZ < 0 ? length - 1 - z : z;

        blocks.push({
          position: {
            x: finalX - halfWidth,
            y: finalY + 1,
            z: finalZ,
          },
          type: parsed.type,
          facing: parsed.facing,
          half: parsed.half,
          slabType: parsed.slabType,
          open: parsed.open,
          state: parsed.state,
        });
      }
    }
  }

  // Modul-Name aus Metadata, Fallback oder Regionenname ableiten
  const metaName =
    typeof rootCompound.Metadata?.Name === 'string' &&
    rootCompound.Metadata.Name.trim().length > 0
      ? rootCompound.Metadata.Name.trim()
      : undefined;

  const cleanModuleName = (
    metaName ||
    fallbackName.replace(/\.(schem|schematic|litematic)$/i, '') ||
    (primaryRegionName !== 'Unnamed' ? primaryRegionName : '') ||
    'Litematica Modul'
  )
    .replace(/[_\s-]+/g, ' ')
    .trim();

  const moduleShortId = `U-${cleanModuleName.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const module: JLModule = {
    id: moduleShortId,
    name: cleanModuleName || 'Litematica Modul',
    difficulty: 'MEDIUM',
    dimensions: { x: width, y: height, z: length },
    blockCount: blocks.length,
    blocks,
  };

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
  rootCompound: Record<string, any>,
  fallbackName: string = 'Structure-Module',
  options?: SchematicParseOptions
): ParsedSchematic {
  const sizeArray = rootCompound.size || rootCompound.Size;
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

  const rawPalette: any[] = Array.isArray(rootCompound.palette)
    ? rootCompound.palette
    : Array.isArray(rootCompound.Palette)
    ? rootCompound.Palette
    : [];

  const paletteMap = rawPalette.map((item) => {
    if (!item || typeof item !== 'object') {
      return parseBlockStateString('minecraft:air');
    }
    const blockName = String(item.Name || item.name || 'minecraft:air');
    const props = item.Properties || item.properties;

    if (props && typeof props === 'object' && Object.keys(props).length > 0) {
      const propStr = Object.entries(props)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      return parseBlockStateString(`${blockName}[${propStr}]`);
    }

    return parseBlockStateString(blockName);
  });

  const rawBlocks: any[] = Array.isArray(rootCompound.blocks)
    ? rootCompound.blocks
    : Array.isArray(rootCompound.Blocks)
    ? rootCompound.Blocks
    : [];

  const blocks: VoxelBlock[] = [];
  const halfWidth = Math.floor(width / 2);

  for (const b of rawBlocks) {
    if (!b || typeof b !== 'object') continue;
    const pos = b.pos;
    if (!Array.isArray(pos) || pos.length < 3) continue;

    const bx = Number(pos[0]);
    const by = Number(pos[1]);
    const bz = Number(pos[2]);

    const stateIdx = Number(b.state ?? 0);
    const parsed =
      paletteMap[stateIdx] || parseBlockStateString('minecraft:air');

    if (parsed.isAir) continue;

    blocks.push({
      position: {
        x: bx - halfWidth,
        y: by + 1,
        z: bz,
      },
      type: parsed.type,
      facing: parsed.facing,
      half: parsed.half,
      slabType: parsed.slabType,
      open: parsed.open,
      state: parsed.state,
    });
  }

  // Parse BukkitValues if present (e.g. modules.top provides start, finish, difficulty, name)
  const bukkit = rootCompound.BukkitValues;
  let spawnPoint: Vector3D | undefined = undefined;
  let finishPoint: Vector3D | undefined = undefined;
  let detectedDifficulty: ModuleDifficulty | undefined = undefined;
  let detectedName: string | undefined = undefined;

  if (bukkit && typeof bukkit === 'object') {
    if (Array.isArray(bukkit.start) && bukkit.start.length >= 3) {
      spawnPoint = {
        x: Number(bukkit.start[0]) - halfWidth,
        y: Number(bukkit.start[1]) + 1,
        z: Number(bukkit.start[2]),
      };
    }
    if (Array.isArray(bukkit.finish) && bukkit.finish.length >= 3) {
      finishPoint = {
        x: Number(bukkit.finish[0]) - halfWidth,
        y: Number(bukkit.finish[1]) + 1,
        z: Number(bukkit.finish[2]),
      };
    }
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

  const module: JLModule = {
    id: resolvedId,
    shortCode: resolvedId,
    name: resolvedName,
    difficulty: resolvedDifficulty,
    dimensions: { x: width, y: height, z: length },
    blockCount: blocks.length,
    blocks,
    spawnPoint,
    finishPoint,
  };

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
        // Fallback: uncompressed raw NBT
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
    return parseLitematicaCompound(rootCompound, fallbackName);
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
    (schem.Blocks && schem.Blocks.Palette);

  if (isSponge) {
    const paletteTag =
      schem.Palette || (schem.Blocks && schem.Blocks.Palette);
    const blockDataTag: Uint8Array | undefined =
      schem.BlockData || (schem.Blocks && schem.Blocks.Data);

    if (!blockDataTag) {
      throw new Error('Schematic enthält kein BlockData-Array.');
    }

    // Invert Palette: index -> blockStateString
    const paletteMap: string[] = [];
    if (paletteTag && typeof paletteTag === 'object') {
      if (Array.isArray(paletteTag)) {
        for (let i = 0; i < paletteTag.length; i++) {
          paletteMap[i] = String(paletteTag[i]);
        }
      } else {
        for (const [stateStr, idVal] of Object.entries(paletteTag)) {
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

    // Sponge Coordinate order: index = (y * length + z) * width + x
    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const palId = blockPaletteIds[idx++];
          const rawBlock = paletteMap[palId] || 'minecraft:air';
          const parsed = parseBlockStateString(rawBlock);

          if (parsed.isAir) continue;

          blocks.push({
            position: {
              x: x - halfWidth,
              y: y + 1,
              z: z,
            },
            type: parsed.type,
            facing: parsed.facing,
            half: parsed.half,
            slabType: parsed.slabType,
            open: parsed.open,
            state: parsed.state,
          });
        }
      }
    }
  } else if (schem.Blocks && schem.Data) {
    // 4. Legacy MCEdit .schematic Parsing
    const rawBlocks: Uint8Array = schem.Blocks;
    const rawData: Uint8Array = schem.Data;
    let idx = 0;

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const blockId = rawBlocks[idx];
          const meta = rawData[idx];
          idx++;

          if (blockId === 0) continue; // air

          const typeName = LEGACY_ID_MAP[blockId] || 'stone';
          let facing: 'north' | 'south' | 'east' | 'west' | undefined =
            undefined;
          let half: 'bottom' | 'top' | undefined = undefined;

          // Legacy stairs metadata
          if (typeName.endsWith('stairs')) {
            const dir = meta & 0x03;
            if (dir === 0) facing = 'east';
            else if (dir === 1) facing = 'west';
            else if (dir === 2) facing = 'south';
            else if (dir === 3) facing = 'north';
            half = (meta & 0x04) !== 0 ? 'top' : 'bottom';
          }

          blocks.push({
            position: {
              x: x - halfWidth,
              y: y + 1,
              z: z,
            },
            type: typeName,
            facing,
            half,
          });
        }
      }
    }
  } else {
    throw new Error(
      'Unbekanntes Schematic-Format. Weder Sponge .schem noch MCEdit .schematic erkannt.'
    );
  }

  const cleanModuleName = fallbackName
    .replace(/\.(schem|schematic|litematic)$/i, '')
    .replace(/[_\s-]+/g, ' ')
    .trim();

  // Generate unique module ID based on filename or timestamp
  const moduleShortId = `U-${cleanModuleName.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const module: JLModule = {
    id: moduleShortId,
    name: cleanModuleName || 'Schematic Modul',
    difficulty: 'MEDIUM',
    dimensions: { x: width, y: height, z: length },
    blockCount: blocks.length,
    blocks,
  };

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
