/* =============================================================
   HealthStory AI — Stage 7 follow-up engine

   Records what happened after a conversation, appointment or test and
   folds it back into the HealthStory.

   It reuses the Stage 5 update pipeline for extraction, topic matching
   and evolution/conflict detection, and adds the follow-up layer:
   event classification, attribution, follow-up dates, unresolved
   questions, and a review step before anything is confirmed.

   Invariants:
     • Nothing is written into the confirmed story before the user
       reviews it.
     • Information the user was told is attributed, never presented as
       the AI's own claim.
     • No appointments are scheduled, no results interpreted, no
       urgency decided, no history erased.
   ============================================================= */

import {
  analyzeUpdateSync,
  applyUpdate,
  createSnapshot,
  setEvolutionStatus,
} from "../journal/engine";
import {
  makeId,
  toAnalyzedEvent,
  type AnalyzedEvent,
  type EventStatus,
} from "../health/types";
import type {
  StoryJournal,
  FollowUpEntry,
  FollowUpItem,
  FollowUpItemStatus,
  FollowUpType,
  InformationSource,
  UpdateAnalysis,
} from "../journal/types";
import { findTime } from "../health/dates";

const NUMBER_WORDS: Record<string, string> = {
  a: "one", an: "one", one: "one", two: "two", three: "three", four: "four",
  five: "five", six: "six", seven: "seven", eight: "eight", nine: "nine",
  ten: "ten", eleven: "eleven", twelve: "twelve", couple: "two", few: "a few",
  several: "several", "a couple of": "two",
};

function sentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Classification & attribution
 * ------------------------------------------------------------------ */

const REPORT_RE = /\b(report|reports|result|results|test|tests|scan|bloods?|blood test|x-?ray|mri)\b/i;
const APPOINTMENT_RE = /\b(appointment|appointments|saw my|visited|visit|clinic|hospital|consultant|specialist|gp|doctor)\b/i;
const CONVERSATION_RE = /\b(spoke|talked|discussed|conversation|told me|asked me|explained)\b/i;

export function classifyType(text: string): FollowUpType {
  if (REPORT_RE.test(text) && !APPOINTMENT_RE.test(text)) return "REPORT";
  if (APPOINTMENT_RE.test(text)) return "APPOINTMENT";
  if (CONVERSATION_RE.test(text)) return "CONVERSATION";
  if (/\b(other|something else)\b/i.test(text)) return "OTHER";
  return "PERSONAL_UPDATE";
}

const TELL_RE = /\b(told me|said|explained|mentioned|recommended|advised|asked me|informed|suggested|discussed)\b/i;
const PROFESSIONAL_RE = /\b(doctor|gp|nurse|consultant|specialist|physician|surgeon|pharmacist|they|he|she)\b/i;

export function informationSourceFor(sentence: string): InformationSource {
  if (TELL_RE.test(sentence) && PROFESSIONAL_RE.test(sentence)) return "PROFESSIONAL_CONVERSATION";
  if (TELL_RE.test(sentence)) return "PROFESSIONAL_CONVERSATION";
  return "USER_REPORTED";
}

/* ------------------------------------------------------------------ *
 * Item extraction
 * ------------------------------------------------------------------ */

function makeItem(input: Omit<FollowUpItem, "id" | "status"> & { status?: FollowUpItemStatus }): FollowUpItem {
  return { id: makeId("fitem"), status: "AI_ORGANIZED", ...input };
}

