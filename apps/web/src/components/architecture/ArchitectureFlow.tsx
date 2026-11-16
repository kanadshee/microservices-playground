'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import { ClientNode, GatewayNode, ServiceNode, InfraNode } from './CustomNodes';
import { AnimatedPacketEdge } from './AnimatedPacketEdge';
import type { TelemetryEvent, ServiceHealth } from '@micro/shared';

// Stable nodeTypes and edgeTypes defined outside component
const nodeTypes: NodeTypes = {
  clientNode: ClientNode,
  gatewayNode: GatewayNode,
  serviceNode: ServiceNode,
  infraNode: InfraNode,
};

const edgeTypes: EdgeTypes = {
  animatedPacket: AnimatedPacketEdge,
};

interface ArchitectureFlowProps {
  instances: Record<string, ServiceHealth>;
  latestEvent: TelemetryEvent | null;
  activeRps: number;
  isRunning: boolean;
}

function ArchitectureFlowInner({
  instances,
  latestEvent,
  activeRps,
  isRunning,
}: ArchitectureFlowProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [lastStatusCode, setLastStatusCode] = useState<number>(200);

  // Trigger pulse animation when a telemetry event arrives
  useEffect(() => {
    if (!latestEvent) return;

    const target = latestEvent.instanceId;
    const raf = requestAnimationFrame(() => {
      setActiveNodeId(target);
      setLastStatusCode(latestEvent.statusCode);
      setActiveEdgeId(`edge-gw-${target}`);
    });

    const timer = setTimeout(() => {
      setActiveEdgeId(null);
      setActiveNodeId(null);
    }, 700);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [latestEvent]);

  // Dynamic React Flow Nodes computed from real-time telemetry state
  const nodes: Node[] = useMemo(() => {
    return [
      // Client / Load Generator
      {
        id: 'client',
        type: 'clientNode',
        position: { x: 40, y: 560 },
        data: {
          label: 'Client / Load Generator',
          activeRps,
          isRunning,
        },
      },
      // NGINX API Gateway
      {
        id: 'gateway',
        type: 'gatewayNode',
        position: { x: 280, y: 540 },
        data: {
          label: 'NGINX API Gateway',
          port: 8080,
          rateLimited: latestEvent?.statusCode === 429,
          isReceiving: Boolean(activeEdgeId),
        },
      },
      // User Service instances (spaced with 160px step)
      {
        id: 'user-service-1',
        type: 'serviceNode',
        position: { x: 580, y: 30 },
        data: {
          label: 'User Service 1',
          instanceId: 'user-service-1',
          service: 'user-service',
          port: 4001,
          health: instances['user-service-1'],
          isReceiving: activeNodeId === 'user-service-1',
          statusCode: lastStatusCode,
        },
      },
      {
        id: 'user-service-2',
        type: 'serviceNode',
        position: { x: 580, y: 190 },
        data: {
          label: 'User Service 2',
          instanceId: 'user-service-2',
          service: 'user-service',
          port: 4002,
          health: instances['user-service-2'],
          isReceiving: activeNodeId === 'user-service-2',
          statusCode: lastStatusCode,
        },
      },
      // Product Service instances (domain group break at y: 380)
      {
        id: 'product-service-1',
        type: 'serviceNode',
        position: { x: 580, y: 380 },
        data: {
          label: 'Product Service 1',
          instanceId: 'product-service-1',
          service: 'product-service',
          port: 4011,
          health: instances['product-service-1'],
          isReceiving: activeNodeId === 'product-service-1',
          statusCode: lastStatusCode,
        },
      },
      {
        id: 'product-service-2',
        type: 'serviceNode',
        position: { x: 580, y: 540 },
        data: {
          label: 'Product Service 2',
          instanceId: 'product-service-2',
          service: 'product-service',
          port: 4012,
          health: instances['product-service-2'],
          isReceiving: activeNodeId === 'product-service-2',
          statusCode: lastStatusCode,
        },
      },
      {
        id: 'product-service-3',
        type: 'serviceNode',
        position: { x: 580, y: 700 },
        data: {
          label: 'Product Service 3',
          instanceId: 'product-service-3',
          service: 'product-service',
          port: 4013,
          health: instances['product-service-3'],
          isReceiving: activeNodeId === 'product-service-3',
          statusCode: lastStatusCode,
        },
      },
      // Order Service instances (domain group break at y: 890)
      {
        id: 'order-service-1',
        type: 'serviceNode',
        position: { x: 580, y: 890 },
        data: {
          label: 'Order Service 1',
          instanceId: 'order-service-1',
          service: 'order-service',
          port: 4021,
          health: instances['order-service-1'],
          isReceiving: activeNodeId === 'order-service-1',
          statusCode: lastStatusCode,
        },
      },
      {
        id: 'order-service-2',
        type: 'serviceNode',
        position: { x: 580, y: 1050 },
        data: {
          label: 'Order Service 2',
          instanceId: 'order-service-2',
          service: 'order-service',
          port: 4022,
          health: instances['order-service-2'],
          isReceiving: activeNodeId === 'order-service-2',
          statusCode: lastStatusCode,
        },
      },
      // Notification Service instances (domain group break at y: 1240)
      {
        id: 'notification-service-1',
        type: 'serviceNode',
        position: { x: 580, y: 1240 },
        data: {
          label: 'Notification 1',
          instanceId: 'notification-service-1',
          service: 'notification-service',
          port: 4031,
          health: instances['notification-service-1'],
          isReceiving: activeNodeId === 'notification-service-1',
          statusCode: lastStatusCode,
        },
      },
      {
        id: 'notification-service-2',
        type: 'serviceNode',
        position: { x: 580, y: 1400 },
        data: {
          label: 'Notification 2',
          instanceId: 'notification-service-2',
          service: 'notification-service',
          port: 4032,
          health: instances['notification-service-2'],
          isReceiving: activeNodeId === 'notification-service-2',
          statusCode: lastStatusCode,
        },
      },
      // Databases and Background Workers
      {
        id: 'postgres',
        type: 'infraNode',
        position: { x: 900, y: 100 },
        data: {
          label: 'PostgreSQL DB',
          type: 'postgres',
          detail: 'Port 5432 · Relational persistence',
        },
      },
      {
        id: 'redis',
        type: 'infraNode',
        position: { x: 900, y: 780 },
        data: {
          label: 'Redis Cache & Queue',
          type: 'redis',
          detail: 'Port 6379 · Distributed lock & buffer',
        },
      },
      {
        id: 'worker-service',
        type: 'infraNode',
        position: { x: 900, y: 1020 },
        data: {
          label: 'Background Worker',
          type: 'worker',
          detail: 'Port 4051 · Asynchronous processing',
        },
      },
      {
        id: 'analytics-service',
        type: 'infraNode',
        position: { x: 900, y: 1280 },
        data: {
          label: 'Analytics & Tracing',
          type: 'redis',
          detail: 'Port 4041 · Real-time telemetry pipeline',
        },
      },
    ];
  }, [instances, activeRps, isRunning, activeNodeId, lastStatusCode, activeEdgeId, latestEvent]);

  // Edges connecting components with active packet states
  const edges: Edge[] = useMemo(() => {
    const isError = lastStatusCode >= 400;

    return [
      // Client -> Gateway
      {
        id: 'edge-client-gw',
        source: 'client',
        target: 'gateway',
        type: 'animatedPacket',
        data: { isActive: isRunning || activeRps > 0, isError: false },
      },
      // Gateway -> User Services
      {
        id: 'edge-gw-user-service-1',
        source: 'gateway',
        target: 'user-service-1',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-user-service-1', isError },
      },
      {
        id: 'edge-gw-user-service-2',
        source: 'gateway',
        target: 'user-service-2',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-user-service-2', isError },
      },
      // Gateway -> Product Services
      {
        id: 'edge-gw-product-service-1',
        source: 'gateway',
        target: 'product-service-1',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-product-service-1', isError },
      },
      {
        id: 'edge-gw-product-service-2',
        source: 'gateway',
        target: 'product-service-2',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-product-service-2', isError },
      },
      {
        id: 'edge-gw-product-service-3',
        source: 'gateway',
        target: 'product-service-3',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-product-service-3', isError },
      },
      // Gateway -> Order Services
      {
        id: 'edge-gw-order-service-1',
        source: 'gateway',
        target: 'order-service-1',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-order-service-1', isError },
      },
      {
        id: 'edge-gw-order-service-2',
        source: 'gateway',
        target: 'order-service-2',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-order-service-2', isError },
      },
      // Gateway -> Notification Services
      {
        id: 'edge-gw-notification-service-1',
        source: 'gateway',
        target: 'notification-service-1',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-notification-service-1', isError },
      },
      {
        id: 'edge-gw-notification-service-2',
        source: 'gateway',
        target: 'notification-service-2',
        type: 'animatedPacket',
        data: { isActive: activeEdgeId === 'edge-gw-notification-service-2', isError },
      },
      // Inter-service & storage edges
      {
        id: 'edge-user-db',
        source: 'user-service-1',
        target: 'postgres',
        type: 'animatedPacket',
        data: { isActive: false, isError: false },
      },
      {
        id: 'edge-order-redis',
        source: 'order-service-1',
        target: 'redis',
        type: 'animatedPacket',
        data: { isActive: false, isError: false },
      },
      {
        id: 'edge-redis-worker',
        source: 'redis',
        target: 'worker-service',
        type: 'animatedPacket',
        data: { isActive: true, isError: false },
      },
    ];
  }, [activeEdgeId, isRunning, activeRps, lastStatusCode]);

  return (
    <div
      className="w-full h-[660px] rounded-xl border border-border bg-card/40 overflow-hidden relative shadow-inner"
      style={{ height: '660px', width: '100%', minHeight: '660px' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={isDark ? 'dark' : 'light'}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.25}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background
          gap={18}
          size={1}
          color={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
        />
        <Controls className="!bg-card !border-border !rounded-md" />
      </ReactFlow>
    </div>
  );
}

export function ArchitectureFlow(props: ArchitectureFlowProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureFlowInner {...props} />
    </ReactFlowProvider>
  );
}
