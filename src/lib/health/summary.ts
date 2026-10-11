/* =============================================================
   HealthStory AI — Stage 4 summary layer

   Turns a *confirmed* Stage 3 health story into a structured,
   user-controlled communication summary.

   The rules that shape this file (from the Stage 4 brief):

     1. Use only information the user provided.
     2. Never add facts, dates, causes or diagnoses.
     3. Preserve uncertainty — approximate stays approximate.
     4. Distinguish "none reported" from "not mentioned".
     5. Keep source links back to the Stage 3 events.
     6. The summary is a document the user can edit and share —
        never an automatic transmission and never a diagnosis.

   Everything here is deterministic. There is no external model and
   the returned object says so honestly through `engine`.
   ============================================================= */

import {
  makeId,
  type AnalyzedEvent,
  type EventCategory,
  type OrganizedStory,
} from "./types";
import { shortLabel } from "./dates";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type SummaryLength = "brief" | "standard" | "detailed";

/**
 * Where the summary is in the human review flow. "REQUIRED" is the
 * default: the user must look before they share.
 */
export type SummaryReviewStatus = "DRAFT" | "REQUIRED" | "REVIEWED";

export type QuestionOrigin = "AI_SUGGESTED" | "USER_ADDED";

/** The sections a user can remove or choose to share independently. */
export type SummarySectionKey =
  | "mainConcern"
  | "timeline"
  | "changes"
  | "other"
  | "questions"
  | "missing";

/**
 * The technical answer to the brief's "missing vs negative" rule.
 *
 *   REPORTED       the user mentioned this category
 *   NONE_REPORTED  the user explicitly said there was none
 *                  ("I did not take any medication.")
 *   NOT_MENTIONED  the user said nothing about it
 *
 * These are deliberately not the same type, so they can never be
 * silently collapsed into one another.
 */
export type CategoryPolarity = "REPORTED" | "NONE_REPORTED" | "NOT_MENTIONED";

export interface SummaryQuestion {
  id: string;
  text: string;
  origin: QuestionOrigin;
  edited: boolean;
}

export interface SummaryTimelineItem {
  eventId: string;
  dateText: string;
  description: string;
  sourceEventIds: string[];
}

export interface SummaryChange {
  id: string;
  category: string;
  before: string;
  after: string;
  description: string;
  sourceEventIds: string[];
}

export interface SummaryInformation {
  id: string;
  category: EventCategory;
  /** Short label, e.g. "Blood test" or "Medication". */
  label: string;
  /** What the user reported, in reporting language. */
  detail: string;
  /** Pre-formatted time wording, or null when the user gave none. */
  timeText: string | null;
  sourceEventIds: string[];
}

/** Honest description of what actually produced the summary. */
export interface SummaryEngine {
  id: string;
  label: string;
  description: string;
  /** false until a real model is connected. Never pretend otherwise. */
  isRealModel: boolean;
}

export interface HealthSummary {
  id: string;
  title: string;
  generatedAt: string;
  mainConcern: string;
  timeline: SummaryTimelineItem[];
  reportedChanges: SummaryChange[];
  otherInformation: SummaryInformation[];
  questions: SummaryQuestion[];
  missingInformation: string[];
  /** Every Stage 3 event any part of this summary is built from. */
  sourceEventIds: string[];
  reviewStatus: SummaryReviewStatus;
  /** Lightweight version tracking — 1 is the first generated draft. */
  version: number;
  engine: SummaryEngine;
  categoryPolarity: Partial<Record<EventCategory, CategoryPolarity>>;
  /* ---- editing state (Stage 4 user control) ---- */
  /** Sections the user chose to hide. */
  removedSections: SummarySectionKey[];
  /** Free notes the user added to the document. */
  notes: string[];
  /** true once the user has changed anything. */
  editedByUser: boolean;
  /** Chosen document length. Affects rendering, never the facts. */
  length: SummaryLength;
  /** true when built from the fictional demo story. */
  isDemo: boolean;
}

