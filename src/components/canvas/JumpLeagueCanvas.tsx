'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { CameraRig } from './CameraRig';
import { VoxelModuleRenderer } from './VoxelModuleRenderer';
import { CutTrajectories } from './CutTrajectories';

export const JumpLeagueCanvas: React.FC = () => {
  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#09090b] select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [13.5, 11.5, 4.5], fov: 46, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#09090b']} />
        <fog attach="fog" args={['#09090b', 32, 78]} />

        {/* Tactical Studio & Neon Rim Lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[18, 28, 12]}
          intensity={1.55}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <directionalLight
          position={[-14, 12, -10]}
          intensity={0.45}
          color="#38bdf8"
        />
        <pointLight position={[0, 10, 20]} intensity={0.8} color="#10b981" />

        {/* Subtle Dark Tactical Ground Grid */}
        <Grid
          position={[0, -0.01, 10]}
          args={[80, 80]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#18181b"
          sectionSize={5}
          sectionThickness={1.1}
          sectionColor="#27272a"
          fadeDistance={52}
          fadeStrength={1.4}
          infiniteGrid
        />

        <Suspense fallback={null}>
          <CameraRig />
          <VoxelModuleRenderer />
          <CutTrajectories />
        </Suspense>
      </Canvas>
    </div>
  );
};
