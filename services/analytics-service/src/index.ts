import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  type TelemetryEvent,
  type ServiceHealth,
  type LoadTestConfig,
  type LoadTestProgress,
  type FaultConfig,
  INSTANCE_CONFIGS,
} from '@micro/shared';
import { LoadTestRunner } from 'load-tester';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4041;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

app.use(cors());
app.use(express.json());

// In-memory data structures
const telemetryRing: TelemetryEvent[] = [];
const tracesMap = new Map<string, TelemetryEvent[]>();
const instanceHealthMap = new Map<string, ServiceHealth>();

// Traffic counters for rate calculation
let requestsLastSecond = 0;
let currentRps = 0;
let totalRequestsCounter = 0;
let totalSuccessCounter = 0;
let totalErrorCounter = 0;
const latencyHistory: number[] = [];

// Real-time metric time-series points (for Recharts)
interface MetricPoint {
  time: string;
  timestamp: number;
  rps: number;
  avgLatency: number;
  errorRate: number;
}
const timeSeriesHistory: MetricPoint[] = [];

// Load Test state
let activeRunner: LoadTestRunner | null = null;
let currentLoadProgress: LoadTestProgress = {
  running: false,
  elapsedSeconds: 0,
  totalSeconds: 0,
  currentRps: 0,
  targetRps: 0,
  totalRequestsSent: 0,
  successCount: 0,
  errorCount: 0,
  avgLatencyMs: 0,
  p50: 0,
  p90: 0,
  p95: 0,
  p99: 0,
  activePattern: 'normal',
};

// Periodic 1-second metric calculation tick
setInterval(() => {
  currentRps = requestsLastSecond;
  requestsLastSecond = 0;

  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const recentLatencies = latencyHistory.slice(-50);
  const avgLat = recentLatencies.length > 0 ? Math.round(recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length) : 0;
  const errRate = totalRequestsCounter > 0 ? parseFloat(((totalErrorCounter / totalRequestsCounter) * 100).toFixed(1)) : 0;

  timeSeriesHistory.push({
    time: timeStr,
    timestamp: now,
    rps: currentRps,
    avgLatency: avgLat,
    errorRate: errRate,
  });

  if (timeSeriesHistory.length > 60) {
    timeSeriesHistory.shift();
  }

  // Broadcast metrics over WebSocket
  broadcast({
    type: 'metrics',
    data: {
      rps: currentRps,
      totalRequests: totalRequestsCounter,
      successCount: totalSuccessCounter,
      errorCount: totalErrorCounter,
      errorRate: errRate,
      avgLatencyMs: avgLat,
      activeLoadTest: currentLoadProgress,
      history: timeSeriesHistory,
    },
  });
}, 1000);

// Instance Health Poller (polls all instances every 2 seconds)
async function pollInstanceHealth() {
  for (const item of INSTANCE_CONFIGS) {
    try {
      const res = await fetch(`http://localhost:${item.port}/health`, { signal: AbortSignal.timeout(1200) });
      if (res.ok) {
        const data = (await res.json()) as ServiceHealth;
        instanceHealthMap.set(item.instanceId, data);
      } else {
        instanceHealthMap.set(item.instanceId, {
          service: item.service,
          instanceId: item.instanceId,
          status: 'unhealthy',
          port: item.port,
          cpuPercent: 0,
          memoryMb: 0,
          activeRequests: 0,
          totalRequests: 0,
          errorCount: 0,
          avgLatencyMs: 0,
          uptimeSeconds: 0,
          lastHeartbeat: Date.now(),
        });
      }
    } catch {
      instanceHealthMap.set(item.instanceId, {
        service: item.service,
        instanceId: item.instanceId,
        status: 'unhealthy',
        port: item.port,
        cpuPercent: 0,
        memoryMb: 0,
        activeRequests: 0,
        totalRequests: 0,
        errorCount: 0,
        avgLatencyMs: 0,
        uptimeSeconds: 0,
        lastHeartbeat: Date.now(),
      });
    }
  }

  broadcast({
    type: 'health',
    data: Array.from(instanceHealthMap.values()),
  });
}
setInterval(pollInstanceHealth, 2000);