export interface BuildSummaryInput {
  story: OrganizedStory;
  /** The user's original words, used only to detect explicit negatives. */
  storyText?: string;
  /** Stage 3 events after the user reviewed them, with status. */
  events: AnalyzedEvent[];
  isDemo: boolean;
  length?: SummaryLength;
  now?: Date;
}

/* ------------------------------------------------------------------ *
 * Small text helpers (kept local so this file has no UI dependencies)
 * ------------------------------------------------------------------ */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function listWords(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Events the user kept. Removed items never reach the summary. */
function activeEvents(events: AnalyzedEvent[]): AnalyzedEvent[] {
  return events.filter((e) => e.status !== "REMOVED");
}

function byDate(a: AnalyzedEvent, b: AnalyzedEvent): number {
  if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  if (a.date) return -1;
  if (b.date) return 1;
  return 0;
}

/* ------------------------------------------------------------------ *
 * Main concern
 * ------------------------------------------------------------------ */

/**
 * One short paragraph describing why the user wants to talk.
 *
 * Built by naming reported items and their reported time. If the user
 * never gave a time, the sentence simply omits it rather than inventing
 * one. The wording stays in reporting language ("reported"), never in
 * diagnosis language.
 */
function buildMainConcern(
  events: AnalyzedEvent[],
  changes: HealthChangeLike[],
): string {
  const symptoms = events.filter((e) => e.category === "symptom");
  const clauses: string[] = [];

  if (symptoms.length > 0) {
    const names = unique(symptoms.map((e) => e.label.toLowerCase()));
    clauses.push(`${listWords(names)} reported`);
  } else if (events.length > 0) {
    const first = events[0];
    clauses.push(`${(first.label || first.title).toLowerCase()} reported`);
  }

  const dated = [...events].filter((e) => e.datePrecision !== "unknown").sort(byDate);
  if (dated.length > 0) {
    const raw = shortLabel(dated[0].timeLabel);
    const isMonth = /^[A-Z][a-z]+ \d{4}$/.test(raw);
    clauses.push(
      isMonth ? `first noted in ${raw}` : `first noted ${raw.charAt(0).toLowerCase()}${raw.slice(1)}`,
    );
  }

  let sentence = clauses.join(", ");
  if (sentence) sentence = `${capitalize(sentence)}.`;

  const freq = changes.find((c) => c.category === "Frequency");
  if (freq) {
    sentence += ` Frequency was reported as changing from ${freq.before.toLowerCase()} to ${freq.after.toLowerCase()}.`;
  }

  if (!sentence) {
    return "The user has recorded health information and is preparing a summary for a healthcare conversation.";
  }
  return sentence;
}

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

function buildTimeline(
  events: AnalyzedEvent[],
  length: SummaryLength,
): SummaryTimelineItem[] {
  const ordered = [...events].sort(byDate);

  // Repeated mentions of the same thing are one entry in a summary, even
  // though Stage 3 keeps them as separate reviewable events.
  const seen = new Set<string>();
  const deduped = ordered.filter((e) => {
    const key = `${e.timeLabel}::${normalize(e.title || e.description)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Length controls how much of the timeline is shown — never what it says.
  let visible = deduped;
  if (length === "brief") {
    if (deduped.length > 3) {
      visible = [deduped[0], deduped[Math.floor(deduped.length / 2)], deduped[deduped.length - 1]];
    }
  } else if (length === "standard" && deduped.length > 10) {
    visible = [...deduped.slice(0, 9), deduped[deduped.length - 1]];
  }

  return visible.map((e) => ({
    eventId: e.id,
    dateText: e.timeLabel,
    description: e.title || e.description,
    sourceEventIds: [e.id],
  }));
}

/* ------------------------------------------------------------------ *
 * Reported changes
 * ------------------------------------------------------------------ */

interface HealthChangeLike {
  id: string;
  category: string;
  before: string;
  after: string;
  description: string;
  sourceText: string;
}

/** Links a change back to the events whose words establish it. */
function sourceIdsForChange(
  change: HealthChangeLike,
  events: AnalyzedEvent[],
): string[] {
  const target = normalize(change.sourceText);
  if (!target) return [];
  return events
    .filter((e) => normalize(e.sourceText).includes(target) || target.includes(normalize(e.sourceText)))
    .map((e) => e.id);
}

function buildChanges(
  changes: HealthChangeLike[],
  events: AnalyzedEvent[],
): SummaryChange[] {
  return changes.map((c) => ({
    id: c.id,
    category: c.category,
    before: c.before,
    after: c.after,
    description: c.description.replace(/\breported reported\b/gi, "reported"),
    sourceEventIds: sourceIdsForChange(c, events),
  }));
}

/* ------------------------------------------------------------------ *
 * Other information + the missing/negative distinction
 * ------------------------------------------------------------------ */

const NEGATIVE_PATTERNS: { category: EventCategory; label: string; re: RegExp }[] = [
  {
    category: "medication",
    label: "Medication",
    re: /\b(?:i(?:'m| am)?\s+not\s+(?:taking|on|using)|i\s+(?:don'?t|didn'?t|haven'?t)\s+(?:take|taken|use[d]?)|no|not on|none|never\s+(?:take|taken|used))\b[^.!?]{0,40}\b(?:medication|medications|meds|medicine|medicines|pills?|tablets?)\b/i,
  },
  {
    category: "treatment",
    label: "Treatment",
    re: /\b(?:no|not\s+(?:having|receiving|undergoing)|haven'?t\s+(?:had|received)|didn'?t\s+(?:have|receive))\b[^.!?]{0,40}\b(?:treatment|therapy|physiotherapy|surgery)\b/i,
  },
  {
    category: "test",
    label: "Tests",
    re: /\b(?:no|not\s+had|haven'?t\s+had|didn'?t\s+have)\b[^.!?]{0,40}\b(?:tests?|blood\s+tests?|scans?|x-?rays?|mri|ct)\b/i,
  },
  {
    category: "appointment",
    label: "Appointments",
    re: /\b(?:no|not\s+been\s+to|haven'?t\s+seen|didn'?t\s+see)\b[^.!?]{0,40}\b(?:doctor|appointment|clinic|hospital|gp)\b/i,
  },
];

function detectPolarity(
  storyText: string,
  events: AnalyzedEvent[],
): Partial<Record<EventCategory, CategoryPolarity>> {
  const categories: EventCategory[] = [
    "medication",
    "treatment",
    "test",
    "appointment",
    "lifestyle",
  ];
  const polarity: Partial<Record<EventCategory, CategoryPolarity>> = {};

  for (const category of categories) {
    const reported = events.some((e) => e.category === category);
    if (reported) {
      polarity[category] = "REPORTED";
      continue;
    }
    const negative = NEGATIVE_PATTERNS.find(
      (n) => n.category === category && n.re.test(storyText),
    );
    polarity[category] = negative ? "NONE_REPORTED" : "NOT_MENTIONED";
  }

  return polarity;
}

function buildOtherInformation(
  events: AnalyzedEvent[],
  polarity: Partial<Record<EventCategory, CategoryPolarity>>,
): SummaryInformation[] {
  const items: SummaryInformation[] = [];
  const seen = new Set<string>();
  const categories: EventCategory[] = [
    "medication",
    "treatment",
    "test",
    "appointment",
    "lifestyle",
    "context",
    "other",
  ];

  for (const category of categories) {
    const matching = events.filter((e) => e.category === category);
    for (const e of matching) {
      const label = e.label || e.title;
      // The "First noticed" marker is already shown in the timeline and the
      // main concern; it is not additional information.
      if (normalize(label) === "first noticed") continue;
      const timeText = e.datePrecision === "unknown" ? null : e.timeLabel;
      // The same reported item mentioned twice is one line in a summary,
      // even when the extractor filed the two mentions under categories.
      const key = `${normalize(label)}::${normalize(timeText ?? "")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: makeId("info"),
        category,
        label,
        detail: e.description,
        timeText,
        sourceEventIds: [e.id],
      });
    }
  }

  // "None reported" is information the user gave, so it belongs here —
  // distinct from "not mentioned", which belongs nowhere but the gaps.
  for (const negative of NEGATIVE_PATTERNS) {
    if (polarity[negative.category] === "NONE_REPORTED") {
      items.push({
        id: makeId("info"),
        category: negative.category,
        label: negative.label,
        detail: "None reported.",
        timeText: null,
        sourceEventIds: [],
      });
    }
  }

  return items;
}

