# Technical Implementation Guide

This document provides detailed implementation instructions for building the Browser LLM platform.

## Prerequisites

- Node.js 18+ 
- npm/pnpm/yarn
- Git
- Chrome/Edge 113+ for testing

## Project Setup

### Initialize Next.js Project

```bash
npx create-next-app@latest browser-llm --typescript --tailwind --app --src-dir=false
cd browser-llm
```

### Install Dependencies

```bash
# Core dependencies
npm install @mlc-ai/web-llm zustand zod

# UI dependencies
npm install antd @ant-design/icons @ant-design/cssinjs

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D eslint-config-next prettier
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Project Configuration

#### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  
  images: {
    unoptimized: true
  },
  
  webpack: (config, { isServer }) => {
    // WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true
    };
    
    // Web Worker support
    config.module.rules.push({
      test: /\.worker\.ts$/,
      use: { loader: 'worker-loader' }
    });
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      };
    }
    
    return config;
  },
  
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/types/*": ["./types/*"],
      "@/styles/*": ["./styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Directory Structure Setup

```bash
mkdir -p {app,lib,hooks,types,workers,styles,public,__tests__}
mkdir -p lib/{services,api,debug,monitoring,errors,utils,di}
mkdir -p lib/services/{webllm,storage,json,performance}
mkdir -p app/{api,components,compatibility,settings,debug}
mkdir -p hooks/{services,state}
mkdir -p __tests__/{unit,integration,e2e}
```

## Core Services Implementation

### 1. Base Service (DRY Foundation)

```typescript
// lib/services/base-service.ts

import { Logger } from '@/lib/debug/logger';
import { Debugger } from '@/lib/debug/debugger';
import { MetricsCollector } from '@/lib/monitoring/metrics-collector';

export abstract class BaseService {
  protected logger: Logger;
  protected debugger: Debugger;
  protected metrics: MetricsCollector;
  protected initialized: boolean = false;
  
  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
    this.debugger = new Debugger(serviceName);
    this.metrics = new MetricsCollector(serviceName);
  }
  
  /**
   * Initialize service - must be called before use
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Cleanup resources - call when service is no longer needed
   */
  abstract cleanup(): Promise<void>;
  
  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Ensure service is initialized before operation
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Service ${this.constructor.name} not initialized`);
    }
  }
  
  /**
   * Execute operation with automatic instrumentation
   */
  protected async executeWithInstrumentation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const traceId = this.debugger.startTrace(operation);
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.metrics.record(`${operation}.duration`, duration);
      this.metrics.record(`${operation}.success`, 1);
      this.debugger.endTrace(traceId, { success: true, duration });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.metrics.record(`${operation}.duration`, duration);
      this.metrics.record(`${operation}.error`, 1);
      this.debugger.logError(error as Error, { operation });
      this.debugger.endTrace(traceId, { success: false, duration, error });
      
      throw error;
    }
  }
}
```

### 2. Logger Implementation

```typescript
// lib/debug/logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  timestamp: number;
  stack?: string;
}

export class Logger {
  private serviceName: string;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, {
      ...data,
      error: error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
  
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) return;
    
    const entry: LogEntry = {
      level,
      service: this.serviceName,
      message,
      data,
      timestamp: Date.now(),
      stack: level === LogLevel.ERROR ? new Error().stack : undefined
    };
    
    this.logs.push(entry);
    
    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }
    
    // Emit to debug panel
    this.emitLog(entry);
  }
  
  private consoleLog(entry: LogEntry): void {
    const prefix = `[${this.serviceName}]`;
    const args = [prefix, entry.message];
    
    if (entry.data) {
      args.push(entry.data);
    }
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
        console.error(...args);
        break;
    }
  }
  
  private emitLog(entry: LogEntry): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('log', { detail: entry }));
    }
  }
  
  getLogs(filter?: { level?: LogLevel; since?: number }): LogEntry[] {
    let logs = this.logs;
    
    if (filter?.level !== undefined) {
      logs = logs.filter(l => l.level >= filter.level);
    }
    
    if (filter?.since !== undefined) {
      logs = logs.filter(l => l.timestamp >= filter.since);
    }
    
    return logs;
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}
```

