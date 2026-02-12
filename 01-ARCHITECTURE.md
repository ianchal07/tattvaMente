# Architecture Overview

## System Design Philosophy

### Core Principles

1. **Resilience-First**: Assume everything can fail
2. **DRY (Don't Repeat Yourself)**: Shared logic in reusable modules
3. **Debugging-Friendly**: Instrumented code with rich logging
4. **API-First**: All features exposed via clean interfaces
5. **Progressive Enhancement**: Graceful degradation on weaker systems

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Next.js App (React)                                        │
│  ├── UI Components (Ant Design 6)                           │
│  ├── State Management (Zustand)                             │
│  └── Routing (App Router)                                   │
├─────────────────────────────────────────────────────────────┤
│                     API Layer (Express-like)                 │
│  ├── /api/v1/generate        (Text generation)             │
│  ├── /api/v1/models          (Model management)            │
│  ├── /api/v1/status          (Health check)                │
│  └── /api/v1/debug           (Debug endpoints)             │
├─────────────────────────────────────────────────────────────┤
│                      Core Services Layer                     │
│  ├── WebLLM Engine Service                                  │
│  ├── Storage Service                                        │
│  ├── JSON Service                                           │
│  ├── Performance Monitor Service                            │
│  └── Debug Service                                          │
├─────────────────────────────────────────────────────────────┤
│                      Web Worker Layer                        │
│  ├── Inference Worker (isolated execution)                  │
│  ├── Download Worker (chunked downloads)                    │
│  └── Storage Worker (IndexedDB operations)                  │
├─────────────────────────────────────────────────────────────┤
│                      Browser APIs                            │
│  ├── WebGPU (inference)                                     │
│  ├── IndexedDB (storage)                                    │
│  ├── Service Worker (caching)                               │
│  ├── Performance API (monitoring)                           │
│  └── Storage API (persistence)                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Layer

**Technology:** Next.js 14+ App Router + React 18+

```typescript
// Component hierarchy
App
├── Layout (global theme, providers)
├── Routes
│   ├── / (Home/Chat)
│   ├── /compatibility (System check)
│   ├── /settings (Configuration)
│   └── /debug (Debug panel)
└── Shared Components
    ├── ModelSelector
    ├── ChatInterface
    ├── ParameterControls
    ├── PerformanceMonitor
    └── DebugPanel
```

**State Management Pattern:**

```typescript
// Zustand stores (DRY principle)
├── useSystemStore      // Hardware info, compatibility
├── useModelStore       // Model state, loading
├── useChatStore        // Conversation history
├── usePerformanceStore // Metrics, monitoring
└── useDebugStore       // Debug logs, profiling
```

### 2. API Layer

**RESTful API Design** (for third-party integration)

```typescript
// API route structure
app/api/v1/
├── generate/route.ts       // POST - Generate text
├── models/route.ts         // GET - List models
├── models/[id]/route.ts    // GET - Model details
├── status/route.ts         // GET - System status
├── debug/logs/route.ts     // GET - Debug logs
└── debug/profile/route.ts  // GET - Performance profile
```

**API Response Format:**

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: number;
    version: string;
  };
}
```

### 3. Service Layer (DRY Architecture)

All business logic abstracted into services:

```typescript
// lib/services/base-service.ts
abstract class BaseService {
  protected logger: Logger;
  protected debugger: Debugger;
  
  constructor() {
    this.logger = new Logger(this.constructor.name);
    this.debugger = new Debugger(this.constructor.name);
  }
  
  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;
}

// Concrete services extend BaseService
class WebLLMService extends BaseService {
  // Implementation
}

class StorageService extends BaseService {
  // Implementation
}
```

### 4. Web Worker Architecture

**Inference Worker** (isolated execution):

```typescript
// workers/inference.worker.ts
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'GENERATE':
        await handleGenerate(payload);
        break;
      case 'ABORT':
        await handleAbort();
        break;
      case 'CLEANUP':
        await handleCleanup();
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: serializeError(error)
    });
  }
};
```

**Worker Communication Pattern:**

```typescript
// Main thread
const worker = new Worker('inference.worker.ts');

worker.postMessage({
  type: 'GENERATE',
  payload: { prompt, params }
});

worker.onmessage = (event) => {
  const { type, data, error } = event.data;
  
  switch (type) {
    case 'TOKEN':
      handleStreamToken(data);
      break;
    case 'COMPLETE':
      handleComplete(data);
      break;
    case 'ERROR':
      handleError(error);
      break;
  }
};
```

## Data Flow Architecture

### Request Flow (Chat Message)

```
User Input
    ↓
React Component (ChatInterface)
    ↓
Zustand Store (useChatStore.send)
    ↓
Service Layer (WebLLMService.generate)
    ↓
Web Worker (InferenceWorker)
    ↓
WebLLM Engine (WebGPU execution)
    ↓
Stream Tokens Back
    ↓
Update UI (React state)
    ↓
Store History (IndexedDB)
```

### API Request Flow (Third-Party)

```
HTTP Request
    ↓
Next.js API Route (/api/v1/generate)
    ↓
