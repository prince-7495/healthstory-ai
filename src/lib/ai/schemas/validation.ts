/**
 * Schema Validation for AI Outputs - Stage 10
 * Ensures AI structured outputs conform to expected schemas
 */

import { z } from "zod";

// ============================================================
// Health Story Extraction Schema
// ============================================================

export const ExtractedEventSchema = z.object({
  description: z.string().min(1).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().transform(v => v ?? null),
  dateLabel: z.string().optional().transform(v => v ?? "Date not provided"),
  datePrecision: z.enum(["exact", "month", "approximate", "relative", "range", "unknown"]).optional().transform(v => v ?? "unknown"),
  frequency: z.string().nullable().optional().transform(v => v ?? null),
  change: z.string().nullable().optional().transform(v => v ?? null),
  notes: z.string().default(""),
  category: z.enum(["symptom", "medication", "treatment", "test", "appointment", "lifestyle", "context", "change", "other"]).optional(),
  severity: z.string().nullable().optional(),
  context: z.string().nullable().optional(),
  sourceText: z.string().optional(),
  label: z.string().optional(),
  timeLabel: z.string().optional(),
  extractionConfidence: z.enum(["high", "medium", "low"]).optional(),
});

export const ExtractionOutputSchema = z.object({
  events: z.array(ExtractedEventSchema),
  summary: z.string().optional(),
});

export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;
export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

// ============================================================
// Change Detection Schema
// ============================================================

export const ChangeSchema = z.object({
  eventId: z.string(),
  category: z.enum(["Frequency", "Severity", "Medication", "Treatment", "New Information", "Improved", "Worsened", "Started", "Stopped", "Continued"]),
  previousValue: z.string(),
  currentValue: z.string(),
  previousSourceText: z.string(),
  currentSourceText: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ChangeDetectionOutputSchema = z.object({
  changes: z.array(ChangeSchema),
  noChangeDetected: z.boolean().default(false),
});

export type Change = z.infer<typeof ChangeSchema>;
export type ChangeDetectionOutput = z.infer<typeof ChangeDetectionOutputSchema>;

// ============================================================
// Communication Generation Schema
// ============================================================

export const CommunicationDraftSchema = z.object({
  opening: z.string(),
  whatINoticed: z.string(),
  whenItStarted: z.string(),
  howItChanged: z.string(),
  relevantContext: z.string(),
  recentUpdate: z.string().optional(),
  questions: z.array(z.string()),
  informationNotRecorded: z.array(z.string()),
  closing: z.string().optional(),
  validation: z.object({
    safe: z.boolean(),
    flaggedPhrases: z.array(z.string()),
    rewritten: z.string().optional(),
  }),
});

export type CommunicationDraft = z.infer<typeof CommunicationDraftSchema>;

// ============================================================
// Document Analysis Schema
// ============================================================

export const DocumentSectionSchema = z.object({
  title: z.string(),
  pageNumber: z.number().int().positive(),
  originalText: z.string(),
  sourceReferenceId: z.string().optional(),
});

export const DocumentTermSchema = z.object({
  term: z.string(),
  plainDefinition: z.string(),
  documentContext: z.string().optional(),
  sourceReferenceId: z.string().optional(),
});

export const DocumentMeasurementSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  date: z.string().optional(),
  sourceReferenceId: z.string().optional(),
});

export const DocumentAnalysisSchema = z.object({
  sections: z.array(DocumentSectionSchema),
  terms: z.array(DocumentTermSchema),
  measurements: z.array(DocumentMeasurementSchema),
  dates: z.array(z.string()),
  explanations: z.array(z.object({
    explanation: z.string(),
    sourceReferenceId: z.string(),
  })),
  sourceReferences: z.array(z.object({
    id: z.string(),
    documentId: z.string(),
    pageNumber: z.number(),
    section: z.string(),
    quotedText: z.string(),
  })),
  status: z.enum(["ANALYZED", "NEEDS_REVIEW", "ERROR"]),
});

export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;

// ============================================================
// Insight Generation Schema
// ============================================================

export const StoryInsightSchema = z.object({
  id: z.string(),
  type: z.enum([
    "REPEATED_TOPIC",
    "TIMELINE_CLUSTER",
    "NEW_INFORMATION",
    "CORRECTION",
    "UNRESOLVED_QUESTION",
    "DOCUMENT_CONNECTION",
    "MISSING_INFORMATION",
    "CONFLICT",
    "COMMUNICATION_UPDATE",
  ]),
  title: z.string(),
  body: z.string(),
  why: z.string(),
  sourceNodeIds: z.array(z.string()),
  evidence: z.array(z.object({
    type: z.enum(["mention", "change", "document", "follow_up", "question"]),
    text: z.string(),
    sourceIds: z.array(z.string()),
  })),
  signature: z.string(),
  status: z.enum(["CURRENT", "STALE", "DISMISSED", "NEEDS_REVIEW", "CONFIRMED"]),
});

export type StoryInsight = z.infer<typeof StoryInsightSchema>;

// ============================================================
// Validation Functions
// ============================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

export function validateExtractionOutput(data: unknown): ValidationResult<ExtractionOutput> {
  const result = ExtractionOutputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
}

export function validateChangeDetectionOutput(data: unknown): ValidationResult<ChangeDetectionOutput> {
  const result = ChangeDetectionOutputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
}

export function validateCommunicationDraft(data: unknown): ValidationResult<CommunicationDraft> {
  const result = CommunicationDraftSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
}

export function validateDocumentAnalysis(data: unknown): ValidationResult<DocumentAnalysis> {
  const result = DocumentAnalysisSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
}

export function validateStoryInsight(data: unknown): ValidationResult<StoryInsight> {
  const result = StoryInsightSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
}

// ============================================================
// Safe JSON Parser with Retry
// ============================================================

export async function safeParseJSON<T>(
  text: string,
  schema: z.ZodSchema<T>,
  maxRetries = 2
): Promise<ValidationResult<T>> {
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(jsonText);

      const validation = schema.safeParse(parsed);
      if (validation.success) {
        return { success: true, data: validation.data, errors: [] };
      }

      lastError = validation.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Parse failed";
    }

    // If we have retries left, we could ask the model to retry
    // For now, just return the error
  }

  return { success: false, errors: [lastError || "Failed to parse valid JSON"] };
}