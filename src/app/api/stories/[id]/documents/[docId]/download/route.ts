import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { forbidden, notFound, serverError } from "@/lib/api/errors";
import { readDocumentBytes } from "@/lib/security/files";

/** Content types this server will ever re-serve. */
const ALLOWED_DOWNLOAD_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);

/**
 * Authenticated document download.
 *
 * The raw storage path never leaves the server: this route resolves
 * the file itself after three checks (session → story ownership →
 * document belongs to that story AND that user), and every access is
 * written to the audit log.
 */
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
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        storyId: true,
        userId: true,
        status: true,
        filename: true,
        mimeType: true,
        storageKey: true,
      },
    });

    if (!document || document.status === "DELETED") {
      return notFound("Document not found");
    }
    // Object-level authorization: this document must belong to the
    // story in the URL *and* to the requesting user.
    if (document.storyId !== id || document.userId !== user.id) {
      return forbidden();
    }

    const bytes = await readDocumentBytes(document.storageKey);
    if (!bytes) {
      // Honest failure — the row exists but the file does not (also
      // surfaced by the integrity checker). Never fall back to
      // anything else.
      return notFound("File is not available");
    }

    void prisma.auditLog
      .create({
        data: {
          userId: user.id,
          storyId: id,
          action: "DOCUMENT_ACCESS",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: { filename: document.filename },
        },
      })
      .catch(() => {});

    const safeName = document.filename.replace(/[^A-Za-z0-9._-]/g, "_") || "document";
    const contentType = ALLOWED_DOWNLOAD_MIMES.has(document.mimeType)
      ? document.mimeType
      : "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return serverError("Failed to download document", e);
  }
}
