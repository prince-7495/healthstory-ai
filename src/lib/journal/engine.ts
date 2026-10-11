/* =============================================================
   HealthStory AI — Stage 5 journal engine

   This is the longitudinal heart of Stage 5. It sits on top of the
   Stage 3 extractor and the Stage 4 summary builder and adds:

     • journal entries and stable topics
     • matching a new update against the existing story
     • evidence-backed "what changed" comparisons
     • contradiction and correction detection (never auto-resolved)
     • snapshots, filtering, search, patterns and topic history
     • summary refresh status + updated summary generation

   The whole engine is deterministic. There is no external model, and
   no function here invents a fact, a date, a cause or a diagnosis. A
   "change" is only ever a comparison between two things the user wrote,
   and it carries both phrases as evidence.
   ============================================================= */

import {
  LOCAL_INFO,
  previewOrganizedStory,
} from "../health/analyzeHealthStory";
import { formatDate, shortLabel, toISO } from "../health/dates";
import { CHANGE_CUES, FREQUENCY_RANK } from "../health/lexicon";
import {
  buildHealthSummary,
  type HealthSummary,
  type SummaryLength,
} from "../health/summary";
import {
  createEmptyStory,
  makeId,
  type AnalyzedEvent,
  type EventCategory,
  type ExtractionConfidence,
  type Gap,
  type HealthChange,
  type OrganizedStory,
} from "../health/types";
import {
  createDefaultPreferences,
  type ActivityType,
  type EvolutionChangeType,
  type StoryActivity,
  type StoryEvolution,
  type StoryJournal,
  type StoryJournalEntry,
  type StorySnapshot,
  type StoryTopic,
  type SummaryUpdateStatus,
  type TimeRangeId,
  type UpdateAnalysis,
} from "./types";

/* ------------------------------------------------------------------ *
 * Text helpers
 * ------------------------------------------------------------------ */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

const MEANINGFUL_CHANGES: EvolutionChangeType[] = [
  "increased",
  "decreased",
  "more_frequent",
  "less_frequent",
  "started",
  "stopped",
  "improved",
  "worsened",
  "new_information",
  "correction",
  "contradiction",
];

/* ------------------------------------------------------------------ *
 * Categories → human labels
 * ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<EventCategory, string> = {
  symptom: "Symptoms reported",
  medication: "Medication",
  treatment: "Treatment",
  test: "Tests",
  appointment: "Appointments",
  lifestyle: "Lifestyle",
  context: "Context",
  change: "Changes",
  other: "Other",
};

/* ------------------------------------------------------------------ *
 * Creation helpers
 * ------------------------------------------------------------------ */

export function createEmptyJournal(now = new Date()): StoryJournal {
  const iso = now.toISOString();
  return {
    id: makeId("journal"),
    createdAt: iso,
    updatedAt: iso,
    topics: [],
    entries: [],
    events: [],
    evolutions: [],
    summaries: [],
    snapshots: [],
    preferences: createDefaultPreferences(),
    activity: [],
  };
}

function activity(type: ActivityType, label: string, now: Date): StoryActivity {
  return { id: makeId("act"), at: now.toISOString(), type, label };
}

/** Clones a journal with activity appended, keeping reducers pure. */
function withActivity(journal: StoryJournal, entry: StoryActivity): StoryJournal {
  return { ...journal, activity: [entry, ...journal.activity].slice(0, 60) };
}

/* ------------------------------------------------------------------ *
 * 1. Extraction — the user's words → structured events
 * ------------------------------------------------------------------ */

/**
 * Anchors an event that carried no time reference to the moment the
 * update was written. This is honest: the user is reporting it today.
 */
function anchorEvent(event: AnalyzedEvent, now: Date): AnalyzedEvent {
  if (event.datePrecision !== "unknown") return event;
  const iso = toISO(now);
  return {
    ...event,
    date: iso,
    datePrecision: "relative",
    dateLabel: "Today",
    timeLabel: "Today",
    dateText: "today",
  };
}

export function extractUpdateEvents(content: string, now: Date): AnalyzedEvent[] {
  const story = { ...createEmptyStory(), storyText: content };
  const organized = previewOrganizedStory(story);
  if (!organized) return [];
  // Only events the extractor actually produced from this text.
  return organized.events.filter((e) => e.origin === "ai").map((e) => anchorEvent(e, now));
}

/* ------------------------------------------------------------------ *
 * 2. Topic matching
 * ------------------------------------------------------------------ */

function topicKey(label: string): string {
  return normalize(label);
}

function findTopic(topics: StoryTopic[], label: string): StoryTopic | undefined {
  const key = topicKey(label);
  return topics.find((t) => topicKey(t.label) === key);
}

/* ------------------------------------------------------------------ *
 * 3. Evolution detection — comparing a new event with its history
 * ------------------------------------------------------------------ */

function mostRecentPrevious(
  events: AnalyzedEvent[],
  label: string,
): AnalyzedEvent | undefined {
  const key = topicKey(label);
  const matches = events
    .filter((e) => e.status !== "REMOVED" && topicKey(e.label || e.title) === key)
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : 1) : 0));
  return matches[matches.length - 1];
}

