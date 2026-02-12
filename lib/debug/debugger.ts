export type TraceId = string;

export interface Trace {
  id: TraceId;
  service: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata: Record<string, unknown>;
  result?: unknown;
}

export class Debugger {
  private readonly serviceName: string;

  private readonly active = new Map<TraceId, Trace>();

  private readonly completed: Trace[] = [];

  private readonly maxTraces = 500;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  startTrace(operation: string, metadata: Record<string, unknown> = {}): TraceId {
    const trace: Trace = {
      id: `${this.serviceName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      service: this.serviceName,
      operation,
      startTime: performance.now(),
      metadata,
    };

    this.active.set(trace.id, trace);
    return trace.id;
  }

  endTrace(traceId: TraceId, result?: unknown) {
    const trace = this.active.get(traceId);
    if (!trace) {
      return;
    }

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.result = result;

    this.active.delete(traceId);
    this.completed.push(trace);

    if (this.completed.length > this.maxTraces) {
      this.completed.splice(0, this.completed.length - this.maxTraces);
    }
  }

  addMetadata(traceId: TraceId, metadata: Record<string, unknown>) {
    const trace = this.active.get(traceId);
    if (!trace) {
      return;
    }

    trace.metadata = {
      ...trace.metadata,
      ...metadata,
    };
  }

  getTraces() {
    return [...this.completed];
  }

  getActiveTraces() {
    return Array.from(this.active.values());
  }
}