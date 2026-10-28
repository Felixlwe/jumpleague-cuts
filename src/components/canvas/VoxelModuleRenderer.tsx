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
import {
  needsAutoNaming,
  getFrequentBlockNames,
  captureMultiAngleComposite,
} from '@/lib/moduleCapture';

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
      if (cut) {
        const hasValidCam =
          cut.cameraPosition &&
          cut.cameraTarget &&
          (Math.abs(cut.cameraPosition.x) > 0.01 ||
            Math.abs(cut.cameraPosition.y) > 0.01 ||
            Math.abs(cut.cameraPosition.z) > 0.01);

        if (hasValidCam) {
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
        } else if (cut.startBlock && cut.endBlock) {
          const midX = (cut.startBlock.x + cut.endBlock.x) / 2;
          const midY = (cut.startBlock.y + cut.endBlock.y) / 2;
          const midZ = (cut.startBlock.z + cut.endBlock.z) / 2;
          targetLookAt = new THREE.Vector3(midX, midY, midZ);
          targetPos = new THREE.Vector3(midX + 4, midY + 3.5, midZ + 4);
        }
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

export interface BoxBound {
  size: [number, number, number];
  offset: [number, number, number];
}

export interface BlockHighlightBounds {
  boxes: BoxBound[];
  size: [number, number, number];
  offset: [number, number, number];
  primarySize: [number, number, number];
  primaryOffset: [number, number, number];
}

export function singleBox(
  size: [number, number, number],
  offset: [number, number, number] = [0, 0, 0]
): BlockHighlightBounds {
  return {
    boxes: [{ size, offset }],
    primarySize: size,
    primaryOffset: offset,
    size,
    offset,
  };
}

export function compoundBoxes(
  boxes: BoxBound[],
  primarySize: [number, number, number] = [1.04, 1.04, 1.04],
  primaryOffset: [number, number, number] = [0, 0, 0]
): BlockHighlightBounds {
  return {
    boxes,
    primarySize,
    primaryOffset,
    size: primarySize,
    offset: primaryOffset,
  };
}

/**
 * Checks if a block is solid for supporting wall-mounted blocks (e.g. ladders, wall signs, wall skulls).
 */
function isSolidNeighbor(b?: VoxelBlock): boolean {
  if (!b) return false;
  const t = (b.type || '').toLowerCase().replace(/^minecraft:/, '');
  if (!t) return false;
  const name = t.includes('[') ? t.substring(0, t.indexOf('[')) : t;
  if (
    name.includes('air') ||
    name.includes('water') ||
    name.includes('lava') ||
    name.includes('ladder') ||
    name.includes('vine') ||
    name.includes('torch') ||
    name.includes('carpet') ||
    name.includes('plate') ||
    name.includes('button') ||
    name.includes('lever') ||
    name.includes('flower') ||
    name.includes('sapling') ||
    name.includes('sign') ||
    name.includes('banner')
  ) {
    return false;
  }
  return true;
}

/**
 * Extracts clean block name and properties (facing, half, shape, slabType, open, hanging, etc.)
 * from block type string, block properties/state, and neighbor connectivity.
 */
export function extractBlockMeta(
  block?: VoxelBlock | null,
  blockMap?: Map<string, VoxelBlock>
): {
  cleanType: string;
  facing: string;
  half: string;
  shape: string;
  slabType: string;
  isOpen: boolean;
  isHanging: boolean;
  properties: Record<string, string>;
} {
  if (!block) {
    return {
      cleanType: '',
      facing: '',
      half: 'bottom',
      shape: 'straight',
      slabType: 'bottom',
      isOpen: false,
      isHanging: false,
      properties: {},
    };
  }

  const rawType = (block.type || '').toLowerCase().replace(/^minecraft:/, '');
  const properties: Record<string, string> = {};

  // 1. Parse bracket state syntax, e.g. "oak_stairs[facing=north,half=bottom]"
  let cleanType = rawType;
  const bracketIdx = rawType.indexOf('[');
  if (bracketIdx !== -1 && rawType.endsWith(']')) {
    cleanType = rawType.substring(0, bracketIdx);
    const inside = rawType.substring(bracketIdx + 1, rawType.length - 1);
    const pairs = inside.split(',');
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const k = pair.substring(0, eqIdx).trim();
        const v = pair.substring(eqIdx + 1).trim();
        if (k) properties[k] = v;
      }
    }
  }

  // 2. Merge block.properties & block.state if present
  if (block.properties && typeof block.properties === 'object') {
    for (const [k, v] of Object.entries(block.properties)) {
      if (v !== undefined && v !== null) properties[k.toLowerCase()] = String(v).toLowerCase();
    }
  }
  if (block.state && typeof block.state === 'object') {
    for (const [k, v] of Object.entries(block.state)) {
      if (v !== undefined && v !== null) properties[k.toLowerCase()] = String(v).toLowerCase();
    }
  }

  // 3. Extract facing with auto-detection for wall-mounted blocks
  let facing =
    block.facing ||
    properties.facing ||
    '';

  const { x, y, z } = block.position || { x: 0, y: 0, z: 0 };

  const isWallMountable =
    cleanType.includes('ladder') ||
    cleanType.includes('wall_sign') ||
    cleanType.includes('wall_head') ||
    cleanType.includes('wall_skull') ||
    cleanType.includes('wall_torch') ||
    cleanType.includes('wall_banner');

  if (!facing && isWallMountable && blockMap) {
    // In Minecraft:
    // ladder on SOUTH wall faces NORTH (+Z -> faces north)
    // ladder on NORTH wall faces SOUTH (-Z -> faces south)
    // ladder on EAST wall faces WEST (+X -> faces west)
    // ladder on WEST wall faces EAST (-X -> faces east)
    if (isSolidNeighbor(blockMap.get(`${x},${y},${z + 1}`))) {
      facing = 'north';
    } else if (isSolidNeighbor(blockMap.get(`${x},${y},${z - 1}`))) {
      facing = 'south';
    } else if (isSolidNeighbor(blockMap.get(`${x + 1},${y},${z}`))) {
      facing = 'west';
    } else if (isSolidNeighbor(blockMap.get(`${x - 1},${y},${z}`))) {
      facing = 'east';
    }
  }

  // Default facing if still empty
  if (!facing) {
    facing = cleanType.includes('ladder') ? 'north' : '';
  }

  const half =
    block.half ||
    properties.half ||
    'bottom';

  const shape =
    properties.shape ||
    'straight';

  const slabType =
    block.slabType ||
    properties.type ||
    'bottom';

  const isOpen =
    block.open === true ||
    properties.open === 'true';

  const isHanging =
    properties.hanging === 'true';

  return {
    cleanType,
    facing,
    half,
    shape,
    slabType,
    isOpen,
    isHanging,
    properties,
  };
}

