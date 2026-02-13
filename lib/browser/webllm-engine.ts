"use client";

import type { ModelInfo } from "@/types/api";

type WebLLMModule = typeof import("@mlc-ai/web-llm");
type MLCEngine = any; // TODO: Import proper type from @mlc-ai/web-llm when available

// Singleton pattern for module loading
let webllmModulePromise: Promise<WebLLMModule> | null = null;

// Active engine state
interface EngineState {
  modelId: string;
  engine: MLCEngine;
  worker: Worker;
}

let activeEngineState: EngineState | null = null;

/**
 * Lazy-load the WebLLM module
 * Uses singleton pattern to avoid duplicate imports
 */
async function getWebLLMModule(): Promise<WebLLMModule> {
  if (!webllmModulePromise) {
    webllmModulePromise = import("@mlc-ai/web-llm");
  }
  return webllmModulePromise;
}

/**
 * Get list of available WebLLM models with inferred metadata
 * @param limit - Maximum number of models to return (default: 200)
 * @returns Array of ModelInfo objects
 */
export async function getWebLLMModels(limit = 200): Promise<ModelInfo[]> {
  const webllm = await getWebLLMModule();
  const config = (webllm as any).prebuiltAppConfig;

  if (!config?.model_list || !Array.isArray(config.model_list)) {
    console.warn("WebLLM model list not found in config");
    return [];
  }

  return config.model_list
    .slice(0, limit)
    .map((entry: any): ModelInfo => {
      const modelId = String(entry?.model_id ?? "unknown-model");
      const vramGb = inferVramFromModelId(modelId);
      const sizeGb = inferSizeFromVram(vramGb);

      return {
        id: modelId,
        name: prettifyModelName(modelId),
        size: `${sizeGb}GB`,
        vram_required: `${vramGb}GB`,
        downloaded: false,
        speed_tier: getSpeedTier(vramGb),
        quality_tier: getQualityTier(vramGb),
        capabilities: ["text-generation", "chat"],
        source: {
          provider: "webllm",
          model_uri: modelId,
        },
      };
    });
}

/**
 * Ensure a WebLLM model is loaded and ready for inference
 * Reuses existing engine if same model is already loaded
 * @param modelId - The model ID to load
 * @param onProgress - Optional callback for loading progress (0-100)
 */
export async function ensureWebLLMModelLoaded(
  modelId: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  // Reuse existing engine if same model is loaded
  if (activeEngineState?.modelId === modelId) {
    onProgress?.(100);
    return;
  }

  // Cleanup previous engine if exists
  if (activeEngineState) {
    await cleanupEngine();
  }

  const webllm = await getWebLLMModule();

  // Create dedicated worker for inference
  const worker = new Worker(
    new URL("../../workers/inference.worker.ts", import.meta.url),
    { type: "module" }
  );

  // Initialize engine with progress tracking
  const engine = await (webllm as any).CreateWebWorkerMLCEngine(
    worker,
    modelId,
    {
      initProgressCallback: (report: any) => {
        const progress = normalizeProgress(report);
        onProgress?.(progress);
      },
    }
  );

  // Store active engine state
  activeEngineState = {
    modelId,
    engine,
    worker,
  };

  onProgress?.(100);
}

/**
 * Generate text using streaming with WebLLM
 * @param input - Either a string prompt or array of chat messages
 * @param options - Generation options (maxTokens, temperature)
 * @yields Text chunks as they are generated
 */
