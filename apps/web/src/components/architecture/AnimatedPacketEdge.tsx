'use client';

import React from 'react';
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';

export interface AnimatedPacketEdgeData extends Record<string, unknown> {
  isActive?: boolean;
  isError?: boolean;
}
export type AnimatedPacketEdgeType = Edge<AnimatedPacketEdgeData, 'animatedPacket'>;

export const AnimatedPacketEdge = React.memo(function AnimatedPacketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<AnimatedPacketEdgeType>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const isActive = Boolean(data?.isActive);
  const isError = Boolean(data?.isError);
  const strokeColor = isError ? 'var(--destructive)' : isActive ? 'var(--foreground)' : 'var(--border)';
  const packetColor = isError ? 'var(--destructive)' : 'var(--foreground)';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: isActive ? 2 : 1.25,
          transition: 'stroke 0.25s ease, stroke-width 0.25s ease',
        }}
      />

      {/* Animated Traveling Packet when active */}
      {isActive && (
        <circle r="4" fill={packetColor} opacity={0.9}>
          <animateMotion dur="0.8s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
});
