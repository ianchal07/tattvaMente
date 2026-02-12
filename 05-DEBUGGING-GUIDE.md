# Debugging Guide

## Overview

Browser LLM includes comprehensive debugging tools to help developers diagnose issues, optimize performance, and understand system behavior.

## Debug Panel

Access the debug panel by pressing `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac).

### Panel Sections

```
┌─────────────────────────────────────────────────────────┐
│  Debug Panel                                      [×]   │
├─────────────────────────────────────────────────────────┤
│  [Logs] [Traces] [Metrics] [Network] [Storage] [GPU]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Content Area                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Logging System

### Log Levels

```typescript
enum LogLevel {
  DEBUG = 0,   // Detailed debugging information
  INFO = 1,    // General informational messages
  WARN = 2,    // Warning messages
  ERROR = 3    // Error messages
}
```

### Using the Logger

```typescript
import { Logger } from '@/lib/debug/logger';

const logger = new Logger('MyService');

// Debug logging
logger.debug('Processing request', { userId: 123 });

// Info logging
logger.info('Model loaded successfully', { modelId: 'phi-3-mini' });

// Warning logging
logger.warn('High memory usage detected', { usage: 7.2 });

// Error logging
logger.error('Failed to generate text', error, { prompt: '...' });
```

### Viewing Logs

**In Debug Panel:**

```typescript
// Filter logs by level
const errorLogs = logger.getLogs({ level: LogLevel.ERROR });

// Filter logs by time
const recentLogs = logger.getLogs({ since: Date.now() - 60000 }); // Last minute

// Clear logs
logger.clearLogs();
```

**In Console:**

```javascript
// Development mode automatically outputs to console
[WebLLMService] Model loaded successfully { modelId: 'phi-3-mini' }
```

### Structured Logging

All logs use structured format:

```typescript
interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  timestamp: number;
  stack?: string;  // Only for errors
}
```

## Tracing System

Track execution flow and performance:

### Creating Traces

```typescript
import { Debugger } from '@/lib/debug/debugger';

const debugger = new Debugger('MyService');

async function myOperation() {
  // Start trace
  const traceId = debugger.startTrace('myOperation', {
    userId: 123,
    action: 'generate'
  });
  
  try {
    // Your code here
    const result = await doSomething();
    
    // Add metadata during execution
    debugger.addMetadata(traceId, { itemsProcessed: 42 });
    
    // End trace with result
    debugger.endTrace(traceId, { success: true, result });
    
    return result;
  } catch (error) {
    debugger.logError(error, { traceId });
    debugger.endTrace(traceId, { success: false, error });
    throw error;
  }
}
```

### Viewing Traces

```typescript
// Get all completed traces
const traces = debugger.getTraces();

// Filter by operation
const generateTraces = debugger.getTraces({
  operation: 'generate'
});

// Filter by time range
const recentTraces = debugger.getTraces({
  since: Date.now() - 60000
});

// Get active (ongoing) traces
const activeTraces = debugger.getActiveTraces();
```

### Trace Visualization

Traces are displayed in the Debug Panel with:

```
Operation: generate
Duration: 234ms
Start: 2024-01-15 10:30:45.123
End: 2024-01-15 10:30:45.357

Metadata:
  userId: 123
  action: 'generate'
  itemsProcessed: 42

Result:
  success: true
  tokensGenerated: 156
```

## Performance Monitoring

### Metrics Collection

```typescript
import { MetricsCollector } from '@/lib/monitoring/metrics-collector';

const metrics = new MetricsCollector('MyService');

// Record a metric
metrics.record('request.duration', 234, { endpoint: '/generate' });

// Increment a counter
metrics.increment('requests.total');

// Record a gauge (current value)
metrics.gauge('memory.usage', 3.2);

// Record a histogram (distribution)
metrics.histogram('response.time', 54);
```

### Viewing Metrics