function extractDateItems(text: string, now: Date): FollowUpItem[] {
  const items: FollowUpItem[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences(text)) {
    // Relative future: "come back in two weeks", "return in a month"
    const rel = sentence.match(
      /\b(?:come back|return|see me again|review|follow[- ]?up|come again)\b[^.!?]{0,20}?\bin\s+(?:about\s+)?([a-z]+|\d+)\s+(day|week|month|year)s?\b/i,
    );
    const generic = sentence.match(/\bin\s+(?:about\s+)?([a-z]+|\d+)\s+(day|week|month|year)s?\b/i);
    const match = rel ?? generic;
    if (match) {
      const raw = match[1].toLowerCase();
      const count = NUMBER_WORDS[raw] ?? (/^\d+$/.test(raw) ? raw : "a few");
      const unit = match[2].toLowerCase();
      const text2 = `Follow-up mentioned: approximately ${count} ${unit}${count === "one" ? "" : "s"}`;
      if (!seen.has(text2)) {
        seen.add(text2);
        items.push(makeItem({ type: "DATE", text: text2, sourceText: sentence, sourceType: "USER_REPORTED", confidence: "MEDIUM" }));
      }
      continue;
    }
    // Absolute future date, e.g. "on 20 July" — kept as written, never sharpened.
    const t = findTime(sentence, now);
    if (t.precision !== "unknown" && /\b(next|on|by|before|around|in\s+\w+\s+20\d{2})\b/i.test(sentence)) {
      const text2 = `Date mentioned: ${t.label}`;
      if (!seen.has(text2)) {
        seen.add(text2);
        items.push(makeItem({ type: "DATE", text: text2, sourceText: sentence, sourceType: "USER_REPORTED", confidence: "MEDIUM" }));
      }
    }
  }
  return items;
}

function extractInformationItems(text: string): FollowUpItem[] {
  const items: FollowUpItem[] = [];
  for (const sentence of sentences(text)) {
    const source = informationSourceFor(sentence);
    if (source !== "PROFESSIONAL_CONVERSATION") continue;
    if (/\?$/.test(sentence)) continue;
    items.push(
      makeItem({
        type: "INFORMATION",
        text: sentence,
        sourceText: sentence,
        sourceType: "PROFESSIONAL_CONVERSATION",
        confidence: "MEDIUM",
      }),
    );
  }
  return items;
}

