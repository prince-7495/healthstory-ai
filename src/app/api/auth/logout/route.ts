import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  clearSessionCookie,
  revokeSession,
  verifySession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

/**
 * Logout revokes the server-side session row FIRST, then clears the
 * cookie. The JWT alone is no longer enough to authenticate: from
 * this point on, presenting the old cookie yields 401 even though its
 * signature and expiry are still valid.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const payload = await verifySession(token);
    if (payload) {
      await revokeSession(token);
      void prisma.auditLog
        .create({
          data: {
            userId: payload.userId,
            action: "LOGOUT",
            resourceType: "SESSION",
            resourceId: payload.sessionId,
          },
        })
        .catch(() => {});
    }
  }

  const response = NextResponse.json({ success: true, data: { message: "Logged out" } });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
