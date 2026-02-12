import type { StatusResponse } from "@/types/api";

export class SystemService {
  getStatus(): StatusResponse {
    return {
      status: "idle",
      model: null,
      system: {
        webgpu_available: typeof navigator !== "undefined" && "gpu" in navigator,
        ram_gb: 0,
        gpu_vram_gb: 0,
        storage_quota_gb: 0,
        storage_used_gb: 0,
      },
      performance: {
        avg_tokens_per_second: 0,
        avg_latency_ms: 0,
        requests_total: 0,
        requests_success: 0,
        requests_error: 0,
      },
      health: {
        webgpu_context_losses: 0,
        memory_errors: 0,
        stability_score: 100,
      },
    };
  }
}

export const systemService = new SystemService();