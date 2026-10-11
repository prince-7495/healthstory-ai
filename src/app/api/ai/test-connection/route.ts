/**
 * GET /api/ai/test-connection
 *
 * Checks whether the configured AI provider key is valid and reachable.
 * Requires authentication (admin or any logged-in user) so the key status
 * is never exposed to unauthenticated callers.
 *
 * Returns:
 *   200  { success: true,  data: { ok: true,  provider, model, latencyMs } }
 *   200  { success: true,  data: { ok: false, provider, error } }
 *   401  if not authenticated
 *
 * The route always returns 200 even when the probe fails — the ok flag
 * carries the real result. This prevents error codes from leaking
 * information about key validity to observers.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { probeXAIConnection } from "@/lib/ai/xai";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAuth(request);
  if (error) return error;

  const provider = process.env.AI_PROVIDER?.toLowerCase() ?? "mock";
  const model    = process.env.AI_MODEL?.trim()    ?? "(none)";
  const keySet   = Boolean(process.env.AI_API_KEY?.trim());

  // Only probe when there is actually a key; otherwise report mock mode
  // immediately rather than making a network call that will always fail.
  if (!["xai", "groq"].includes(provider) || !keySet) {
    return NextResponse.json({
      success: true,
      data: {
        ok: false,
        provider: keySet ? provider : "mock",
        model,
        error: keySet
          ? `Provider "${provider}" is not supported for connection probing yet.`
          : "AI_API_KEY is not set. Running in demo/mock mode.",
      },
    });
  }

  const result = await probeXAIConnection();
  return NextResponse.json({
    success: true,
    data: {
      provider: "xai",
      model: result.ok ? result.model : model,
      ...result,
    },
  });
}
