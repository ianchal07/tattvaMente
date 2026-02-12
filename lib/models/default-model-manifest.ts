import type { ModelManifest } from "@/lib/models/model-manifest-schema";

export const defaultModelManifest: ModelManifest = {
  version: "1.0.0",
  generated_at: new Date(0).toISOString(),
  models: [
    {
      id: "phi-3-mini-q4",
      name: "Phi-3 Mini (Q4)",
      size: "2.2GB",
      vram_required: "4GB",
      downloaded: false,
      speed_tier: "fast",
      quality_tier: "good",
      capabilities: ["text-generation", "json-mode", "code"],
      source: {
        provider: "webllm",
        model_uri: "phi-3-mini-q4",
      },
    },
    {
      id: "mistral-7b-instruct-q4",
      name: "Mistral 7B Instruct (Q4)",
      size: "4.1GB",
      vram_required: "6GB",
      downloaded: false,
      speed_tier: "medium",
      quality_tier: "excellent",
      capabilities: ["text-generation", "json-mode", "analysis"],
      source: {
        provider: "webllm",
        model_uri: "mistral-7b-instruct-q4",
      },
    },
  ],
};
