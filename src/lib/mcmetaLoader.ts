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
  shade?: boolean;
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
let cachedAtlasMaterial: THREE.MeshBasicMaterial | null = null;
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

let cachedTranslucentMaterial: THREE.MeshBasicMaterial | null = null;

/**
 * Retrieves the single shared material used for all opaque and alpha-tested cutouts (glass, leaves, ladders)
 */
export function getAtlasMaterial(atlasTexture: THREE.Texture): THREE.MeshBasicMaterial {
  if (cachedAtlasMaterial && cachedAtlasMaterial.map === atlasTexture) {
    return cachedAtlasMaterial;
  }
  cachedAtlasMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    vertexColors: true,
    alphaTest: 0.1,
    transparent: false,
    side: THREE.DoubleSide,
  });
  return cachedAtlasMaterial;
}

/**
 * Retrieves the material for partially translucent blocks (water, ice, stained glass, slime, honey)
 */
export function getTranslucentAtlasMaterial(atlasTexture: THREE.Texture): THREE.MeshBasicMaterial {
  if (cachedTranslucentMaterial && cachedTranslucentMaterial.map === atlasTexture) {
    return cachedTranslucentMaterial;
  }
  cachedTranslucentMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return cachedTranslucentMaterial;
}

/**
 * Resolves tint color strictly based on face.tintindex and block name (Plains biome default)
 */
