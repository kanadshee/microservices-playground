import express from 'express';
import cors from 'cors';
import http from 'http';
import {
  createServiceState,
  getServiceHealth,
  createServiceMiddleware,
  type User,
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

function startUserInstance(port: number, instanceId: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const state = createServiceState('user-service', instanceId, port);
  app.use(createServiceMiddleware(state, sendTelemetry));

  // In-memory data store
  const users: User[] = [
    { id: 'usr_alice', name: 'Alice Smith', email: 'alice@example.com', role: 'admin', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'usr_bob', name: 'Bob Jones', email: 'bob@example.com', role: 'customer', createdAt: new Date(Date.now() - 43200000).toISOString() },
    { id: 'usr_charlie', name: 'Charlie Brown', email: 'charlie@example.com', role: 'vendor', createdAt: new Date(Date.now() - 21600000).toISOString() },
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
  app.get('/api/users', (_req, res) => {
    res.json({
      instanceId,
      total: users.length,
      data: users,
    });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found', instanceId });
    }
    res.json({ instanceId, data: user });
  });

  app.post('/api/users', (req, res) => {
    const { name, email, role = 'customer' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required', instanceId });
    }
    const newUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    res.status(201).json({ instanceId, data: newUser });
  });

  app.put('/api/users/:id', (req, res) => {
    const userIndex = users.findIndex((u) => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found', instanceId });
    }
    users[userIndex] = { ...users[userIndex], ...req.body };
    res.json({ instanceId, data: users[userIndex] });
  });

  app.delete('/api/users/:id', (req, res) => {
    const userIndex = users.findIndex((u) => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found', instanceId });
    }
    const deleted = users.splice(userIndex, 1)[0];
    res.json({ instanceId, data: deleted });
  });

  app.listen(port, () => {
    console.log(`[User Service] ${instanceId} listening on port ${port}`);
  });
}

// Check if running a single specific instance or launching multi-instances locally
const specifiedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
const specifiedInstance = process.env.INSTANCE_ID;

if (specifiedPort) {
  startUserInstance(specifiedPort, specifiedInstance || `user-service-${specifiedPort}`);
} else {
  // Turborepo local dev: start both user-service-1 (4001) and user-service-2 (4002)
  startUserInstance(4001, 'user-service-1');
  startUserInstance(4002, 'user-service-2');
}