### 3. Debugger Implementation

```typescript
// lib/debug/debugger.ts

export type TraceId = string;

interface Trace {
  id: TraceId;
  service: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata: Record<string, any>;
  result?: any;
}

export class Debugger {
  private serviceName: string;
  private traces: Map<TraceId, Trace> = new Map();
  private completedTraces: Trace[] = [];
  private maxTraces: number = 500;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  startTrace(operation: string, metadata?: Record<string, any>): TraceId {
    const id = this.generateTraceId();
    
    const trace: Trace = {
      id,
      service: this.serviceName,
      operation,
      startTime: performance.now(),
      metadata: metadata || {}
    };
    
    this.traces.set(id, trace);
    
    this.emit('trace:start', trace);
    
    return id;
  }
  
  endTrace(traceId: TraceId, result?: any): void {
    const trace = this.traces.get(traceId);
    
    if (!trace) {
      console.warn(`Trace ${traceId} not found`);
      return;
    }
    
    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.result = result;
    
    this.traces.delete(traceId);
    this.completedTraces.push(trace);
    
    // Trim old traces
    if (this.completedTraces.length > this.maxTraces) {
      this.completedTraces = this.completedTraces.slice(-this.maxTraces);
    }
    
    this.emit('trace:end', trace);
  }
  
  addMetadata(traceId: TraceId, metadata: Record<string, any>): void {
    const trace = this.traces.get(traceId);
    
    if (trace) {
      trace.metadata = { ...trace.metadata, ...metadata };
    }
  }
  
  logError(error: Error, context?: any): void {
    const errorLog = {
      service: this.serviceName,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: Date.now()
    };
    
    this.emit('error', errorLog);
  }
  
  getTraces(filter?: { operation?: string; since?: number }): Trace[] {
    let traces = this.completedTraces;
    
    if (filter?.operation) {
      traces = traces.filter(t => t.operation === filter.operation);
    }
    
    if (filter?.since) {
      traces = traces.filter(t => t.startTime >= filter.since);
    }
    
    return traces;
  }
  
  getActiveTraces(): Trace[] {
    return Array.from(this.traces.values());
  }
  
  private generateTraceId(): TraceId {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private emit(event: string, data: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`debug:${event}`, { detail: data }));
    }
  }
}
```

### 4. Metrics Collector Implementation

```typescript
// lib/monitoring/metrics-collector.ts

interface Metric {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

type Aggregation = 'avg' | 'sum' | 'max' | 'min' | 'count' | 'p50' | 'p95' | 'p99';

export class MetricsCollector {
  private serviceName: string;
  private metrics: Map<string, Metric[]> = new Map();
  private maxMetricsPerName: number = 1000;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name: `${this.serviceName}.${name}`,
      value,
      tags: tags || {},
      timestamp: Date.now()
    };
    
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metricList = this.metrics.get(metric.name)!;
    metricList.push(metric);
    
    // Trim old metrics
    if (metricList.length > this.maxMetricsPerName) {
      metricList.splice(0, metricList.length - this.maxMetricsPerName);
    }
    
    this.emit('metric', metric);
  }
  
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.record(name, value, tags);
  }
  
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, tags);
  }
  
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, tags);
  }
  
  getMetrics(name: string, timeRange?: [number, number]): Metric[] {
    const fullName = `${this.serviceName}.${name}`;
    const metrics = this.metrics.get(fullName) || [];
    
    if (!timeRange) return metrics;
    
    return metrics.filter(m =>
      m.timestamp >= timeRange[0] &&
      m.timestamp <= timeRange[1]
    );
  }
  
  aggregate(name: string, aggregation: Aggregation, timeRange?: [number, number]): number {
    const metrics = this.getMetrics(name, timeRange);
    const values = metrics.map(m => m.value);
    
    if (values.length === 0) return 0;
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'count':
        return values.length;
      case 'p50':
        return this.percentile(values, 50);
      case 'p95':
        return this.percentile(values, 95);
      case 'p99':
        return this.percentile(values, 99);
      default:
        return 0;
    }
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    
    return sorted[index];
  }
  
  getAllMetrics(): Map<string, Metric[]> {
    return this.metrics;
  }
  
  clearMetrics(): void {
    this.metrics.clear();
  }
  
  private emit(event: string, data: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`metrics:${event}`, { detail: data }));
    }
  }
}
```