function frequencyRank(value: string | null | undefined): number {
  if (!value) return 0;
  return FREQUENCY_RANK[value] ?? 0;
}

function changeDirection(event: AnalyzedEvent): "up" | "down" | "neutral" | null {
  if (!event.change) return null;
  for (const cue of CHANGE_CUES) {
    if (cue.patterns.some((p) => p.test(event.change as string))) {
      return cue.direction;
    }
  }
  return null;
}

/**
 * The label for a directional change. Frequency wording ("more often",
 * "less often", "better", "worse") is reported as a Frequency change;
 * anything else falls back to the event's own category.
 */
function changeCategory(event: AnalyzedEvent): string {
  const cue = (event.change ?? "").toLowerCase();
  if (/frequent|often|worse|better|less|more|fewer|improve|reduc/.test(cue)) {
    return "Frequency";
  }
  return CATEGORY_LABELS[event.category] ?? event.category;
}

/** Turns a raw change label into plain comparison wording. */
function friendlyChange(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/worse|more|increas|escalat/i.test(value)) return "More frequent";
  if (/better|less|fewer|reduc|improv/i.test(value)) return "Less frequent";
  return value;
}

function makeEvolution(input: {
  category: string;
  changeType: EvolutionChangeType;
  previousEvent?: AnalyzedEvent;
  currentEvent: AnalyzedEvent;
  previousValue?: string;
  currentValue?: string;
  confidence: ExtractionConfidence;
  description: string;
  correctionPrompt?: string;
}): StoryEvolution {
  return {
    id: makeId("evo"),
    previousEventId: input.previousEvent?.id,
    currentEventId: input.currentEvent.id,
    category: input.category,
    previousValue: input.previousValue,
    currentValue: input.currentValue,
    description: input.description,
    changeType: input.changeType,
    previousSourceText: input.previousEvent?.sourceText,
    currentSourceText: input.currentEvent.sourceText,
    confidence: input.confidence,
    status: "AI_ORGANIZED",
    correctionPrompt: input.correctionPrompt,
  };
}

/**
 * The comparison pass.
 *
 * It only emits a comparison when both sides exist in the user's own
 * words — a previous value and a current value — or when the user's
 * words explicitly mark a direction ("less often", "getting worse").
 */
