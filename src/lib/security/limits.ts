/**
 * Stage 11 — resource limits.
 *
 * Every cap the API enforces lives here so they can be reviewed (and
 * audited) in one place. Each value can be overridden through an
 * environment variable; defaults are conservative on purpose.
 *
 * Limits exist to protect availability and database integrity — they
 * are never presented as anything the user can "earn" or exceed.
 */

const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const LIMITS = {
  /** Max bytes for a JSON API request body. */
  maxRequestBytes: int(process.env.LIMIT_REQUEST_BYTES, 1024 * 1024),
  /** Max bytes for a document upload request body (base64 overhead included). */
  maxUploadBytes: int(process.env.LIMIT_UPLOAD_BYTES, 6 * 1024 * 1024),
  /** Max decoded file size stored per document. */
  maxFileBytes: int(process.env.LIMIT_FILE_BYTES, 4 * 1024 * 1024),
  /** Max length of a single free-text field (story text, AI input). */
  maxTextLength: int(process.env.LIMIT_TEXT_LENGTH, 50_000),
  /** Max events stored per story. */
  maxEventsPerStory: int(process.env.LIMIT_EVENTS_PER_STORY, 500),
  /** Max events accepted in one request. */
  maxEventsPerRequest: int(process.env.LIMIT_EVENTS_PER_REQUEST, 200),
  /** Max questions per story. */
  maxQuestionsPerStory: int(process.env.LIMIT_QUESTIONS_PER_STORY, 100),
  /** Max follow-ups per story. */
  maxFollowUpsPerStory: int(process.env.LIMIT_FOLLOW_UPS_PER_STORY, 200),
  /** Max documents per story. */
  maxDocumentsPerStory: int(process.env.LIMIT_DOCUMENTS_PER_STORY, 50),
  /** Max topics per story. */
  maxTopicsPerStory: int(process.env.LIMIT_TOPICS_PER_STORY, 100),
  /** Max entries in a communication selection list. */
  maxSelectionIds: int(process.env.LIMIT_SELECTION_IDS, 500),
} as const;

export type Limits = typeof LIMITS;
