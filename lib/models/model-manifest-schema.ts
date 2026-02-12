import { z } from "zod";

export const modelManifestEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.string().min(1),
  vram_required: z.string().min(1),
  downloaded: z.boolean().default(false),
  speed_tier: z.enum(["fast", "medium", "slow"]),
  quality_tier: z.enum(["excellent", "good", "basic"]),
  capabilities: z.array(z.string().min(1)).min(1),
  source: z
    .object({
      provider: z.enum(["webllm"]),
      model_uri: z.string().min(1),
      tokenizer_uri: z.string().min(1).optional(),
      checksum_sha256: z.string().min(1).optional(),
    })
    .optional(),
});

export const modelManifestSchema = z.object({
  version: z.string().min(1),
  generated_at: z.string().min(1).optional(),
  models: z.array(modelManifestEntrySchema).min(1),
});

export type ModelManifestEntry = z.infer<typeof modelManifestEntrySchema>;
export type ModelManifest = z.infer<typeof modelManifestSchema>;
