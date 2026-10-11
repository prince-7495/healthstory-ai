import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { UpdateStorySchema } from "@/lib/api/schemas";
import { serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";

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
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized to access this story" } },
      { status: 403 }
    );
  }

  try {
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        events: { orderBy: { date: "asc" }, include: { topics: { include: { topic: true } } } },
        topics: { include: { events: { include: { event: true } } } },
        followUps: { orderBy: { createdAt: "desc" }, include: { items: true } },
        questions: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" }, include: { sections: { orderBy: { pageNumber: "asc" } } } },
        communications: { orderBy: { createdAt: "desc" }, include: { translations: true } },
        snapshots: { orderBy: { versionNumber: "desc" } },
        versions: { orderBy: { versionNumber: "desc" } },
        graphNodes: { include: { fromEdges: true, toEdges: true } },
        graphEdges: true,
      },
    });

    if (!story) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: story });
  } catch (e) {
    console.error("Get story error:", e);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to get story" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized to update this story" } },
      { status: 403 }
    );
  }

  const rate = await enforceRateLimit(request, { bucket: "write", userId: user.id });
  if (rate !== null) return rate;

  const body = await readJson(request, UpdateStorySchema);
  if (body.error) return body.error;

  try {
    const story = await prisma.$transaction(async (tx) => {
      const updated = await tx.story.update({ where: { id }, data: body.data });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "USER_EDIT",
          resourceType: "STORY",
          resourceId: id,
          metadata: { fields: Object.keys(body.data) },
        },
      });
      return updated;
    });

    return NextResponse.json({ success: true, data: story });
  } catch (e) {
    return serverError("Failed to update story", e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized to delete this story" } },
      { status: 403 }
    );
  }

  try {
    // Soft delete + audit commit together (deletion consistency).
    await prisma.$transaction(async (tx) => {
      await tx.story.update({
        where: { id },
        data: { status: "DELETED", archivedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { userId: user.id, storyId: id, action: "STORY_DELETED", resourceType: "STORY", resourceId: id },
      });
    });

    return NextResponse.json({ success: true, data: { message: "Story deleted" } });
  } catch (e) {
    return serverError("Failed to delete story", e);
  }
}