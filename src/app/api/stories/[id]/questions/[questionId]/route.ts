import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { UpdateQuestionSchema } from "@/lib/api/schemas";
import { isNotFound, notFound, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { recordVersion } from "@/lib/db/versioning";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, questionId } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized" } },
      { status: 403 }
    );
  }

  const rate = await enforceRateLimit(request, { bucket: "write", userId: user.id });
  if (rate !== null) return rate;

  const body = await readJson(request, UpdateQuestionSchema);
  if (body.error) return body.error;

  try {
    const question = await prisma.$transaction(async (tx) => {
      const updated = await tx.storyQuestion.update({
        where: { id: questionId, storyId: id },
        data: body.data,
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "USER_EDIT",
          resourceType: "QUESTION",
          resourceId: questionId,
          metadata: { fields: Object.keys(body.data) },
        },
      });
      // Story content changed (text edit) → new story version.
      // Status-only changes are review state, not content.
      if (body.data.text !== undefined) {
        await recordVersion(tx, {
          storyId: id,
          changeReason: "USER_EDIT",
          createdBy: user.id,
          source: "question.update",
          metadata: { questionId },
        });
      }
      return updated;
    });

    return NextResponse.json({ success: true, data: question });
  } catch (e) {
    if (isNotFound(e)) return notFound("Question not found");
    return serverError("Failed to update question", e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, questionId } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized" } },
      { status: 403 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.storyQuestion.delete({ where: { id: questionId, storyId: id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "QUESTION_DELETED",
          resourceType: "QUESTION",
          resourceId: questionId,
        },
      });
      await recordVersion(tx, {
        storyId: id,
        changeReason: "USER_EDIT",
        createdBy: user.id,
        source: "question.delete",
        metadata: { questionId },
      });
    });

    return NextResponse.json({ success: true, data: { message: "Question deleted" } });
  } catch (e) {
    if (isNotFound(e)) return notFound("Question not found");
    return serverError("Failed to delete question", e);
  }
}
