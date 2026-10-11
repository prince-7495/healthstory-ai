import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { UpdateDocumentSchema } from "@/lib/api/schemas";
import { forbidden, isNotFound, notFound, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { deleteDocumentBytes } from "@/lib/security/files";
import { recordVersion } from "@/lib/db/versioning";

/**
 * Load a document scoped to BOTH the story and the user. Story
 * ownership alone is not enough — an id from another story must never
 * resolve, no matter which story id it is paired with.
 */
async function loadScopedDocument(storyId: string, docId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: docId },
    include: { sections: { orderBy: { pageNumber: "asc" } }, terms: true, measurements: true },
  });
  if (!document) return null;
  if (document.storyId !== storyId || document.userId !== userId) return null;
  return document;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, docId } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) return forbidden();

  try {
    const document = await loadScopedDocument(id, docId, user.id);
    if (!document || document.status === "DELETED") {
      return notFound("Document not found");
    }
    return NextResponse.json({ success: true, data: document });
  } catch (e) {
    return serverError("Failed to get document", e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, docId } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) return forbidden();

  const rate = await enforceRateLimit(request, { bucket: "write", userId: user.id });
  if (rate !== null) return rate;

  // Only display metadata. `analysis` is AI output (server-set) and
  // `storageKey` / `checksum` are file-trust fields — neither is
  // client-writable.
  const body = await readJson(request, UpdateDocumentSchema);
  if (body.error) return body.error;

  try {
    // Ownership pre-check: the document must belong to this story and
    // user before anything is written.
    const existing = await prisma.document.findUnique({
      where: { id: docId },
      select: { storyId: true, userId: true, status: true },
    });
    if (
      !existing ||
      existing.storyId !== id ||
      existing.userId !== user.id ||
      existing.status === "DELETED"
    ) {
      return notFound("Document not found");
    }

    const document = await prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: docId },
        data: body.data,
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "USER_EDIT",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: { fields: Object.keys(body.data) },
        },
      });
      return updated;
    });

    return NextResponse.json({ success: true, data: document });
  } catch (e) {
    if (isNotFound(e)) return notFound("Document not found");
    return serverError("Failed to update document", e);
  }
}

/**
 * Soft-delete + audit + version in one transaction; the stored bytes
 * are removed after commit and the extracted text/analysis are
 * cleared — deletion actually deletes.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
): Promise<NextResponse> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { id, docId } = await params;
  const canAccess = await requireStoryOwner(id, user.id);
  if (!canAccess) return forbidden();

  try {
    const document = await prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: docId, storyId: id, userId: user.id },
        data: {
          status: "DELETED",
          deletedAt: new Date(),
          originalText: null,
          analysis: Prisma.JsonNull,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          storyId: id,
          action: "DOCUMENT_DELETED",
          resourceType: "DOCUMENT",
          resourceId: docId,
        },
      });

      await recordVersion(tx, {
        storyId: id,
        changeReason: "USER_EDIT",
        createdBy: user.id,
        source: "document.delete",
        metadata: { documentId: docId },
      });

      return updated;
    });

    await deleteDocumentBytes(document.storageKey);

    return NextResponse.json({ success: true, data: { message: "Document deleted" } });
  } catch (e) {
    if (isNotFound(e)) return notFound("Document not found");
    return serverError("Failed to delete document", e);
  }
}
