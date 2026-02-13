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

// ============================================================================
// Types & Interfaces
// ============================================================================

interface RefreshModelsConstraints {
  vramGb?: number;
  storageFreeGb?: number;
}

interface ModelSuggestionEntry {
  model: ModelInfo;
  compatible: boolean;
  requiredVram: number;
  size: number;
}

interface UseLLMSetupReturn {
  // Model data
  models: ModelInfo[];
  selectedModelId: string;
  selectedModel: ModelInfo | null;
  loadedModelId: string | null;
  suggestions: ModelSuggestion[];

  // State
  isDownloading: boolean;
  downloadProgress: number;
  downloadError: string | null;
  compatibility: Awaited<ReturnType<typeof getCompatibilityState>> | null;

  // Actions
  setSelectedModelId: (id: string) => void;
  downloadModel: () => Promise<void>;
  loadSelectedModel: () => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;
  clearAllModels: () => Promise<void>;
  refreshCompatibility: () => Promise<Awaited<ReturnType<typeof getCompatibilityState>>>;
  refreshModels: (constraints?: RefreshModelsConstraints) => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_SUGGESTIONS = 10;
const STORAGE_SAFETY_FACTOR = 0.8; // Use only 80% of available storage
const CUSTOM_EVENT_MODELS_UPDATED = "tattvamente:models-updated";
const CUSTOM_EVENT_MODEL_LOADED = "tattvamente:model-loaded";

// ============================================================================
// Main Hook
// ============================================================================

export function useLLMSetup(): UseLLMSetupReturn {
  // ============================================================================
  // State
  // ============================================================================

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [loadedModelId, setLoadedModelIdState] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [compatibility, setCompatibility] = useState<Awaited<ReturnType<typeof getCompatibilityState>> | null>(null);
  const [suggestions, setSuggestions] = useState<ModelSuggestion[]>([]);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  /**
   * Get the currently selected model from the models list
   */
  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  // ============================================================================
  // Core Functions
  // ============================================================================

  /**
   * Refresh compatibility state from browser APIs
   * @returns Updated compatibility state
   */
  const refreshCompatibility = useCallback(async () => {
    const state = await getCompatibilityState();
    setCompatibility(state);
    return state;
  }, []);

  /**
   * Refresh models list with download status and filter by constraints
   * @param constraints - Optional VRAM and storage constraints
   */
  const refreshModels = useCallback(
    async (constraints?: RefreshModelsConstraints) => {
      try {
        // Fetch models from WebLLM
        const webllmModels = await getWebLLMModels();

        // Augment with download status
        const modelsWithStatus = webllmModels.map((model) => ({
          ...model,
          downloaded: isModelDownloaded(model.id, model.source?.model_uri),
        }));

        setModels(modelsWithStatus);

        // Generate suggestions based on constraints
        const newSuggestions = generateSuggestions(modelsWithStatus, constraints);
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error("Failed to refresh models:", error);
        setModels([]);
        setSuggestions([]);
      }
    },
    []
  );

  /**
   * Download the currently selected model
   */
  const downloadModel = useCallback(async () => {
    if (!selectedModel?.source?.model_uri) {
      console.warn("Cannot download: no model selected or missing source URI");
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadProgress(0);

    try {
      // Download and initialize model with progress tracking
      await ensureWebLLMModelLoaded(selectedModel.id, (progress) => {
        setDownloadProgress(progress);
      });

      // Mark as downloaded in local storage
      markModelDownloaded(selectedModel.id, {
        sourceUri: selectedModel.source.model_uri,
      });

      // Ensure final progress is 100%
      setDownloadProgress(100);

      // Refresh models list to update download status
      await refreshModels();

      // Dispatch custom event for other components
      dispatchModelUpdateEvent();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to initialize WebLLM model";

      console.error("Model download failed:", error);
      setDownloadError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  }, [selectedModel, refreshModels]);

  /**
   * Load the selected model into memory for inference
   */
  const loadSelectedModel = useCallback(async () => {
    if (!selectedModel) {
      console.warn("Cannot load: no model selected");
      return;
    }

    if (!selectedModel.downloaded) {
      console.warn("Cannot load: model not downloaded");
      return;
    }

    try {
      // Load model into WebLLM engine
      await ensureWebLLMModelLoaded(selectedModel.id);

      // Update global state
      setLoadedModelId(selectedModel.id);
      setLoadedModelIdState(selectedModel.id);

      // Dispatch custom event
      dispatchModelLoadedEvent();
    } catch (error) {
      console.error("Failed to load model:", error);
      throw error;
    }
  }, [selectedModel]);

  /**
   * Delete a model from cache
   * @param modelId - The model ID to delete
   */
  const deleteModel = useCallback(
    async (modelId: string) => {
      try {
        await deleteModelFromCache(modelId);
        await refreshModels();
        dispatchModelUpdateEvent();
      } catch (error) {
        console.error("Failed to delete model:", error);
        throw error;
      }
    },
    [refreshModels]
  );

  /**
   * Clear all models from cache
   */
  const clearAllModels = useCallback(async () => {
    try {
      await clearAllWebLLMCaches();
      await refreshModels();
      dispatchModelUpdateEvent();
    } catch (error) {
      console.error("Failed to clear all models:", error);
      throw error;
    }
  }, [refreshModels]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Initialize hook on mount:
   * - Load compatibility state
   * - Refresh models list
   * - Set up event listeners
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get compatibility state
        const state = await refreshCompatibility();

        if (!mounted) return;

        // Calculate available storage
        const availableStorage = Math.max(state.quotaGB - state.usageGB, 0);

        // Refresh models with constraints
        await refreshModels({
          vramGb: state.estimatedVramGB,
          storageFreeGb: availableStorage,
        });

        // Set currently loaded model
        setLoadedModelIdState(getLoadedModelId());
      } catch (error) {
        console.error("Failed to initialize LLM setup:", error);
      }
    };

    void initialize();

    // Event handlers
    const handleModelsUpdated = async () => {
      if (!mounted) return;

      try {
        const state = await getCompatibilityState();
        const availableStorage = Math.max(state.quotaGB - state.usageGB, 0);

        await refreshModels({
          vramGb: state.estimatedVramGB,
          storageFreeGb: availableStorage,
        });
      } catch (error) {
        console.error("Failed to handle models updated event:", error);
      }
    };

    const handleModelLoaded = () => {
      if (!mounted) return;
      setLoadedModelIdState(getLoadedModelId());
    };

    // Register event listeners
    window.addEventListener(CUSTOM_EVENT_MODELS_UPDATED, handleModelsUpdated);
    window.addEventListener(CUSTOM_EVENT_MODEL_LOADED, handleModelLoaded);

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener(CUSTOM_EVENT_MODELS_UPDATED, handleModelsUpdated);
      window.removeEventListener(CUSTOM_EVENT_MODEL_LOADED, handleModelLoaded);
    };
  }, [refreshCompatibility, refreshModels]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Model data
    models,
    selectedModelId,
    selectedModel,
    loadedModelId,
    suggestions,

