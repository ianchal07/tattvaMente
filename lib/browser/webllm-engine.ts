"use client";

import type { ModelInfo } from "@/types/api";

type WebLLMModule = typeof import("@mlc-ai/web-llm");

let webllmModulePromise: Promise<WebLLMModule> | null = null;
let activeModelId: string | null = null;
let activeEngine: any = null;

async function getWebLLMModule(): Promise<WebLLMModule> {
  if (!webllmModulePromise) {
    webllmModulePromise = import("@mlc-ai/web-llm");
  }
  return webllmModulePromise;
}

export async function getWebLLMModels(limit = 200): Promise<ModelInfo[]> {
  const webllm = await getWebLLMModule();
  const config = (webllm as any).prebuiltAppConfig;
  const list = Array.isArray(config?.model_list) ? config.model_list : [];

  return list.slice(0, limit).map((entry: any) => {
    const modelId = String(entry?.model_id ?? "unknown-model");
    const lower = modelId.toLowerCase();
    const approxVram = inferVramFromModelId(lower);
    const approxSize = inferSizeFromVram(approxVram);

    return {
      id: modelId,
      name: prettifyModelName(modelId),
      size: `${approxSize}GB`,
      vram_required: `${approxVram}GB`,
      downloaded: false,
      speed_tier: approxVram <= 4 ? "fast" : approxVram <= 6 ? "medium" : "slow",
      quality_tier: approxVram >= 6 ? "excellent" : approxVram >= 4 ? "good" : "basic",
      capabilities: ["text-generation", "chat"],
      source: {
        provider: "webllm",
        model_uri: modelId,
      },
    } satisfies ModelInfo;
  });
}

export async function ensureWebLLMModelLoaded(
  modelId: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (activeEngine && activeModelId === modelId) {
    onProgress?.(100);
    return;
  }

  const webllm = await getWebLLMModule();

  // Create a new worker for the engine
  const worker = new Worker(new URL("../../workers/inference.worker.ts", import.meta.url), {
    type: "module",
  });

  const engine = await (webllm as any).CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (report: any) => {
      const progress =
        typeof report?.progress === "number"
          ? Math.round(report.progress * 100)
          : extractPercent(report?.text ?? "");
      onProgress?.(Math.max(0, Math.min(100, progress)));
    },
  });

  activeEngine = engine;
  activeModelId = modelId;
  onProgress?.(100);
}

export async function* generateStreamWithWebLLM(
  input: string | { role: string; content: string }[],
  options?: { maxTokens?: number; temperature?: number },
): AsyncGenerator<string> {
  if (!activeEngine) {
    throw new Error("WebLLM engine is not loaded");
  }

  const messages = Array.isArray(input) ? input : [{ role: "user", content: input }];

  const chunks = await activeEngine.chat.completions.create({
    messages,
    max_tokens: options?.maxTokens ?? 256,
    temperature: options?.temperature ?? 0.7,
    stream: true,
  });

  for await (const chunk of chunks) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      yield content;
    }
  }
}

// Keep the non-streaming one for backward compatibility or simple use cases, 
// but implement it using the stream to be DRY if desired, or just direct call.
export async function generateWithWebLLM(
  input: string | { role: string; content: string }[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  let fullText = "";
  for await (const chunk of generateStreamWithWebLLM(input, options)) {
    fullText += chunk;
  }
  return fullText;
}

function extractPercent(text: string): number {
  const match = text.match(/(\d+(\.\d+)?)%/);
  return match ? Number(match[1]) : 0;
}

function prettifyModelName(modelId: string): string {
  return modelId.replace(/-MLC$/i, "").replace(/_/g, " ");
}

function inferVramFromModelId(lowerModelId: string): number {
  if (/\b(1b|2b)\b/.test(lowerModelId)) return 4;
  if (/\b3b\b/.test(lowerModelId)) return 4;
  if (/\b7b\b/.test(lowerModelId)) return 6;
  if (/\b8b\b/.test(lowerModelId)) return 8;
  return 6;
}

function inferSizeFromVram(vramGb: number): number {
  if (vramGb <= 4) return 2;
  if (vramGb <= 6) return 4;
  if (vramGb <= 8) return 6;
  return 8;
}
