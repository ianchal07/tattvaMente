interface Metric {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

type Aggregation = "avg" | "sum" | "max" | "min" | "count";

export class MetricsCollector {
  private readonly serviceName: string;

  private readonly metrics = new Map<string, Metric[]>();

  private readonly maxMetricsPerName = 1_000;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  record(name: string, value: number, tags: Record<string, string> = {}) {
    const fullName = `${this.serviceName}.${name}`;
    const metric: Metric = {
      name: fullName,
      value,
      tags,
      timestamp: Date.now(),
    };

    const list = this.metrics.get(fullName) ?? [];
    list.push(metric);

    if (list.length > this.maxMetricsPerName) {
      list.splice(0, list.length - this.maxMetricsPerName);
    }

    this.metrics.set(fullName, list);
  }

  increment(name: string, value = 1, tags: Record<string, string> = {}) {
    this.record(name, value, tags);
  }

  getMetrics(name: string) {
    return [...(this.metrics.get(`${this.serviceName}.${name}`) ?? [])];
  }

  aggregate(name: string, aggregation: Aggregation): number {
    const values = this.getMetrics(name).map((metric) => metric.value);
    if (values.length === 0) {
      return 0;
    }

    if (aggregation === "count") {
      return values.length;
    }

    if (aggregation === "sum") {
      return values.reduce((sum, current) => sum + current, 0);
    }

    if (aggregation === "avg") {
      return values.reduce((sum, current) => sum + current, 0) / values.length;
    }

    if (aggregation === "max") {
      return Math.max(...values);
    }

    return Math.min(...values);
  }
}