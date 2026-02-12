# API Documentation

## Overview

Browser LLM exposes a RESTful API that allows third-party applications to interact with the local inference engine. All API endpoints are available at `http://localhost:3000/api/v1` during development.

## Authentication

Currently, the API operates without authentication in local mode. For production deployments with remote access, implement your own authentication layer.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://your-domain.com/api/v1
```

## Response Format

All API responses follow this structure:

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

## Endpoints

### 1. Generate Text

Generate text completion from a prompt.

**Endpoint:** `POST /api/v1/generate`

**Request Body:**

```typescript
interface GenerateRequest {
  prompt: string;                 // Required: Input prompt
  max_tokens?: number;            // Optional: Max tokens to generate (1-4096)
  temperature?: number;           // Optional: Sampling temperature (0-2)
  top_p?: number;                 // Optional: Nucleus sampling (0-1)
  top_k?: number;                 // Optional: Top-k sampling (1-100)
  frequency_penalty?: number;     // Optional: Frequency penalty (0-2)
  presence_penalty?: number;      // Optional: Presence penalty (0-2)
  stop?: string[];               // Optional: Stop sequences
  stream?: boolean;              // Optional: Stream response (default: false)
  json_mode?: boolean;           // Optional: Force JSON output
  json_schema?: object;          // Optional: JSON schema for validation
}
```

**Response:**

```typescript
interface GenerateResponse {
  text: string;                   // Generated text
  tokens: number;                 // Number of tokens generated
  finish_reason: 'stop' | 'length' | 'error';
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  performance: {
    tokens_per_second: number;
    latency_ms: number;
    total_time_ms: number;
  };
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "max_tokens": 200,
    "temperature": 0.7
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "Quantum computing is a type of computing that uses quantum mechanical phenomena...",
    "tokens": 156,
    "finish_reason": "stop",
    "usage": {
      "prompt_tokens": 8,
      "completion_tokens": 156,
      "total_tokens": 164
    },
    "performance": {
      "tokens_per_second": 18.5,
      "latency_ms": 54,
      "total_time_ms": 8432
    }
  },
  "metadata": {
    "requestId": "req_abc123",
    "timestamp": 1234567890,
    "version": "1.0.0"
  }
}
```

### 2. Streaming Generation

Stream text generation in real-time.

**Endpoint:** `POST /api/v1/generate` (with `stream: true`)

**Response:** Server-Sent Events (SSE)

```typescript
interface StreamChunk {
  type: 'token' | 'done' | 'error';
  data: {
    token?: string;
    completion?: GenerateResponse;
    error?: string;
  };
}
```

**Example:**

```javascript
const eventSource = new EventSource('http://localhost:3000/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Write a haiku about AI',
    stream: true
  })
});

eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  
  if (chunk.type === 'token') {
    process.stdout.write(chunk.data.token);
  } else if (chunk.type === 'done') {
    console.log('\n\nCompleted:', chunk.data.completion);
    eventSource.close();
  }
};
```

### 3. List Models

Get list of available models.

**Endpoint:** `GET /api/v1/models`

**Response:**

```typescript
interface ModelsResponse {
  models: Array<{
    id: string;
    name: string;
    size: string;
    vram_required: string;
    downloaded: boolean;
    speed_tier: 'fast' | 'medium' | 'slow';
    quality_tier: 'excellent' | 'good' | 'basic';
    capabilities: string[];
  }>;
}
```

**Example:**

```bash
curl http://localhost:3000/api/v1/models
```

**Response:**

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "phi-3-mini-q4",
        "name": "Phi-3 Mini (Q4)",
        "size": "2.2GB",
        "vram_required": "4GB",
        "downloaded": true,
        "speed_tier": "fast",
        "quality_tier": "good",
        "capabilities": ["text-generation", "json-mode", "code"]
      }
    ]
  }
}
```

### 4. Get Model Details

Get detailed information about a specific model.

**Endpoint:** `GET /api/v1/models/{modelId}`

**Response:**

```typescript
interface ModelDetailsResponse {
  id: string;
  name: string;
  description: string;
  size: string;
  vram_required: string;
  downloaded: boolean;
  download_progress?: number;
  speed_tier: string;
  quality_tier: string;
  capabilities: string[];
  parameters: {
    total: string;
    quantization: string;
  };
  performance: {
    avg_tokens_per_second: number;
    avg_latency_ms: number;
  };
}
```