Request Validation (Zod schema)
    ↓
Rate Limiting Check
    ↓
Service Layer (WebLLMService)
    ↓
Web Worker (same as above)
    ↓
Response Formatting
    ↓
HTTP Response (JSON)
```

## Storage Architecture

### Three-Tier Storage System

```typescript
// Tier 1: In-Memory Cache (fastest)
class MemoryCache {
  private cache: Map<string, any>;
  private maxSize: number;
  
  get(key: string): any | null;
  set(key: string, value: any): void;
  evict(): void; // LRU eviction
}

// Tier 2: IndexedDB (persistent)
class PersistentStorage {
  private db: IDBDatabase;
  
  async get(key: string): Promise<any>;
  async set(key: string, value: any): Promise<void>;
  async delete(key: string): Promise<void>;
}

// Tier 3: Service Worker (static assets)
class CacheStorage {
  async cacheAsset(url: string): Promise<void>;
  async getAsset(url: string): Promise<Response>;
}
```

### Storage Service (DRY Pattern)

```typescript
// lib/services/storage-service.ts
class StorageService extends BaseService {
  private memory: MemoryCache;
  private persistent: PersistentStorage;
  private cache: CacheStorage;
  
  async get(key: string): Promise<any> {
    // Try memory first
    let value = this.memory.get(key);
    if (value) return value;
    
    // Try persistent
    value = await this.persistent.get(key);
    if (value) {
      this.memory.set(key, value);
      return value;
    }
    
    return null;
  }
  
  async set(key: string, value: any, tier: 'memory' | 'persistent' | 'both') {
    if (tier === 'memory' || tier === 'both') {
      this.memory.set(key, value);
    }
    
    if (tier === 'persistent' || tier === 'both') {
      await this.persistent.set(key, value);
    }
  }
}
```

## Debugging Architecture

### Instrumentation Layer

Every service is instrumented with debugging hooks:

```typescript
// lib/debug/debugger.ts
class Debugger {
  private serviceName: string;
  private traces: Trace[];
  
  startTrace(operation: string): TraceId {
    const trace = {
      id: generateId(),
      service: this.serviceName,
      operation,
      startTime: performance.now(),
      metadata: {}
    };
    
    this.traces.push(trace);
    return trace.id;
  }
  
  endTrace(traceId: TraceId, result?: any) {
    const trace = this.traces.find(t => t.id === traceId);
    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.result = result;
    
    // Emit to debug panel
    this.emit('trace:complete', trace);
  }
  
  logError(error: Error, context?: any) {
    const errorLog = {
      service: this.serviceName,
      error: serializeError(error),
      context,
      timestamp: Date.now(),
      stack: error.stack
    };
    
    this.emit('error', errorLog);
  }
}
```

### Usage in Services

```typescript
class WebLLMService extends BaseService {
  async generate(prompt: string, params: GenerateParams) {
    const traceId = this.debugger.startTrace('generate');
    
    try {
      const result = await this.engine.generate(prompt, params);
      this.debugger.endTrace(traceId, { tokenCount: result.tokens });
      return result;
    } catch (error) {
      this.debugger.logError(error, { prompt, params });
      this.debugger.endTrace(traceId);
      throw error;
    }
  }
}
```

## Performance Monitoring Architecture

### Metrics Collection

```typescript
// lib/monitoring/metrics-collector.ts
class MetricsCollector {
  private metrics: Map<string, Metric[]>;
  
  record(name: string, value: number, tags?: Record<string, string>) {
    const metric = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(metric);
    
    // Emit to monitoring dashboard
    this.emit('metric', metric);
  }
  
  getMetrics(name: string, timeRange?: [number, number]): Metric[] {
    const metrics = this.metrics.get(name) || [];
    
    if (!timeRange) return metrics;
    
    return metrics.filter(m => 
      m.timestamp >= timeRange[0] && 
      m.timestamp <= timeRange[1]
    );
  }
  
  aggregate(name: string, aggregation: 'avg' | 'sum' | 'max' | 'min'): number {
    const metrics = this.metrics.get(name) || [];
    const values = metrics.map(m => m.value);
    
    switch (aggregation) {
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'max': return Math.max(...values);
      case 'min': return Math.min(...values);
    }
  }
}
```

### Auto-Instrumentation

```typescript
// Decorator for automatic performance tracking
function measure(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    const start = performance.now();
    
    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;
      
      metricsCollector.record(`${target.constructor.name}.${propertyKey}`, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      metricsCollector.record(`${target.constructor.name}.${propertyKey}.error`, duration);
      throw error;
    }
  };
  
  return descriptor;
}

// Usage
class WebLLMService {
  @measure
  async generate(prompt: string) {
    // Automatically tracked
  }
}
```

## Error Handling Architecture

### Centralized Error Handler

```typescript
// lib/errors/error-handler.ts
class ErrorHandler {
  handle(error: Error, context?: ErrorContext): HandledError {
    // Classify error
    const classification = this.classifyError(error);
    
    // Log to debug system
    debugService.logError(error, context);
    
    // Record metric
    metricsCollector.record('errors', 1, {
      type: classification.type,
      severity: classification.severity
    });
    
    // Determine recovery strategy
    const recovery = this.getRecoveryStrategy(classification);
    
    // Return handled error
    return {
      error,
      classification,
      recovery,
      userMessage: this.getUserMessage(classification)
    };
  }
  
