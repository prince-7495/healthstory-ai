import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { CreateFollowUpSchema } from "@/lib/api/schemas";
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
    const followUps = await prisma.followUpEntry.findMany({
      where: { storyId: id },
      orderBy: { createdAt: "desc" },
      include: { items: true, relatedDocuments: true },
    });

    return NextResponse.json({ success: true, data: followUps });
  } catch (e) {
    console.error("List follow-ups error:", e);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to list follow-ups" } },
      { status: 500 }
    );
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

  const body = await readJson(request, CreateFollowUpSchema);
  if (body.error) return body.error;
  const { type, originalText, eventDate, eventDatePrecision, language, extractedItems, items } = body.data;

  try {
    const existing = await prisma.followUpEntry.count({ where: { storyId: id } });
    if (existing >= LIMITS.maxFollowUpsPerStory) {
      return apiError(
        "LIMIT_EXCEEDED",
        `A story can hold at most ${LIMITS.maxFollowUpsPerStory} follow-ups`,
        400
      );
    }

    // Entry + extracted item rows + audit + version commit together.
    const followUp = await prisma.$transaction(async (tx) => {
      const created = await tx.followUpEntry.create({
        data: {
          storyId: id,
          userId: user.id,
          type,
          originalText,
          eventDate: eventDate ? new Date(`${eventDate}T00:00:00.000Z`) : null,
          eventDatePrecision: eventDatePrecision ?? undefined,
          language: language ?? "en",
          extractedItems:
            extractedItems === undefined
              ? undefined
              : extractedItems === null
                ? Prisma.JsonNull
                : (extractedItems as Prisma.InputJsonValue),
          items: items ? { create: items } : undefined,
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "FOLLOW_UP_ADDED",
          resourceType: "FOLLOW_UP",
          resourceId: created.id,
          metadata: { itemCount: items?.length ?? 0 },
        },
      });

      await recordVersion(tx, {
        storyId: id,
        changeReason: "FOLLOW_UP",
        createdBy: user.id,
        source: "followUp.create",
        metadata: { followUpId: created.id, itemCount: items?.length ?? 0 },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: followUp }, { status: 201 });
  } catch (e) {
    return serverError("Failed to create follow-up", e);
  }
}