export async function* generateStreamWithWebLLM(
  input: string | Array<{ role: string; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  },
): AsyncGenerator<string> {
  if (!activeEngineState?.engine) {
    throw new Error("WebLLM engine is not loaded. Call ensureWebLLMModelLoaded() first.");
  }

  const messages = normalizeInput(input);
  const generationParams = {
    messages,
    max_tokens: options?.maxTokens ?? 256,
    temperature: clamp(options?.temperature ?? 0.7, 0, 2),
    top_p: options?.topP ? clamp(options.topP, 0, 1) : undefined,
    frequency_penalty: options?.frequencyPenalty ? clamp(options.frequencyPenalty, 0, 2) : undefined,
    presence_penalty: options?.presencePenalty ? clamp(options.presencePenalty, 0, 2) : undefined,
    stream: true,
  };

  try {
    const chunks = await activeEngineState.engine.chat.completions.create(generationParams);

    for await (const chunk of chunks) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("WebLLM generation error:", error);
    throw new Error(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate text using WebLLM (non-streaming)
 * Internally uses streaming for consistency
 * @param input - Either a string prompt or array of chat messages
 * @param options - Generation options
 * @returns Complete generated text
 */
export async function generateWithWebLLM(
  input: string | Array<{ role: string; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  },
): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of generateStreamWithWebLLM(input, options)) {
    chunks.push(chunk);
  }

  return chunks.join("");
}

/**
 * Get current loaded model ID
 * @returns The currently loaded model ID or null if none loaded
 */
export function getActiveModelId(): string | null {
  return activeEngineState?.modelId ?? null;
}

/**
 * Check if a model is currently loaded
 * @param modelId - Optional model ID to check (checks any model if not provided)
 * @returns True if the model is loaded
 */
export function isModelLoaded(modelId?: string): boolean {
  if (!activeEngineState) return false;
  if (!modelId) return true;
  return activeEngineState.modelId === modelId;
}

/**
 * Cleanup the active engine and worker
 * Call this when switching models or unmounting
 */
export async function cleanupEngine(): Promise<void> {
  if (!activeEngineState) return;

  try {
    // Cleanup engine if it has a cleanup method
    if (typeof activeEngineState.engine?.unload === "function") {
      await activeEngineState.engine.unload();
    }

    // Terminate worker
    activeEngineState.worker.terminate();
  } catch (error) {
    console.error("Error cleaning up WebLLM engine:", error);
  } finally {
    activeEngineState = null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize progress report to 0-100 range
 */
function normalizeProgress(report: any): number {
  if (typeof report?.progress === "number") {
    return clamp(Math.round(report.progress * 100), 0, 100);
  }

  if (typeof report?.text === "string") {
    return clamp(extractPercentFromText(report.text), 0, 100);
  }

  return 0;
}

/**
 * Extract percentage from progress text (e.g., "Loading... 45.2%")
 */
function extractPercentFromText(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)%/);
  return match ? Math.round(Number(match[1])) : 0;
}

/**
 * Normalize input to message array format
 */
function normalizeInput(
  input: string | Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return Array.isArray(input)
    ? input
    : [{ role: "user", content: input }];
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert model ID to human-readable name
 */
function prettifyModelName(modelId: string): string {
  return modelId
    .replace(/-MLC$/i, "")
    .replace(/_/g, " ")
    .trim();
}

/**
 * Infer VRAM requirement from model ID
 * Based on parameter count hints in model name
 */
function inferVramFromModelId(modelId: string): number {
  const lower = modelId.toLowerCase();

  // Parameter count patterns
  const patterns: Array<[RegExp, number]> = [
    [/\b(1b|2b)\b/, 4],
    [/\b3b\b/, 4],
    [/\b7b\b/, 6],
    [/\b8b\b/, 8],
    [/\b13b\b/, 10],
    [/\b70b\b/, 40],
  ];

  for (const [pattern, vram] of patterns) {
    if (pattern.test(lower)) {
      return vram;
    }
  }

  // Default fallback
  return 6;
}

/**
 * Estimate download size from VRAM requirement
 * Rough approximation: quantized models are typically 0.5-1x VRAM in size
 */
function inferSizeFromVram(vramGb: number): number {
  if (vramGb <= 4) return 2;
  if (vramGb <= 6) return 4;
  if (vramGb <= 8) return 6;
  if (vramGb <= 10) return 8;
  return Math.ceil(vramGb * 0.75); // Approximation for larger models
}

/**
 * Determine speed tier based on VRAM requirement
 */
function getSpeedTier(vramGb: number): "fast" | "medium" | "slow" {
  if (vramGb <= 4) return "fast";
  if (vramGb <= 6) return "medium";
  return "slow";
}

/**
 * Determine quality tier based on VRAM requirement
 */
function getQualityTier(vramGb: number): "excellent" | "good" | "basic" {
  if (vramGb >= 8) return "excellent";
  if (vramGb >= 6) return "good";
  return "basic";
}

// ============================================================================
// Type Guards (for better type safety)
// ============================================================================

/**
 * Type guard to check if input is a message array
 */
export function isMessageArray(
  input: unknown
): input is Array<{ role: string; content: string }> {
  return (
    Array.isArray(input) &&
    input.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        "content" in item &&
        typeof item.role === "string" &&
        typeof item.content === "string"
    )
  );
}