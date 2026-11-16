'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useMicroTelemetry } from '@/hooks/useMicroTelemetry';
import { ControlPanel } from '@/components/dashboard/ControlPanel';
import { MetricsOverview } from '@/components/dashboard/MetricsOverview';
import { RequestExplorer } from '@/components/dashboard/RequestExplorer';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { Radio } from 'lucide-react';

// Dynamic import with SSR disabled to eliminate any hydration mismatch from React Flow canvas
const ArchitectureFlow = dynamic(
  () => import('@/components/architecture/ArchitectureFlow').then((m) => m.ArchitectureFlow),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-[660px] rounded-xl border border-border bg-card/40 animate-pulse flex items-center justify-center text-xs text-zinc-600 dark:text-zinc-400 font-mono"
        style={{ height: '660px' }}
      >
        Initializing Architecture Canvas...
      </div>
    ),
  }
);

export function DashboardClient() {
  const { state, startLoadTest, stopLoadTest, injectFault, runScenario } = useMicroTelemetry();

  return (
    <div className="space-y-4">
      {/* Top Section: Left Sidebar (2x2 KPI Metrics + 3-Tab Control Panel) & Right Canvas (React Flow) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (4 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-3">
          {/* 2x2 Metrics Overview Grid */}
          <MetricsOverview
            rps={state.metrics.rps}
            avgLatency={state.metrics.avgLatencyMs}
            errorRate={state.metrics.errorRate}
            totalRequests={state.metrics.totalRequests}
            successCount={state.metrics.successCount}
            errorCount={state.metrics.errorCount}
            activeLoadTest={state.activeLoadTest}
          />

          {/* 3-Tab Interactive Control Panel */}
          <ControlPanel
            activeLoadTest={state.activeLoadTest}
            onStartLoad={startLoadTest}
            onStopLoad={stopLoadTest}
            onInjectFault={injectFault}
            onRunScenario={runScenario}
          />
        </div>

        {/* Right Column: React Flow Architecture Canvas (8 cols) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-zinc-700 dark:text-zinc-300 animate-pulse" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Live Architecture & Packet Routing
              </h2>
            </div>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
              Click & drag to explore · Hover nodes for instance health
            </span>
          </div>
          <div className="w-full h-[660px]" style={{ height: '660px' }}>
            <ArchitectureFlow
              instances={state.instances}
              latestEvent={state.latestEvent}
              activeRps={state.activeLoadTest.running ? state.activeLoadTest.currentRps : state.metrics.rps}
              isRunning={state.activeLoadTest.running}
            />
          </div>
        </div>
      </div>

      {/* Middle Section: Performance Charts (Throughput & Latency Trend + Load Distribution) */}
      <AnalyticsCharts
        history={state.metrics.history}
        events={state.events}
      />

      {/* Bottom Section: Live Request Explorer & Traces */}
      <RequestExplorer events={state.events} />
    </div>
  );
}
