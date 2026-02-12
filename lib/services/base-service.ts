import { Debugger } from "@/lib/debug/debugger";
import { Logger } from "@/lib/debug/logger";
import { MetricsCollector } from "@/lib/monitoring/metrics-collector";

export abstract class BaseService {
  protected readonly logger: Logger;

  protected readonly debugger: Debugger;

  protected readonly metrics: MetricsCollector;

  protected initialized = false;

  protected constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
    this.debugger = new Debugger(serviceName);
    this.metrics = new MetricsCollector(serviceName);
  }

  abstract initialize(): Promise<void>;

  abstract cleanup(): Promise<void>;

  protected ensureInitialized() {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized`);
    }
  }

  protected async withInstrumentation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const traceId = this.debugger.startTrace(operation);
    const started = performance.now();

    try {
      const result = await fn();
      this.metrics.record(`${operation}.duration`, performance.now() - started);
      this.metrics.increment(`${operation}.success`);
      this.debugger.endTrace(traceId, { success: true });
      return result;
    } catch (error) {
      this.metrics.record(`${operation}.duration`, performance.now() - started);
      this.metrics.increment(`${operation}.error`);
      this.logger.error(`Operation failed: ${operation}`, error as Error);
      this.debugger.endTrace(traceId, { success: false });
      throw error;
    }
  }
}