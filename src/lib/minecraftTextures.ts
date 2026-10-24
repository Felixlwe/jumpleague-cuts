import * as THREE from 'three';
import { useEffect, useState } from 'react';

/**
 * GitHub CDN base repository for official Minecraft 1.20.1 block textures
 */
export const MINECRAFT_CDN_BASE =
  'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/';

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
 * If not, falls back automatically to the official Minecraft 1.20.1 GitHub CDN.
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
    // Probing local file failed, proceed to GitHub CDN
  }

  resolvedUrlCache.set(cleanName, cdnUrl);
  return cdnUrl;
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
 * Loads a real 16x16 Minecraft texture as THREE.Texture with:
 * - magFilter = THREE.NearestFilter
 * - minFilter = THREE.NearestFilter
 * - colorSpace = THREE.SRGBColorSpace
 * Caches loaded textures in memory.
 */
export function getMinecraftTexture(textureName: string): THREE.Texture {
  const cleanName = sanitizeTextureName(textureName);

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

      img.onload = () => {
        texture.image = img;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        notifyTextureLoaded();
      };

      img.onerror = () => {
        const cdnUrl = `${MINECRAFT_CDN_BASE}${cleanName}.png`;
        if (img.src !== cdnUrl) {
          img.src = cdnUrl;
        } else {
          console.warn(`[MinecraftTextures] Could not load texture: ${cleanName}`);
        }
      };

      img.src = url;
    });
  }

  return texture;
}

/**
 * Resolves standard Minecraft block names to their main texture filename
 */
export function resolveTextureNameForBlock(blockType: string): string {
  const lower = sanitizeTextureName(blockType);

  if (lower === 'stone_bricks') return 'stone_bricks';
  if (lower === 'oak_planks' || lower === 'oak_slab' || lower === 'oak_fence') return 'oak_planks';
  if (lower === 'gold_block') return 'gold_block';
  if (lower === 'emerald_block') return 'emerald_block';
  if (lower === 'ladder') return 'ladder';
  if (lower === 'iron_bars') return 'iron_bars';
  if (lower === 'grass_block') return 'grass_block_top';

  if (lower.endsWith('_slab')) {
    const base = lower.replace(/_slab$/, '');
    if (base === 'stone_brick') return 'stone_bricks';
    return base.endsWith('planks') ? base : `${base}_planks`;
  }

  if (lower.endsWith('_stairs')) {
    const base = lower.replace(/_stairs$/, '');
    if (base === 'stone_brick') return 'stone_bricks';
    if (base === 'cobblestone' || base === 'stone') return base;
    return base.endsWith('planks') ? base : `${base}_planks`;
  }

  if (lower.endsWith('_fence')) {
    const base = lower.replace(/_fence$/, '');
    return base.endsWith('planks') ? base : `${base}_planks`;
  }

  if (lower.endsWith('_wall')) {
    const base = lower.replace(/_wall$/, '');
    if (base === 'stone_brick') return 'stone_bricks';
    return base;
  }

  if (lower.endsWith('_carpet')) {
    const base = lower.replace(/_carpet$/, '');
    return `${base}_wool`;
  }
  if (lower === 'carpet') return 'white_wool';

  if (lower.endsWith('_pressure_plate')) {
    const base = lower.replace(/_pressure_plate$/, '');
    if (
      base === 'oak' ||
      base === 'spruce' ||
      base === 'birch' ||
      base === 'jungle' ||
      base === 'acacia' ||
      base === 'dark_oak' ||
      base === 'mangrove' ||
      base === 'cherry'
    ) {
      return `${base}_planks`;
    }
    return base;
  }

  if (lower.endsWith('_pane')) {
    const base = lower.replace(/_pane$/, '');
    return base === 'iron' ? 'iron_bars' : `${base}_glass`;
  }

  return lower;
}

/**
 * Multi-Face & Biome-Tint Material Resolver:
 * - grass_block: oben grass_block_top (mit grünem Farb-Tint #7cbd6b), unten dirt, seitlich grass_block_side
 * - Laub (_leaves), vine und lily_pad: grüner Tint #7cbd6b, transparent: true, alphaTest: 0.5
 * - Baumstämme (_log) und Säulen: oben/unten _top, Seiten _side (bzw. Basistextur)
 * - Glas, Leitern, Zäune und Spinnenweben: transparent: true, alphaTest: 0.1
 */
export function getMinecraftBlockMaterial(
  blockType: string
): THREE.Material | THREE.Material[] {
  const raw = sanitizeTextureName(blockType);

  const cachedMat = materialCache.get(raw);
  if (cachedMat) {
    return cachedMat;
  }

  // 1. grass_block (Multi-Face with Biome Tint on Top Face)
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

    // BoxGeometry face groups:
    // 0: +X (Right), 1: -X (Left), 2: +Y (Top), 3: -Y (Bottom), 4: +Z (Front), 5: -Z (Back)
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

  // 2. Baumstämme (_log) und Säulen (Multi-Face with _top and sides)
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

  // 3. Laub (_leaves), vine und lily_pad (Biome-Tint #7cbd6b & transparent: true, alphaTest: 0.5)
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

  // 4. Glas, Leitern, Zäune, Spinnenweben, Falltüren und Scheiben (transparent: true, alphaTest: 0.1)
  const isGlass = raw.includes('glass');
  const isLadder = raw.includes('ladder');
  const isFence = raw.includes('fence');
  const isCobweb = raw.includes('cobweb') || raw === 'web';
  const isIronBars = raw.includes('iron_bars') || raw === 'bars';
  const isTrapdoor = raw.includes('trapdoor');
  const isPane = raw.includes('pane');

  if (
    isGlass ||
    isLadder ||
    isFence ||
    isCobweb ||
    isIronBars ||
    isTrapdoor ||
    isPane
  ) {
    let texName = raw;
    if (isLadder) texName = 'ladder';
    else if (isCobweb) texName = 'cobweb';
    else if (isIronBars) texName = 'iron_bars';
    else if (isTrapdoor) {
      texName = raw === 'trapdoor' ? 'oak_trapdoor' : raw;
    } else if (isPane) {
      texName = raw.includes('iron') ? 'iron_bars' : 'glass';
    } else if (isFence) {
      if (raw === 'oak_fence' || raw === 'fence') texName = 'oak_planks';
      else if (raw.endsWith('_fence')) {
        const base = raw.replace(/_fence$/, '');
        texName = base.endsWith('planks') ? base : `${base}_planks`;
      } else {
        texName = 'oak_planks';
      }
    }

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

  // 5. Slabs (Stufen)
  if (raw.endsWith('_slab')) {
    let texName = 'oak_planks';
    if (raw === 'oak_slab' || raw === 'slab') texName = 'oak_planks';
    else if (raw === 'stone_brick_slab') texName = 'stone_bricks';
    else {
      const base = raw.replace(/_slab$/, '');
      texName = base.endsWith('planks') ? base : `${base}_planks`;
    }

    const tex = getMinecraftTexture(texName);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.8,
      metalness: 0.05,
    });
    materialCache.set(raw, mat);
    return mat;
  }

  // 6. Tactical High-Value Blocks (Gold & Emerald)
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

  // 7. Standard Minecraft Solid Blocks
  const texName = resolveTextureNameForBlock(raw);
  const tex = getMinecraftTexture(texName);
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
