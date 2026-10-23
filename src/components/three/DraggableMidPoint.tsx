'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { WorldHtml } from './WorldHtml';
import { Vector3D } from '@/types/jumpleague';
import { useJLStore } from '@/store/useJLStore';

interface DraggableMidPointProps {
  index: number;
  point: Vector3D;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (nextPt: Vector3D) => void;
}

export const DraggableMidPoint: React.FC<DraggableMidPointProps> = ({
  index,
  point,
  isActive,
  onSelect,
  onUpdate,
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const [targetGroup, setTargetGroup] = useState<THREE.Group | null>(null);
  const transformRef = useRef<TransformControlsImpl>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDirectDragging, setIsDirectDragging] = useState(false);

  const { camera, gl } = useThree();
  const setIsDraggingInScene = useJLStore((s) => s.setIsDraggingInScene);

  const setGroupRef = useCallback((node: THREE.Group | null) => {
    groupRef.current = node;
    setTargetGroup(node);
  }, []);

  // Sync group position when point prop changes (unless currently being manipulated by TransformControls)
  useEffect(() => {
    if (groupRef.current && !isDirectDragging) {
      groupRef.current.position.set(point.x, point.y, point.z);
    }
  }, [point.x, point.y, point.z, isDirectDragging]);

  // Handle direct mouse drag on the sphere via camera-facing plane projection
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return; // Left mouse button only
    e.stopPropagation();
    onSelect();

    setIsDraggingInScene(true);
    setIsDirectDragging(true);

    // Create a camera-facing plane coplanar with the current point
    const plane = new THREE.Plane();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection).negate();
    plane.setFromNormalAndCoplanarPoint(
      cameraDirection,
      new THREE.Vector3(point.x, point.y, point.z)
    );

    const onPointerMove = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        const nextX = Number(intersection.x.toFixed(1));
        const nextY = Number(intersection.y.toFixed(1));
        const nextZ = Number(intersection.z.toFixed(1));

        if (groupRef.current) {
          groupRef.current.position.set(nextX, nextY, nextZ);
        }
        onUpdate({ x: nextX, y: nextY, z: nextZ });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDirectDragging(false);
      setIsDraggingInScene(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Handle 3D Gizmo axis translation (X, Y, Z arrow drags)
  const handleTransformChange = useCallback(() => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    onUpdate({
      x: Number(pos.x.toFixed(1)),
      y: Number(pos.y.toFixed(1)),
      z: Number(pos.z.toFixed(1)),
    });
  }, [onUpdate]);

  return (
    <>
      {/* 3D TransformControls Gizmo for active point (arrows for X, Y, and especially Z) */}
      {isActive && targetGroup && (
        <TransformControls
          ref={transformRef}
          object={targetGroup}
          mode="translate"
          size={0.65}
          space="world"
          onMouseDown={() => setIsDraggingInScene(true)}
          onMouseUp={() => setIsDraggingInScene(false)}
          onObjectChange={handleTransformChange}
        />
      )}

      {/* Waypoint Group with Mesh & Info Tag */}
      <group
        ref={setGroupRef}
        position={[point.x, point.y, point.z]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {/* Interactive Clickable & Draggable Sphere */}
        <mesh
          scale={isHovered || isDirectDragging ? 1.25 : isActive ? 1.15 : 1.0}
          onPointerDown={handlePointerDown}
          onPointerOver={(e) => {
            e.stopPropagation();
            setIsHovered(true);
            document.body.style.cursor = 'grab';
          }}
          onPointerOut={() => {
            setIsHovered(false);
            if (!isDirectDragging) {
              document.body.style.cursor = 'auto';
            }
          }}
        >
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshStandardMaterial
            color={
              isDirectDragging
                ? '#facc15'
                : isActive
                ? '#38bdf8'
                : '#06b6d4'
            }
            emissive={
              isDirectDragging
                ? '#eab308'
                : isActive
                ? '#0284c7'
                : '#06b6d4'
            }
            emissiveIntensity={isHovered || isDirectDragging || isActive ? 1.2 : 0.75}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>

        {/* Outer Halo Ring for Active / Hovered state */}
        {(isActive || isHovered || isDirectDragging) && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.34, 0.42, 32]} />
            <meshBasicMaterial
              color={isDirectDragging ? '#facc15' : '#38bdf8'}
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
            />
          </mesh>
        )}

        {/* Tactical Info Badge */}
        <WorldHtml position={[0, 0.52, 0]} center>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`pointer-events-auto cursor-pointer whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold shadow-lg transition-all select-none ${
              isDirectDragging
                ? 'bg-amber-400 text-zinc-950 ring-2 ring-amber-300 scale-105'
                : isActive
                ? 'bg-cyan-400 text-zinc-950 ring-2 ring-cyan-200'
                : 'bg-cyan-500/90 text-zinc-950 hover:bg-cyan-400'
            }`}
            title="Klicken zum Auswählen • Mit der Maus im 3D-Raum ziehen"
          >
            NEO #{index + 1} ({point.x.toFixed(1)}, {point.y.toFixed(1)},{' '}
            {point.z.toFixed(1)})
          </div>
        </WorldHtml>
      </group>
    </>
  );
};
