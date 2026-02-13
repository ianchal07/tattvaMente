
import { ok } from "@/lib/api/response";
import { jobQueue } from "@/lib/api/queue";

export async function POST() {
    jobQueue.connect();
    return ok({ success: true });
}
