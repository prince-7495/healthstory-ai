import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { PreviewSchema } from "@/lib/api/schemas";
import { apiError, notFound } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { previewOrganizedStory } from "@/lib/health/analyzeHealthStory";
import type { HealthEvent, HealthStory } from "@/lib/health/types";

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

  const body = await readJson(request, PreviewSchema);
  if (body.error) return body.error;
  const text = body.data.text;

  try {
    if (!text || !text.trim()) {
      return NextResponse.json({ success: true, data: null });
    }

    const story = await prisma.story.findUnique({
      where: { id },
      include: { events: true, topics: true, documents: true },
    });

    if (!story) {
      return notFound("Story not found");
    }

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

    const preview = previewOrganizedStory(healthStory);
    return NextResponse.json({ success: true, data: preview });
  } catch (e) {
    console.error("Preview error:", e);
    return apiError("SERVER_ERROR", "Failed to preview", 500);
  }
}
