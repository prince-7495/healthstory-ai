import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { OrganizeSchema } from "@/lib/api/schemas";
import { apiError, notFound } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { getAIProvider } from "@/lib/ai/provider";
import { buildOrganizedStoryFromAI } from "@/lib/ai/storyAdapter";
import type { HealthEvent, HealthStory } from "@/lib/health/types";

/**
 * AI organization pass. The request body is strictly validated (only
 * `text`), rate-limited under the `ai` bucket, and every run is
 * recorded in `ai_processing_records` — including failures, which are
 * marked with the real record id instead of being dropped.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized" } },
      { status: 403 }
    );
  }

  const rate = await enforceRateLimit(request, { bucket: "ai", userId: user.id });
  if (rate !== null) return rate;

  const body = await readJson(request, OrganizeSchema);
  if (body.error) return body.error;
  const { text } = body.data;

  let processingId: string | null = null;
  try {
    // Create a HealthStory object from the story
    const story = await prisma.story.findUnique({
      where: { id },
      include: { events: true, topics: true, documents: true },
    });

    if (!story) {
      return notFound("Story not found");
    }

    // Build HealthStory object for the analyzer
    const healthStory: HealthStory = {
      storyText: text,
      language: story.language,
      events: story.events.map((e) => ({
        id: e.id,
        date: e.date?.toISOString().split("T")[0] || null,
        dateLabel: e.date ? e.date.toISOString().split("T")[0] : "Date not provided",
        datePrecision: e.datePrecision,
        description: e.description,
        frequency: e.frequency,
        change: e.changeDescription,
        notes: e.context || "",
        origin: e.createdBy,
        title: e.title || undefined,
        category: e.category,
        dateText: e.dateText || undefined,
        severity: e.severity,
        context: e.context,
        sourceText: e.sourceText || undefined,
        evidence: e.evidence,
        mentions: e.mentions || undefined,
        label: e.label ?? undefined,
        timeLabel: e.timeLabel ?? undefined,
        extractionConfidence: e.extractionConfidence,
        status: e.status,
        needsConfirmation: e.needsConfirmation,
        metadata: e.metadata,
      })) as unknown as HealthEvent[],
      documents: story.documents.map((d) => ({
        id: d.id,
        name: d.filename,
        type: d.mimeType,
        size: d.sizeBytes,
        state: "added" as const,
        addedAt: d.uploadedAt.toISOString(),
      })),
      voiceInput: null,
      details: { start: null, customDate: "", frequency: null, change: null, notes: "" },
      organizedStory: null,
    };

    // Log AI processing start
    const processingRecord = await prisma.aIProcessingRecord.create({
      data: {
        storyId: id,
        type: "STORY_EXTRACTION",
        status: "PROCESSING",
        inputSummary: { textLength: text.length },
      },
    });
    processingId = processingRecord.id;

    const organized = await buildOrganizedStoryFromAI(getAIProvider(), healthStory);

    await prisma.aIProcessingRecord.update({
      where: { id: processingRecord.id },
      data: {
        status: "COMPLETED",
        outputSummary: {
          eventCount: organized.events.length,
          changeCount: organized.changes.length,
          analyzer: organized.analyzer.id,
          isRealModel: organized.analyzer.isRealModel,
        },
        completedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, storyId: id, action: "AI_ORGANIZATION", resourceType: "STORY", resourceId: id, metadata: { eventCount: organized.events.length } },
    });

    return NextResponse.json({ success: true, data: organized });
  } catch (e) {
    if (processingId) {
      await prisma.aIProcessingRecord
        .update({
          where: { id: processingId },
          data: { status: "FAILED", errorMessage: String(e), completedAt: new Date() },
        })
        .catch(() => {
          /* the failure record must not throw again */
        });
    }
    console.error("AI extraction error:", e);
    return apiError("AI_ERROR", "Failed to organize story", 500);
  }
}
