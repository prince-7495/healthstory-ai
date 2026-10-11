/**
 * Stage 11 — one response envelope for every API error.
 *
 * Shape: `{ success: false, error: { code, message, details? } }`.
 * `code` is stable and machine-readable; `message` is safe to show to
 * a user. Server-side causes are logged, never returned.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";

export type ApiErrorDetails = Array<{ path: string; message: string }>;

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: ApiErrorDetails
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    { status }
  );
}

export function validationError(error: ZodError): NextResponse {
  const details: ApiErrorDetails = error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
  const first = details[0];
  const message = first
    ? `Invalid request — ${first.path}: ${first.message}`
    : "Invalid request";
  return apiError("VALIDATION_ERROR", message, 400, details);
}

export const unauthenticated = (message = "Authentication required"): NextResponse =>
  apiError("UNAUTHENTICATED", message, 401);

export const invalidSession = (): NextResponse =>
  apiError("INVALID_SESSION", "Session expired", 401);

export const forbidden = (message = "Not authorized"): NextResponse =>
  apiError("FORBIDDEN", message, 403);

export const notFound = (message = "Not found"): NextResponse =>
  apiError("NOT_FOUND", message, 404);

export const conflict = (message: string): NextResponse =>
  apiError("CONFLICT", message, 409);

export const serverError = (message: string, cause?: unknown): NextResponse => {
  if (cause !== undefined) console.error(message, cause);
  return apiError("SERVER_ERROR", message, 500);
};

/**
 * Prisma P2025 = "An operation failed because it depends on one or
 * more records that were required but not found." Exposed as 404
 * instead of an opaque 500.
 */
export const isNotFound = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
