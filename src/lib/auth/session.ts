import { prisma } from "@/lib/db/client";
import { compare, hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Validates and returns the AUTH_SECRET.
 * In production, fails hard if AUTH_SECRET is not set or is the dev placeholder.
 * In development, allows a dev fallback but warns.
 */
function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  const isProduction = process.env.NODE_ENV === "production";
  const isDevPlaceholder = secret === "dev-secret-change-in-production" || secret === "dev-healthstory-secret-change-before-any-real-deployment";

  if (!secret) {
    if (isProduction) {
      throw new Error("AUTH_SECRET is not set. Production requires a valid AUTH_SECRET environment variable.");
    }
    // Development fallback - but warn
    console.warn("[AUTH] WARNING: AUTH_SECRET not set, using development fallback. Set AUTH_SECRET in .env for production.");
    return new TextEncoder().encode("dev-secret-change-in-production");
  }

  if (isProduction && isDevPlaceholder) {
    throw new Error("AUTH_SECRET is set to a development placeholder. Production requires a cryptographically secure random secret. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"");
  }

  if (isDevPlaceholder && !isProduction) {
    console.warn("[AUTH] WARNING: AUTH_SECRET is a development placeholder. Replace with a real secret for production.");
  }

  // Validate minimum entropy for production
  if (isProduction && secret.length < 32) {
    throw new Error("AUTH_SECRET is too short. Use at least 32 characters (48 bytes base64url recommended).");
  }

  return new TextEncoder().encode(secret);
}

const SECRET = getAuthSecret();

/** Keep in sync with the cookie Max-Age. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  userId: string;
  email: string;
  /** Server-side revocation handle (row id in `user_sessions`). */
  sessionId: string;
  exp: number;
}

/**
 * Create a session: a row in `user_sessions` plus a signed JWT that
 * references it. The row is what makes logout real ΓÇö a revoked row is
 * rejected even though the JWT itself is still cryptographically valid.
 */
export async function createSession(
  userId: string,
  email: string,
  userAgent?: string | null
): Promise<string> {
  const sessionId = randomUUID();
  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  // Opportunistic cleanup of expired rows ΓÇö keeps the table small
  // without a scheduled job.
  void prisma.userSession
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  return new SignJWT({ userId, email, sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_TTL_MS) / 1000))
    .sign(SECRET);
}

/** Verify the signature and expiry only ΓÇö no database involvement. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const { userId, email, sessionId, exp } = payload;
    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof sessionId !== "string" ||
      typeof exp !== "number"
    ) {
      return null;
    }
    return { userId, email, sessionId, exp };
  } catch {
    return null;
  }
}

/**
 * Revoke the session behind this token (logout). Returns true when a
 * live session was revoked.
 */
export async function revokeSession(token: string): Promise<boolean> {
  const payload = await verifySession(token);
  if (!payload) return false;
  try {
    const result = await prisma.userSession.updateMany({
      where: { id: payload.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

/**
 * Full authentication check: JWT validity ΓåÆ session row (exists,
 * matches the token's user, not revoked, not expired) ΓåÆ active user.
 * Any database failure fails closed (null ΓåÆ 401).
 */
export async function getUserFromToken(token: string) {
  try {
    const payload = await verifySession(token);
    if (!payload) return null;

    const session = await prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (!session || session.userId !== payload.userId) return null;
    if (session.revokedAt !== null) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, displayName: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") return null;
    return user;
  } catch {
    return null;
  }
}

// Cookie helpers for Next.js
export const SESSION_COOKIE_NAME = "healthstory_session";

// Browsers treat http://localhost as a secure origin, but non-browser clients
// (curl, test harnesses) will not send a `Secure` cookie over plain HTTP.
// Only require Secure when actually serving over HTTPS in production.
const SECURE_ATTR = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function setSessionCookie(token: string) {
  // This will be used in API routes
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax${SECURE_ATTR}; Max-Age=604800`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax${SECURE_ATTR}; Max-Age=0`;
}
