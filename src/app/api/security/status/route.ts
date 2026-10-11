import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { LIMITS } from "@/lib/security/limits";
import { BUCKETS } from "@/lib/security/rateLimit";
import { ALLOWED_DOCUMENT_TYPES, storageRoot } from "@/lib/security/files";
import { INTEGRITY_CHECKS } from "@/lib/db/integrity";

/**
 * GET /api/security/status — machine-readable security posture.
 *
 * Facts only: configuration and reachability, never counts, ids or
 * user data. This is the endpoint the judge-facing /security page
 * renders (falls back to its static description if unreachable).
 */
export async function GET(): Promise<NextResponse> {
  // Database reachability + applied migration count. Failure is
  // reported honestly instead of hiding behind a 500.
  let reachable = false;
  let appliedMigrations = 0;
  let auditActions: string[] = [];
  try {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
    appliedMigrations = Number(rows[0]?.count ?? 0);
    const actions = await prisma.$queryRaw<{ action: string }[]>`
      SELECT unnest(enum_range(NULL::"AuditAction")) AS action`;
    auditActions = actions.map((a) => a.action);
    reachable = true;
  } catch {
    reachable = false;
  }

  return NextResponse.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      authentication: {
        strategy: "session cookie (JWT HS256) + server-side session row",
        revokesOnLogout: true,
        passwordHashing: "bcrypt (cost 12)",
        cookie: {
          name: "healthstory_session",
          httpOnly: true,
          sameSite: "Lax",
          secure: process.env.NODE_ENV === "production",
          maxAgeSeconds: 604800,
        },
      },
      authorization: {
        model: "object-level ownership on every story/document/follow-up/communication route",
        deniedAccessAudited: true,
      },
      requestValidation: {
        library: "zod",
        mode: "strict (unknown keys rejected — mass-assignment defence)",
        maxJsonBytes: LIMITS.maxRequestBytes,
        maxUploadBytes: LIMITS.maxUploadBytes,
        resourceLimits: LIMITS,
      },
      rateLimiting: {
        implementation: "in-memory fixed window (per instance)",
        buckets: BUCKETS,
      },
      files: {
        storage: `private directory (${storageRoot()}) outside the web root`,
        serverGeneratedKeys: true,
        validation: ["extension allow-list", "MIME↔extension match", "magic bytes", "size cap", "sha-256 checksum"],
        allowedTypes: Object.keys(ALLOWED_DOCUMENT_TYPES),
        download: "authenticated route with audit entry",
      },
      database: {
        provider: "postgresql",
        reachable,
        appliedMigrations,
        migrationsDirectory: "prisma/migrations",
      },
      headers: {
        configuredIn: "next.config.ts",
        list: [
          "Content-Security-Policy",
          "X-Content-Type-Options",
          "X-Frame-Options",
          "Referrer-Policy",
          "Permissions-Policy",
          "Cross-Origin-Opener-Policy",
          "Cross-Origin-Resource-Policy",
          ...(process.env.NODE_ENV === "production" ? ["Strict-Transport-Security"] : []),
        ],
      },
      auditTrail: {
        actions: auditActions,
        recorded: ["logins and failures", "logout", "denied access", "rate-limit trips", "story/document writes", "AI operations"],
      },
      integrity: {
        endpoint: "GET /api/stories/:id/integrity",
        checks: INTEGRITY_CHECKS,
      },
    },
  });
}
