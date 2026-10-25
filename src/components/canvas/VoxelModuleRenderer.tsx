'use client';

import React, {
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { ThreeEvent, useThree, useFrame } from '@react-three/fiber';
import { VoxelBlock, Vector3D, JLModule } from '@/types/jumpleague';
import { useJLStore } from '@/store/useJLStore';
import { VOXEL_BLOCK_LABELS } from '@/constants/jumpleagueConfig';
import { WorldHtml } from '@/components/three/WorldHtml';
import { DraggableMidPoint } from '@/components/three/DraggableMidPoint';
import {
  useMcmeta,
  buildMergedModuleGeometry,
  getAtlasMaterial,
  getTranslucentAtlasMaterial,
} from '@/lib/mcmetaLoader';

/**
 * Calculates optimal camera position and look target to frame the entire module
 * based on its real block bounding box and JumpLeague parkour progression (+Z axis).
 */
export function getModuleOverviewCamera(module: JLModule | null): {
  position: THREE.Vector3;
  target: THREE.Vector3;
  hasBlocks: boolean;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let hasBlocks = false;

  const blocks = module?.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    for (const b of blocks) {
      const x = Number(b.position?.x ?? (b as unknown as { x?: number }).x);
      const y = Number(b.position?.y ?? (b as unknown as { y?: number }).y);
      const z = Number(b.position?.z ?? (b as unknown as { z?: number }).z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      hasBlocks = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  // Fallback if module blocks are not loaded yet
  if (!hasBlocks) {
    minX = -6;
    maxX = 6;
    minY = 1;
    maxY = 16;
    minZ = 0;
    maxZ = 32;
  }

  const spanX = Math.max(1, maxX - minX + 1);
  const spanY = Math.max(1, maxY - minY + 1);
  const spanZ = Math.max(1, maxZ - minZ + 1);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  // Center target, slightly lowered so bottom blocks have comfortable vertical clearance
  const target = new THREE.Vector3(centerX, centerY - spanY * 0.05, centerZ);

  // Bounding radius to frame the entire module
  const radius = Math.sqrt(
    Math.pow(spanX / 2, 2) +
    Math.pow(spanY / 2, 2) +
    Math.pow(spanZ / 2, 2)
  );

  // Perspective camera with FOV 46 degrees (half angle = 23 deg = 0.4014 rad)
  const fovRad = (46 * Math.PI) / 180;
  const requiredDistance = Math.max(
    (radius / Math.sin(fovRad / 2)) * 1.05,
    28
  );

  // Oblique 3/4 perspective looking along course progression from spawn (-Z) to finish (+Z):
  // Offset to +X (isometric side), +Y (elevated angle), -Z (in front of spawn)
  const viewDir = new THREE.Vector3(0.55, 0.45, -0.7).normalize();
  const position = target.clone().addScaledVector(viewDir, requiredDistance);

  return { position, target, hasBlocks };
}

/**
 * Sets camera position and orientation using strict 'YXZ' Euler angles.
 * Prevents Euler roll corruption, flips, and gimbal jumps from standard camera.lookAt().
 */
export function applyCameraLookAt(
  camera: THREE.Camera,
  pos: THREE.Vector3,
  target: THREE.Vector3
): { yaw: number; pitch: number } {
  const dir = new THREE.Vector3().subVectors(target, pos).normalize();
  if (dir.lengthSq() < 0.0001) {
    dir.set(0, 0, -1);
  }

  // Pitch clamped to [-88.5°, +88.5°] to prevent gimbal flip
  const maxPitch = (88.5 * Math.PI) / 180;
  const rawPitch = Math.asin(Math.max(-0.9999, Math.min(0.9999, dir.y)));
  const pitch = Math.max(-maxPitch, Math.min(maxPitch, rawPitch));

  let yaw = Math.atan2(-dir.x, -dir.z);
  if (!Number.isFinite(yaw)) yaw = 0;

  camera.position.copy(pos);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(pitch, yaw, 0);

  return { yaw, pitch };
}

/**
 * Minecraft Spectator Flight Controller (FlyControls):
 * - W / S: Fly forward / backward in camera's horizontal XZ direction
 * - A / D: Strafe left / right on horizontal XZ plane
 * - Space: Ascend (+Y)
 * - Shift: Descend (-Y)
 * - Ctrl: Speed boost (2x speed while held)
 * - Right-Click Hold: Free-look rotation (yaw / pitch) with pointer lock & fallback
 * - Mouse Wheel: Smooth zoom / step along view vector
 * - Smooth transition when selecting cuts or switching modules
 * - Synchronizes liveCameraPosition & liveCameraTarget (8 blocks ahead)
 */
const MinecraftSpectatorControls: React.FC = () => {
  const { camera, gl } = useThree();

  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const cameraResetCounter = useJLStore((s) => s.cameraResetCounter);
  const cuts = useJLStore((s) => s.cuts);
  const modules = useJLStore((s) => s.modules);
  const isDraggingInScene = useJLStore((s) => s.isDraggingInScene);
  const setLiveCameraState = useJLStore((s) => s.setLiveCameraState);

  // Active module lookup
  const currentModule = useMemo(() => {
    if (!selectedModuleId) return null;
    const cleanTarget = selectedModuleId.trim().toLowerCase().replace(/^#+/, '');
    return (
      modules.find((m) => {
        const mId = m.id.toLowerCase().replace(/^#+/, '');
        const mShort = (m.shortCode || '').toLowerCase().replace(/^#+/, '');
        return mId === cleanTarget || mShort === cleanTarget;
      }) ?? null
    );
  }, [modules, selectedModuleId]);

  // Camera angles in radians
  const yawRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);

  // Mouse interaction state
  const isRightMouseDown = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pressed keys tracking
  const keysPressed = useRef<Set<string>>(new Set());

  // Has user manually moved the camera (via keys, mouse drag, or scroll wheel)?
  const userHasInteractedRef = useRef<boolean>(false);

  // Has camera been framed for real loaded blocks on initial mount?
  const hasFramedBlocksRef = useRef<boolean>(false);

  // Previous tracking to detect state changes
  const prevModuleIdRef = useRef<string | null>(null);
  const prevCutIdRef = useRef<string | null>(null);
  const prevResetCounterRef = useRef<number>(cameraResetCounter);
  const prevBlockCountRef = useRef<number>(0);

  // Camera glide / transition state
  const transitionRef = useRef<{
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startLookAt: THREE.Vector3;
    endLookAt: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);

  // Throttled live camera state tracking
  const lastSyncedPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const lastSyncedTarget = useRef<THREE.Vector3>(new THREE.Vector3());

  // Helper to trigger a smooth camera glide to a new position & look target
  const startTransition = useCallback(
    (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 0.45) => {
      const currentPos = camera.position.clone();
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const currentLookAt = currentPos.clone().add(forward.multiplyScalar(8));

      transitionRef.current = {
        startPos: currentPos,
        endPos: targetPos.clone(),
        startLookAt: currentLookAt,
        endLookAt: targetLookAt.clone(),
        startTime: performance.now(),
        duration: duration * 1000,
      };
    },
    [camera]
  );

  // Camera framing effect: manages initial mount, cut selection, reset, and async block loading
  useEffect(() => {
    const isNewModule = prevModuleIdRef.current !== selectedModuleId;
    const isCutChanged = prevCutIdRef.current !== selectedCutId;
    const isResetClicked = prevResetCounterRef.current !== cameraResetCounter;

    const blockCount = currentModule?.blocks?.length ?? 0;
    const blocksJustLoaded = prevBlockCountRef.current === 0 && blockCount > 0;

    prevModuleIdRef.current = selectedModuleId;
    prevCutIdRef.current = selectedCutId;
    prevResetCounterRef.current = cameraResetCounter;
    prevBlockCountRef.current = blockCount;

    if (isNewModule || isResetClicked) {
      userHasInteractedRef.current = false;
      hasFramedBlocksRef.current = false;
    }

    // Determine intended target
    let targetPos: THREE.Vector3 | null = null;
    let targetLookAt: THREE.Vector3 | null = null;

    if (selectedCutId) {
      const cut = cuts.find((c) => c.id === selectedCutId);
      if (cut && cut.cameraPosition && cut.cameraTarget) {
        targetPos = new THREE.Vector3(
          cut.cameraPosition.x,
          cut.cameraPosition.y,
          cut.cameraPosition.z
        );
        targetLookAt = new THREE.Vector3(
          cut.cameraTarget.x,
          cut.cameraTarget.y,
          cut.cameraTarget.z
        );
      }
    }

    if (!targetPos || !targetLookAt) {
      const overview = getModuleOverviewCamera(currentModule);
      targetPos = overview.position;
      targetLookAt = overview.target;
    }

    const isInitial = !hasFramedBlocksRef.current;

    // A) If cut, module, or reset button changed
    if (isCutChanged || isResetClicked || isNewModule) {
      if (isInitial && blockCount === 0 && !selectedCutId) {
        // Initial placement with placeholder bounds
        const { yaw, pitch } = applyCameraLookAt(camera, targetPos, targetLookAt);
        yawRef.current = yaw;
        pitchRef.current = pitch;
      } else if (isInitial && (blockCount > 0 || selectedCutId)) {
        // Initial placement directly on real module bounds or cut
        hasFramedBlocksRef.current = true;
        const { yaw, pitch } = applyCameraLookAt(camera, targetPos, targetLookAt);
        yawRef.current = yaw;
        pitchRef.current = pitch;
      } else {
        startTransition(targetPos, targetLookAt, 0.45);
      }
      return;
    }

    // B) If module blocks just arrived asynchronously and user has not started flying away
    if (blocksJustLoaded && !selectedCutId && !userHasInteractedRef.current) {
      hasFramedBlocksRef.current = true;
      if (isInitial) {
        const { yaw, pitch } = applyCameraLookAt(camera, targetPos, targetLookAt);
        yawRef.current = yaw;
        pitchRef.current = pitch;
      } else {
        startTransition(targetPos, targetLookAt, 0.45);
      }
    }
  }, [
    selectedModuleId,
    selectedCutId,
    cameraResetCounter,
    currentModule,
    cuts,
    camera,
    startTransition,
  ]);

  // Input event listeners (keyboard, right-click look, wheel, pointer lock)
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    camera.rotation.order = 'YXZ';

    const isTyping = () => {
      if (typeof document === 'undefined') return false;
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toUpperCase();
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) {
        keysPressed.current.clear();
        return;
      }

      // Prevent Space from scrolling webpage down
      if (e.code === 'Space') {
        e.preventDefault();
      }

      keysPressed.current.add(e.code);
      if (e.ctrlKey) keysPressed.current.add('Control');
      if (e.shiftKey) keysPressed.current.add('Shift');

      // If user starts manual flight keys, cancel smooth transition
      if (
        [
          'KeyW',
          'KeyS',
          'KeyA',
          'KeyD',
          'Space',
          'ShiftLeft',
          'ShiftRight',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.code)
      ) {
        userHasInteractedRef.current = true;
        transitionRef.current = null;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
      if (!e.ctrlKey) {
        keysPressed.current.delete('Control');
        keysPressed.current.delete('ControlLeft');
        keysPressed.current.delete('ControlRight');
      }
      if (!e.shiftKey) {
        keysPressed.current.delete('Shift');
        keysPressed.current.delete('ShiftLeft');
        keysPressed.current.delete('ShiftRight');
      }
    };

    const handleBlur = () => {
      keysPressed.current.clear();
      isRightMouseDown.current = false;
      if (
        typeof document !== 'undefined' &&
        document.pointerLockElement === canvas
      ) {
        document.exitPointerLock?.();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        // Right click down: initiate free-look
        userHasInteractedRef.current = true;
        transitionRef.current = null;
        isRightMouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        try {
          if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
          }
        } catch {
          // Fallback via clientX/clientY delta handles rotation
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isRightMouseDown.current) return;

      let deltaX = 0;
      let deltaY = 0;

      if (
        typeof document !== 'undefined' &&
        document.pointerLockElement === canvas
      ) {
        deltaX = e.movementX || 0;
        deltaY = e.movementY || 0;
      } else {
        deltaX = e.clientX - lastMousePos.current.x;
        deltaY = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }

      const SENSITIVITY = 0.0022;
      yawRef.current -= deltaX * SENSITIVITY;
      pitchRef.current -= deltaY * SENSITIVITY;

      // Clamp pitch between -89° and +89° in radians to prevent gimbal flip
      const maxPitch = (89 * Math.PI) / 180;
      pitchRef.current = Math.max(
        -maxPitch,
        Math.min(maxPitch, pitchRef.current)
      );

      camera.rotation.order = 'YXZ';
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;
      camera.rotation.z = 0;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDown.current = false;
        if (
          typeof document !== 'undefined' &&
          document.pointerLockElement === canvas
        ) {
          document.exitPointerLock?.();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      userHasInteractedRef.current = true;
      transitionRef.current = null;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const step = -Math.sign(e.deltaY) * 1.5;
      camera.position.addScaledVector(forward, step);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      if (
        typeof document !== 'undefined' &&
        document.pointerLockElement === canvas
      ) {
        document.exitPointerLock?.();
      }
    };
  }, [camera, gl.domElement]);

  // Main 60/120 FPS flight update loop
  useFrame((_, delta) => {
    if (isDraggingInScene) return;

    // 1. Smooth Glide Transition
    if (transitionRef.current) {
      const {
        startPos,
        endPos,
        startLookAt,
        endLookAt,
        startTime,
        duration,
      } = transitionRef.current;
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic for smooth deceleration
      const ease = 1 - Math.pow(1 - t, 3);

      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, ease);
      const currentLook = new THREE.Vector3().lerpVectors(
        startLookAt,
        endLookAt,
        ease
      );

      const { yaw, pitch } = applyCameraLookAt(camera, currentPos, currentLook);
      yawRef.current = yaw;
      pitchRef.current = pitch;

      if (t >= 1) {
        transitionRef.current = null;
        const final = applyCameraLookAt(camera, endPos, endLookAt);
        yawRef.current = final.yaw;
        pitchRef.current = final.pitch;
      }
    } else {
      // 2. Flight Movement based on keys
      const keys = keysPressed.current;
      if (keys.size > 0) {
        const isBoost =
          keys.has('ControlLeft') ||
          keys.has('ControlRight') ||
          keys.has('Control') ||
          keys.has('control');
        const speed = (isBoost ? 30.0 : 14.0) * Math.min(delta, 0.1);

        const yaw = yawRef.current;
        const forwardXZ = new THREE.Vector3(
          -Math.sin(yaw),
          0,
          -Math.cos(yaw)
        ).normalize();
        const rightXZ = new THREE.Vector3(
          Math.cos(yaw),
          0,
          -Math.sin(yaw)
        ).normalize();
        const up = new THREE.Vector3(0, 1, 0);

        const moveDir = new THREE.Vector3();

        if (keys.has('KeyW') || keys.has('ArrowUp')) moveDir.add(forwardXZ);
        if (keys.has('KeyS') || keys.has('ArrowDown')) moveDir.sub(forwardXZ);
        if (keys.has('KeyD') || keys.has('ArrowRight')) moveDir.add(rightXZ);
        if (keys.has('KeyA') || keys.has('ArrowLeft')) moveDir.sub(rightXZ);
        if (keys.has('Space')) moveDir.add(up);
        if (
          keys.has('ShiftLeft') ||
          keys.has('ShiftRight') ||
          keys.has('Shift')
        ) {
          moveDir.sub(up);
        }

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize().multiplyScalar(speed);
          camera.position.add(moveDir);
        }
      }
    }

    // 3. Keep live camera position & target (8 blocks ahead) synced for Cut-Editor & HUD
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const target = camera.position.clone().add(forward.multiplyScalar(8));

    if (
      camera.position.distanceToSquared(lastSyncedPos.current) > 0.001 ||
      target.distanceToSquared(lastSyncedTarget.current) > 0.001
    ) {
      lastSyncedPos.current.copy(camera.position);
      lastSyncedTarget.current.copy(target);
      setLiveCameraState(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: target.x, y: target.y, z: target.z }
      );
    }
  });

  return null;
};

export interface BlockHighlightBounds {
  size: [number, number, number];
  offset: [number, number, number];
}

/**
 * Calculates adaptive 3D outline box dimensions & center offset based on Minecraft block geometry.
 * Adapts to fences, walls, slabs, trapdoors, ladders, carpets, iron bars, glass panes, rods, etc.
 */
export function getBlockHighlightBounds(
  block?: VoxelBlock | null,
  blockMap?: Map<string, VoxelBlock>
): BlockHighlightBounds {
  if (!block) {
    return { size: [1.04, 1.04, 1.04], offset: [0, 0, 0] };
  }

  const rawType = (block.type || '').toLowerCase().replace(/^minecraft:/, '');
  const { x, y, z } = block.position;

  // Helper to check neighbor connection for fences/walls/bars/panes
  const canConnect = (neighbor?: VoxelBlock): boolean => {
    if (!neighbor) return false;
    const nType = (neighbor.type || '').toLowerCase().replace(/^minecraft:/, '');
    if (
      nType.includes('air') ||
      nType.includes('water') ||
      nType.includes('lava')
    ) {
      return false;
    }
    return true;
  };

  // 1. Fences (e.g. oak_fence, nether_brick_fence, fence_gate)
  if (rawType.includes('fence')) {
    const hasNorth =
      block.properties?.north === 'true' ||
      block.state?.north === 'true' ||
      canConnect(blockMap?.get(`${x},${y},${z - 1}`));
    const hasSouth =
      block.properties?.south === 'true' ||
      block.state?.south === 'true' ||
      canConnect(blockMap?.get(`${x},${y},${z + 1}`));
    const hasWest =
      block.properties?.west === 'true' ||
      block.state?.west === 'true' ||
      canConnect(blockMap?.get(`${x - 1},${y},${z}`));
    const hasEast =
      block.properties?.east === 'true' ||
      block.state?.east === 'true' ||
      canConnect(blockMap?.get(`${x + 1},${y},${z}`));

    const minX = hasWest ? -0.52 : -0.19;
    const maxX = hasEast ? 0.52 : 0.19;
    const minZ = hasNorth ? -0.52 : -0.19;
    const maxZ = hasSouth ? 0.52 : 0.19;

    return {
      size: [maxX - minX, 1.04, maxZ - minZ],
      offset: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
    };
  }

  // 2. Walls (e.g. cobblestone_wall, diorite_wall)
  if (rawType.includes('wall') && !rawType.includes('sign')) {
    const hasNorth = canConnect(blockMap?.get(`${x},${y},${z - 1}`));
    const hasSouth = canConnect(blockMap?.get(`${x},${y},${z + 1}`));
    const hasWest = canConnect(blockMap?.get(`${x - 1},${y},${z}`));
    const hasEast = canConnect(blockMap?.get(`${x + 1},${y},${z}`));

    const minX = hasWest ? -0.52 : -0.24;
    const maxX = hasEast ? 0.52 : 0.24;
    const minZ = hasNorth ? -0.52 : -0.24;
    const maxZ = hasSouth ? 0.52 : 0.24;

    return {
      size: [maxX - minX, 1.04, maxZ - minZ],
      offset: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
    };
  }

  // 3. Iron Bars & Glass Panes
  if (rawType.includes('bars') || rawType.includes('pane')) {
    const hasNorth = canConnect(blockMap?.get(`${x},${y},${z - 1}`));
    const hasSouth = canConnect(blockMap?.get(`${x},${y},${z + 1}`));
    const hasWest = canConnect(blockMap?.get(`${x - 1},${y},${z}`));
    const hasEast = canConnect(blockMap?.get(`${x + 1},${y},${z}`));

    const minX = hasWest ? -0.52 : -0.13;
    const maxX = hasEast ? 0.52 : 0.13;
    const minZ = hasNorth ? -0.52 : -0.13;
    const maxZ = hasSouth ? 0.52 : 0.13;

    return {
      size: [maxX - minX, 1.04, maxZ - minZ],
      offset: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
    };
  }

  // 4. Slabs (bottom vs top vs double)
  if (rawType.includes('slab')) {
    const slabType =
      block.slabType ||
      block.properties?.type ||
      block.state?.type ||
      'bottom';

    if (slabType === 'top') {
      return { size: [1.04, 0.52, 1.04], offset: [0, 0.25, 0] };
    }
    if (slabType === 'double') {
      return { size: [1.04, 1.04, 1.04], offset: [0, 0, 0] };
    }
    return { size: [1.04, 0.52, 1.04], offset: [0, -0.25, 0] };
  }

  // 5. Carpets & Snow layers
  if (rawType.includes('carpet') || rawType === 'snow' || rawType.includes('snow_layer')) {
    return { size: [1.04, 0.12, 1.04], offset: [0, -0.46, 0] };
  }

  // 6. Trapdoors
  if (rawType.includes('trapdoor')) {
    const isOpen =
      block.open ||
      block.properties?.open === 'true' ||
      block.state?.open === 'true';
    const facing =
      block.facing ||
      block.properties?.facing ||
      block.state?.facing ||
      'north';
    const half =
      block.half ||
      block.properties?.half ||
      block.state?.half ||
      'bottom';

    if (isOpen) {
      if (facing === 'north') return { size: [1.04, 1.04, 0.22], offset: [0, 0, -0.41] };
      if (facing === 'south') return { size: [1.04, 1.04, 0.22], offset: [0, 0, 0.41] };
      if (facing === 'west') return { size: [0.22, 1.04, 1.04], offset: [-0.41, 0, 0] };
      return { size: [0.22, 1.04, 1.04], offset: [0.41, 0, 0] };
    }

    if (half === 'top') {
      return { size: [1.04, 0.22, 1.04], offset: [0, 0.41, 0] };
    }
    return { size: [1.04, 0.22, 1.04], offset: [0, -0.41, 0] };
  }

  // 7. Ladders
  if (rawType.includes('ladder')) {
    const facing =
      block.facing ||
      block.properties?.facing ||
      block.state?.facing ||
      'north';
    if (facing === 'north') return { size: [0.96, 1.04, 0.18], offset: [0, 0, -0.42] };
    if (facing === 'south') return { size: [0.96, 1.04, 0.18], offset: [0, 0, 0.42] };
    if (facing === 'west') return { size: [0.18, 1.04, 0.96], offset: [-0.42, 0, 0] };
    if (facing === 'east') return { size: [0.18, 1.04, 0.96], offset: [0.42, 0, 0] };
    return { size: [0.96, 1.04, 0.22], offset: [0, 0, 0] };
  }

  // 8. Rods (End Rod, Lightning Rod)
  if (rawType.includes('rod')) {
    return { size: [0.28, 1.04, 0.28], offset: [0, 0, 0] };
  }

  // 9. Chains
  if (rawType.includes('chain')) {
    return { size: [0.26, 1.04, 0.26], offset: [0, 0, 0] };
  }

  // 10. Lanterns
  if (rawType.includes('lantern')) {
    const hanging =
      block.properties?.hanging === 'true' ||
      block.state?.hanging === 'true';
    return {
      size: [0.48, 0.68, 0.48],
      offset: [0, hanging ? 0.16 : -0.16, 0],
    };
  }

  // 11. Chests
  if (rawType.includes('chest')) {
    return { size: [0.92, 0.92, 0.92], offset: [0, -0.05, 0] };
  }

  // 12. Daylight Detectors
  if (rawType.includes('daylight_detector')) {
    return { size: [1.04, 0.42, 1.04], offset: [0, -0.30, 0] };
  }

  // 13. Beds
  if (rawType.includes('bed')) {
    return { size: [1.04, 0.60, 1.04], offset: [0, -0.22, 0] };
  }

  // 14. Anvils
  if (rawType.includes('anvil')) {
    return { size: [0.80, 1.02, 0.88], offset: [0, 0, 0] };
  }

  // 15. Cactus
  if (rawType.includes('cactus')) {
    return { size: [0.92, 1.04, 0.92], offset: [0, 0, 0] };
  }

  // 16. Flower Pots
  if (rawType.includes('pot')) {
    return { size: [0.48, 0.48, 0.48], offset: [0, -0.28, 0] };
  }

  // 17. Pressure Plates
  if (rawType.includes('pressure_plate')) {
    return { size: [0.86, 0.10, 0.86], offset: [0, -0.46, 0] };
  }

  // 18. Heads / Skulls
  if (rawType.includes('head') || rawType.includes('skull')) {
    return { size: [0.58, 0.58, 0.58], offset: [0, -0.22, 0] };
  }

  // 19. Torches / Candles
  if (rawType.includes('torch') || rawType.includes('candle')) {
    return { size: [0.26, 0.70, 0.26], offset: [0, -0.15, 0] };
  }

  // 20. Default standard full cube
  return { size: [1.04, 1.04, 1.04], offset: [0, 0, 0] };
}

/**
 * Main 3D Voxel Module Renderer:
 * Combines high-performance chunk-merged mesh rendering with Minecraft Spectator controls.
 */
export const VoxelModuleRenderer: React.FC = () => {
  const { gl } = useThree();
  const modules = useJLStore((s) => s.modules);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const cuts = useJLStore((s) => s.cuts);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const activeMode = useJLStore((s) => s.activeMode);
  const hoveredBlock = useJLStore((s) => s.hoveredBlock);
  const draftStartBlock = useJLStore((s) => s.draftStartBlock);
  const draftMidPoints = useJLStore((s) => s.draftMidPoints);
  const activeDraftMidPointIndex = useJLStore(
    (s) => s.activeDraftMidPointIndex
  );
  const draftEndBlock = useJLStore((s) => s.draftEndBlock);
  const setHoveredBlock = useJLStore((s) => s.setHoveredBlock);
  const pickBlockInScene = useJLStore((s) => s.pickBlockInScene);
  const setActiveDraftMidPointIndex = useJLStore(
    (s) => s.setActiveDraftMidPointIndex
  );
  const updateDraftMidPoint = useJLStore((s) => s.updateDraftMidPoint);
  const loadModuleBlocks = useJLStore((s) => s.loadModuleBlocks);
  const updateModuleThumbnail = useJLStore((s) => s.updateModuleThumbnail);

  const hasCapturedRef = useRef<Record<string, boolean>>({});

  const currentModule = useMemo(() => {
    if (!selectedModuleId) return null;
    const target = selectedModuleId.trim().toLowerCase();
    const cleanTarget = target.replace(/^#+/, '');
    return (
      modules.find((m) => {
        const mId = m.id.toLowerCase();
        const mClean = mId.replace(/^#+/, '');
        const mShort = (m.shortCode || '').toLowerCase().replace(/^#+/, '');
        return (
          mId === target ||
          mClean === cleanTarget ||
          mShort === cleanTarget ||
          mId === `#${cleanTarget}`
        );
      }) ?? null
    );
  }, [modules, selectedModuleId]);

  useEffect(() => {
    if (
      currentModule &&
      (!currentModule.blocks || currentModule.blocks.length === 0)
    ) {
      void loadModuleBlocks(currentModule.id);
    }
  }, [currentModule?.id, currentModule?.blocks?.length, loadModuleBlocks]);

  const selectedCut = useMemo(
    () => cuts.find((c) => c.id === selectedCutId) ?? null,
    [cuts, selectedCutId]
  );

  const isSubmitMode = activeMode === 'SUBMIT';
  const { mcmeta } = useMcmeta();

  const atlasMaterial = useMemo(() => {
    if (!mcmeta) return null;
    return getAtlasMaterial(mcmeta.atlasTexture);
  }, [mcmeta]);

  const translucentMaterial = useMemo(() => {
    if (!mcmeta) return null;
    return getTranslucentAtlasMaterial(mcmeta.atlasTexture);
  }, [mcmeta]);

  // Fast O(1) Spatial Map: "x,y,z" -> VoxelBlock
  const blockMap = useMemo(() => {
    const map = new Map<string, VoxelBlock>();
    if (!currentModule || !Array.isArray(currentModule.blocks)) return map;
    for (const b of currentModule.blocks) {
      map.set(`${b.position.x},${b.position.y},${b.position.z}`, b);
    }
    return map;
  }, [currentModule?.blocks]);

  // High-Performance Merged BufferGeometry: 1 Draw Call for opaque blocks + 1 Draw Call for translucent blocks
  const mergedResult = useMemo(() => {
    if (
      !mcmeta ||
      !currentModule ||
      !Array.isArray(currentModule.blocks) ||
      currentModule.blocks.length === 0
    ) {
      return null;
    }
    return buildMergedModuleGeometry(currentModule.blocks, mcmeta);
  }, [mcmeta, currentModule?.blocks]);

  // Auto-capture 3D screenshot once geometry is rendered if module has no thumbnail
  useEffect(() => {
    if (!currentModule || !mergedResult || currentModule.thumbnailUrl) return;
    if (hasCapturedRef.current[currentModule.id]) return;

    const timer = setTimeout(() => {
      try {
        if (!gl?.domElement) return;
        const dataUrl = gl.domElement.toDataURL('image/webp', 0.65);
        if (dataUrl && dataUrl.length > 100) {
          hasCapturedRef.current[currentModule.id] = true;
          void updateModuleThumbnail(currentModule.id, dataUrl);
        }
      } catch (err) {
        console.warn('[Screenshot] Auto-capture failed:', err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    currentModule?.id,
    currentModule?.thumbnailUrl,
    mergedResult,
    gl,
    updateModuleThumbnail,
  ]);

  // Omnidirectional Voxel Raycasting: determines the clicked/hovered voxel coordinate
  // from ANY side (Top, Bottom, North, South, East, West) or thin geometry (ladders, slabs, panes)
  const getVoxelCoordFromHit = useCallback(
    (e: ThreeEvent<any>): Vector3D | null => {
      if (!e.point) return null;

      const rayDir = e.ray?.direction;

      // 1. Primary Strategy: Penetrate forward along ray trajectory into the block
      // Moving in the direction the ray traveled from camera penetrates inside the hit block on any face!
      const testDeltas = [0.03, 0.06, 0.12, 0.2, -0.03];
      for (const delta of testDeltas) {
        const testPos = rayDir
          ? e.point.clone().addScaledVector(rayDir, delta)
          : e.point.clone();

        const bx = Math.round(testPos.x);
        const by = Math.round(testPos.y);
        const bz = Math.round(testPos.z);
        const key = `${bx},${by},${bz}`;
        if (blockMap.has(key)) {
          return { x: bx, y: by, z: bz };
        }
      }

      // 2. Normal-based penetration (inward normal towards block interior)
      if (e.face?.normal && rayDir) {
        const inwardNormal = e.face.normal.clone();
        // If normal points towards the camera, negate it so it penetrates into the block
        if (inwardNormal.dot(rayDir) < 0) {
          inwardNormal.negate();
        }
        const normalPos = e.point.clone().addScaledVector(inwardNormal, 0.05);
        const bx = Math.round(normalPos.x);
        const by = Math.round(normalPos.y);
        const bz = Math.round(normalPos.z);
        const key = `${bx},${by},${bz}`;
        if (blockMap.has(key)) {
          return { x: bx, y: by, z: bz };
        }
      }

      // 3. Fallback: Find nearest block in blockMap within 0.85 distance of hit point
      // Guarantees selection for thin geometry like ladders, iron bars, or glass panes
      let closestBlock: Vector3D | null = null;
      let minDistanceSq = 1.0;

      const cx = Math.round(e.point.x);
      const cy = Math.round(e.point.y);
      const cz = Math.round(e.point.z);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const nx = cx + dx;
            const ny = cy + dy;
            const nz = cz + dz;
            const key = `${nx},${ny},${nz}`;
            if (blockMap.has(key)) {
              const distSq =
                (e.point.x - nx) ** 2 +
                (e.point.y - ny) ** 2 +
                (e.point.z - nz) ** 2;
              if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                closestBlock = { x: nx, y: ny, z: nz };
              }
            }
          }
        }
      }

      return closestBlock;
    },
    [blockMap]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isSubmitMode) return;
      // Do not recalculate hover if right mouse button is being held to look around
      if (e.buttons === 2) return;

      e.stopPropagation();
      const coord = getVoxelCoordFromHit(e);
      if (!coord) return;

      if (
        !hoveredBlock ||
        hoveredBlock.x !== coord.x ||
        hoveredBlock.y !== coord.y ||
        hoveredBlock.z !== coord.z
      ) {
        const key = `${coord.x},${coord.y},${coord.z}`;
        const block = blockMap.get(key);
        if (block) {
          setHoveredBlock(coord);
          document.body.style.cursor = 'crosshair';
        } else {
          setHoveredBlock(null);
          document.body.style.cursor = 'auto';
        }
      }
    },
    [
      isSubmitMode,
      getVoxelCoordFromHit,
      hoveredBlock,
      blockMap,
      setHoveredBlock,
    ]
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isSubmitMode) return;
      e.stopPropagation();
      setHoveredBlock(null);
      document.body.style.cursor = 'auto';
    },
    [isSubmitMode, setHoveredBlock]
  );

  // Left-Click: Exclusively picks the block in Cut-Editor submit mode
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isSubmitMode) return;
      if (e.nativeEvent.button !== 0) return; // Only Left Click
      e.stopPropagation();
      const coord = getVoxelCoordFromHit(e);
      if (!coord) return;
      const key = `${coord.x},${coord.y},${coord.z}`;
      const block = blockMap.get(key);
      if (block) {
        pickBlockInScene(block.position, e.shiftKey);
      }
    },
    [isSubmitMode, getVoxelCoordFromHit, blockMap, pickBlockInScene]
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isSubmitMode) return;
      if (e.button === 1) {
        // Middle click: force add as waypoint
        e.stopPropagation();
        const coord = getVoxelCoordFromHit(e);
        if (!coord) return;
        const key = `${coord.x},${coord.y},${coord.z}`;
        const block = blockMap.get(key);
        if (block) {
          pickBlockInScene(block.position, true);
        }
      }
    },
    [isSubmitMode, getVoxelCoordFromHit, blockMap, pickBlockInScene]
  );

  const hoveredBlockLabel = useMemo(() => {
    if (!hoveredBlock) return '';
    const key = `${hoveredBlock.x},${hoveredBlock.y},${hoveredBlock.z}`;
    const b = blockMap.get(key);
    if (!b) return '';
    return VOXEL_BLOCK_LABELS[b.type] || b.type;
  }, [hoveredBlock, blockMap]);

  if (!currentModule) {
    return null;
  }

  if (
    !Array.isArray(currentModule.blocks) ||
    currentModule.blocks.length === 0
  ) {
    return (
      <group>
        <MinecraftSpectatorControls />
        <WorldHtml position={[0, 4, 10]} center>
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-zinc-950/90 px-4 py-2 font-mono text-xs text-emerald-400 shadow-2xl backdrop-blur-md">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Lade 3D-Blöcke für {currentModule.name || 'Modul'}...</span>
          </div>
        </WorldHtml>
      </group>
    );
  }

  return (
    <group>
      {/* Minecraft Spectator Free-Look & WASD Flight Camera Controller */}
      <MinecraftSpectatorControls />

      {/* 1. OPAQUE & ALPHA-TESTED MESH (Solid blocks, leaves, ladders, fences, etc. in 1 single Draw Call) */}
      {mergedResult?.opaqueGeometry && atlasMaterial && (
        <mesh
          geometry={mergedResult.opaqueGeometry}
          material={atlasMaterial}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        />
      )}

      {/* 2. TRANSLUCENT MESH (Water, ice, stained glass, slime in 1 Draw Call with smooth alpha blending) */}
      {mergedResult?.translucentGeometry && translucentMaterial && (
        <mesh
          geometry={mergedResult.translucentGeometry}
          material={translucentMaterial}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        />
      )}

      {/* Selected Cut Start, Mid, Target Box-Outlines (in Explore / Admin mode) */}
      {!isSubmitMode && selectedCut && (
        <group>
          {/* 1. Start Block (Green Box Outline) */}
          {(() => {
            const b = blockMap.get(`${selectedCut.startBlock.x},${selectedCut.startBlock.y},${selectedCut.startBlock.z}`);
            const bounds = getBlockHighlightBounds(b, blockMap);
            return (
              <group
                position={[
                  selectedCut.startBlock.x + bounds.offset[0],
                  selectedCut.startBlock.y + bounds.offset[1],
                  selectedCut.startBlock.z + bounds.offset[2],
                ]}
              >
                <mesh>
                  <boxGeometry args={bounds.size} />
                  <meshBasicMaterial
                    color="#10b981"
                    transparent
                    opacity={0.16}
                    depthWrite={false}
                  />
                  <Edges scale={1.02} threshold={1} color="#22c55e" />
                </mesh>
                <WorldHtml position={[0, bounds.size[1] / 2 + 0.35, 0]} center>
                  <div className="pointer-events-none whitespace-nowrap rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-extrabold text-zinc-950 shadow-md">
                    START
                  </div>
                </WorldHtml>
              </group>
            );
          })()}

          {/* 2. Mid Points (Orange Box Outlines) */}
          {selectedCut.midPoints &&
            selectedCut.midPoints.map((mid, idx) => {
              const b = blockMap.get(`${Math.round(mid.x)},${Math.round(mid.y)},${Math.round(mid.z)}`);
              const bounds = b
                ? getBlockHighlightBounds(b, blockMap)
                : { size: [0.6, 0.6, 0.6] as [number, number, number], offset: [0, 0, 0] as [number, number, number] };
              return (
                <group
                  key={`sel-mid-${idx}`}
                  position={[
                    mid.x + bounds.offset[0],
                    mid.y + bounds.offset[1],
                    mid.z + bounds.offset[2],
                  ]}
                >
                  <mesh>
                    <boxGeometry args={bounds.size} />
                    <meshBasicMaterial
                      color="#f97316"
                      transparent
                      opacity={0.16}
                      depthWrite={false}
                    />
                    <Edges scale={1.02} threshold={1} color="#f97316" />
                  </mesh>
                  <WorldHtml position={[0, bounds.size[1] / 2 + 0.35, 0]} center>
                    <div className="pointer-events-none whitespace-nowrap rounded-full bg-orange-500/90 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-md">
                      MID {selectedCut.midPoints!.length > 1 ? idx + 1 : ''}
                    </div>
                  </WorldHtml>
                </group>
              );
            })}

          {/* 3. Target Block (Cyan Box Outline) */}
          {(() => {
            const b = blockMap.get(`${selectedCut.endBlock.x},${selectedCut.endBlock.y},${selectedCut.endBlock.z}`);
            const bounds = getBlockHighlightBounds(b, blockMap);
            return (
              <group
                position={[
                  selectedCut.endBlock.x + bounds.offset[0],
                  selectedCut.endBlock.y + bounds.offset[1],
                  selectedCut.endBlock.z + bounds.offset[2],
                ]}
              >
                <mesh>
                  <boxGeometry args={bounds.size} />
                  <meshBasicMaterial
                    color="#06b6d4"
                    transparent
                    opacity={0.16}
                    depthWrite={false}
                  />
                  <Edges scale={1.02} threshold={1} color="#22d3ee" />
                </mesh>
                <WorldHtml position={[0, bounds.size[1] / 2 + 0.35, 0]} center>
                  <div className="pointer-events-none whitespace-nowrap rounded-full bg-cyan-500/90 px-2 py-0.5 text-[9px] font-extrabold text-zinc-950 shadow-md">
                    ZIEL
                  </div>
                </WorldHtml>
              </group>
            );
          })()}
        </group>
      )}

      {/* Submit Mode: Hover Wireframe Box & Tooltip (Dynamically adapted to block shape/size!) */}
      {isSubmitMode && hoveredBlock && (() => {
        const b = blockMap.get(`${hoveredBlock.x},${hoveredBlock.y},${hoveredBlock.z}`);
        const bounds = getBlockHighlightBounds(b, blockMap);
        return (
          <group
            position={[
              hoveredBlock.x + bounds.offset[0],
              hoveredBlock.y + bounds.offset[1],
              hoveredBlock.z + bounds.offset[2],
            ]}
          >
            <mesh>
              <boxGeometry args={bounds.size} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent
                opacity={0.18}
                depthWrite={false}
              />
              <Edges scale={1.02} threshold={1} color="#22d3ee" />
            </mesh>
            <WorldHtml position={[0, bounds.size[1] / 2 + 0.45, 0]} center>
              <div className="pointer-events-none whitespace-nowrap rounded-md border border-cyan-400/50 bg-zinc-950/90 px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow-lg">
                {hoveredBlockLabel} ({hoveredBlock.x}, {hoveredBlock.y},{' '}
                {hoveredBlock.z})
              </div>
            </WorldHtml>
          </group>
        );
      })()}

      {/* Submit Mode: Draft Start Marker */}
      {isSubmitMode && draftStartBlock && (() => {
        const b = blockMap.get(`${draftStartBlock.x},${draftStartBlock.y},${draftStartBlock.z}`);
        const bounds = getBlockHighlightBounds(b, blockMap);
        const markerSize: [number, number, number] = [
          bounds.size[0] + 0.04,
          bounds.size[1] + 0.04,
          bounds.size[2] + 0.04,
        ];
        return (
          <group
            position={[
              draftStartBlock.x + bounds.offset[0],
              draftStartBlock.y + bounds.offset[1],
              draftStartBlock.z + bounds.offset[2],
            ]}
          >
            <mesh>
              <boxGeometry args={markerSize} />
              <meshBasicMaterial
                color="#10b981"
                transparent
                opacity={0.24}
                depthWrite={false}
              />
              <Edges scale={1.02} threshold={1} color="#34d399" />
            </mesh>
            <WorldHtml position={[0, markerSize[1] / 2 + 0.55, 0]} center>
              <div className="pointer-events-none whitespace-nowrap rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-950 shadow-lg">
                START ({draftStartBlock.x},{draftStartBlock.y},{draftStartBlock.z})
              </div>
            </WorldHtml>
          </group>
        );
      })()}

      {/* Submit Mode: Draft End Marker */}
      {isSubmitMode && draftEndBlock && (() => {
        const b = blockMap.get(`${draftEndBlock.x},${draftEndBlock.y},${draftEndBlock.z}`);
        const bounds = getBlockHighlightBounds(b, blockMap);
        const markerSize: [number, number, number] = [
          bounds.size[0] + 0.04,
          bounds.size[1] + 0.04,
          bounds.size[2] + 0.04,
        ];
        return (
          <group
            position={[
              draftEndBlock.x + bounds.offset[0],
              draftEndBlock.y + bounds.offset[1],
              draftEndBlock.z + bounds.offset[2],
            ]}
          >
            <mesh>
              <boxGeometry args={markerSize} />
              <meshBasicMaterial
                color="#a855f7"
                transparent
                opacity={0.24}
                depthWrite={false}
              />
              <Edges scale={1.02} threshold={1} color="#c084fc" />
            </mesh>
            <WorldHtml position={[0, markerSize[1] / 2 + 0.55, 0]} center>
              <div className="pointer-events-none whitespace-nowrap rounded-full bg-purple-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-lg">
                ZIEL ({draftEndBlock.x},{draftEndBlock.y},{draftEndBlock.z})
              </div>
            </WorldHtml>
          </group>
        );
      })()}

      {/* Interactive Draggable Mid-Point Waypoints in Submit Mode */}
      {isSubmitMode &&
        draftMidPoints.map((pt, idx) => (
          <DraggableMidPoint
            key={`mid-${idx}`}
            index={idx}
            point={pt}
            isActive={
              activeDraftMidPointIndex === idx ||
              (activeDraftMidPointIndex === null && idx === 0)
            }
            onSelect={() => setActiveDraftMidPointIndex(idx)}
            onUpdate={(nextPt) => updateDraftMidPoint(idx, nextPt)}
          />
        ))}
    </group>
  );
};

export { VoxelModuleRenderer as VoxelRenderer };
