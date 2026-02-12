export type ModelProvider = "webllm";

export interface ProviderConfig {
  provider: ModelProvider;
  baseUrl: string;
  manifestPath: string;
  timeoutMs: number;
}

const defaultByProvider: Record<ModelProvider, Pick<ProviderConfig, "baseUrl" | "manifestPath">> = {
  webllm: {
    baseUrl: "",
    manifestPath: "",
  },
};

function readProvider(): ModelProvider {
  return "webllm";
}

export function getProviderConfig(): ProviderConfig {
  const provider = readProvider();
  const defaults = defaultByProvider[provider];

  return {
    provider,
    baseUrl: process.env.NEXT_PUBLIC_MODEL_PROVIDER_BASE_URL ?? defaults.baseUrl,
    manifestPath: process.env.NEXT_PUBLIC_MODEL_MANIFEST_PATH ?? defaults.manifestPath,
    timeoutMs: Number(process.env.NEXT_PUBLIC_MODEL_PROVIDER_TIMEOUT_MS ?? 15_000),
  };
}
