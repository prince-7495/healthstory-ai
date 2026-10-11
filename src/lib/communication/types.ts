/* =============================================================
   HealthStory AI — Stage 6 communication data model

   Stage 6 turns a confirmed, evolving HealthStory into a clear
   communication draft the user can review and use in a conversation.

   Two invariants shape every type here:

     1. Only confirmed information is used by default. Unconfirmed
        AI-organized changes are excluded unless the user opts in.
     2. Every generated line traces back to source events, and the
        user's own wording and uncertainty are preserved. A
        communication draft is never a diagnosis.
   ============================================================= */

import type { StoryEvolution, StoryTopic, StoryQuestion } from "../journal/types";
import type { AnalyzedEvent } from "../health/types";

export type CommunicationStyle = "QUICK" | "STANDARD" | "DETAILED";
export type CommunicationTone = "CALM" | "DIRECT" | "SIMPLE" | "STRUCTURED";
export type CommunicationPerson = "FIRST" | "NEUTRAL";
export type CommunicationLanguageId = "en" | "hi" | "gu";

export type DateRangeId = "all" | "7d" | "30d" | "3m" | "6m" | "custom";

export interface DateRange {
  id: DateRangeId;
  from?: string;
  to?: string;
}

/** What the user wants to prepare. */
export type PrepareFocus =
  | "full"
  | "changes"
  | "topic"
  | "questions"
  | "recent"
  | "summary";

/** The section-level share choices. Everything defaults to on except older notes/evidence. */
export interface SectionSelection {
  timeline: boolean;
  changes: boolean;
  context: boolean;
  summary: boolean;
  questions: boolean;
  evidence: boolean;
  olderEntries: boolean;
}

export interface ConversationSelection {
  focus: PrepareFocus;
  topicIds: string[];
  range: DateRange;
  style: CommunicationStyle;
  tone: CommunicationTone;
  person: CommunicationPerson;
  plainLanguage: boolean;
  language: CommunicationLanguageId;
  sections: SectionSelection;
  questionIds: string[];
  /** Include AI-organized but not-yet-confirmed changes. Default false. */
  includeUnconfirmed: boolean;
}

/** One generated line plus its provenance. */
export interface CommunicationLine {
  id: string;
  text: string;
  /** Stage 5 event ids this line is built from. */
  sourceEventIds: string[];
  /** true when the line is machine-organized; false when user-authored. */
  aiOrganized: boolean;
  userEdited: boolean;
  /** true when this line was actually localized (not left in English). */
  localized: boolean;
}

export type QuestionSource = "USER" | "AI_SUGGESTED";
export type QuestionStatus = "OPEN" | "DISCUSSED" | "REMOVED";

export interface CommunicationDraft {
  id: string;
  version: number;
  language: CommunicationLanguageId;
  languageLabel: string;
  style: CommunicationStyle;
  tone: CommunicationTone;
  person: CommunicationPerson;
  plainLanguage: boolean;
  periodLabel: string;
  whatINoticed: CommunicationLine[];
  timeline: CommunicationLine[];
  reportedChanges: CommunicationLine[];
  relevantContext: CommunicationLine[];
  recentUpdate: CommunicationLine | null;
  questions: StoryQuestion[];
  missingInformation: string[];
  oneMinute: CommunicationLine | null;
  sourceEventIds: string[];
  sourceTopicIds: string[];
  userEdited: boolean;
  createdAt: string;
  /** Full draft text (for API responses) */
  text?: string;
  /** Validation result (for API responses) */
  validation?: { safe: boolean; flaggedPhrases: string[]; rewritten?: string };
}

export type SessionStatus = "DRAFT" | "GENERATING" | "REVIEW" | "FINAL";

export interface CommunicationSession {
  id: string;
  createdAt: string;
  selection: ConversationSelection;
  draft?: CommunicationDraft;
  finalDraft?: CommunicationDraft;
  status: SessionStatus;
}

/** Validation result for the output validator. */
export interface CommunicationValidation {
  ok: boolean;
  issues: { line: string; pattern: string; message: string }[];
}

export const COMMUNICATION_STAGES = [
  { id: "context", label: "Reading your confirmed story" },
  { id: "selecting", label: "Applying your sharing choices" },
  { id: "drafting", label: "Writing your communication summary" },
  { id: "questions", label: "Organizing your questions" },
  { id: "checking", label: "Checking the wording is safe" },
  { id: "language", label: "Preparing your communication language" },
] as const;

export type CommunicationStage = (typeof COMMUNICATION_STAGES)[number]["id"];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function createDefaultSections(): SectionSelection {
  return {
    timeline: true,
    changes: true,
    context: true,
    summary: true,
    questions: true,
    evidence: false,
    olderEntries: false,
  };
}

export function createDefaultSelection(): ConversationSelection {
  return {
    focus: "full",
    topicIds: [],
    range: { id: "all" },
    style: "STANDARD",
    tone: "STRUCTURED",
    person: "FIRST",
    plainLanguage: false,
    language: "en",
    sections: createDefaultSections(),
    questionIds: [],
    includeUnconfirmed: false,
  };
}

/** Events/evolutions a selection should draw from. */
export interface ConversationContext {
  events: (AnalyzedEvent & { topics?: string[] })[];
  topics: StoryTopic[];
  questions: StoryQuestion[];
  evolutions: StoryEvolution[];
  eventIds: string[];
  topicIds: string[];
  periodLabel: string;
  conflicts: StoryEvolution[];
  unconfirmedCount: number;
}
