import * as THREE from 'three';
import { JLModule, VoxelBlock } from '@/types/jumpleague';
import {
  McmetaData,
  buildMergedModuleGeometry,
  getAtlasMaterial,
  getTranslucentAtlasMaterial,
  MergedModuleGeometryResult,
} from '@/lib/mcmetaLoader';

/**
 * Checks if a module still requires automated naming.
 * Returns true if name is missing, equals ID/shortCode, is a placeholder (e.g. "Modul 123", "E1", "Parkour"),
 * or contains generic forbidden words.
 */
export function needsAutoNaming(
  module?: { name?: string; id?: string; shortCode?: string } | null
): boolean {
  if (!module) return false;
  const rawName = (module.name || '').trim();
  if (!rawName) return true;

  const cleanName = rawName.toLowerCase();
  const cleanId = (module.id || '').toLowerCase().replace(/^#+/, '').trim();
  const cleanShort = (module.shortCode || '').toLowerCase().replace(/^#+/, '').trim();

  // 1. If name is just the ID or shortCode (e.g. "E1", "E11", "1001", "#1001")
  if (cleanId && (cleanName === cleanId || cleanName === `#${cleanId}`)) return true;
  if (cleanShort && (cleanName === cleanShort || cleanName === `#${cleanShort}`)) return true;

  // 2. If name is formatted like "Modul 123", "Module E1", "Modul #456"
  if (/^(modul|module)\s*#?[a-z0-9_-]+$/i.test(rawName)) return true;

  // 3. If name is only digits or short technical alphanumeric string like "1001" or "E-11"
  if (/^[a-z0-9_-]{1,6}$/i.test(rawName)) return true;

  // 4. Old placeholder names & generic fallback names that need true AI Vision recognition
  const genericPlaceholders = [
    'parkour',
    'sprung',
    'pfad',
    'gipfel',
    'unbenannt',
    'unnamed',
    'modul',
    'module',
    'litematica modul',
    'litematica',
    'schematic',
    'nbt modul',
    'default',
    // Fallback heuristic names from previous run:
    'abenteuer insel',
    'kirschblüten pagode',
    'kirschblüten schrein',
    'karmesin wald',
    'basalt delta',
    'vulkan festung',
    'nether festung',
    'wirrwald insel',
    'korallen riff',
    'atlantis turm',
    'ozean tempel',
    'wüsten obelisk',
    'mesa canyon',
    'wüsten oase',
    'frost nadel',
    'eis gletscher',
    'end schiff',
    'end stadt',
    'kristall höhle',
    'industrie kran',
    'steampunk fabrik',
    'goldener bienenstock',
    'schleim grotte',
    'pilz insel',
    'magie turm',
    'alte bibliothek',
    'mangroven sumpf',
    'bambus tempel',
    'dschungel baumhaus',
    'dschungel ruine',
    'finsterwald anwesen',
    'alte windmühle',
    'historischer bauernhof',
    'kerker turm',
    'burg mauer',
    'ritter burg',
    'ausguck turm',
    'holzfäller hütte',
    'himmels turm',
    'hänge brücke',
  ];
  if (genericPlaceholders.some((ph) => cleanName === ph || cleanName.startsWith(ph + ' '))) {
    return true;
  }

  return false;
}

/**
 * Extracts a ranked list of the most frequent block types in the module (excluding air & invisible blocks).
 */
export function getFrequentBlockNames(blocks?: VoxelBlock[] | null): string[] {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return [];
  const counts = new Map<string, number>();

  for (const b of blocks) {
    if (!b) continue;
    const raw = String(b.type || '');
    if (!raw) continue;
    const clean = raw.toLowerCase().replace(/^minecraft:/, '').split('[')[0].trim();
    if (
      clean === 'air' ||
      clean === 'cave_air' ||
      clean === 'void_air' ||
      clean === 'structure_void' ||
      clean === 'barrier' ||
      clean === 'light'
    ) {
      continue;
    }
    counts.set(clean, (counts.get(clean) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);
}

export interface CaptureCompositeOptions {
  blocks?: VoxelBlock[];
  mergedResult?: MergedModuleGeometryResult | null;
  mcmeta: McmetaData;
  existingGl?: THREE.WebGLRenderer;
  existingScene?: THREE.Scene;
  userCamera?: THREE.Camera;
}

export interface MultiAngleCaptureResult {
  compositeDataUrl: string;
  thumbnailDataUrl: string;
}

// Singleton offscreen renderer to avoid creating excess WebGL contexts
let singletonOffscreenCanvas: HTMLCanvasElement | null = null;
let singletonOffscreenRenderer: THREE.WebGLRenderer | null = null;

function getOffscreenRenderer(): {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
} {
  if (!singletonOffscreenCanvas || !singletonOffscreenRenderer) {
    singletonOffscreenCanvas = document.createElement('canvas');
    singletonOffscreenCanvas.width = 400;
    singletonOffscreenCanvas.height = 400;
    singletonOffscreenRenderer = new THREE.WebGLRenderer({
      canvas: singletonOffscreenCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    singletonOffscreenRenderer.setSize(400, 400, false);
    singletonOffscreenRenderer.setPixelRatio(1);
  }
  return { renderer: singletonOffscreenRenderer, canvas: singletonOffscreenCanvas };
}

/**
 * Captures 4 comprehensive angles of a module into a single 2x2 800x800 composite image for Vision-AI
 * and exports Angle 1 (Vorne-Rechts Isometrisch) as a crisp thumbnail for module cards.
 */
export async function captureMultiAngleComposite(
  options: CaptureCompositeOptions
): Promise<MultiAngleCaptureResult | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const { blocks, mcmeta, existingGl, existingScene, userCamera } = options;
  let mergedResult = options.mergedResult;
  let createdMergedResult = false;

  // 1. Build geometry if not provided
  if (!mergedResult) {
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return null;
    }
    mergedResult = buildMergedModuleGeometry(blocks, mcmeta);
    createdMergedResult = true;
  }

  if (!mergedResult?.opaqueGeometry && !mergedResult?.translucentGeometry) {
    return null;
  }

  // 2. Prepare 3D Scene with isolated module meshes and crisp studio lighting
  const captureScene = new THREE.Scene();
  const moduleGroup = new THREE.Group();

  if (mergedResult.opaqueGeometry) {
    const opaqueMesh = new THREE.Mesh(
      mergedResult.opaqueGeometry,
      getAtlasMaterial(mcmeta.atlasTexture)
    );
    moduleGroup.add(opaqueMesh);
  }

  if (mergedResult.translucentGeometry) {
    const transMesh = new THREE.Mesh(
      mergedResult.translucentGeometry,
      getTranslucentAtlasMaterial(mcmeta.atlasTexture)
    );
    moduleGroup.add(transMesh);
  }

  captureScene.add(moduleGroup);

  // Directional + Ambient Lighting for clear voxel visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  captureScene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(40, 80, 50);
  captureScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-40, -20, -50);
  captureScene.add(fillLight);

  // 3. Compute Bounding Box, Center and Camera Distance
  const box = new THREE.Box3().setFromObject(moduleGroup);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 1.25;

  // 4. Temporary Perspective Camera
  const tempCam = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  // 4 Fixed Camera Angles specified in requirements
  const angles: {
    label: string;
    pos: [number, number, number];
    gridX: number;
    gridY: number;
  }[] = [
    {
      label: 'Vorne-Schraeg',
      pos: [center.x + dist, center.y + dist * 0.65, center.z + dist],
      gridX: 0,
      gridY: 0,
    },
    {
      label: 'Hinten-Schraeg',
      pos: [center.x - dist, center.y + dist * 0.65, center.z - dist],
      gridX: 400,
      gridY: 0,
    },
    {
      label: 'Seite',
      pos: [center.x + dist * 1.2, center.y + dist * 0.2, center.z],
      gridX: 0,
      gridY: 400,
    },
    {
      label: 'Oben',
      pos: [center.x, center.y + dist * 1.6, center.z + 0.01],
      gridX: 400,
      gridY: 400,
    },
  ];

  // 5. 2D Collage Canvas (800x800)
  const collageCanvas = document.createElement('canvas');
  collageCanvas.width = 800;
  collageCanvas.height = 800;
  const ctx = collageCanvas.getContext('2d');
  if (!ctx) return null;

  // Dark slate background for high-contrast Vision AI recognition
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 800, 800);

  const { renderer, canvas: offscreenCanvas } = getOffscreenRenderer();
  let thumbnailDataUrl = '';

  try {
    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];

      tempCam.position.set(angle.pos[0], angle.pos[1], angle.pos[2]);
      tempCam.lookAt(center);
      tempCam.updateMatrixWorld(true);
      tempCam.updateProjectionMatrix();

      // Render view 1 with transparent clearColor for alpha-transparent card thumbnail
      if (i === 0) {
        renderer.setClearColor(0x000000, 0);
        renderer.render(captureScene, tempCam);
        thumbnailDataUrl = offscreenCanvas.toDataURL('image/webp', 0.85);

        // Re-render onto dark background for collage quadrant
        renderer.setClearColor(0x0f172a, 1);
        renderer.render(captureScene, tempCam);
      } else {
        renderer.setClearColor(0x0f172a, 1);
        renderer.render(captureScene, tempCam);
      }

      // Draw onto 800x800 2x2 collage
      ctx.drawImage(offscreenCanvas, angle.gridX, angle.gridY, 400, 400);

      // Perspective label pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(angle.gridX + 10, angle.gridY + 10, 130, 26);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(angle.gridX + 10, angle.gridY + 10, 130, 26);

      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${i + 1}. ${angle.label}`, angle.gridX + 18, angle.gridY + 27);
    }

    // 2x2 Collage grid dividing cross lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 800);
    ctx.moveTo(0, 400);
    ctx.lineTo(800, 400);
    ctx.stroke();

    const compositeDataUrl = collageCanvas.toDataURL('image/webp', 0.8);

    // If an existing visible scene & user camera were supplied, re-render immediately
    // so no visible flicker occurs for the user!
    if (existingGl && existingScene && userCamera) {
      try {
        existingGl.render(existingScene, userCamera);
      } catch {
        // Ignore in case existingGl is busy
      }
    }

    return {
      compositeDataUrl,
      thumbnailDataUrl,
    };
  } finally {
    // Clean up temporary scene elements
    captureScene.clear();
    moduleGroup.clear();

    if (createdMergedResult && mergedResult) {
      mergedResult.opaqueGeometry?.dispose();
      mergedResult.translucentGeometry?.dispose();
    }
  }
}
