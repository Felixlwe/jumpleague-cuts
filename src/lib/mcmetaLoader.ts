import * as THREE from 'three';
import { useEffect, useState } from 'react';
import { resolveBlockTextureName } from '@/lib/minecraftTextures';

/**
 * Neighbor connectivity map for auto-healing missing properties
 */
export interface NeighborSolidMap {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
  up: boolean;
}

export interface RawMcmetaElement {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: {
    origin: [number, number, number];
    axis: 'x' | 'y' | 'z';
    angle: number;
    rescale?: boolean;
  };
  faces: Record<
    string,
    {
      uv?: [number, number, number, number];
      texture: string;
      cullface?: string;
      rotation?: number;
      tintindex?: number;
    }
  >;
}

export interface RawMcmetaModel {
  parent?: string;
  textures?: Record<string, string>;
  elements?: RawMcmetaElement[];
  [key: string]: unknown;
}

export interface AppliedModel {
  model: string;
  x?: number;
  y?: number;
  uvlock?: boolean;
}

export interface McmetaData {
  blockDefinitions: Record<string, unknown>;
  models: Record<string, RawMcmetaModel>;
  atlasData: Record<string, [number, number, number, number]>;
  atlasTexture: THREE.Texture;
  atlasWidth: number;
  atlasHeight: number;
}

const CDNS = {
  blockDefinition: [
    'https://raw.githubusercontent.com/misode/mcmeta/summary/assets/block_definition/data.min.json',
    'https://cdn.jsdelivr.net/gh/misode/mcmeta@summary/assets/block_definition/data.min.json',
    'https://raw.githubusercontent.com/misode/mcmeta/summary/block_definition/data.min.json',
  ],
  model: [
    'https://raw.githubusercontent.com/misode/mcmeta/summary/assets/model/data.min.json',
    'https://cdn.jsdelivr.net/gh/misode/mcmeta@summary/assets/model/data.min.json',
    'https://raw.githubusercontent.com/misode/mcmeta/summary/model/data.min.json',
  ],
  atlasData: [
    'https://raw.githubusercontent.com/misode/mcmeta/atlas/all/data.min.json',
    'https://cdn.jsdelivr.net/gh/misode/mcmeta@atlas/all/data.min.json',
  ],
  atlasPng: [
    'https://raw.githubusercontent.com/misode/mcmeta/atlas/all/atlas.png',
    'https://cdn.jsdelivr.net/gh/misode/mcmeta@atlas/all/atlas.png',
  ],
};

// Global in-memory cache
let mcmetaPromise: Promise<McmetaData> | null = null;
let cachedMcmeta: McmetaData | null = null;
let cachedAtlasMaterial: THREE.MeshLambertMaterial | null = null;
const geometryCache = new Map<string, THREE.BufferGeometry>();

