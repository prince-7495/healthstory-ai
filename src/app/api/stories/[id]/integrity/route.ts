import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireStoryOwner } from "@/lib/auth/middleware";
import { notFound, serverError } from "@/lib/api/errors";
import { checkStoryIntegrity } from "@/lib/db/integrity";

/**
 * GET /api/stories/:id/integrity — read-only integrity report for one
 * story (ownership, version chain, files on disk, confirmation
 * state). Read-only by design: the checker reports, it never repairs.
 */
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
    const report = await checkStoryIntegrity(id);
    if (!report) return notFound("Story not found");
    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    return serverError("Failed to run integrity checks", e);
  }
}
