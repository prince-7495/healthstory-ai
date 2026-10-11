import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth/session";
import { readJson } from "@/lib/api/validate";
import { RegisterSchema } from "@/lib/api/schemas";
import { apiError, serverError } from "@/lib/api/errors";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rate = await enforceRateLimit(request, { bucket: "register", key: clientIp(request) });
  if (rate !== null) return rate;

  const body = await readJson(request, RegisterSchema);
  if (body.error) return body.error;
  const { email, password, displayName } = body.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("EMAIL_EXISTS", "An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName, authProvider: "email" },
    });

    const token = await createSession(user.id, user.email, request.headers.get("user-agent"));

    void prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: "LOGIN_SUCCESS",
          resourceType: "SESSION",
          metadata: { via: "register" },
        },
      })
      .catch(() => {});

    const response = NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email, displayName: user.displayName } },
    });
    response.headers.set("Set-Cookie", setSessionCookie(token));
    return response;
  } catch (error) {
    // Unique constraint on email — the database is the final word.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("EMAIL_EXISTS", "An account with this email already exists", 409);
    }
    return serverError("Failed to register", error);
  }
}
