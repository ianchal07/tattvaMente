import type { ModelInfo, ModelSuggestion } from "@/types/api";
import { defaultModelManifest } from "@/lib/models/default-model-manifest";
import { modelManifestSchema } from "@/lib/models/model-manifest-schema";
import { getProviderConfig } from "@/lib/providers/provider-config";

const parsedManifest = modelManifestSchema.parse(defaultModelManifest);
const WEBLLM_MODELS: ModelInfo[] = parsedManifest.models.map((model) => ({
  id: model.id,
  name: model.name,
  size: model.size,
  vram_required: model.vram_required,
  downloaded: false,
  speed_tier: model.speed_tier,
  quality_tier: model.quality_tier,
  capabilities: model.capabilities,
  source: model.source,
}));

export class ModelRegistryService {
  async list(): Promise<ModelInfo[]> {
    return WEBLLM_MODELS;
  }

  async getById(modelId: string) {
    const models = await this.list();
    return models.find((model) => model.id === modelId) ?? null;
  }

  getProviderConfig() {
    return getProviderConfig();
  }

  getManifestVersion() {
    return parsedManifest.version;
  }

  suggestCompatibleModels(
    models: ModelInfo[],
    constraints: { vramGb?: number; storageFreeGb?: number },
  ): ModelSuggestion[] {
    return models
      .map((model) => {
        const requiredVram = parseGB(model.vram_required);
        const modelSize = parseGB(model.size);
        const vramOk = constraints.vramGb === undefined || requiredVram <= constraints.vramGb;
        const storageOk = constraints.storageFreeGb === undefined || modelSize <= constraints.storageFreeGb * 0.8;
        return { model, requiredVram, modelSize, compatible: vramOk && storageOk };
      })
      .filter((entry) => entry.compatible)
      .sort((a, b) => {
        if (a.model.quality_tier !== b.model.quality_tier) {
          return qualityScore(b.model.quality_tier) - qualityScore(a.model.quality_tier);
        }
        return speedScore(b.model.speed_tier) - speedScore(a.model.speed_tier);
      })
      .slice(0, 5)
      .map((entry) => ({
        id: entry.model.id,
        name: entry.model.name,
        reason: `Requires ~${entry.requiredVram}GB VRAM and ~${entry.modelSize}GB model storage`,
      }));
  }
}

export const modelRegistryService = new ModelRegistryService();

function parseGB(value: string): number {
  const match = value.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function qualityScore(quality: "excellent" | "good" | "basic"): number {
  if (quality === "excellent") return 3;
  if (quality === "good") return 2;
  return 1;
}

function speedScore(speed: "fast" | "medium" | "slow"): number {
  if (speed === "fast") return 3;
  if (speed === "medium") return 2;
  return 1;
}
