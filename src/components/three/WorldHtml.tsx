'use client';

import React, { createContext, useContext } from 'react';
import { Html } from '@react-three/drei';

export const HtmlPortalContext =
  createContext<React.RefObject<HTMLElement> | null>(null);

interface WorldHtmlProps {
  position?: [number, number, number];
  center?: boolean;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  children: React.ReactNode;
}

/**
 * Wraps @react-three/drei's <Html> with a stable sibling portal ref outside <Canvas>.
 * This keeps HTML elements inside @react-three/drei's <Html> (preventing R3F THREE.Span errors)
 * while keeping the DOM portal target stable outside R3F's <Canvas> div (preventing removeChild errors).
 */
export const WorldHtml: React.FC<WorldHtmlProps> = ({
  position = [0, 0, 0],
  center = true,
  distanceFactor,
  zIndexRange = [20, 0],
  children,
}) => {
  const portalRef = useContext(HtmlPortalContext);

  return (
    <Html
      position={position}
      center={center}
      distanceFactor={distanceFactor}
      zIndexRange={zIndexRange}
      portal={portalRef ?? undefined}
    >
      {children}
    </Html>
  );
};
