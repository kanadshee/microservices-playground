import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ServiceHealth, FaultConfig, TelemetryEvent, TraceSpan } from './index.js';

export interface ServiceState {
  service: string;
  instanceId: string;
  port: number;
  totalRequests: number;
  errorCount: number;
  activeRequests: number;
  latencies: number[];
  startTime: number;
  faults: FaultConfig;
}

export function createServiceState(service: string, instanceId: string, port: number): ServiceState {
  return {
    service,
    instanceId,
    port,
    totalRequests: 0,
    errorCount: 0,
    activeRequests: 0,
    latencies: [],
    startTime: Date.now(),
    faults: {
      service,
      instanceId,
      latencyMs: 0,
      failureRate: 0,
      isOffline: false,
    },
  };
}

export function getServiceHealth(state: ServiceState): ServiceHealth {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  const avgLatency =
    state.latencies.length > 0
      ? Math.round(state.latencies.reduce((a, b) => a + b, 0) / state.latencies.length)
      : 0;

  // Derive CPU estimate using active requests and fault state
  const baseCpu = 2.5;
  const loadCpu = Math.min(95, baseCpu + state.activeRequests * 4.2 + (state.faults.latencyMs > 0 ? 15 : 0));
  const cpuPercent = parseFloat(loadCpu.toFixed(1));

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (state.faults.isOffline) {
    status = 'unhealthy';
  } else if (state.faults.failureRate > 0 || state.faults.latencyMs > 200 || state.errorCount > 20) {
    status = 'degraded';
  }

  return {
    service: state.service,
    instanceId: state.instanceId,
    status,
    port: state.port,
    cpuPercent,
    memoryMb: Math.round(mem.rss / (1024 * 1024)),
    activeRequests: state.activeRequests,
    totalRequests: state.totalRequests,
    errorCount: state.errorCount,
    avgLatencyMs: avgLatency,
    uptimeSeconds,
    lastHeartbeat: Date.now(),
  };
}

export function createServiceMiddleware(
  state: ServiceState,
  onTelemetry?: (event: TelemetryEvent) => void
): any {
  return (req: any, res: any, next: any): void => {
    // Skip health/fault endpoints from load accounting
    if (req.path === '/health' || req.path === '/faults') {
      next();
      return;
    }

    void (async () => {
      // 1. Check if instance is marked offline
      if (state.faults.isOffline) {
        state.totalRequests++;
        state.errorCount++;
        res.setHeader('X-Upstream-Instance', state.instanceId);
        res.status(503).json({
          error: 'Service Unavailable (Fault Injected: Offline)',
          service: state.service,
          instanceId: state.instanceId,
        });
        return;
      }

      // 2. Artificial latency injection
      if (state.faults.latencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, state.faults.latencyMs));
      }

      // 3. Artificial error rate injection
      if (state.faults.failureRate > 0 && Math.random() < state.faults.failureRate) {
        state.totalRequests++;
        state.errorCount++;
        res.setHeader('X-Upstream-Instance', state.instanceId);
        res.status(500).json({
          error: 'Internal Server Error (Fault Injected: Simulated Error)',
          service: state.service,
          instanceId: state.instanceId,
        });
        return;
      }

      // 4. Request tracing & header stamping
      const requestId =
        (req.headers['x-request-id'] as string) ||
        `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Upstream-Instance', state.instanceId);

      const startTime = Date.now();
      state.activeRequests++;
      state.totalRequests++;

      const spanId = `span-${Math.random().toString(36).substring(2, 9)}`;
      const span: TraceSpan = {
        spanId,
        parentSpanId: req.headers['x-parent-span-id'] as string | undefined,
        service: state.service,
        instanceId: state.instanceId,
        operation: `${req.method} ${req.path}`,
        startTime,
        durationMs: 0,
        statusCode: 200,
      };

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        state.activeRequests = Math.max(0, state.activeRequests - 1);
        state.latencies.push(duration);
        if (state.latencies.length > 50) state.latencies.shift();

        if (res.statusCode >= 400) {
          state.errorCount++;
        }

        span.durationMs = duration;
        span.statusCode = res.statusCode;

        if (onTelemetry) {
          onTelemetry({
            id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            requestId,
            timestamp: Date.now(),
            method: req.method,
            path: req.originalUrl || req.url,
            targetService: state.service,
            instanceId: state.instanceId,
            statusCode: res.statusCode,
            durationMs: duration,
            upstreamDurationMs: duration,
            spans: [span],
            clientIp: req.ip,
          });
        }
      });

      next();
    })();
  };
}
