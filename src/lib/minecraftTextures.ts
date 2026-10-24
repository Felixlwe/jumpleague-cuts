import * as THREE from 'three';
import { useEffect, useState } from 'react';

/**
 * Primary CDN base for official Minecraft 1.21.11 block textures (latest release via jsDelivr CDN)
 */
export const MINECRAFT_CDN_BASE =
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.21.11/assets/minecraft/textures/block/';

export const MINECRAFT_CDN_FALLBACK =
  'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.11/assets/minecraft/textures/block/';

export const MINECRAFT_CDN_LEGACY =
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.1/assets/minecraft/textures/block/';

export const LOCAL_TEXTURE_DIR = '/textures/block/';

export const BIOME_GRASS_TINT = '#7cbd6b';
export const BIOME_FOLIAGE_TINT = '#7cbd6b';

// In-memory caches to guarantee maximum rendering performance
const resolvedUrlCache = new Map<string, string>();
const textureCache = new Map<string, THREE.Texture>();
const materialCache = new Map<string, THREE.Material | THREE.Material[]>();

// Texture load change listeners for reactive updates in React Three Fiber
const textureListeners = new Set<() => void>();

export function onTextureLoaded(callback: () => void): () => void {
  textureListeners.add(callback);
  return () => {
    textureListeners.delete(callback);
  };
}

function notifyTextureLoaded(): void {
  textureListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Normalizes any block or texture identifier to lower-case without prefix/extension
 */
export function sanitizeTextureName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^minecraft:/, '')
    .replace(/\.png$/, '');
}

/**
 * Smart Texture Resolver:
 * Checks whether a texture exists locally under /textures/block/<name>.png.
 * If not, falls back automatically to the official Minecraft 1.21.11 CDN.
 * Caches the resolved URL in memory.
 */
