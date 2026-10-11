/* =============================================================
   HealthStory AI — data model
   Stage 2 shape, expanded for Stage 3.

   Two ideas run through every type here:

     1. Provenance. Anything the system derived carries the words it came
        from, so a user can always see how the story was read.
     2. Preserved uncertainty. A date the user hedged stays hedged, a
        frequency they never gave stays absent. Nothing is resolved into a
        value the user did not actually provide.
   ============================================================= */

/** How confident we are about a date. Never collapsed to a fake precision. */
export type DatePrecision =
  | "exact"        // "14 May 2026"
  | "month"        // "May 2026"
  | "approximate"  // "a few months ago" -> "Approximate date: ~May 2026"
  | "relative"     // "this week" -> "This week"
  | "range"        // "between March and May" -> "March – May 2026"
  | "unknown";     // nothing found -> "Date not provided"

/** The categories the extractor is allowed to recognise. */
export type EventCategory =
  | "symptom"
  | "medication"
  | "treatment"
  | "test"
  | "appointment"
  | "lifestyle"
  | "context"
  | "change"
  | "other";

/**
 * Human-in-the-loop state of one extracted event.
 * The AI proposes; the person disposes. Nothing is auto-confirmed.
 */
export type EventStatus = "AI_ORGANIZED" | "CONFIRMED" | "EDITED" | "REMOVED";

/**
 * Confidence that the user *explicitly said* this — never confidence about
 * health. There is deliberately no numeric form of this field anywhere in
 * the codebase so it can never be rendered as a medical probability.
 */
export type ExtractionConfidence = "high" | "medium" | "low";

export type Provenance = "user" | "ai";

/**
 * One verbatim phrase from the user's own input, plus which field it
 * justifies. This is the unit that makes extraction inspectable.
 */
export interface EvidenceQuote {
  id: string;
  /** The user's words, unchanged. Never paraphrased. */
  text: string;
  /** Which part of the event this supports, e.g. "frequency". */
  field: string;
}

export interface StoryDocument {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  /** MIME type as reported by the browser. */
  type: string;
  addedAt: string;
  /**
   * Stage 2 never reads document contents. The UI must therefore say
   * "Document added" — never "AI analyzed document".
   */
  state: "added";
}

export interface VoiceCapture {
  state: "idle" | "recording" | "paused" | "captured";
  transcript: string;
  durationMs: number;
  /**
   * true  -> simulated demo waveform, no microphone was used
   * false -> real SpeechRecognition transcription
   */
  isDemo: boolean;
}

export interface HealthEvent {
  id: string;
  /** ISO `YYYY-MM-DD` when we actually know a day, otherwise null. */
  date: string | null;
  /** Always a human-readable string. Never blank. */
  dateLabel: string;
  datePrecision: DatePrecision;
  /** What happened, in the user's own words. */
  description: string;
  frequency: string | null;
  change: string | null;
  notes: string;
  /** Where this event came from — a typed card or the extractor. */
  origin: Provenance;

  /* ---- Stage 3 ----
     Optional so Stage 2's hand-typed event cards keep compiling and keep
     behaving exactly as they did: a card the user filled in is their own
     words, already trustworthy, with nothing left to extract. */

  /** Short headline the timeline leads with. */
  title?: string;
  category?: EventCategory;
  /** The user's own time phrase, verbatim: "a few months ago". */
  dateText?: string;
  /** Only ever set when the user used a severity word themselves. */
  severity?: string | null;
  /** Situational detail the user tied to the event. Never a cause. */
  context?: string | null;
  /** Verbatim sentence the event was extracted from. */
  sourceText?: string;
  /** Every phrase that supports this event, not just the first. */
  evidence?: EvidenceQuote[];
  /** How many times the user referred to this thing. Drives dedupe. */
  mentions?: number;
  /** Canonical lexicon label, e.g. "Headache". Powers grouping and chips. */
  label?: string;
  /** Pre-formatted date wording, kept beside the data so it cannot drift. */
  timeLabel?: string;
  extractionConfidence?: ExtractionConfidence;
  status?: EventStatus;
  needsConfirmation?: boolean;
  /**
   * Optional non-rendered metadata. Stage 7 uses this to remember where a
   * follow-up item came from (e.g. who the user reported being told by).
   */
  metadata?: Record<string, string>;
}

