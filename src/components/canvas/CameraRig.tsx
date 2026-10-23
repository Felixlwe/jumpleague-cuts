'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraControls } from '@react-three/drei';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';

export const CameraRig: React.FC = () => {
  const controlsRef = useRef<CameraControls | null>(null);

  const selectedCutId = useJumpLeagueStore((s) => s.selectedCutId);
  const selectedModuleId = useJumpLeagueStore((s) => s.selectedModuleId);
  const cameraResetCounter = useJumpLeagueStore((s) => s.cameraResetCounter);
  const cuts = useJumpLeagueStore((s) => s.cuts);
  const setLiveCameraState = useJumpLeagueStore((s) => s.setLiveCameraState);

  // Smoothly glide to selected Cut perspective
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
        return;
      }
    }
  }, [selectedCutId, cuts]);

  // Smoothly reset to module overview when module changes or reset button is clicked
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.smoothTime = 0.35;

    // If a cut is actively selected right on module load, let the cut effect handle it
    const state = useJumpLeagueStore.getState();
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

    // Default overview camera framing the full module length (Z: 0..21)
    void controls.setLookAt(13.5, 11.5, 4.5, 0.5, 4.5, 10.5, true);
  }, [selectedModuleId, cameraResetCounter]);

  const syncLiveCamera = () => {
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
      smoothTime={0.35}
      minDistance={2.5}
      maxDistance={42}
      maxPolarAngle={Math.PI / 2 + 0.15}
      onEnd={syncLiveCamera}
    />
  );
};
