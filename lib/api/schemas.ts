import { z } from "zod";

export const generateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(10000),
  max_tokens: z.number().int().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().min(1).max(100).optional(),
  frequency_penalty: z.number().min(0).max(2).optional(),
  presence_penalty: z.number().min(0).max(2).optional(),
  stop: z.array(z.string()).max(10).optional(),
  stream: z.boolean().optional(),
  json_mode: z.boolean().optional(),
  json_schema: z.record(z.unknown()).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;