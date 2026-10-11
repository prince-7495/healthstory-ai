/* =============================================================
   HealthStory AI — the analyzer

   The UI only ever calls `analyzeHealthStory()` or
   `previewOrganizedStory()`. Nothing in the components knows how the
   story was read, or by what.

   What runs today is a deterministic extractor that reads the user's
   actual text: it splits sentences, matches reported items against a
   lexicon, resolves time expressions, groups duplicates, detects
   contradictions, and compares earlier against later wording. None of
   the output is canned, and it is labelled in the UI as local
   rule-based extraction rather than a trained model.

   The invariant that shapes this file: the system may organize what was
   said, and may never create what was not. Every event carries the
   sentence it came from, every change carries the two phrases that
   establish it, and anything absent is reported as absent.

   To connect a real model:
     1. add a server route that returns the Stage 3 schema
     2. implement `StoryAnalyzer` in `analyzers/remote.ts`
     3. return it from `getAnalyzer()`
   The components never change and no key reaches the browser, because
   the request is made server-side.
   ============================================================= */

import {
  COMPARISON_MARKERS,
  CATEGORY_ORDER,
  CHANGE_CUES,
  CONTEXT_CUES,
  FREQUENCY_CUES,
  FREQUENCY_RANK,
  LEXICONS,
  SEVERITY_CUES,
  type LexiconEntry,
} from "./lexicon";
import {
  findTime,
  formatDate,
  shortLabel,
  START_PHRASE,
  type TimeMatch,
} from "./dates";
import {
  makeId,
  toAnalyzedEvent,
  type AnalyzedEvent,
  type AnalyzeOptions,
  type AnalyzerInfo,
  type EvidenceQuote,
  type EventCategory,
  type EventStatus,
  type ExtractionConfidence,
  type Gap,
  type HealthChange,
  type HealthStory,
  type NotableChange,
  type OrganizedStory,
  type StoryAnalyzer,
  type SymptomItem,
  type TimelineEntry,
  type UnclearItem,
} from "./types";
import { PIPELINE_STAGES } from "./types";

/* ------------------------------------------------------------------ *
 * Text utilities
 * ------------------------------------------------------------------ */