/* ------------------------------------------------------------------ *
 * Questions
 * ------------------------------------------------------------------ */

/**
 * Neutral prompts for a conversation. Never "should I take…", never a
 * diagnosis to ask for. Questions exist to help the user communicate,
 * not to steer a clinical decision.
 */
function buildQuestions(
  story: OrganizedStory,
  events: AnalyzedEvent[],
): SummaryQuestion[] {
  const texts = [...(story.questions ?? [])];

  if (events.length > 0 && !events.some((e) => e.datePrecision !== "unknown")) {
    texts.push("When did this begin, as closely as I can remember?");
  }
  const symptoms = events.filter((e) => e.category === "symptom");
  if (symptoms.length > 0 && !symptoms.some((e) => e.frequency)) {
    texts.push("How often does this happen, and has that changed over time?");
  }
  if (symptoms.length > 0 && !symptoms.some((e) => e.severity)) {
    texts.push("How would I describe the impact of this in my own words?");
  }

  const deduped = unique(texts.map((t) => t.trim()).filter(Boolean));
  return deduped.map((text) => ({
    id: makeId("q"),
    text,
    origin: "AI_SUGGESTED" as QuestionOrigin,
    edited: false,
  }));
}

/* ------------------------------------------------------------------ *
 * The generator
 * ------------------------------------------------------------------ */

