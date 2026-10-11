import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireDocumentOwner } from "@/lib/auth/middleware";
import { apiError, forbidden, notFound } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { buildDocument } from "@/lib/understand/engine";

/**
 * Analyze a stored document.
 *
 * Authorization is object-level three ways: the document must be the
 * user's, it must belong to the story in the URL, and the story must
 * belong to the user — a document id can never be paired with a story
 * it does not belong to (cross-tenant write fix).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, docId } = await params;
  const canAccess = await requireDocumentOwner(docId, user.id);
  if (!canAccess) {
    return forbidden();
  }

  const rate = await enforceRateLimit(request, { bucket: "ai", userId: user.id });
  if (rate !== null) return rate;

  let processingId: string | null = null;
  try {
    const document = await prisma.document.findUnique({ where: { id: docId } });
    if (!document || document.status === "DELETED") {
      return notFound("Document not found");
    }
    // Cross-story scope check: this document belongs to another story.
    if (document.storyId !== id || document.userId !== user.id) {
      return forbidden();
    }

    // Log AI processing
    const processingRecord = await prisma.aIProcessingRecord.create({
      data: {
        storyId: id,
        type: "DOCUMENT_ANALYSIS",
        status: "PROCESSING",
        inputSummary: { documentId: docId, filename: document.filename },
      },
    });
    processingId = processingRecord.id;

    // Process document through the understand engine
    const analyzed = await buildDocument(
      { name: document.filename, type: document.mimeType, size: document.sizeBytes, text: document.originalText || "" },
      document.uploadedAt.toISOString()
    );

    // Document update and processing-record completion commit together.
    await prisma.$transaction([
      prisma.document.update({
        where: { id: docId },
        data: { analysis: analyzed.analysis as unknown as Prisma.InputJsonValue, status: "ANALYZED", processedAt: new Date() },
      }),
      prisma.aIProcessingRecord.update({
        where: { id: processingRecord.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, data: analyzed });
  } catch (e) {
    if (processingId) {
      await prisma.aIProcessingRecord
        .update({
          where: { id: processingId },
          data: { status: "FAILED", errorMessage: String(e), completedAt: new Date() },
        })
        .catch(() => {
          /* the failure record must not throw again */
        });
    }
    console.error("Document analysis error:", e);
    return apiError("AI_ERROR", "Failed to analyze document", 500);
  }
}
