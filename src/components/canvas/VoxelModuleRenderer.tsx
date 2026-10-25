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
import { VoxelBlock, Vector3D } from '@/types/jumpleague';
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
    if (!selectedModuleId) return modules[0] ?? null;
    const target = selectedModuleId.trim().toLowerCase().replace(/^#+/, '');
    return (
      modules.find((m) => {
        const mId = m.id.toLowerCase().replace(/^#+/, '');
        const mShort = (m.shortCode || '').toLowerCase().replace(/^#+/, '');
        return mId === target || mShort === target;
      }) ??
      modules[0] ??
      null
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

  // Initial mount flag to prevent unnecessary transition on first load
  const isInitialMount = useRef<boolean>(true);

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

  // Glide to cut position when selectedCutId changes
  useEffect(() => {
    if (selectedCutId) {
      const cut = cuts.find((c) => c.id === selectedCutId);
      if (cut && cut.cameraPosition && cut.cameraTarget) {
        const targetPos = new THREE.Vector3(
          cut.cameraPosition.x,
          cut.cameraPosition.y,
          cut.cameraPosition.z
        );
        const targetLookAt = new THREE.Vector3(
          cut.cameraTarget.x,
          cut.cameraTarget.y,
          cut.cameraTarget.z
        );

        if (isInitialMount.current) {
          isInitialMount.current = false;
          camera.position.copy(targetPos);
          camera.lookAt(targetLookAt);
          camera.rotation.order = 'YXZ';
          yawRef.current = camera.rotation.y;
          pitchRef.current = camera.rotation.x;
          camera.rotation.z = 0;
        } else {
          startTransition(targetPos, targetLookAt, 0.45);
        }
      }
    }
  }, [selectedCutId, cuts, camera, startTransition]);

  // Glide to module overview on module change or camera reset
  useEffect(() => {
    const state = useJLStore.getState();
    if (state.selectedCutId) {
      const activeCut = state.cuts.find((c) => c.id === state.selectedCutId);
      if (
        activeCut &&
        activeCut.moduleId === selectedModuleId &&
        activeCut.cameraPosition &&
        activeCut.cameraTarget
      ) {
        const targetPos = new THREE.Vector3(
          activeCut.cameraPosition.x,
          activeCut.cameraPosition.y,
          activeCut.cameraPosition.z
        );
        const targetLookAt = new THREE.Vector3(
          activeCut.cameraTarget.x,
          activeCut.cameraTarget.y,
          activeCut.cameraTarget.z
        );

        if (isInitialMount.current) {
          isInitialMount.current = false;
          camera.position.copy(targetPos);
          camera.lookAt(targetLookAt);
          camera.rotation.order = 'YXZ';
          yawRef.current = camera.rotation.y;
          pitchRef.current = camera.rotation.x;
          camera.rotation.z = 0;
        } else {
          startTransition(targetPos, targetLookAt, 0.45);
        }
        return;
      }
    }

    const dims = currentModule?.dimensions || { x: 12, y: 12, z: 24 };
    const dimZ = Number(dims.z) || 24;
    const dimY = Number(dims.y) || 12;
    const midZ = dimZ * 0.46;
    const camX = Math.max(18, dimZ * 0.45);
    const camY = Math.max(13, dimY * 1.45);
    const camZ = midZ - dimZ * 0.25;

    const targetPos = new THREE.Vector3(camX, camY, camZ);
    const targetLookAt = new THREE.Vector3(0, 4.2, midZ);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      camera.position.copy(targetPos);
      camera.lookAt(targetLookAt);
      camera.rotation.order = 'YXZ';
      yawRef.current = camera.rotation.y;
      pitchRef.current = camera.rotation.x;
      camera.rotation.z = 0;
    } else {
      startTransition(targetPos, targetLookAt, 0.45);
    }
  }, [
    selectedModuleId,
    cameraResetCounter,
    currentModule,
    camera,
    startTransition,
  ]);

  // Input event listeners (keyboard, right-click look, wheel, pointer lock)
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    // Inject global style rule for guaranteed cursor hiding and center crosshair during free-look without browser pointerLock banner
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      body.free-look-active, body.free-look-active * {
        cursor: none !important;
      }
      body.free-look-active::after {
        content: '';
        position: fixed;
        top: 50%;
        left: 50%;
        width: 14px;
        height: 14px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 9999;
        background:
          linear-gradient(to right, transparent 6px, rgba(255, 255, 255, 0.9) 6px, rgba(255, 255, 255, 0.9) 8px, transparent 8px),
          linear-gradient(to bottom, transparent 6px, rgba(255, 255, 255, 0.9) 6px, rgba(255, 255, 255, 0.9) 8px, transparent 8px);
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.9));
      }
    `;
    document.head.appendChild(styleEl);

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
      document.body.classList.remove('free-look-active');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handlePointerDownEvent = (e: PointerEvent) => {
      if (e.button === 2) {
        // Right click down: initiate free-look, hide cursor & fix center crosshair without browser banner
        transitionRef.current = null;
        isRightMouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        document.body.classList.add('free-look-active');

        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    };

    const handlePointerMoveEvent = (e: PointerEvent) => {
      if (!isRightMouseDown.current) return;

      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const SENSITIVITY = 0.0024;
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

    const handlePointerUpEvent = (e: PointerEvent) => {
      if (e.button === 2) {
        isRightMouseDown.current = false;
        document.body.classList.remove('free-look-active');
        try {
          if (canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
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
    canvas.addEventListener('pointerdown', handlePointerDownEvent);
    window.addEventListener('pointermove', handlePointerMoveEvent);
    window.addEventListener('pointerup', handlePointerUpEvent);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('pointerdown', handlePointerDownEvent);
      window.removeEventListener('pointermove', handlePointerMoveEvent);
      window.removeEventListener('pointerup', handlePointerUpEvent);
      canvas.removeEventListener('wheel', handleWheel);
      document.body.classList.remove('free-look-active');
      styleEl.remove();
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

      camera.position.lerpVectors(startPos, endPos, ease);
      const currentLook = new THREE.Vector3().lerpVectors(
        startLookAt,
        endLookAt,
        ease
      );
      camera.lookAt(currentLook);
      camera.rotation.order = 'YXZ';
      yawRef.current = camera.rotation.y;
      pitchRef.current = camera.rotation.x;
      camera.rotation.z = 0;

      if (t >= 1) {
        transitionRef.current = null;
        camera.position.copy(endPos);
        camera.lookAt(endLookAt);
        camera.rotation.order = 'YXZ';
        yawRef.current = camera.rotation.y;
        pitchRef.current = camera.rotation.x;
        camera.rotation.z = 0;
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

/**
 * Main 3D Voxel Module Renderer:
 * Combines high-performance chunk-merged mesh rendering with Minecraft Spectator controls.
 */
export const VoxelModuleRenderer: React.FC = () => {
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

  const currentModule = useMemo(() => {
    if (!selectedModuleId) return modules[0] ?? null;
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
      }) ??
      modules[0] ??
      null
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

  // Fast Voxel Raycasting: determines the clicked/hovered voxel coordinate from intersection point & normal
  const getVoxelCoordFromHit = useCallback(
    (e: ThreeEvent<any>): Vector3D | null => {
      if (!e.face) return null;
      const hitPos = e.point
        .clone()
        .sub(e.face.normal.clone().multiplyScalar(0.01));
      const bx = Math.round(hitPos.x);
      const by = Math.round(hitPos.y);
      const bz = Math.round(hitPos.z);
      return { x: bx, y: by, z: bz };
    },
    []
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

  if (
    !currentModule ||
    !Array.isArray(currentModule.blocks) ||
    currentModule.blocks.length === 0
  ) {
    return (
      <group>
        <MinecraftSpectatorControls />
        <WorldHtml position={[0, 4, 10]} center>
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-zinc-950/90 px-4 py-2 font-mono text-xs text-emerald-400 shadow-2xl backdrop-blur-md">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Lade 3D-Blöcke für {currentModule?.name || 'Modul'}...</span>
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
          castShadow
          receiveShadow
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
          castShadow
          receiveShadow
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        />
      )}

      {/* Selected Cut Start & End Highlight Plates (in Explore / Admin mode) */}
      {!isSubmitMode && selectedCut && (
        <>
          <mesh
            position={[
              selectedCut.startBlock.x,
              selectedCut.startBlock.y + 0.52,
              selectedCut.startBlock.z,
            ]}
          >
            <boxGeometry args={[1.06, 0.04, 1.06]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
            <Edges color="#67e8f9" threshold={1} />
          </mesh>
          <mesh
            position={[
              selectedCut.endBlock.x,
              selectedCut.endBlock.y + 0.52,
              selectedCut.endBlock.z,
            ]}
          >
            <boxGeometry args={[1.06, 0.04, 1.06]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
            <Edges color="#6ee7b7" threshold={1} />
          </mesh>
        </>
      )}

      {/* Submit Mode: Hover Wireframe Box & Tooltip (Only rendered for the currently hovered block!) */}
      {isSubmitMode && hoveredBlock && (
        <group position={[hoveredBlock.x, hoveredBlock.y, hoveredBlock.z]}>
          <mesh>
            <boxGeometry args={[1.02, 1.02, 1.02]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#22d3ee" />
          </mesh>
          <WorldHtml position={[0, 0.95, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-md border border-cyan-400/50 bg-zinc-950/90 px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow-lg">
              {hoveredBlockLabel} ({hoveredBlock.x}, {hoveredBlock.y},{' '}
              {hoveredBlock.z})
            </div>
          </WorldHtml>
        </group>
      )}

      {/* Submit Mode: Draft Start Marker */}
      {isSubmitMode && draftStartBlock && (
        <group
          position={[
            draftStartBlock.x,
            draftStartBlock.y,
            draftStartBlock.z,
          ]}
        >
          <mesh>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.24}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#34d399" />
          </mesh>
          <WorldHtml position={[0, 1.05, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-950 shadow-lg">
              START ({draftStartBlock.x},{draftStartBlock.y},{draftStartBlock.z})
            </div>
          </WorldHtml>
        </group>
      )}

      {/* Submit Mode: Draft End Marker */}
      {isSubmitMode && draftEndBlock && (
        <group position={[draftEndBlock.x, draftEndBlock.y, draftEndBlock.z]}>
          <mesh>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.24}
              depthWrite={false}
            />
            <Edges scale={1.02} threshold={1} color="#c084fc" />
          </mesh>
          <WorldHtml position={[0, 1.05, 0]} center>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-purple-500/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-lg">
              ZIEL ({draftEndBlock.x},{draftEndBlock.y},{draftEndBlock.z})
            </div>
          </WorldHtml>
        </group>
      )}

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