export const SUMMARY_ENGINE: SummaryEngine = {
  id: "local-summary-v1",
  label: "Organized from your reviewed story",
  description:
    "This summary is assembled deterministically from the events you reviewed. It reorganizes your own words and adds no new information. No external AI model is connected.",
  isRealModel: false,
};

export function buildHealthSummary(input: BuildSummaryInput): HealthSummary {
  const { story, events, isDemo } = input;
  const length = input.length ?? "standard";
  const now = input.now ?? new Date();
  const active = activeEvents(events);

  const changes = (story.changes ?? []) as HealthChangeLike[];
  const polarity = detectPolarity(input.storyText ?? "", active);

  const summary: HealthSummary = {
    id: makeId("summary"),
    title: "Health Conversation Summary",
    generatedAt: now.toISOString(),
    mainConcern: buildMainConcern(active, changes),
    timeline: buildTimeline(active, length),
    reportedChanges: buildChanges(changes, active),
    otherInformation: buildOtherInformation(active, polarity),
    questions: buildQuestions(story, active),
    missingInformation: (story.missing ?? story.gaps ?? []).map((g) => g.prompt),
    sourceEventIds: unique(active.map((e) => e.id)),
    reviewStatus: "REQUIRED",
    version: 1,
    engine: SUMMARY_ENGINE,
    categoryPolarity: polarity,
    removedSections: [],
    notes: [],
    editedByUser: false,
    length,
    isDemo,
  };

  return summary;
}

/* ------------------------------------------------------------------ *
 * Staged generation (the "wow" assembly animation)
 * ------------------------------------------------------------------ */