// Telemetry Ingestion endpoint
app.post('/api/analytics/telemetry', (req: Request, res: Response) => {
  const event = req.body as TelemetryEvent;
  if (!event || !event.requestId) {
    return res.status(400).json({ error: 'Invalid telemetry payload' });
  }

  requestsLastSecond++;
  totalRequestsCounter++;
  if (event.statusCode >= 200 && event.statusCode < 400) {
    totalSuccessCounter++;
  } else {
    totalErrorCounter++;
  }

  if (event.durationMs !== undefined) {
    latencyHistory.push(event.durationMs);
    if (latencyHistory.length > 200) latencyHistory.shift();
  }

  // Ring buffer of last 500 events
  telemetryRing.push(event);
  if (telemetryRing.length > 500) {
    telemetryRing.shift();
  }

  // Group spans into traces map
  const traceList = tracesMap.get(event.requestId) || [];
  traceList.push(event);
  tracesMap.set(event.requestId, traceList);
  if (tracesMap.size > 200) {
    const oldestKey = tracesMap.keys().next().value;
    if (oldestKey) tracesMap.delete(oldestKey);
  }

  // Broadcast immediate real-time event to connected UI clients
  broadcast({
    type: 'telemetry',
    data: event,
  });

  res.status(202).json({ received: true });
});

// REST Endpoints
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    port: PORT,
    eventsCount: telemetryRing.length,
    activeConnections: wss.clients.size,
  });
});

app.get('/api/analytics/metrics', (_req, res) => {
  const recentLatencies = latencyHistory.slice(-50);
  const avgLat = recentLatencies.length > 0 ? Math.round(recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length) : 0;
  const errRate = totalRequestsCounter > 0 ? parseFloat(((totalErrorCounter / totalRequestsCounter) * 100).toFixed(1)) : 0;

  res.json({
    rps: currentRps,
    totalRequests: totalRequestsCounter,
    successCount: totalSuccessCounter,
    errorCount: totalErrorCounter,
    errorRate: errRate,
    avgLatencyMs: avgLat,
    activeLoadTest: currentLoadProgress,
    history: timeSeriesHistory,
    instances: Array.from(instanceHealthMap.values()),
  });
});

app.get('/api/analytics/traces', (_req, res) => {
  res.json({
    total: telemetryRing.length,
    recent: telemetryRing.slice(-100).reverse(),
  });
});

app.get('/api/analytics/traces/:id', (req, res) => {
  const events = tracesMap.get(req.params.id);
  if (!events || events.length === 0) {
    return res.status(404).json({ error: 'Trace not found' });
  }
  res.json({
    requestId: req.params.id,
    events,
  });
});

app.get('/api/analytics/distribution', (_req, res) => {
  const countsByInstance: Record<string, number> = {};
  const countsByService: Record<string, number> = {};

  for (const ev of telemetryRing) {
    countsByInstance[ev.instanceId] = (countsByInstance[ev.instanceId] || 0) + 1;
    countsByService[ev.targetService] = (countsByService[ev.targetService] || 0) + 1;
  }

  res.json({
    byInstance: countsByInstance,
    byService: countsByService,
    total: telemetryRing.length,
  });
});

app.get('/api/analytics/instances', (_req, res) => {
  res.json(Array.from(instanceHealthMap.values()));
});

// Load Testing Controller Endpoints
app.post('/api/analytics/load-test/start', (req, res) => {
  if (activeRunner) {
    activeRunner.stop();
  }

  const config: LoadTestConfig = {
    rps: Number(req.body.rps) || 25,
    durationSeconds: Number(req.body.durationSeconds) || 30,
    concurrency: Number(req.body.concurrency) || 5,
    targetService: req.body.targetService || 'all',
    pattern: req.body.pattern || 'normal',
    spikeMultiplier: req.body.spikeMultiplier || 3,
  };

  activeRunner = new LoadTestRunner(config, GATEWAY_URL, (progress) => {
    currentLoadProgress = progress;
    broadcast({
      type: 'loadtest',
      data: progress,
    });
  });

  activeRunner.start();
  res.json({ success: true, message: 'Load test initiated', config });
});

