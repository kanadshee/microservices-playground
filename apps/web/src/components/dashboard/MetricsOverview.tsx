'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { LoadTestProgress } from '@micro/shared';

interface MetricsOverviewProps {
  rps: number;
  avgLatency: number;
  errorRate: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  activeLoadTest: LoadTestProgress;
  className?: string;
}

export function MetricsOverview({
  rps,
  avgLatency,
  errorRate,
  totalRequests,
  successCount,
  errorCount,
  activeLoadTest,
  className,
}: MetricsOverviewProps) {
  const isErrHigh = errorRate > 5;
  const isLatencyHigh = avgLatency > 150;

  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className || ''}`}>
      {/* 1. Throughput */}
      <Card className="border border-border bg-card/90 shadow-xs">
        <CardContent className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs font-medium">
            <span className="font-heading font-medium text-zinc-700 dark:text-zinc-300">Throughput</span>
            <Activity className="size-3 text-zinc-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-zinc-700 dark:text-zinc-300">
              {activeLoadTest.running ? activeLoadTest.currentRps : rps}
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">req/s</span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
            {totalRequests.toLocaleString()} total
          </div>
        </CardContent>
      </Card>

      {/* 2. Latency */}
      <Card className="border border-border bg-card/90 shadow-xs">
        <CardContent className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs font-medium">
            <span className="font-heading font-medium text-zinc-700 dark:text-zinc-300">Latency</span>
            <Clock className="size-3 text-zinc-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`text-xl font-bold font-mono tracking-tight ${isLatencyHigh ? 'text-destructive' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {avgLatency}
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">ms avg</span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
            p95: {activeLoadTest.p95 || Math.round(avgLatency * 1.5)}ms
          </div>
        </CardContent>
      </Card>

      {/* 3. Error Rate */}
      <Card className="border border-border bg-card/90 shadow-xs">
        <CardContent className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs font-medium">
            <span className="font-heading font-medium text-zinc-700 dark:text-zinc-300">Error Rate</span>
            <AlertOctagon className={`size-3 ${isErrHigh ? 'text-destructive' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`text-xl font-bold font-mono tracking-tight ${isErrHigh ? 'text-destructive' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {errorRate}%
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
              ({errorCount})
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
            {isErrHigh ? 'Degraded' : 'Nominal'}
          </div>
        </CardContent>
      </Card>

      {/* 4. Success Count */}
      <Card className="border border-border bg-card/90 shadow-xs">
        <CardContent className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs font-medium">
            <span className="font-heading font-medium text-zinc-700 dark:text-zinc-300">Success</span>
            <CheckCircle2 className="size-3 text-zinc-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-zinc-700 dark:text-zinc-300">
              {successCount.toLocaleString()}
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">2xx</span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
            Routed OK
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
