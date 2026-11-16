import http from 'http';
import type { LoadTestConfig, LoadTestProgress, TrafficPattern } from '@micro/shared';

interface RequestSpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
}

const SAMPLE_USERS = ['usr_alice', 'usr_bob', 'usr_charlie', 'usr_david', 'usr_eva'];
const SAMPLE_PRODUCTS = ['prod_laptop', 'prod_phone', 'prod_headphones', 'prod_monitor', 'prod_keyboard'];

export function generateRequest(service: string, pattern: TrafficPattern): RequestSpec {
  // If target is specific service, generate requests for it
  const target = service === 'all' ? pickServiceByPattern(pattern) : service;

  switch (target) {
    case 'user-service': {
      const roll = Math.random();
      if (roll < 0.6) {
        return { method: 'GET', path: '/api/users' };
      } else if (roll < 0.85) {
        const id = SAMPLE_USERS[Math.floor(Math.random() * SAMPLE_USERS.length)];
        return { method: 'GET', path: `/api/users/${id}` };
      } else {
        return {
          method: 'POST',
          path: '/api/users',
          body: {
            name: `User ${Math.floor(Math.random() * 1000)}`,
            email: `test${Math.floor(Math.random() * 10000)}@example.com`,
            role: 'customer',
          },
        };
      }
    }

    case 'product-service': {
      const roll = Math.random();
      if (roll < 0.65) {
        return { method: 'GET', path: '/api/products' };
      } else if (roll < 0.9) {
        const id = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        return { method: 'GET', path: `/api/products/${id}` };
      } else {
        const id = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        return {
          method: 'PUT',
          path: `/api/products/${id}/inventory`,
          body: { quantityDelta: Math.floor(Math.random() * 5) - 2 },
        };
      }
    }

    case 'order-service': {
      const roll = Math.random();
      if (roll < 0.5) {
        return { method: 'GET', path: '/api/orders' };
      } else {
        const userId = SAMPLE_USERS[Math.floor(Math.random() * SAMPLE_USERS.length)];
        const productId = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        return {
          method: 'POST',
          path: '/api/orders',
          body: {
            userId,
            items: [{ productId, quantity: Math.floor(Math.random() * 3) + 1, price: 99.99 }],
          },
        };
      }
    }

    case 'notification-service': {
      const roll = Math.random();
      if (roll < 0.4) {
        return { method: 'GET', path: '/api/notifications' };
      } else {
        const userId = SAMPLE_USERS[Math.floor(Math.random() * SAMPLE_USERS.length)];
        return {
          method: 'POST',
          path: '/api/notifications',
          body: {
            userId,
            type: Math.random() > 0.5 ? 'email' : 'sms',
            recipient: `user_${userId}@notify.internal`,
            message: `Your automated update event at ${new Date().toISOString()}`,
          },
        };
      }
    }

    default:
      return { method: 'GET', path: '/api/analytics/metrics' };
  }
}