```typescript
// Get metrics for a specific name
const durations = metrics.getMetrics('request.duration');

// Get metrics in time range
const last5Min = metrics.getMetrics('request.duration', [
  Date.now() - 300000,
  Date.now()
]);

// Get aggregated value
const avgDuration = metrics.aggregate('request.duration', 'avg');
const p95Duration = metrics.aggregate('request.duration', 'p95');
const maxDuration = metrics.aggregate('request.duration', 'max');
```

### Real-Time Metrics Dashboard

The Debug Panel shows real-time metrics:

```
┌─────────────────────────────────────────┐
│  Performance Metrics                    │
├─────────────────────────────────────────┤
│  Request Duration (avg):    234ms       │
│  Request Duration (p95):    567ms       │
│  Request Duration (max):    892ms       │
│                                         │
│  ████████████████░░░░░░░░░░  65%        │
│                                         │
│  Tokens/Second:     18.5                │
│  Memory Usage:      3.2 GB              │
│  GPU Utilization:   ~45%                │
└─────────────────────────────────────────┘
```

## Automatic Instrumentation

### Method Decorator

Automatically instrument methods:

```typescript
import { measure } from '@/lib/debug/decorators';

class MyService {
  @measure
  async processData(data: any) {
    // Automatically tracked:
    // - Execution time
    // - Success/failure
    // - Error details (if any)
    return transformData(data);
  }
}
```

### Service Base Class

All services extending `BaseService` get automatic instrumentation:

```typescript
class MyService extends BaseService {
  async myMethod() {
    return this.executeWithInstrumentation('myMethod', async () => {
      // Your code here
      // Automatically tracked:
      // - Trace created
      // - Metrics recorded
      // - Errors logged
      return result;
    });
  }
}
```

## Network Debugging

### Request/Response Inspector

View all WebLLM requests and responses:

```
┌────────────────────────────────────────────────────────┐
│  Network Inspector                                     │
├────────────────────────────────────────────────────────┤
│  ↓ Request #42 - 10:30:45.123                         │
│    Method: POST                                        │
│    Endpoint: /generate                                 │
│    Payload:                                            │
│      prompt: "Hello, AI!"                             │
│      max_tokens: 100                                   │
│                                                        │
│  ↑ Response #42 - 10:30:45.357 (234ms)               │
│    Status: 200 OK                                      │
│    Body:                                               │
│      text: "Hello! How can I help you today?"         │
│      tokens: 8                                         │
└────────────────────────────────────────────────────────┘
```

### Tracking Network Activity

```typescript
// Automatic tracking of all API calls
window.addEventListener('api:request', (event) => {
  console.log('Request:', event.detail);
});

window.addEventListener('api:response', (event) => {
  console.log('Response:', event.detail);
});
```

## Storage Debugging

### IndexedDB Inspector

View and manage IndexedDB contents:

```
┌────────────────────────────────────────────────────────┐
│  Storage Inspector                                     │
├────────────────────────────────────────────────────────┤
│  Database: browser-llm                                 │
│  Version: 1                                            │
│  Size: 2.3 GB                                          │
│                                                        │
│  Stores:                                               │
│    ├─ models (1 item)                                 │
│    ├─ conversations (15 items)                        │
│    └─ cache (234 items)                               │
│                                                        │
│  Quota:                                                │
│    Used: 2.3 GB / 50 GB (4.6%)                        │
│                                                        │
│  [Clear All] [Export] [Import]                        │
└────────────────────────────────────────────────────────┘
```

### Storage Events

Monitor storage operations:

```typescript
// Listen for storage events
window.addEventListener('storage:set', (event) => {
  console.log('Data stored:', event.detail);
});

window.addEventListener('storage:get', (event) => {
  console.log('Data retrieved:', event.detail);
});

window.addEventListener('storage:delete', (event) => {
  console.log('Data deleted:', event.detail);
});
```

## GPU Debugging

### WebGPU Monitor

Track GPU-related information:

```
┌────────────────────────────────────────────────────────┐
│  WebGPU Monitor                                        │
├────────────────────────────────────────────────────────┤
│  Adapter:                                              │
│    Name: NVIDIA GeForce RTX 3060                      │
│    Vendor: NVIDIA                                      │
│    Architecture: Ampere                                │
│                                                        │
│  Context Status: Active                                │
│  Context Losses: 0                                     │
│  Last Context Loss: Never                              │
│                                                        │
│  Memory:                                               │
│    Allocated: ~3.2 GB                                 │
│    Peak: 3.8 GB                                        │
│                                                        │
│  Performance:                                          │
│    Tokens/sec: 18.5                                    │
│    Latency: 54ms                                       │
│    Trend: Stable ━━━━━━━━━━                           │
└────────────────────────────────────────────────────────┘
```

### GPU Error Detection

Automatically detect and log GPU issues:

```typescript
// Context loss detection
window.addEventListener('webgpu:contextloss', (event) => {
  console.error('WebGPU context lost!', event.detail);
  // Automatic recovery triggered
});

// Memory errors
window.addEventListener('webgpu:memoryerror', (event) => {
  console.error('GPU memory error:', event.detail);
  // Panic mode triggered
});
```

## Error Categorization

Errors are automatically categorized for easier debugging:

```typescript
enum ErrorCategory {
  WEBGPU = 'webgpu',           // GPU-related errors
  STORAGE = 'storage',         // Storage/IndexedDB errors
  INFERENCE = 'inference',     // Inference errors
  JSON = 'json',               // JSON parsing errors
  NETWORK = 'network',         // Network errors
  VALIDATION = 'validation',   // Input validation errors
  UNKNOWN = 'unknown'          // Uncategorized errors
}
```

### Error Display

```
┌────────────────────────────────────────────────────────┐
│  Error Details                                         │
├────────────────────────────────────────────────────────┤
│  Category: webgpu                                      │
│  Severity: high                                        │
│  Time: 10:30:45.123                                    │
│                                                        │
│  Message:                                              │
│    WebGPU context lost                                 │
│                                                        │
│  Context:                                              │
│    operation: 'generate'                              │
│    modelId: 'phi-3-mini'                              │
│                                                        │
│  Stack Trace:                                          │
│    at WebLLMService.generate (webllm-service.ts:123)  │
│    at ChatInterface.sendMessage (chat.tsx:45)         │
│                                                        │
│  Recovery:                                             │
│    ✓ Context restored                                 │
│    ✓ Model reloaded                                   │
│    ✓ Request retried                                  │
│                                                        │
│  [Copy] [Report Bug]                                  │
└────────────────────────────────────────────────────────┘
```

## Performance Profiling

### CPU Profiler

```typescript
import { Profiler } from '@/lib/debug/profiler';

const profiler = new Profiler();

// Start profiling
profiler.start('myOperation');

// Your code here
await doSomething();

// End profiling
const profile = profiler.end('myOperation');

console.log('Profile:', profile);
// Output:
// {
//   operation: 'myOperation',
//   duration: 234,
//   breakdown: {
//     parsing: 45,
//     inference: 156,
//     formatting: 33
//   }
// }
```

### Memory Profiler

```typescript
// Track memory usage
const memoryBefore = performance.memory.usedJSHeapSize;

await myOperation();

const memoryAfter = performance.memory.usedJSHeapSize;
const memoryDelta = memoryAfter - memoryBefore;

console.log(`Memory used: ${memoryDelta / 1024 / 1024} MB`);
```

## Debug Configuration

### Enable/Disable Features

```typescript
// lib/debug/config.ts

export const debugConfig = {
  enabled: process.env.NODE_ENV === 'development',
  
  logging: {
    enabled: true,
    level: LogLevel.DEBUG,
    console: true,
    maxLogs: 1000
  },
  
  tracing: {
    enabled: true,
    maxTraces: 500,
    detailedStacks: true
  },
  
  metrics: {
    enabled: true,
    maxMetricsPerName: 1000,
    aggregationInterval: 5000
  },
  
  profiling: {
    enabled: true,
    cpuProfiling: true,
    memoryProfiling: true
  }
};
```

