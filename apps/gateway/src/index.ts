import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import httpProxy from 'http-proxy';
import http from 'http';
import type { TelemetryEvent, TraceSpan } from '@micro/shared';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://localhost:4041';

app.use(cors());

// Proxy instance
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true,
});

interface UpstreamInstance {
  instanceId: string;
  url: string;
}

const upstreamRegistry: Record<string, UpstreamInstance[]> = {
  users: [
    { instanceId: 'user-service-1', url: process.env.USER_SERVICE_1_URL || 'http://localhost:4001' },
    { instanceId: 'user-service-2', url: process.env.USER_SERVICE_2_URL || 'http://localhost:4002' },
  ],
  products: [
    { instanceId: 'product-service-1', url: process.env.PRODUCT_SERVICE_1_URL || 'http://localhost:4011' },
    { instanceId: 'product-service-2', url: process.env.PRODUCT_SERVICE_2_URL || 'http://localhost:4012' },
    { instanceId: 'product-service-3', url: process.env.PRODUCT_SERVICE_3_URL || 'http://localhost:4013' },
  ],
  orders: [
    { instanceId: 'order-service-1', url: process.env.ORDER_SERVICE_1_URL || 'http://localhost:4021' },
    { instanceId: 'order-service-2', url: process.env.ORDER_SERVICE_2_URL || 'http://localhost:4022' },
  ],
  notifications: [
    { instanceId: 'notification-service-1', url: process.env.NOTIFICATION_SERVICE_1_URL || 'http://localhost:4031' },
    { instanceId: 'notification-service-2', url: process.env.NOTIFICATION_SERVICE_2_URL || 'http://localhost:4032' },
  ],
  analytics: [
    { instanceId: 'analytics-service-1', url: ANALYTICS_URL },
  ],
};

const roundRobinIndexes: Record<string, number> = {
  users: 0,
  products: 0,
  orders: 0,
  notifications: 0,
  analytics: 0,
};

// Rate limiting state
let rateLimitEnabled = false;
let rateLimitPerMinute = 120; // default 120 req/min
const clientRequestCounts: Map<string, { count: number; windowStart: number }> = new Map();

function checkRateLimit(clientIp: string): boolean {
  if (!rateLimitEnabled) return true;

  const now = Date.now();
  const entry = clientRequestCounts.get(clientIp) || { count: 0, windowStart: now };

  if (now - entry.windowStart > 60000) {
    entry.count = 1;
    entry.windowStart = now;
    clientRequestCounts.set(clientIp, entry);
    return true;
  }

  entry.count++;
  clientRequestCounts.set(clientIp, entry);

  return entry.count <= rateLimitPerMinute;
}

// Gateway Config endpoint
app.get('/api/gateway/config', (_req, res) => {
  res.json({
    port: PORT,
    rateLimitEnabled,
    rateLimitPerMinute,
    upstreams: upstreamRegistry,
  });
});