function detectEvolutions(
  previousEvents: AnalyzedEvent[],
  newEvents: AnalyzedEvent[],
): { evolutions: StoryEvolution[]; newTopicEvents: AnalyzedEvent[] } {
  const evolutions: StoryEvolution[] = [];
  const newTopicEvents: AnalyzedEvent[] = [];
  const continuedSeen = new Set<string>();
  const newInfoSeen = new Set<string>();
  let sleepChangeSeen = false;

  for (const current of newEvents) {
    const label = current.label || current.title;
    const labelKey = normalize(label);

    // Same topic → its most recent previous mention. Sleep is special: the
    // wording changes between mentions ("Reduced sleep" → "More sleep"), so
    // it is matched on the sleep dimension rather than the exact label.
    let previous = mostRecentPrevious(previousEvents, label);
    const sameLabelBefore = Boolean(previous);
    if (labelKey.includes("sleep")) {
      const sleepPrev = [...previousEvents]
        .filter((e) => e.status !== "REMOVED" && normalize(e.label || e.title).includes("sleep"))
        .sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : 1) : 0))
        .pop();
      if (sleepPrev) previous = sleepPrev;
    }

    if (!previous) {
      // A topic never seen before. Its first appearance is new information.
      if (!newInfoSeen.has(labelKey)) {
        newInfoSeen.add(labelKey);
        newTopicEvents.push(current);
        evolutions.push(
          makeEvolution({
            category: CATEGORY_LABELS[current.category] ?? current.category,
            changeType: "new_information",
            currentEvent: current,
            currentValue: current.label,
            confidence: current.extractionConfidence,
            description: `New information recorded: ${titleCase(label.toLowerCase())} was mentioned for the first time.`,
          }),
        );
      }
      continue;
    }

    const dir = changeDirection(current);
    const category = changeCategory(current);

    /* sleep state change, e.g. reduced sleep → more regular sleep */
    if (labelKey.includes("sleep") && !sleepChangeSeen) {
      const prevKey = normalize(previous.label || previous.title);
      const prevReduced = /reduced|less/.test(prevKey);
      const prevMore = /more/.test(prevKey);
      const currMore = /more|regular/.test(labelKey);
      const currLess = /reduced|less/.test(labelKey);
      if ((prevReduced && currMore) || (prevMore && currLess)) {
        sleepChangeSeen = true;
        const better = prevReduced && currMore;
        evolutions.push(
          makeEvolution({
            category: "Sleep",
            changeType: better ? "improved" : "worsened",
            previousEvent: previous,
            currentEvent: current,
            previousValue: previous.label,
            currentValue: current.label,
            confidence: "high",
            description: `You reported sleep changing from "${previous.label}" to "${current.label}".`,
          }),
        );
        continue;
      }
    }

    /* Directional wording ("more often", "less often", "getting worse") only
       applies to a reported symptom. A context or lifestyle phrase that merely
       sits in the same sentence must not become a frequency change. */
    if (current.category === "symptom" && (dir === "up" || dir === "down")) {
      const source = (current.sourceText || "").toLowerCase();
      const isWorse = /worse|severe|escalat|unbearable|debilitat/.test(source);
      const isBetter = /better|improv|less severe|eased|settled down|feeling good/.test(source);

      let changeType: EvolutionChangeType;
      let currentValue: string;
      let verb: string;

      if (dir === "up") {
        changeType = isWorse ? "worsened" : "more_frequent";
        currentValue = isWorse ? "Worse" : "More frequent";
        verb = isWorse ? "worse" : "more often";
      } else {
        // "Improved" only when the user's own words say improved/better.
        changeType = isBetter ? "improved" : "less_frequent";
        currentValue = isBetter ? "Better" : "Less frequent";
        verb = isBetter ? "better" : "less often";
      }

      const previousValue = previous.frequency ?? friendlyChange(previous.change) ?? previous.label;

      // Saying the same thing again is not a new change.
      if (normalize(previousValue) === normalize(currentValue)) {
        if (!continuedSeen.has(labelKey)) {
          continuedSeen.add(labelKey);
          evolutions.push(
            makeEvolution({
              category,
              changeType: "continued",
              previousEvent: previous,
              currentEvent: current,
              previousValue,
              currentValue,
              confidence: "medium",
              description: `${titleCase(label.toLowerCase())} was reported as continuing.`,
            }),
          );
        }
        continue;
      }

      evolutions.push(
        makeEvolution({
          category,
          changeType,
          previousEvent: previous,
          currentEvent: current,
          previousValue,
          currentValue,
          confidence: "high",
          description: `You described ${label.toLowerCase()} as happening ${verb} than before.`,
        }),
      );
      continue;
    }

    /* frequency ranks both present */
    if (current.category === "symptom") {
      const prevRank = frequencyRank(previous.frequency);
      const currRank = frequencyRank(current.frequency);
      if (prevRank && currRank && prevRank !== currRank) {
        const more = currRank > prevRank;
        evolutions.push(
          makeEvolution({
            category: "Frequency",
            changeType: more ? "more_frequent" : "less_frequent",
            previousEvent: previous,
            currentEvent: current,
            previousValue: previous.frequency ?? undefined,
            currentValue: current.frequency ?? undefined,
            confidence: "high",
            description: `The frequency you recorded changed from "${previous.frequency}" to "${current.frequency}".`,
          }),
        );
        continue;
      }
    }

    /* Co-mentioned context that keeps appearing. Values are topic labels,
       never whole sentences, and it is only recorded once per topic. */
    if (
      sameLabelBefore &&
      (current.category === "context" || current.category === "lifestyle") &&
      !continuedSeen.has(labelKey)
    ) {
      continuedSeen.add(labelKey);
      evolutions.push(
        makeEvolution({
          category: CATEGORY_LABELS[current.category] ?? current.category,
          changeType: "continued",
          previousEvent: previous,
          currentEvent: current,
          previousValue: previous.label,
          currentValue: current.label,
          confidence: "medium",
          description: `${titleCase(label.toLowerCase())} was mentioned again in this update.`,
        }),
      );
    }
  }

  return { evolutions, newTopicEvents };
}

/* ------------------------------------------------------------------ *
 * 4. Contradiction & correction detection
 * ------------------------------------------------------------------ */

