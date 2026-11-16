export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  service: string;
  instanceId: string;
  operation: string;
  startTime: number;
  durationMs: number;
  statusCode: number;
  metadata?: Record<string, any>;
}

export interface TelemetryEvent {
  id: string;
  requestId: string;
  timestamp: number;
  method: string;
  path: string;
  targetService: string;
  instanceId: string;
  statusCode: number;
  durationMs: number;
  upstreamDurationMs: number;
  error?: string;
  spans?: TraceSpan[];
  clientIp?: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServiceHealth {
  service: string;
  instanceId: string;
  status: HealthStatus;
  port: number;
  cpuPercent: number;
  memoryMb: number;
  activeRequests: number;
  totalRequests: number;
  errorCount: number;
  avgLatencyMs: number;
  uptimeSeconds: number;
  lastHeartbeat: number;
}

export type TrafficPattern =
  | 'normal'
  | 'burst'
  | 'ramp-up'
  | 'spike'
  | 'single-service'
  | 'uneven'
  | 'mixed';

export interface LoadTestConfig {
  rps: number;
  durationSeconds: number;
  concurrency: number;
  targetService: 'all' | 'user-service' | 'product-service' | 'order-service' | 'notification-service';
  pattern: TrafficPattern;
  spikeMultiplier?: number;
}

export interface LoadTestProgress {
  running: boolean;
  testId?: string;
  startTime?: number;
  elapsedSeconds: number;
  totalSeconds: number;
  currentRps: number;
  targetRps: number;
  totalRequestsSent: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  activePattern: TrafficPattern;
}

export interface FaultConfig {
  service: string;
  instanceId?: string;
  latencyMs: number;
  failureRate: number;
  isOffline: boolean;
}

export interface GatewayRateLimitConfig {
  enabled: boolean;
  limitPerMinute: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'vendor';
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  recipient: string;
  message: string;
  status: 'sent' | 'failed';
  createdAt: string;
}

export interface WorkerJob {
  id: string;
  type: string;
  payload: any;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export const INSTANCE_CONFIGS = [
  { service: 'user-service', instanceId: 'user-service-1', port: 4001 },
  { service: 'user-service', instanceId: 'user-service-2', port: 4002 },
  { service: 'product-service', instanceId: 'product-service-1', port: 4011 },
  { service: 'product-service', instanceId: 'product-service-2', port: 4012 },
  { service: 'product-service', instanceId: 'product-service-3', port: 4013 },
  { service: 'order-service', instanceId: 'order-service-1', port: 4021 },
  { service: 'order-service', instanceId: 'order-service-2', port: 4022 },
  { service: 'notification-service', instanceId: 'notification-service-1', port: 4031 },
  { service: 'notification-service', instanceId: 'notification-service-2', port: 4032 },
  { service: 'analytics-service', instanceId: 'analytics-service-1', port: 4041 },
  { service: 'worker-service', instanceId: 'worker-service-1', port: 4051 },
] as const;

export const GATEWAY_PORT = 8080;
export const ANALYTICS_PORT = 4041;

export * from './middleware.js';

