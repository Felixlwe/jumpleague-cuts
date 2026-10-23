'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Grid, Stars } from '@react-three/drei';
import { VoxelRenderer } from './VoxelRenderer';
import { CutTrajectories } from './CutTrajectories';
import { HtmlPortalContext } from './WorldHtml';
import { useJLStore } from '@/store/useJLStore';

const SceneCameraController: React.FC = () => {
  const controlsRef = useRef<CameraControls | null>(null);

  const modules = useJLStore((s) => s.modules);
  const selectedModuleId = useJLStore((s) => s.selectedModuleId);
  const selectedCutId = useJLStore((s) => s.selectedCutId);
  const cameraResetCounter = useJLStore((s) => s.cameraResetCounter);
  const cuts = useJLStore((s) => s.cuts);
  const isDraggingInScene = useJLStore((s) => s.isDraggingInScene);
  const setLiveCameraState = useJLStore((s) => s.setLiveCameraState);

  const currentModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) ?? modules[0],
    [modules, selectedModuleId]
  );

  // Smoothly glide via setLookAt (smoothTime = 0.35) when a Cut is selected
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.smoothTime = 0.35;

    if (selectedCutId) {
      const cut = cuts.find((c) => c.id === selectedCutId);
      if (cut) {
        const { cameraPosition: pos, cameraTarget: target } = cut;
        void controls.setLookAt(
          pos.x,
          pos.y,
          pos.z,
          target.x,
          target.y,
          target.z,
          true
        );
      }
    }
  }, [selectedCutId, cuts]);

  // Smoothly frame the full module overview on module change or camera reset
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.smoothTime = 0.35;

    const state = useJLStore.getState();
    if (state.selectedCutId) {
      const activeCut = state.cuts.find((c) => c.id === state.selectedCutId);
      if (activeCut && activeCut.moduleId === selectedModuleId) {
        void controls.setLookAt(
          activeCut.cameraPosition.x,
          activeCut.cameraPosition.y,
          activeCut.cameraPosition.z,
          activeCut.cameraTarget.x,
          activeCut.cameraTarget.y,
          activeCut.cameraTarget.z,
          true
        );
        return;
      }
    }

    const midZ = currentModule.dimensions.z * 0.46;
    const camX = Math.max(18, currentModule.dimensions.z * 0.45);
    const camY = Math.max(13, currentModule.dimensions.y * 1.45);
    const camZ = midZ - currentModule.dimensions.z * 0.25;

    void controls.setLookAt(camX, camY, camZ, 0, 4.2, midZ, true);
  }, [selectedModuleId, cameraResetCounter, currentModule]);

  const handleControlEnd = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    controls.getPosition(pos);
    controls.getTarget(target);
    setLiveCameraState(
      { x: pos.x, y: pos.y, z: pos.z },
      { x: target.x, y: target.y, z: target.z }
    );
  };

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={!isDraggingInScene}
      smoothTime={0.35}
      minDistance={2.5}
      maxDistance={65}
      maxPolarAngle={Math.PI / 2 + 0.15}
      onEnd={handleControlEnd}
    />
  );
};

export const ModuleScene: React.FC = () => {
  const showCutLines = useJLStore((s) => s.showCutLines);
  const htmlPortalRef = useRef<HTMLDivElement>(null!);

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#1c202d] select-none">
      {/* Dedicated Sibling Portal Container outside <Canvas> for @react-three/drei <Html> badges */}
      <div
        ref={htmlPortalRef}
        className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
      />

      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        camera={{ position: [21, 14.5, 9.5], fov: 46, near: 0.1, far: 250 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Lighter, atmospheric twilight sky & haze */}
        <color attach="background" args={['#1c202d']} />
        <fog attach="fog" args={['#1c202d', 46, 120]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.88} />
        <hemisphereLight args={['#93c5fd', '#1c202d', 0.6]} />
        <directionalLight
          position={[24, 34, 20]}
          intensity={1.65}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <directionalLight
          position={[-18, 14, -8]}
          intensity={0.5}
          color="#38bdf8"
        />
        <pointLight position={[0, 12, 44]} intensity={0.9} color="#10b981" />

        {/* Subtle, soft atmospheric stars */}
        <Stars
          radius={95}
          depth={50}
          count={800}
          factor={2.8}
          saturation={0.5}
          fade
          speed={0.6}
        />

        {/* Refined Tactical Ground Grid */}
        <Grid
          position={[0, -0.01, 22]}
          args={[120, 120]}
          cellSize={1}
          cellThickness={0.7}
          cellColor="#2c3347"
          sectionSize={5}
          sectionThickness={1.2}
          sectionColor="#434d66"
          fadeDistance={75}
          fadeStrength={1.2}
          infiniteGrid
        />

        <HtmlPortalContext.Provider value={htmlPortalRef}>
          <Suspense fallback={null}>
            <SceneCameraController />
            <VoxelRenderer />
            {showCutLines && <CutTrajectories />}
          </Suspense>
        </HtmlPortalContext.Provider>
      </Canvas>
    </div>
  );
};