### 5. Load Model

Load a specific model for inference.

**Endpoint:** `POST /api/v1/models/{modelId}/load`

**Response:**

```typescript
interface LoadModelResponse {
  model_id: string;
  status: 'loaded' | 'loading' | 'error';
  progress?: number;
  estimated_time_ms?: number;
}
```

### 6. System Status

Get current system status and health.

**Endpoint:** `GET /api/v1/status`

**Response:**

```typescript
interface StatusResponse {
  status: 'ready' | 'loading' | 'error' | 'idle';
  model: {
    id: string;
    loaded: boolean;
  } | null;
  system: {
    webgpu_available: boolean;
    ram_gb: number;
    gpu_vram_gb: number;
    storage_quota_gb: number;
    storage_used_gb: number;
  };
  performance: {
    avg_tokens_per_second: number;
    avg_latency_ms: number;
    requests_total: number;
    requests_success: number;
    requests_error: number;
  };
  health: {
    webgpu_context_losses: number;
    memory_errors: number;
    stability_score: number;
  };
}
```

**Example:**

```bash
curl http://localhost:3000/api/v1/status
```

### 7. Debug Logs

Get debug logs for troubleshooting.

**Endpoint:** `GET /api/v1/debug/logs`

**Query Parameters:**
- `level`: Filter by log level (debug, info, warn, error)
- `since`: Unix timestamp for filtering
- `limit`: Max number of logs (default: 100)

**Response:**

```typescript
interface DebugLogsResponse {
  logs: Array<{
    level: string;
    service: string;
    message: string;
    data?: any;
    timestamp: number;
    stack?: string;
  }>;
}
```

### 8. Performance Profile

Get detailed performance metrics.

**Endpoint:** `GET /api/v1/debug/profile`

**Query Parameters:**
- `since`: Unix timestamp for time range
- `metric`: Specific metric name

**Response:**

```typescript
interface ProfileResponse {
  metrics: Array<{
    name: string;
    values: Array<{
      value: number;
      timestamp: number;
      tags?: Record<string, string>;
    }>;
    aggregations: {
      avg: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
  }>;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `MODEL_NOT_LOADED` | No model is currently loaded |
| `MODEL_LOAD_FAILED` | Model failed to load |
| `VALIDATION_ERROR` | Request validation failed |
| `INFERENCE_ERROR` | Error during text generation |
| `WEBGPU_ERROR` | WebGPU context error |
| `STORAGE_ERROR` | Storage quota or access error |
| `RATE_LIMIT` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Generate endpoint:** 60 requests per minute
- **Status endpoint:** 120 requests per minute
- **Other endpoints:** 300 requests per minute

Rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

## WebSocket API (Advanced)

For real-time bidirectional communication:

**Endpoint:** `ws://localhost:3000/api/v1/ws`

**Message Format:**

```typescript
interface WSMessage {
  type: 'generate' | 'abort' | 'subscribe' | 'unsubscribe';
  id: string;
  payload?: any;
}

interface WSResponse {
  type: 'token' | 'done' | 'error' | 'metric' | 'log';
  id: string;
  data: any;
}
```

**Example:**

```javascript
const ws = new WebSocket('ws://localhost:3000/api/v1/ws');

ws.onopen = () => {
  // Generate text
  ws.send(JSON.stringify({
    type: 'generate',
    id: 'req-1',
    payload: {
      prompt: 'Hello, AI!',
      max_tokens: 100
    }
  }));
  
  // Subscribe to metrics
  ws.send(JSON.stringify({
    type: 'subscribe',
    id: 'sub-1',
    payload: { events: ['metric', 'log'] }
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  
  switch (response.type) {
    case 'token':
      console.log(response.data.token);
      break;
    case 'done':
      console.log('Completed:', response.data);
      break;
    case 'metric':
      console.log('Metric:', response.data);
      break;
  }
};
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
// browser-llm-client.ts

export class BrowserLLMClient {
  private baseURL: string;
  
  constructor(baseURL: string = 'http://localhost:3000/api/v1') {
    this.baseURL = baseURL;
  }
  
  async generate(params: GenerateRequest): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseURL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error.message);
    }
    
    return result.data;
  }
  
  async *generateStream(params: GenerateRequest): AsyncGenerator<string> {
    const response = await fetch(`${this.baseURL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: true })
    });
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') {
            yield data.data.token;
          }
        }
      }
    }
  }
  
  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${this.baseURL}/models`);
    const result = await response.json();
    return result.data;
  }
  
  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${this.baseURL}/status`);
    const result = await response.json();
    return result.data;
  }
}