const NEGATION = /\b(never|no longer|doesn'?t|don'?t|didn'?t|haven'?t|hasn'?t|no|not|none|without)\b/i;

/**
 * Finds sentences in the update that *deny* something the user previously
 * reported (the brief's contradiction case). A denial is not a report, so
 * the matching event is dropped from this update and surfaced as a conflict
 * instead.
 */
function findDenials(
  previousEvents: AnalyzedEvent[],
  content: string,
): { previousEvent: AnalyzedEvent; sentence: string }[] {
  const result: { previousEvent: AnalyzedEvent; sentence: string }[] = [];
  const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
  const seen = new Set<string>();

  for (const event of previousEvents) {
    if (event.category !== "symptom" && event.category !== "medication") continue;
    const label = event.label || event.title;
    const key = topicKey(label);
    if (seen.has(key)) continue;

    const firstWord = label.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sentence = sentences.find(
      // No trailing word boundary: "headache" must also match "headaches".
      (s) => new RegExp(`\\b${firstWord}`, "i").test(s) && NEGATION.test(s),
    );
    if (!sentence) continue;
    seen.add(key);
    result.push({ previousEvent: event, sentence: sentence.trim() });
  }

  return result;
}

function contradictionsFromDenials(
  denials: { previousEvent: AnalyzedEvent; sentence: string }[],
): StoryEvolution[] {
  return denials.map(({ previousEvent, sentence }) => {
    const current = {
      ...previousEvent,
      id: makeId("ev"),
      sourceText: sentence,
      title: sentence,
      description: sentence,
    } as AnalyzedEvent;
    return makeEvolution({
      category: CATEGORY_LABELS[previousEvent.category] ?? previousEvent.category,
      changeType: "contradiction",
      previousEvent,
      currentEvent: current,
      previousValue: previousEvent.title,
      currentValue: sentence,
      confidence: "medium",
      description: `Earlier you recorded "${previousEvent.sourceText}". This update says "${sentence}". We haven't chosen between them.`,
    });
  });
}

function detectCorrections(
  previousEvents: AnalyzedEvent[],
  content: string,
): StoryEvolution[] {
  if (previousEvents.length === 0) return [];
  if (!/\b(actually|i meant|i mean|correction|i wrote|i said|i realise|i realize|looking back)\b/i.test(content)) {
    return [];
  }
  const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
  const correction = sentences.find((s) =>
    /\b(actually|i meant|i mean|correction|i wrote|i said|looking back)\b/i.test(s),
  );
  if (!correction) return [];

  const prior = previousEvents[previousEvents.length - 1];
  const current = {
    ...(prior ?? previousEvents[0]),
    id: makeId("ev"),
    sourceText: correction.trim(),
    title: correction.trim(),
    description: correction.trim(),
  } as AnalyzedEvent;

  return [
    makeEvolution({
      category: "Correction",
      changeType: "correction",
      previousEvent: prior,
      currentEvent: current,
      previousValue: prior?.title,
      currentValue: correction.trim(),
      confidence: "medium",
      description: `Your update appears to correct something you recorded earlier: "${correction.trim()}".`,
      correctionPrompt: "Does this update replace the previous information?",
    }),
  ];
}

const SIMILARITY_STOPWORDS = new Set([
  "reported",
  "mentioned",
  "change",
  "factor",
  "period",
  "more",
  "less",
  "increased",
  "reduced",
  "started",
  "stopped",
]);

function meaningfulWords(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((w) => w.length > 4 && !SIMILARITY_STOPWORDS.has(w));
}

function detectPossibleMatches(
  existingTopics: StoryTopic[],
  newEvents: AnalyzedEvent[],
): { label: string; existingTopicId: string; newLabel: string }[] {
  const matches: { label: string; existingTopicId: string; newLabel: string }[] = [];
  for (const event of newEvents) {
    // Topic ambiguity matters for reported symptoms and medications. Sleep,
    // context and lifestyle wording is reconciled by the dimension logic.
    if (event.category !== "symptom" && event.category !== "medication") continue;
    const label = event.label || event.title;
    const words = meaningfulWords(label);
    for (const topic of existingTopics) {
      if (topicKey(topic.label) === topicKey(label)) continue;
      const shared = meaningfulWords(topic.label).some((w) => words.includes(w));
      if (shared) {
        matches.push({ label: topic.label, existingTopicId: topic.id, newLabel: label });
      }
    }
  }
  return matches;
}

/* ------------------------------------------------------------------ *
 * 5. The synchronous update analysis
 * ------------------------------------------------------------------ */

export function analyzeUpdateSync(
  journal: StoryJournal,
  content: string,
  now = new Date(),
): UpdateAnalysis {
  const rawEvents = extractUpdateEvents(content, now);

  // A denial ("I have never had headaches") must not be read as a report.
  const denials = findDenials(journal.events, content);
  const deniedSentences = new Set(denials.map((d) => d.sentence));
  const events = rawEvents.filter((e) => !deniedSentences.has((e.sourceText || "").trim()));

  const { evolutions } = detectEvolutions(journal.events, events);

  const contradictions = contradictionsFromDenials(denials);
  const corrections = detectCorrections(journal.events, content);
  const possibleMatches = detectPossibleMatches(journal.topics, events);

  const newTopics: StoryTopic[] = [];
  for (const e of events) {
    const label = e.label || e.title;
    if (!findTopic(journal.topics, label) && !findTopic(newTopics, label)) {
      const iso = now.toISOString();
      newTopics.push({
        id: makeId("topic"),
        label,
        category: e.category,
        eventIds: [e.id],
        createdAt: iso,
        updatedAt: iso,
      });
    }
  }

  const hasMeaningfulChange =
    evolutions.some((e) => MEANINGFUL_CHANGES.includes(e.changeType) && e.changeType !== "new_information") ||
    contradictions.length > 0 ||
    corrections.length > 0;

  const summaryStatus: SummaryUpdateStatus = hasMeaningfulChange ? "UPDATE_RECOMMENDED" : "NO_UPDATE_NEEDED";

  const entry: StoryJournalEntry = {
    id: makeId("entry"),
    createdAt: now.toISOString(),
    content,
    language: "English",
    source: "USER",
    extractedEventIds: events.map((e) => e.id),
    status: "PROCESSED",
  };

  return {
    entry,
    events,
    newTopics,
    evolutions,
    contradictions,
    corrections,
    possibleMatches,
    summaryStatus,
  };
}

/* ------------------------------------------------------------------ *
 * 6. Applying an update to the journal
 * ------------------------------------------------------------------ */

export function applyUpdate(
  journal: StoryJournal,
  analysis: UpdateAnalysis,
  now = new Date(),
): StoryJournal {
  const topicMap = new Map(journal.topics.map((t) => [topicKey(t.label), t]));

  for (const event of analysis.events) {
    const key = topicKey(event.label || event.title);
    const existing = topicMap.get(key);
    if (existing) {
      topicMap.set(key, {
        ...existing,
        eventIds: unique([...existing.eventIds, event.id]),
        updatedAt: now.toISOString(),
      });
    }
  }
  for (const topic of analysis.newTopics) {
    if (!topicMap.has(topicKey(topic.label))) topicMap.set(topicKey(topic.label), topic);
  }

  const evidence = journal.preferences.saveEvidence;
  const strip = (e: StoryEvolution): StoryEvolution =>
    evidence ? e : { ...e, previousSourceText: undefined, currentSourceText: undefined };

  const existingEvolutionIds = new Set(journal.evolutions.map((e) => e.id));
  const newEvolutions = [...analysis.evolutions, ...analysis.contradictions, ...analysis.corrections]
    .filter((e) => !existingEvolutionIds.has(e.id))
    .map(strip);

  const savedEntry = journal.preferences.saveUpdates
    ? analysis.entry
    : { ...analysis.entry, status: "DRAFT" as const, note: "Not saved — Story Memory is off." };

  const next: StoryJournal = {
    ...journal,
    updatedAt: now.toISOString(),
    topics: [...topicMap.values()],
    entries: [...journal.entries, savedEntry],
    events: [...journal.events, ...analysis.events],
    evolutions: [...journal.evolutions, ...newEvolutions],
  };

  return withActivity(
    next,
    activity("update_added", `Added an update (${analysis.events.length} item${analysis.events.length === 1 ? "" : "s"} organized)`, now),
  );
}

/* ------------------------------------------------------------------ *
 * 7. Human decisions about evolutions
 * ------------------------------------------------------------------ */

export function setEvolutionStatus(
  journal: StoryJournal,
  id: string,
  status: StoryEvolution["status"],
  now = new Date(),
): StoryJournal {
  const next = {
    ...journal,
    updatedAt: now.toISOString(),
    evolutions: journal.evolutions.map((e) => (e.id === id ? { ...e, status } : e)),
  };
  const type: ActivityType = status === "CONFIRMED" ? "change_confirmed" : "change_dismissed";
  return withActivity(next, activity(type, `Marked a change as ${status.toLowerCase().replace("_", " ")}`, now));
}

export function editEvolution(
  journal: StoryJournal,
  id: string,
  updates: { previousValue?: string; currentValue?: string; description?: string },
  now = new Date(),
): StoryJournal {
  const next = {
    ...journal,
    updatedAt: now.toISOString(),
    evolutions: journal.evolutions.map((e) =>
      e.id === id ? { ...e, ...updates, status: "CONFIRMED" as const } : e,
    ),
  };
  return withActivity(next, activity("change_edited", "Edited a detected change", now));
}

/** Keeps one side of a contradiction — never applied automatically. */
export function resolveContradiction(
  journal: StoryJournal,
  id: string,
  choice: "earlier" | "later",
  now = new Date(),
): StoryJournal {
  const next = {
    ...journal,
    updatedAt: now.toISOString(),
    evolutions: journal.evolutions.map((e) =>
      e.id === id
        ? {
            ...e,
            status: "CONFIRMED" as const,
            currentValue: choice === "later" ? e.currentValue : e.previousValue,
            previousValue: choice === "earlier" ? e.previousValue : e.currentValue,
          }
        : e,
    ),
  };
  return withActivity(next, activity("change_confirmed", `Kept the ${choice} entry for a clarification`, now));
}

/** Merges a newly created topic into an existing one (user-confirmed only). */
export function mergeTopics(
  journal: StoryJournal,
  existingTopicId: string,
  newLabel: string,
  now = new Date(),
): StoryJournal {
  const existing = journal.topics.find((t) => t.id === existingTopicId);
  if (!existing) return journal;
  const duplicate = journal.topics.find(
    (t) => t.id !== existingTopicId && topicKey(t.label) === topicKey(newLabel),
  );
  const mergedEventIds = unique([...existing.eventIds, ...(duplicate?.eventIds ?? [])]);
  const topics = journal.topics
    .filter((t) => t.id !== duplicate?.id)
    .map((t) =>
      t.id === existingTopicId ? { ...t, eventIds: mergedEventIds, updatedAt: now.toISOString() } : t,
    );
  return { ...journal, updatedAt: now.toISOString(), topics };
}

/* ------------------------------------------------------------------ *
 * 8. Overview / patterns / topic history
 * ------------------------------------------------------------------ */

export interface StoryOverview {
  firstEntry: string | null;
  latestUpdate: string | null;
  updates: number;
  topics: number;
  lastUpdated: string;
}

export function computeOverview(journal: StoryJournal): StoryOverview {
  const entries = [...journal.entries].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const first = entries[0];
  const last = entries[entries.length - 1];
  return {
    firstEntry: first ? monthLabel(first.createdAt) : null,
    latestUpdate: last ? monthLabel(last.createdAt) : null,
    updates: journal.entries.length,
    topics: journal.topics.length,
    lastUpdated: monthLabel(journal.updatedAt),
  };
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export interface PatternSequence {
  category: string;
  values: string[];
  /** How many entries mentioned this. */
  mentions: number;
}

/**
 * Descriptive patterns only: the sequence of reported values for a
 * category, plus how often a context was mentioned. Never a trend line
 * that implies medical change, and never a score.
 */
export function computePatterns(journal: StoryJournal): PatternSequence[] {
  const byCategory = new Map<string, string[]>();

  const evolutions = journal.evolutions.filter(
    (e) =>
      e.status !== "DISMISSED" &&
      e.changeType !== "no_change" &&
      e.changeType !== "new_information" &&
      e.changeType !== "continued",
  );

  for (const e of evolutions) {
    const label = e.category;
    const value = e.currentValue ?? e.description;
    const list = byCategory.get(label) ?? [];
    if (list[list.length - 1] !== value) list.push(value);
    byCategory.set(label, list);
  }

  const contextDates = new Map<string, Set<string>>();
  for (const event of journal.events) {
    if (event.category !== "context" && event.category !== "lifestyle") continue;
    const label = event.label || event.title;
    const when = event.date ?? event.timeLabel;
    const set = contextDates.get(label) ?? new Set<string>();
    set.add(when);
    contextDates.set(label, set);
  }
  const contextValues: string[] = [];
  for (const [label, dates] of contextDates) {
    contextValues.push(
      `${label} — appeared in ${dates.size} entr${dates.size === 1 ? "y" : "ies"}`,
    );
  }
  if (contextValues.length > 0) byCategory.set("Context mentioned", contextValues);

  return [...byCategory.entries()].map(([category, values]) => ({
    category,
    values,
    mentions: values.length,
  }));
}

export interface TopicHistory {
  topic: StoryTopic;
  entries: { dateLabel: string; text: string; eventId: string }[];
  firstMentioned: string | null;
  lastMentioned: string | null;
  changes: StoryEvolution[];
  related: string[];
}

export function computeTopicHistory(journal: StoryJournal, topicId: string): TopicHistory | null {
  const topic = journal.topics.find((t) => t.id === topicId);
  if (!topic) return null;

  const events = journal.events
    .filter((e) => topicKey(e.label || e.title) === topicKey(topic.label) && e.status !== "REMOVED")
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : 1) : 0));

  const entries = events.map((e) => ({
    dateLabel: e.timeLabel,
    text: e.sourceText,
    eventId: e.id,
  }));

  const changes = journal.evolutions.filter(
    (e) =>
      e.changeType !== "continued" &&
      e.changeType !== "no_change" &&
      (topicKey(e.category) === topicKey(topic.label) ||
        (e.currentEventId && events.some((ev) => ev.id === e.currentEventId))),
  );

  // Co-mentioned topics: other topics whose events carry the same date,
  // or that appeared in the same entry. Never a causal relationship.
  const relatedSet = new Set<string>();
  for (const event of events) {
    const sameDate = journal.events.filter(
      (e) => e.id !== event.id && e.date && e.date === event.date && e.status !== "REMOVED",
    );
    for (const other of sameDate) relatedSet.add(other.label || other.title);
  }
  relatedSet.delete(topic.label);

  return {
    topic,
    entries,
    firstMentioned: events[0]?.timeLabel ?? null,
    lastMentioned: events[events.length - 1]?.timeLabel ?? null,
    changes,
    related: [...relatedSet],
  };
}

