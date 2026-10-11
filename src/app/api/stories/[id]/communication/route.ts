import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { CreateCommunicationSchema } from "@/lib/api/schemas";
import { notFound, serverError } from "@/lib/api/errors";
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
      { success: false, error: { code: "FORBIDDEN", message: "Not authorized" } },
      { status: 403 }
    );
  }

  try {
    const communications = await prisma.communicationSession.findMany({
      where: { storyId: id },
      orderBy: { createdAt: "desc" },
      include: { translations: true },
    });

    return NextResponse.json({ success: true, data: communications });
  } catch (e) {
    console.error("List communications error:", e);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to list communications" } },
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

  const body = await readJson(request, CreateCommunicationSchema);
  if (body.error) return body.error;
  const data = body.data;

  try {
    const story = await prisma.story.findUnique({
      where: { id },
      select: { currentVersion: true },
    });
    if (!story) return notFound("Story not found");

    const communication = await prisma.communicationSession.create({
      data: {
        storyId: id,
        userId: user.id,
        sourceLanguage: data.sourceLanguage ?? "en",
        targetLanguage: data.targetLanguage ?? null,
        style: data.style ?? null,
        tone: data.tone ?? null,
        pointOfView: data.pointOfView ?? null,
        simplifyLanguage: data.simplifyLanguage ?? false,
        selectedEventIds: data.selectedEventIds ?? [],
        selectedTopicIds: data.selectedTopicIds ?? [],
        selectedQuestionIds: data.selectedQuestionIds ?? [],
        // Server decides the version baseline when the client omits it.
        sourceVersion: data.sourceVersion ?? story.currentVersion,
      },
    });

    return NextResponse.json({ success: true, data: communication }, { status: 201 });
  } catch (e) {
    return serverError("Failed to create communication", e);
  }
}