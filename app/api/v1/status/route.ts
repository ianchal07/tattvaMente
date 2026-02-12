import { ok } from "@/lib/api/response";
import { systemService } from "@/lib/services/system-service";

export async function GET() {
  const status = systemService.getStatus();
  return ok(status);
}