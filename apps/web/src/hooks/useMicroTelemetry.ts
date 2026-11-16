'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TelemetryEvent, ServiceHealth, LoadTestProgress, LoadTestConfig, FaultConfig } from '@micro/shared';

export interface TelemetryState {
  connected: boolean;
  events: TelemetryEvent[];
  latestEvent: TelemetryEvent | null;
  instances: Record<string, ServiceHealth>;
  metrics: {
    rps: number;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    errorRate: number;
    avgLatencyMs: number;
    history: Array<{ time: string; timestamp: number; rps: number; avgLatency: number; errorRate: number }>;
  };
  activeLoadTest: LoadTestProgress;
}

const ANALYTICS_WS_URL = process.env.NEXT_PUBLIC_ANALYTICS_WS_URL || 'ws://localhost:4041';
const ANALYTICS_HTTP_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:4041';

export function useMicroTelemetry() {
  const [state, setState] = useState<TelemetryState>({
    connected: false,
    events: [],
    latestEvent: null,
    instances: {},
    metrics: {
      rps: 0,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      errorRate: 0,
      avgLatencyMs: 0,
      history: [],
    },
    activeLoadTest: {
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
    },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(ANALYTICS_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        setState((prev) => ({ ...prev, connected: true }));
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setState((prev) => ({ ...prev, connected: false }));
        // Try reconnecting in 2s
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectRef.current();
          }, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'init') {
            const instMap: Record<string, ServiceHealth> = {};
            for (const inst of message.data.instances || []) {
              instMap[inst.instanceId] = inst;
            }

            // Deduplicate initial traces
            const uniqueTraces: TelemetryEvent[] = [];
            const seen = new Set<string>();
            for (const tr of message.data.recentTraces || []) {
              if (tr && tr.id && !seen.has(tr.id)) {
                seen.add(tr.id);
                uniqueTraces.push(tr);
              }
            }

            setState((prev) => ({
              ...prev,
              events: uniqueTraces,
              instances: instMap,
              metrics: {
                ...prev.metrics,
                history: message.data.history || [],
              },
              activeLoadTest: message.data.activeLoadTest || prev.activeLoadTest,
            }));
          } else if (message.type === 'telemetry') {
            const ev: TelemetryEvent = message.data;
            if (!ev || !ev.id) return;

            setState((prev) => {
              // Deduplicate event by id
              if (prev.events.some((e) => e.id === ev.id)) {
                return { ...prev, latestEvent: ev };
              }
              return {
                ...prev,
                latestEvent: ev,
                events: [ev, ...prev.events.slice(0, 99)],
              };
            });
          } else if (message.type === 'metrics') {
            setState((prev) => ({
              ...prev,
              metrics: {
                rps: message.data.rps,
                totalRequests: message.data.totalRequests,
                successCount: message.data.successCount,
                errorCount: message.data.errorCount,
                errorRate: message.data.errorRate,
                avgLatencyMs: message.data.avgLatencyMs,
                history: message.data.history || prev.metrics.history,
              },
              activeLoadTest: message.data.activeLoadTest || prev.activeLoadTest,
            }));
          } else if (message.type === 'health') {
            const instMap: Record<string, ServiceHealth> = {};
            for (const inst of message.data || []) {
              instMap[inst.instanceId] = inst;
            }
            setState((prev) => ({ ...prev, instances: instMap }));
          } else if (message.type === 'loadtest') {
            setState((prev) => ({ ...prev, activeLoadTest: message.data }));
          }
        } catch (err) {
          console.error('Error parsing telemetry payload:', err);
        }
      };
    } catch {
      if (isMountedRef.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectRef.current();
        }, 3000);
      }
    }
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Actions
  const startLoadTest = async (config: Partial<LoadTestConfig>) => {
    const res = await fetch(`${ANALYTICS_HTTP_URL}/api/analytics/load-test/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  };

  const stopLoadTest = async () => {
    const res = await fetch(`${ANALYTICS_HTTP_URL}/api/analytics/load-test/stop`, {
      method: 'POST',
    });
    return res.json();
  };

  const injectFault = async (fault: Partial<FaultConfig>) => {
    const res = await fetch(`${ANALYTICS_HTTP_URL}/api/analytics/faults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fault),
    });
    return res.json();
  };

  const runScenario = async (scenarioId: string) => {
    const res = await fetch(`${ANALYTICS_HTTP_URL}/api/analytics/scenarios/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });
    return res.json();
  };

  return {
    state,
    startLoadTest,
    stopLoadTest,
    injectFault,
    runScenario,
  };
}