app.post('/api/analytics/load-test/stop', (_req, res) => {
  if (activeRunner) {
    activeRunner.stop();
    activeRunner = null;
  }
  currentLoadProgress.running = false;
  broadcast({
    type: 'loadtest',
    data: currentLoadProgress,
  });
  res.json({ success: true, message: 'Load test stopped' });
});

app.get('/api/analytics/load-test/status', (_req, res) => {
  res.json(currentLoadProgress);
});

// Fault Injection Dispatcher Endpoint
app.post('/api/analytics/faults', async (req, res) => {
  const fault: FaultConfig = req.body;
  if (!fault.service) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  const targets = INSTANCE_CONFIGS.filter(
    (cfg) => cfg.service === fault.service && (!fault.instanceId || cfg.instanceId === fault.instanceId)
  );

  const results: any[] = [];
  for (const target of targets) {
    try {
      const resp = await fetch(`http://localhost:${target.port}/faults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fault),
      });
      const data = await resp.json();
      results.push({ instanceId: target.instanceId, success: true, data });
    } catch (err: any) {
      results.push({ instanceId: target.instanceId, success: false, error: err.message });
    }
  }

  res.json({ dispatched: targets.length, results });
});

// Predefined Demonstration Scenarios (Scenarios 1 through 8)
app.post('/api/analytics/scenarios/run', async (req, res) => {
  const { scenarioId } = req.body;

  if (activeRunner) {
    activeRunner.stop();
    activeRunner = null;
  }

  switch (scenarioId) {
    case '1-normal': {
      // Normal Operation: 20 RPS, balanced across all services
      const config: LoadTestConfig = {
        rps: 20,
        durationSeconds: 45,
        concurrency: 4,
        targetService: 'all',
        pattern: 'normal',
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();
      return res.json({
        scenario: 'Scenario 1: Normal Operation',
        explanation: 'Sending steady moderate traffic (20 RPS) evenly across services. Observe round-robin load distribution and sub-20ms latencies.',
      });
    }

    case '2-load-balancing': {
      // Load Balancing: send 45 RPS specifically to product-service which has 3 instances
      const config: LoadTestConfig = {
        rps: 45,
        durationSeconds: 45,
        concurrency: 5,
        targetService: 'product-service',
        pattern: 'normal',
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();
      return res.json({
        scenario: 'Scenario 2: Load Balancing Across 3 Instances',
        explanation: 'Directing all traffic to Product Service. Observe NGINX/Gateway distributing requests evenly (~33% each) across product-service-1, product-service-2, and product-service-3.',
      });
    }

    case '3-traffic-spike': {
      // Sudden 3x spike
      const config: LoadTestConfig = {
        rps: 30,
        durationSeconds: 40,
        concurrency: 8,
        targetService: 'all',
        pattern: 'spike',
        spikeMultiplier: 4,
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();
      return res.json({
        scenario: 'Scenario 3: Sudden Traffic Spike',
        explanation: 'Generates sudden 4x traffic surge at the midpoint. Observe latency increases, queue spikes, and throughput scaling.',
      });
    }

    case '4-service-failure': {
      // Injects offline failure into product-service-2
      try {
        await fetch('http://localhost:4012/faults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOffline: true, latencyMs: 0, failureRate: 0 }),
        });
      } catch {}

      // Start traffic to product service
      const config: LoadTestConfig = {
        rps: 30,
        durationSeconds: 35,
        concurrency: 4,
        targetService: 'product-service',
        pattern: 'normal',
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();

      return res.json({
        scenario: 'Scenario 4: Service Instance Failure',
        explanation: 'Simulated failure of product-service-2 (marked offline). Observe HTTP 503/502 errors and the visual red node in architecture diagram.',
      });
    }

    case '5-rate-limiting': {
      // Enable rate limiting on gateway with 30 req/min, then send 60 RPS!
      try {
        await fetch(`${GATEWAY_URL}/api/gateway/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rateLimitEnabled: true, rateLimitPerMinute: 40 }),
        });
      } catch {}

      const config: LoadTestConfig = {
        rps: 40,
        durationSeconds: 25,
        concurrency: 6,
        targetService: 'all',
        pattern: 'normal',
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();

      return res.json({
        scenario: 'Scenario 5: Gateway Rate Limiting',
        explanation: 'Rate limiting enabled at the Gateway (max 40 req/min). Notice requests immediately receiving HTTP 429 Too Many Requests.',
      });
    }

    case '6-slow-service': {
      // Injects 350ms latency into user-service-1
      try {
        await fetch('http://localhost:4001/faults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latencyMs: 350, failureRate: 0, isOffline: false }),
        });
      } catch {}

      const config: LoadTestConfig = {
        rps: 25,
        durationSeconds: 30,
        concurrency: 5,
        targetService: 'user-service',
        pattern: 'normal',
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();

      return res.json({
        scenario: 'Scenario 6: Slow Service / High Latency',
        explanation: 'Injected 350ms artificial latency on user-service-1. Observe high P95 response times and degraded yellow visual state.',
      });
    }

    case '7-cascading-failure': {
      // Degrade product-service with 50% errors and send traffic to order-service
      try {
        await fetch('http://localhost:4011/faults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latencyMs: 100, failureRate: 0.7, isOffline: false }),
        });
      } catch {}

      const config: LoadTestConfig = {
        rps: 25,
        durationSeconds: 35,
        concurrency: 4,
        targetService: 'order-service',
        pattern: 'normal',
      };
      activeRunner = new LoadTestRunner(config, GATEWAY_URL, (p) => {
        currentLoadProgress = p;
        broadcast({ type: 'loadtest', data: p });
      });
      activeRunner.start();

      return res.json({
        scenario: 'Scenario 7: Cascading Downstream Failure',
        explanation: 'Product Service is failing with high error rates. Order Service attempts to call Product Service to check inventory and cascades into HTTP 502 failures.',
      });
    }

    case '8-recovery': {
      // Restore all services to healthy
      for (const item of INSTANCE_CONFIGS) {
        try {
          await fetch(`http://localhost:${item.port}/faults`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latencyMs: 0, failureRate: 0, isOffline: false }),
          });
        } catch {}
      }
      try {
        await fetch(`${GATEWAY_URL}/api/gateway/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rateLimitEnabled: false }),
        });
      } catch {}

      return res.json({
        scenario: 'Scenario 8: System Recovery',
        explanation: 'All faults cleared and rate limiting disabled. System returns to healthy green status with zero errors.',
      });
    }

    default:
      return res.status(400).json({ error: 'Unknown scenario ID' });
  }
});

// Server-Sent Events (SSE) support as alternative to WebSocket
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  sseClients.push(sendEvent);

  req.on('close', () => {
    const idx = sseClients.indexOf(sendEvent);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

const sseClients: ((ev: any) => void)[] = [];

// HTTP & WebSocket Server Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(message: { type: string; data: any }) {
  const payload = JSON.stringify(message);

  // Send to WebSockets
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }

  // Send to SSE
  for (const sendSSE of sseClients) {
    try {
      sendSSE(message);
    } catch {}
  }
}

wss.on('connection', (ws) => {
  // Send initial snapshot
  ws.send(
    JSON.stringify({
      type: 'init',
      data: {
        recentTraces: telemetryRing.slice(-30).reverse(),
        instances: Array.from(instanceHealthMap.values()),
        history: timeSeriesHistory,
        activeLoadTest: currentLoadProgress,
      },
    })
  );
});

server.listen(PORT, () => {
  console.log(`[Analytics Service] Telemetry & Metrics engine listening on port ${PORT}`);
  console.log(`[Analytics Service] Real-time WebSocket ready at ws://localhost:${PORT}`);
  console.log(`[Analytics Service] Server-Sent Events ready at http://localhost:${PORT}/events`);
  pollInstanceHealth();
});
