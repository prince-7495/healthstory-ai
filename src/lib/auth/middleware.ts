import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "./session";
import { prisma } from "@/lib/db/client";
import { forbidden, invalidSession, unauthenticated } from "@/lib/api/errors";

export interface AuthenticatedRequest extends NextRequest {
  user: { id: string; email: string; displayName: string | null };
}

export type AuthUser = AuthenticatedRequest["user"];

/**
 * Result of {@link requireAuth}. Exactly one side is present:
 * either an authenticated `user`, or an `error` response to return
 * straight from the route handler.
 */
export type AuthResult =
  | { user: AuthUser; error?: undefined }
  | { user?: null; error: NextResponse };

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const token = request.cookies.get("healthstory_session")?.value;
  if (!token) {
    return { user: null, error: unauthenticated() };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return { user: null, error: invalidSession() };
  }

  return { user: { id: user.id, email: user.email, displayName: user.displayName } };
}

/**
 * Record a denied access attempt (object-level authorization failure)
 * without ever delaying or breaking the response.
 */
function auditAccessDenied(userId: string, resourceType: string, resourceId: string): void {
  void prisma.auditLog
    .create({
      data: { userId, action: "ACCESS_DENIED", resourceType, resourceId },
    })
    .catch(() => {
      /* auditing must never break the response */
    });
}

/**
 * Object-level authorization: the resource must belong to this user
 * (and not be deleted). Failures are written to the audit log with
 * action `ACCESS_DENIED`.
 */
export async function requireStoryOwner(storyId: string, userId: string): Promise<boolean> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true, status: true },
  });
  const ok = story?.userId === userId && story?.status !== "DELETED";
  if (!ok) auditAccessDenied(userId, "STORY", storyId);
  return ok;
}

export async function requireDocumentOwner(documentId: string, userId: string): Promise<boolean> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, status: true },
  });
  const ok = doc?.userId === userId && doc?.status !== "DELETED";
  if (!ok) auditAccessDenied(userId, "DOCUMENT", documentId);
  return ok;
}

export async function requireFollowUpOwner(followUpId: string, userId: string): Promise<boolean> {
  const followUp = await prisma.followUpEntry.findUnique({
    where: { id: followUpId },
    select: { userId: true },
  });
  const ok = followUp?.userId === userId;
  if (!ok) auditAccessDenied(userId, "FOLLOW_UP", followUpId);
  return ok;
}

export async function requireCommunicationOwner(communicationId: string, userId: string): Promise<boolean> {
  const comm = await prisma.communicationSession.findUnique({
    where: { id: communicationId },
    select: { userId: true },
  });
  const ok = comm?.userId === userId;
  if (!ok) auditAccessDenied(userId, "COMMUNICATION", communicationId);
  return ok;
}

/** Standard 403 response for story-scoped routes. */
export const notStoryOwner = (): NextResponse => forbidden();
