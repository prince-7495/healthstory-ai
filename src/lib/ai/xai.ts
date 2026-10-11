/**
 * xAI / Grok provider — Stage 10 extension
 *
 * Grok uses the same OpenAI-compatible REST shape, so this file is a
 * thin wrapper around the existing OpenAIProvider. The only differences
 * from a plain OpenAI call are:
 *
 *   baseUrl  →  https://api.x.ai/v1   (xAI endpoint)
 *   model    →  env AI_MODEL           (default: grok-3-mini)
 *
 * Everything else — auth header, JSON body, response parsing, safety
 * validation, zod schema checks — is unchanged.
 *
 * This file MUST stay server-side only. It reads process.env at
 * construction time, never at import time, so the key is never
 * serialised into the client bundle.
 */

import { OpenAIProvider } from "./provider";
import type { AIProvider } from "./provider";

/** Grok-specific defaults */
const XAI_BASE_URL = "https://api.x.ai/v1";
const XAI_DEFAULT_MODEL = "grok-3-mini";

/**
 * Returns an AIProvider wired to xAI / Grok.
 *
 * Throws at construction time (i.e. at the first API call, not at import)
 * if AI_API_KEY is not set, so the error message is clear.
 */
export function createXAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "[xAI] AI_API_KEY is not set. " +
        "Open your .env file and replace the blank AI_API_KEY= line " +
        "with your key from https://console.x.ai"
    );
  }

  const model =
    process.env.AI_MODEL?.trim() || XAI_DEFAULT_MODEL;

  const baseUrl =
    process.env.AI_BASE_URL?.trim() || XAI_BASE_URL;

  const timeoutMs = process.env.AI_TIMEOUT_MS
    ? parseInt(process.env.AI_TIMEOUT_MS, 10)
    : 60_000;

  return new OpenAIProvider({
    apiKey,
    model,
    baseUrl,
    timeoutMs,
  });
}

/**
 * Quick connectivity probe — sends a minimal chat request and returns
 * whether the key is valid. Used by the /api/ai/test-connection route.
 *
 * Returns { ok: true, model } on success, { ok: false, error } on failure.
 * Never throws.
 */
export async function probeXAIConnection(): Promise<
  | { ok: true; model: string; latencyMs: number }
  | { ok: false; error: string }
> {
  const apiKey  = process.env.AI_API_KEY?.trim();
  const model   = process.env.AI_MODEL?.trim()    || XAI_DEFAULT_MODEL;
  const baseUrl = process.env.AI_BASE_URL?.trim() || XAI_BASE_URL;

  if (!apiKey) {
    return { ok: false, error: "AI_API_KEY is not set in your .env file." };
  }

  const start = Date.now();

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content:
              "Reply with exactly the word CONNECTED and nothing else.",
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: `xAI API returned ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content ?? "";

    if (!reply) {
      return { ok: false, error: "xAI returned an empty response." };
    }

    return { ok: true, model, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
