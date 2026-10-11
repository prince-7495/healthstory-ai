/* =============================================================
   HealthStory AI — Stage 5 journal data model

   Stage 5 turns a one-time story into a living health journal.

   Two invariants shape every type here:

     1. Nothing is inferred that the user did not report. A "change"
        is a comparison between two things the user wrote, and it
        always carries both phrases.
     2. The user is the authority. Every AI-organized evolution can be
        confirmed, edited or dismissed, and dismissed comparisons stop
        being part of the established story.

   Stage 5 reuses the Stage 3 `AnalyzedEvent` and the Stage 4
   `HealthSummary` rather than inventing parallel event types.
   ============================================================= */

import type {
  AnalyzedEvent,
  EventCategory,
  ExtractionConfidence,
} from "../health/types";
import type { HealthSummary } from "../health/summary";

/* ------------------------------------------------------------------ *
 * Journal entries — the user's own words, one per update
 * ------------------------------------------------------------------ */

export type JournalEntryStatus = "DRAFT" | "PROCESSED" | "CONFIRMED";

export interface StoryJournalEntry {
  id: string;
  createdAt: string;
  /** The user's raw update, verbatim. Never edited by the system. */
  content: string;
  language: string;
  source: "USER";
  /** Events this entry produced. */
  extractedEventIds: string[];
  status: JournalEntryStatus;
  /** Shown when extraction could not run — the raw text is still kept. */
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Topics — a stable identity across time
 * ------------------------------------------------------------------ */

export interface StoryTopic {
  id: string;
  label: string;
  category: EventCategory;
  eventIds: string[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Story evolution — an evidence-backed comparison
 * ------------------------------------------------------------------ */

export type EvolutionChangeType =
  | "increased"
  | "decreased"
  | "more_frequent"
  | "less_frequent"
  | "started"
  | "stopped"
  | "continued"
  | "improved"
  | "worsened"
  | "new_information"
  | "correction"
  | "contradiction"
  | "no_change";

export type EvolutionStatus = "AI_ORGANIZED" | "CONFIRMED" | "DISMISSED";

export interface StoryEvolution {
  id: string;
  previousEventId?: string;
  currentEventId?: string;
  /** "Frequency", "Sleep", "Study", "Medication", … */
  category: string;
  previousValue?: string;
  currentValue?: string;
  /** One sentence in reporting language. Never causal, never diagnostic. */
  description: string;
  changeType: EvolutionChangeType;
  previousSourceText?: string;
  currentSourceText?: string;
  /**
   * Comparison confidence only — never a medical probability. There is
   * deliberately no numeric form of this field anywhere in the model.
   */
  confidence: ExtractionConfidence;
  status: EvolutionStatus;
  /** Set for possible corrections: the earlier statement being corrected. */
  correctionPrompt?: string;
}

/* ------------------------------------------------------------------ *
 * Snapshots — a saved point in time
 * ------------------------------------------------------------------ */

export interface StorySnapshot {
  id: string;
  name: string;
  createdAt: string;
  includedEventIds: string[];
  summaryId?: string;
}

/* ------------------------------------------------------------------ *
 * Preferences — user-controlled memory
 * ------------------------------------------------------------------ */

export interface StoryPreferences {
  /** Save new updates to the journal (single session view when off). */
  saveUpdates: boolean;
  /** Keep previous summary versions. */
  keepSummaries: boolean;
  /** Keep the source phrases behind each evolution. */
  saveEvidence: boolean;
  /** Load the fictional demonstration data. */
  demoMode: boolean;
}

export function createDefaultPreferences(): StoryPreferences {
  return {
    saveUpdates: true,
    keepSummaries: true,
    saveEvidence: true,
    demoMode: false,
  };
}

/* ------------------------------------------------------------------ *
 * Activity — organizational history, never health scoring
 * ------------------------------------------------------------------ */

export type ActivityType =
  | "update_added"
  | "update_removed"
  | "change_confirmed"
  | "change_dismissed"
  | "change_edited"
  | "summary_updated"
  | "snapshot_created"
  | "summary_exported"
  | "story_deleted";

export interface StoryActivity {
  id: string;
  at: string;
  type: ActivityType;
  label: string;
}

/* ------------------------------------------------------------------ *
 * The journal
 * ------------------------------------------------------------------ */

export type QuestionSource = "USER" | "AI_SUGGESTED";
export type QuestionStatus = "OPEN" | "DISCUSSED" | "REMOVED";

/** A question the user wants to discuss. Persisted with the journal. */
export interface StoryQuestion {
  id: string;
  text: string;
  source: QuestionSource;
  status: QuestionStatus;
  createdAt: string;
  /** Set when the user edited an AI suggestion. */
  edited?: boolean;
}

export interface StoryJournal {
  id: string;
  createdAt: string;
  updatedAt: string;
  topics: StoryTopic[];
  entries: StoryJournalEntry[];
  events: AnalyzedEvent[];
  evolutions: StoryEvolution[];
  summaries: HealthSummary[];
  snapshots: StorySnapshot[];
  preferences: StoryPreferences;
  activity: StoryActivity[];
  /** Stage 6 — questions the user wants to discuss. Optional for older journals. */
  questions?: StoryQuestion[];
  /** Stage 7 — what happened after a conversation. Optional for older journals. */
  followUps?: FollowUpEntry[];
  /** Stage 8 — uploaded health documents. Optional for older journals. */
  documents?: HealthDocument[];
  /** Stage 9 — connections the user made themselves. Optional for older journals. */
  userLinks?: UserStoryLink[];
}

/** A connection the user made themselves between two story nodes. */
export interface UserStoryLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  reason: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Stage 7 — Follow-Up model
 * ------------------------------------------------------------------ */

/**
 * Where a piece of information came from. Kept distinct so that
 * something the user was told is never presented as the AI's own claim.
 */
export type InformationSource =
  | "USER_REPORTED"
  | "PROFESSIONAL_CONVERSATION"
  | "UPLOADED_DOCUMENT"
  | "USER_NOTE"
  | "AI_ORGANIZED";

export type FollowUpType =
  | "CONVERSATION"
  | "APPOINTMENT"
  | "REPORT"
  | "PERSONAL_UPDATE"
  | "OTHER";

export type FollowUpItemType = "EVENT" | "INFORMATION" | "CHANGE" | "QUESTION" | "DATE" | "OTHER";

export type FollowUpItemStatus = "AI_ORGANIZED" | "CONFIRMED" | "DISMISSED";

export type FollowUpStatus = "DRAFT" | "PROCESSED" | "REVIEW" | "CONFIRMED";

export interface FollowUpItem {
  id: string;
  type: FollowUpItemType;
  /** Short organized line. */
  text: string;
  /** The user's exact words that support it. */
  sourceText: string;
  sourceType: InformationSource;
  /** Extraction confidence only — never clinical. */
  confidence: "HIGH" | "MEDIUM" | "LOW";
  status: FollowUpItemStatus;
  /** Links back to a Stage 5 evolution, when this item is a change. */
  evolutionId?: string;
  /** Links back to a new event, when this item is an event. */
  eventId?: string;
  /** Suggested existing topic this item may connect to. */
  suggestedTopicId?: string;
  suggestedTopicLabel?: string;
}

export interface FollowUpEntry {
  id: string;
  createdAt: string;
  eventDate?: string;
  eventDatePrecision?: "EXACT" | "APPROXIMATE" | "UNKNOWN";
  type: FollowUpType;
  originalText: string;
  language: string;
  who?: string;
  extractedItems: FollowUpItem[];
  relatedTopicIds: string[];
  relatedEventIds: string[];
  questionIds: string[];
  status: FollowUpStatus;
}

export const FOLLOWUP_TYPE_LABELS: Record<FollowUpType, string> = {
  CONVERSATION: "Conversation",
  APPOINTMENT: "Appointment",
  REPORT: "Test or report",
  PERSONAL_UPDATE: "Personal update",
  OTHER: "Other",
};

export const SOURCE_LABELS: Record<InformationSource, string> = {
  USER_REPORTED: "You recorded",
  PROFESSIONAL_CONVERSATION: "You reported being told",
  UPLOADED_DOCUMENT: "From a document",
  USER_NOTE: "Your note",
  AI_ORGANIZED: "AI organized",
};

export const FOLLOWUP_ITEM_LABELS: Record<FollowUpItemType, string> = {
  EVENT: "Event",
  INFORMATION: "Information",
  CHANGE: "Change",
  QUESTION: "Question",
  DATE: "Date",
  OTHER: "Other",
};

/* ------------------------------------------------------------------ *\
 * Stage 8 — Document Understanding model
 * ------------------------------------------------------------------ */

export type DocumentType =
  | "TEST_REPORT"
  | "APPOINTMENT_NOTE"
  | "INSTRUCTION_SHEET"
  | "MEDICATION_INFO"
  | "GENERAL_HEALTH"
  | "UNKNOWN";

export type DocumentStatus = "UPLOADED" | "ANALYZED" | "NEEDS_REVIEW" | "REMOVED";

export type ExplanationComplexity = "SIMPLE" | "STANDARD" | "DETAILED";

export interface SourceReference {
  id: string;
  documentId: string;
  pageNumber?: number;
  section?: string;
  quotedText?: string;
}

export interface DocumentSection {
  id: string;
  title?: string;
  pageNumber?: number;
  originalText: string;
  summary?: string;
  sourceReferenceId: string;
}

export interface DocumentTerm {
  id: string;
  term: string;
  plainDefinition: string;
  documentContext: string;
  sourceReferenceId: string;
  userSaved: boolean;
}

export interface DocumentMeasurement {
  id: string;
  label: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  date?: string;
  sourceReferenceId: string;
}

export interface DocumentExplanation {
  id: string;
  sourceReferenceId: string;
  explanation: string;
  complexity: ExplanationComplexity;
  language: string;
  userEdited: boolean;
}

export interface DocumentAnalysis {
  documentId: string;
  sections: DocumentSection[];
  terms: DocumentTerm[];
  dates: string[];
  measurements: DocumentMeasurement[];
  explanations: DocumentExplanation[];
  questions: StoryQuestion[];
  sourceReferences: SourceReference[];
  status: "ANALYZED" | "NEEDS_REVIEW" | "ERROR";
}

export interface HealthDocument {
  id: string;
  createdAt: string;
  filename: string;
  fileType: string;
  fileSize: number;
  type: DocumentType;
  status: DocumentStatus;
  originalText: string;
  title?: string;
  pageCount?: number;
  language?: string;
  analysis?: DocumentAnalysis;
  relatedFollowUpId?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  TEST_REPORT: "Test report",
  APPOINTMENT_NOTE: "Appointment note",
  INSTRUCTION_SHEET: "Instruction sheet",
  MEDICATION_INFO: "Medication information",
  GENERAL_HEALTH: "General health document",
  UNKNOWN: "Health document",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: "Uploaded",
  ANALYZED: "Analyzed",
  NEEDS_REVIEW: "Needs review",
  REMOVED: "Removed",
};

/* ------------------------------------------------------------------ *
 * Update processing result
 * ------------------------------------------------------------------ */

export type SummaryUpdateStatus = "NO_UPDATE_NEEDED" | "UPDATE_RECOMMENDED";

export interface UpdateAnalysis {
  entry: StoryJournalEntry;
  /** Brand-new events extracted from this update. */
  events: AnalyzedEvent[];
  /** New topics created by this update. */
  newTopics: StoryTopic[];
  /** Evidence-backed comparisons against the previous story. */
  evolutions: StoryEvolution[];
  /** Possible contradictions the system refuses to resolve. */
  contradictions: StoryEvolution[];
  /** Possible corrections to earlier entries. */
  corrections: StoryEvolution[];
  /** Topics the system is unsure about — never merged automatically. */
  possibleMatches: { label: string; existingTopicId: string; newLabel: string }[];
  summaryStatus: SummaryUpdateStatus;
}

/* ------------------------------------------------------------------ *
 * Display labels
 * ------------------------------------------------------------------ */

export const EVOLUTION_TYPE_LABELS: Record<EvolutionChangeType, string> = {
  increased: "Increased",
  decreased: "Decreased",
  more_frequent: "Became more frequent",
  less_frequent: "Became less frequent",
  started: "Started",
  stopped: "Stopped",
  continued: "Continued",
  improved: "Reported as better",
  worsened: "Reported as worse",
  new_information: "New information",
  correction: "Possible correction",
  contradiction: "Information may need clarification",
  no_change: "No clear change",
};

export const EVOLUTION_STATUS_LABELS: Record<EvolutionStatus, string> = {
  AI_ORGANIZED: "AI organized",
  CONFIRMED: "Confirmed by you",
  DISMISSED: "Dismissed",
};

/** Categories a user can filter by. Only existing ones are shown. */
export const FILTER_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "symptom", label: "Symptoms reported" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "medication", label: "Medication" },
  { id: "treatment", label: "Treatment" },
  { id: "test", label: "Tests" },
  { id: "appointment", label: "Appointments" },
  { id: "context", label: "Context" },
  { id: "change", label: "Changes" },
];

export type TimeRangeId = "all" | "7d" | "30d" | "3m" | "6m" | "custom";