### 5. Storage Service Implementation

```typescript
// lib/services/storage/storage-service.ts

import { BaseService } from '../base-service';
import { openDB, IDBPDatabase } from 'idb';

interface StorageConfig {
  dbName: string;
  version: number;
  stores: string[];
}

export class StorageService extends BaseService {
  private db: IDBPDatabase | null = null;
  private config: StorageConfig;
  private memoryCache: Map<string, any> = new Map();
  private maxCacheSize: number = 100;
  
  constructor(config: StorageConfig) {
    super('StorageService');
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    return this.executeWithInstrumentation('initialize', async () => {
      this.logger.info('Initializing storage service', { config: this.config });
      
      // Request persistent storage
      if (navigator.storage && navigator.storage.persist) {
        const persistent = await navigator.storage.persist();
        this.logger.info('Persistent storage', { granted: persistent });
      }
      
      // Open IndexedDB
      this.db = await openDB(this.config.dbName, this.config.version, {
        upgrade(db) {
          for (const storeName of config.stores) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
            }
          }
        }
      });
      
      this.initialized = true;
      this.logger.info('Storage service initialized');
    });
  }
  
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up storage service');
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.memoryCache.clear();
    this.initialized = false;
  }
  
  async get<T>(storeName: string, key: string): Promise<T | null> {
    this.ensureInitialized();
    
    return this.executeWithInstrumentation('get', async () => {
      // Check memory cache first
      const cacheKey = `${storeName}:${key}`;
      if (this.memoryCache.has(cacheKey)) {
        this.metrics.increment('cache.hit');
        return this.memoryCache.get(cacheKey);
      }
      
      this.metrics.increment('cache.miss');
      
      // Get from IndexedDB
      const value = await this.db!.get(storeName, key);
      
      if (value !== undefined) {
        // Store in memory cache
        this.memoryCache.set(cacheKey, value);
        this.evictCache();
      }
      
      return value || null;
    });
  }
  
  async set<T>(storeName: string, key: string, value: T): Promise<void> {
    this.ensureInitialized();
    
    return this.executeWithInstrumentation('set', async () => {
      // Set in IndexedDB
      await this.db!.put(storeName, value, key);
      
      // Update memory cache
      const cacheKey = `${storeName}:${key}`;
      this.memoryCache.set(cacheKey, value);
      this.evictCache();
    });
  }
  
  async delete(storeName: string, key: string): Promise<void> {
    this.ensureInitialized();
    
    return this.executeWithInstrumentation('delete', async () => {
      await this.db!.delete(storeName, key);
      
      const cacheKey = `${storeName}:${key}`;
      this.memoryCache.delete(cacheKey);
    });
  }
  
  async clear(storeName: string): Promise<void> {
    this.ensureInitialized();
    
    return this.executeWithInstrumentation('clear', async () => {
      await this.db!.clear(storeName);
      
      // Clear cache entries for this store
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${storeName}:`)) {
          this.memoryCache.delete(key);
        }
      }
    });
  }
  
  async getAll<T>(storeName: string): Promise<T[]> {
    this.ensureInitialized();
    
    return this.executeWithInstrumentation('getAll', async () => {
      return await this.db!.getAll(storeName);
    });
  }
  
  async getStorageQuota(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    
    return { usage: 0, quota: 0 };
  }
  
  private evictCache(): void {
    if (this.memoryCache.size > this.maxCacheSize) {
      // LRU eviction - remove oldest entries
      const keys = Array.from(this.memoryCache.keys());
      const toRemove = keys.slice(0, this.memoryCache.size - this.maxCacheSize);
      
      for (const key of toRemove) {
        this.memoryCache.delete(key);
      }
      
      this.metrics.increment('cache.eviction', toRemove.length);
    }
  }
}
```

Continue in next part...
