import React, { Suspense } from 'react';
import Link from 'next/link';
import { Network, Server, Terminal, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

// Enable Partial Prefetching (PPR) for the root dashboard route
export const prefetch = 'partial';

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Top Split: Left Column (2x2 Metrics + Control Panel) & Right Column (React Flow) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-3">
          {/* 2x2 Metrics Skeleton */}
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg border border-border bg-card/60 p-3" />
            ))}
          </div>
          {/* Controls Skeleton */}
          <div className="h-[480px] rounded-xl border border-border bg-card/60" />
        </div>

        {/* Canvas Skeleton */}
        <div className="lg:col-span-8 xl:col-span-8 min-h-[640px] rounded-xl border border-border bg-card/60" />
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-56 rounded-xl border border-border bg-card/60" />
        <div className="h-56 rounded-xl border border-border bg-card/60" />
      </div>

      {/* Table Skeleton */}
      <div className="h-64 rounded-xl border border-border bg-card/60" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-600 dark:text-zinc-400 flex flex-col">
      {/* Top Navigation / App Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-muted border border-border flex items-center justify-center">
            <Network className="size-4 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-zinc-700 dark:text-zinc-300 font-heading">
                Distributed Systems Playground
              </h1>
              <Badge variant="outline" className="text-[10px] text-zinc-600 dark:text-zinc-400">
                v1.0 Turborepo
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              NGINX Reverse Proxy · 11 Microservice Instances · Real-Time Telemetry & Chaos Lab
            </p>
          </div>
        </div>

        {/* Right Header Navigation: Overview Guide, Gateway Port, Theme Toggle */}
        <div className="flex items-center gap-3">
          <Link href="/overview">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-zinc-700 dark:text-zinc-300 border-border hover:bg-muted"
            >
              <BookOpen className="size-3.5" />
              <span>System Guide</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/40 text-[11px] text-zinc-600 dark:text-zinc-400">
              <Server className="size-3 text-zinc-700 dark:text-zinc-300" />
              Gateway Port 8080
            </span>
          </div>

          <div className="border-l border-border pl-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 max-w-[1680px] w-full mx-auto space-y-4">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardClient />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-3 px-6 text-center text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-zinc-700 dark:text-zinc-300" />
          <span>Local CLI available: <code>pnpm load-test -- --rps 100 --duration 60</code></span>
        </div>
        <div>Educational Distributed Systems Observability Laboratory</div>
      </footer>
    </div>
  );
}
