export const STORAGE_KEYS = {
  downloadedModels: "browserllm.downloaded-models",
  loadedModelId: "browserllm.loaded-model-id",
  generationSettings: "browserllm.generation-settings",
  enabledModels: "browserllm.enabled-models",
  providerOverrides: "browserllm.provider-overrides",
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
  window.dispatchEvent(new Event("browserllm:models-updated"));
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
  window.dispatchEvent(new Event("browserllm:model-loaded"));
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
