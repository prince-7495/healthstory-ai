/**
 * storyAdapter.ts — AI output → OrganizedStory
 *
 * This is the single seam between "whatever the AI returned" and "what
 * the rest of the application uses". Every safety check, schema
 * validation, and fall-back lives here so the organize route and the
 * analyze route share identical behaviour.
 *
 * Pipeline:
 *   1. Sanitize input  (prompt-injection defence)
 *   2. Call AI provider's extractStory()
 *   3. Validate schema (zod — rejects hallucinated or malformed fields)
 *   4. Safety filter   (medical claims, uncertainty preservation)
 *   5. Merge with local engine result (provides timeline, symptoms, etc.)
 *   6. Return OrganizedStory
 *
 * If ANY step fails the function throws — the caller is responsible for
 * catching and logging. It never silently swaps in mock data in
 * production; that would hide real failures.
 */

import type { AIProvider, StoryExtractionInput } from "./provider";
import { validateExtractionOutput }              from "./schemas/validation";
import { checkPromptInjection, sanitizeInput }   from "./safety/promptInjection";
import { validateAIOutput }                      from "./safety/medicalClaims";
import {
  analyzeHealthStory,
  LOCAL_INFO,
}                                                from "@/lib/health/analyzeHealthStory";
import {
  makeId,
  toAnalyzedEvent,
  type AnalyzedEvent,
  type AnalyzerInfo,
  type HealthChange,
  type HealthStory,
  type OrganizedStory,
  type UnclearItem,
}                                                from "@/lib/health/types";

/* ------------------------------------------------------------------ *
 * Analyzer metadata shown in the UI
 * ------------------------------------------------------------------ */

const GROK_INFO: AnalyzerInfo = {
  id: "xai-grok",
  label: "Grok AI extraction (xAI)",
  description:
    "Your story was organised by Grok, xAI's language model. " +
    "Every item shows the sentence it came from. " +
    "Nothing is added that you did not write.",
  isRealModel: true,
};

const MOCK_AI_INFO: AnalyzerInfo = {
  ...LOCAL_INFO,
  label: "Demo mode — local rule-based extraction",
};

/* ------------------------------------------------------------------ *
 * Safety: max characters sent to the AI
 * ------------------------------------------------------------------ */

const MAX_TEXT_CHARS = 8_000; // keeps tokens and cost reasonable

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Remove any attempt to hijack the prompt embedded in health text. */
function safeText(raw: string): string {
  const check = checkPromptInjection(raw);
  if (!check.safe) {
    console.warn("[storyAdapter] Prompt injection patterns neutralised:", check.detected);
  }
  return sanitizeInput(raw).slice(0, MAX_TEXT_CHARS);
}

/**
 * Converts one AI-extracted event into a full AnalyzedEvent so it is
 * usable by the Stage 3 timeline, evidence panel, etc.
 */
function aiEventToAnalyzed(e: {
  description: string;
  date: string | null;
  dateLabel: string;
  datePrecision: string;
  frequency: string | null;
  change: string | null;
  notes?: string;
  category?: string;
  severity?: string | null;
  context?: string | null;
  sourceText?: string;
  label?: string;
  timeLabel?: string;
  extractionConfidence?: string;
}, index: number): AnalyzedEvent {
  return toAnalyzedEvent({
    id: makeId(`ai-ev-${index}`),
    date: e.date,
    dateLabel: e.dateLabel,
    datePrecision: e.datePrecision as AnalyzedEvent["datePrecision"],
    description: e.description,
    frequency: e.frequency,
    change: e.change,
    notes: e.notes ?? "",
    origin: "ai",
    title: e.label ?? e.description.slice(0, 72),
    category: (e.category ?? "other") as AnalyzedEvent["category"],
    dateText: e.dateLabel,
    severity: e.severity ?? null,
    context: e.context ?? null,
    sourceText: e.sourceText ?? e.description,
    evidence: [
      {
        id: makeId("ev-src"),
        text: e.sourceText ?? e.description,
        field: "event",
      },
    ],
    mentions: 1,
    label: e.label ?? e.description.slice(0, 50),
    timeLabel: e.timeLabel ?? e.dateLabel,
    extractionConfidence: (e.extractionConfidence ?? "medium") as AnalyzedEvent["extractionConfidence"],
    status: "AI_ORGANIZED",
    needsConfirmation: true,
  });
}

/**
 * Derives "What Changed?" comparisons from the AI-extracted events.
 *
 * The AI returns raw events; we derive changes from pairs rather than
 * asking the model to invent them, which would risk hallucination.
 */