export interface FrequencyPoint {
  dateLabel: string;
  rank: number;
  value: string;
}

/**
 * Reported frequency over time for a symptom/topic. Only emitted when
 * the user actually recorded frequency words — never invented.
 */
export function computeFrequencySeries(journal: StoryJournal): FrequencyPoint[] {
  const seen = new Set<string>();
  const points: FrequencyPoint[] = [];
  const ordered = [...journal.events]
    .filter((e) => e.status !== "REMOVED" && e.frequency && e.category === "symptom")
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : 1) : 0));

  for (const event of ordered) {
    const rank = FREQUENCY_RANK[event.frequency as string] ?? 0;
    if (!rank) continue;
    const dateLabel = shortLabel(event.timeLabel);
    const key = `${dateLabel}::${event.frequency}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ dateLabel, rank, value: event.frequency as string });
  }
  return points;
}

/* ------------------------------------------------------------------ *
 * 9. Filtering & search
 * ------------------------------------------------------------------ */

export interface EventFilters {
  range: TimeRangeId;
  from?: string;
  to?: string;
  categories: EventCategory[];
  query: string;
  now?: Date;
}

function rangeStart(range: TimeRangeId, now: Date): Date | null {
  const d = new Date(now);
  switch (range) {
    case "7d":
      d.setDate(d.getDate() - 7);
      return d;
    case "30d":
      d.setDate(d.getDate() - 30);
      return d;
    case "3m":
      d.setMonth(d.getMonth() - 3);
      return d;
    case "6m":
      d.setMonth(d.getMonth() - 6);
      return d;
    default:
      return null;
  }
}

export function filterEvents(journal: StoryJournal, filters: EventFilters): AnalyzedEvent[] {
  const now = filters.now ?? new Date();
  const start = rangeStart(filters.range, now);
  const from = filters.from ? new Date(filters.from) : start;
  const to = filters.to ? new Date(filters.to) : null;
  const query = normalize(filters.query);

  return journal.events
    .filter((e) => e.status !== "REMOVED")
    .filter((e) => {
      if (!from && !to) return true;
      if (!e.date) return false;
      const d = new Date(e.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    })
    .filter((e) => filters.categories.length === 0 || filters.categories.includes(e.category))
    .filter((e) => {
      if (!query) return true;
      const haystack = normalize(`${e.title} ${e.description} ${e.sourceText} ${e.label} ${e.timeLabel} ${e.frequency ?? ""}`);
      return haystack.includes(query);
    })
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? 1 : -1) : 0));
}

/** Categories actually present in the journal, so we never show empty filters. */
export function presentCategories(journal: StoryJournal): EventCategory[] {
  const set = new Set<EventCategory>();
  for (const e of journal.events) if (e.status !== "REMOVED") set.add(e.category);
  return [...set];
}

/* ------------------------------------------------------------------ *
 * 10. Snapshots
 * ------------------------------------------------------------------ */

export function createSnapshot(journal: StoryJournal, name: string, now = new Date()): StoryJournal {
  const snapshot: StorySnapshot = {
    id: makeId("snap"),
    name: name.trim() || formatDate(now),
    createdAt: now.toISOString(),
    includedEventIds: journal.events.filter((e) => e.status !== "REMOVED").map((e) => e.id),
    summaryId: journal.summaries[0]?.id,
  };
  const next = { ...journal, updatedAt: now.toISOString(), snapshots: [snapshot, ...journal.snapshots] };
  return withActivity(next, activity("snapshot_created", `Created snapshot "${snapshot.name}"`, now));
}

export function deleteSnapshot(journal: StoryJournal, id: string, now = new Date()): StoryJournal {
  return {
    ...journal,
    updatedAt: now.toISOString(),
    snapshots: journal.snapshots.filter((s) => s.id !== id),
  };
}

export interface SnapshotComparison {
  a: { name: string; items: string[] };
  b: { name: string; items: string[] };
  changes: string[];
}

export function compareSnapshots(
  journal: StoryJournal,
  aId: string,
  bId: string,
): SnapshotComparison | null {
  const a = journal.snapshots.find((s) => s.id === aId);
  const b = journal.snapshots.find((s) => s.id === bId);
  if (!a || !b) return null;

  const itemsFor = (ids: string[]) =>
    unique(
      ids
        .map((id) => journal.events.find((e) => e.id === id))
        .filter((e): e is AnalyzedEvent => Boolean(e))
        .map((e) => `${e.label || e.title}: ${e.frequency ?? e.change ?? e.title}`),
    );

  const aItems = itemsFor(a.includedEventIds);
  const bItems = itemsFor(b.includedEventIds);

  const changes: string[] = [];
  for (const item of bItems) {
    if (!aItems.includes(item)) changes.push(`Added since then: ${item}`);
  }
  for (const item of aItems) {
    if (!bItems.includes(item)) changes.push(`No longer recorded: ${item}`);
  }

  return { a: { name: a.name, items: aItems }, b: { name: b.name, items: bItems }, changes };
}

/* ------------------------------------------------------------------ *
 * 11. Summary status & generation
 * ------------------------------------------------------------------ */

export interface SummaryState {
  hasSummary: boolean;
  outOfDate: boolean;
  latest?: HealthSummary;
  latestAt?: string;
}

export function summaryState(journal: StoryJournal): SummaryState {
  const latest = [...journal.summaries].sort((a, b) =>
    a.generatedAt < b.generatedAt ? 1 : -1,
  )[0];
  if (!latest) return { hasSummary: false, outOfDate: journal.events.length > 0 };
  const activeEvents = journal.events.filter((e) => e.status !== "REMOVED");
  const covered = new Set(latest.sourceEventIds);
  const uncovered = activeEvents.some((e) => !covered.has(e.id));
  // A confirmed change is "newer" only if the latest summary does not yet
  // include it. Summary changes carry the confirmed evolution ids.
  const summaryChangeIds = new Set(latest.reportedChanges.map((c) => c.id));
  const newerConfirmedChange = journal.evolutions.some(
    (e) =>
      e.status === "CONFIRMED" &&
      e.changeType !== "continued" &&
      e.changeType !== "no_change" &&
      !summaryChangeIds.has(e.id),
  );
  return {
    hasSummary: true,
    outOfDate: uncovered || newerConfirmedChange,
    latest,
    latestAt: latest.generatedAt,
  };
}

/** Builds a minimal OrganizedStory so Stage 4's summary builder can be reused. */
function journalToOrganizedStory(journal: StoryJournal): OrganizedStory {
  const active = journal.events.filter((e) => e.status !== "REMOVED");
  const confirmedEvolutions = journal.evolutions.filter(
    (e) => e.status === "CONFIRMED" && e.changeType !== "continued" && e.changeType !== "no_change",
  );

  const changes: HealthChange[] = confirmedEvolutions.map((e) => ({
    id: e.id,
    category: e.category,
    before: e.previousValue ?? "Not mentioned",
    after: e.currentValue ?? e.description,
    description: e.description,
    sourceText: e.currentSourceText ?? "",
    confidence: e.confidence,
  }));

  const dated = active.filter((e) => e.date).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const hasSeverity = active.some((e) => e.severity);
  const hasFrequency = active.some((e) => e.frequency);

  const missing: Gap[] = [];
  if (active.length > 0 && !hasFrequency) {
    missing.push({ id: makeId("gap"), prompt: "Frequency was not specified for some entries." });
  }
  if (active.length > 0 && !hasSeverity) {
    missing.push({ id: makeId("gap"), prompt: "Severity was not mentioned in your entries." });
  }

  const questions = [
    "What would be most useful to bring to your next healthcare conversation?",
    "Is there anything about the pattern over time you would describe differently?",
  ];

  return {
    timeline: [],
    symptoms: [],
    time: {
      firstNoticed: dated[0]?.timeLabel ?? null,
      recentChange: dated.length > 1 ? dated[dated.length - 1].timeLabel : null,
    },
    context: [],
    other: [],
    notableChanges: [],
    questions,
    gaps: missing,
    analyzer: LOCAL_INFO,
    summary: "",
    events: active,
    changes,
    unclear: [],
    missing,
  };
}

export function generateSummaryFromJournal(
  journal: StoryJournal,
  length: SummaryLength = "standard",
  now = new Date(),
): HealthSummary {
  const story = journalToOrganizedStory(journal);
  const summary = buildHealthSummary({
    story,
    storyText: journal.entries.map((e) => e.content).join("\n"),
    events: story.events,
    isDemo: journal.preferences.demoMode,
    length,
    now,
  });
  return { ...summary, version: journal.summaries.length + 1 };
}

export function addGeneratedSummary(
  journal: StoryJournal,
  summary: HealthSummary,
  now = new Date(),
): StoryJournal {
  const summaries = journal.preferences.keepSummaries
    ? [summary, ...journal.summaries]
    : [summary];
  const next = { ...journal, updatedAt: now.toISOString(), summaries };
  return withActivity(next, activity("summary_updated", `Generated summary v${summary.version}`, now));
}

/** A one-line, reporting-language description of the latest update. */
export function latestUpdateLine(journal: StoryJournal): string {
  const pool = journal.evolutions.filter(
    (e) =>
      e.status !== "DISMISSED" &&
      e.changeType !== "new_information" &&
      e.changeType !== "continued",
  );
  const confirmed = pool.filter((e) => e.status === "CONFIRMED");
  const chosen = confirmed.length > 0 ? confirmed : pool;
  if (chosen.length === 0) {
    const entry = journal.entries[journal.entries.length - 1];
    return entry ? `You added an update: "${entry.content.slice(0, 120)}"` : "No updates recorded yet.";
  }
  return chosen
    .slice(-2)
    .map((e) => e.description)
    .join(" ");
}

/* ------------------------------------------------------------------ *
 * 12. Staged processing (the visible pipeline)
 * ------------------------------------------------------------------ */

export const UPDATE_STAGES = [
  { id: "reading", label: "Reading your update" },
  { id: "comparing", label: "Comparing with your previous story" },
  { id: "finding", label: "Finding new information" },
  { id: "organizing", label: "Organizing the timeline" },
  { id: "changes", label: "Identifying reported changes" },
  { id: "updating", label: "Updating your story" },
] as const;

export type UpdateStage = (typeof UPDATE_STAGES)[number]["id"];

export interface ProcessUpdateOptions {
  onStage?: (stage: UpdateStage) => void;
  signal?: AbortSignal;
}

export async function processUpdate(
  journal: StoryJournal,
  content: string,
  options: ProcessUpdateOptions = {},
  now = new Date(),
): Promise<UpdateAnalysis> {
  for (const stage of UPDATE_STAGES) {
    options.onStage?.(stage.id);
    if (options.signal?.aborted) {
      throw new DOMException("Update cancelled", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 160));
  }
  return analyzeUpdateSync(journal, content, now);
}
