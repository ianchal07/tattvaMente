
import { fail, ok } from "@/lib/api/response";
import { generateRequestSchema } from "@/lib/api/schemas";
import { jobQueue } from "@/lib/api/queue";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

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
      corsHeaders
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
      corsHeaders
    );
  }

  const started = Date.now();
  const prompt = parsed.data.prompt;

  try {
    const result = await jobQueue.addJob(parsed.data);

    const text = typeof result === "string" ? result : result.text || "";
    const perf = result.performance || {};
    const usage = result.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };

    return ok({
      text,
      tokens: text.split(/\s+/).length,
      finish_reason: "stop",
      usage,
      performance: {
        tokens_per_second: perf.tokens_per_second || 0,
        latency_ms: Date.now() - started,
        total_time_ms: Date.now() - started,
      },
    }, 200, corsHeaders);
  } catch (error) {
    return fail(
      {
        code: "GENERATION_ERROR",
        message: error instanceof Error ? error.message : "Failed to generate text or worker disconnected",
      },
      500,
      corsHeaders
    );
  }
}