/**
 * Stage 11 — request schemas.
 *
 * Every request body the API accepts is declared here with a STRICT
 * zod schema. Unknown keys are rejected outright — that is the
 * mass-assignment defence: a payload can never smuggle a
 * server-controlled field (`id`, `userId`, `status`, `storageKey`,
 * `confirmedByUser`, …) past validation into a Prisma call.
 *
 * All strings are length-bounded using the shared resource limits.
 */

import { z } from "zod";
import { LIMITS } from "@/lib/security/limits";

// ============================================================
// Shared primitives
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,10})*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EmailField = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .regex(EMAIL_RE, "Enter a valid email address");
const PasswordField = z.string().min(8, "Use at least 8 characters").max(128);
const LanguageField = z.string().regex(LANGUAGE_RE, "Invalid language code").max(12);
const IsoDateField = z.string().regex(ISO_DATE_RE, "Use the format YYYY-MM-DD");

/** At least one key must be present (PATCH bodies). */
const atLeastOneField = (value: Record<string, unknown>): boolean =>
  Object.keys(value).length > 0;

// Prisma enums, mirrored (kept in sync with prisma/schema.prisma).
const EventCategoryEnum = z.enum([
  "SYMPTOM", "MEDICATION", "TREATMENT", "TEST", "APPOINTMENT",
  "LIFESTYLE", "CONTEXT", "CHANGE", "OTHER",
]);
const DatePrecisionEnum = z.enum(["EXACT", "MONTH", "APPROXIMATE", "RELATIVE", "RANGE", "UNKNOWN"]);
const ExtractionConfidenceEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);
const QuestionSourceEnum = z.enum(["USER", "AI_SUGGESTED"]);
const QuestionStatusEnum = z.enum(["OPEN", "ANSWERED", "DISCUSSED", "REMOVED"]);
const FollowUpTypeEnum = z.enum(["CONVERSATION", "APPOINTMENT", "TEST_OR_REPORT", "NEW_UPDATE", "OTHER"]);

// ============================================================
// Auth
// ============================================================

export const RegisterSchema = z
  .object({
    email: EmailField,
    password: PasswordField,
    displayName: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const LoginSchema = z
  .object({
    email: EmailField,
    password: z.string().min(1, "Password is required").max(128),
  })
  .strict();

// ============================================================
// Stories
// ============================================================

export const CreateStorySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    language: LanguageField.optional(),
  })
  .strict();

export const UpdateStorySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    language: LanguageField.optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: "Provide at least one field to update" });

// ============================================================
// Events
// ============================================================

const EvidenceQuoteSchema = z
  .object({
    id: z.string().max(64).optional(),
    text: z.string().min(1).max(1000),
    field: z.string().max(64),
  })
  .strict();

export const StoryEventInputSchema = z
  .object({
    /** Origin decides server-controlled provenance fields — never trusted verbatim. */
    origin: z.enum(["AI", "USER"]).optional(),
    title: z.string().trim().max(200).optional(),
    category: EventCategoryEnum.nullable().optional(),
    date: IsoDateField.nullable().optional(),
    datePrecision: DatePrecisionEnum.optional(),
    dateText: z.string().trim().max(120).optional(),
    description: z.string().trim().min(1).max(2000),
    frequency: z.string().trim().max(120).nullable().optional(),
    severity: z.string().trim().max(120).nullable().optional(),
    context: z.string().trim().max(2000).nullable().optional(),
    changeDescription: z.string().trim().max(2000).nullable().optional(),
    originalText: z.string().max(LIMITS.maxTextLength).optional(),
    sourceText: z.string().max(LIMITS.maxTextLength).optional(),
    label: z.string().trim().max(80).optional(),
    timeLabel: z.string().trim().max(80).optional(),
    extractionConfidence: ExtractionConfidenceEnum.optional(),
    mentions: z.number().int().min(1).max(999).optional(),
    evidence: z.array(EvidenceQuoteSchema).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const CreateEventsSchema = z
  .object({
    events: z.union([
      z.array(StoryEventInputSchema).min(1).max(LIMITS.maxEventsPerRequest),
      StoryEventInputSchema,
    ]),
  })
  .strict();

/**
 * Event edits. Provenance and confirmation state are deliberately
 * absent: `status` / `needsConfirmation` only change through the
 * dedicated confirm action, `createdBy` never changes.
 */
export const UpdateEventSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    category: EventCategoryEnum.nullable().optional(),
    date: IsoDateField.nullable().optional(),
    datePrecision: DatePrecisionEnum.optional(),
    dateText: z.string().trim().max(120).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    frequency: z.string().trim().max(120).nullable().optional(),
    severity: z.string().trim().max(120).nullable().optional(),
    context: z.string().trim().max(2000).nullable().optional(),
    changeDescription: z.string().trim().max(2000).nullable().optional(),
    label: z.string().trim().max(80).optional(),
    timeLabel: z.string().trim().max(80).optional(),
    extractionConfidence: ExtractionConfidenceEnum.optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: "Provide at least one field to update" });

