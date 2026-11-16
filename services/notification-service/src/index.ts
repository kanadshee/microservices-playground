import express from 'express';
import cors from 'cors';
import http from 'http';
import {
  createServiceState,
  getServiceHealth,
  createServiceMiddleware,
  type Notification,
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

function startNotificationInstance(port: number, instanceId: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const state = createServiceState('notification-service', instanceId, port);
  app.use(createServiceMiddleware(state, sendTelemetry));

  const notifications: Notification[] = [];

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
  app.get('/api/notifications', (_req, res) => {
    res.json({
      instanceId,
      total: notifications.length,
      data: notifications.slice(-50),
    });
  });

  app.post('/api/notifications', async (req, res) => {
    const { userId, type = 'email', recipient, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message required', instanceId });
    }

    // Simulate async delivery time (15-30ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 15) + 15));

    const notification: Notification = {
      id: `notif_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      type,
      recipient: recipient || `${userId}@notify.internal`,
      message,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);

    res.status(201).json({ instanceId, data: notification });
  });

  app.listen(port, () => {
    console.log(`[Notification Service] ${instanceId} listening on port ${port}`);
  });
}

const specifiedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
const specifiedInstance = process.env.INSTANCE_ID;

if (specifiedPort) {
  startNotificationInstance(specifiedPort, specifiedInstance || `notification-service-${specifiedPort}`);
} else {
  // Turborepo local dev: start notification-service-1 (4031) and notification-service-2 (4032)
  startNotificationInstance(4031, 'notification-service-1');
  startNotificationInstance(4032, 'notification-service-2');
}
