
import { fail, ok } from "@/lib/api/response";
import { jobQueue } from "@/lib/api/queue";

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail({ code: "VALIDATION_ERROR", message: "Invalid JSON" }, 400);
    }

    const { id, result, error } = body as any;

    if (!id) {
        return fail({ code: "VALIDATION_ERROR", message: "Missing job ID" }, 400);
    }

    const success = jobQueue.completeJob(id, result, error);

    if (!success) {
        return fail({ code: "JOB_NOT_FOUND", message: "Job not found or already completed" }, 404);
    }

    return ok({ success: true });
}