/**
 * Calculates adaptive 3D outline box dimensions & center offset based on Minecraft block geometry.
 * Adapts to fences, walls, slabs, trapdoors, ladders, stairs, heads/skulls, carpets, rods, etc.
 */
export function getBlockHighlightBounds(
  block?: VoxelBlock | null,
  blockMap?: Map<string, VoxelBlock>
): BlockHighlightBounds {
  if (!block) {
    return singleBox([1.04, 1.04, 1.04], [0, 0, 0]);
  }

  const {
    cleanType,
    facing,
    half,
    shape,
    slabType,
    isOpen,
    isHanging,
    properties,
  } = extractBlockMeta(block, blockMap);

  const { x, y, z } = block.position;

  // Helper to check neighbor connection for fences/walls/bars/panes
  const canConnect = (neighbor?: VoxelBlock): boolean => {
    if (!neighbor) return false;
    const nType = (neighbor.type || '').toLowerCase().replace(/^minecraft:/, '');
    const nName = nType.includes('[') ? nType.substring(0, nType.indexOf('[')) : nType;
    if (
      nName.includes('air') ||
      nName === 'water' ||
      nName.startsWith('water_') ||
      nName === 'bubble_column' ||
      nName === 'lava' ||
      nName.startsWith('lava_')
    ) {
      return false;
    }
    return true;
  };

  // 1. Fences (e.g. oak_fence, nether_brick_fence, fence_gate)
  if (cleanType.includes('fence')) {
    const hasNorth =
      properties.north === 'true' ||
      canConnect(blockMap?.get(`${x},${y},${z - 1}`));
    const hasSouth =
      properties.south === 'true' ||
      canConnect(blockMap?.get(`${x},${y},${z + 1}`));
    const hasWest =
      properties.west === 'true' ||
      canConnect(blockMap?.get(`${x - 1},${y},${z}`));
    const hasEast =
      properties.east === 'true' ||
      canConnect(blockMap?.get(`${x + 1},${y},${z}`));

    const minX = hasWest ? -0.52 : -0.19;
    const maxX = hasEast ? 0.52 : 0.19;
    const minZ = hasNorth ? -0.52 : -0.19;
    const maxZ = hasSouth ? 0.52 : 0.19;

    return singleBox(
      [maxX - minX, 1.04, maxZ - minZ],
      [(minX + maxX) / 2, 0, (minZ + maxZ) / 2]
    );
  }

  // 2. Walls (e.g. cobblestone_wall, diorite_wall)
  if (
    cleanType.includes('wall') &&
    !cleanType.includes('sign') &&
    !cleanType.includes('head') &&
    !cleanType.includes('skull') &&
    !cleanType.includes('torch') &&
    !cleanType.includes('banner')
  ) {
    const hasNorth = canConnect(blockMap?.get(`${x},${y},${z - 1}`));
    const hasSouth = canConnect(blockMap?.get(`${x},${y},${z + 1}`));
    const hasWest = canConnect(blockMap?.get(`${x - 1},${y},${z}`));
    const hasEast = canConnect(blockMap?.get(`${x + 1},${y},${z}`));

    const minX = hasWest ? -0.52 : -0.24;
    const maxX = hasEast ? 0.52 : 0.24;
    const minZ = hasNorth ? -0.52 : -0.24;
    const maxZ = hasSouth ? 0.52 : 0.24;

    return singleBox(
      [maxX - minX, 1.04, maxZ - minZ],
      [(minX + maxX) / 2, 0, (minZ + maxZ) / 2]
    );
  }

  // 3. Iron Bars & Glass Panes
  if (cleanType.includes('bars') || cleanType.includes('pane')) {
    const hasNorth = canConnect(blockMap?.get(`${x},${y},${z - 1}`));
    const hasSouth = canConnect(blockMap?.get(`${x},${y},${z + 1}`));
    const hasWest = canConnect(blockMap?.get(`${x - 1},${y},${z}`));
    const hasEast = canConnect(blockMap?.get(`${x + 1},${y},${z}`));

    const minX = hasWest ? -0.52 : -0.13;
    const maxX = hasEast ? 0.52 : 0.13;
    const minZ = hasNorth ? -0.52 : -0.13;
    const maxZ = hasSouth ? 0.52 : 0.13;

    return singleBox(
      [maxX - minX, 1.04, maxZ - minZ],
      [(minX + maxX) / 2, 0, (minZ + maxZ) / 2]
    );
  }

  // 4. Stairs (Stepped Compound 3D Geometry!)
  if (cleanType.includes('stairs') || cleanType.includes('stair')) {
    const isTop = half === 'top';
    const baseOffsetY = isTop ? 0.25 : -0.25;
    const stepOffsetY = isTop ? -0.25 : 0.25;

    // Base Box: standard half slab
    const boxes: BoxBound[] = [
      {
        size: [1.04, 0.52, 1.04],
        offset: [0, baseOffsetY, 0],
      },
    ];

    if (shape === 'outer_left' || shape === 'outer_right') {
      let cornerOffset: [number, number, number] = [0, stepOffsetY, 0];
      if (facing === 'north') {
        cornerOffset = shape === 'outer_left' ? [-0.25, stepOffsetY, -0.25] : [0.25, stepOffsetY, -0.25];
      } else if (facing === 'south') {
        cornerOffset = shape === 'outer_left' ? [0.25, stepOffsetY, 0.25] : [-0.25, stepOffsetY, 0.25];
      } else if (facing === 'west') {
        cornerOffset = shape === 'outer_left' ? [-0.25, stepOffsetY, 0.25] : [-0.25, stepOffsetY, -0.25];
      } else {
        // east
        cornerOffset = shape === 'outer_left' ? [0.25, stepOffsetY, -0.25] : [0.25, stepOffsetY, 0.25];
      }
      boxes.push({
        size: [0.52, 0.52, 0.52],
        offset: cornerOffset,
      });
    } else if (shape === 'inner_left' || shape === 'inner_right') {
      if (facing === 'north') {
        boxes.push({ size: [1.04, 0.52, 0.52], offset: [0, stepOffsetY, -0.25] });
        boxes.push({
          size: [0.52, 0.52, 0.52],
          offset: [shape === 'inner_left' ? -0.25 : 0.25, stepOffsetY, 0.25],
        });
      } else if (facing === 'south') {
        boxes.push({ size: [1.04, 0.52, 0.52], offset: [0, stepOffsetY, 0.25] });
        boxes.push({
          size: [0.52, 0.52, 0.52],
          offset: [shape === 'inner_left' ? 0.25 : -0.25, stepOffsetY, -0.25],
        });
      } else if (facing === 'west') {
        boxes.push({ size: [0.52, 0.52, 1.04], offset: [-0.25, stepOffsetY, 0] });
        boxes.push({
          size: [0.52, 0.52, 0.52],
          offset: [0.25, stepOffsetY, shape === 'inner_left' ? 0.25 : -0.25],
        });
      } else {
        // east
        boxes.push({ size: [0.52, 0.52, 1.04], offset: [0.25, stepOffsetY, 0] });
        boxes.push({
          size: [0.52, 0.52, 0.52],
          offset: [-0.25, stepOffsetY, shape === 'inner_left' ? -0.25 : 0.25],
        });
      }
    } else {
      // Straight stair (standard)
      if (facing === 'north') {
        boxes.push({ size: [1.04, 0.52, 0.52], offset: [0, stepOffsetY, -0.25] });
      } else if (facing === 'south') {
        boxes.push({ size: [1.04, 0.52, 0.52], offset: [0, stepOffsetY, 0.25] });
      } else if (facing === 'west') {
        boxes.push({ size: [0.52, 0.52, 1.04], offset: [-0.25, stepOffsetY, 0] });
      } else {
        // east
        boxes.push({ size: [0.52, 0.52, 1.04], offset: [0.25, stepOffsetY, 0] });
      }
    }

    return compoundBoxes(boxes, [1.04, 1.04, 1.04], [0, 0, 0]);
  }

  // 5. Slabs (bottom vs top vs double)
  if (cleanType.includes('slab')) {
    if (slabType === 'top') {
      return singleBox([1.04, 0.52, 1.04], [0, 0.25, 0]);
    }
    if (slabType === 'double') {
      return singleBox([1.04, 1.04, 1.04], [0, 0, 0]);
    }
    return singleBox([1.04, 0.52, 1.04], [0, -0.25, 0]);
  }

  // 6. Carpets & Snow layers
  if (cleanType.includes('carpet') || cleanType === 'snow' || cleanType.includes('snow_layer')) {
    return singleBox([1.04, 0.12, 1.04], [0, -0.46, 0]);
  }

  // 7. Trapdoors (Open on attached wall vs Closed on top/bottom)
  if (cleanType.includes('trapdoor')) {
    if (isOpen) {
      if (facing === 'north') return singleBox([1.04, 1.04, 0.20], [0, 0, 0.41]);
      if (facing === 'south') return singleBox([1.04, 1.04, 0.20], [0, 0, -0.41]);
      if (facing === 'west') return singleBox([0.20, 1.04, 1.04], [0.41, 0, 0]);
      return singleBox([0.20, 1.04, 1.04], [-0.41, 0, 0]);
    }

    if (half === 'top') {
      return singleBox([1.04, 0.20, 1.04], [0, 0.41, 0]);
    }
    return singleBox([1.04, 0.20, 1.04], [0, -0.41, 0]);
  }

  // 8. Ladders (facing=north attaches to South wall, etc.)
  if (cleanType.includes('ladder')) {
    if (facing === 'north') return singleBox([0.96, 1.04, 0.16], [0, 0, 0.42]);
    if (facing === 'south') return singleBox([0.96, 1.04, 0.16], [0, 0, -0.42]);
    if (facing === 'west') return singleBox([0.16, 1.04, 0.96], [0.42, 0, 0]);
    if (facing === 'east') return singleBox([0.16, 1.04, 0.96], [-0.42, 0, 0]);
    return singleBox([0.96, 1.04, 0.20], [0, 0, 0]);
  }

  // 9. Heads / Skulls (Wall Head on wall face vs Floor Head on ground)
  if (cleanType.includes('head') || cleanType.includes('skull')) {
    const isWallHead =
      cleanType.includes('wall') ||
      (facing && ['north', 'south', 'east', 'west'].includes(facing) && !properties.rotation);

    if (isWallHead) {
      if (facing === 'north') return singleBox([0.54, 0.54, 0.54], [0, 0.02, 0.23]);
      if (facing === 'south') return singleBox([0.54, 0.54, 0.54], [0, 0.02, -0.23]);
      if (facing === 'west') return singleBox([0.54, 0.54, 0.54], [0.23, 0.02, 0]);
      if (facing === 'east') return singleBox([0.54, 0.54, 0.54], [-0.23, 0.02, 0]);
      return singleBox([0.54, 0.54, 0.54], [0, 0.02, 0]);
    }

    // Floor head / skull (rests on ground at y = -0.23)
    return singleBox([0.54, 0.54, 0.54], [0, -0.23, 0]);
  }

  // 10. Rods (End Rod, Lightning Rod)
  if (cleanType.includes('rod')) {
    if (facing === 'north' || facing === 'south') {
      return singleBox([0.28, 0.28, 1.04], [0, 0, 0]);
    }
    if (facing === 'east' || facing === 'west') {
      return singleBox([1.04, 0.28, 0.28], [0, 0, 0]);
    }
    return singleBox([0.28, 1.04, 0.28], [0, 0, 0]);
  }

  // 11. Chains
  if (cleanType.includes('chain')) {
    return singleBox([0.26, 1.04, 0.26], [0, 0, 0]);
  }

  // 12. Lanterns
  if (cleanType.includes('lantern')) {
    return singleBox(
      [0.48, 0.68, 0.48],
      [0, isHanging ? 0.16 : -0.16, 0]
    );
  }

  // 13. Chests
  if (cleanType.includes('chest')) {
    return singleBox([0.92, 0.92, 0.92], [0, -0.05, 0]);
  }

  // 14. Daylight Detectors
  if (cleanType.includes('daylight_detector')) {
    return singleBox([1.04, 0.42, 1.04], [0, -0.30, 0]);
  }

  // 15. Beds
  if (cleanType.includes('bed')) {
    return singleBox([1.04, 0.60, 1.04], [0, -0.22, 0]);
  }

  // 16. Anvils
  if (cleanType.includes('anvil')) {
    return singleBox([0.80, 1.02, 0.88], [0, 0, 0]);
  }

  // 17. Cactus
  if (cleanType.includes('cactus')) {
    return singleBox([0.92, 1.04, 0.92], [0, 0, 0]);
  }

  // 18. Flower Pots
  if (cleanType.includes('pot')) {
    return singleBox([0.48, 0.48, 0.48], [0, -0.28, 0]);
  }

  // 19. Pressure Plates
  if (cleanType.includes('pressure_plate')) {
    return singleBox([0.86, 0.10, 0.86], [0, -0.46, 0]);
  }

  // 20. Torches / Candles (Wall vs Floor)
  if (cleanType.includes('torch') || cleanType.includes('candle')) {
    if (cleanType.includes('wall') || (facing && ['north', 'south', 'east', 'west'].includes(facing))) {
      if (facing === 'north') return singleBox([0.26, 0.65, 0.26], [0, 0.12, 0.35]);
      if (facing === 'south') return singleBox([0.26, 0.65, 0.26], [0, 0.12, -0.35]);
      if (facing === 'west') return singleBox([0.26, 0.65, 0.26], [0.35, 0.12, 0]);
      if (facing === 'east') return singleBox([0.26, 0.65, 0.26], [-0.35, 0.12, 0]);
    }
    return singleBox([0.26, 0.70, 0.26], [0, -0.15, 0]);
  }

  // 21. Default standard full cube
  return singleBox([1.04, 1.04, 1.04], [0, 0, 0]);
}

