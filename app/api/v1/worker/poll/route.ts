
import { ok } from "@/lib/api/response";
import { jobQueue } from "@/lib/api/queue";

export const dynamic = "force-dynamic";

export async function GET() {
    const job = jobQueue.getNextJob();

    // Return even if null, so client knows there's no work
    return ok({
        job,
        pending: jobQueue.getPendingCount(),
    });
}