    // State
    isDownloading,
    downloadProgress,
    downloadError,
    compatibility,

    // Actions
    setSelectedModelId,
    downloadModel,
    loadSelectedModel,
    deleteModel,
    clearAllModels,
    refreshCompatibility,
    refreshModels,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate model suggestions based on hardware constraints
 * @param models - List of available models
 * @param constraints - Hardware constraints (VRAM, storage)
 * @returns Filtered and sorted suggestions
 */
function generateSuggestions(
  models: ModelInfo[],
  constraints?: RefreshModelsConstraints
): ModelSuggestion[] {
  return models
    .map((model): ModelSuggestionEntry => {
      const requiredVram = parseStorageValue(model.vram_required);
      const size = parseStorageValue(model.size);

      // Check VRAM compatibility
      const vramOk =
        constraints?.vramGb === undefined ||
        requiredVram <= constraints.vramGb;

      // Check storage compatibility (with safety factor)
      const storageOk =
        constraints?.storageFreeGb === undefined ||
        size <= constraints.storageFreeGb * STORAGE_SAFETY_FACTOR;

      return {
        model,
        compatible: vramOk && storageOk,
        requiredVram,
        size,
      };
    })
    .filter((entry) => entry.compatible)
    .sort((a, b) => {
      // Sort by quality tier first, then by size (smaller first)
      const qualityOrder = { excellent: 0, good: 1, basic: 2 };
      const qualityDiff =
        qualityOrder[a.model.quality_tier] - qualityOrder[b.model.quality_tier];

      if (qualityDiff !== 0) return qualityDiff;

      return a.size - b.size;
    })
    .slice(0, MAX_SUGGESTIONS)
    .map((entry): ModelSuggestion => ({
      id: entry.model.id,
      name: entry.model.name,
      reason: formatSuggestionReason(entry.requiredVram, entry.size),
    }));
}

/**
 * Format suggestion reason text
 * @param requiredVram - Required VRAM in GB
 * @param size - Model size in GB
 * @returns Formatted reason string
 */
function formatSuggestionReason(requiredVram: number, size: number): string {
  return `WebLLM model, requires ~${requiredVram}GB VRAM and ~${size}GB storage`;
}

/**
 * Parse storage value string to number (GB)
 * Handles formats like "4GB", "2.5GB", "8 GB", etc.
 * @param value - Storage string (e.g., "4GB")
 * @returns Numeric value in GB
 */
function parseStorageValue(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

/**
 * Dispatch custom event when models are updated
 */
function dispatchModelUpdateEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_MODELS_UPDATED));
  }
}

/**
 * Dispatch custom event when a model is loaded
 */
function dispatchModelLoadedEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_MODEL_LOADED));
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type { UseLLMSetupReturn };