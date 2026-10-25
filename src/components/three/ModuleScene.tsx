'use client';

import React, { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Grid, Stars } from '@react-three/drei';
import { VoxelRenderer } from './VoxelRenderer';
import { CutTrajectories } from './CutTrajectories';
import { HtmlPortalContext } from './WorldHtml';
import { useJLStore } from '@/store/useJLStore';

export const ModuleScene: React.FC = () => {
  const showCutLines = useJLStore((s) => s.showCutLines);
  const htmlPortalRef = useRef<HTMLDivElement>(null!);

  return (
    <div
      className="fixed inset-0 h-screen w-screen bg-[#1c202d] select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Dedicated Sibling Portal Container outside <Canvas> for @react-three/drei <Html> badges */}
      <div
        ref={htmlPortalRef}
        className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
      />

      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: [21, 14.5, 9.5], fov: 46, near: 0.1, far: 250 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onContextMenu={(e) => e.preventDefault()}
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
            <VoxelRenderer />
            {showCutLines && <CutTrajectories />}
          </Suspense>
        </HtmlPortalContext.Provider>
      </Canvas>
    </div>
  );
};