// ============================================================
// Questions
// ============================================================

export const CreateQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
    source: QuestionSourceEnum.optional(),
  })
  .strict();

export const UpdateQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(500).optional(),
    status: QuestionStatusEnum.optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: "Provide at least one field to update" });

// ============================================================
// Follow-ups
// ============================================================

export const FollowUpItemInputSchema = z
  .object({
    type: z.string().trim().min(1).max(40),
    text: z.string().trim().min(1).max(2000),
    sourceText: z.string().trim().min(1).max(2000),
    sourceType: z.enum(["USER_ENTRY", "DOCUMENT", "FOLLOW_UP", "COMMUNICATION", "MANUAL_ENTRY"]),
    confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  })
  .strict();

export const CreateFollowUpSchema = z
  .object({
    type: FollowUpTypeEnum,
    originalText: z.string().min(1).max(LIMITS.maxTextLength),
    eventDate: IsoDateField.nullable().optional(),
    eventDatePrecision: DatePrecisionEnum.optional(),
    language: LanguageField.optional(),
    /** Raw structured extraction result (bounded by the request size cap). */
    extractedItems: z.unknown().optional(),
    /** Validated, row-per-item breakdown stored in `follow_up_items`. */
    items: z.array(FollowUpItemInputSchema).max(100).optional(),
  })
  .strict();

// ============================================================
// Communication
// ============================================================

export const CreateCommunicationSchema = z
  .object({
    sourceLanguage: LanguageField.optional(),
    targetLanguage: LanguageField.nullable().optional(),
    style: z.string().trim().max(40).nullable().optional(),
    tone: z.string().trim().max(40).nullable().optional(),
    pointOfView: z.string().trim().max(40).nullable().optional(),
    simplifyLanguage: z.boolean().optional(),
    selectedEventIds: z.array(z.string().min(1).max(64)).max(LIMITS.maxSelectionIds).optional(),
    selectedTopicIds: z.array(z.string().min(1).max(64)).max(LIMITS.maxSelectionIds).optional(),
    selectedQuestionIds: z.array(z.string().min(1).max(64)).max(LIMITS.maxSelectionIds).optional(),
    sourceVersion: z.number().int().min(1).max(1_000_000).optional(),
  })
  .strict();

export const GenerateCommunicationSchema = z
  .object({
    communicationId: z.string().min(1).max(64),
  })
  .strict();

// ============================================================
// AI operations
// ============================================================

export const OrganizeSchema = z
  .object({
    text: z.string().min(1).max(LIMITS.maxTextLength),
  })
  .strict();

export const PreviewSchema = z
  .object({
    text: z.string().max(LIMITS.maxTextLength).optional(),
  })
  .strict();

// ============================================================
// Documents
// ============================================================

export const UploadDocumentSchema = z
  .object({
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(3).max(127),
    /** Base64-encoded file bytes. Mutually exclusive with `text`. */
    content: z
      .string()
      .max(Math.ceil(LIMITS.maxUploadBytes / 3) * 4 + 8, "File is too large")
      .optional(),
    /** UTF-8 text for plain-text documents. */
    text: z.string().max(LIMITS.maxTextLength).optional(),
  })
  .strict()
  .refine((value) => (value.content !== undefined) !== (value.text !== undefined), {
    message: "Provide exactly one of file content (base64) or text",
  });

export const UpdateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["ANALYZED", "NEEDS_REVIEW", "ARCHIVED"]).optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: "Provide at least one field to update" });
