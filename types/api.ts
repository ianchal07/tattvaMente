export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: {
    requestId: string;
    timestamp: number;
    version: string;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  vram_required: string;
  downloaded: boolean;
  speed_tier: "fast" | "medium" | "slow";
  quality_tier: "excellent" | "good" | "basic";
  capabilities: string[];
  source?: {
    provider: "webllm";
    model_uri: string;
    tokenizer_uri?: string;
    checksum_sha256?: string;
  };
}

export interface ModelSuggestion {
  id: string;
  name: string;
  reason: string;
}

export interface StatusResponse {
  status: "ready" | "loading" | "error" | "idle";
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