/**
 * Renders adaptive 3D highlight wireframes for single or compound block bounds.
 */
export const BlockHighlightMesh: React.FC<{
  bounds: BlockHighlightBounds;
  color?: string;
  edgeColor?: string;
  opacity?: number;
  edgeScale?: number;
  threshold?: number;
  extraMargin?: number;
}> = ({
  bounds,
  color = '#06b6d4',
  edgeColor = '#22d3ee',
  opacity = 0.18,
  edgeScale = 1.02,
  threshold = 1,
  extraMargin = 0,
}) => {
  return (
    <>
      {bounds.boxes.map((b, i) => {
        const boxSize: [number, number, number] = [
          b.size[0] + extraMargin,
          b.size[1] + extraMargin,
          b.size[2] + extraMargin,
        ];
        return (
          <mesh key={i} position={b.offset}>
            <boxGeometry args={boxSize} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
            <Edges scale={edgeScale} threshold={threshold} color={edgeColor} />
          </mesh>
        );
      })}
    </>
  );
};

/**
 * Main 3D Voxel Module Renderer:
 * Combines high-performance chunk-merged mesh rendering with Minecraft Spectator controls.
 */
export const VoxelModuleRenderer: React.FC = () => {
  const { gl, scene, camera } = useThree();
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
  const updateModuleNameAndThumbnail = useJLStore(
    (s) => s.updateModuleNameAndThumbnail
  );

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

  // Automated 4-angle Vision AI naming and thumbnail capture in 3D-Viewer
  useEffect(() => {
    if (!currentModule || !mergedResult || !mcmeta) return;
    const shouldName = needsAutoNaming(currentModule);
    const shouldThumb = !currentModule.thumbnailUrl;
    if (!shouldName && !shouldThumb) return;
    if (hasCapturedRef.current[currentModule.id]) return;

    const timer = setTimeout(async () => {
      try {
        hasCapturedRef.current[currentModule.id] = true;

        const captureResult = await captureMultiAngleComposite({
          mergedResult,
          mcmeta,
          blocks: currentModule.blocks,
          existingGl: gl,
          existingScene: scene,
          userCamera: camera,
        });

        if (!captureResult) return;

        const { compositeDataUrl, thumbnailDataUrl } = captureResult;
        let aiName: string | undefined = undefined;

        if (shouldName) {
          try {
            const res = await fetch('/api/ai-name-module', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                compositeDataUrl,
                frequentBlocks: getFrequentBlockNames(currentModule.blocks),
                dimensions: currentModule.dimensions,
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as { name?: string };
              if (data?.name && typeof data.name === 'string') {
                aiName = data.name.trim();
              }
            }
          } catch (aiErr) {
            console.warn('[VoxelModuleRenderer] AI naming error:', aiErr);
          }
        }

        await updateModuleNameAndThumbnail(
          currentModule.id,
          aiName,
          shouldThumb ? thumbnailDataUrl : undefined
        );
      } catch (err) {
        console.warn('[VoxelModuleRenderer] Auto-capture failed:', err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    currentModule?.id,
    currentModule?.name,
    currentModule?.thumbnailUrl,
    currentModule?.blocks,
    currentModule?.dimensions,
    mergedResult,
    mcmeta,
    gl,
    scene,
    camera,
    updateModuleNameAndThumbnail,
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
                  selectedCut.startBlock.x,
                  selectedCut.startBlock.y,
                  selectedCut.startBlock.z,
                ]}
              >
                <BlockHighlightMesh
                  bounds={bounds}
                  color="#10b981"
                  edgeColor="#22c55e"
                  opacity={0.16}
                />
                <WorldHtml
                  position={[
                    bounds.primaryOffset[0],
                    bounds.primaryOffset[1] + bounds.primarySize[1] / 2 + 0.35,
                    bounds.primaryOffset[2],
                  ]}
                  center
                >
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
                : singleBox([0.6, 0.6, 0.6], [0, 0, 0]);
              return (
                <group
                  key={`sel-mid-${idx}`}
                  position={[mid.x, mid.y, mid.z]}
                >
                  <BlockHighlightMesh
                    bounds={bounds}
                    color="#f97316"
                    edgeColor="#f97316"
                    opacity={0.16}
                  />
                  <WorldHtml
                    position={[
                      bounds.primaryOffset[0],
                      bounds.primaryOffset[1] + bounds.primarySize[1] / 2 + 0.35,
                      bounds.primaryOffset[2],
                    ]}
                    center
                  >
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
                  selectedCut.endBlock.x,
                  selectedCut.endBlock.y,
                  selectedCut.endBlock.z,
                ]}
              >
                <BlockHighlightMesh
                  bounds={bounds}
                  color="#06b6d4"
                  edgeColor="#22d3ee"
                  opacity={0.16}
                />
                <WorldHtml
                  position={[
                    bounds.primaryOffset[0],
                    bounds.primaryOffset[1] + bounds.primarySize[1] / 2 + 0.35,
                    bounds.primaryOffset[2],
                  ]}
                  center
                >
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
              hoveredBlock.x,
              hoveredBlock.y,
              hoveredBlock.z,
            ]}
          >
            <BlockHighlightMesh
              bounds={bounds}
              color="#06b6d4"
              edgeColor="#22d3ee"
              opacity={0.18}
            />
            <WorldHtml
              position={[
                bounds.primaryOffset[0],
                bounds.primaryOffset[1] + bounds.primarySize[1] / 2 + 0.45,
                bounds.primaryOffset[2],
              ]}
              center
            >
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
        return (
          <group
            position={[
              draftStartBlock.x,
              draftStartBlock.y,
              draftStartBlock.z,
            ]}
          >
            <BlockHighlightMesh
              bounds={bounds}
              color="#10b981"
              edgeColor="#34d399"
              opacity={0.24}
              extraMargin={0.04}
            />
            <WorldHtml
              position={[
                bounds.primaryOffset[0],
                bounds.primaryOffset[1] + bounds.primarySize[1] / 2 + 0.55,
                bounds.primaryOffset[2],
              ]}
              center
            >
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
        return (
          <group
            position={[
              draftEndBlock.x,
              draftEndBlock.y,
              draftEndBlock.z,
            ]}
          >
            <BlockHighlightMesh
              bounds={bounds}
              color="#a855f7"
              edgeColor="#c084fc"
              opacity={0.24}
              extraMargin={0.04}
            />
            <WorldHtml
              position={[
                bounds.primaryOffset[0],
                bounds.primaryOffset[1] + bounds.primarySize[1] / 2 + 0.55,
                bounds.primaryOffset[2],
              ]}
              center
            >
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