export function resolveFaceTintColor(
  blockName: string,
  tintindex: number | undefined
): string {
  const clean = blockName.toLowerCase().replace(/^minecraft:/, '');

  // Water has no model elements in mcmeta and always gets #3f76e4
  if (clean === 'water' || clean === 'water_cauldron' || clean === 'bubble_column') {
    return '#3f76e4';
  }

  // Untinted faces remain pure white (#ffffff) so atlas.png colors are unadulterated
  if (tintindex === undefined || tintindex === -1) {
    return '#ffffff';
  }

  switch (clean) {
    case 'grass_block':
    case 'grass':
    case 'short_grass':
    case 'tall_grass':
    case 'fern':
    case 'large_fern':
    case 'sugar_cane':
    case 'potted_fern':
      return '#91bd59';
    case 'spruce_leaves':
      return '#619961';
    case 'birch_leaves':
      return '#80a755';
    case 'mangrove_leaves':
      return '#92c648';
    case 'lily_pad':
      return '#208030';
    case 'oak_leaves':
    case 'jungle_leaves':
    case 'acacia_leaves':
    case 'dark_oak_leaves':
    case 'vine':
      return '#77ab2f';
    case 'melon_stem':
    case 'pumpkin_stem':
    case 'attached_melon_stem':
    case 'attached_pumpkin_stem':
      return '#e0c71c';
    case 'redstone_wire':
      return '#aa0000';
    default:
      return '#91bd59';
  }
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
 * Returns true if a block is a full 1x1x1 solid cube and NOT transparent/translucent/cutout.
 * Used for Face Culling: adjacent touching faces between full opaque cubes are completely skipped.
 */
export function isFullOpaqueCube(blockTypeString: string): boolean {
  if (!blockTypeString) return false;
  const { name } = parseBlockIdentifier(blockTypeString);
  const clean = name.toLowerCase().replace(/^minecraft:/, '');

  if (
    clean === 'air' ||
    clean === 'cave_air' ||
    clean === 'void_air' ||
    clean === 'structure_void' ||
    clean === 'barrier' ||
    clean === 'light' ||
    clean === ''
  ) {
    return false;
  }

  // Non-full or transparent / translucent / cutout blocks
  if (
    clean.includes('glass') ||
    clean.includes('leaves') ||
    clean.includes('ice') ||
    clean.includes('slime') ||
    clean.includes('honey') ||
    clean.includes('spawner') ||
    clean.includes('water') ||
    clean.includes('lava') ||
    clean.includes('vine') ||
    clean.includes('ladder') ||
    clean.includes('stairs') ||
    clean.includes('slab') ||
    clean.includes('fence') ||
    clean.includes('wall') ||
    clean.includes('sign') ||
    clean.includes('trapdoor') ||
    clean.includes('door') ||
    clean.includes('carpet') ||
    clean.includes('pressure_plate') ||
    clean.includes('button') ||
    clean.includes('torch') ||
    clean.includes('lantern') ||
    clean.includes('chain') ||
    clean.includes('cobweb') ||
    clean.includes('web') ||
    clean.includes('pane') ||
    clean.includes('bars') ||
    clean.includes('chest') ||
    clean.includes('bed') ||
    clean.includes('bell') ||
    clean.includes('anvil') ||
    clean.includes('hopper') ||
    clean.includes('cauldron') ||
    clean.includes('brewing_stand') ||
    clean.includes('daylight_detector') ||
    clean.includes('flower_pot') ||
    clean.includes('pot') ||
    clean.includes('skull') ||
    clean.includes('head') ||
    clean.includes('banner') ||
    clean.includes('rod') ||
    clean.includes('comparator') ||
    clean.includes('repeater') ||
    clean.includes('redstone') ||
    clean.includes('rail') ||
    clean.includes('lever') ||
    clean.includes('wire') ||
    clean.includes('tripwire') ||
    clean.includes('campfire') ||
    clean.includes('scaffolding') ||
    clean.includes('conduit') ||
    clean.includes('cake') ||
    clean.includes('candle') ||
    clean.includes('amethyst_cluster') ||
    clean.includes('bud') ||
    clean.includes('pointed_dripstone') ||
    clean.includes('frogspawn') ||
    clean.includes('bamboo') ||
    clean.includes('cactus') ||
    clean.includes('sugar_cane') ||
    clean.includes('flower') ||
    clean.includes('tulip') ||
    clean.includes('orchid') ||
    clean.includes('dandelion') ||
    clean.includes('poppy') ||
    clean.includes('allium') ||
    clean.includes('bluet') ||
    clean.includes('daisy') ||
    clean.includes('cornflower') ||
    clean.includes('lily') ||
    clean.includes('rose') ||
    clean.includes('sunflower') ||
    clean.includes('peony') ||
    clean.includes('lilac') ||
    clean.includes('sapling') ||
    clean.includes('bush') ||
    clean.includes('fern') ||
    clean.includes('grass') ||
    clean.includes('fungus') ||
    clean.includes('roots') ||
    clean.includes('sprouts') ||
    clean.includes('mushroom')
  ) {
    return false;
  }

  return true;
}

/**
 * Returns true if the block requires smooth alpha blending (water, ice, stained glass, slime, honey)
 */
export function isTranslucentBlock(blockTypeString: string): boolean {
  if (!blockTypeString) return false;
  const clean = blockTypeString.toLowerCase().replace(/^minecraft:/, '');
  return (
    clean.includes('water') ||
    clean.includes('ice') ||
    clean.includes('frosted_ice') ||
    clean.includes('slime') ||
    clean.includes('honey') ||
    clean.includes('stained_glass') ||
    clean.includes('tinted_glass')
  );
}

/**
 * Determines whether a neighboring block can connect to multipart posts, fences, walls, bars, etc.
 */
export function isSolidForConnection(blockType: string | undefined): boolean {
  if (!blockType) return false;
  const clean = blockType.toLowerCase().replace(/^minecraft:/, '');
  if (
    clean === 'air' ||
    clean === 'cave_air' ||
    clean === 'void_air' ||
    clean === 'structure_void' ||
    clean === 'barrier' ||
    clean === 'light' ||
    clean.includes('carpet') ||
    clean.includes('pressure_plate') ||
    clean.includes('ladder') ||
    clean.includes('vine') ||
    clean.includes('torch')
  ) {
    return false;
  }
  return true;
}

/**
 * Checks if a quad face lies exactly on a block boundary plane and spans the full 1x1 face.
 */
export function detectBoundaryCullDir(
  quadPos: [number, number, number][],
  norm: [number, number, number]
): 'down' | 'up' | 'north' | 'south' | 'west' | 'east' | null {
  if (quadPos.length < 4) return null;
  const eps = 0.005;

  // Down face (-Y)
  if (norm[1] < -0.8 && Math.abs(norm[0]) < 0.2 && Math.abs(norm[2]) < 0.2) {
    const atBoundary = quadPos.every((p) => Math.abs(p[1] - (-0.5)) < eps);
    if (!atBoundary) return null;
    const minX = Math.min(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const maxX = Math.max(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const minZ = Math.min(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    const maxZ = Math.max(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    if (minX <= -0.5 + eps && maxX >= 0.5 - eps && minZ <= -0.5 + eps && maxZ >= 0.5 - eps) {
      return 'down';
    }
  }

  // Up face (+Y)
  if (norm[1] > 0.8 && Math.abs(norm[0]) < 0.2 && Math.abs(norm[2]) < 0.2) {
    const atBoundary = quadPos.every((p) => Math.abs(p[1] - 0.5) < eps);
    if (!atBoundary) return null;
    const minX = Math.min(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const maxX = Math.max(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const minZ = Math.min(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    const maxZ = Math.max(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    if (minX <= -0.5 + eps && maxX >= 0.5 - eps && minZ <= -0.5 + eps && maxZ >= 0.5 - eps) {
      return 'up';
    }
  }

  // North face (-Z)
  if (norm[2] < -0.8 && Math.abs(norm[0]) < 0.2 && Math.abs(norm[1]) < 0.2) {
    const atBoundary = quadPos.every((p) => Math.abs(p[2] - (-0.5)) < eps);
    if (!atBoundary) return null;
    const minX = Math.min(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const maxX = Math.max(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const minY = Math.min(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    const maxY = Math.max(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    if (minX <= -0.5 + eps && maxX >= 0.5 - eps && minY <= -0.5 + eps && maxY >= 0.5 - eps) {
      return 'north';
    }
  }

  // South face (+Z)
  if (norm[2] > 0.8 && Math.abs(norm[0]) < 0.2 && Math.abs(norm[1]) < 0.2) {
    const atBoundary = quadPos.every((p) => Math.abs(p[2] - 0.5) < eps);
    if (!atBoundary) return null;
    const minX = Math.min(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const maxX = Math.max(quadPos[0][0], quadPos[1][0], quadPos[2][0], quadPos[3][0]);
    const minY = Math.min(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    const maxY = Math.max(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    if (minX <= -0.5 + eps && maxX >= 0.5 - eps && minY <= -0.5 + eps && maxY >= 0.5 - eps) {
      return 'south';
    }
  }

  // West face (-X)
  if (norm[0] < -0.8 && Math.abs(norm[1]) < 0.2 && Math.abs(norm[2]) < 0.2) {
    const atBoundary = quadPos.every((p) => Math.abs(p[0] - (-0.5)) < eps);
    if (!atBoundary) return null;
    const minY = Math.min(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    const maxY = Math.max(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    const minZ = Math.min(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    const maxZ = Math.max(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    if (minY <= -0.5 + eps && maxY >= 0.5 - eps && minZ <= -0.5 + eps && maxZ >= 0.5 - eps) {
      return 'west';
    }
  }

  // East face (+X)
  if (norm[0] > 0.8 && Math.abs(norm[1]) < 0.2 && Math.abs(norm[2]) < 0.2) {
    const atBoundary = quadPos.every((p) => Math.abs(p[0] - 0.5) < eps);
    if (!atBoundary) return null;
    const minY = Math.min(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    const maxY = Math.max(quadPos[0][1], quadPos[1][1], quadPos[2][1], quadPos[3][1]);
    const minZ = Math.min(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    const maxZ = Math.max(quadPos[0][2], quadPos[1][2], quadPos[2][2], quadPos[3][2]);
    if (minY <= -0.5 + eps && maxY >= 0.5 - eps && minZ <= -0.5 + eps && maxZ >= 0.5 - eps) {
      return 'east';
    }
  }

  return null;
}

export interface RawQuadData {
  cullDir: 'down' | 'up' | 'north' | 'south' | 'west' | 'east' | null;
  isTranslucent: boolean;
  isWater: boolean;
  isIce: boolean;
  pos: [number, number, number][]; // 4 vertices in [-0.5, 0.5]
  norm: [number, number, number][]; // 4 normals
  uv: [number, number][]; // 4 atlas UVs
  r: number;
  g: number;
  b: number;
}

const rawQuadsCache = new Map<string, RawQuadData[]>();

/**
 * Resolves models and builds raw quad faces for a block state. Caches results heavily.
 */
export function getRawBlockQuads(
  blockTypeString: string,
  neighborSolidMap: NeighborSolidMap,
  mcmeta: McmetaData
): RawQuadData[] {
  try {
    const { name, props } = parseBlockIdentifier(blockTypeString);

    if (
      name === 'air' ||
      name === 'cave_air' ||
      name === 'void_air' ||
      name === 'structure_void' ||
      name === 'barrier' ||
      name === 'light' ||
      name === ''
    ) {
      return [];
    }

    const isMultipartOrAutoHeal =
      name === 'vine' ||
      name === 'glow_lichen' ||
      name === 'sculk_vein' ||
      name.endsWith('_wall_sign') ||
      name === 'ladder' ||
      name.includes('fence') ||
      name.includes('wall') ||
      name.includes('bars') ||
      name.includes('pane');

    const cacheKey = isMultipartOrAutoHeal
      ? `${name}|${JSON.stringify(props)}|${neighborSolidMap.north},${neighborSolidMap.south},${neighborSolidMap.east},${neighborSolidMap.west},${neighborSolidMap.up}`
      : `${name}|${JSON.stringify(props)}`;

    const cached = rawQuadsCache.get(cacheKey);
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

        if (appliedModels.length === 0 && def.multipart.length > 0) {
          const firstPart = def.multipart[0];
          const applied = Array.isArray(firstPart.apply) ? firstPart.apply[0] : firstPart.apply;
          if (applied && applied.model) {
            appliedModels.push(applied);
          }
        }
      }
    }

    if (appliedModels.length === 0) {
      appliedModels.push({ model: `block/${name}` });
    }

    const { atlasData, atlasWidth, atlasHeight } = mcmeta;
    const quads: RawQuadData[] = [];
    const isTranslucent = isTranslucentBlock(name);
    const isWater = name === 'water' || name.startsWith('water_');
    const isIce = name.includes('ice');
    const isSolidCube = isFullOpaqueCube(name);

    for (const item of appliedModels) {
      const modelId = item.model;
      const rotX = item.x ? -item.x : 0;
      const rotY = item.y ? -item.y : 0;

      const { textures, elements } = resolveModelDefinition(modelId, mcmeta.models);

      let finalElements = elements;

      if (!finalElements || finalElements.length === 0) {
        if (name.includes('sign') && (name.includes('wall') || props.facing)) {
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

          const uvRot = Number(faceData.rotation) || 0;
          if (uvRot === 90) {
            uvCorners = [uvCorners[3], uvCorners[0], uvCorners[1], uvCorners[2]];
          } else if (uvRot === 180) {
            uvCorners = [uvCorners[2], uvCorners[3], uvCorners[0], uvCorners[1]];
          } else if (uvRot === 270) {
            uvCorners = [uvCorners[1], uvCorners[2], uvCorners[3], uvCorners[0]];
          }

          const hasTint = faceData.tintindex !== undefined && faceData.tintindex !== -1;
          const isOverlay =
            finalElements.length > 1 &&
            (hasTint ||
              String(faceData.texture).toLowerCase().includes('overlay') ||
              texClean.toLowerCase().includes('overlay'));

          const hexColor = resolveFaceTintColor(name, faceData.tintindex);
          const baseColor = new THREE.Color(hexColor);

          const quadPos: [number, number, number][] = [];
          const quadNorm: [number, number, number][] = [];
          const quadUv: [number, number][] = [];

          for (let c = 0; c < 4; c++) {
            const corner = faceConfig.corners[c];
            if (!corner) continue;
            let pt: [number, number, number] = [...corner];
            let nm: [number, number, number] = [...faceConfig.norm];

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

            if (rotX !== 0) {
              pt = rotatePoint(pt, [8, 8, 8], 'x', rotX);
              nm = rotatePoint(nm, [0, 0, 0], 'x', rotX);
            }

            if (rotY !== 0) {
              pt = rotatePoint(pt, [8, 8, 8], 'y', rotY);
              nm = rotatePoint(nm, [0, 0, 0], 'y', rotY);
            }

            if (name.includes('sign') && !name.includes('wall') && props.rotation !== undefined) {
              const signRot = -(Number(props.rotation || 0) * 22.5);
              pt = rotatePoint(pt, [8, 8, 8], 'y', signRot);
              nm = rotatePoint(nm, [0, 0, 0], 'y', signRot);
            }

            let vx = (pt[0] - 8) / 16;
            let vy = (pt[1] - 8) / 16;
            let vz = (pt[2] - 8) / 16;

            // Offset overlay faces slightly outward by 0.002 along normal to prevent Z-fighting
            if (isOverlay) {
              vx += nm[0] * 0.002;
              vy += nm[1] * 0.002;
              vz += nm[2] * 0.002;
            }

            quadPos.push([vx, vy, vz]);
            quadNorm.push(nm);

            const [cu, cv] = uvCorners[c] || [0, 0];
            const U = (px + (cu / 16) * pw) / atlasWidth;
            const V = (py + (cv / 16) * ph) / atlasHeight;
            quadUv.push([U, V]);
          }

          if (quadPos.length < 4) continue;

          // Minecraft directional face-shading: up 1.0, north/south 0.8, east/west 0.6, down 0.5
          let shadeFactor = 1.0;
          if (el.shade !== false) {
            const faceNormal = quadNorm[0] || faceConfig.norm;
            const ny = faceNormal[1];
            const nx = Math.abs(faceNormal[0]);
            const nz = Math.abs(faceNormal[2]);

            if (ny > 0.5) {
              shadeFactor = 1.0; // up (+Y)
            } else if (ny < -0.5) {
              shadeFactor = 0.5; // down (-Y)
            } else if (nz >= nx) {
              shadeFactor = 0.8; // north (-Z) & south (+Z)
            } else {
              shadeFactor = 0.6; // east (+X) & west (-X)
            }
          }

          const r = baseColor.r * shadeFactor;
          const g = baseColor.g * shadeFactor;
          const b = baseColor.b * shadeFactor;

          let cullDir = detectBoundaryCullDir(quadPos, quadNorm[0] || [0, 1, 0]);
          if (!cullDir && isSolidCube) {
            if (['down', 'up', 'north', 'south', 'west', 'east'].includes(faceName)) {
              cullDir = faceName as any;
            }
          }

          quads.push({
            cullDir,
            isTranslucent,
            isWater,
            isIce,
            pos: quadPos,
            norm: quadNorm,
            uv: quadUv,
            r,
            g,
            b,
          });
        }
      }
    }

    rawQuadsCache.set(cacheKey, quads);
    return quads;
  } catch (err) {
    console.warn(`[mcmetaLoader] Failed to resolve quads for "${blockTypeString}":`, err);
    return [];
  }
}

/**
 * Builds a THREE.BufferGeometry for an individual Minecraft block
 */
export function buildBlockGeometry(
  blockTypeString: string,
  neighborSolidMap: NeighborSolidMap,
  mcmeta: McmetaData
): THREE.BufferGeometry | null {
  const quads = getRawBlockQuads(blockTypeString, neighborSolidMap, mcmeta);
  if (!quads || quads.length === 0) return null;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];

  const triangleIndices = [0, 1, 2, 0, 2, 3];
  for (const q of quads) {
    for (const idx of triangleIndices) {
      positions.push(q.pos[idx][0], q.pos[idx][1], q.pos[idx][2]);
      normals.push(q.norm[idx][0], q.norm[idx][1], q.norm[idx][2]);
      uvs.push(q.uv[idx][0], q.uv[idx][1]);
      colors.push(q.r, q.g, q.b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

export interface MergedModuleGeometryResult {
  mergedGeometry: THREE.BufferGeometry;
  opaqueGeometry: THREE.BufferGeometry;
  translucentGeometry: THREE.BufferGeometry | null;
}

/**
 * High-Performance Chunk Merging: merges all visible blocks of a module into a single THREE.BufferGeometry
 * and performs boundary face culling against solid neighbors, reducing thousands of draw calls down to 1-2!
 */
export function buildMergedModuleGeometry(
  blocks: any[],
  mcmeta: McmetaData
): MergedModuleGeometryResult {
  const blockMap = new Map<string, string>();
  for (const b of blocks) {
    if (!b) continue;
    const x = Number(b.position?.x ?? b.x) || 0;
    const y = Number(b.position?.y ?? b.y) || 0;
    const z = Number(b.position?.z ?? b.z) || 0;
    const type = String(b.type || b.name || '');
    if (type) {
      blockMap.set(`${x},${y},${z}`, type);
    }
  }

  const opaquePositions: number[] = [];
  const opaqueNormals: number[] = [];
  const opaqueUvs: number[] = [];
  const opaqueColors: number[] = [];

  const transPositions: number[] = [];
  const transNormals: number[] = [];
  const transUvs: number[] = [];
  const transColors: number[] = [];

  const triangleIndices = [0, 1, 2, 0, 2, 3];

  for (const b of blocks) {
    if (!b) continue;
    const bx = Number(b.position?.x ?? b.x) || 0;
    const by = Number(b.position?.y ?? b.y) || 0;
    const bz = Number(b.position?.z ?? b.z) || 0;
    const blockType = String(b.type || b.name || '');
    if (!blockType) continue;

    const { name } = parseBlockIdentifier(blockType);
    if (
      name === 'air' ||
      name === 'cave_air' ||
      name === 'void_air' ||
      name === 'structure_void' ||
      name === 'barrier' ||
      name === 'light' ||
      name === ''
    ) {
      continue;
    }

    const neighborSolidMap: NeighborSolidMap = {
      north: isSolidForConnection(blockMap.get(`${bx},${by},${bz - 1}`)),
      south: isSolidForConnection(blockMap.get(`${bx},${by},${bz + 1}`)),
      east: isSolidForConnection(blockMap.get(`${bx + 1},${by},${bz}`)),
      west: isSolidForConnection(blockMap.get(`${bx - 1},${by},${bz}`)),
      up: isSolidForConnection(blockMap.get(`${bx},${by + 1},${bz}`)),
    };

    const downNeighbor = blockMap.get(`${bx},${by - 1},${bz}`);
    const upNeighbor = blockMap.get(`${bx},${by + 1},${bz}`);
    const northNeighbor = blockMap.get(`${bx},${by},${bz - 1}`);
    const southNeighbor = blockMap.get(`${bx},${by},${bz + 1}`);
    const westNeighbor = blockMap.get(`${bx - 1},${by},${bz}`);
    const eastNeighbor = blockMap.get(`${bx + 1},${by},${bz}`);

    const isNeighborSolid = {
      down: downNeighbor ? isFullOpaqueCube(downNeighbor) : false,
      up: upNeighbor ? isFullOpaqueCube(upNeighbor) : false,
      north: northNeighbor ? isFullOpaqueCube(northNeighbor) : false,
      south: southNeighbor ? isFullOpaqueCube(southNeighbor) : false,
      west: westNeighbor ? isFullOpaqueCube(westNeighbor) : false,
      east: eastNeighbor ? isFullOpaqueCube(eastNeighbor) : false,
    };

    const quads = getRawBlockQuads(blockType, neighborSolidMap, mcmeta);
    if (!quads || quads.length === 0) continue;

    for (const q of quads) {
      // 1. Face Culling against Solid Neighbors
      if (q.cullDir) {
        if (isNeighborSolid[q.cullDir]) {
          continue; // Skipped!
        }

        // 2. Cull touching internal fluid/ice faces
        if (q.isWater) {
          const n =
            q.cullDir === 'down' ? downNeighbor :
            q.cullDir === 'up' ? upNeighbor :
            q.cullDir === 'north' ? northNeighbor :
            q.cullDir === 'south' ? southNeighbor :
            q.cullDir === 'west' ? westNeighbor : eastNeighbor;
          if (n && n.toLowerCase().includes('water')) {
            continue;
          }
        }
        if (q.isIce) {
          const n =
            q.cullDir === 'down' ? downNeighbor :
            q.cullDir === 'up' ? upNeighbor :
            q.cullDir === 'north' ? northNeighbor :
            q.cullDir === 'south' ? southNeighbor :
            q.cullDir === 'west' ? westNeighbor : eastNeighbor;
          if (n && n.toLowerCase().includes('ice')) {
            continue;
          }
        }
      }

      const posArr = q.isTranslucent ? transPositions : opaquePositions;
      const normArr = q.isTranslucent ? transNormals : opaqueNormals;
      const uvArr = q.isTranslucent ? transUvs : opaqueUvs;
      const colArr = q.isTranslucent ? transColors : opaqueColors;

      for (const idx of triangleIndices) {
        const p = q.pos[idx];
        const n = q.norm[idx];
        const u = q.uv[idx];
        posArr.push(p[0] + bx, p[1] + by, p[2] + bz);
        normArr.push(n[0], n[1], n[2]);
        uvArr.push(u[0], u[1]);
        colArr.push(q.r, q.g, q.b);
      }
    }
  }

  const opaqueGeometry = new THREE.BufferGeometry();
  if (opaquePositions.length > 0) {
    opaqueGeometry.setAttribute('position', new THREE.Float32BufferAttribute(opaquePositions, 3));
    opaqueGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueNormals, 3));
    opaqueGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueUvs, 2));
    opaqueGeometry.setAttribute('color', new THREE.Float32BufferAttribute(opaqueColors, 3));
  }

  let translucentGeometry: THREE.BufferGeometry | null = null;
  if (transPositions.length > 0) {
    translucentGeometry = new THREE.BufferGeometry();
    translucentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(transPositions, 3));
    translucentGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(transNormals, 3));
    translucentGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(transUvs, 2));
    translucentGeometry.setAttribute('color', new THREE.Float32BufferAttribute(transColors, 3));
  }

  return {
    opaqueGeometry,
    translucentGeometry,
    mergedGeometry: opaqueGeometry,
  };
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
