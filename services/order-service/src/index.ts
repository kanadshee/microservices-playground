import express from 'express';
import cors from 'cors';
import http from 'http';
import {
  createServiceState,
  getServiceHealth,
  createServiceMiddleware,
  type Order,
  type TelemetryEvent,
  type TraceSpan,
} from '@micro/shared';

const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://localhost:4041';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

function sendTelemetry(event: TelemetryEvent) {
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
    (res) => res.resume()
  );
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

function startOrderInstance(port: number, instanceId: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const state = createServiceState('order-service', instanceId, port);
  app.use(createServiceMiddleware(state, sendTelemetry));

  const orders: Order[] = [
    {
      id: 'ord_1001',
      userId: 'usr_alice',
      items: [{ productId: 'prod_laptop', quantity: 1, price: 1899.99 }],
      total: 1899.99,
      status: 'confirmed',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json(getServiceHealth(state));
  });

  // Fault injection endpoint
  app.post('/faults', (req, res) => {
    if (typeof req.body.latencyMs === 'number') state.faults.latencyMs = req.body.latencyMs;
    if (typeof req.body.failureRate === 'number') state.faults.failureRate = req.body.failureRate;
    if (typeof req.body.isOffline === 'boolean') state.faults.isOffline = req.body.isOffline;
    res.json({ success: true, faults: state.faults });
  });

  // Business logic routes
  app.get('/api/orders', (_req, res) => {
    res.json({
      instanceId,
      total: orders.length,
      data: orders,
    });
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found', instanceId });
    }
    res.json({ instanceId, data: order });
  });

  // Inter-service call when creating order: validates with Product Service & dispatches to Notification Service
  app.post('/api/orders', async (req, res) => {
    const { userId, items = [] } = req.body;
    const requestId = (req.headers['x-request-id'] as string) || `req-order-${Date.now()}`;

    if (!userId || items.length === 0) {
      return res.status(400).json({ error: 'userId and items array are required', instanceId });
    }

    // Step 1: Inter-service call to product service via gateway to check availability
    const firstProduct = items[0];
    const checkProductStart = Date.now();
    let productValid = true;

    try {
      const prodRes = await fetch(`${GATEWAY_URL}/api/products/${firstProduct.productId}`, {
        headers: {
          'X-Request-ID': requestId,
          'X-Parent-Span-ID': `span-ord-${instanceId}`,
        },
      });

      if (!prodRes.ok && prodRes.status !== 404) {
        // Downstream dependency error!
        productValid = false;
      }
    } catch {
      // Downstream failure
      productValid = false;
    }

    if (!productValid) {
      return res.status(502).json({
        error: 'Downstream dependency failure (Product Service)',
        service: 'order-service',
        instanceId,
      });
    }

    // Calculate total
    const total = items.reduce(
      (sum: number, it: any) => sum + (it.price || 50) * (it.quantity || 1),
      0
    );

    const newOrder: Order = {
      id: `ord_${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      items,
      total: Math.round(total * 100) / 100,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    orders.push(newOrder);

    // Step 2: Asynchronously notify notification service
    fetch(`${GATEWAY_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Parent-Span-ID': `span-ord-${instanceId}`,
      },
      body: JSON.stringify({
        userId,
        type: 'email',
        recipient: `customer-${userId}@domain.com`,
        message: `Order #${newOrder.id} has been successfully processed!`,
      }),
    }).catch(() => {});

    res.status(201).json({ instanceId, data: newOrder });
  });

  app.listen(port, () => {
    console.log(`[Order Service] ${instanceId} listening on port ${port}`);
  });
}

const specifiedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
const specifiedInstance = process.env.INSTANCE_ID;

if (specifiedPort) {
  startOrderInstance(specifiedPort, specifiedInstance || `order-service-${specifiedPort}`);
} else {
  // Turborepo local dev: start order-service-1 (4021) and order-service-2 (4022)
  startOrderInstance(4021, 'order-service-1');
  startOrderInstance(4022, 'order-service-2');
}
