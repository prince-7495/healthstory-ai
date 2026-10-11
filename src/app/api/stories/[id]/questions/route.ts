import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { CreateQuestionSchema } from "@/lib/api/schemas";
import { apiError, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { LIMITS } from "@/lib/security/limits";

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
    const questions = await prisma.storyQuestion.findMany({
      where: { storyId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (e) {
    console.error("List questions error:", e);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to list questions" } },
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

  const body = await readJson(request, CreateQuestionSchema);
  if (body.error) return body.error;

  try {
    const existing = await prisma.storyQuestion.count({ where: { storyId: id } });
    if (existing >= LIMITS.maxQuestionsPerStory) {
      return apiError(
        "LIMIT_EXCEEDED",
        `A story can hold at most ${LIMITS.maxQuestionsPerStory} questions`,
        400
      );
    }

    const question = await prisma.$transaction(async (tx) => {
      const created = await tx.storyQuestion.create({
        data: { storyId: id, userId: user.id, text: body.data.text, source: body.data.source ?? "USER" },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "QUESTION_CREATED",
          resourceType: "QUESTION",
          resourceId: created.id,
        },
      });
      return created;
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (e) {
    return serverError("Failed to create question", e);
  }
}