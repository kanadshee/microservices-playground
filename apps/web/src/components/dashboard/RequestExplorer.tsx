'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ListFilter, ArrowRight, Clock, Network } from 'lucide-react';
import type { TelemetryEvent } from '@micro/shared';

interface RequestExplorerProps {
  events: TelemetryEvent[];
}

export function RequestExplorer({ events }: RequestExplorerProps) {
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return <Badge variant="outline" className="text-[10px] h-5">{code} OK</Badge>;
    }
    if (code === 429) {
      return <Badge variant="secondary" className="text-[10px] h-5">429 RATE LIMIT</Badge>;
    }
    if (code >= 500) {
      return <Badge variant="destructive" className="text-[10px] h-5">{code} ERROR</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px] h-5">{code}</Badge>;
  };

  return (
    <Card className="border border-border bg-card/90 backdrop-blur-md shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ListFilter className="size-4 text-foreground" />
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-foreground">
            Live Request Explorer & Traces
          </CardTitle>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Last {events.length} transactions
        </span>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[360px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-sm z-10">
              <TableRow className="border-border">
                <TableHead className="w-[90px] text-xs">Status</TableHead>
                <TableHead className="w-[70px] text-xs">Method</TableHead>
                <TableHead className="text-xs">Endpoint</TableHead>
                <TableHead className="text-xs">Target Service</TableHead>
                <TableHead className="text-xs">Routed Instance</TableHead>
                <TableHead className="text-right text-xs">Duration</TableHead>
                <TableHead className="text-right text-xs">Upstream</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-xs text-muted-foreground">
                    No requests captured yet. Start the traffic generator to observe live routing.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev, idx) => (
                  <TableRow
                    key={`${ev.id || 'ev'}-${idx}`}
                    className="cursor-pointer hover:bg-muted/50 border-border text-xs transition-colors"
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <TableCell className="py-2">{getStatusBadge(ev.statusCode)}</TableCell>
                    <TableCell className="py-2 font-mono font-medium text-[11px] text-foreground">
                      {ev.method}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-[11px] truncate max-w-[160px]">
                      {ev.path}
                    </TableCell>
                    <TableCell className="py-2 text-[11px] text-muted-foreground">
                      {ev.targetService}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="font-mono text-[11px] text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                        {ev.instanceId}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-[11px] text-foreground">
                      {ev.durationMs}ms
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-[11px] text-muted-foreground">
                      {ev.upstreamDurationMs}ms
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Request Trace Journey Dialog */}
      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent className="max-w-xl border-border bg-card">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  <Network className="size-4 text-foreground" />
                  Distributed Trace Journey
                </DialogTitle>
                {getStatusBadge(selectedEvent.statusCode)}
              </div>
              <DialogDescription className="text-xs font-mono text-muted-foreground truncate">
                ID: {selectedEvent.requestId}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Journey Path Overview */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Client</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Gateway (Port 80/8080)</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{selectedEvent.instanceId}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-foreground">
                  <Clock className="size-3" />
                  {selectedEvent.durationMs}ms
                </div>
              </div>

              {/* Waterfall Spans */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trace Spans Waterfall
                </h4>

                {/* Gateway Span */}
                <div className="p-2.5 rounded border border-border bg-background space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">1. API Gateway Reverse Proxy Ingress</span>
                    <span className="font-mono text-muted-foreground">{selectedEvent.durationMs}ms</span>
                  </div>
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-foreground h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Proxy to upstream {selectedEvent.instanceId}
                  </div>
                </div>

                {/* Upstream Microservice Span */}
                <div className="p-2.5 rounded border border-border bg-background space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">2. Microservice Processing ({selectedEvent.targetService})</span>
                    <span className="font-mono text-muted-foreground">{selectedEvent.upstreamDurationMs}ms</span>
                  </div>
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-foreground/70 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (selectedEvent.upstreamDurationMs / Math.max(1, selectedEvent.durationMs)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Database queries + route logic execution
                  </div>
                </div>
              </div>

              {/* Detailed Headers & Metadata */}
              <div className="p-3 rounded border border-border bg-muted/20 font-mono text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-foreground">{new Date(selectedEvent.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Instance:</span>
                  <span className="text-foreground">{selectedEvent.instanceId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Distributed Trace ID:</span>
                  <span className="text-foreground truncate max-w-[280px]">{selectedEvent.requestId}</span>
                </div>
                {selectedEvent.spans && selectedEvent.spans.length > 0 && (
                  <div className="flex justify-between">
                    <span>Primary Span ID:</span>
                    <span className="text-foreground truncate max-w-[280px]">{selectedEvent.spans[0]?.spanId}</span>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