export async function resolveTextureUrl(textureName: string): Promise<string> {
  const cleanName = sanitizeTextureName(textureName);

  if (resolvedUrlCache.has(cleanName)) {
    return resolvedUrlCache.get(cleanName)!;
  }

  const localUrl = `${LOCAL_TEXTURE_DIR}${cleanName}.png`;
  const cdnUrl = `${MINECRAFT_CDN_BASE}${cleanName}.png`;

  if (typeof window === 'undefined') {
    resolvedUrlCache.set(cleanName, cdnUrl);
    return cdnUrl;
  }

  try {
    const res = await fetch(localUrl, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    if (
      res.ok &&
      res.status === 200 &&
      (contentType.includes('image') || !contentType.includes('text/html'))
    ) {
      resolvedUrlCache.set(cleanName, localUrl);
      return localUrl;
    }
  } catch {
    // Probing local file failed, proceed to CDN
  }

  resolvedUrlCache.set(cleanName, cdnUrl);
  return cdnUrl;
}

/**
 * Creates an authentic 16x16 pixel-art canvas texture for classic Minecraft skulls
 */
function createSkullCanvas(skullType: string): HTMLCanvasElement {
  if (typeof document === 'undefined') return {} as HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (skullType.includes('creeper')) {
    // Creeper face: green textured with black mouth and eyes
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(2, 2, 4, 4);
    ctx.fillRect(10, 2, 4, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(10, 4, 3, 3);
    ctx.fillRect(6, 7, 4, 5);
    ctx.fillRect(5, 9, 6, 4);
    ctx.fillRect(5, 12, 2, 3);
    ctx.fillRect(9, 12, 2, 3);
  } else if (skullType.includes('wither')) {
    // Wither Skeleton: dark charcoal skull
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#020617';
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(10, 4, 3, 3);
    ctx.fillRect(7, 8, 2, 2);
    ctx.fillRect(4, 11, 8, 2);
  } else if (skullType.includes('zombie')) {
    // Zombie: green skin with dark hair
    ctx.fillStyle = '#558b2f';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#33691e';
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(3, 6, 3, 2);
    ctx.fillRect(10, 6, 3, 2);
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(5, 9, 6, 2);
  } else if (skullType.includes('skeleton')) {
    // Skeleton: bone white skull
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#334155';
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(10, 4, 3, 3);
    ctx.fillRect(7, 8, 2, 2);
    ctx.fillRect(4, 11, 8, 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(5, 11, 2, 2);
    ctx.fillRect(9, 11, 2, 2);
  } else {
    // Player / Steve Head: brown hair, skin, blue eyes
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 16, 5);
    ctx.fillRect(0, 5, 2, 2);
    ctx.fillRect(14, 5, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 7, 4, 2);
    ctx.fillRect(9, 7, 4, 2);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(5, 7, 2, 2);
    ctx.fillRect(9, 7, 2, 2);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(6, 9, 4, 2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(5, 11, 6, 2);
  }

  return canvas;
}

export const BLOCK_BASE_COLORS: Record<string, string> = {
  stone: '#7f7f7f',
  cobblestone: '#666666',
  mossy_cobblestone: '#5a6b5a',
  stone_bricks: '#7a7a7a',
  mossy_stone_bricks: '#6c7a65',
  dirt: '#866043',
  grass: '#5b8731',
  sand: '#d7c59a',
  gravel: '#7a7674',
  sandstone: '#d7c59a',
  red_sandstone: '#b85c2c',
  oak: '#a88054',
  spruce: '#684e32',
  birch: '#c4b67d',
  jungle: '#a07354',
  acacia: '#a85a32',
  dark_oak: '#422a15',
  mangrove: '#753630',
  cherry: '#e09895',
  bamboo: '#c29d46',
  crimson: '#652d3c',
  warped: '#2b6865',
  planks: '#a88054',
  wood: '#684e32',
  log: '#684e32',
  obsidian: '#14121e',
  bedrock: '#333333',
  brick: '#964d38',
  nether_brick: '#2d1519',
  deepslate: '#4a4a52',
  blackstone: '#272228',
  basalt: '#4f4b4f',
  purpur: '#a97da9',
  end_stone: '#dadca3',
  prismarine: '#5b9c97',
  quartz: '#eae5de',
  iron: '#d8d8d8',
  gold: '#f8d038',
  diamond: '#5decf5',
  emerald: '#17dd62',
  copper: '#bf6b51',
  amethyst: '#8354a7',
  coal: '#111111',
  lapis: '#1e438c',
  redstone: '#b31500',
  slime: '#72b655',
  honey: '#eb9d1b',
  ice: '#8cb5f5',
  snow: '#f0f0f0',
  wool: '#e9ecec',
  glass: '#a0c4de',
  leaves: '#3f671c',
  vine: '#3f671c',
  ladder: '#8d6832',
  terracotta: '#985e43',
};

export function getBlockFallbackColor(name: string): string {
  const clean = sanitizeTextureName(name);
  for (const [key, col] of Object.entries(BLOCK_BASE_COLORS)) {
    if (clean.includes(key)) return col;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 30%, 45%)`;
}

/**
 * Creates a 16x16 crisp placeholder canvas with authentic block color so Three.js has immediate valid texture data
 */
function createPlaceholderCanvas(name: string): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    return {} as HTMLCanvasElement;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const baseColor = getBlockFallbackColor(name);
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 16, 16);
    // Subtle pixel-art texture pattern so fallback looks authentic
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(2, 2, 6, 6);
    ctx.fillRect(8, 8, 6, 6);
  }
  return canvas;
}

/**
 * Retrieves or creates a custom skull / head texture
 */
export function getSkullTexture(skullType: string): THREE.Texture {
  const cleanName = `head_${sanitizeTextureName(skullType)}`;
  const cached = textureCache.get(cleanName);
  if (cached) return cached;

  const canvas = createSkullCanvas(cleanName);
  const texture = new THREE.Texture<TexImageSource>(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache.set(cleanName, texture);
  return texture;
}

/**
 * Creates an authentic 16x16 pixel-art canvas texture for classic Minecraft chests
 */
function createChestCanvas(chestType: string): HTMLCanvasElement {
  if (typeof document === 'undefined') return {} as HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (chestType.includes('ender')) {
    // Dark teal obsidian body with central eye of ender
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    // Eye pupil in center
    ctx.fillStyle = '#10b981';
    ctx.fillRect(7, 6, 2, 4);
    ctx.fillRect(6, 7, 4, 2);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(7, 7, 2, 2);
  } else {
    // Oak / Trapped wood planks body
    ctx.fillStyle = '#855229';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#9a5e30';
    ctx.fillRect(2, 2, 12, 12);
    // Dark trim borders
    ctx.fillStyle = '#452b14';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    // Center lock clasp
    const isTrapped = chestType.includes('trapped');
    ctx.fillStyle = isTrapped ? '#ef4444' : '#cbd5e1';
    ctx.fillRect(7, 6, 2, 4);
    ctx.fillStyle = isTrapped ? '#991b1b' : '#64748b';
    ctx.fillRect(7, 8, 2, 2);
  }

  return canvas;
}

export function getChestTexture(chestType: string): THREE.Texture {
  const cleanName = `chest_${sanitizeTextureName(chestType)}`;
  const cached = textureCache.get(cleanName);
  if (cached) return cached;

  const canvas = createChestCanvas(cleanName);
  const texture = new THREE.Texture<TexImageSource>(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache.set(cleanName, texture);
  return texture;
}

/**
 * Loads a real 16x16 Minecraft texture as THREE.Texture with:
 * - magFilter = THREE.NearestFilter
 * - minFilter = THREE.NearestFilter
 * - colorSpace = THREE.SRGBColorSpace
 * Caches loaded textures in memory and tries fallbacks gracefully.
 */
export function getMinecraftTexture(textureName: string): THREE.Texture {
  const cleanName = sanitizeTextureName(textureName);

  if (cleanName.includes('head') || cleanName.includes('skull')) {
    return getSkullTexture(cleanName);
  }
  if (
    cleanName === 'chest' ||
    cleanName === 'trapped_chest' ||
    cleanName === 'ender_chest'
  ) {
    return getChestTexture(cleanName);
  }

  const cached = textureCache.get(cleanName);
  if (cached) {
    return cached;
  }

  const placeholder = createPlaceholderCanvas(cleanName);
  const texture = new THREE.Texture<TexImageSource>(placeholder);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache.set(cleanName, texture);

  if (typeof window !== 'undefined') {
    resolveTextureUrl(cleanName).then((url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const applyImage = () => {
        texture.image = img;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        notifyTextureLoaded();
      };

      img.onload = applyImage;

      img.onerror = () => {
        // Fallback 1: GitHub Raw 1.21.11
        const rawUrl = `${MINECRAFT_CDN_FALLBACK}${cleanName}.png`;
        if (img.src !== rawUrl) {
          img.src = rawUrl;
          return;
        }

        // Fallback 2: 1.20.1 CDN
        const legacyUrl = `${MINECRAFT_CDN_LEGACY}${cleanName}.png`;
        if (img.src !== legacyUrl) {
          img.src = legacyUrl;
          return;
        }

        console.warn(`[MinecraftTextures] Could not load texture for: ${cleanName}`);
      };

      img.src = url;
    });
  }

  return texture;
}

/**
 * Resolves a block name and face ('top', 'bottom', 'side') to the appropriate Minecraft texture PNG name.
 * Handles stairs, slabs, fences, gates, pressure plates, buttons, signs, hanging signs, carpets, glass panes, etc.
 */
export function resolveBlockTextureName(
  blockName: string,
  face: string = 'side'
): string {
  let lower = sanitizeTextureName(blockName);

  // Remove prefixes
  lower = lower.replace(/^minecraft:/, '');
  lower = lower.replace(/^waxed_/, '');
  lower = lower.replace(/^infested_/, '');

  // Air / void / barrier
  if (
    lower === 'air' ||
    lower === 'cave_air' ||
    lower === 'void_air' ||
    lower === 'structure_void' ||
    lower === 'light' ||
    lower === 'barrier'
  ) {
    return 'barrier';
  }

  // 1. Glas-Panes (_glass_pane / _pane) -> Textur des entsprechenden Glases (_glass bzw. glass)
  if (
    lower.endsWith('_glass_pane') ||
    lower === 'glass_pane' ||
    lower.endsWith('_pane')
  ) {
    if (lower === 'glass_pane') return 'glass';
    if (lower === 'iron_bars' || lower === 'bars') return 'iron_bars';
    const base = lower.replace(/(_glass)?_pane$/, '');
    if (base === 'iron') return 'iron_bars';
    if (base === 'glass') return 'glass';
    return base.endsWith('_glass') ? base : `${base}_glass`;
  }

  // 2. Teppiche (_carpet) -> Textur der entsprechenden Wolle (_wool)
  if (lower.endsWith('_carpet') || lower === 'carpet') {
    if (lower === 'moss_carpet') return 'moss_block';
    if (lower === 'carpet') return 'white_wool';
    const color = lower.replace(/_carpet$/, '');
    return `${color}_wool`;
  }

  // 3. Signs & Hanging Signs (_sign, _wall_sign, _hanging_sign, _wall_hanging_sign)
  if (lower.includes('sign')) {
    const woodMatch = lower.match(/^([a-z_]+?)(_wall)?(_hanging)?_sign$/);
    const wood = woodMatch ? woodMatch[1] : 'oak';
    const WOOD_TYPES = [
      'oak',
      'spruce',
      'birch',
      'jungle',
      'acacia',
      'dark_oak',
      'mangrove',
      'cherry',
      'bamboo',
      'crimson',
      'warped',
    ];
    if (WOOD_TYPES.includes(wood)) {
      return `${wood}_planks`;
    }
    return `${wood}_planks`;
  }

  // 4. Trapdoors (_trapdoor): Holz- und Eisen-Trapdoors haben eigene Texturen (z.B. oak_trapdoor, iron_trapdoor)
  if (lower.endsWith('_trapdoor') || lower === 'trapdoor') {
    if (lower === 'trapdoor') return 'oak_trapdoor';
    return lower;
  }

  // 5. Stairs, Slabs, Fences, Gates, Pressure Plates, Buttons, Walls
  const isSuffixBlock =
    lower.endsWith('_stairs') ||
    lower.endsWith('_slab') ||
    lower.endsWith('_fence') ||
    lower.endsWith('_fence_gate') ||
    lower.endsWith('_pressure_plate') ||
    lower.endsWith('_button') ||
    lower.endsWith('_wall');

  if (isSuffixBlock) {
    const base = lower
      .replace(/_stairs$/, '')
      .replace(/_slab$/, '')
      .replace(/_fence_gate$/, '')
      .replace(/_fence$/, '')
      .replace(/_pressure_plate$/, '')
      .replace(/_button$/, '')
      .replace(/_wall$/, '');

    const WOOD_TYPES = [
      'oak',
      'spruce',
      'birch',
      'jungle',
      'acacia',
      'dark_oak',
      'mangrove',
      'cherry',
      'bamboo',
      'crimson',
      'warped',
    ];

    if (base === 'bamboo_mosaic') return 'bamboo_mosaic';
    if (
      WOOD_TYPES.includes(base) ||
      WOOD_TYPES.some((w) => base === `${w}_wood`)
    ) {
      return `${base.replace(/_wood$/, '')}_planks`;
    }

    // stone_brick_* -> stone_bricks, mossy_stone_brick_* -> mossy_stone_bricks
    if (
      base === 'mossy_stone_brick' ||
      base === 'mossy_stone_bricks' ||
      base.startsWith('mossy_stone_brick')
    ) {
      return 'mossy_stone_bricks';
    }
    if (
      base === 'stone_brick' ||
      base === 'stone_bricks' ||
      base.startsWith('stone_brick')
    ) {
      return 'stone_bricks';
    }

    // red_nether_brick_* -> red_nether_bricks, nether_brick_* -> nether_bricks
    if (
      base === 'red_nether_brick' ||
      base === 'red_nether_bricks' ||
      base.startsWith('red_nether_brick')
    ) {
      return 'red_nether_bricks';
    }
    if (
      base === 'nether_brick' ||
      base === 'nether_bricks' ||
      base.startsWith('nether_brick')
    ) {
      return 'nether_bricks';
    }

    // deepslate_brick_* -> deepslate_bricks, deepslate_tile_* -> deepslate_tiles
    if (
      base === 'deepslate_brick' ||
      base === 'deepslate_bricks' ||
      base.startsWith('deepslate_brick')
    ) {
      return 'deepslate_bricks';
    }
    if (
      base === 'deepslate_tile' ||
      base === 'deepslate_tiles' ||
      base.startsWith('deepslate_tile')
    ) {
      return 'deepslate_tiles';
    }

    // mud_brick_* -> mud_bricks
    if (
      base === 'mud_brick' ||
      base === 'mud_bricks' ||
      base.startsWith('mud_brick')
    ) {
      return 'mud_bricks';
    }

    // prismarine_brick_* -> prismarine_bricks
    if (
      base === 'prismarine_brick' ||
      base === 'prismarine_bricks' ||
      base.startsWith('prismarine_brick')
    ) {
      return 'prismarine_bricks';
    }

    // end_stone_brick_* -> end_stone_bricks
    if (
      base === 'end_stone_brick' ||
      base === 'end_stone_bricks' ||
      base.startsWith('end_stone_brick')
    ) {
      return 'end_stone_bricks';
    }

    // brick_* -> bricks
    if (base === 'brick' || base === 'bricks' || base.startsWith('brick')) {
      return 'bricks';
    }

    // quartz_* / smooth_quartz_* -> quartz_block_side (bzw. quartz_block_top)
    if (base.includes('quartz')) {
      return face === 'top' || face === 'bottom'
        ? 'quartz_block_top'
        : 'quartz_block_side';
    }

    // red_sandstone_* / cut_red_sandstone_* / smooth_red_sandstone_*
    if (base.includes('red_sandstone')) {
      if (face === 'top') return 'red_sandstone_top';
      if (face === 'bottom') return 'red_sandstone_bottom';
      if (base.includes('cut')) return 'cut_red_sandstone';
      return 'red_sandstone';
    }

    // sandstone_* / cut_sandstone_* / smooth_sandstone_*
    if (base.includes('sandstone')) {
      if (face === 'top') return 'sandstone_top';
      if (face === 'bottom') return 'sandstone_bottom';
      if (base.includes('cut')) return 'cut_sandstone';
      return 'sandstone';
    }

    // cobblestone_* -> cobblestone, mossy_cobblestone_* -> mossy_cobblestone
    if (base === 'mossy_cobblestone' || base.startsWith('mossy_cobblestone')) {
      return 'mossy_cobblestone';
    }
    if (base === 'cobblestone' || base.startsWith('cobblestone')) {
      return 'cobblestone';
    }

    // smooth_stone_slab -> smooth_stone
    if (lower === 'smooth_stone_slab') {
      return face === 'side' ? 'smooth_stone_slab_side' : 'smooth_stone';
    }
    if (base === 'smooth_stone') {
      return 'smooth_stone';
    }

    // stone_* -> stone
    if (base === 'stone' || base.startsWith('stone')) {
      return 'stone';
    }

    // Andesite / Diorite / Granite / Blackstone / Purpur analog
    if (base.includes('andesite')) {
      return base.includes('polished') ? 'polished_andesite' : 'andesite';
    }
    if (base.includes('diorite')) {
      return base.includes('polished') ? 'polished_diorite' : 'diorite';
    }
    if (base.includes('granite')) {
      return base.includes('polished') ? 'polished_granite' : 'granite';
    }
    if (base.includes('blackstone')) {
      if (base.includes('brick')) return 'polished_blackstone_bricks';
      return base.includes('polished') ? 'polished_blackstone' : 'blackstone';
    }
    if (base.includes('purpur')) {
      return 'purpur_block';
    }
    if (base.includes('prismarine')) {
      return base.includes('dark') ? 'dark_prismarine' : 'prismarine';
    }
    if (base.includes('tuff')) {
      if (base.includes('brick')) return 'tuff_bricks';
      return base.includes('polished') ? 'polished_tuff' : 'tuff';
    }
    if (base.includes('deepslate')) {
      if (base.includes('cobbled')) return 'cobbled_deepslate';
      return base.includes('polished') ? 'polished_deepslate' : 'deepslate';
    }

    return base;
  }

  // Specific face queries
  if (lower === 'smooth_stone_slab') {
    return face === 'side' ? 'smooth_stone_slab_side' : 'smooth_stone';
  }
  if (lower === 'sandstone' || lower === 'smooth_sandstone') {
    return face === 'top'
      ? 'sandstone_top'
      : face === 'bottom'
      ? 'sandstone_bottom'
      : 'sandstone';
  }
  if (lower === 'red_sandstone' || lower === 'smooth_red_sandstone') {
    return face === 'top'
      ? 'red_sandstone_top'
      : face === 'bottom'
      ? 'red_sandstone_bottom'
      : 'red_sandstone';
  }
  if (lower === 'quartz_block' || lower === 'smooth_quartz') {
    return face === 'top' || face === 'bottom'
      ? 'quartz_block_top'
      : 'quartz_block_side';
  }

  return resolveTextureNameForBlock(lower);
}

/**
 * Comprehensive Minecraft 1.21.11 Block Texture Resolver
 * Maps all 909 block state identifiers across all 1.20 JumpLeague modules to their exact PNG file name in Minecraft assets.
 */
export function resolveTextureNameForBlock(blockType: string): string {
  let lower = sanitizeTextureName(blockType);

  // Strip prefixes: waxed_, infested_
  if (lower.startsWith('waxed_')) {
    lower = lower.replace(/^waxed_/, '');
  }
  if (lower.startsWith('infested_')) {
    lower = lower.replace(/^infested_/, '');
  }

  // Air / void / technical invisible
  if (
    lower === 'air' ||
    lower === 'cave_air' ||
    lower === 'void_air' ||
    lower === 'structure_void' ||
    lower === 'light' ||
    lower === 'barrier'
  ) {
    return 'barrier';
  }

  // Exact mappings for special Minecraft blocks
  const EXACT_MAP: Record<string, string> = {
    // Dirt / Grass
    grass_block: 'grass_block_top',
    dirt_path: 'dirt_path_top',
    grass_path: 'dirt_path_top',
    podzol: 'podzol_top',
    mycelium: 'mycelium_top',
    farmland: 'farmland_moist',

    // Stone / Minerals
    stone_bricks: 'stone_bricks',
    smooth_stone: 'smooth_stone',
    mossy_stone_bricks: 'mossy_stone_bricks',
    cracked_stone_bricks: 'cracked_stone_bricks',
    chiseled_stone_bricks: 'chiseled_stone_bricks',
    magma_block: 'magma',
    moss_block: 'moss_block',
    purpur_block: 'purpur_block',
    smooth_basalt: 'smooth_basalt',
    polished_basalt: 'polished_basalt_side',
    basalt: 'basalt_side',

    // Sandstone / Quartz
    sandstone: 'sandstone',
    red_sandstone: 'red_sandstone',
    cut_sandstone: 'cut_sandstone',
    cut_red_sandstone: 'cut_red_sandstone',
    chiseled_sandstone: 'chiseled_sandstone',
    chiseled_red_sandstone: 'chiseled_red_sandstone',
    smooth_sandstone: 'sandstone_top',
    smooth_red_sandstone: 'red_sandstone_top',
    quartz_block: 'quartz_block_side',
    smooth_quartz: 'quartz_block_bottom',
    chiseled_quartz_block: 'chiseled_quartz_block',

    // Honey & Slime
    honey_block: 'honey_block_side',
    honeycomb_block: 'honeycomb_block',
    slime_block: 'slime_block',

    // Liquids & Fire
    water: 'water_still',
    lava: 'lava_still',
    fire: 'fire_0',
    soul_fire: 'soul_fire_0',

    // Redstone / Utility
    redstone_wire: 'redstone_dust_dot',
    repeater: 'repeater',
    comparator: 'comparator',
    observer: 'observer_front',
    dispenser: 'dispenser_front',
    dropper: 'dropper_front',
    piston: 'piston_top',
    sticky_piston: 'piston_top_sticky',
    piston_head: 'piston_top',
    moving_piston: 'piston_top',
    daylight_detector: 'daylight_detector_top',
    lever: 'lever',
    tripwire: 'tripwire',
    tripwire_hook: 'tripwire_hook',
    target: 'target_side',
    lightning_rod: 'lightning_rod',
    bell: 'bell_side',
    scaffolding: 'scaffolding_top',
    chain: 'iron_chain',
    ladder: 'ladder',
    iron_bars: 'iron_bars',
    flower_pot: 'flower_pot',
    spawner: 'spawner',
    conduit: 'conduit',
    beacon: 'beacon',
    end_rod: 'end_rod',
    end_portal: 'obsidian',
    end_portal_frame: 'end_portal_frame_top',
    end_gateway: 'obsidian',
    respawn_anchor: 'respawn_anchor_top',
    lodestone: 'lodestone_side',
    crying_obsidian: 'crying_obsidian',
    ancient_debris: 'ancient_debris_side',
    decorated_pot: 'terracotta',
    suspicious_sand: 'suspicious_sand_0',
    suspicious_gravel: 'suspicious_gravel_0',
    chiseled_bookshelf: 'chiseled_bookshelf_side',
    bookshelf: 'bookshelf',
    cake: 'cake_top',
    snow: 'snow',
    snow_block: 'snow',
    hopper: 'hopper_outside',
    jukebox: 'jukebox_side',
    ochre_froglight: 'ochre_froglight_side',
    verdant_froglight: 'verdant_froglight_side',
    pearlescent_froglight: 'pearlescent_froglight_side',
    mangrove_roots: 'mangrove_roots_side',
    hay_block: 'hay_block_side',
    azalea: 'azalea_side',
    flowering_azalea: 'flowering_azalea_side',
    tall_seagrass: 'tall_seagrass_bottom',
    small_dripleaf: 'small_dripleaf_side',
    big_dripleaf: 'big_dripleaf_top',
    water_cauldron: 'cauldron_side',
    melon: 'melon_side',
    pumpkin: 'pumpkin_side',
    bone_block: 'bone_block_side',
    tnt: 'tnt_side',
    beehive: 'beehive_front',
    bee_nest: 'bee_nest_front',
    campfire: 'campfire_log',
    soul_campfire: 'soul_campfire_fire',
    reinforced_deepslate: 'reinforced_deepslate_side',
    bubble_column: 'water_still',
    bamboo_sapling: 'bamboo_stalk',
    petrified_oak_slab: 'oak_planks',
    petrified_oak: 'oak_planks',
    dried_kelp_block: 'dried_kelp_side',
    command_block: 'command_block_front',
    light_weighted_pressure_plate: 'gold_block',
    heavy_weighted_pressure_plate: 'iron_block',
    chest: 'oak_planks',
    trapped_chest: 'oak_planks',
    ender_chest: 'obsidian',

    // Torches & Lanterns
    torch: 'torch',
    wall_torch: 'torch',
    soul_torch: 'soul_torch',
    soul_wall_torch: 'soul_torch',
    redstone_torch: 'redstone_torch',
    redstone_wall_torch: 'redstone_torch',
    lantern: 'lantern',
    soul_lantern: 'soul_lantern',

    // Crafting / Workstations
    crafting_table: 'crafting_table_front',
    furnace: 'furnace_front',
    blast_furnace: 'blast_furnace_front',
    smoker: 'smoker_front',
    barrel: 'barrel_side',
    loom: 'loom_front',
    cartography_table: 'cartography_table_side3',
    fletching_table: 'fletching_table_front',
    smithing_table: 'smithing_table_front',
    grindstone: 'grindstone_side',
    stonecutter: 'stonecutter_side',
    brewing_stand: 'brewing_stand',
    cauldron: 'cauldron_side',
    composter: 'composter_side',
    lectern: 'lectern_sides',
    enchanting_table: 'enchanting_table_side',

    // Plants & Crops
    tall_grass: 'tall_grass_bottom',
    large_fern: 'large_fern_bottom',
    sunflower: 'sunflower_front',
    lilac: 'lilac_bottom',
    rose_bush: 'rose_bush_bottom',
    peony: 'peony_bottom',
    wheat: 'wheat_stage7',
    carrots: 'carrots_stage3',
    potatoes: 'potatoes_stage3',
    beetroots: 'beetroots_stage3',
    cocoa: 'cocoa_stage2',
    sweet_berry_bush: 'sweet_berry_bush_stage3',
    nether_wart: 'nether_wart_stage2',
    melon_stem: 'melon_stem',
    pumpkin_stem: 'pumpkin_stem',
    attached_melon_stem: 'attached_melon_stem',
    attached_pumpkin_stem: 'attached_pumpkin_stem',
    sea_pickle: 'sea_pickle',
    lily_pad: 'lily_pad',
    cactus: 'cactus_side',
    sugar_cane: 'sugar_cane',
    bamboo: 'bamboo_stalk',
    dead_bush: 'dead_bush',
    chorus_plant: 'chorus_plant',
    chorus_flower: 'chorus_flower',
    pointed_dripstone: 'pointed_dripstone_down_base',
    dripstone_block: 'dripstone_block',
    amethyst_cluster: 'amethyst_cluster',
    small_amethyst_bud: 'small_amethyst_bud',
    medium_amethyst_bud: 'medium_amethyst_bud',
    large_amethyst_bud: 'large_amethyst_bud',
    budding_amethyst: 'budding_amethyst',
    amethyst_block: 'amethyst_block',
    calcite: 'calcite',
    tuff: 'tuff',
    sculk: 'sculk',
    sculk_catalyst: 'sculk_catalyst_side',
    sculk_sensor: 'sculk_sensor_side',
    sculk_shrieker: 'sculk_shrieker_side',
    sculk_vein: 'sculk_vein',
    mud: 'mud',
    muddy_mangrove_roots: 'muddy_mangrove_roots_side',
    frogspawn: 'frogspawn',
    turtle_egg: 'turtle_egg',
    sniffer_egg: 'sniffer_egg',
    pitcher_crop: 'pitcher_crop_bottom_stage4',
    torchflower_crop: 'torchflower_crop_stage1',

    // Anvils
    anvil: 'anvil_top',
    chipped_anvil: 'chipped_anvil_top',
    damaged_anvil: 'damaged_anvil_top',
  };

  if (EXACT_MAP[lower]) return EXACT_MAP[lower];

  // Potted plants: potted_<plant> -> <plant>
  if (lower.startsWith('potted_')) {
    const inner = lower.replace(/^potted_/, '');
    if (inner === 'cactus') return 'cactus_side';
    if (inner === 'bamboo') return 'bamboo_stalk';
    if (inner === 'azalea_bush') return 'azalea_top';
    if (inner === 'flowering_azalea_bush') return 'flowering_azalea_top';
    return resolveTextureNameForBlock(inner);
  }

  // Beds (_bed) -> <color>_wool
  if (lower.endsWith('_bed')) {
    const color = lower.replace(/_bed$/, '');
    return `${color}_wool`;
  }

  // Signs & Hanging Signs (_sign, _wall_sign, _hanging_sign, _wall_hanging_sign)
  if (lower.includes('sign')) {
    const woodMatch = lower.match(/^([a-z_]+?)(_wall)?(_hanging)?_sign$/);
    const wood = woodMatch ? woodMatch[1] : 'oak';
    return `${wood}_planks`;
  }

  // Banners (_banner, _wall_banner)
  if (lower.includes('banner')) {
    const colorMatch = lower.match(/^([a-z]+)(_wall)?_banner$/);
    const color = colorMatch ? colorMatch[1] : 'white';
    return `${color}_wool`;
  }

  // Doors (_door) -> <wood>_door_top
  if (lower.endsWith('_door')) {
    const wood = lower.replace(/_door$/, '');
    return `${wood}_door_top`;
  }

  // Coral Wall Fans (_wall_fan) -> <coral>_fan
  if (lower.endsWith('_wall_fan')) {
    return lower.replace(/_wall_fan$/, '_fan');
  }

  // Wood Bark / Hyphae (_wood, _hyphae)
  if (lower.endsWith('_wood')) {
    const wood = lower.replace(/_wood$/, '');
    return `${wood}_log`;
  }
  if (lower.endsWith('_hyphae')) {
    const stem = lower.replace(/_hyphae$/, '');
    return `${stem}_stem`;
  }

  // Moss carpet special check before generic _carpet
  if (lower === 'moss_carpet') return 'moss_block';

  // Carpets (_carpet) -> <color>_wool
  if (lower.endsWith('_carpet')) {
    const color = lower.replace(/_carpet$/, '');
    return `${color}_wool`;
  }
  if (lower === 'carpet') return 'white_wool';

  // Glass Panes (_pane)
  if (lower.endsWith('_pane')) {
    const base = lower.replace(/_pane$/, '');
    if (base === 'iron') return 'iron_bars';
    if (base === 'glass') return 'glass';
    return base.endsWith('_glass') ? base : `${base}_glass`;
  }

  // Bricks pluralization dictionary
  const BRICK_MAP: Record<string, string> = {
    brick: 'bricks',
    stone_brick: 'stone_bricks',
    mossy_stone_brick: 'mossy_stone_bricks',
    nether_brick: 'nether_bricks',
    red_nether_brick: 'red_nether_bricks',
    deepslate_brick: 'deepslate_bricks',
    deepslate_tile: 'deepslate_tiles',
    mud_brick: 'mud_bricks',
    end_stone_brick: 'end_stone_bricks',
    polished_blackstone_brick: 'polished_blackstone_bricks',
    prismarine_brick: 'prismarine_bricks',
    quartz_brick: 'quartz_bricks',
    tuff_brick: 'tuff_bricks',
  };

  const WOOD_TYPES = [
    'oak',
    'spruce',
    'birch',
    'jungle',
    'acacia',
    'dark_oak',
    'mangrove',
    'cherry',
    'bamboo',
    'crimson',
    'warped',
  ];

  function mapBaseMaterial(base: string): string {
    if (BRICK_MAP[base]) return BRICK_MAP[base];
    for (const [key, val] of Object.entries(BRICK_MAP)) {
      if (base.endsWith(key)) return base.replace(new RegExp(`${key}$`), val);
    }
    if (WOOD_TYPES.some((w) => base === w || base === `${w}_wood`)) {
      return `${base.replace(/_wood$/, '')}_planks`;
    }
    if (base === 'bamboo_mosaic') return 'bamboo_mosaic';
    if (base === 'smooth_stone') return 'smooth_stone';
    if (base === 'smooth_sandstone') return 'sandstone_top';
    if (base === 'smooth_red_sandstone') return 'red_sandstone_top';
    if (base === 'quartz' || base === 'smooth_quartz') return 'quartz_block_side';
    if (base === 'purpur') return 'purpur_block';
    if (base === 'prismarine') return 'prismarine';
    if (base === 'dark_prismarine') return 'dark_prismarine';
    return base;
  }

  // Slabs (_slab)
  if (lower.endsWith('_slab')) {
    const base = lower.replace(/_slab$/, '');
    if (base === 'smooth_stone') return 'smooth_stone_slab_side';
    return mapBaseMaterial(base);
  }

  // Stairs (_stairs)
  if (lower.endsWith('_stairs')) {
    const base = lower.replace(/_stairs$/, '');
    return mapBaseMaterial(base);
  }

  // Fences (_fence) & Fence Gates (_fence_gate)
  if (lower.endsWith('_fence')) {
    const base = lower.replace(/_fence$/, '');
    if (base === 'nether_brick') return 'nether_bricks';
    return mapBaseMaterial(base);
  }
  if (lower.endsWith('_fence_gate')) {
    const base = lower.replace(/_fence_gate$/, '');
    return mapBaseMaterial(base);
  }

  // Walls (_wall)
  if (lower.endsWith('_wall')) {
    const base = lower.replace(/_wall$/, '');
    return mapBaseMaterial(base);
  }

  // Pressure Plates & Buttons
  if (lower.endsWith('_pressure_plate')) {
    const base = lower.replace(/_pressure_plate$/, '');
    return mapBaseMaterial(base);
  }
  if (lower.endsWith('_button')) {
    const base = lower.replace(/_button$/, '');
    return mapBaseMaterial(base);
  }

  // Trapdoors
  if (lower.endsWith('_trapdoor')) {
    return lower;
  }
  if (lower === 'trapdoor') return 'oak_trapdoor';

  return lower;
}

/**
 * Multi-Face & Biome-Tint Material Resolver:
 * - anvil / chipped_anvil / damaged_anvil: Top anvil_top, Seiten/Boden anvil (Metalness 0.05, Roughness 0.75)
 * - honey_block: Transparenter Bernsteinton, Top/Boden/Seiten getrennt
 * - lever: Base Cobblestone, Handle lever.png mit Alpha-Transparenz
 * - dead_bush & corals: Transparente Pflanzen-/Korallentexturen
 * - grass_block: Top grass_block_top (mit grünem Biome-Tint), Boden dirt, Seiten grass_block_side
 * - smooth_stone_slab: Top/Boden smooth_stone, Seiten smooth_stone_slab_side
 * - sandstone / red_sandstone: Top _top, Boden _bottom, Seiten Basis
 * - Baumstämme (_log), Säulen (_pillar) & Basalt: Top/Boden _top, Seiten Basis
 * - Laub (_leaves), vine & lily_pad: Biome-Tint, transparent: true, alphaTest: 0.5
 * - Glas, Leitern, Zäune, Panes & Spinnenweben: transparent: true, alphaTest: 0.1
 */
/**
 * Helper to construct a standard 6-faced Minecraft cube material array
 * Face order: +X (East), -X (West), +Y (Top), -Y (Bottom), +Z (South/Front), -Z (North/Back)
 */
function makeCubeMaterials(
  side: THREE.Texture,
  top: THREE.Texture,
  bottom: THREE.Texture = side,
  front: THREE.Texture = side,
  back: THREE.Texture = side,
  extraProps: THREE.MeshStandardMaterialParameters = {}
): THREE.Material[] {
  const sideMat = new THREE.MeshStandardMaterial({
    map: side,
    roughness: 0.8,
    metalness: 0.05,
    ...extraProps,
  });
  const topMat = new THREE.MeshStandardMaterial({
    map: top,
    roughness: 0.8,
    metalness: 0.05,
    ...extraProps,
  });
  const bottomMat = new THREE.MeshStandardMaterial({
    map: bottom,
    roughness: 0.8,
    metalness: 0.05,
    ...extraProps,
  });
  const frontMat = new THREE.MeshStandardMaterial({
    map: front,
    roughness: 0.8,
    metalness: 0.05,
    ...extraProps,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: back,
    roughness: 0.8,
    metalness: 0.05,
    ...extraProps,
  });
  return [sideMat, sideMat, topMat, bottomMat, frontMat, backMat];
}

export function getMinecraftBlockMaterial(
  blockType: string
): THREE.Material | THREE.Material[] {
  const raw = sanitizeTextureName(blockType);

  const cachedMat = materialCache.get(raw);
  if (cachedMat) {
    return cachedMat;
  }

  // 0. Barrier, Light, Structure Void & Air: 100% transparent and invisible
  if (
    raw === 'barrier' ||
    raw === 'structure_void' ||
    raw === 'light' ||
    raw === 'air' ||
    raw === 'cave_air' ||
    raw === 'void_air'
  ) {
    const invisibleMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materialCache.set(raw, invisibleMat);
    return invisibleMat;
  }

  // 1. Anvil, Chipped Anvil & Damaged Anvil (Multi-Face)
  if (raw === 'anvil' || raw === 'chipped_anvil' || raw === 'damaged_anvil') {
    const topTexName =
      raw === 'anvil' ? 'anvil_top' : `${raw}_top`;
    const topTex = getMinecraftTexture(topTexName);
    const bodyTex = getMinecraftTexture('anvil');

    const bodyMat = new THREE.MeshStandardMaterial({
      map: bodyTex,
      roughness: 0.75,
      metalness: 0.05,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.75,
      metalness: 0.05,
    });

    const mats: THREE.Material[] = [
      bodyMat,
      bodyMat,
      topMat,
      bodyMat,
      bodyMat,
      bodyMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 2. Honey Block (Translucent Amber Multi-Face)
  if (raw === 'honey_block') {
    const topTex = getMinecraftTexture('honey_block_top');
    const bottomTex = getMinecraftTexture('honey_block_bottom');
    const sideTex = getMinecraftTexture('honey_block_side');

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      transparent: true,
      opacity: 0.88,
      roughness: 0.1,
      metalness: 0.0,
      depthWrite: true,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      transparent: true,
      opacity: 0.88,
      roughness: 0.1,
      metalness: 0.0,
      depthWrite: true,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      transparent: true,
      opacity: 0.88,
      roughness: 0.1,
      metalness: 0.0,
      depthWrite: true,
    });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      bottomMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 3. Slime Block (Translucent Green)
  if (raw === 'slime_block') {
    const tex = getMinecraftTexture('slime_block');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      opacity: 0.82,
      roughness: 0.1,
      metalness: 0.0,
      depthWrite: true,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 4. Lever (Handle Texture with Alpha Transparency)
  if (raw === 'lever') {
    const tex = getMinecraftTexture('lever');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 5. Dead Bushes, Corals, Plants, Flowers, Saplings, Grass, Mushrooms (Alpha Tested Cross-Sprites)
  const isPlantOrCoral =
    raw.includes('coral') ||
    raw === 'dead_bush' ||
    raw.includes('sapling') ||
    raw.includes('flower') ||
    raw.includes('tulip') ||
    raw.includes('orchid') ||
    raw.includes('daisy') ||
    raw.includes('allium') ||
    raw.includes('dandelion') ||
    raw.includes('poppy') ||
    raw.includes('cornflower') ||
    raw.includes('lily_of_the_valley') ||
    raw.includes('wither_rose') ||
    raw.includes('sunflower') ||
    raw.includes('rose_bush') ||
    raw.includes('peony') ||
    raw.includes('lilac') ||
    raw.includes('grass') ||
    raw.includes('fern') ||
    raw.includes('mushroom') ||
    raw.includes('fungus') ||
    raw.includes('roots') ||
    raw.includes('sprouts') ||
    raw === 'sugar_cane';

  if (isPlantOrCoral) {
    const texName = resolveTextureNameForBlock(raw);
    const tex = getMinecraftTexture(texName);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 6. Skulls & Player Heads
  const isSkull = raw.includes('head') || raw.includes('skull');
  if (isSkull) {
    const tex = getSkullTexture(raw);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.8,
      metalness: 0.0,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 7. Smooth Stone Slab
  if (raw === 'smooth_stone_slab') {
    const topTex = getMinecraftTexture('smooth_stone');
    const sideTex = getMinecraftTexture('smooth_stone_slab_side');

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.8,
      metalness: 0.05,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.8,
      metalness: 0.05,
    });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      topMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 8. Grass Block (Multi-Face with Biome Tint on Top Face)
  if (raw === 'grass_block') {
    const topTex = getMinecraftTexture('grass_block_top');
    const sideTex = getMinecraftTexture('grass_block_side');
    const bottomTex = getMinecraftTexture('dirt');

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      color: new THREE.Color(BIOME_GRASS_TINT),
      roughness: 0.8,
      metalness: 0.0,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.8,
      metalness: 0.0,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      roughness: 0.85,
      metalness: 0.0,
    });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      bottomMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 9. Podzol, Mycelium, Dirt Path (Multi-Face Top + Dirt Bottom)
  if (raw === 'podzol' || raw === 'mycelium' || raw === 'dirt_path' || raw === 'grass_path') {
    const prefix = raw === 'grass_path' ? 'dirt_path' : raw;
    const topTex = getMinecraftTexture(`${prefix}_top`);
    const sideTex = getMinecraftTexture(`${prefix}_side`);
    const bottomTex = getMinecraftTexture('dirt');

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.85,
      metalness: 0.0,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.85,
      metalness: 0.0,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      roughness: 0.9,
      metalness: 0.0,
    });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      bottomMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 10. Sandstone & Red Sandstone (Multi-Face)
  if (raw === 'sandstone' || raw === 'red_sandstone') {
    const topTex = getMinecraftTexture(`${raw}_top`);
    const bottomTex = getMinecraftTexture(`${raw}_bottom`);
    const sideTex = getMinecraftTexture(raw);

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.85,
      metalness: 0.0,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      roughness: 0.85,
      metalness: 0.0,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.85,
      metalness: 0.0,
    });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      bottomMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 11. Baumstämme (_log), Säulen (_pillar) & Basalt
  const isLog =
    raw.includes('_log') ||
    raw.endsWith('log') ||
    raw.includes('_stem') ||
    raw.includes('_wood');
  const isPillar =
    raw.includes('_pillar') ||
    raw.endsWith('pillar') ||
    raw.includes('basalt');

  if (isLog || isPillar) {
    let topTexName = `${raw}_top`;
    let sideTexName = raw;

    if (raw.includes('basalt')) {
      topTexName = 'basalt_top';
      sideTexName = 'basalt_side';
    } else if (raw.includes('purpur_pillar')) {
      topTexName = 'purpur_pillar_top';
      sideTexName = 'purpur_pillar';
    } else if (raw.includes('quartz_pillar')) {
      topTexName = 'quartz_pillar_top';
      sideTexName = 'quartz_pillar';
    }

    const topTex = getMinecraftTexture(topTexName);
    const sideTex = getMinecraftTexture(sideTexName);

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.8,
      metalness: 0.05,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.8,
      metalness: 0.05,
    });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      topMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 12. Crafting Table (Multi-Face)
  if (raw === 'crafting_table') {
    const topTex = getMinecraftTexture('crafting_table_top');
    const sideTex = getMinecraftTexture('crafting_table_side');
    const frontTex = getMinecraftTexture('crafting_table_front');
    const bottomTex = getMinecraftTexture('oak_planks');

    const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.8 });
    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.8 });
    const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.8 });
    const bottomMat = new THREE.MeshStandardMaterial({ map: bottomTex, roughness: 0.8 });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      bottomMat,
      frontMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 13. Bookshelf (Planks on top and bottom)
  if (raw === 'bookshelf') {
    const sideTex = getMinecraftTexture('bookshelf');
    const plankTex = getMinecraftTexture('oak_planks');

    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.8 });
    const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.8 });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      plankMat,
      plankMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // 14. TNT
  if (raw === 'tnt') {
    const topTex = getMinecraftTexture('tnt_top');
    const bottomTex = getMinecraftTexture('tnt_bottom');
    const sideTex = getMinecraftTexture('tnt_side');

    const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.8 });
    const bottomMat = new THREE.MeshStandardMaterial({ map: bottomTex, roughness: 0.8 });
    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.8 });

    const mats: THREE.Material[] = [
      sideMat,
      sideMat,
      topMat,
      bottomMat,
      sideMat,
      sideMat,
    ];
    materialCache.set(raw, mats);
    return mats;
  }

  // Barrel
  if (raw === 'barrel') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('barrel_side'),
      getMinecraftTexture('barrel_top'),
      getMinecraftTexture('barrel_bottom')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Chiseled Bookshelf
  if (raw === 'chiseled_bookshelf') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('chiseled_bookshelf_side'),
      getMinecraftTexture('oak_planks'),
      getMinecraftTexture('oak_planks')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Furnaces, Blast Furnace, Smoker
  if (raw === 'furnace' || raw === 'blast_furnace' || raw === 'smoker') {
    const frontTex = getMinecraftTexture(`${raw}_front`);
    const sideTex = getMinecraftTexture(`${raw}_side`);
    const topTex = getMinecraftTexture(`${raw}_top`);
    const bottomTex = getMinecraftTexture(
      raw === 'smoker'
        ? 'smoker_bottom'
        : raw === 'blast_furnace'
        ? 'smooth_stone'
        : 'stone'
    );
    const mats = makeCubeMaterials(sideTex, topTex, bottomTex, frontTex, sideTex);
    materialCache.set(raw, mats);
    return mats;
  }

  // Dispenser & Dropper
  if (raw === 'dispenser' || raw === 'dropper') {
    const frontTex = getMinecraftTexture(`${raw}_front`);
    const furnaceTop = getMinecraftTexture('furnace_top');
    const mats = makeCubeMaterials(
      furnaceTop,
      furnaceTop,
      furnaceTop,
      frontTex,
      furnaceTop
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Observer
  if (raw === 'observer') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('observer_side'),
      getMinecraftTexture('observer_top'),
      getMinecraftTexture('observer_top'),
      getMinecraftTexture('observer_front'),
      getMinecraftTexture('observer_back')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Hay Block
  if (raw === 'hay_block') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('hay_block_side'),
      getMinecraftTexture('hay_block_top'),
      getMinecraftTexture('hay_block_top')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Target
  if (raw === 'target') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('target_side'),
      getMinecraftTexture('target_top'),
      getMinecraftTexture('target_top')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Bone Block
  if (raw === 'bone_block') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('bone_block_side'),
      getMinecraftTexture('bone_block_top'),
      getMinecraftTexture('bone_block_top')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Melon
  if (raw === 'melon') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('melon_side'),
      getMinecraftTexture('melon_top'),
      getMinecraftTexture('melon_top')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Pumpkin & Carved Pumpkin & Jack o Lantern
  if (
    raw === 'pumpkin' ||
    raw === 'carved_pumpkin' ||
    raw === 'jack_o_lantern'
  ) {
    const topTex = getMinecraftTexture('pumpkin_top');
    const sideTex = getMinecraftTexture('pumpkin_side');
    const frontTex = raw === 'pumpkin' ? sideTex : getMinecraftTexture(raw);
    const extra =
      raw === 'jack_o_lantern'
        ? {
            emissive: new THREE.Color('#ea580c'),
            emissiveIntensity: 0.6,
          }
        : {};
    const mats = makeCubeMaterials(
      sideTex,
      topTex,
      topTex,
      frontTex,
      sideTex,
      extra
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Beehive & Bee Nest
  if (raw === 'beehive') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('beehive_side'),
      getMinecraftTexture('beehive_end'),
      getMinecraftTexture('beehive_end'),
      getMinecraftTexture('beehive_front'),
      getMinecraftTexture('beehive_side')
    );
    materialCache.set(raw, mats);
    return mats;
  }
  if (raw === 'bee_nest') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('bee_nest_side'),
      getMinecraftTexture('bee_nest_top'),
      getMinecraftTexture('bee_nest_bottom'),
      getMinecraftTexture('bee_nest_front'),
      getMinecraftTexture('bee_nest_side')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Jukebox
  if (raw === 'jukebox') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('jukebox_side'),
      getMinecraftTexture('jukebox_top'),
      getMinecraftTexture('oak_planks')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Enchanting Table
  if (raw === 'enchanting_table') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('enchanting_table_side'),
      getMinecraftTexture('enchanting_table_top'),
      getMinecraftTexture('obsidian')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // End Portal Frame
  if (raw === 'end_portal_frame') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('end_portal_frame_side'),
      getMinecraftTexture('end_portal_frame_top'),
      getMinecraftTexture('end_stone')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Piston & Sticky Piston
  if (raw === 'piston' || raw === 'sticky_piston') {
    const topTex = getMinecraftTexture(
      raw === 'sticky_piston' ? 'piston_top_sticky' : 'piston_top'
    );
    const mats = makeCubeMaterials(
      getMinecraftTexture('piston_side'),
      topTex,
      getMinecraftTexture('piston_bottom')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Cactus
  if (raw === 'cactus') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('cactus_side'),
      getMinecraftTexture('cactus_top'),
      getMinecraftTexture('cactus_bottom')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Cake
  if (raw === 'cake') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('cake_side'),
      getMinecraftTexture('cake_top'),
      getMinecraftTexture('cake_bottom')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Froglights (Ochre, Verdant, Pearlescent)
  if (raw.endsWith('_froglight')) {
    const topTex = getMinecraftTexture(`${raw}_top`);
    const sideTex = getMinecraftTexture(`${raw}_side`);
    const mats = makeCubeMaterials(
      sideTex,
      topTex,
      topTex,
      sideTex,
      sideTex,
      {
        emissive: new THREE.Color('#fef08a'),
        emissiveIntensity: 0.35,
      }
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Sculk Catalyst, Shrieker, Sensor
  if (
    raw === 'sculk_catalyst' ||
    raw === 'sculk_shrieker' ||
    raw === 'sculk_sensor'
  ) {
    const topTex = getMinecraftTexture(`${raw}_top`);
    const sideTex = getMinecraftTexture(`${raw}_side`);
    const mats = makeCubeMaterials(sideTex, topTex, sideTex);
    materialCache.set(raw, mats);
    return mats;
  }

  // Respawn Anchor
  if (raw === 'respawn_anchor') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('respawn_anchor_side'),
      getMinecraftTexture('respawn_anchor_top'),
      getMinecraftTexture('crying_obsidian')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Lodestone
  if (raw === 'lodestone') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('lodestone_side'),
      getMinecraftTexture('lodestone_top'),
      getMinecraftTexture('lodestone_top')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Ancient Debris
  if (raw === 'ancient_debris') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('ancient_debris_side'),
      getMinecraftTexture('ancient_debris_top'),
      getMinecraftTexture('ancient_debris_top')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // Dried Kelp Block
  if (raw === 'dried_kelp_block') {
    const mats = makeCubeMaterials(
      getMinecraftTexture('dried_kelp_side'),
      getMinecraftTexture('dried_kelp_top'),
      getMinecraftTexture('dried_kelp_bottom')
    );
    materialCache.set(raw, mats);
    return mats;
  }

  // 15. Laub (_leaves), vine, lily_pad, glow_lichen & sculk_vein
  const isFoliage =
    raw.includes('leaves') ||
    raw === 'vine' ||
    raw === 'lily_pad' ||
    raw === 'glow_lichen' ||
    raw === 'sculk_vein';

  if (isFoliage) {
    const tex = getMinecraftTexture(raw);
    const hasTint =
      raw.includes('leaves') || raw === 'vine' || raw === 'lily_pad';
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: hasTint
        ? new THREE.Color(BIOME_FOLIAGE_TINT)
        : new THREE.Color('#ffffff'),
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 16. Glas, Leitern, Zäune, Spinnenweben, Falltüren und Scheiben (transparent: true, alphaTest: 0.1)
  const isGlass = raw.includes('glass');
  const isLadder = raw.includes('ladder');
  const isFence = raw.includes('fence');
  const isCobweb = raw.includes('cobweb') || raw === 'web';
  const isIronBars = raw.includes('iron_bars') || raw === 'bars';
  const isTrapdoor = raw.includes('trapdoor');
  const isPane = raw.includes('pane');
  const isChain = raw.includes('chain');

  if (
    isGlass ||
    isLadder ||
    isFence ||
    isCobweb ||
    isIronBars ||
    isTrapdoor ||
    isPane ||
    isChain
  ) {
    const texName = resolveTextureNameForBlock(raw);
    const tex = getMinecraftTexture(texName);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      roughness: isGlass ? 0.1 : isIronBars ? 0.35 : 0.8,
      metalness: isIronBars ? 0.85 : 0.05,
      side: THREE.DoubleSide,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 17. End Rod & Leuchtquellen (Emissive)
  if (raw === 'end_rod') {
    const tex = getMinecraftTexture('end_rod');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  if (raw === 'lantern' || raw === 'soul_lantern') {
    const isSoul = raw.includes('soul');
    const tex = getMinecraftTexture(raw);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      emissive: new THREE.Color(isSoul ? '#06b6d4' : '#f59e0b'),
      emissiveIntensity: 0.45,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  if (raw.includes('torch')) {
    const isSoul = raw.includes('soul');
    const isRedstone = raw.includes('redstone');
    const tex = getMinecraftTexture(
      isSoul ? 'soul_torch' : isRedstone ? 'redstone_torch' : 'torch'
    );
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      emissive: new THREE.Color(
        isSoul ? '#06b6d4' : isRedstone ? '#ef4444' : '#f59e0b'
      ),
      emissiveIntensity: 0.5,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 18. Tactical High-Value Blocks (Gold & Emerald)
  if (raw === 'gold_block') {
    const tex = getMinecraftTexture('gold_block');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.25,
      metalness: 0.75,
      emissive: new THREE.Color('#ca8a04'),
      emissiveIntensity: 0.25,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  if (raw === 'emerald_block') {
    const tex = getMinecraftTexture('emerald_block');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.2,
      metalness: 0.75,
      emissive: new THREE.Color('#059669'),
      emissiveIntensity: 0.3,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 19. Standard Minecraft Solid Blocks, Slabs, Walls, Stairs etc.
  const resolvedTexName = resolveBlockTextureName(raw, 'side');
  const tex = getMinecraftTexture(resolvedTexName);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    metalness: 0.08,
  });
  materialCache.set(raw, mat);
  return mat;
}

/**
 * React Hook:
 * Retrieves and automatically re-renders the component when texture downloads complete.
 */
export function useMinecraftBlockMaterial(
  blockType: string
): THREE.Material | THREE.Material[] {
  const [material, setMaterial] = useState<THREE.Material | THREE.Material[]>(
    () => getMinecraftBlockMaterial(blockType)
  );

  useEffect(() => {
    setMaterial(getMinecraftBlockMaterial(blockType));
    const unsubscribe = onTextureLoaded(() => {
      setMaterial(getMinecraftBlockMaterial(blockType));
    });
    return unsubscribe;
  }, [blockType]);

  return material;
}
