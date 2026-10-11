import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { readJson } from "@/lib/api/validate";
import { UploadDocumentSchema } from "@/lib/api/schemas";
import { apiError, serverError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { LIMITS } from "@/lib/security/limits";
import {
  buildStorageKey,
  checkDocumentFile,
  decodeBase64,
  deleteDocumentBytes,
  saveDocumentBytes,
} from "@/lib/security/files";
import { recordVersion } from "@/lib/db/versioning";

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
    const documents = await prisma.document.findMany({
      where: { storyId: id, status: { not: "DELETED" } },
      orderBy: { uploadedAt: "desc" },
      include: { sections: { orderBy: { pageNumber: "asc" } }, terms: true, measurements: true },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (e) {
    return serverError("Failed to list documents", e);
  }
}

/**
 * Upload a document.
 *
 * Everything security-relevant is decided server-side: the storage
 * key is derived from ids that already passed authorization (a client
 * can never point at another user's file), and the file is validated
 * against an extension/MIME allow-list, magic bytes and size limits
 * before a byte reaches disk. The legacy client-supplied
 * `storageKey` / `checksum` fields are not part of the schema — a
 * payload containing them fails validation (mass-assignment defence).
 */
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

  const rate = await enforceRateLimit(request, { bucket: "upload", userId: user.id });
  if (rate !== null) return rate;

  const body = await readJson(request, UploadDocumentSchema, {
    maxBytes: LIMITS.maxUploadBytes,
  });
  if (body.error) return body.error;
  const { filename, mimeType, content, text } = body.data;

  try {
    const existing = await prisma.document.count({
      where: { storyId: id, status: { not: "DELETED" } },
    });
    if (existing >= LIMITS.maxDocumentsPerStory) {
      return apiError(
        "LIMIT_EXCEEDED",
        `A story can hold at most ${LIMITS.maxDocumentsPerStory} documents`,
        400
      );
    }

    // Exactly one representation: base64 bytes or UTF-8 text.
    let bytes: Buffer | null;
    if (content !== undefined) {
      bytes = decodeBase64(content);
      if (!bytes) {
        return apiError("INVALID_FILE", "File content is not valid base64", 400);
      }
    } else {
      bytes = Buffer.from(text ?? "", "utf8");
    }

    const check = checkDocumentFile({ filename, mimeType, bytes });
    if (!check.ok) {
      return apiError("INVALID_FILE", check.reason, 400);
    }

    const docId = randomUUID();
    const storageKey = buildStorageKey(user.id, id, docId, check.ext);
    const originalText = mimeType.toLowerCase().startsWith("text/")
      ? bytes.toString("utf8")
      : null;

    // File first: if the database step fails below, the compensating
    // cleanup removes it; if this write fails, nothing claims a file
    // exists. Orphans (from a crash between the two steps) are
    // reported by the integrity checker.
    await saveDocumentBytes(storageKey, bytes);

    try {
      const document = await prisma.$transaction(async (tx) => {
        const created = await tx.document.create({
          data: {
            id: docId,
            storyId: id,
            userId: user.id,
            filename: check.safeName,
            mimeType,
            sizeBytes: check.sizeBytes,
            storageKey,
            checksum: check.checksum,
            title: check.safeName,
            originalText,
            status: "UPLOADED",
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            storyId: id,
            action: "DOCUMENT_UPLOADED",
            resourceType: "DOCUMENT",
            resourceId: docId,
            metadata: { filename: check.safeName, sizeBytes: check.sizeBytes },
          },
        });

        await recordVersion(tx, {
          storyId: id,
          changeReason: "DOCUMENT_IMPORT",
          createdBy: user.id,
          source: "document.upload",
          metadata: { documentId: docId },
        });

        return created;
      });

      return NextResponse.json({ success: true, data: document }, { status: 201 });
    } catch (dbError) {
      // Compensate: never leave a file that no row references.
      await deleteDocumentBytes(storageKey);
      throw dbError;
    }
  } catch (e) {
    return serverError("Failed to upload document", e);
  }
}
