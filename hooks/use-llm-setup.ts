"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModelInfo, ModelSuggestion } from "@/types/api";
import {
  getCompatibilityState,
  getLoadedModelId,
  isModelDownloaded,
  markModelDownloaded,
  setLoadedModelId,
  deleteModelFromCache,
  clearAllWebLLMCaches,
} from "@/lib/browser/model-setup";
import { ensureWebLLMModelLoaded, getWebLLMModels } from "@/lib/browser/webllm-engine";

export function useLLMSetup() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [loadedModelId, setLoadedModelIdState] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [compatibility, setCompatibility] = useState<Awaited<ReturnType<typeof getCompatibilityState>> | null>(null);
  const [suggestions, setSuggestions] = useState<ModelSuggestion[]>([]);

  const refreshModels = useCallback(async (constraints?: { vramGb?: number; storageFreeGb?: number }) => {
    const webllmModels = await getWebLLMModels();
    const mapped = webllmModels.map((model) => ({
      ...model,
      downloaded: isModelDownloaded(model.id, model.source?.model_uri),
    }));

    setModels(mapped);


    const suggested = mapped
      .map((model) => {
        const requiredVram = parseGB(model.vram_required);
        const size = parseGB(model.size);
        const vramOk = constraints?.vramGb === undefined || requiredVram <= constraints.vramGb;
        const storageOk = constraints?.storageFreeGb === undefined || size <= constraints.storageFreeGb * 0.8;
        return {
          model,
          compatible: vramOk && storageOk,
          requiredVram,
          size,
        };
      })
      .filter((entry) => entry.compatible)
      .slice(0, 5)
      .map((entry) => ({
        id: entry.model.id,
        name: entry.model.name,
        reason: `WebLLM model, requires ~${entry.requiredVram}GB VRAM and ~${entry.size}GB storage`,
      }));

    setSuggestions(suggested);
  }, [selectedModelId]);

  const refreshCompatibility = useCallback(async () => {
    const state = await getCompatibilityState();
    setCompatibility(state);
    return state;
  }, []);

  useEffect(() => {
    void (async () => {
      const state = await refreshCompatibility();
      await refreshModels({
        vramGb: state.estimatedVramGB,
        storageFreeGb: Math.max(state.quotaGB - state.usageGB, 0),
      });
    })();

    setLoadedModelIdState(getLoadedModelId());

    const onModelsUpdated = async () => {
      const state = await getCompatibilityState();
      await refreshModels({
        vramGb: state.estimatedVramGB,
        storageFreeGb: Math.max(state.quotaGB - state.usageGB, 0),
      });
    };

    const onLoaded = () => setLoadedModelIdState(getLoadedModelId());

    window.addEventListener("tattvamente:models-updated", onModelsUpdated);
    window.addEventListener("tattvamente:model-loaded", onLoaded);

    return () => {
      window.removeEventListener("tattvamente:models-updated", onModelsUpdated);
      window.removeEventListener("tattvamente:model-loaded", onLoaded);
    };
  }, [refreshCompatibility, refreshModels]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId],
  );

  const downloadModel = useCallback(async () => {
    if (!selectedModel || !selectedModel.source?.model_uri) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadProgress(0);

    try {
      await ensureWebLLMModelLoaded(selectedModel.id, setDownloadProgress);
      markModelDownloaded(selectedModel.id, {
        sourceUri: selectedModel.source.model_uri,
      });
      setDownloadProgress(100);
      await refreshModels();
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Failed to initialize WebLLM model");
    } finally {
      setIsDownloading(false);
    }
  }, [refreshModels, selectedModel]);

  const loadSelectedModel = useCallback(async () => {
    if (!selectedModel || !selectedModel.downloaded) {
      return;
    }

    await ensureWebLLMModelLoaded(selectedModel.id);
    setLoadedModelId(selectedModel.id);
    setLoadedModelIdState(selectedModel.id);
  }, [selectedModel]);

  return {
    models,
    selectedModelId,
    setSelectedModelId,
    selectedModel,
    loadedModelId,
    isDownloading,
    downloadProgress,
    downloadModel,
    loadSelectedModel,
    compatibility,
    refreshCompatibility,
    suggestions,
    downloadError,
    deleteModel: useCallback(async (modelId: string) => {
      await deleteModelFromCache(modelId);
      await refreshModels();
    }, [refreshModels]),
    clearAllModels: useCallback(async () => {
      await clearAllWebLLMCaches();
      await refreshModels();
    }, [refreshModels]),
  };
}

function parseGB(value: string): number {
  const match = value.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}