### Runtime Configuration

```typescript
// Change debug settings at runtime
import { setDebugConfig } from '@/lib/debug/config';

// Enable verbose logging
setDebugConfig({
  logging: {
    level: LogLevel.DEBUG
  }
});

// Disable tracing
setDebugConfig({
  tracing: {
    enabled: false
  }
});
```

## Export Debug Data

### Export Logs

```typescript
import { exportLogs } from '@/lib/debug/export';

// Export logs as JSON
const logsJSON = exportLogs('json');
downloadFile('debug-logs.json', logsJSON);

// Export logs as CSV
const logsCSV = exportLogs('csv');
downloadFile('debug-logs.csv', logsCSV);
```

### Export Traces

```typescript
import { exportTraces } from '@/lib/debug/export';

const traces = exportTraces();
downloadFile('debug-traces.json', JSON.stringify(traces, null, 2));
```

### Export Metrics

```typescript
import { exportMetrics } from '@/lib/debug/export';

const metrics = exportMetrics();
downloadFile('debug-metrics.json', JSON.stringify(metrics, null, 2));
```

## Common Debugging Scenarios

### Scenario 1: Slow Inference

**Steps:**

1. Open Debug Panel (`Ctrl+Shift+D`)
2. Go to Metrics tab
3. Check `inference.duration` metrics
4. Check GPU utilization
5. Look for context losses

**Common Causes:**

- Thermal throttling
- Memory pressure
- Context loss recovery
- Large token counts

**Solution:**

```typescript
// Check performance trend
const durations = metrics.getMetrics('inference.duration');
const trend = analyzetrend(durations);

if (trend === 'degrading') {
  // Trigger optimizations
  await panicMode.reducemaxTokens();
}
```

### Scenario 2: Memory Errors

**Steps:**

1. Check Storage Inspector
2. Look for quota errors
3. Check memory metrics
4. Review error logs

**Common Causes:**

- Storage quota exceeded
- Memory leak
- Large cache

**Solution:**

```typescript
// Check storage quota
const quota = await storageService.getStorageQuota();

if (quota.usage / quota.quota > 0.9) {
  // Clear cache
  await storageService.clear('cache');
}
```

### Scenario 3: Context Loss

**Steps:**

1. Go to GPU Monitor
2. Check context loss count
3. Review GPU error logs
4. Check stability score

**Common Causes:**

- GPU driver issue
- System memory pressure
- Multiple GPU apps

**Solution:**

```typescript
// Monitor context losses
window.addEventListener('webgpu:contextloss', async () => {
  logger.error('Context loss detected');
  
  // Automatic recovery
  await webllmService.reinitialize();
});
```

## Advanced Debugging

### Remote Debugging

Connect Chrome DevTools:

```bash
chrome://inspect
```

### Source Maps

Source maps are enabled in development:

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true
};
```

### React DevTools

Install React DevTools extension for component debugging.

### Performance API

```typescript
// Measure user timing
performance.mark('start-generation');
await generate(prompt);
performance.mark('end-generation');

performance.measure('generation', 'start-generation', 'end-generation');

const measures = performance.getEntriesByName('generation');
console.log('Generation took:', measures[0].duration, 'ms');
```

## Debugging Checklist

Before reporting issues:

- [ ] Check Debug Panel logs
- [ ] Export error traces
- [ ] Check GPU status
- [ ] Verify storage quota
- [ ] Review performance metrics
- [ ] Test in incognito mode
- [ ] Try different browser
- [ ] Check browser console
- [ ] Verify system requirements
- [ ] Update browser to latest

## Support Resources

- [GitHub Issues](https://github.com/your-org/browser-llm/issues)
- [Discussions](https://github.com/your-org/browser-llm/discussions)
- [Discord Community](https://discord.gg/your-server)
- Email: support@your-domain.com

---

Next: [Storage & Caching](./06-STORAGE-CACHING.md)