  private classifyError(error: Error): ErrorClassification {
    if (error instanceof WebGPUContextLossError) {
      return { type: 'webgpu', severity: 'high', recoverable: true };
    }
    // ... more classifications
  }
  
  private getRecoveryStrategy(classification: ErrorClassification): RecoveryStrategy {
    // Return appropriate recovery steps
  }
}
```

## Dependency Injection (DRY Pattern)

```typescript
// lib/di/container.ts
class DIContainer {
  private services: Map<string, any> = new Map();
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, { factory, instance: null });
  }
  
  resolve<T>(name: string): T {
    const service = this.services.get(name);
    
    if (!service.instance) {
      service.instance = service.factory();
    }
    
    return service.instance;
  }
}

// Setup
const container = new DIContainer();

container.register('webllm', () => new WebLLMService());
container.register('storage', () => new StorageService());
container.register('debug', () => new DebugService());

// Usage
const webllm = container.resolve<WebLLMService>('webllm');
```

## Module Structure

### Core Modules

```
lib/
├── services/           # Business logic services
│   ├── base-service.ts
│   ├── webllm-service.ts
│   ├── storage-service.ts
│   ├── json-service.ts
│   └── performance-service.ts
├── api/               # API layer
│   ├── router.ts
│   ├── middleware.ts
│   └── validators.ts
├── debug/             # Debugging infrastructure
│   ├── debugger.ts
│   ├── logger.ts
│   └── profiler.ts
├── monitoring/        # Performance monitoring
│   ├── metrics-collector.ts
│   └── health-check.ts
├── errors/            # Error handling
│   ├── error-handler.ts
│   ├── error-types.ts
│   └── recovery.ts
├── utils/             # Shared utilities (DRY)
│   ├── validators.ts
│   ├── formatters.ts
│   └── helpers.ts
└── di/               # Dependency injection
    └── container.ts
```

## Testing Architecture

### Test Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /____\     
     /      \    Integration Tests (30%)
    /________\   
   /          \  Unit Tests (60%)
  /____________\ 
```

### Test Structure

```
__tests__/
├── unit/
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/
│   ├── api/
│   ├── storage/
│   └── workers/
└── e2e/
    ├── chat-flow.spec.ts
    ├── model-loading.spec.ts
    └── error-recovery.spec.ts
```

## Scalability Considerations

### Horizontal Scaling (Future)

```typescript
// Multi-worker support for parallel inference
class WorkerPool {
  private workers: Worker[];
  private queue: Task[];
  
  async execute<T>(task: Task): Promise<T> {
    const worker = await this.getAvailableWorker();
    return worker.execute(task);
  }
  
  private async getAvailableWorker(): Promise<Worker> {
    // Round-robin or least-busy selection
  }
}
```

### Performance Optimization

```typescript
// Lazy loading for large modules
const WebLLMEngine = lazy(() => import('./webllm-engine'));

// Code splitting by route
const DebugPanel = lazy(() => import('./debug-panel'));

// Memoization for expensive computations
const memoizedTokenizer = memoize(tokenize);
```

## Security Considerations

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval';"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  }
];
```

### Input Validation

```typescript
// All inputs validated with Zod
import { z } from 'zod';

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  max_tokens: z.number().int().min(1).max(4096),
  temperature: z.number().min(0).max(2)
});
```

## Deployment Architecture

### Static Site Generation

```typescript
// next.config.js
module.exports = {
  output: 'export',
  images: { unoptimized: true },
  webpack: (config) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true
    };
    return config;
  }
};
```

### CDN Distribution

```
Cloudflare/Vercel Edge
    ↓
Static HTML/CSS/JS
    ↓
User Browser
    ↓
WebGPU Inference (local)
```

## Architecture Decision Records (ADRs)

Major architectural decisions documented in:

```
docs/adr/
├── 001-use-nextjs-app-router.md
├── 002-webgpu-over-wasm.md
├── 003-zustand-for-state.md
├── 004-web-workers-for-inference.md
└── 005-antd-for-ui.md
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to Interactive | <3s | Lighthouse |
| First Contentful Paint | <1.5s | Lighthouse |
| Inference Latency | <100ms/token | Custom metrics |
| Memory Usage | <4GB | Chrome DevTools |
| Bundle Size | <500KB | webpack-bundle-analyzer |

## Summary

This architecture prioritizes:

1. **Resilience**: Multi-layer error handling and recovery
2. **DRY**: Shared services and utilities
3. **Debugging**: Comprehensive instrumentation
4. **API-First**: All features exposed via APIs
5. **Performance**: Optimized for speed and efficiency
6. **Maintainability**: Clear structure and documentation

Next: [Technical Implementation](./02-TECHNICAL-IMPLEMENTATION.md)
