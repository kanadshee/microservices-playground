import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Network, Layers, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const prefetch = 'partial';

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-600 dark:text-zinc-400 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 px-6">
        <div className="max-w-[1100px] w-full mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Playground</span>
              </Button>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 font-heading">
                System Architecture Guide
              </h1>
              <Badge variant="outline" className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Interactive Reference
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-[1100px] w-full mx-auto space-y-8">
        {/* Intro Hero */}
        <section className="space-y-3 pt-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-700 dark:text-zinc-300 font-heading">
            How Distributed Systems & Microservices Work
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            In traditional monolithic software, all features—user authentication, product catalog, checkout, and email alerts—run inside one giant program. If one part slows down or crashes, the entire system can fail.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            In this playground, we split that monolith into independent, specialized services called <strong>microservices</strong>. Each service runs on its own port, scales independently, and communicates with other services over the local network. Here is a friendly, step-by-step guide explaining every component you see on the dashboard.
          </p>
        </section>

        {/* Section 1: The Visual Graph Components */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Network className="size-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
              1. The Architecture Canvas Elements
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Component: Client */}
            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-heading flex items-center justify-between">
                  <span>Client / Load Generator</span>
                  <Badge variant="secondary" className="text-[10px]">Traffic Origin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  Simulates thousands of real-world users making HTTP requests to your system.
                </p>
                <p>
                  You can set exact traffic rates (from 5 to 400 requests per second) and test different patterns such as normal steady traffic, sudden traffic spikes, or gradual ramp-ups.
                </p>
              </CardContent>
            </Card>

            {/* Component: API Gateway */}
            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-heading flex items-center justify-between">
                  <span>NGINX API Gateway (Port 8080)</span>
                  <Badge variant="secondary" className="text-[10px]">Reverse Proxy</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  The front door for all external traffic. Clients never communicate with individual microservices directly; instead, they send all requests to the Gateway.
                </p>
                <p>
                  The gateway inspects the URL, balances the incoming requests across healthy service instances using <strong>round-robin algorithms</strong>, and enforces rate limiting to protect internal services.
                </p>
              </CardContent>
            </Card>

            {/* Component: Microservices */}
            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-heading flex items-center justify-between">
                  <span>Microservice Instances (11 total)</span>
                  <Badge variant="secondary" className="text-[10px]">Business Logic</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  Four distinct business domains running multiple copies for high availability:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>User Service (Ports 4001, 4002)</strong>: Profiles and login authentication.</li>
                  <li><strong>Product Service (Ports 4011, 4012, 4013)</strong>: Catalogs, search, and pricing (3 instances).</li>
                  <li><strong>Order Service (Ports 4021, 4022)</strong>: Cart checkout and payment processing.</li>
                  <li><strong>Notification Service (Ports 4031, 4032)</strong>: Automated emails and SMS alerts.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Component: Storage & Workers */}
            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-heading flex items-center justify-between">
                  <span>Databases & Background Processing</span>
                  <Badge variant="secondary" className="text-[10px]">Persistence & Queue</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  State and asynchronous decoupling across services:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>PostgreSQL DB (Port 5432)</strong>: Durable relational data storage.</li>
                  <li><strong>Redis Cache & Queue (Port 6379)</strong>: In-memory cache and fast message buffer.</li>
                  <li><strong>Background Worker (Port 4051)</strong>: Pulls heavy jobs from Redis asynchronously so HTTP requests return fast.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Real-time Telemetry Metrics */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Activity className="size-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
              2. Understanding the Live 2x2 Metrics
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border border-border bg-card/90">
              <CardContent className="p-4 space-y-1">
                <div className="font-heading font-semibold text-xs text-zinc-700 dark:text-zinc-300">Throughput (RPS)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  Requests Per Second currently being handled across all services. Shows real-time system capacity.
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card/90">
              <CardContent className="p-4 space-y-1">
                <div className="font-heading font-semibold text-xs text-zinc-700 dark:text-zinc-300">Response Latency (ms)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  Average time taken from request ingress at Gateway to response completion. High latency indicates downstream bottlenecks.
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card/90">
              <CardContent className="p-4 space-y-1">
                <div className="font-heading font-semibold text-xs text-zinc-700 dark:text-zinc-300">Error Rate (%)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  Percentage of requests resulting in failures (HTTP 429 rate limit, 500 internal errors, or 503 service unavailable).
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card/90">
              <CardContent className="p-4 space-y-1">
                <div className="font-heading font-semibold text-xs text-zinc-700 dark:text-zinc-300">Success (2xx)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  Total cumulative count of requests completed cleanly without errors.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3: Interactive Control Panel Features */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Sparkles className="size-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
              3. The 3-Tab Interactive Control Panel
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
                  Traffic Tab
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  Start or stop live simulated traffic. Select quick presets (Light, Medium, Heavy, Spike) or customize RPS and duration.
                </p>
                <p>
                  You can target specific services or test traffic patterns like Random Burst and Uneven Distribution.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
                  Faults Tab (Chaos Lab)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  Inject controlled chaos into specific instances: add artificial latency delays (up to 800ms) or inject HTTP 500 error rates.
                </p>
                <p>
                  Toggle <strong>Kill Instance (Offline)</strong> to simulate complete server crashes and observe how the gateway handles the outage.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
                  Scenarios Tab
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <p>
                  Launch 8 pre-programmed educational experiments:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Load Balancing Demonstration</li>
                  <li>Traffic Surge Handling</li>
                  <li>Rate Limiting Protection</li>
                  <li>Cascading Failure Prevention</li>
                  <li>Full Recovery & Self-Healing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: Tracing & Request Explorer */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Layers className="size-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 font-heading">
              4. Distributed Tracing & Request Explorer
            </h3>
          </div>

          <Card className="border border-border bg-card/90">
            <CardContent className="p-4 text-xs text-zinc-600 dark:text-zinc-400 space-y-3">
              <p>
                In a distributed system, a single user click might trigger requests across three or four different services. When an error or slowdown occurs, it can be difficult to identify which service caused the problem.
              </p>
              <p>
                This application implements <strong>Distributed Tracing</strong>: every incoming request is assigned a unique trace ID and span IDs. When you click any row in the <strong>Live Request Explorer</strong> table at the bottom of the dashboard, a modal opens displaying the <strong>Distributed Trace Journey</strong> waterfall:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded border border-border bg-muted/20 space-y-1">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">1. Gateway Ingress Span</div>
                  <div>Measures the time spent by the NGINX Gateway parsing and proxying the request.</div>
                </div>
                <div className="p-3 rounded border border-border bg-muted/20 space-y-1">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">2. Upstream Microservice Span</div>
                  <div>Measures execution time inside the specific microservice instance processing the request logic.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <Link href="/">
            <Button variant="default" size="sm" className="h-8 text-xs gap-1.5">
              <ArrowLeft className="size-3.5" />
              <span>Return to Live Playground</span>
            </Button>
          </Link>
          <span>Educational Distributed Systems Playground</span>
        </div>
      </main>
    </div>
  );
}
