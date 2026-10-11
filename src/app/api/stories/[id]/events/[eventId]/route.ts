import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { UpdateEventSchema } from "@/lib/api/schemas";
import { isNotFound, notFound, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { recordVersion } from "@/lib/db/versioning";

export async function PATCH(
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

  const rate = await enforceRateLimit(request, { bucket: "write", userId: user.id });
  if (rate !== null) return rate;

  // Strict schema: provenance fields (createdBy, status, confirmation,
  // evidence) are not accepted here — they only change through their
  // own actions.
  const body = await readJson(request, UpdateEventSchema);
  if (body.error) return body.error;
  const data = body.data;

  try {
    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.storyEvent.update({
        where: { id: eventId, storyId: id },
        data,
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "EVENT_EDITED",
          resourceType: "EVENT",
          resourceId: eventId,
          metadata: { fields: Object.keys(data) },
        },
      });
      await recordVersion(tx, {
        storyId: id,
        changeReason: "USER_EDIT",
        createdBy: user.id,
        source: "event.update",
        metadata: { eventId, fields: Object.keys(data) },
      });
      return updated;
    });

    return NextResponse.json({ success: true, data: event });
  } catch (e) {
    if (isNotFound(e)) return notFound("Event not found");
    return serverError("Failed to update event", e);
  }
}

export async function DELETE(
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
    await prisma.$transaction(async (tx) => {
      await tx.storyEvent.delete({ where: { id: eventId, storyId: id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "EVENT_DELETED",
          resourceType: "EVENT",
          resourceId: eventId,
        },
      });
      await recordVersion(tx, {
        storyId: id,
        changeReason: "USER_EDIT",
        createdBy: user.id,
        source: "event.delete",
        metadata: { eventId },
      });
    });

    return NextResponse.json({ success: true, data: { message: "Event removed" } });
  } catch (e) {
    if (isNotFound(e)) return notFound("Event not found");
    return serverError("Failed to delete event", e);
  }
}
