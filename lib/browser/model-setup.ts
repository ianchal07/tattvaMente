export const STORAGE_KEYS = {
  downloadedModels: "tattvamente.downloaded-models",
  loadedModelId: "tattvamente.loaded-model-id",
  generationSettings: "tattvamente.generation-settings",
  enabledModels: "tattvamente.enabled-models",
  providerOverrides: "tattvamente.provider-overrides",
} as const;

export type DownloadedModelsMap = Record<
  string,
  {
    downloadedAt: number;
    sourceUri?: string;
    bytes?: number;
  }
>;

export function getDownloadedModels(): DownloadedModelsMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.downloadedModels);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as DownloadedModelsMap;
  } catch {
    return {};
  }
}

export function markModelDownloaded(modelId: string, metadata?: { sourceUri?: string; bytes?: number }): void {
  if (typeof window === "undefined") {
    return;
  }

  const downloaded = getDownloadedModels();
  downloaded[modelId] = {
    downloadedAt: Date.now(),
    sourceUri: metadata?.sourceUri,
    bytes: metadata?.bytes,
  };
  window.localStorage.setItem(STORAGE_KEYS.downloadedModels, JSON.stringify(downloaded));
  window.dispatchEvent(new Event("tattvamente:models-updated"));
}

export function isModelDownloaded(modelId: string, expectedSourceUri?: string): boolean {
  const entry = getDownloadedModels()[modelId];
  if (!entry) {
    return false;
  }

  if (!expectedSourceUri) {
    return true;
  }

  return entry.sourceUri === expectedSourceUri;
}

export function getLoadedModelId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEYS.loadedModelId);
}

export function setLoadedModelId(modelId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.loadedModelId, modelId);
  window.dispatchEvent(new Event("tattvamente:model-loaded"));
}

export async function deleteModelFromCache(modelId: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // 1. Remove from local tracking
  const downloaded = getDownloadedModels();
  delete downloaded[modelId];
  window.localStorage.setItem(STORAGE_KEYS.downloadedModels, JSON.stringify(downloaded));

  // 2. Try to clean up Cache API
  // WebLLM typically uses "webllm/model" or specific names.
  // This is a best-effort cleanup.
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      // Common WebLLM cache prefixes
      if (key.includes("webllm") || key.includes(modelId)) {
        // We'll be aggressive if the key explicitly strictly matches the model ID
        if (key.includes(modelId)) {
          await caches.delete(key);
        }
      }
    }
    // Also try to open the shared cache and delete specific requests if possible? 
    // This is hard without knowing exact request URLs.
    // For now, removing from tracking allows the UI to update. 
    // "Clear All" is the reliable way to free space.
  } catch (e) {
    console.error("Failed to cleanup caches", e);
  }

  window.dispatchEvent(new Event("tattvamente:models-updated"));
}

export async function clearAllWebLLMCaches(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // 1. Clear Local Storage tracking
  window.localStorage.removeItem(STORAGE_KEYS.downloadedModels);
  window.localStorage.removeItem(STORAGE_KEYS.loadedModelId);

  // 2. Delete all WebLLM caches
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key.includes("webllm") || key.includes("mlc")) {
        await caches.delete(key);
      }
    }
  } catch (e) {
    console.error("Failed to clear all caches", e);
  }

  window.dispatchEvent(new Event("tattvamente:models-updated"));
  window.dispatchEvent(new Event("tattvamente:model-loaded"));
}

export interface CompatibilityState {
  webgpuAvailable: boolean;
  storageAvailable: boolean;
  persistentStorage: boolean;
  quotaGB: number;
  usageGB: number;
  deviceMemoryGB: number;
  estimatedVramGB: number;
}

export async function getCompatibilityState(): Promise<CompatibilityState> {
  const webgpuAvailable = typeof navigator !== "undefined" && "gpu" in navigator;
  const storageAvailable = typeof navigator !== "undefined" && "storage" in navigator;
  const navWithMemory = navigator as Navigator & { deviceMemory?: number };

  let persistentStorage = false;
  let quotaGB = 0;
  let usageGB = 0;

  if (storageAvailable && navigator.storage.persist) {
    persistentStorage = await navigator.storage.persist();
  }

  if (storageAvailable && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    quotaGB = Number(((estimate.quota ?? 0) / 1024 / 1024 / 1024).toFixed(2));
    usageGB = Number(((estimate.usage ?? 0) / 1024 / 1024 / 1024).toFixed(2));
  }

  return {
    webgpuAvailable,
    storageAvailable,
    persistentStorage,
    quotaGB,
    usageGB,
    deviceMemoryGB: typeof navigator !== "undefined" ? navWithMemory.deviceMemory ?? 0 : 0,
    estimatedVramGB: estimateVramFromDeviceMemory(
      typeof navigator !== "undefined" ? navWithMemory.deviceMemory ?? 0 : 0,
    ),
  };
}

function estimateVramFromDeviceMemory(deviceMemoryGB: number): number {
  if (deviceMemoryGB >= 16) {
    return 8;
  }
  if (deviceMemoryGB >= 8) {
    return 6;
  }
  if (deviceMemoryGB >= 4) {
    return 4;
  }
  return 2;
}
