/**
 * Stage 11 — request parsing and validation.
 *
 * `readJson` is the single entry point for every JSON request body:
 * it enforces the content type, a byte cap (before parsing), valid
 * JSON, and a strict zod schema. Unknown keys fail validation, which
 * is what prevents mass assignment.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { LIMITS } from "@/lib/security/limits";
import { apiError, validationError } from "./errors";

export type ParsedBody<T> =
  | { data: T; error?: undefined }
  | { data?: null; error: NextResponse };

export type ReadOptions = {
  /** Override the default byte cap (uploads raise it). */
  maxBytes?: number;
};

export async function readJson<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
  options: ReadOptions = {}
): Promise<ParsedBody<z.infer<S>>> {
  const maxBytes = options.maxBytes ?? LIMITS.maxRequestBytes;

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return {
      data: null,
      error: apiError("UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json", 415),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { data: null, error: apiError("INVALID_JSON", "Could not read the request body", 400) };
  }

  if (text.length > maxBytes) {
    return {
      data: null,
      error: apiError("PAYLOAD_TOO_LARGE", `Request body exceeds ${maxBytes} bytes`, 413),
    };
  }

  let body: unknown;
  try {
    body = text.length === 0 ? undefined : JSON.parse(text);
  } catch {
    return { data: null, error: apiError("INVALID_JSON", "Request body is not valid JSON", 400) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { data: null, error: validationError(result.error) };
  }
  return { data: result.data };
}