export const SUMMARY_STAGES = [
  { id: "timeline", label: "Reading your confirmed timeline" },
  { id: "changes", label: "Gathering what changed" },
  { id: "confirmed", label: "Using the information you reviewed" },
  { id: "questions", label: "Preparing questions to discuss" },
  { id: "building", label: "Writing your health summary" },
] as const;

export type SummaryStage = (typeof SUMMARY_STAGES)[number]["id"];

export interface GenerateSummaryOptions {
  signal?: AbortSignal;
  onStage?: (stage: SummaryStage) => void;
  /** Skip the narrated pauses (used by regeneration). */
  instant?: boolean;
}

/**
 * The async seam the UI calls. Mirrors `analyzeHealthStory` so a real
 * server-side model can replace the body without the UI changing.
 */
export async function generateHealthSummary(
  input: BuildSummaryInput,
  options: GenerateSummaryOptions = {},
): Promise<HealthSummary> {
  if (!options.instant) {
    for (const stage of SUMMARY_STAGES) {
      options.onStage?.(stage.id);
      if (options.signal?.aborted) {
        throw new DOMException("Summary generation cancelled", "AbortError");
      }
      await new Promise((r) => setTimeout(r, 220));
    }
  }
  return buildHealthSummary(input);
}

/* ------------------------------------------------------------------ *
 * Editing helpers (immutable — the UI never mutates in place)
 * ------------------------------------------------------------------ */

export function markEdited(summary: HealthSummary): HealthSummary {
  return {
    ...summary,
    editedByUser: true,
    version: summary.version + 1,
  };
}

export function setMainConcern(summary: HealthSummary, value: string): HealthSummary {
  return markEdited({ ...summary, mainConcern: value });
}

export function setSummaryLength(
  summary: HealthSummary,
  length: SummaryLength,
): HealthSummary {
  // Length is a display choice, but it is still a user edit to the draft.
  return markEdited({ ...summary, length });
}

export function toggleSection(
  summary: HealthSummary,
  key: SummarySectionKey,
): HealthSummary {
  const removed = summary.removedSections.includes(key);
  return markEdited({
    ...summary,
    removedSections: removed
      ? summary.removedSections.filter((k) => k !== key)
      : [...summary.removedSections, key],
  });
}

export function addNote(summary: HealthSummary, note: string): HealthSummary {
  const trimmed = note.trim();
  if (!trimmed) return summary;
  return markEdited({ ...summary, notes: [...summary.notes, trimmed] });
}

export function removeNote(summary: HealthSummary, index: number): HealthSummary {
  return markEdited({
    ...summary,
    notes: summary.notes.filter((_, i) => i !== index),
  });
}

export function addQuestion(
  summary: HealthSummary,
  text: string,
): HealthSummary {
  const trimmed = text.trim();
  if (!trimmed) return summary;
  const question: SummaryQuestion = {
    id: makeId("q"),
    text: trimmed,
    origin: "USER_ADDED",
    edited: false,
  };
  return markEdited({ ...summary, questions: [...summary.questions, question] });
}

export function updateQuestion(
  summary: HealthSummary,
  id: string,
  text: string,
): HealthSummary {
  return markEdited({
    ...summary,
    questions: summary.questions.map((q) =>
      q.id === id ? { ...q, text, edited: true } : q,
    ),
  });
}

export function removeQuestion(summary: HealthSummary, id: string): HealthSummary {
  return markEdited({
    ...summary,
    questions: summary.questions.filter((q) => q.id !== id),
  });
}

/* ------------------------------------------------------------------ *
 * "Make clearer" — a deterministic rewrite that adds no facts
 * ------------------------------------------------------------------ */

