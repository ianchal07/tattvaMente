import { fail, ok } from "@/lib/api/response";
import { generateRequestSchema } from "@/lib/api/schemas";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: "Request body must be valid JSON",
      },
      400,
    );
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: "Invalid generate request",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const started = Date.now();
  const prompt = parsed.data.prompt;

  // Placeholder generation until WebLLM integration is wired.
  const text = `Stub response: model integration pending. Prompt was: ${prompt}`;

  return ok({
    text,
    tokens: text.split(/\s+/).length,
    finish_reason: "stop",
    usage: {
      prompt_tokens: prompt.split(/\s+/).length,
      completion_tokens: text.split(/\s+/).length,
      total_tokens: prompt.split(/\s+/).length + text.split(/\s+/).length,
    },
    performance: {
      tokens_per_second: 0,
      latency_ms: Date.now() - started,
      total_time_ms: Date.now() - started,
    },
  });
}