// Usage
const client = new BrowserLLMClient();

// Simple generation
const result = await client.generate({
  prompt: 'What is AI?',
  max_tokens: 100
});
console.log(result.text);

// Streaming generation
for await (const token of client.generateStream({
  prompt: 'Write a story',
  max_tokens: 200
})) {
  process.stdout.write(token);
}
```

### Python SDK

```python
# browser_llm_client.py

import requests
from typing import Iterator, Optional
import sseclient

class BrowserLLMClient:
    def __init__(self, base_url: str = 'http://localhost:3000/api/v1'):
        self.base_url = base_url
    
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        **kwargs
    ) -> dict:
        response = requests.post(
            f'{self.base_url}/generate',
            json={
                'prompt': prompt,
                'max_tokens': max_tokens,
                'temperature': temperature,
                **kwargs
            }
        )
        
        result = response.json()
        
        if not result['success']:
            raise Exception(result['error']['message'])
        
        return result['data']
    
    def generate_stream(
        self,
        prompt: str,
        max_tokens: int = 512,
        **kwargs
    ) -> Iterator[str]:
        response = requests.post(
            f'{self.base_url}/generate',
            json={
                'prompt': prompt,
                'max_tokens': max_tokens,
                'stream': True,
                **kwargs
            },
            stream=True
        )
        
        client = sseclient.SSEClient(response)
        
        for event in client.events():
            data = json.loads(event.data)
            if data['type'] == 'token':
                yield data['data']['token']
            elif data['type'] == 'done':
                break
    
    def get_models(self) -> dict:
        response = requests.get(f'{self.base_url}/models')
        return response.json()['data']
    
    def get_status(self) -> dict:
        response = requests.get(f'{self.base_url}/status')
        return response.json()['data']

# Usage
client = BrowserLLMClient()

# Simple generation
result = client.generate(
    prompt='Explain machine learning',
    max_tokens=200,
    temperature=0.7
)
print(result['text'])

# Streaming generation
for token in client.generate_stream(prompt='Write a poem'):
    print(token, end='', flush=True)
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await client.generate({ prompt: 'Hello' });
  console.log(result.text);
} catch (error) {
  if (error.code === 'MODEL_NOT_LOADED') {
    // Load model first
    await client.loadModel('phi-3-mini-q4');
    // Retry
    const result = await client.generate({ prompt: 'Hello' });
  } else {
    console.error('Generation failed:', error);
  }
}
```

### 2. Rate Limiting

Implement exponential backoff:

```typescript
async function generateWithRetry(params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.generate(params);
    } catch (error) {
      if (error.code === 'RATE_LIMIT' && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### 3. Streaming for Long Responses

Use streaming for better UX:

```typescript
async function displayStreamingResponse(prompt) {
  const container = document.getElementById('output');
  
  for await (const token of client.generateStream({ prompt })) {
    container.textContent += token;
  }
}
```

### 4. Monitor Performance

Track API performance:

```typescript
const start = performance.now();
const result = await client.generate({ prompt: 'Hello' });
const duration = performance.now() - start;

console.log(`Request took ${duration}ms`);
console.log(`Tokens/sec: ${result.performance.tokens_per_second}`);
```

## Security Considerations

1. **Input Validation**: Always validate and sanitize inputs
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **CORS**: Configure CORS properly for production
4. **Content Security**: Validate generated content
5. **Resource Limits**: Set appropriate token limits

## Support

For API issues:
- Check [Debugging Guide](./05-DEBUGGING-GUIDE.md)
- Report bugs on GitHub Issues
- Join community Discord

---

Next: [Debugging Guide](./05-DEBUGGING-GUIDE.md)
