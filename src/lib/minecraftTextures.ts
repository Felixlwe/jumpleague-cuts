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

/**
 * Creates a 16x16 crisp placeholder canvas so Three.js has immediate valid texture data
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
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    ctx.fillStyle = `hsl(${hue}, 20%, 35%)`;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = `hsl(${hue}, 25%, 45%)`;
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillRect(8, 8, 8, 8);
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
 * Comprehensive Minecraft 1.21.11 Block Texture Resolver
 * Maps block state identifiers to their exact PNG file name in Minecraft assets.
 */
export function resolveTextureNameForBlock(blockType: string): string {
  const lower = sanitizeTextureName(blockType);

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

  // 1. Direct standard block shortcuts
  if (lower === 'stone_bricks') return 'stone_bricks';
  if (lower === 'oak_planks' || lower === 'oak_slab' || lower === 'oak_fence') return 'oak_planks';
  if (lower === 'gold_block') return 'gold_block';
  if (lower === 'emerald_block') return 'emerald_block';
  if (lower === 'ladder') return 'ladder';
  if (lower === 'iron_bars') return 'iron_bars';
  if (lower === 'grass_block') return 'grass_block_top';
  if (lower === 'dirt_path' || lower === 'grass_path') return 'dirt_path_top';
  if (lower === 'podzol') return 'podzol_top';
  if (lower === 'mycelium') return 'mycelium_top';
  if (lower === 'honey_block') return 'honey_block_side';
  if (lower === 'honeycomb_block') return 'honeycomb_block';
  if (lower === 'chain') return 'iron_chain';
  if (lower === 'wall_torch') return 'torch';
  if (lower === 'soul_wall_torch') return 'soul_torch';
  if (lower === 'redstone_wall_torch') return 'redstone_torch';
  if (lower === 'tall_grass') return 'tall_grass_bottom';
  if (lower === 'large_fern') return 'large_fern_bottom';

  // 2. Anvils
  if (lower === 'anvil' || lower === 'chipped_anvil' || lower === 'damaged_anvil') {
    return lower === 'anvil' ? 'anvil_top' : `${lower}_top`;
  }

  // 3. Bricks / Tiles pluralization dictionary
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

  // 4. Slabs (_slab)
  if (lower.endsWith('_slab')) {
    const base = lower.replace(/_slab$/, '');
    if (base === 'smooth_stone') return 'smooth_stone_slab_side';
    return mapBaseMaterial(base);
  }

  // 5. Stairs (_stairs)
  if (lower.endsWith('_stairs')) {
    const base = lower.replace(/_stairs$/, '');
    return mapBaseMaterial(base);
  }

  // 6. Fences (_fence) & Fence Gates (_fence_gate)
  if (lower.endsWith('_fence')) {
    const base = lower.replace(/_fence$/, '');
    if (base === 'nether_brick') return 'nether_bricks';
    return mapBaseMaterial(base);
  }
  if (lower.endsWith('_fence_gate')) {
    const base = lower.replace(/_fence_gate$/, '');
    return mapBaseMaterial(base);
  }

  // 7. Walls (_wall)
  if (lower.endsWith('_wall')) {
    const base = lower.replace(/_wall$/, '');
    return mapBaseMaterial(base);
  }

  // 8. Pressure Plates & Buttons
  if (lower.endsWith('_pressure_plate')) {
    const base = lower.replace(/_pressure_plate$/, '');
    return mapBaseMaterial(base);
  }
  if (lower.endsWith('_button')) {
    const base = lower.replace(/_button$/, '');
    return mapBaseMaterial(base);
  }

  // 9. Trapdoors & Doors
  if (lower.endsWith('_trapdoor')) {
    const base = lower.replace(/_trapdoor$/, '');
    return `${base}_trapdoor`;
  }
  if (lower === 'trapdoor') return 'oak_trapdoor';

  // 10. Carpets
  if (lower.endsWith('_carpet')) {
    const base = lower.replace(/_carpet$/, '');
    return `${base}_wool`;
  }
  if (lower === 'carpet') return 'white_wool';

  // 11. Glass Panes
  if (lower.endsWith('_pane')) {
    const base = lower.replace(/_pane$/, '');
    if (base === 'iron') return 'iron_bars';
    return base.endsWith('_glass') ? base : `${base}_glass`;
  }

  // 12. Sandstones
  if (lower === 'sandstone') return 'sandstone';
  if (lower === 'red_sandstone') return 'red_sandstone';
  if (lower === 'cut_sandstone') return 'cut_sandstone';
  if (lower === 'cut_red_sandstone') return 'cut_red_sandstone';
  if (lower === 'smooth_sandstone') return 'sandstone_top';
  if (lower === 'smooth_red_sandstone') return 'red_sandstone_top';

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
export function getMinecraftBlockMaterial(
  blockType: string
): THREE.Material | THREE.Material[] {
  const raw = sanitizeTextureName(blockType);

  const cachedMat = materialCache.get(raw);
  if (cachedMat) {
    return cachedMat;
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

  // 15. Laub (_leaves), vine und lily_pad
  const isFoliage =
    raw.includes('leaves') || raw === 'vine' || raw === 'lily_pad';

  if (isFoliage) {
    const tex = getMinecraftTexture(raw);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: new THREE.Color(BIOME_FOLIAGE_TINT),
      transparent: true,
      alphaTest: 0.5,
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
  const resolvedTexName = resolveTextureNameForBlock(raw);
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
