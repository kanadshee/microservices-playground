'use client';

import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Activity, Server, Cpu, HardDrive, ShieldCheck, Database, Layers, Radio } from 'lucide-react';
import type { ServiceHealth } from '@micro/shared';

// Type definitions following React Flow v12 best practices
export interface ClientNodeData extends Record<string, unknown> {
  label: string;
  activeRps: number;
  isRunning: boolean;
}
export type ClientNodeType = Node<ClientNodeData, 'clientNode'>;

export interface GatewayNodeData extends Record<string, unknown> {
  label: string;
  port: number;
  rateLimited: boolean;
  isReceiving?: boolean;
}
export type GatewayNodeType = Node<GatewayNodeData, 'gatewayNode'>;

export interface ServiceNodeData extends Record<string, unknown> {
  label: string;
  instanceId: string;
  service: string;
  port: number;
  health?: ServiceHealth;
  isReceiving?: boolean;
  statusCode?: number;
}
export type ServiceNodeType = Node<ServiceNodeData, 'serviceNode'>;

export interface InfraNodeData extends Record<string, unknown> {
  label: string;
  type: 'redis' | 'postgres' | 'worker';
  detail: string;
}
export type InfraNodeType = Node<InfraNodeData, 'infraNode'>;

export const ClientNode = React.memo(function ClientNode({ data, selected }: NodeProps<ClientNodeType>) {
  return (
    <div
      className={`relative rounded-lg border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-md min-w-[190px] transition-all duration-150 ${
        selected ? 'ring-2 ring-ring' : ''
      }`}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-foreground/50 !w-2.5 !h-2.5 !border-background"
      />
      <div className="flex items-center gap-2 mb-1.5">
        <Radio className={`size-4 text-foreground ${data.isRunning ? 'animate-pulse' : ''}`} />
        <span className="font-semibold text-xs tracking-wider uppercase text-foreground">Traffic Source</span>
      </div>
      <div className="text-sm font-bold text-foreground">{data.label}</div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border nodrag nopan">
        <span>Current Rate</span>
        <Badge variant={data.isRunning ? 'default' : 'secondary'} className="text-[10px] h-5">
          {data.activeRps} req/s
        </Badge>
      </div>
    </div>
  );
});

export const GatewayNode = React.memo(function GatewayNode({ data, selected }: NodeProps<GatewayNodeType>) {
  return (
    <div
      className={`relative rounded-lg border p-4 shadow-md backdrop-blur-md min-w-[230px] transition-all duration-200 ${
        data.isReceiving
          ? 'border-ring bg-accent/30 ring-1 ring-ring/50'
          : 'border-border bg-card/95'
      } ${selected ? 'ring-2 ring-ring' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-foreground/50 !w-2.5 !h-2.5 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-foreground/50 !w-2.5 !h-2.5 !border-background"
      />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-foreground" />
          <span className="font-semibold text-xs tracking-wider uppercase text-foreground">API Gateway</span>
        </div>
        <Badge variant="outline" className="text-[10px] nodrag nopan">
          Port {data.port}
        </Badge>
      </div>
      <div className="text-sm font-bold text-foreground">{data.label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">Reverse Proxy · Round-Robin</div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border nodrag nopan">
        <span>Rate Limiter</span>
        <Badge variant={data.rateLimited ? 'destructive' : 'secondary'} className="text-[9px] h-4">
          {data.rateLimited ? 'Active (429)' : 'Disabled'}
        </Badge>
      </div>
    </div>
  );
});

export const ServiceNode = React.memo(function ServiceNode({ data, selected }: NodeProps<ServiceNodeType>) {
  const health = data.health;
  const isDegraded = health?.status === 'degraded';
  const isOffline = health?.status === 'unhealthy';

  const statusColor = isOffline
    ? 'border-destructive/60 bg-destructive/10'
    : isDegraded
    ? 'border-amber-500/60 bg-amber-500/10'
    : 'border-border bg-card/95';

  const glowColor = data.isReceiving
    ? data.statusCode && data.statusCode >= 500
      ? 'ring-1 ring-destructive shadow-md'
      : 'ring-1 ring-ring shadow-md'
    : '';

  return (
    <div
      className={`relative rounded-lg border p-3 shadow-sm backdrop-blur-md min-w-[195px] transition-all duration-200 ${statusColor} ${glowColor} ${
        selected ? 'ring-2 ring-ring' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-foreground/50 !w-2.5 !h-2.5 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-foreground/50 !w-2.5 !h-2.5 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Server className="size-3.5 text-foreground" />
          <span className="font-semibold text-xs tracking-wide text-foreground">{data.label}</span>
        </div>
        <span className="flex items-center gap-1 nodrag nopan">
          <span
            className={`size-2 rounded-full ${
              isOffline
                ? 'bg-destructive animate-pulse'
                : isDegraded
                ? 'bg-amber-500 animate-pulse'
                : 'bg-muted-foreground'
            }`}
          />
          <span className="text-[10px] text-muted-foreground uppercase font-mono">
            :{data.port}
          </span>
        </span>
      </div>

      <div className="text-[10px] font-mono text-muted-foreground mb-2 truncate">
        {data.instanceId}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/60 text-[10px] nodrag nopan">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Cpu className="size-3" />
          <span>{health ? `${health.cpuPercent}%` : '0%'}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <HardDrive className="size-3" />
          <span>{health ? `${health.memoryMb}MB` : '0MB'}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Activity className="size-3" />
          <span>{health ? `${health.activeRequests} active` : '0 active'}</span>
        </div>
        <div className="flex items-center justify-end">
          <Badge
            variant={isOffline ? 'destructive' : isDegraded ? 'secondary' : 'outline'}
            className="text-[9px] h-4 px-1"
          >
            {health?.errorCount || 0} errs
          </Badge>
        </div>
      </div>
    </div>
  );
});

export const InfraNode = React.memo(function InfraNode({ data, selected }: NodeProps<InfraNodeType>) {
  const Icon = data.type === 'redis' ? Layers : data.type === 'postgres' ? Database : HardDrive;
  return (
    <div
      className={`relative rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-sm min-w-[170px] ${
        selected ? 'ring-2 ring-ring' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-foreground/50 !w-2.5 !h-2.5 !border-background"
      />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="size-4 text-foreground" />
        <span className="font-semibold text-xs text-foreground">{data.label}</span>
      </div>
      <div className="text-[10px] text-muted-foreground">{data.detail}</div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60 nodrag nopan">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-muted-foreground" />
          Running
        </span>
      </div>
    </div>
  );
});