function pickServiceByPattern(pattern: TrafficPattern): string {
  switch (pattern) {
    case 'single-service':
      return 'product-service';

    case 'uneven': {
      // 70% Product, 15% User, 10% Order, 5% Notification
      const r = Math.random();
      if (r < 0.7) return 'product-service';
      if (r < 0.85) return 'user-service';
      if (r < 0.95) return 'order-service';
      return 'notification-service';
    }

    case 'mixed':
    default: {
      const services = ['user-service', 'product-service', 'order-service', 'notification-service'];
      return services[Math.floor(Math.random() * services.length)];
    }
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export class LoadTestRunner {
  private config: LoadTestConfig;
  private onProgress?: (p: LoadTestProgress) => void;
  private isRunning = false;
  private timer?: NodeJS.Timeout;
  private progressTimer?: NodeJS.Timeout;
  private latencies: number[] = [];
  private totalRequests = 0;
  private successCount = 0;
  private errorCount = 0;
  private startTime = 0;
  private testId: string;
  private gatewayUrl: string;

  constructor(
    config: LoadTestConfig,
    gatewayUrl = 'http://localhost:8080',
    onProgress?: (p: LoadTestProgress) => void
  ) {
    this.config = config;
    this.gatewayUrl = gatewayUrl;
    this.onProgress = onProgress;
    this.testId = `test-${Date.now()}`;
  }

  public start() {
    this.isRunning = true;
    this.startTime = Date.now();
    const durationMs = this.config.durationSeconds * 1000;

    // Progress broadcast interval (every 250ms)
    this.progressTimer = setInterval(() => {
      this.broadcastProgress();
    }, 250);

    // Schedule test runner tick loop
    this.scheduleNextBatch();

    // Auto-stop after duration
    if (this.config.durationSeconds > 0) {
      setTimeout(() => {
        this.stop();
      }, durationMs);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.broadcastProgress();
  }

  public getProgress(): LoadTestProgress {
    const elapsed = Math.floor((Date.now() - (this.startTime || Date.now())) / 1000);
    const avg =
      this.latencies.length > 0
        ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
        : 0;

    const currentRps = this.getCurrentEffectiveRps(elapsed);

    return {
      running: this.isRunning,
      testId: this.testId,
      startTime: this.startTime,
      elapsedSeconds: elapsed,
      totalSeconds: this.config.durationSeconds,
      currentRps,
      targetRps: this.config.rps,
      totalRequestsSent: this.totalRequests,
      successCount: this.successCount,
      errorCount: this.errorCount,
      avgLatencyMs: avg,
      p50: calculatePercentile(this.latencies, 50),
      p90: calculatePercentile(this.latencies, 90),
      p95: calculatePercentile(this.latencies, 95),
      p99: calculatePercentile(this.latencies, 99),
      activePattern: this.config.pattern,
    };
  }

  private broadcastProgress() {
    if (this.onProgress) {
      this.onProgress(this.getProgress());
    }
  }

  private getCurrentEffectiveRps(elapsedSeconds: number): number {
    const baseRps = Math.max(1, this.config.rps);
    switch (this.config.pattern) {
      case 'ramp-up': {
        const progress = Math.min(1, elapsedSeconds / Math.max(1, this.config.durationSeconds));
        return Math.max(5, Math.round(baseRps * (0.2 + progress * 0.8)));
      }
      case 'burst': {
        // Every 6 seconds, spike 2.5x for 2 seconds
        const cycle = elapsedSeconds % 6;
        return cycle < 2 ? Math.round(baseRps * 2.2) : Math.round(baseRps * 0.7);
      }
      case 'spike': {
        // Sudden spike halfway through
        const halfway = this.config.durationSeconds / 2;
        if (elapsedSeconds >= halfway && elapsedSeconds <= halfway + 8) {
          return Math.round(baseRps * (this.config.spikeMultiplier || 3));
        }
        return baseRps;
      }
      default:
        return baseRps;
    }
  }

  private scheduleNextBatch() {
    if (!this.isRunning) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const effectiveRps = this.getCurrentEffectiveRps(elapsed);
    // Break 1 second into 10 slices of 100ms
    const intervalMs = 100;
    const batchSize = Math.max(1, Math.round(effectiveRps / 10));

    for (let i = 0; i < batchSize; i++) {
      this.dispatchSingleRequest();
    }

    this.timer = setTimeout(() => {
      this.scheduleNextBatch();
    }, intervalMs);
  }

  private dispatchSingleRequest() {
    const spec = generateRequest(this.config.targetService, this.config.pattern);
    const startReqTime = Date.now();
    this.totalRequests++;

    const postData = spec.body ? JSON.stringify(spec.body) : undefined;
    const url = new URL(spec.path, this.gatewayUrl);

    const req = http.request(
      url,
      {
        method: spec.method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          'X-Load-Test-Id': this.testId,
        },
        timeout: 5000,
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          const latency = Date.now() - startReqTime;
          this.latencies.push(latency);
          if (this.latencies.length > 500) this.latencies.shift();

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            this.successCount++;
          } else {
            this.errorCount++;
          }
        });
      }
    );

    req.on('error', () => {
      const latency = Date.now() - startReqTime;
      this.latencies.push(latency);
      if (this.latencies.length > 500) this.latencies.shift();
      this.errorCount++;
    });

    req.on('timeout', () => {
      req.destroy();
      this.errorCount++;
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  }
}