async function fetchWithFallbacks<T>(urls: string[]): Promise<T> {
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  const errDetail = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Konnte keine der URLs laden: ${urls.join(', ')}. Fehler: ${errDetail}`);
}

function loadAtlasTexture(urls: string[]): Promise<{ texture: THREE.Texture; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    let index = 0;

    const tryNext = () => {
      if (index >= urls.length) {
        reject(new Error('Konnte atlas.png von keinem CDN laden.'));
        return;
      }
      const url = urls[index++];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.needsUpdate = true;
        const width = img.naturalWidth || 2048;
        const height = img.naturalHeight || 2144;
        resolve({ texture, width, height });
      };
      img.onerror = () => {
        tryNext();
      };
      img.src = url;
    };

    tryNext();
  });
}

/**
 * Loads official Minecraft model data, block definitions, and texture atlas from misode/mcmeta
 */
export function loadMcmeta(): Promise<McmetaData> {
  if (cachedMcmeta) {
    return Promise.resolve(cachedMcmeta);
  }
  if (mcmetaPromise) {
    return mcmetaPromise;
  }

  mcmetaPromise = (async () => {
    const [blockDefinitions, models, atlasData, atlasTex] = await Promise.all([
      fetchWithFallbacks<Record<string, any>>(CDNS.blockDefinition),
      fetchWithFallbacks<Record<string, any>>(CDNS.model),
      fetchWithFallbacks<Record<string, [number, number, number, number]>>(CDNS.atlasData),
      loadAtlasTexture(CDNS.atlasPng),
    ]);

    cachedMcmeta = {
      blockDefinitions,
      models,
      atlasData,
      atlasTexture: atlasTex.texture,
      atlasWidth: atlasTex.width,
      atlasHeight: atlasTex.height,
    };

    return cachedMcmeta;
  })();

  return mcmetaPromise;
}

/**
 * Retrieves the single shared material used for all Minecraft blocks
 */
export function getAtlasMaterial(atlasTexture: THREE.Texture): THREE.MeshLambertMaterial {
  if (cachedAtlasMaterial && cachedAtlasMaterial.map === atlasTexture) {
    return cachedAtlasMaterial;
  }
  cachedAtlasMaterial = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    vertexColors: true,
    alphaTest: 0.1,
    transparent: true,
    side: THREE.DoubleSide,
  });
  return cachedAtlasMaterial;
}

/**
 * Parses block type string into name and properties dictionary
 */
export function parseBlockIdentifier(blockTypeString: string): {
  name: string;
  props: Record<string, string>;
} {
  const clean = blockTypeString.trim().toLowerCase().replace(/^minecraft:/, '');
  const bracketIdx = clean.indexOf('[');
  if (bracketIdx === -1) {
    return { name: clean, props: {} };
  }

  const name = clean.substring(0, bracketIdx).trim();
  const rawProps = clean.substring(bracketIdx + 1, clean.length - (clean.endsWith(']') ? 1 : 0));
  const props: Record<string, string> = {};

  for (const part of rawProps.split(',')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const k = part.substring(0, eqIdx).trim();
      const v = part.substring(eqIdx + 1).trim();
      if (k) props[k] = v;
    }
  }

  return { name, props };
}

/**
 * Evaluates a multipart 'when' condition against the current block properties
 */
function matchWhenCondition(when: unknown, props: Record<string, string>): boolean {
  if (!when || typeof when !== 'object') return true;

  const whenObj = when as Record<string, unknown>;

  if (Array.isArray(whenObj.OR)) {
    return (whenObj.OR as unknown[]).some((sub) => matchWhenCondition(sub, props));
  }
  if (Array.isArray(whenObj.AND)) {
    return (whenObj.AND as unknown[]).every((sub) => matchWhenCondition(sub, props));
  }

  for (const [k, v] of Object.entries(whenObj)) {
    if (k === 'OR' || k === 'AND') continue;
    const currentVal = props[k.toLowerCase()] ?? '';
    const targetVal = String(v).toLowerCase();
    const allowed = targetVal.split('|').map((s) => s.trim());
    if (!allowed.includes(currentVal)) {
      return false;
    }
  }

  return true;
}

function extractTextureSprite(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    if ('sprite' in val && typeof (val as { sprite: unknown }).sprite === 'string') {
      return (val as { sprite: string }).sprite;
    }
  }
  return '';
}

/**
 * Resolves the parent chain and collects textures and elements
 */
function resolveModelDefinition(
  modelId: string,
  models: Record<string, RawMcmetaModel>
): {
  textures: Record<string, string>;
  elements: RawMcmetaElement[] | null;
} {
  const cleanId = modelId.replace(/^minecraft:/, '');
  let currId: string | null = cleanId;
  const chain: RawMcmetaModel[] = [];
  const visited = new Set<string>();

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const modelObj: RawMcmetaModel | undefined = models[currId];
    if (!modelObj) break;
    chain.unshift(modelObj); // parents first
    currId = modelObj.parent ? String(modelObj.parent).replace(/^minecraft:/, '') : null;
  }

  const textures: Record<string, unknown> = {};
  for (const m of chain) {
    if (m.textures) {
      Object.assign(textures, m.textures);
    }
  }

  // Resolve texture reference variables (#all, #side, etc.) and unpack modern sprite objects
  const resolvedTextures: Record<string, string> = {};
  for (const k of Object.keys(textures)) {
    let val: unknown = textures[k];
    let depth = 0;
    while (depth < 10) {
      const spriteStr = extractTextureSprite(val);
      if (spriteStr.startsWith('#')) {
        val = textures[spriteStr.slice(1)];
        depth++;
      } else {
        val = spriteStr;
        break;
      }
    }
    resolvedTextures[k] = extractTextureSprite(val).replace(/^minecraft:/, '');
  }

  let elements: RawMcmetaElement[] | null = null;
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].elements && Array.isArray(chain[i].elements)) {
      elements = chain[i].elements ?? null;
      break;
    }
  }

  return { textures: resolvedTextures, elements };
}

/**
 * Rotates a 3D point [x, y, z] in degrees
 */
function rotatePoint(
  p: [number, number, number],
  origin: [number, number, number],
  axis: 'x' | 'y' | 'z',
  deg: number,
  rescale: boolean = false
): [number, number, number] {
  if (deg === 0) return p;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let [x, y, z] = p;
  const [ox, oy, oz] = origin;
  x -= ox;
  y -= oy;
  z -= oz;

  let nx = x;
  let ny = y;
  let nz = z;

  if (axis === 'x') {
    ny = y * cos - z * sin;
    nz = y * sin + z * cos;
    if (rescale && cos !== 0) {
      ny /= Math.abs(cos);
      nz /= Math.abs(cos);
    }
  } else if (axis === 'y') {
    nx = x * cos + z * sin;
    nz = -x * sin + z * cos;
    if (rescale && cos !== 0) {
      nx /= Math.abs(cos);
      nz /= Math.abs(cos);
    }
  } else if (axis === 'z') {
    nx = x * cos - y * sin;
    ny = x * sin + y * cos;
    if (rescale && cos !== 0) {
      nx /= Math.abs(cos);
      ny /= Math.abs(cos);
    }
  }

  return [nx + ox, ny + oy, nz + oz];
}

/**
 * Resolves the UV rectangle for a block's face from the misode/mcmeta texture atlas.
 * Strictly guarantees that the texture matches the block's actual name and never defaults to oak planks
 * unless the block actually belongs to the oak wood family.
 */
export function getAtlasUvBox(
  texName: string,
  blockName: string,
  atlasData: Record<string, [number, number, number, number]>
): [number, number, number, number] {
  // 1. Direct candidate lookups from the model texture identifier
  const cleanTex = texName.replace(/^minecraft:/, '').replace(/^block\//, '');
  const texCandidates = [
    `block/${cleanTex}`,
    cleanTex,
    `minecraft:block/${cleanTex}`,
    `item/${cleanTex}`,
    `entity/${cleanTex}`,
  ];
  for (const c of texCandidates) {
    if (atlasData[c]) return atlasData[c];
  }

  // 2. Resolve based on block name (e.g. stairs, slabs, walls, fences, pressure plates, panes)
  const cleanBlock = blockName.replace(/^minecraft:/, '').split('[')[0].trim();
  const resolved = resolveBlockTextureName(cleanBlock);
  const blockCandidates = [
    `block/${cleanBlock}`,
    `block/${resolved}`,
    cleanBlock,
    resolved,
    `block/${cleanBlock}_top`,
    `block/${cleanBlock}_side`,
    `block/${cleanBlock}_front`,
    `block/${cleanBlock}_bottom`,
    `block/${resolved}_top`,
    `block/${resolved}_side`,
    `block/${resolved}_front`,
    `block/${cleanBlock}_planks`,
    `block/${cleanBlock}_bricks`,
    `block/${cleanBlock}_wool`,
    `block/${cleanBlock}_concrete`,
    `block/${cleanBlock}_terracotta`,
  ];
  for (const c of blockCandidates) {
    if (atlasData[c]) return atlasData[c];
  }

  // 3. Special cases: chain, redstone wire
  if (cleanBlock === 'chain' && atlasData['block/iron_chain']) {
    return atlasData['block/iron_chain'];
  }
  if (cleanBlock.includes('redstone') && atlasData['block/redstone_dust_dot']) {
    return atlasData['block/redstone_dust_dot'];
  }

  // 4. Exact suffix or prefix search across all block texture keys in the atlas
  for (const key of Object.keys(atlasData)) {
    if (
      key.startsWith('block/') &&
      (key === `block/${cleanBlock}` ||
        key.endsWith(`/${cleanBlock}`) ||
        key === `block/${resolved}` ||
        key.endsWith(`/${resolved}`))
    ) {
      return atlasData[key];
    }
  }

  // 5. Material family fallback: never use oak_planks unless it is oak
  if (cleanBlock.includes('oak')) {
    return atlasData['block/oak_planks'] || [0, 0, 16, 16];
  }
  if (cleanBlock.includes('wood') || cleanBlock.includes('plank')) {
    return atlasData['block/spruce_planks'] || atlasData['block/oak_planks'] || [0, 0, 16, 16];
  }
  return atlasData['block/stone'] || atlasData['block/smooth_stone'] || [0, 0, 16, 16];
}

/**
 * Builds a THREE.BufferGeometry for any Minecraft block state using official models & texture atlas
 */
export function buildBlockGeometry(
  blockTypeString: string,
  neighborSolidMap: NeighborSolidMap,
  mcmeta: McmetaData
): THREE.BufferGeometry | null {
  try {
    const { name, props } = parseBlockIdentifier(blockTypeString);

  // Air / Barrier / Void blocks return null
  if (
    name === 'air' ||
    name === 'cave_air' ||
    name === 'void_air' ||
    name === 'structure_void' ||
    name === 'barrier' ||
    name === 'light' ||
    name === ''
  ) {
    return null;
  }

  const cacheKey = `${name}|${JSON.stringify(props)}|${neighborSolidMap.north},${neighborSolidMap.south},${neighborSolidMap.east},${neighborSolidMap.west},${neighborSolidMap.up}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  // 1. Auto-Heal: Ranken & Flechten
  if (name === 'vine' || name === 'glow_lichen' || name === 'sculk_vein') {
    const hasAnyDir =
      props.north === 'true' ||
      props.south === 'true' ||
      props.east === 'true' ||
      props.west === 'true' ||
      props.up === 'true';

    if (!hasAnyDir) {
      let anyFound = false;
      if (neighborSolidMap.north) {
        props.north = 'true';
        anyFound = true;
      }
      if (neighborSolidMap.south) {
        props.south = 'true';
        anyFound = true;
      }
      if (neighborSolidMap.east) {
        props.east = 'true';
        anyFound = true;
      }
      if (neighborSolidMap.west) {
        props.west = 'true';
        anyFound = true;
      }
      if (neighborSolidMap.up) {
        props.up = 'true';
        anyFound = true;
      }
      if (!anyFound) {
        props.north = 'true';
      }
    }
  }

  // 2. Auto-Heal: Wandschilder & Leitern
  if (name.endsWith('_wall_sign') || name === 'ladder') {
    if (!props.facing) {
      if (neighborSolidMap.south) props.facing = 'north';
      else if (neighborSolidMap.north) props.facing = 'south';
      else if (neighborSolidMap.east) props.facing = 'west';
      else if (neighborSolidMap.west) props.facing = 'east';
      else props.facing = 'north';
    }
  }

  const def = (mcmeta.blockDefinitions[name] ||
    mcmeta.blockDefinitions[`${name}_block`]) as
    | {
        variants?: Record<string, AppliedModel | AppliedModel[]>;
        multipart?: Array<{
          when?: unknown;
          apply: AppliedModel | AppliedModel[];
        }>;
      }
    | undefined;
  const appliedModels: AppliedModel[] = [];

  if (def) {
    if (def.variants) {
      // Find matching variant
      let bestMatch: AppliedModel | AppliedModel[] | null = null;
      let maxScore = -1;

      for (const [varKey, varVal] of Object.entries(def.variants)) {
        if (varKey === '') {
          if (maxScore < 0) {
            bestMatch = varVal;
            maxScore = 0;
          }
          continue;
        }

        const pairs = varKey.split(',');
        let matches = true;
        let score = 0;

        for (const pair of pairs) {
          const [k, v] = pair.split('=');
          if (props[k] === v) {
            score++;
          } else {
            matches = false;
            break;
          }
        }

        if (matches && score > maxScore) {
          maxScore = score;
          bestMatch = varVal;
        }
      }

      // Fallback: if properties were missing or did not match any variant, pick the first available variant
      if (!bestMatch && Object.keys(def.variants).length > 0) {
        bestMatch = Object.values(def.variants)[0];
      }

      const chosen = Array.isArray(bestMatch) ? bestMatch[0] : bestMatch;
      if (chosen && chosen.model) {
        appliedModels.push(chosen);
      }
    }

    if (def.multipart && Array.isArray(def.multipart)) {
      for (const part of def.multipart) {
        if (!part.when || matchWhenCondition(part.when, props)) {
          const applied = Array.isArray(part.apply) ? part.apply[0] : part.apply;
          if (applied && applied.model) {
            appliedModels.push(applied);
          }
        }
      }

      // Fallback for multipart blocks with empty connections: render primary base / post
      if (appliedModels.length === 0 && def.multipart.length > 0) {
        const firstPart = def.multipart[0];
        const applied = Array.isArray(firstPart.apply) ? firstPart.apply[0] : firstPart.apply;
        if (applied && applied.model) {
          appliedModels.push(applied);
        }
      }
    }
  }

  // Fallback: if no models resolved from definition, try direct model
  if (appliedModels.length === 0) {
    appliedModels.push({ model: `block/${name}` });
  }

  // Arrays to hold combined vertex attributes
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];

  const { atlasData, atlasWidth, atlasHeight } = mcmeta;

  // 4. Resolve elements for each applied model
  for (const item of appliedModels) {
    const modelId = item.model;
    const rotX = item.x ? -item.x : 0;
    const rotY = item.y ? -item.y : 0;

    const { textures, elements } = resolveModelDefinition(modelId, mcmeta.models);

    // Spezialfälle: builtin/entity (Schilder, Banner, Truhen, Flüssigkeiten & Köpfe)
    let finalElements = elements;

    if (!finalElements || finalElements.length === 0) {
      if (name.includes('sign') && (name.includes('wall') || props.facing)) {
        // Wall Sign
        const woodMatch = name.match(/^([a-z_]+?)(_wall)?(_hanging)?_sign$/);
        const wood = woodMatch ? woodMatch[1] : 'oak';
        finalElements = [
          {
            from: [0, 4.5, 14],
            to: [16, 12.5, 16],
            faces: {
              down: { texture: `#wood`, uv: [0, 14, 16, 16] },
              up: { texture: `#wood`, uv: [0, 14, 16, 16] },
              north: { texture: `#wood`, uv: [0, 4.5, 16, 12.5] },
              south: { texture: `#wood`, uv: [0, 4.5, 16, 12.5] },
              west: { texture: `#wood`, uv: [14, 4.5, 16, 12.5] },
              east: { texture: `#wood`, uv: [14, 4.5, 16, 12.5] },
            },
          },
        ];
        textures['wood'] = `block/${wood}_planks`;
      } else if (name.includes('sign')) {
        // Standing Sign
        const woodMatch = name.match(/^([a-z_]+?)_sign$/);
        const wood = woodMatch ? woodMatch[1] : 'oak';
        finalElements = [
          {
            from: [7, 0, 7],
            to: [9, 9, 9],
            faces: {
              down: { texture: `#wood` },
              up: { texture: `#wood` },
              north: { texture: `#wood` },
              south: { texture: `#wood` },
              west: { texture: `#wood` },
              east: { texture: `#wood` },
            },
          },
          {
            from: [0, 9, 7],
            to: [16, 17, 9],
            faces: {
              down: { texture: `#wood` },
              up: { texture: `#wood` },
              north: { texture: `#wood` },
              south: { texture: `#wood` },
              west: { texture: `#wood` },
              east: { texture: `#wood` },
            },
          },
        ];
        textures['wood'] = `block/${wood}_planks`;
      } else if (name.includes('banner')) {
        // Banner (Standing & Wall)
        const colorMatch = name.match(/^([a-z_]+?)(_wall)?_banner$/);
        const color = colorMatch ? colorMatch[1] : 'white';
        const isWall = name.includes('wall') || props.facing;
        if (isWall) {
          finalElements = [
            {
              from: [0, 14, 14],
              to: [16, 16, 16],
              faces: {
                down: { texture: `#wood` },
                up: { texture: `#wood` },
                north: { texture: `#wood` },
                south: { texture: `#wood` },
                west: { texture: `#wood` },
                east: { texture: `#wood` },
              },
            },
            {
              from: [1, 0, 14.5],
              to: [15, 14, 15.5],
              faces: {
                down: { texture: `#wool` },
                up: { texture: `#wool` },
                north: { texture: `#wool` },
                south: { texture: `#wool` },
                west: { texture: `#wool` },
                east: { texture: `#wool` },
              },
            },
          ];
        } else {
          finalElements = [
            {
              from: [7.5, 0, 7.5],
              to: [8.5, 16, 8.5],
              faces: {
                down: { texture: `#wood` },
                up: { texture: `#wood` },
                north: { texture: `#wood` },
                south: { texture: `#wood` },
                west: { texture: `#wood` },
                east: { texture: `#wood` },
              },
            },
            {
              from: [1, 2, 7.5],
              to: [15, 16, 8.5],
              faces: {
                down: { texture: `#wool` },
                up: { texture: `#wool` },
                north: { texture: `#wool` },
                south: { texture: `#wool` },
                west: { texture: `#wool` },
                east: { texture: `#wool` },
              },
            },
          ];
        }
        textures['wood'] = 'block/oak_planks';
        textures['wool'] = `block/${color}_wool`;
      } else if (name.includes('chest')) {
        // Chest / Ender Chest / Trapped Chest
        finalElements = [
          {
            from: [1, 0, 1],
            to: [15, 14, 15],
            faces: {
              down: { texture: `#base` },
              up: { texture: `#base` },
              north: { texture: `#base` },
              south: { texture: `#base` },
              west: { texture: `#base` },
              east: { texture: `#base` },
            },
          },
          {
            from: [7, 7, 0],
            to: [9, 11, 1],
            faces: {
              down: { texture: `#latch` },
              up: { texture: `#latch` },
              north: { texture: `#latch` },
              south: { texture: `#latch` },
              west: { texture: `#latch` },
              east: { texture: `#latch` },
            },
          },
        ];
        if (name.includes('ender')) {
          textures['base'] = 'block/obsidian';
          textures['latch'] = 'block/gold_block';
        } else {
          textures['base'] = 'block/oak_planks';
          textures['latch'] = 'block/iron_block';
        }
      } else if (name === 'water' || name.startsWith('water_')) {
        finalElements = [
          {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
              down: { texture: `#all` },
              up: { texture: `#all` },
              north: { texture: `#all` },
              south: { texture: `#all` },
              west: { texture: `#all` },
              east: { texture: `#all` },
            },
          },
        ];
        textures['all'] = 'block/water_still';
      } else if (name === 'lava' || name.startsWith('lava_')) {
        finalElements = [
          {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
              down: { texture: `#all` },
              up: { texture: `#all` },
              north: { texture: `#all` },
              south: { texture: `#all` },
              west: { texture: `#all` },
              east: { texture: `#all` },
            },
          },
        ];
        textures['all'] = 'block/lava_still';
      } else if (name.includes('skull') || name.includes('head')) {
        // Skull / Head
        finalElements = [
          {
            from: [4, 0, 4],
            to: [12, 8, 12],
            faces: {
              down: { texture: `#head` },
              up: { texture: `#head` },
              north: { texture: `#head` },
              south: { texture: `#head` },
              west: { texture: `#head` },
              east: { texture: `#head` },
            },
          },
        ];
        if (name.includes('wither')) {
          textures['head'] = 'block/coal_block';
        } else if (name.includes('zombie')) {
          textures['head'] = 'block/moss_block';
        } else if (name.includes('creeper')) {
          textures['head'] = 'block/cactus_side';
        } else if (name.includes('dragon')) {
          textures['head'] = 'block/obsidian';
        } else if (name.includes('piglin')) {
          textures['head'] = 'block/terracotta';
        } else {
          textures['head'] = 'block/bone_block_side';
        }
      } else {
        // Fallback cube with resolved block texture
        finalElements = [
          {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
              down: { texture: `#all` },
              up: { texture: `#all` },
              north: { texture: `#all` },
              south: { texture: `#all` },
              west: { texture: `#all` },
              east: { texture: `#all` },
            },
          },
        ];
        textures['all'] = `block/${resolveBlockTextureName(name)}`;
      }
    }

    // Process each 3D element box
    for (const el of finalElements) {
      if (!el || typeof el !== 'object' || !el.faces || typeof el.faces !== 'object') continue;

      const from = Array.isArray(el.from) && el.from.length >= 3 ? el.from : [0, 0, 0];
      const to = Array.isArray(el.to) && el.to.length >= 3 ? el.to : [16, 16, 16];
      const [x1, y1, z1] = from;
      const [x2, y2, z2] = to;

      const FACE_CORNERS: Record<string, { corners: [number, number, number][]; norm: [number, number, number]; defaultUv: [number, number, number, number] }> = {
        down: {
          corners: [
            [x1, y1, z1],
            [x2, y1, z1],
            [x2, y1, z2],
            [x1, y1, z2],
          ],
          norm: [0, -1, 0],
          defaultUv: [x1, 16 - z2, x2, 16 - z1],
        },
        up: {
          corners: [
            [x1, y2, z1],
            [x1, y2, z2],
            [x2, y2, z2],
            [x2, y2, z1],
          ],
          norm: [0, 1, 0],
          defaultUv: [x1, z1, x2, z2],
        },
        north: {
          corners: [
            [x2, y2, z1],
            [x1, y2, z1],
            [x1, y1, z1],
            [x2, y1, z1],
          ],
          norm: [0, 0, -1],
          defaultUv: [16 - x2, 16 - y2, 16 - x1, 16 - y1],
        },
        south: {
          corners: [
            [x1, y2, z2],
            [x2, y2, z2],
            [x2, y1, z2],
            [x1, y1, z2],
          ],
          norm: [0, 0, 1],
          defaultUv: [x1, 16 - y2, x2, 16 - y1],
        },
        west: {
          corners: [
            [x1, y2, z1],
            [x1, y2, z2],
            [x1, y1, z2],
            [x1, y1, z1],
          ],
          norm: [-1, 0, 0],
          defaultUv: [z1, 16 - y2, z2, 16 - y1],
        },
        east: {
          corners: [
            [x2, y2, z2],
            [x2, y2, z1],
            [x2, y1, z1],
            [x2, y1, z2],
          ],
          norm: [1, 0, 0],
          defaultUv: [16 - z2, 16 - y2, 16 - z1, 16 - y1],
        },
      };

      for (const [faceName, faceData] of Object.entries(el.faces as Record<string, any>)) {
        if (!faceData || typeof faceData !== 'object') continue;
        const faceConfig = FACE_CORNERS[faceName];
        if (!faceConfig) continue;

        let rawTex = typeof faceData.texture === 'string' ? faceData.texture : '#all';
        if (rawTex.startsWith('#')) {
          rawTex = textures[rawTex.slice(1)] || rawTex.slice(1);
        }
        const texClean = typeof rawTex === 'string' ? rawTex.replace(/^minecraft:/, '') : 'stone';

        const uvBox = getAtlasUvBox(texClean, name, atlasData);

        const px = Number(uvBox[0]) || 0;
        const py = Number(uvBox[1]) || 0;
        const pw = Number(uvBox[2]) || 16;
        const ph = Number(uvBox[3]) || 16;

        const rawFaceUv = Array.isArray(faceData.uv) && faceData.uv.length >= 4 ? faceData.uv : faceConfig.defaultUv;
        const u1 = Number(rawFaceUv[0]) || 0;
        const v1 = Number(rawFaceUv[1]) || 0;
        const u2 = Number(rawFaceUv[2]) || 16;
        const v2 = Number(rawFaceUv[3]) || 16;

        let uvCorners: [number, number][] = [
          [u1, v1],
          [u2, v1],
          [u2, v2],
          [u1, v2],
        ];

        // UV Rotation (90, 180, 270)
        const uvRot = Number(faceData.rotation) || 0;
        if (uvRot === 90) {
          uvCorners = [uvCorners[3], uvCorners[0], uvCorners[1], uvCorners[2]];
        } else if (uvRot === 180) {
          uvCorners = [uvCorners[2], uvCorners[3], uvCorners[0], uvCorners[1]];
        } else if (uvRot === 270) {
          uvCorners = [uvCorners[1], uvCorners[2], uvCorners[3], uvCorners[0]];
        }

        // Tint index / foliage color
        let r = 1.0;
        let g = 1.0;
        let b = 1.0;

        const isFoliage =
          faceData.tintindex !== undefined ||
          name === 'vine' ||
          name.includes('leaves') ||
          name.includes('grass') ||
          name.includes('fern') ||
          name === 'lily_pad';

        if (isFoliage) {
          r = 0.486; // #7cbd6b
          g = 0.741;
          b = 0.419;
        } else if (name === 'water') {
          r = 0.247; // #3f76e4
          g = 0.463;
          b = 0.894;
        }

        // Transform 4 quad vertices
        const quadPos: [number, number, number][] = [];
        const quadNorm: [number, number, number][] = [];
        const quadUv: [number, number][] = [];

        for (let c = 0; c < 4; c++) {
          const corner = faceConfig.corners[c];
          if (!corner) continue;
          let pt: [number, number, number] = [...corner];
          let nm: [number, number, number] = [...faceConfig.norm];

          // 1. Element rotation
          if (el.rotation && typeof el.rotation === 'object') {
            const elOrigin: [number, number, number] =
              Array.isArray(el.rotation.origin) && el.rotation.origin.length >= 3
                ? [
                    Number(el.rotation.origin[0]),
                    Number(el.rotation.origin[1]),
                    Number(el.rotation.origin[2]),
                  ]
                : [8, 8, 8];
            const elAxis = el.rotation.axis || 'y';
            const elAngle = Number(el.rotation.angle) || 0;
            const elRescale = Boolean(el.rotation.rescale);
            pt = rotatePoint(pt, elOrigin, elAxis, elAngle, elRescale);
            nm = rotatePoint(nm, [0, 0, 0], elAxis, elAngle, false);
          }

          // 2. BlockState X rotation around [8, 8, 8]
          if (rotX !== 0) {
            pt = rotatePoint(pt, [8, 8, 8], 'x', rotX);
            nm = rotatePoint(nm, [0, 0, 0], 'x', rotX);
          }

          // 3. BlockState Y rotation around [8, 8, 8]
          if (rotY !== 0) {
            pt = rotatePoint(pt, [8, 8, 8], 'y', rotY);
            nm = rotatePoint(nm, [0, 0, 0], 'y', rotY);
          }

          // 4. Standing sign rotation (rotY = -(props.rotation * 22.5) deg)
          if (name.includes('sign') && !name.includes('wall') && props.rotation !== undefined) {
            const signRot = -(Number(props.rotation || 0) * 22.5);
            pt = rotatePoint(pt, [8, 8, 8], 'y', signRot);
            nm = rotatePoint(nm, [0, 0, 0], 'y', signRot);
          }

          // 5. Convert from Minecraft 0..16 to Three.js centered space [-0.5, 0.5]
          quadPos.push([
            (pt[0] - 8) / 16,
            (pt[1] - 8) / 16,
            (pt[2] - 8) / 16,
          ]);

          quadNorm.push(nm);

          // 6. Atlas UV calculation
          const [cu, cv] = uvCorners[c] || [0, 0];
          const U = (px + (cu / 16) * pw) / atlasWidth;
          const V = (py + (cv / 16) * ph) / atlasHeight;
          quadUv.push([U, V]);
        }

        if (quadPos.length < 4) continue;

        // Two triangles: (0, 1, 2) and (0, 2, 3)
        const indices = [0, 1, 2, 0, 2, 3];
        for (const idx of indices) {
          positions.push(...quadPos[idx]);
          normals.push(...quadNorm[idx]);
          uvs.push(...quadUv[idx]);
          colors.push(r, g, b);
        }
      }
    }
  }

  if (positions.length === 0) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  geometryCache.set(cacheKey, geometry);
  return geometry;
  } catch (err) {
    console.warn(`[mcmetaLoader] Failed to build block geometry for "${blockTypeString}":`, err);
    return null;
  }
}

/**
 * React Hook: loads mcmeta once and provides reactive status
 */
export function useMcmeta(): {
  isLoading: boolean;
  error: Error | null;
  mcmeta: McmetaData | null;
} {
  const [data, setData] = useState<McmetaData | null>(() => cachedMcmeta);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedMcmeta);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedMcmeta) {
      setData(cachedMcmeta);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    loadMcmeta()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading, error, mcmeta: data };
}
