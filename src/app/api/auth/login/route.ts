import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { verifyPassword, createSession, hashPassword, setSessionCookie } from "@/lib/auth/session";
import { readJson } from "@/lib/api/validate";
import { LoginSchema } from "@/lib/api/schemas";
import { apiError, serverError } from "@/lib/api/errors";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";

/**
 * Fixed hash compared against when the account does not exist, so a
 * missing user and a wrong password cost the same wall-clock time
 * (no account enumeration through response timing).
 */
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomUUID());
  return dummyHashPromise;
}

function auditLoginFailure(
  userId: string | null,
  email: string,
  reason: string
): void {
  void prisma.auditLog
    .create({
      data: {
        userId,
        action: "LOGIN_FAILURE",
        resourceType: "SESSION",
        // The attempted email helps the user spot attacks on their
        // account. Passwords are never logged.
        metadata: { email, reason },
      },
    })
    .catch(() => {});
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rate = await enforceRateLimit(request, { bucket: "login", key: clientIp(request) });
  if (rate !== null) return rate;

  const body = await readJson(request, LoginSchema);
  if (body.error) return body.error;
  const { email, password } = body.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      await verifyPassword(password, await dummyHash());
      auditLoginFailure(null, email, "unknown_account");
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      auditLoginFailure(user.id, email, "bad_password");
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    if (user.status !== "ACTIVE") {
      auditLoginFailure(user.id, email, "account_disabled");
      return apiError("ACCOUNT_DISABLED", "Account is disabled", 403);
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = await createSession(user.id, user.email, request.headers.get("user-agent"));

    void prisma.auditLog
      .create({ data: { userId: user.id, action: "LOGIN_SUCCESS", resourceType: "SESSION" } })
      .catch(() => {});

    const response = NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email, displayName: user.displayName } },
    });
    response.headers.set("Set-Cookie", setSessionCookie(token));
    return response;
  } catch (error) {
    return serverError("Failed to log in", error);
  }
}