/** Split into sentences, keeping the punctuation so quotes read naturally. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Strip conversational filler so stored text reads cleanly. */
function tidy(sentence: string): string {
  return sentence
    .replace(/^(and|but|also|so|then|plus|and also|well)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function listWords(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Closes a truncated quote so it never looks like a broken sentence. */
function asQuote(sentence: string): string {
  const t = tidy(sentence);
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Lowercased sentence with punctuation removed, for phrase comparison. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Condenses a user's own sentence into a headline.
 *
 * Deliberately mechanical: leading time clauses and filler are removed and
 * the remainder is cut at a word boundary. Nothing is paraphrased, so a
 * headline can never assert something the user did not write.
 */
export function condense(sentence: string): string {
  let out = tidy(sentence);

  out = out
    .replace(
      /^(?:over|for|during|in|since|around|about|after|by)?\s*(?:the\s+)?(?:last|past|previous|few|couple of|several)?\s*(?:\d+|a|an|one|two|three|four|five|six|couple|few|several)?\s*(?:day|week|month|year)s?\s*(?:ago)?\s*,?\s*/i,
      "",
    )
    .replace(/^(?:today|tonight|yesterday|this (?:week|month|morning)|recently|lately|nowadays)\s*,?\s*/i, "")
    .replace(/^(?:i(?:'ve| have)?\s+(?:noticed|been (?:feeling|getting|having)))\s*(?:that|to)?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!out) out = tidy(sentence);
  if (out.length <= 72) return capitalize(out);

  const cut = out.slice(0, 72);
  const lastSpace = cut.lastIndexOf(" ");
  return `${capitalize((lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:]$/, ""))}…`;
}

/* ------------------------------------------------------------------ *
 * Sentence-level analysis
 * ------------------------------------------------------------------ */

interface Finding {
  entry: LexiconEntry;
  /** The exact phrase that matched. */
  matched: string;
}

function matchLexicon(sentence: string, lexicon: LexiconEntry[]): Finding[] {
  const found: Finding[] = [];
  for (const item of lexicon) {
    for (const pattern of item.patterns) {
      const m = sentence.match(pattern);
      if (!m) continue;
      found.push({ entry: item, matched: m[0].trim().toLowerCase() });
      break;
    }
  }
  return found;
}

function firstCue<T extends LexiconEntry & { direction?: string }>(
  sentence: string,
  cues: T[],
): T | null {
  return cues.find((c) => c.patterns.some((p) => p.test(sentence))) ?? null;
}

/** The lowest confidence among several findings: the weakest link wins. */
function weakestConfidence(values: ExtractionConfidence[]): ExtractionConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function quote(text: string, field: string): EvidenceQuote {
  return { id: makeId("ev"), text: asQuote(text), field };
}

/* ------------------------------------------------------------------ *
 * Time resolution for the whole story
 * ------------------------------------------------------------------ */

const START_LABELS: Record<string, string> = {
  Today: "Today",
  "This week": "This week",
  "This month": "This month",
  "A few months ago": "A few months ago",
  "More than a year ago": "More than a year ago",
};

function resolvePanelStart(story: HealthStory, now: Date): TimeMatch | null {
  const { start, customDate } = story.details;
  if (!start) return null;

  if (start === "Specific date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate)) return null;
    const [y, m, d] = customDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return null;
    return {
      precision: "exact",
      date: customDate,
      dateEnd: null,
      label: formatDate(date),
      text: customDate,
      hedged: false,
      sortKey: Date.UTC(y, m - 1, d) / 86_400_000,
    };
  }

  const phrase = START_PHRASE[start];
  const matched = phrase ? findTime(phrase, now) : null;
  if (!matched) return null;

  // A panel choice is a deliberate field answer, so it is never downgraded to
  // approximate — but it is relabelled in the user's chosen words so the UI
  // shows what they picked, not our paraphrase of it.
  return {
    ...matched,
    label: START_LABELS[start] ?? matched.label,
    text: START_LABELS[start] ?? matched.text,
    hedged: matched.precision === "approximate" || matched.precision === "relative",
  };
}

/* ------------------------------------------------------------------ *
 * Conflict detection
 * ------------------------------------------------------------------ */

interface DateClaim {
  iso: string | null;
  text: string;
  sentence: string;
  precision: string;
}

/**
 * Finds two different concrete start dates in one story.
 *
 * The system does not pick a winner — choosing would mean deciding which of
 * two things the user said is true, which is not its place. Both are surfaced
 * for the user to resolve.
 */
function detectConflicts(claims: DateClaim[]): UnclearItem[] {
  const concrete = claims.filter(
    (c) => c.iso && (c.precision === "exact" || c.precision === "month"),
  );

  const byMonth = new Map<string, DateClaim>();
  for (const c of concrete) {
    const key = c.iso!.slice(0, 7); // compare at month granularity
    const existing = byMonth.get(key);
    if (!existing) byMonth.set(key, c);
  }

  const distinct = [...byMonth.values()];
  if (distinct.length < 2) return [];

  return [
    {
      id: makeId("unclear"),
      statement:
        "Your story mentions more than one possible start month. We haven't chosen between them.",
      evidence: distinct.map((c) => quote(c.sentence, "date")),
      resolved: false,
    },
  ];
}

/* ------------------------------------------------------------------ *
 * The analyzer
 * ------------------------------------------------------------------ */

interface ExtractedEvent {
  category: EventCategory;
  /** Canonical label from the lexicon, e.g. "Headache". */
  label: string;
  sentence: string;
  matched: string;
  confidence: ExtractionConfidence;
  time: TimeMatch;
  frequency: string | null;
  change: string | null;
  severity: string | null;
  context: string | null;
  /** Ready-made label for the UI; keeps date wording in one place. */
  timeLabel: string;
}

function extractSentences(sentences: string[], now: Date, fallback: TimeMatch | null): ExtractedEvent[] {
  const out: ExtractedEvent[] = [];

  for (const sentence of sentences) {
    const own = findTime(sentence, now);
    const time = own.precision === "unknown" && fallback ? fallback : own;

    const freq = firstCue(sentence, FREQUENCY_CUES);
    const change = firstCue(sentence, CHANGE_CUES);
    const severity = firstCue(sentence, SEVERITY_CUES);
    const hasContextCue = CONTEXT_CUES.some((c) => c.test(sentence));

    for (const category of CATEGORY_ORDER) {
      const findings = matchLexicon(sentence, LEXICONS[category as keyof typeof LEXICONS]);

      for (const f of findings) {
        // `context` is derived from situation words rather than a named item,
        // so it only becomes an event when the sentence also says *when* or
        // *what* it applies to. Otherwise every "during" would spawn a card.
        if (category === "context" && !hasContextCue) continue;

        out.push({
          category,
          label: f.entry.label,
          sentence,
          matched: f.matched,
          confidence: f.entry.confidence,
          time,
          frequency: freq?.label ?? null,
          change: change?.label ?? null,
          severity: severity?.label ?? null,
          context: hasContextCue ? asQuote(sentence) : null,
          timeLabel: time.label,
        });
      }
    }
  }

  return out;
}

/**
 * Groups repeated mentions of the same thing.
 *
 * Saying "I've been getting headaches" three times is one reported symptom
 * with three quotes, not three cards. Evidence is pooled onto a single event
 * so nothing is lost by merging.
 */
function groupDuplicates(events: ExtractedEvent[]): AnalyzedEvent[] {
  const groups = new Map<string, ExtractedEvent[]>();

  for (const e of events) {
    const key = `${e.category}::${normalize(e.label)}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(e);
    else groups.set(key, [e]);
  }

  const built: AnalyzedEvent[] = [];

  for (const bucket of groups.values()) {
    // Prefer the most specific statement about frequency or change; the least
    // specific is usually the vague opening line.
    const representative =
      bucket.find((e) => e.frequency && e.change) ??
      bucket.find((e) => e.change) ??
      bucket.find((e) => e.frequency) ??
      bucket[0];

    const evidence: EvidenceQuote[] = [];
    const seen = new Set<string>();
    for (const e of bucket) {
      const q = asQuote(e.sentence);
      const key = normalize(q);
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push(quote(e.sentence, "mention"));
    }

    const time =
      representative.time.precision !== "unknown"
        ? representative.time
        : bucket.find((e) => e.time.precision !== "unknown")?.time ?? representative.time;

    const confidence = weakestConfidence(bucket.map((e) => e.confidence));

    built.push(
      toAnalyzedEvent({
        id: makeId("ev"),
        date: time.date,
        dateLabel: time.label,
        datePrecision: time.precision,
        description: representative.sentence,
        frequency: representative.frequency,
        change: representative.change,
        notes: "",
        origin: "ai",
        title: condense(representative.sentence),
        category: representative.category,
        dateText: time.text,
        severity: representative.severity,
        context: representative.context,
        sourceText: representative.sentence,
        evidence,
        mentions: bucket.length,
        label: representative.label,
        timeLabel: time.label,
        extractionConfidence: confidence,
        status: "AI_ORGANIZED",
        needsConfirmation: true,
      }),
    );
  }

  return built;
}

/* ------------------------------------------------------------------ *
 * Change detection
 * ------------------------------------------------------------------ */

const DIMENSION_CUES: { dimension: string; pattern: RegExp }[] = [
  { dimension: "Sleep", pattern: /\bsleep/i },
  { dimension: "Study", pattern: /\bstud(?:y|ying)\b|\bexam/i },
  { dimension: "Activity", pattern: /\bexercis|\bexercise|\bactivity|\bwalk(?:ing)?\b|\brunning\b/i },
  { dimension: "Diet", pattern: /\b(?:diet|food|eating|water|hydration)\b/i },
  { dimension: "Rest", pattern: /\brest(?:ing)?\b|\bbroke?\b/i },
];

interface ChangeSeed {
  id: string;
  category: string;
  before: string;
  after: string;
  sourceText: string;
  beforeEvidence: string;
  afterEvidence: string;
  confidence: ExtractionConfidence;
}

/**
 * Builds the "What Changed?" comparisons.
 *
 * Two kinds, and only these two:
 *   1. A frequency or wording shift the user expressed with their own
 *      comparative words ("at first ... but recently ...").
 *   2. A dimension the user described at one point in the story and not
 *      before — reported as "Not mentioned → …" rather than a fabricated
 *      "before" state.
 *
 * A comparison is never emitted without two phrases to point at, because an
 * unsupported before/after pair is exactly the kind of invention this product
 * exists to avoid.
 */
function detectChanges(
  sentences: string[],
  events: AnalyzedEvent[],
  now: Date,
  panelChange: string | null,
): { changes: HealthChange[]; seeds: ChangeSeed[] } {
  const seeds: ChangeSeed[] = [];

  /* --- 1. explicit comparative frequency shift --- */
  const freqRanks: { label: string; rank: number; sentence: string }[] = [];

  for (const sentence of sentences) {
    const cue = firstCue(sentence, FREQUENCY_CUES);
    if (!cue) continue;
    const rank = FREQUENCY_RANK[cue.label] ?? 0;
    if (!rank) continue;
    freqRanks.push({ label: cue.label, rank, sentence });
  }

  // A shift needs a comparator in the text. Without one, two frequency words
  // in different sentences are two facts, not a change.
  const hasComparator = sentences.some((s) => COMPARISON_MARKERS.some((m) => m.test(s)));

  if (hasComparator && freqRanks.length >= 2) {
    const sorted = [...freqRanks].sort((a, b) => a.rank - b.rank);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (first.label !== last.label && first.rank !== last.rank) {
      seeds.push({
        id: makeId("chg"),
        category: "Frequency",
        before: first.label,
        after: last.label,
        sourceText: asQuote(last.sentence),
        beforeEvidence: asQuote(first.sentence),
        afterEvidence: asQuote(last.sentence),
        confidence: "high",
      });
    }
  }

  /* --- 2. explicit directional wording --- */
  const seenDirections = new Set<string>();
  for (const sentence of sentences) {
    const cue = firstCue(sentence, CHANGE_CUES);
    if (!cue) continue;
    const direction = (cue as { direction?: string }).direction;
    if (!direction || direction === "neutral") continue;
    if (seenDirections.has(direction)) continue;
    seenDirections.add(direction);

    const isUp = direction === "up";
    seeds.push({
      id: makeId("chg"),
      category: "Reported pattern",
      before: isUp ? "Reported as less frequent" : "Reported as more frequent",
      after: isUp ? "Reported as more frequent" : "Reported as less frequent",
      sourceText: asQuote(sentence),
      beforeEvidence: "",
      afterEvidence: asQuote(sentence),
      confidence: "high",
    });
  }

  /* --- 3. dimension first mentioned, never mentioned before --- */
  for (const { dimension, pattern } of DIMENSION_CUES) {
    const match = events.find(
      (e) =>
        (e.category === "lifestyle" || e.category === "context" || e.category === "treatment") &&
        pattern.test(e.sourceText) &&
        !seeds.some((s) => s.category === dimension),
    );
    if (!match) continue;
    // Only a *change of state* counts. "I drink more water" with no earlier
    // state is a lifestyle fact, not evidence that sleep changed.
    if (!CHANGE_CUES.some((c) => c.patterns.some((p) => p.test(match.sourceText)))) continue;

    seeds.push({
      id: makeId("chg"),
      category: dimension,
      before: "Not mentioned",
      after: condense(match.sourceText),
      sourceText: asQuote(match.sourceText),
      beforeEvidence: "",
      afterEvidence: asQuote(match.sourceText),
      confidence: "medium",
    });
  }

  /* --- 4. the structured panel's own change answer --- */
  if (panelChange && panelChange !== "Not sure") {
    const isWorse = panelChange === "Getting worse";
    const isBetter = panelChange === "Getting better";
    if (isWorse || isBetter) {
      seeds.push({
        id: makeId("chg"),
        category: "Reported pattern",
        before: "Not specified",
        after: panelChange,
        sourceText: "You selected this in the details panel.",
        beforeEvidence: "",
        afterEvidence: "",
        confidence: "high",
      });
    }
  }

  const changes: HealthChange[] = seeds.map((s) => ({
    id: s.id,
    category: s.category,
    before: s.before,
    after: s.after,
    // Reporting language only. The comparison is between two things the user
    // wrote, never an explanation of why anything happened.
    description:
      s.before === "Not mentioned" || s.before === "Not specified"
        ? `${s.category} was not mentioned earlier in your story. You reported: "${s.after}".`
        : `You reported ${s.category.toLowerCase()} changing from "${s.before}" to "${s.after}".`,
    sourceText: s.afterEvidence || s.sourceText,
    confidence: s.confidence,
  }));

  return { changes, seeds };
}

/* ------------------------------------------------------------------ *
 * Story summary
 * ------------------------------------------------------------------ */

/**
 * One paragraph, assembled only from reported items.
 *
 * Built by concatenating what was found, never by interpreting it. There is no
 * template that could produce a sentence the user's story does not support,
 * because every clause is either a reported label or a quoted phrase.
 */
function buildSummary(
  events: AnalyzedEvent[],
  changes: HealthChange[],
): string {
  const clauses: string[] = [];

  const symptoms = events.filter((e) => e.category === "symptom");
  const other = events.filter((e) => e.category !== "symptom");

  if (symptoms.length > 0) {
    const names = symptoms.map((e) => e.label.toLowerCase());
    clauses.push(`You reported ${listWords(names)}`);
  }

  const start = events.find((e) => e.timeLabel && e.timeLabel !== "Date not provided");
  if (start) {
    clauses.push(`first noted around ${shortLabel(start.timeLabel)}`);
  }

  const freq = events.find((e) => e.frequency)?.frequency;
  if (freq && !symptoms.length) clauses.push(`occurring ${freq.toLowerCase()}`);

  for (const change of changes.slice(0, 2)) {
    if (change.category === "Frequency") {
      clauses.push(`with frequency changing from ${change.before.toLowerCase()} to ${change.after.toLowerCase()}`);
    }
  }

  const lifestyle = other.filter((e) => e.category === "lifestyle");
  if (lifestyle.length > 0) {
    clauses.push(`You also reported ${listWords(lifestyle.slice(0, 2).map((e) => e.label.toLowerCase()))}`);
  }

  const treatment = other.filter((e) => e.category === "treatment");
  if (treatment.length > 0) {
    clauses.push(`and mentioned ${listWords(treatment.slice(0, 2).map((e) => e.label.toLowerCase()))}`);
  }

  const context = other.filter((e) => e.category === "context");
  if (context.length > 0) {
    const quoted = context[0].sourceText;
    clauses.push(`Some of this was reported in relation to "${tidy(quoted)}"`);
  }

  if (clauses.length === 0) {
    return "Your story has been recorded. Add a little more detail and we'll organize it into a timeline.";
  }

  const sentence = clauses.join(", ") + ".";
  return capitalize(sentence);
}

/* ------------------------------------------------------------------ *
 * The synchronous pass
 * ------------------------------------------------------------------ */

function analyzeSync(story: HealthStory, now: Date): OrganizedStory {
  const text = story.storyText.trim();
  const details = story.details;
  const panelStart = resolvePanelStart(story, now);

  const allText = [
    story.storyText,
    ...story.events.map((e) => `${e.description} ${e.notes}`),
    details.notes,
    details.frequency ?? "",
    details.change ?? "",
  ]
    .join(" ")
    .trim();

  const sentences = text ? splitSentences(text) : [];

  /* ---- extract ---- */
  const fallbackTime = panelStart ?? findTime(text, now);
  const raw = extractSentences(sentences, now, fallbackTime.precision === "unknown" ? null : fallbackTime);
  const events = groupDuplicates(raw);

  /* ---- symptoms index (Stage 2 view, kept alive) ---- */
  const symptomCounts = new Map<string, { label: string; matched: string; mentions: number }>();
  for (const e of events.filter((x) => x.category === "symptom")) {
    const existing = symptomCounts.get(e.label);
    if (existing) existing.mentions += e.mentions ?? 1;
    else
      symptomCounts.set(e.label, {
        label: e.label,
        matched: e.sourceText ?? e.label,
        mentions: e.mentions ?? 1,
      });
  }
  const symptoms: SymptomItem[] = [...symptomCounts.values()]
    .sort((a, b) => b.mentions - a.mentions)
    .map((s) => ({
      id: makeId("symptom"),
      label: s.label,
      matchedPhrase: s.matched,
      mentions: s.mentions,
      provenance: "ai",
    }));

  /* ---- user-typed events pass through as CONFIRMED ---- */
  const userEvents: AnalyzedEvent[] = story.events.map((e) => toAnalyzedEvent({ ...e, origin: "user" }));

  /* ---- the panel's start answer becomes a confirmed entry ---- */
  if (panelStart) {
    userEvents.unshift(
      toAnalyzedEvent({
        id: makeId("ev"),
        date: panelStart.date,
        dateLabel: panelStart.label,
        datePrecision: panelStart.precision,
        description: "First noticed",
        frequency: details.frequency,
        change: details.change,
        notes: "",
        origin: "user",
        title: "First noticed",
        category: "other",
        dateText: panelStart.text,
        severity: null,
        context: null,
        sourceText: "You set this in the details panel.",
        evidence: [
          {
            id: makeId("ev"),
            text: `Start: ${START_LABELS[details.start ?? ""] ?? panelStart.text}`,
            field: "date",
          },
        ],
        mentions: 1,
        extractionConfidence: "high",
        status: "CONFIRMED",
        needsConfirmation: false,
      }),
    );
  }

  const allEvents = [...userEvents, ...events];

  /* ---- date claims for conflict detection ---- */
  const claims: DateClaim[] = sentences
    .map((s) => {
      const t = findTime(s, now);
      return { iso: t.date, text: t.text, sentence: s, precision: t.precision };
    })
    .filter((c) => c.iso !== null);

  if (panelStart?.date) {
    claims.push({
      iso: panelStart.date,
      text: panelStart.text,
      sentence: "Start date chosen in the details panel.",
      precision: panelStart.precision,
    });
  }

  const unclear: UnclearItem[] = detectConflicts(claims);

  /* ---- events with no usable date get their own section, never a guess ---- */
  const dated = allEvents.filter((e) => e.date !== null);
  const undated = allEvents.filter((e) => e.date === null);

  /* ---- timeline ---- */
  const timeline: TimelineEntry[] = [...dated, ...undated]
    .sort((a, b) => {
      if (a.date && b.date) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return 0;
      }
      // Undated entries sit in their own section, after the ordered timeline.
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    })
    .map((e) => ({
      id: e.id,
      period: e.dateLabel,
      headline: e.origin === "user" ? e.title || e.description : condense(e.description),
      detail: detailFor(e),
      provenance: e.origin,
      precision: e.datePrecision,
    }));

  /* ---- changes ---- */
  const { changes } = detectChanges(sentences, events, now, details.change);

  /* ---- notable changes (Stage 2 view) ---- */
  const notableChanges: NotableChange[] = changes.map((c) => ({
    id: c.id,
    text: `${c.category}: ${c.before} → ${c.after}`,
    direction:
      /more|increased|worse|higher/i.test(c.after)
        ? "up"
        : /less|decreased|better|lower/i.test(c.after)
          ? "down"
          : "neutral",
    evidence: c.sourceText,
  }));

  /* ---- summary ---- */
  const summary = buildSummary(events, changes);

  /* ---- context / other (Stage 2 views) ---- */
  const context: string[] = [
    ...new Set(events.filter((e) => e.category === "context").map((e) => tidy(e.sourceText))),
  ];
  const other: string[] = [];
  if (details.notes.trim()) other.push(details.notes.trim());
  for (const e of userEvents) if (e.notes.trim()) other.push(e.notes.trim());
  for (const doc of story.documents) other.push(`Document attached: ${doc.name}`);

  /* ---- "what is unclear" beyond conflicts ---- */
  const hasAnyDate = allEvents.some((e) => e.datePrecision !== "unknown");
  const hasFrequency = Boolean(details.frequency) || FREQUENCY_CUES.some((f) =>
    f.patterns.some((p) => p.test(allText)),
  );
  const hasSeverity = SEVERITY_CUES.some((s) => s.patterns.some((p) => p.test(allText)));

  if (!hasAnyDate && allText.length > 0) {
    unclear.push({
      id: makeId("unclear"),
      statement: "No timing information was found, so this appears as “Date not provided”.",
      evidence: [],
      resolved: false,
    });
  }
  if (hasAnyDate && !hasFrequency && symptoms.length > 0) {
    unclear.push({
      id: makeId("unclear"),
      statement: "How often this happens was not specified.",
      evidence: [],
      resolved: false,
    });
  }
  if (symptoms.length > 0 && !hasSeverity) {
    unclear.push({
      id: makeId("unclear"),
      statement: "Severity was not mentioned in your story.",
      evidence: [],
      resolved: false,
    });
  }

  /* ---- missing information: neutral prompts, never questions about causes ---- */
  const missing: Gap[] = [];
  if (!hasAnyDate) {
    missing.push({
      id: makeId("gap"),
      prompt: "Exact start date not provided.",
      suggest: "A rough time is enough — “a few months back” places it on the timeline.",
    });
  }
  if (!hasFrequency && symptoms.length > 0) {
    missing.push({
      id: makeId("gap"),
      prompt: "Frequency was not specified.",
      suggest: "Adding how often it happens helps show whether it is changing.",
    });
  }
  if (!hasSeverity && symptoms.length > 0) {
    missing.push({
      id: makeId("gap"),
      prompt: "Severity was not mentioned.",
      suggest: "Mild, moderate or severe — in your own words — is enough.",
    });
  }

  /* ---- gaps (Stage 2 view) ---- */
  const gaps: Gap[] = [...missing];
  if (symptoms.length === 0 && text.length > 0) {
    gaps.push({
      id: makeId("gap"),
      prompt: "We couldn't recognise a specific symptom in that description.",
      suggest: "Naming what you feel in everyday words is enough — medical terms aren't needed.",
    });
  }

  /* ---- questions for a healthcare professional ----
     Always about *reporting and preparation*. Never about causes, never
     suggesting a condition or a treatment. */
  const questions: string[] = [];
  if (symptoms.length > 0) {
    questions.push(
      `You mentioned ${listWords(symptoms.slice(0, 3).map((s) => s.label.toLowerCase()))} — is there anything about that pattern you would describe in more detail?`,
    );
  }
  if (changes.some((c) => c.category === "Frequency")) {
    questions.push(
      "Something changed over time in how often you reported this. Which part of that change would you want to describe first?",
    );
  }
  if (events.some((e) => e.category === "lifestyle")) {
    questions.push(
      "You described a change in your routine. How much detail about that would be useful to include?",
    );
  }
  if (events.some((e) => e.category === "test" || e.category === "appointment")) {
    questions.push(
      "You mentioned a test or appointment. Would you like to record what you were told?",
    );
  }
  if (questions.length === 0) {
    questions.push(
      "What would be the most useful thing to add before you take this to an appointment?",
    );
  }

  /* ---- first noticed / recent change ---- */
  const ordered = [...allEvents].filter((e) => e.date !== null).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const time = {
    firstNoticed: panelStart
      ? shortLabel(panelStart.label)
      : ordered.length > 0
        ? shortLabel(ordered[0].dateLabel)
        : null,
    // A "recent change" must be genuinely later than the start. Two entries
    // sharing one approximate month are not evidence of a change, so this
    // stays null and the UI says so.
    recentChange:
      ordered.length > 1 && ordered[ordered.length - 1].date !== ordered[0].date
        ? shortLabel(ordered[ordered.length - 1].dateLabel)
        : null,
  };

  return {
    timeline,
    symptoms,
    time,
    context,
    other,
    notableChanges,
    questions,
    gaps,
    analyzer: LOCAL_INFO,
    summary,
    events: allEvents,
    changes,
    unclear,
    missing,
  };
}

function detailFor(e: AnalyzedEvent): string {
  const parts: string[] = [];
  if (e.frequency) parts.push(`Frequency: ${e.frequency}`);
  if (e.change) parts.push(`Change: ${e.change}`);
  if (e.severity) parts.push(`Severity: ${e.severity}`);
  if (e.notes.trim()) parts.push(e.notes.trim());
  return parts.join(" · ");
}

export const LOCAL_INFO: AnalyzerInfo = {
  id: "local-rules-v2",
  label: "Local rule-based extraction",
  description:
    "Stage 3 runs a deterministic extractor in your browser. It reads symptoms, dates, frequency, change wording and context directly from what you wrote, and keeps your original sentences as evidence. No external AI model is connected.",
  isRealModel: false,
};

/**
 * The single async entry point the UI calls.
 *
 * Kept async and stage-aware so swapping the body for a server route is a
 * drop-in change with no component edits.
 */
export async function analyzeHealthStory(
  story: HealthStory,
  options: AnalyzeOptions = {},
): Promise<OrganizedStory> {
  const now = new Date();

  for (const stage of PIPELINE_STAGES) {
    options.onStage?.(stage);
    if (options.signal?.aborted) {
      throw new DOMException("Analysis cancelled", "AbortError");
    }
    // A short, honest pause so each pipeline stage is legible. Fast enough to
    // stay under the brief's 1–3 second target.
    await new Promise((r) => setTimeout(r, 200));
  }

  return analyzeSync(story, now);
}

export const localAnalyzer: StoryAnalyzer = {
  info: LOCAL_INFO,
  analyze: analyzeHealthStory,
};

export function getAnalyzer(): StoryAnalyzer {
  return localAnalyzer;
}

/**
 * Synchronous pass used for the live preview while typing.
 * Same extraction, no staging delays — it must feel instant.
 */
export function previewOrganizedStory(story: HealthStory): OrganizedStory | null {
  const d = story.details;
  const hasContent =
    story.storyText.trim().length > 0 ||
    story.events.length > 0 ||
    story.documents.length > 0 ||
    Boolean(d.start || d.frequency || d.change || d.notes.trim());
  if (!hasContent) return null;
  return analyzeSync(story, new Date());
}

/* ---------- human-in-the-loop actions ---------- */

/**
 * Applies a user's decision about one event.
 *
 * The returned event carries the decision into the UI as a badge, so the
 * timeline always shows who last touched each entry.
 */
export function applyDecision(
  event: AnalyzedEvent,
  decision: "confirm" | "remove",
): AnalyzedEvent {
  return {
    ...event,
    status: (decision === "confirm" ? "CONFIRMED" : "REMOVED") as EventStatus,
    needsConfirmation: false,
  };
}

export { findTime } from "./dates";
