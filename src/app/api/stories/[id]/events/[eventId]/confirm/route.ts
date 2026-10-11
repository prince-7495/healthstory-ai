import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { isNotFound, notFound, serverError } from "@/lib/api/errors";
import { recordVersion } from "@/lib/db/versioning";

/**
 * User confirmation — the "HUMANS VERIFY" pillar. Confirmation state
 * is server-controlled: it changes only here, never through a generic
 * field update. Event change, audit entry and version bump commit
 * atomically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, eventId } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized" } },
      { status: 403 }
    );
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.storyEvent.update({
        where: { id: eventId, storyId: id },
        data: { status: "USER_CONFIRMED", confirmedByUser: true, needsConfirmation: false },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "EVENT_CONFIRMED",
          resourceType: "EVENT",
          resourceId: eventId,
        },
      });

      await recordVersion(tx, {
        storyId: id,
        changeReason: "USER_CONFIRMATION",
        createdBy: user.id,
        source: "event.confirm",
        metadata: { eventId },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: event });
  } catch (e) {
    if (isNotFound(e)) return notFound("Event not found");
    return serverError("Failed to confirm event", e);
  }
}