function deriveChanges(events: AnalyzedEvent[]): HealthChange[] {
  const changes: HealthChange[] = [];
  const byLabel = new Map<string, AnalyzedEvent[]>();

  for (const e of events) {
    const key = (e.label ?? e.title).toLowerCase();
    const bucket = byLabel.get(key) ?? [];
    bucket.push(e);
    byLabel.set(key, bucket);
  }

  for (const [, bucket] of byLabel) {
    if (bucket.length < 2) continue;

    const withFreq = bucket.filter((e) => e.frequency);
    if (withFreq.length < 2) continue;

    const first = withFreq[0];
    const last  = withFreq[withFreq.length - 1];
    if (first.frequency === last.frequency) continue;

    changes.push({
      id: makeId("chg"),
      category: "Frequency",
      before: first.frequency!,
      after: last.frequency!,
      description: `You reported ${(first.label ?? "this").toLowerCase()} frequency changing from "${first.frequency}" to "${last.frequency}".`,
      sourceText: last.sourceText ?? last.description,
      confidence: "medium",
    });
  }

  return changes;
}

/* ------------------------------------------------------------------ *
 * Main export
 * ------------------------------------------------------------------ */

/**
 * Calls the AI provider, validates every field, runs safety checks, and
 * returns a well-formed OrganizedStory. Falls back to the local engine
 * on any failure — but only when running with the MockAIProvider
 * (i.e. no key configured). If a real provider is configured and fails,
 * the error propagates so the caller can log it and inform the user.
 */
export async function buildOrganizedStoryFromAI(
  provider: AIProvider,
  story: HealthStory,
): Promise<OrganizedStory> {
  const isMock = provider.name === "mock";

  /* --- mock/demo path: run the local engine, no external call --- */
  if (isMock) {
    const local = await analyzeHealthStory(story);
    return {
      ...local,
      analyzer: MOCK_AI_INFO,
    };
  }

  /* --- real AI path --- */

  /* 1. Sanitize input */
  const safeStoryText = safeText(story.storyText);

  const input: StoryExtractionInput = {
    text: safeStoryText,
    options: { language: story.language ?? "en" },
  };

  /* 2. Call the provider */
  const raw = await provider.extractStory(input);

  /* 3. Schema validation — reject anything that doesn't fit */
  const schemaResult = validateExtractionOutput(raw);
  if (!schemaResult.success) {
    throw new Error(
      `[storyAdapter] AI response failed schema validation: ${schemaResult.errors.join("; ")}`
    );
  }
  const validated = schemaResult.data!;

  /* 4. Safety filter on summary text */
  const summaryCheck = validateAIOutput(validated.summary ?? "", { hasSources: true });
  let summary = validated.summary ?? "";
  if (!summaryCheck.safe) {
    console.warn("[storyAdapter] Safety filter: flagged phrases in summary:", summaryCheck.flaggedPhrases);
    summary = summaryCheck.rewritten ?? summary;
  }

  /* 5. Convert extracted events → AnalyzedEvent[] */
  const aiEvents: AnalyzedEvent[] = validated.events.map((e, i) =>
    aiEventToAnalyzed(e, i)
  );

  /* Safety filter: validate each event description */
  const safeEvents = aiEvents.map((e) => {
    const check = validateAIOutput(e.description, { hasSources: true });
    if (!check.safe) {
      console.warn("[storyAdapter] Safety filter: flagged in event:", e.id, check.flaggedPhrases);
      return {
        ...e,
        description: check.rewritten ?? e.description,
        sourceText: check.rewritten ?? e.sourceText,
      };
    }
    return e;
  });

  /* 6. Also run the local engine to fill in the fields the AI doesn't
        produce (timeline entries, symptom chips, notable changes, gaps,
        questions, unclear items). We use these as the "skeleton" and
        overlay the AI events on top. */
  const local = await analyzeHealthStory({
    ...story,
    storyText: safeStoryText,
  });

  /* Merge: AI events replace local events (they are richer), everything
     else (timeline shape, gaps, questions) comes from the local engine. */
  const changes     = deriveChanges(safeEvents);
  const unclear: UnclearItem[] = local.unclear;

  /* Rebuild timeline from AI events merged with any user-typed events */
  const userEvents  = local.events.filter((e) => e.origin === "user");
  const allEvents   = [...userEvents, ...safeEvents];

  /* Rebuild notableChanges for the Stage 2 view */
  const notableChanges = changes.map((c) => ({
    id: c.id,
    text: `${c.category}: ${c.before} → ${c.after}`,
    direction: /more|increased|worse|higher/i.test(c.after)
      ? ("up" as const)
      : /less|decreased|better|lower/i.test(c.after)
        ? ("down" as const)
        : ("neutral" as const),
    evidence: c.sourceText,
  }));

  const analyzerInfo: AnalyzerInfo = {
    ...GROK_INFO,
    label: `Grok AI extraction — ${provider.model}`,
  };

  return {
    ...local,
    summary,
    events:         allEvents,
    changes,
    unclear,
    missing:        local.missing,
    notableChanges: notableChanges.length > 0 ? notableChanges : local.notableChanges,
    analyzer:       analyzerInfo,
  };
}
