/**
 * POST /api/ai/analyze
 *
 * Server-side AI extraction endpoint.
 *
 * Accepts a validated story text, runs it through the configured AI
 * provider (xAI/Grok when a key is set, local rule-based engine when not),
 * passes every output through the safety and schema validation pipeline,
 * and returns a fully-typed OrganizedStory.
 *
 * The AI key never leaves the server. The browser only receives the
 * structured result, never the raw model output.
 *
 * Request body:
 *   { text: string, storyId?: string, language?: string }
 *
 * Responses:
 *   200  { success: true,  data: OrganizedStory }
 *   400  validation failure
 *   401  unauthenticated
 *   429  rate limited
 *   500  AI or processing error
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { requireAuth }               from "@/lib/auth/middleware";
import { enforceRateLimit }          from "@/lib/security/rateLimit";
import { readJson }                  from "@/lib/api/validate";
import { apiError }                  from "@/lib/api/errors";
import { getAIProvider }             from "@/lib/ai/provider";
import { buildOrganizedStoryFromAI } from "@/lib/ai/storyAdapter";
import type { HealthStory }          from "@/lib/health/types";

/* ------------------------------------------------------------------ *
 * Schema
 * ------------------------------------------------------------------ */

const AnalyzeSchema = z.object({
  text: z
    .string()
    .min(10, "Story text must be at least 10 characters.")
    .max(50_000, "Story text must be 50 000 characters or fewer."),
  language: z.string().default("en"),
});

/* ------------------------------------------------------------------ *
 * Route
 * ------------------------------------------------------------------ */

export async function POST(request: NextRequest): Promise<NextResponse> {
  /* auth */
  const { user, error } = await requireAuth(request);
  if (error) return error;

  /* rate limit — same bucket as the story-level organize route */
  const rate = await enforceRateLimit(request, { bucket: "ai", userId: user.id });
  if (rate !== null) return rate;

  /* validate body */
  const body = await readJson(request, AnalyzeSchema);
  if (body.error) return body.error;
  const { text, language } = body.data;

  try {
    /* build a minimal HealthStory so the adapter can merge it */
    const healthStory: HealthStory = {
      storyText: text,
      language,
      events: [],
      documents: [],
      voiceInput: null,
      details: { start: null, customDate: "", frequency: null, change: null, notes: "" },
      organizedStory: null,
    };

    const provider = getAIProvider();
    const organized = await buildOrganizedStoryFromAI(provider, healthStory);

    return NextResponse.json({ success: true, data: organized });
  } catch (e) {
    console.error("[/api/ai/analyze] error:", e);
    const message = e instanceof Error ? e.message : "AI processing failed.";

    /* Never expose raw stack traces or key-related messages to the client */
    const safeMessage =
      message.includes("AI_API_KEY") || message.includes("api key")
        ? "AI provider is not configured correctly. Contact the site administrator."
        : "We could not organize your story right now. Please try again.";

    return apiError("AI_ERROR", safeMessage, 500);
  }
}
