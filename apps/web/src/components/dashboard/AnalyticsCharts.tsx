'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3, LineChart } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { TelemetryEvent } from '@micro/shared';

interface AnalyticsChartsProps {
  history: Array<{ time: string; timestamp: number; rps: number; avgLatency: number; errorRate: number }>;
  events: TelemetryEvent[];
}

export function AnalyticsCharts({ history, events }: AnalyticsChartsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Aggregate instance counts from observed telemetry events
  const instanceStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of events) {
      if (ev.instanceId && ev.instanceId !== 'gateway') {
        counts[ev.instanceId] = (counts[ev.instanceId] || 0) + 1;
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return Object.entries(counts).map(([name, count]) => {
      const percentage = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
      return {
        instance: name.replace('-service', ''),
        count,
        percentage,
      };
    });
  }, [events]);

  const axisStroke = isDark ? '#71717a' : '#a1a1aa';
  const gridStroke = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';
  const tooltipText = isDark ? '#f4f4f5' : '#18181b';
  const primaryStroke = isDark ? '#e4e4e7' : '#18181b';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Real-time Throughput & Latency Trend */}
      <Card className="border border-border bg-card/90 backdrop-blur-md shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="size-4 text-foreground" />
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-foreground">
              Throughput & Latency Trend
            </CardTitle>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Real-time 1s window</span>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryStroke} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={primaryStroke} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
                <XAxis dataKey="time" stroke={axisStroke} fontSize={10} tickLine={false} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: tooltipText,
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rps"
                  name="RPS"
                  stroke={primaryStroke}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#rpsGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="avgLatency"
                  name="Latency (ms)"
                  stroke={axisStroke}
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Upstream Instance Traffic Distribution */}
      <Card className="border border-border bg-card/90 backdrop-blur-md shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-foreground" />
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-foreground">
              Instance Load Distribution (% of requests)
            </CardTitle>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Observed instances</span>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="h-[180px] w-full">
            {instanceStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Awaiting traffic to measure upstream balancing...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={instanceStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
                  <XAxis dataKey="instance" stroke={axisStroke} fontSize={10} tickLine={false} />
                  <YAxis stroke={axisStroke} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      color: tooltipText,
                      fontSize: '11px',
                      borderRadius: '6px',
                    }}
                    formatter={(val: unknown) => [`${String(val)}% of traffic`, 'Share']}
                  />
                  <Bar dataKey="percentage" fill={primaryStroke} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
