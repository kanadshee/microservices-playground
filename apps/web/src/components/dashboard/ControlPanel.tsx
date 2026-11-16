'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Flame, Zap, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import type { LoadTestConfig, LoadTestProgress, TrafficPattern, FaultConfig } from '@micro/shared';

interface ControlPanelProps {
  activeLoadTest: LoadTestProgress;
  onStartLoad: (config: LoadTestConfig) => Promise<unknown>;
  onStopLoad: () => Promise<unknown>;
  onInjectFault: (fault: Partial<FaultConfig>) => Promise<{ dispatched?: number }>;
  onRunScenario: (scenarioId: string) => Promise<{ scenario?: string; explanation?: string }>;
}

export function ControlPanel({
  activeLoadTest,
  onStartLoad,
  onStopLoad,
  onInjectFault,
  onRunScenario,
}: ControlPanelProps) {
  // Load test form state
  const [rps, setRps] = useState<number>(50);
  const [duration, setDuration] = useState<number>(45);
  const [targetService, setTargetService] = useState<LoadTestConfig['targetService']>('all');
  const [pattern, setPattern] = useState<TrafficPattern>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fault injection state
  const [faultService, setFaultService] = useState<string>('product-service');
  const [faultInstance, setFaultInstance] = useState<string>('product-service-2');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [failureRate, setFailureRate] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [faultSuccessMsg, setFaultSuccessMsg] = useState<string | null>(null);

  // Scenario state
  const [activeScenarioDesc, setActiveScenarioDesc] = useState<string | null>(null);

  const handleStartLoad = async () => {
    setIsSubmitting(true);
    try {
      await onStartLoad({
        rps,
        durationSeconds: duration,
        concurrency: 5,
        targetService,
        pattern,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (presetRps: number, presetDuration: number, presetPattern: TrafficPattern) => {
    setRps(presetRps);
    setDuration(presetDuration);
    setPattern(presetPattern);
  };

  const handleApplyFault = async () => {
    const res = await onInjectFault({
      service: faultService,
      instanceId: faultInstance === 'all' ? undefined : faultInstance,
      latencyMs,
      failureRate: failureRate / 100,
      isOffline,
    });
    setFaultSuccessMsg(`Applied to ${res.dispatched || 1} instance(s)`);
    setTimeout(() => setFaultSuccessMsg(null), 3000);
  };

  const handleRunScenario = async (id: string) => {
    const res = await onRunScenario(id);
    if (res.explanation) {
      setActiveScenarioDesc(`${res.scenario}: ${res.explanation}`);
    }
  };

  return (
    <Card className="border border-border/80 bg-card/90 backdrop-blur-md shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-foreground" />
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-foreground">
              Interactive Control Panel
            </CardTitle>
          </div>
          {activeLoadTest.running ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Badge variant="default" className="text-xs">
                Generating Traffic · {activeLoadTest.currentRps} RPS
              </Badge>
            </motion.div>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Idle
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Trigger real traffic, inject faults, or launch guided architecture scenarios.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs defaultValue="traffic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="traffic" className="text-xs">
              <Zap className="size-3.5 mr-1 text-muted-foreground" />
              Traffic
            </TabsTrigger>
            <TabsTrigger value="chaos" className="text-xs">
              <ShieldAlert className="size-3.5 mr-1 text-muted-foreground" />
              Faults
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">
              <Sparkles className="size-3.5 mr-1 text-muted-foreground" />
              Scenarios
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TRAFFIC GENERATOR */}
          <TabsContent value="traffic" className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Traffic Presets</label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleApplyPreset(10, 30, 'normal')}
                >
                  Light (10)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleApplyPreset(50, 45, 'normal')}
                >
                  Medium (50)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleApplyPreset(120, 45, 'burst')}
                >
                  Heavy (120)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleApplyPreset(250, 30, 'spike')}
                >
                  Spike (250)
                </Button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Requests Per Second</span>
                  <span className="font-mono font-semibold text-foreground">{rps} RPS</span>
                </div>
                <Slider
                  value={[rps]}
                  min={5}
                  max={400}
                  step={5}
                  onValueChange={(val: number | readonly number[]) => setRps(Array.isArray(val) ? val[0] : val)}
                  disabled={activeLoadTest.running}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Test Duration</span>
                  <span className="font-mono font-semibold text-foreground">{duration} seconds</span>
                </div>
                <Slider
                  value={[duration]}
                  min={10}
                  max={180}
                  step={5}
                  onValueChange={(val: number | readonly number[]) => setDuration(Array.isArray(val) ? val[0] : val)}
                  disabled={activeLoadTest.running}
                />
              </div>
            </div>

            {/* Dropdowns */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Target Service</label>
                <Select
                  value={targetService}
                  onValueChange={(v: string | null) => {
                    if (v) setTargetService(v as LoadTestConfig['targetService']);
                  }}
                  disabled={activeLoadTest.running}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Target Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Services (Round-robin)</SelectItem>
                      <SelectItem value="user-service">User Service</SelectItem>
                      <SelectItem value="product-service">Product Service (3 inst)</SelectItem>
                      <SelectItem value="order-service">Order Service</SelectItem>
                      <SelectItem value="notification-service">Notification Service</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Traffic Pattern</label>
                <Select
                  value={pattern}
                  onValueChange={(v: string | null) => {
                    if (v) setPattern(v as TrafficPattern);
                  }}
                  disabled={activeLoadTest.running}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Traffic Pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="normal">Steady Normal</SelectItem>
                      <SelectItem value="burst">Random Burst</SelectItem>
                      <SelectItem value="ramp-up">Gradual Ramp-Up</SelectItem>
                      <SelectItem value="spike">Sudden Surge Spike</SelectItem>
                      <SelectItem value="uneven">Uneven Distribution</SelectItem>
                      <SelectItem value="mixed">Mixed HTTP Methods</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {activeLoadTest.running ? (
                <Button
                  variant="destructive"
                  className="w-full h-9 text-xs font-semibold gap-2"
                  onClick={onStopLoad}
                >
                  <Square className="size-3.5 fill-current" />
                  Stop Traffic Generator ({activeLoadTest.elapsedSeconds}s / {activeLoadTest.totalSeconds}s)
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-full h-9 text-xs font-semibold gap-2"
                  onClick={handleStartLoad}
                  disabled={isSubmitting}
                >
                  <Play className="size-3.5 fill-current" />
                  Start Live Traffic Generator
                </Button>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: FAULT INJECTION & CHAOS */}
          <TabsContent value="chaos" className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Select Target</label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={faultService}
                  onValueChange={(s: string | null) => {
                    if (!s) return;
                    setFaultService(s);
                    if (s === 'product-service') setFaultInstance('product-service-2');
                    else if (s === 'user-service') setFaultInstance('user-service-1');
                    else if (s === 'order-service') setFaultInstance('order-service-1');
                    else setFaultInstance('notification-service-1');
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="product-service">Product Service</SelectItem>
                      <SelectItem value="user-service">User Service</SelectItem>
                      <SelectItem value="order-service">Order Service</SelectItem>
                      <SelectItem value="notification-service">Notification Service</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={faultInstance} onValueChange={(i: string | null) => { if (i) setFaultInstance(i); }}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Instance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Instances</SelectItem>
                      {faultService === 'product-service' && (
                        <>
                          <SelectItem value="product-service-1">product-service-1</SelectItem>
                          <SelectItem value="product-service-2">product-service-2</SelectItem>
                          <SelectItem value="product-service-3">product-service-3</SelectItem>
                        </>
                      )}
                      {faultService === 'user-service' && (
                        <>
                          <SelectItem value="user-service-1">user-service-1</SelectItem>
                          <SelectItem value="user-service-2">user-service-2</SelectItem>
                        </>
                      )}
                      {faultService === 'order-service' && (
                        <>
                          <SelectItem value="order-service-1">order-service-1</SelectItem>
                          <SelectItem value="order-service-2">order-service-2</SelectItem>
                        </>
                      )}
                      {faultService === 'notification-service' && (
                        <>
                          <SelectItem value="notification-service-1">notification-service-1</SelectItem>
                          <SelectItem value="notification-service-2">notification-service-2</SelectItem>
                        </>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Artificial Latency Delay</span>
                  <span className="font-mono font-semibold text-foreground">{latencyMs} ms</span>
                </div>
                <Slider
                  value={[latencyMs]}
                  min={0}
                  max={800}
                  step={25}
                  onValueChange={(val: number | readonly number[]) => setLatencyMs(Array.isArray(val) ? val[0] : val)}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Simulated Failure Rate (HTTP 500)</span>
                  <span className="font-mono font-semibold text-foreground">{failureRate}%</span>
                </div>
                <Slider
                  value={[failureRate]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(val: number | readonly number[]) => setFailureRate(Array.isArray(val) ? val[0] : val)}
                />
              </div>
            </div>

            {/* Offline Switch */}
            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-background/40">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground">Kill Instance (Offline)</span>
                <p className="text-[10px] text-muted-foreground">Forces immediate HTTP 503 / 502 disconnects</p>
              </div>
              <Switch checked={isOffline} onCheckedChange={setIsOffline} />
            </div>

            <Button
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={handleApplyFault}
            >
              Apply Fault Injection
            </Button>

            {faultSuccessMsg && (
              <div className="text-[11px] text-muted-foreground text-center">{faultSuccessMsg}</div>
            )}
          </TabsContent>

          {/* TAB 3: GUIDED SCENARIOS */}
          <TabsContent value="scenarios" className="space-y-2">
            <p className="text-[11px] text-muted-foreground mb-2">
              Launch pre-programmed distributed systems experiments:
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('1-normal')}
              >
                1. Normal Flow
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('2-load-balancing')}
              >
                2. Load Balancing
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('3-traffic-spike')}
              >
                3. Traffic Spike
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('4-service-failure')}
              >
                4. Service Failure
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('5-rate-limiting')}
              >
                5. Rate Limiting
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('6-slow-service')}
              >
                6. High Latency
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('7-cascading-failure')}
              >
                7. Cascading Fail
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-[11px] h-7 px-2 truncate"
                onClick={() => handleRunScenario('8-recovery')}
              >
                <RefreshCw className="size-3 mr-1" />
                8. Full Recovery
              </Button>
            </div>

            {activeScenarioDesc && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-2.5 rounded-md border border-border bg-muted/40 text-[11px] text-foreground"
              >
                {activeScenarioDesc}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
