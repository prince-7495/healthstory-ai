import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { CreateEventsSchema } from "@/lib/api/schemas";
import { apiError, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { LIMITS } from "@/lib/security/limits";
import { recordVersion } from "@/lib/db/versioning";

export async function GET(
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

  try {
    const events = await prisma.storyEvent.findMany({
      where: { storyId: id },
      orderBy: { date: "asc" },
      include: { topics: { include: { topic: true } }, sourceReferences: true },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (e) {
    return serverError("Failed to list events", e);
  }
}

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

  const rate = await enforceRateLimit(request, { bucket: "write", userId: user.id });
  if (rate !== null) return rate;

  const body = await readJson(request, CreateEventsSchema);
  if (body.error) return body.error;
  const eventsArray = Array.isArray(body.data.events)
    ? body.data.events
    : [body.data.events];

  try {
    const existing = await prisma.storyEvent.count({ where: { storyId: id } });
    if (existing + eventsArray.length > LIMITS.maxEventsPerStory) {
      return apiError(
        "LIMIT_EXCEEDED",
        `A story can hold at most ${LIMITS.maxEventsPerStory} events`,
        400
      );
    }

    const anyAiOrigin = eventsArray.some((e) => e.origin === "AI");

    // Events + audit + version bump commit atomically.
    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.storyEvent.createMany({
        data: eventsArray.map((e) => ({
          storyId: id,
          title: e.title,
          category: e.category ?? undefined,
          date: e.date ? new Date(`${e.date}T00:00:00.000Z`) : e.date === null ? null : undefined,
          datePrecision: e.datePrecision ?? undefined,
          dateText: e.dateText,
          description: e.description,
          frequency: e.frequency ?? undefined,
          severity: e.severity ?? undefined,
          context: e.context ?? undefined,
          changeDescription: e.changeDescription ?? undefined,
          originalText: e.originalText,
          sourceText: e.sourceText,
          label: e.label,
          timeLabel: e.timeLabel,
          extractionConfidence: e.extractionConfidence ?? undefined,
          mentions: e.mentions,
          // Provenance is derived from `origin`, never taken from the payload.
          createdBy: e.origin === "AI" ? "AI" : "USER",
          status: e.origin === "AI" ? "AI_ORGANIZED" : "USER_REPORTED",
          needsConfirmation: e.origin === "AI",
          evidence: e.evidence as unknown as Prisma.InputJsonValue | undefined,
          metadata: e.metadata as unknown as Prisma.InputJsonValue | undefined,
        })),
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "EVENT_CREATED",
          resourceType: "EVENT",
          metadata: { count: result.count },
        },
      });

      await recordVersion(tx, {
        storyId: id,
        changeReason: anyAiOrigin ? "AI_ORGANIZATION" : "USER_EDIT",
        createdBy: user.id,
        source: "event.create",
        metadata: { count: result.count },
      });

      return result;
    });

    return NextResponse.json({ success: true, data: { created: created.count } }, { status: 201 });
  } catch (e) {
    return serverError("Failed to create events", e);
  }
}