function extractQuestionItems(text: string): FollowUpItem[] {
  const items: FollowUpItem[] = [];
  for (const sentence of sentences(text)) {
    const isQuestion =
      /\?$/.test(sentence) ||
      /\b(not sure|unsure|wondering|clarify|don'?t understand|do not understand|unclear|want to ask|question about)\b/i.test(sentence);
    if (!isQuestion) continue;
    const cleaned = sentence.replace(/\?+$/, "").replace(/^i\s+(?:also\s+)?(?:want(?:ed)? to|would like to|need to)\s+/i, "");
    items.push(
      makeItem({
        type: "QUESTION",
        text: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
        sourceText: sentence,
        sourceType: "USER_REPORTED",
        confidence: "MEDIUM",
      }),
    );
  }
  return items;
}

function eventFromSentence(sentence: string, date: string | null): AnalyzedEvent {
  const isReport = REPORT_RE.test(sentence);
  const category = isReport ? "test" : "appointment";
  const title = sentence.length > 70 ? `${sentence.slice(0, 70).trim()}…` : sentence;
  return toAnalyzedEvent({
    id: makeId("ev"),
    date,
    dateLabel: date ? "Recorded" : "Date not provided",
    datePrecision: date ? "relative" : "unknown",
    description: sentence,
    frequency: null,
    change: null,
    notes: "",
    origin: "user",
    title,
    category,
    dateText: date ?? "",
    sourceText: sentence,
    label: isReport ? "Test or report mentioned" : "Appointment recorded",
    timeLabel: date ? "Recorded" : "Date not provided",
  });
}

/** Builds the reviewable items for a follow-up from the reused analysis. */
export function buildFollowUpItems(
  analysis: UpdateAnalysis,
  text: string,
  now: Date,
  eventDate: string | null,
): { items: FollowUpItem[]; extraEvents: AnalyzedEvent[] } {
  const items: FollowUpItem[] = [];
  const extraEvents: AnalyzedEvent[] = [];
  const seenEventText = new Set<string>();

  // Events already extracted by the Stage 5 pass.
  for (const e of analysis.events) {
    const key = (e.title || e.label).toLowerCase();
    if (seenEventText.has(key)) continue;
    seenEventText.add(key);
    items.push(
      makeItem({
        type: "EVENT",
        text: e.title,
        sourceText: e.sourceText,
        sourceType: "USER_REPORTED",
        confidence: e.extractionConfidence === "low" ? "LOW" : e.extractionConfidence === "medium" ? "MEDIUM" : "HIGH",
        eventId: e.id,
      }),
    );
  }

  // Follow-up specific event mentions the general lexicon does not cover.
  for (const sentence of sentences(text)) {
    if (!REPORT_RE.test(sentence) && !APPOINTMENT_RE.test(sentence)) continue;
    const ev = eventFromSentence(sentence, eventDate);
    const key = (ev.title || ev.label).toLowerCase();
    if (seenEventText.has(key)) continue;
    seenEventText.add(key);
    extraEvents.push(ev);
    items.push(
      makeItem({
        type: "EVENT",
        text: ev.title,
        sourceText: ev.sourceText,
        sourceType: "USER_REPORTED",
        confidence: "MEDIUM",
        eventId: ev.id,
      }),
    );
  }

  // Changes detected by the Stage 5 comparison.
  for (const evo of analysis.evolutions) {
    if (evo.changeType === "new_information" || evo.changeType === "continued") continue;
    items.push(
      makeItem({
        type: "CHANGE",
        text: `${evo.category}: ${evo.previousValue ?? "—"} → ${evo.currentValue ?? "—"}`,
        sourceText: evo.currentSourceText ?? evo.description,
        sourceType: "USER_REPORTED",
        confidence: evo.confidence === "low" ? "LOW" : evo.confidence === "medium" ? "MEDIUM" : "HIGH",
        evolutionId: evo.id,
      }),
    );
  }

  items.push(...extractDateItems(text, now));
  items.push(...extractInformationItems(text));
  items.push(...extractQuestionItems(text));

  return { items, extraEvents };
}

/* ------------------------------------------------------------------ *
 * Create + apply
 * ------------------------------------------------------------------ */

export interface FollowUpInput {
  type: FollowUpType;
  originalText: string;
  eventDate?: string;
  who?: string;
}

export interface FollowUpDraft {
  entry: FollowUpEntry;
  analysis: UpdateAnalysis;
  /** Synthetic events created for follow-up-specific mentions. */
  extraEvents: AnalyzedEvent[];
}

export function createFollowUp(journal: StoryJournal, input: FollowUpInput, now = new Date()): FollowUpDraft {
  const when = input.eventDate ? new Date(input.eventDate) : now;
  const analysis = analyzeUpdateSync(journal, input.originalText, when);
  const eventDate = input.eventDate ?? null;
  const { items, extraEvents } = buildFollowUpItems(analysis, input.originalText, when, eventDate);

  // Attach a suggested topic if this follow-up mentions an existing topic.
  for (const item of items) {
    const match = analysis.possibleMatches.find((m) =>
      item.sourceText.toLowerCase().includes(m.label.toLowerCase()) ||
      item.text.toLowerCase().includes(m.label.toLowerCase()),
    );
    if (match) item.suggestedTopicId = match.existingTopicId;
    if (!item.suggestedTopicId) {
      const topic = journal.topics.find((t) => item.sourceText.toLowerCase().includes(t.label.toLowerCase()));
      if (topic) item.suggestedTopicId = topic.id;
    }
    if (item.suggestedTopicId) {
      item.suggestedTopicLabel = journal.topics.find((t) => t.id === item.suggestedTopicId)?.label;
    }
  }

  const entry: FollowUpEntry = {
    id: makeId("followup"),
    createdAt: now.toISOString(),
    eventDate: eventDate ?? undefined,
    eventDatePrecision: eventDate ? "APPROXIMATE" : "UNKNOWN",
    type: input.type,
    originalText: input.originalText,
    language: "English",
    who: input.who,
    extractedItems: items,
    relatedTopicIds: [],
    relatedEventIds: [],
    questionIds: [],
    status: "REVIEW",
  };

  return { entry, analysis, extraEvents };
}

export interface FollowUpDecisions {
  itemStatus: Record<string, FollowUpItemStatus>;
  /** item id -> connect to the suggested topic. */
  connect: Record<string, boolean>;
}

function setEventStatus(journal: StoryJournal, id: string, status: EventStatus): StoryJournal {
  return { ...journal, events: journal.events.map((e) => (e.id === id ? { ...e, status } : e)) };
}

/**
 * Applies a reviewed follow-up to the journal.
 *
 * Everything the user confirmed becomes part of the story; everything
 * dismissed is kept out. The previous summary is never overwritten — adding
 * events naturally marks it stale, and the user reviews an update separately.
 */
export function applyFollowUp(
  journal: StoryJournal,
  draft: FollowUpDraft,
  decisions: FollowUpDecisions,
  now = new Date(),
): StoryJournal {
  const { entry, analysis } = draft;
  const statusOf = (id: string, fallback: FollowUpItemStatus): FollowUpItemStatus => decisions.itemStatus[id] ?? fallback;

  // Add the extracted events / evolutions / topics through the Stage 5 pipeline.
  let next = applyUpdate(journal, analysis, now);

  // Append any follow-up-specific events the general extractor did not produce.
  const existingIds = new Set(next.events.map((e) => e.id));
  for (const ev of draft.extraEvents) {
    if (!existingIds.has(ev.id)) next = { ...next, events: [...next.events, ev] };
  }

  // Apply per-item decisions.
  const updatedItems: FollowUpItem[] = entry.extractedItems.map((item) => ({
    ...item,
    status: statusOf(item.id, "AI_ORGANIZED"),
  }));

  for (const item of updatedItems) {
    if (item.evolutionId) {
      next = setEvolutionStatus(next, item.evolutionId, item.status === "DISMISSED" ? "DISMISSED" : "CONFIRMED", now);
    }
    if (item.eventId) {
      next = setEventStatus(next, item.eventId, item.status === "DISMISSED" ? "REMOVED" : "CONFIRMED");
    }
  }

  // Confirmed questions become part of the question list.
  const questionIds: string[] = [];
  const existingQuestionText = new Set((next.questions ?? []).map((q) => q.text.toLowerCase()));
  for (const item of updatedItems) {
    if (item.type !== "QUESTION" || item.status === "DISMISSED") continue;
    if (existingQuestionText.has(item.text.toLowerCase())) continue;
    const question = {
      id: makeId("q"),
      text: item.text,
      source: "AI_SUGGESTED" as const,
      status: "OPEN" as const,
      createdAt: now.toISOString(),
    };
    next = { ...next, questions: [...(next.questions ?? []), question] };
    existingQuestionText.add(item.text.toLowerCase());
    questionIds.push(question.id);
  }

  // Topics the user chose to connect.
  const connectedTopicIds = updatedItems
    .filter((i) => i.suggestedTopicId && decisions.connect[i.id])
    .map((i) => i.suggestedTopicId as string);

  const confirmed: FollowUpEntry = {
    ...entry,
    status: "CONFIRMED",
    extractedItems: updatedItems,
    relatedTopicIds: [...new Set(connectedTopicIds)],
    relatedEventIds: updatedItems.map((i) => i.eventId).filter((x): x is string => Boolean(x)),
    questionIds,
  };

  next = {
    ...next,
    updatedAt: now.toISOString(),
    followUps: [confirmed, ...(next.followUps ?? [])],
    activity: [
      {
        id: makeId("act"),
        at: now.toISOString(),
        type: "update_added" as const,
        label: `Added a follow-up (${updatedItems.length} item${updatedItems.length === 1 ? "" : "s"} reviewed)`,
      },
      ...next.activity,
    ].slice(0, 60),
  };

  return next;
}

/* ------------------------------------------------------------------ *
 * Presentation helpers
 * ------------------------------------------------------------------ */

export function createSnapshotFromFollowUp(journal: StoryJournal, name: string, now = new Date()): StoryJournal {
  return createSnapshot(journal, name.trim() || "Follow-up snapshot", now);
}

export function followUpSummary(entry: FollowUpEntry): string {  const confirmed = entry.extractedItems.filter((i) => i.status !== "DISMISSED");
  const events = confirmed.filter((i) => i.type === "EVENT").length;
  const changes = confirmed.filter((i) => i.type === "CHANGE").length;
  const questions = confirmed.filter((i) => i.type === "QUESTION").length;
  const infos = confirmed.filter((i) => i.type === "INFORMATION").length;
  const dates = confirmed.filter((i) => i.type === "DATE").length;

  const parts: string[] = [];
  if (entry.eventDate) parts.push(`On ${entry.eventDate},`);
  parts.push(`you recorded a ${entry.type.toLowerCase().replace("_", " ")}`);
  const details: string[] = [];
  if (events) details.push(`${events} event${events === 1 ? "" : "s"}`);
  if (changes) details.push(`${changes} change${changes === 1 ? "" : "s"}`);
  if (infos) details.push(`${infos} piece${infos === 1 ? "" : "s"} of information you were told`);
  if (dates) details.push(`${dates} follow-up date${dates === 1 ? "" : "s"} mentioned`);
  if (questions) details.push(`${questions} new question${questions === 1 ? "" : "s"}`);
  const detailText = details.length > 0 ? `, including ${details.join(", ")}` : "";
  return `${parts.join(" ")}${detailText}.`;
}

export interface FollowUpFilters {
  query: string;
  types: FollowUpType[];
  range: "all" | "30d" | "3m" | "6m";
}

export function filterFollowUps(followUps: FollowUpEntry[], filters: FollowUpFilters, now = new Date()): FollowUpEntry[] {
  const q = filters.query.trim().toLowerCase();
  let start: Date | null = null;
  if (filters.range !== "all") {
    start = new Date(now);
    if (filters.range === "30d") start.setDate(start.getDate() - 30);
    if (filters.range === "3m") start.setMonth(start.getMonth() - 3);
    if (filters.range === "6m") start.setMonth(start.getMonth() - 6);
  }
  return followUps
    .filter((f) => filters.types.length === 0 || filters.types.includes(f.type))
    .filter((f) => {
      if (!start) return true;
      const d = new Date(f.eventDate ?? f.createdAt);
      return d >= start;
    })
    .filter((f) => {
      if (!q) return true;
      const hay = `${f.originalText} ${f.extractedItems.map((i) => i.text).join(" ")}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => ((a.eventDate ?? a.createdAt) < (b.eventDate ?? b.createdAt) ? 1 : -1));
}

export const FOLLOWUP_STAGES = [
  { id: "reading", label: "Reading your update" },
  { id: "identifying", label: "Identifying what happened" },
  { id: "dates", label: "Finding dates and events" },
  { id: "comparing", label: "Comparing with your existing story" },
  { id: "newinfo", label: "Identifying new information" },
  { id: "preparing", label: "Preparing your story update" },
] as const;

export type FollowUpStage = (typeof FOLLOWUP_STAGES)[number]["id"];

export async function processFollowUp(
  journal: StoryJournal,
  input: FollowUpInput,
  options: { onStage?: (stage: FollowUpStage) => void; signal?: AbortSignal } = {},
  now = new Date(),
): Promise<FollowUpDraft> {
  for (const stage of FOLLOWUP_STAGES) {
    options.onStage?.(stage.id);
    if (options.signal?.aborted) throw new DOMException("Follow-up cancelled", "AbortError");
    await new Promise((r) => setTimeout(r, 160));
  }
  return createFollowUp(journal, input, now);
}
