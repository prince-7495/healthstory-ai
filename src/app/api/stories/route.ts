import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { CreateStorySchema } from "@/lib/api/schemas";
import { serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const stories = await prisma.story.findMany({
      where: { userId: user.id, status: { not: "DELETED" } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        language: true,
        status: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { events: true, documents: true, followUps: true, questions: true } },
      },
    });

    return NextResponse.json({ success: true, data: stories });
  } catch (e) {
    console.error("List stories error:", e);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to list stories" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const rate = await enforceRateLimit(request, { bucket: "write", userId: user.id });
  if (rate !== null) return rate;

  const body = await readJson(request, CreateStorySchema);
  if (body.error) return body.error;
  const { title, language } = body.data;

  try {
    // Story + initial version + audit log commit together or not at all.
    const story = await prisma.$transaction(async (tx) => {
      const created = await tx.story.create({
        data: { userId: user.id, title, language: language ?? "en" },
      });
      await tx.storyVersion.create({
        data: {
          storyId: created.id,
          versionNumber: 1,
          changeReason: "INITIAL_CREATION",
          createdBy: user.id,
          source: "story.create",
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: created.id,
          action: "STORY_CREATED",
          resourceType: "STORY",
          resourceId: created.id,
        },
      });
      return created;
    });

    return NextResponse.json({ success: true, data: story }, { status: 201 });
  } catch (e) {
    return serverError("Failed to create story", e);
  }
}