
import { ok } from "@/lib/api/response";
import { jobQueue } from "@/lib/api/queue";

export async function POST() {
    jobQueue.unregisterWorker();
    return ok({ success: true });
}
