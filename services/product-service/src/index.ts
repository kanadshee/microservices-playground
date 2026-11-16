import express from 'express';
import cors from 'cors';
import http from 'http';
import {
  createServiceState,
  getServiceHealth,
  createServiceMiddleware,
  type Product,
  type TelemetryEvent,
} from '@micro/shared';

const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://localhost:4041';

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

function startProductInstance(port: number, instanceId: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const state = createServiceState('product-service', instanceId, port);
  app.use(createServiceMiddleware(state, sendTelemetry));

  // Initial products
  const products: Product[] = [
    { id: 'prod_laptop', title: 'High-Performance Developer Laptop', category: 'Computing', price: 1899.99, stock: 45, description: '16-core, 64GB RAM workstation' },
    { id: 'prod_phone', title: 'Edge Micro Device', category: 'Mobile', price: 899.00, stock: 120, description: 'Low-latency testing handset' },
    { id: 'prod_headphones', title: 'Spatial Studio Headphones', category: 'Audio', price: 299.50, stock: 80, description: 'Active noise cancelling studio monitors' },
    { id: 'prod_monitor', title: '4K Ultra-Wide Curved Monitor', category: 'Displays', price: 649.00, stock: 35, description: '144Hz 34-inch ultrawide' },
    { id: 'prod_keyboard', title: 'Custom Mechanical Keyboard', category: 'Accessories', price: 149.99, stock: 95, description: 'Hotswappable lubricated switches' },
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
  app.get('/api/products', async (_req, res) => {
    // Simulate typical DB lookup latency (5-12ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 8) + 5));
    res.json({
      instanceId,
      total: products.length,
      data: products,
    });
  });

  app.get('/api/products/:id', async (req, res) => {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 6) + 3));
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', instanceId });
    }
    res.json({ instanceId, data: product });
  });

  app.post('/api/products', (req, res) => {
    const { title, category, price, stock = 10, description = '' } = req.body;
    if (!title || price === undefined) {
      return res.status(400).json({ error: 'Title and price required', instanceId });
    }
    const newProduct: Product = {
      id: `prod_${Math.random().toString(36).substring(2, 9)}`,
      title,
      category: category || 'General',
      price: Number(price),
      stock: Number(stock),
      description,
    };
    products.push(newProduct);
    res.status(201).json({ instanceId, data: newProduct });
  });

  app.put('/api/products/:id/inventory', (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', instanceId });
    }
    const { quantityDelta = 0 } = req.body;
    product.stock = Math.max(0, product.stock + Number(quantityDelta));
    res.json({ instanceId, data: product });
  });

  app.listen(port, () => {
    console.log(`[Product Service] ${instanceId} listening on port ${port}`);
  });
}

const specifiedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
const specifiedInstance = process.env.INSTANCE_ID;

if (specifiedPort) {
  startProductInstance(specifiedPort, specifiedInstance || `product-service-${specifiedPort}`);
} else {
  // Turborepo local dev: start product-service-1 (4011), product-service-2 (4012), product-service-3 (4013)
  startProductInstance(4011, 'product-service-1');
  startProductInstance(4012, 'product-service-2');
  startProductInstance(4013, 'product-service-3');
}
