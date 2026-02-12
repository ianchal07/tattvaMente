import { NextResponse } from "next/server";
import type { APIResponse, APIError } from "@/types/api";

const API_VERSION = "0.1.0";

function buildMetadata() {
  return {
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    version: API_VERSION,
  };
}

export function ok<T>(data: T, status = 200) {
  const payload: APIResponse<T> = {
    success: true,
    data,
    metadata: buildMetadata(),
  };

  return NextResponse.json(payload, { status });
}

export function fail(error: APIError, status = 400) {
  const payload: APIResponse<never> = {
    success: false,
    error,
    metadata: buildMetadata(),
  };

  return NextResponse.json(payload, { status });
}