/**
 * A stage-3 event: one where the Stage 3 fields are guaranteed present.
 * The extractor always produces these; only hand-typed cards stay partial.
 */
export type AnalyzedEvent = HealthEvent &
  Required<
    Pick<
      HealthEvent,
      | "title"
      | "category"
      | "dateText"
      | "sourceText"
      | "evidence"
      | "extractionConfidence"
      | "status"
      | "needsConfirmation"
      | "label"
      | "timeLabel"
    >
  >;

/** A before → after comparison the story actually supports. */
export interface HealthChange {
  id: string;
  /** Which dimension moved: "Frequency", "Sleep", "Context". */
  category: string;
  /** The earlier state, or "Not mentioned" when the user never gave one. */
  before: string;
  /** The later state. */
  after: string;
  /** One sentence, in reporting language. Never causal. */
  description: string;
  /** Verbatim phrase that establishes the change. */
  sourceText: string;
  confidence: ExtractionConfidence;
}

/**
 * Something the story raised but could not settle.
 * Never resolved by the system — surfaced for the user to decide.
 */
export interface UnclearItem {
  id: string;
  /** What is ambiguous, e.g. "Two different start dates were reported." */
  statement: string;
  /** The competing phrases, when the ambiguity is a contradiction. */
  evidence: EvidenceQuote[];
  /** Set when the user has since resolved it. */
  resolved: boolean;
}

export interface HealthStory {
  storyText: string;
  language: string;
  events: HealthEvent[];
  documents: StoryDocument[];
  voiceInput: VoiceCapture | null;
  /** Answers given in the optional "Add more details" panel. */
  details: StoryDetails;
  organizedStory: OrganizedStory | null;
}

/**
 * The optional structured panel.
 *
 * Kept as its own object rather than folded into the free text: these are
 * deliberate, field-by-field answers, and treating them differently from
 * prose is what lets the UI show them as "user reported".
 */
export interface StoryDetails {
  /** One of START_OPTIONS, or null if unanswered. */
  start: string | null;
  /** ISO `YYYY-MM-DD`, used when `start` is "Specific date". */
  customDate: string;
  frequency: string | null;
  change: string | null;
  notes: string;
}

export interface TimelineEntry {
  id: string;
  /** "March 2026", "Approximate date: ~April 2026", "Date not provided". */
  period: string;
  headline: string;
  detail: string;
  /** Drives the USER REPORTED / AI ORGANIZED labels. */
  provenance: Provenance;
  precision: DatePrecision;
}

export interface SymptomItem {
  id: string;
  /** Canonical label, e.g. "Headache". */
  label: string;
  /** The phrase that matched, so the extraction is inspectable. */
  matchedPhrase: string;
  /** How many times the user mentioned it. */
  mentions: number;
  provenance: Provenance;
}

export interface NotableChange {
  id: string;
  text: string;
  direction: "up" | "down" | "new" | "neutral";
  /** The sentence the claim came from. */
  evidence: string;
}

export interface Gap {
  id: string;
  prompt: string;
  /** Optional suggestion for what the user could add. */
  suggest?: string;
}

export interface OrganizedStory {
  timeline: TimelineEntry[];
  symptoms: SymptomItem[];
  /** Both nullable: absence is rendered, never invented. */
  time: { firstNoticed: string | null; recentChange: string | null };
  context: string[];
  other: string[];
  notableChanges: NotableChange[];
  /** Neutral prompts for a conversation with a professional. Never diagnostic. */
  questions: string[];
  gaps: Gap[];
  /** Honest description of what actually ran. */
  analyzer: AnalyzerInfo;

  /* ---- Stage 3 ---- */

  /** One paragraph, assembled only from what the user reported. */
  summary: string;
  /** Full Stage 3 events: evidence, confidence, confirmation state. */
  events: AnalyzedEvent[];
  /** Comparisons across time, each with its own evidence. */
  changes: HealthChange[];
  /** Present-but-ambiguous, including detected contradictions. */
  unclear: UnclearItem[];
  /** Absent information, named rather than guessed. */
  missing: Gap[];
}

