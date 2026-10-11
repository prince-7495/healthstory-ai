import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { GenerateCommunicationSchema } from "@/lib/api/schemas";
import { forbidden, notFound, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { generateCommunicationDraft, draftToPlainText } from "@/lib/communication/engine";
import type {
  CommunicationLanguageId,
  CommunicationPerson,
  CommunicationStyle,
  CommunicationTone,
} from "@/lib/communication/types";
import type { AnalyzedEvent } from "@/lib/health/types";
import { createDefaultPreferences, type StoryJournal, type StoryQuestion, type StoryTopic } from "@/lib/journal/types";

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

  const body = await readJson(request, GenerateCommunicationSchema);
  if (body.error) return body.error;
  const { communicationId } = body.data;

  try {
    const comm = await prisma.communicationSession.findUnique({
      where: { id: communicationId, storyId: id },
      include: { translations: true },
    });

    if (!comm) {
      return notFound("Communication not found");
    }
    // Object-level authorization, independent of the story check.
    if (comm.userId !== user.id) {
      return forbidden();
    }

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        events: { include: { topics: { include: { topic: true } } } },
        topics: true,
        questions: true,
      },
    });

    if (!story) {
      return notFound("Story not found");
    }

    // Build selection from comm data
    const journal: StoryJournal = {
      id: story.id,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
      entries: [],
      events: story.events as unknown as AnalyzedEvent[],
      topics: story.topics as unknown as StoryTopic[],
      questions: story.questions as unknown as StoryQuestion[],
      evolutions: [],
      summaries: [],
      snapshots: [],
      preferences: createDefaultPreferences(),
      activity: [],
      documents: [],
      followUps: [],
      userLinks: [],
    };

    // Generate draft using the communication engine
    const draft = generateCommunicationDraft({
      journal,
      selection: {
        focus: "full",
        topicIds: comm.selectedTopicIds,
        range: { id: "all" },
        style: comm.style as CommunicationStyle,
        tone: comm.tone as CommunicationTone,
        person: comm.pointOfView as CommunicationPerson,
        plainLanguage: comm.simplifyLanguage,
        language: (comm.targetLanguage || comm.sourceLanguage) as CommunicationLanguageId,
        sections: { timeline: true, changes: true, context: true, summary: true, questions: true, evidence: false, olderEntries: false },
        questionIds: comm.selectedQuestionIds,
        includeUnconfirmed: false,
      },
    });

    // Build the plain-text version that will be stored and returned
    const draftText = draftToPlainText(draft) || "No health information recorded yet.";

    // Stored draft and audit entry commit together.
    await prisma.$transaction(async (tx) => {
      await tx.communicationSession.update({
        where: { id: communicationId },
        data: { draft: draftText, status: "DRAFT" },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "COMMUNICATION_GENERATED",
          resourceType: "COMMUNICATION",
          resourceId: communicationId,
          metadata: { draftLength: draftText.length },
        },
      });
    });

    return NextResponse.json({ success: true, data: { draft: draftText, validation: draft.validation } });
  } catch (e) {
    return serverError("Failed to generate draft", e);
  }
}