app.post('/api/gateway/config', express.json(), (req, res) => {
  if (typeof req.body.rateLimitEnabled === 'boolean') {
    rateLimitEnabled = req.body.rateLimitEnabled;
  }
  if (typeof req.body.rateLimitPerMinute === 'number') {
    rateLimitPerMinute = req.body.rateLimitPerMinute;
  }
  res.json({
    success: true,
    rateLimitEnabled,
    rateLimitPerMinute,
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', gateway: 'NGINX/Node-ReverseProxy', port: PORT, uptime: process.uptime() });
});

// Forwarding handler
function routeToService(serviceKey: string, serviceName: string) {
  return (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId =
      (req.headers['x-request-id'] as string) ||
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // 1. Rate limiting check
    if (!checkRateLimit(clientIp)) {
      const durationMs = Date.now() - startTime;
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded by NGINX API Gateway',
        requestId,
      });

      sendTelemetry({
        id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        requestId,
        timestamp: Date.now(),
        method: req.method,
        path: req.originalUrl,
        targetService: serviceName,
        instanceId: 'gateway',
        statusCode: 429,
        durationMs,
        upstreamDurationMs: 0,
        error: 'Rate limit exceeded (429)',
        clientIp,
      });
      return;
    }

    // 2. Select instance via round-robin
    const instances = upstreamRegistry[serviceKey];
    if (!instances || instances.length === 0) {
      res.status(502).json({ error: 'No upstream instances available', service: serviceName });
      return;
    }

    const currentIndex = roundRobinIndexes[serviceKey] % instances.length;
    const selectedInstance = instances[currentIndex];
    roundRobinIndexes[serviceKey] = (currentIndex + 1) % instances.length;

    // Attach tracing and forwarding headers
    req.headers['x-request-id'] = requestId;
    req.headers['x-forwarded-for'] = clientIp;
    req.headers['x-gateway-timestamp'] = startTime.toString();
    req.headers['x-target-instance'] = selectedInstance.instanceId;

    // Restore full original URL so upstream service receives the full path (/api/products/...)
    req.url = req.originalUrl;

    const spanId = `span-gw-${Math.random().toString(36).substring(2, 8)}`;
    const upstreamStartTime = Date.now();

    // Proxy request
    proxy.web(
      req,
      res,
      {
        target: selectedInstance.url,
      },
      (err) => {
        const durationMs = Date.now() - startTime;
        console.error(`[Gateway Error] upstream ${selectedInstance.instanceId} unreachable:`, err.message);

        if (!res.headersSent) {
          res.setHeader('X-Request-ID', requestId);
          res.setHeader('X-Upstream-Instance', selectedInstance.instanceId);
          res.status(502).json({
            error: 'Bad Gateway',
            message: `Upstream instance ${selectedInstance.instanceId} unreachable`,
            service: serviceName,
            instanceId: selectedInstance.instanceId,
          });
        }

        sendTelemetry({
          id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          requestId,
          timestamp: Date.now(),
          method: req.method,
          path: req.originalUrl,
          targetService: serviceName,
          instanceId: selectedInstance.instanceId,
          statusCode: 502,
          durationMs,
          upstreamDurationMs: Date.now() - upstreamStartTime,
          error: err.message,
          clientIp,
        });
      }
    );

    // Track response finish
    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const upstreamDuration = Date.now() - upstreamStartTime;

      const gwSpan: TraceSpan = {
        spanId,
        service: 'gateway',
        instanceId: 'nginx-gateway',
        operation: `PROXY ${req.method} ${req.originalUrl}`,
        startTime,
        durationMs,
        statusCode: res.statusCode,
      };

      const upstreamSpan: TraceSpan = {
        spanId: `span-up-${Math.random().toString(36).substring(2, 8)}`,
        parentSpanId: spanId,
        service: serviceName,
        instanceId: selectedInstance.instanceId,
        operation: `${req.method} ${req.path}`,
        startTime: upstreamStartTime,
        durationMs: upstreamDuration,
        statusCode: res.statusCode,
      };

      sendTelemetry({
        id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        requestId,
        timestamp: Date.now(),
        method: req.method,
        path: req.originalUrl,
        targetService: serviceName,
        instanceId: selectedInstance.instanceId,
        statusCode: res.statusCode,
        durationMs,
        upstreamDurationMs: upstreamDuration,
        error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
        spans: [gwSpan, upstreamSpan],
        clientIp,
      });
    });
  };
}

// Asynchronously dispatch telemetry to Analytics Service
function sendTelemetry(event: TelemetryEvent) {
  // If target is analytics-service, avoid recursive logging loops
  if (event.targetService === 'analytics-service' && event.path.includes('/telemetry')) {
    return;
  }

  const payload = JSON.stringify(event);
  const req = http.request(
    `${ANALYTICS_URL}/api/analytics/telemetry`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      res.resume();
    }
  );

  req.on('error', () => {
    // Ignore telemetry delivery errors if analytics service is starting up
  });

  req.write(payload);
  req.end();
}

// API Routes routing to respective microservices
app.use('/api/users', routeToService('users', 'user-service'));
app.use('/api/products', routeToService('products', 'product-service'));
app.use('/api/orders', routeToService('orders', 'order-service'));
app.use('/api/notifications', routeToService('notifications', 'notification-service'));
app.use('/api/analytics', routeToService('analytics', 'analytics-service'));

const server = http.createServer(app);

// Proxy WebSocket connections (e.g. for analytics live events or frontend)
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/events') || req.url?.startsWith('/socket.io') || req.url?.startsWith('/api/analytics')) {
    proxy.ws(req, socket, head, { target: ANALYTICS_URL });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`[Gateway] NGINX/Node API Gateway running on port ${PORT}`);
  console.log(`[Gateway] Reverse-proxying /api/users, /api/products, /api/orders, /api/notifications, /api/analytics`);
});