const CLEARER_PHRASES: [RegExp, string][] = [
  [/\bi(?:'ve| have) been (?:getting|having)\b/gi, "the user reports"],
  [/\bi(?:'ve| have) been (?:feeling|noticing)\b/gi, "the user reports"],
  [/\bi (?:get|have|feel|notice)\b/gi, "the user reports"],
  [/\bhappen(?:s)? lots more\b/gi, "have become more frequent"],
  [/\blots more\b/gi, "more frequently"],
  [/\bmore often\b/gi, "more frequently"],
  [/\bwhen i study(?:ing)?\b/gi, "during study sessions"],
  [/\bsleep less\b/gi, "reduced sleep"],
  [/\bsleeping less\b/gi, "a period of reduced sleep"],
  [/\bmy\b/gi, "the user's"],
  [/\bi\b/gi, "the user"],
];

/**
 * Rewrites a passage into clearer reporting language.
 *
 * This is shown to the user as a *suggestion* they can accept or
 * discard. It never adds facts — it only rephrases what is already
 * there and frames it as reported by the user. It is idempotent: text
 * that already uses reporting language is returned essentially unchanged
 * so repeated use can never distort the meaning.
 */
export function makeClearer(text: string): string {
  let out = text.trim().replace(/\s+/g, " ");
  if (!out) return out;

  for (const [pattern, replacement] of CLEARER_PHRASES) {
    out = out.replace(pattern, replacement);
  }

  out = out.replace(/\s{2,}/g, " ").trim();

  const alreadyFramed = /\b(reports?|reported|the user)\b/i.test(out);
  if (!alreadyFramed) {
    out = `The user reports that ${out.charAt(0).toLowerCase()}${out.slice(1)}`;
  }
  return capitalize(out.replace(/[.\s]*$/, "")) + ".";
}

/* ------------------------------------------------------------------ *
 * Plain-text export (copy / download / print)
 * ------------------------------------------------------------------ */

export interface ExportOptions {
  /** Which sections to include. Defaults to all not-removed sections. */
  sections?: SummarySectionKey[];
  /** Include the original phrases as a source block. Defaults to false. */
  includeEvidence?: boolean;
  /** Stage 3 events, used to resolve evidence when requested. */
  events?: AnalyzedEvent[];
  /** Header note, e.g. "Fictional demonstration data". */
  demoLabel?: string;
}

export const SECTION_ORDER: SummarySectionKey[] = [
  "mainConcern",
  "timeline",
  "changes",
  "other",
  "questions",
  "missing",
];

export function summaryToPlainText(
  summary: HealthSummary,
  options: ExportOptions = {},
): string {
  const sections = options.sections ?? SECTION_ORDER.filter(
    (k) => !summary.removedSections.includes(k),
  );
  const include = (k: SummarySectionKey) => sections.includes(k);
  const lines: string[] = [];

  lines.push("HealthStory AI");
  lines.push("Health Conversation Summary");
  lines.push(`Generated: ${formatGeneratedAt(summary.generatedAt)}`);
  if (options.demoLabel) lines.push(`(${options.demoLabel})`);
  lines.push("");

  if (include("mainConcern")) {
    lines.push("MAIN CONCERN");
    lines.push(summary.mainConcern);
    lines.push("");
  }

  if (include("timeline") && summary.timeline.length > 0) {
    lines.push("TIMELINE");
    for (const item of summary.timeline) {
      lines.push(`- ${item.dateText}: ${item.description}`);
    }
    lines.push("");
  }

  if (include("changes") && summary.reportedChanges.length > 0) {
    lines.push("CHANGES REPORTED");
    for (const change of summary.reportedChanges) {
      lines.push(`- ${change.category}: ${change.before} → ${change.after}`);
    }
    lines.push("");
  }

  if (include("other") && summary.otherInformation.length > 0) {
    lines.push("OTHER INFORMATION MENTIONED");
    for (const item of summary.otherInformation) {
      const time = item.timeText ? ` (${item.timeText})` : "";
      lines.push(`- ${item.label}${time}: ${item.detail}`);
    }
    lines.push("");
  }

  if (include("questions") && summary.questions.length > 0) {
    lines.push("QUESTIONS TO DISCUSS");
    for (const q of summary.questions) {
      lines.push(`- ${q.text}${q.origin === "USER_ADDED" ? "  [added by you]" : ""}`);
    }
    lines.push("");
  }

  if (include("missing") && summary.missingInformation.length > 0) {
    lines.push("INFORMATION NOT PROVIDED");
    for (const m of summary.missingInformation) lines.push(`- ${m}`);
    lines.push("");
  }

  if (summary.notes.length > 0) {
    lines.push("NOTES ADDED BY YOU");
    for (const note of summary.notes) lines.push(`- ${note}`);
    lines.push("");
  }

  if (options.includeEvidence && options.events) {
    const sources = resolveSources(summary, options.events);
    if (sources.length > 0) {
      lines.push("SOURCE INFORMATION");
      for (const s of sources) {
        lines.push(`- "${s.text}"`);
      }
      lines.push("");
    }
  }

  lines.push(
    "Generated from information provided by the user. This summary is for communication and discussion purposes and is not a medical diagnosis.",
  );

  return lines.join("\n");
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date not provided";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ *
 * Source resolution (the "View source" drawer)
 * ------------------------------------------------------------------ */

export interface ResolvedSource {
  eventId: string;
  text: string;
  timeLabel: string;
  status: string;
}

export function resolveSources(
  summary: HealthSummary,
  events: AnalyzedEvent[],
): ResolvedSource[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const out: ResolvedSource[] = [];
  for (const id of summary.sourceEventIds) {
    const e = byId.get(id);
    if (!e) continue;
    out.push({
      eventId: e.id,
      text: e.sourceText || e.description,
      timeLabel: e.timeLabel,
      status: e.status ?? "AI_ORGANIZED",
    });
  }
  return out;
}

/** Looks up the sources for one summary statement's event ids. */
export function sourcesFor(
  ids: string[],
  events: AnalyzedEvent[],
): ResolvedSource[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  return ids
    .map((id) => byId.get(id))
    .filter((e): e is AnalyzedEvent => Boolean(e))
    .map((e) => ({
      eventId: e.id,
      text: e.sourceText || e.description,
      timeLabel: e.timeLabel,
      status: e.status ?? "AI_ORGANIZED",
    }));
}

/* ------------------------------------------------------------------ *
 * Diff (shown when the timeline changed after a summary existed)
 * ------------------------------------------------------------------ */

export interface SummaryDiff {
  label: string;
  previous: string;
  updated: string;
  derivedFromTimeline: boolean;
}

export function diffSummaries(
  previous: HealthSummary,
  updated: HealthSummary,
): SummaryDiff[] {
  const diffs: SummaryDiff[] = [];

  if (previous.mainConcern !== updated.mainConcern) {
    diffs.push({
      label: "Main concern",
      previous: previous.mainConcern,
      updated: updated.mainConcern,
      derivedFromTimeline: true,
    });
  }

  const prevByEvent = new Map(previous.timeline.map((t) => [t.eventId, t.description]));
  for (const item of updated.timeline) {
    const before = prevByEvent.get(item.eventId);
    if (before !== undefined && before !== item.description) {
      diffs.push({
        label: item.dateText,
        previous: before,
        updated: item.description,
        derivedFromTimeline: true,
      });
    }
  }

  const prevEvents = new Set(previous.timeline.map((t) => t.eventId));
  for (const item of updated.timeline) {
    if (!prevEvents.has(item.eventId)) {
      diffs.push({
        label: item.dateText,
        previous: "Not in previous summary",
        updated: item.description,
        derivedFromTimeline: true,
      });
    }
  }

  return diffs;
}

/** A cheap signature used to notice that the underlying story changed. */
export function summarySourceSignature(events: AnalyzedEvent[]): string {
  return events
    .map((e) => `${e.id}:${e.status}:${e.title}:${e.dateText}:${e.description}`)
    .join("|");
}