export interface AnalyzerInfo {
  id: string;
  label: string;
  /** Short, plain-language explanation shown in the UI. */
  description: string;
  /** false until a real model is connected server-side. */
  isRealModel: boolean;
}

/** Display strings for the human-in-the-loop states. */
export const STATUS_LABELS: Record<EventStatus, string> = {
  AI_ORGANIZED: "AI organized",
  CONFIRMED: "Confirmed by you",
  EDITED: "Edited by you",
  REMOVED: "Removed by you",
};

/** Display strings for the extraction-only confidence scale. */
export const CONFIDENCE_LABELS: Record<ExtractionConfidence, string> = {
  high: "Clearly stated",
  medium: "Partly stated",
  low: "Unclear from your words",
};

/**
 * Every stage the analyzer narrates.
 *
 * The order is the real order work happens in: read the text, find the
 * events, work out the time references, place them, compare them, then
 * write it up. Narration that did not match the work would be theatre.
 */
export type PipelineStage =
  | "reading"
  | "events"
  | "dates"
  | "timeline"
  | "changes"
  | "building";

/** The full pipeline, in order. Also the source for the progress UI. */
export const PIPELINE_STAGES: PipelineStage[] = [
  "reading",
  "events",
  "dates",
  "timeline",
  "changes",
  "building",
];

/* ---------- analyzer contract ---------- */

export interface AnalyzeOptions {
  signal?: AbortSignal;
  /** Called as each pipeline stage begins, so the UI can narrate real work. */
  onStage?: (stage: PipelineStage) => void;
}

/**
 * The single seam between UI and "AI".
 *
 * Stage 2 ships the local rule-based implementation. Stage 3 swaps the body
 * for a server route call — the UI does not change.
 */
export interface StoryAnalyzer {
  info: AnalyzerInfo;
  analyze(story: HealthStory, options?: AnalyzeOptions): Promise<OrganizedStory>;
}

/* ---------- helpers ---------- */

export function createEmptyDetails(): StoryDetails {
  return {
    start: null,
    customDate: "",
    frequency: null,
    change: null,
    notes: "",
  };
}

export function createEmptyStory(): HealthStory {
  return {
    storyText: "",
    language: "English",
    events: [],
    documents: [],
    voiceInput: null,
    details: createEmptyDetails(),
    organizedStory: null,
  };
}

let counter = 0;
/** Stable-enough ids for a client-side prototype. */
export function makeId(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/* ---------- Stage 3 helpers ---------- */

/** Display labels for each category. Never a clinical term. */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  symptom: "Symptom reported",
  medication: "Medication reported",
  treatment: "Treatment reported",
  test: "Test reported",
  appointment: "Appointment reported",
  lifestyle: "Lifestyle factor",
  context: "Context reported",
  change: "Change detected",
  other: "Other information",
};

/**
 * Turns a partial event into a full Stage 3 event.
 *
 * Hand-typed Stage 2 cards arrive without the extraction fields. Rather than
 * sprinkling `if (event.category)` through the UI, every event is normalized
 * once here — and a card the user typed themselves is marked CONFIRMED at the
 * same time, because their own words are not a claim the system needs to make
 * about them.
 */
export function toAnalyzedEvent(event: HealthEvent): AnalyzedEvent {
  const fromUser = event.origin === "user";
  return {
    ...event,
    title: event.title ?? event.description,
    category: event.category ?? (fromUser ? "other" : "symptom"),
    dateText: event.dateText ?? event.dateLabel,
    severity: event.severity ?? null,
    context: event.context ?? null,
    sourceText: event.sourceText ?? event.description,
    evidence: event.evidence?.length
      ? event.evidence
      : [{ id: makeId("ev"), text: event.description, field: "event" }],
    mentions: event.mentions ?? 1,
    label: event.label ?? event.title ?? event.description,
    timeLabel: event.timeLabel ?? event.dateLabel,
    extractionConfidence: event.extractionConfidence ?? (fromUser ? "high" : "medium"),
    status: event.status ?? (fromUser ? "CONFIRMED" : "AI_ORGANIZED"),
    needsConfirmation: event.needsConfirmation ?? !fromUser,
  };
}