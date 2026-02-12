import { ok } from "@/lib/api/response";
import { modelRegistryService } from "@/lib/services/model-registry-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vramGb = searchParams.get("vram_gb");
  const storageFreeGb = searchParams.get("storage_free_gb");
  const parsedVram = vramGb ? Number(vramGb) : undefined;
  const parsedStorage = storageFreeGb ? Number(storageFreeGb) : undefined;

  const models = await modelRegistryService.list();
  const suggestions = modelRegistryService.suggestCompatibleModels(models, {
    vramGb: Number.isFinite(parsedVram) ? parsedVram : undefined,
    storageFreeGb: Number.isFinite(parsedStorage) ? parsedStorage : undefined,
  });

  return ok({
    models,
    provider: modelRegistryService.getProviderConfig(),
    manifest_version: modelRegistryService.getManifestVersion(),
    suggestions,
  });
}
