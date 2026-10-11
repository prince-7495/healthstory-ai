/* =============================================================
   HealthStory AI — Stage 9 analysis layer (part 2)
   Insights, insight validation, story activity feed.
   ============================================================= */

import { nodeIdFor } from "./engine";
import { validateAIOutput } from "@/lib/ai/safety/medicalClaims";
import type {
  StoryFeedItem,
  StoryGraph,
  StoryInsight,
  StoryNode,
} from "./types";
import type { StoryJournal } from "../journal/types";

/* ------------------------------------------------------------------ *
 * Safety validator — insight text is checked before display
 * ------------------------------------------------------------------ */

const BANNED_PHRASES: RegExp[] = [
  /you\s+have\b/i,
  /this\s+proves/i,
  /this\s+indicates/i,
  /likely\s+diagnosis/i,
  /risk\s+of/i,
  /your\s+condition\s+is\s+worsening/i,
  /you\s+are\s+at\s+risk/i,
  /you\s+should\s+see/i,
  /you\s+need\s+medication/i,
  /caused\s+by/i,
  /diagnos/i,
  /prognosis/i,
  /\btreat\s+your/i,
  /\bcur(?:a|e)/i,
];

export function validateStoryInsightText(...texts: string[]): string[] {
  const hits: string[] = [];
  for (const t of texts) {
    for (const re of BANNED_PHRASES) {
      if (re.test(t)) hits.push(re.source);
    }
  }
  return [...new Set(hits)];
}

export interface InsightValidation {
  ok: boolean;
  issues: string[];
}

export function validateStoryInsight(insight: StoryInsight, journal: StoryJournal): InsightValidation {
  const issues: string[] = [];
  const eventIds = new Set(journal.events.map((e) => e.id));
  const topicIds = new Set(journal.topics.map((t) => t.id));
  const docIds = new Set((journal.documents ?? []).map((d) => d.id));

  for (const id of insight.sourceEventIds) if (!eventIds.has(id)) issues.push(`missing event ${id}`);
  for (const id of insight.sourceTopicIds) if (!topicIds.has(id)) issues.push(`missing topic ${id}`);
  for (const id of insight.sourceDocumentIds) if (!docIds.has(id)) issues.push(`missing document ${id}`);

  for (const b of validateStoryInsightText(insight.title, insight.body, insight.why)) {
    issues.push(`unsafe phrasing: ${b}`);
  }

  return { ok: issues.length === 0, issues };
}

/** Defensive filter — an insight that fails validation is never displayed. */
export function isSafeInsight(insight: StoryInsight, journal: StoryJournal): boolean {
  return validateStoryInsight(insight, journal).ok;
}

/* ------------------------------------------------------------------ *
 * Generation helpers
 * ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(iso?: string): string | null {
  if (!iso || iso.length < 10) return null;
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function topicMonths(journal: StoryJournal, eventIds: string[]): string[] {
  const months: string[] = [];
  for (const id of eventIds) {
    const ev = journal.events.find((e) => e.id === id);
    const label = monthLabel(ev?.date ?? undefined);
    if (label && !months.includes(label)) months.push(label);
  }
  return months;
}

function signatureOf(parts: (string | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join("|");
}

/* ------------------------------------------------------------------ *
 * Insight generation
 * ------------------------------------------------------------------ */

export function generateStoryInsights(
  journal: StoryJournal,
  graph: StoryGraph,
  now = new Date(),
): StoryInsight[] {
  const out: StoryInsight[] = [];
  const push = (i: StoryInsight) => out.push(i);

  const liveTopicIds = new Set(
    graph.nodes.filter((n) => n.type === "TOPIC" && n.refId).map((n) => n.refId as string),
  );

  // Repeated topics across dates.
  for (const topic of journal.topics) {
    if (!liveTopicIds.has(topic.id)) continue;
    const days = topic.eventIds
      .map((id) => journal.events.find((e) => e.id === id)?.date)
      .filter((d): d is string => Boolean(d));
    const months = topicMonths(journal, topic.eventIds);
    if (new Set(days).size < 2 && months.length < 2) continue;
    push({
      id: `insight_topic_${topic.id}`,
      type: "REPEATED_TOPIC",
      title: "A topic appears repeatedly",
      body: `You recorded information about “${topic.label}” across ${topic.eventIds.length} entr${topic.eventIds.length === 1 ? "y" : "ies"}${months.length ? ` (${months.join(", ").replace(new RegExp(` ${new Date().getFullYear()}`, "g"), "")})` : ""}.`,
      why: `This insight exists because ${topic.eventIds.length} of your recorded entries mention the same topic.`,
      sourceEventIds: [...topic.eventIds],
      sourceTopicIds: [topic.id],
      sourceDocumentIds: [],
      sourceNodeIds: [nodeIdFor.topic(topic.id)],
      createdAt: now.toISOString(),
      version: 1,
      signature: signatureOf([topic.id, days.join(",")]),
      status: "CURRENT",
    });
  }

  // Corrections the user recorded.
  for (const evo of journal.evolutions) {
    if (evo.changeType !== "correction" || evo.status === "DISMISSED") continue;
    push({
      id: `insight_correction_${evo.id}`,
      type: "CORRECTION",
      title: "A correction was recorded",
      body: `Your later update corrects or replaces an earlier statement about “${evo.category}”.`,
      why: "This insight exists because two of your entries carry different information about the same category.",
      sourceEventIds: [evo.previousEventId, evo.currentEventId].filter((x): x is string => Boolean(x)),
      sourceTopicIds: [],
      sourceDocumentIds: [],
      sourceNodeIds: [],
      createdAt: now.toISOString(),
      version: 1,
      signature: signatureOf([evo.id, evo.status]),
      status: "CURRENT",
    });
  }

  // Open questions.
  const open = (journal.questions ?? []).filter((q) => q.status === "OPEN").length;
  if (open > 0) {
    push({
      id: "insight_open_questions",
      type: "UNRESOLVED_QUESTION",
      title: "A question remains open",
      body:
        open === 1
          ? "One question has not been marked as discussed."
          : `${open} questions have not been marked as discussed.`,
      why: "This insight was created because you have open questions in your story.",
      sourceEventIds: [],
      sourceTopicIds: [],
      sourceDocumentIds: [],
      sourceNodeIds: (journal.questions ?? [])
        .filter((q) => q.status === "OPEN")
        .map((q) => nodeIdFor.question(q.id)),
      createdAt: now.toISOString(),
      version: 1,
      signature: `q_${open}`,
      status: "CURRENT",
    });
  }

  // Document connections.
  for (const d of journal.documents ?? []) {
    if (d.status === "REMOVED") continue;
    const fu = journal.followUps?.find((f) => f.id === d.relatedFollowUpId);
    if (!fu) continue;
    push({
      id: `insight_doc_${d.id}`,
      type: "DOCUMENT_CONNECTION",
      title: "New document connected",
      body: `${d.filename} is linked to a ${fu.type.toLowerCase()} follow-up from ${monthLabel(fu.eventDate ?? fu.createdAt) ?? "your story"}.`,
      why: "This insight exists because you linked this document to a follow-up.",
      sourceEventIds: [],
      sourceTopicIds: [],
      sourceDocumentIds: [d.id],
      sourceNodeIds: [nodeIdFor.document(d.id), nodeIdFor.followUp(fu.id)],
      createdAt: now.toISOString(),
      version: 1,
      signature: signatureOf([d.id, fu.id]),
      status: "CURRENT",
    });
  }

  // Missing information — one collective insight.
  const gaps = (journal.events ?? []).filter((e) => !e.date && e.status !== "REMOVED").length;
  const unlinkedDocs = (journal.documents ?? []).filter(
    (d) => d.status !== "REMOVED" && !journal.followUps?.some((f) => f.id === d.relatedFollowUpId),
  ).length;
  if (gaps > 0 || unlinkedDocs > 0) {
    const bits: string[] = [];
    if (gaps > 0) bits.push(`${gaps} entry ${gaps === 1 ? "is" : "are"} missing an exact date`);
    if (unlinkedDocs > 0) bits.push(`${unlinkedDocs} document ${unlinkedDocs === 1 ? "is" : "are"} not linked`);
    push({
      id: "insight_missing",
      type: "MISSING_INFORMATION",
      title: "Information is missing",
      body: `Your story does not currently contain this information: ${bits.join(", ")}.`,
      why: "This insight was created from the review of your records, not from any external source.",
      sourceEventIds: [],
      sourceTopicIds: [],
      sourceDocumentIds: [],
      sourceNodeIds: [],
      createdAt: now.toISOString(),
      version: 1,
      signature: `missing_${gaps}_${unlinkedDocs}`,
      status: "CURRENT",
    });
  }

  // Conflicts.
  const contradictions = journal.evolutions.filter((e) => e.changeType === "contradiction" && e.status === "AI_ORGANIZED");
  if (contradictions.length > 0) {
    push({
      id: "insight_conflict",
      type: "CONFLICT",
      title: "Information may need review",
      body: `${contradictions.length} ${contradictions.length === 1 ? "statement" : "statements"} in your story may contain conflicting information.`,
      why: "This insight was created because two of your entries contain different statements that you have not yet resolved.",
      sourceEventIds: contradictions
        .flatMap((c) => [c.previousEventId, c.currentEventId])
        .filter((x): x is string => Boolean(x)),
      sourceTopicIds: [],
      sourceDocumentIds: [],
      sourceNodeIds: [],
      createdAt: now.toISOString(),
      version: 1,
      signature: `conflict_${contradictions.length}`,
      status: "CURRENT",
    });
  }

  // Latest update.
  const entries = [...journal.entries].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const latest = entries[entries.length - 1];
  if (latest) {
    push({
      id: "insight_latest",
      type: "NEW_INFORMATION",
      title: "New information recorded",
      body: `Your latest update was recorded ${monthLabel(latest.createdAt) ?? "recently"}.`,
      why: "This insight was created because a new entry was added to your story.",
      sourceEventIds: latest.extractedEventIds,
      sourceTopicIds: [],
      sourceDocumentIds: [],
      sourceNodeIds: latest.extractedEventIds.map((id) => nodeIdFor.event(id)),
      createdAt: now.toISOString(),
      version: 1,
      signature: signatureOf([latest.id, latest.status]),
      status: "CURRENT",
    });
  }

  return out
    .filter((i) => isSafeInsight(i, journal))
    .filter((i) => {
      const hasSources = i.sourceEventIds?.length > 0 || i.sourceTopicIds?.length > 0 || i.sourceDocumentIds?.length > 0;
      const validation = validateAIOutput(i.body ?? i.why ?? '', { hasSources });
      return validation.safe;
    });
}

/* ------------------------------------------------------------------ *
 * Story activity — synthesized audit trail
 * ------------------------------------------------------------------ */

export function buildStoryFeed(journal: StoryJournal): StoryFeedItem[] {
  const feed: StoryFeedItem[] = [];

  for (const a of journal.activity) {
    const headline =
      a.type === "update_added"
        ? "Added an update"
        : a.type === "update_removed"
          ? "Removed an update"
          : a.type === "change_confirmed"
            ? "Confirmed a change"
            : a.type === "change_dismissed"
              ? "Dismissed a change"
              : a.type === "change_edited"
                ? "Edited a change"
                : a.type === "summary_updated"
                  ? "Updated the summary"
                  : a.type === "snapshot_created"
                    ? "Saved a snapshot"
                    : a.type === "story_deleted"
                      ? "Deleted the story"
                      : "Updated your story";
    feed.push({
      id: `act_${a.id}`,
      at: a.at,
      verb: a.type === "change_confirmed" ? "CONFIRMED" : a.type === "change_edited" ? "EDITED" : a.type === "summary_updated" ? "UPDATED" : a.type === "update_removed" ? "REMOVED" : "ADDED",
      headline,
      detail: a.label,
    });
  }

  const entryTime = new Map<string, string>();
  for (const entry of journal.entries) {
    for (const evId of entry.extractedEventIds) entryTime.set(evId, entry.createdAt);
  }

  for (const ev of journal.events) {
    if (ev.status === "REMOVED") continue;
    const at = entryTime.get(ev.id) ?? journal.updatedAt;
    const title = ev.title || ev.description;
    if (ev.status === "AI_ORGANIZED") {
      feed.push({ id: `feed_ai_${ev.id}`, at, verb: "AI_ORGANIZED", headline: "AI organized information", detail: title });
    } else if (ev.status === "CONFIRMED") {
      feed.push({ id: `feed_conf_${ev.id}`, at, verb: "CONFIRMED", headline: "Confirmed an event", detail: title });
    } else if (ev.status === "EDITED") {
      feed.push({ id: `feed_edit_${ev.id}`, at, verb: "EDITED", headline: "Edited an event", detail: title });
    }
  }

  for (const d of journal.documents ?? []) {
    if (d.status === "REMOVED") continue;
    feed.push({ id: `feed_doc_${d.id}`, at: d.createdAt, verb: "ADDED", headline: "Added a document", detail: d.filename });
  }

  for (const f of journal.followUps ?? []) {
    feed.push({ id: `feed_fu_${f.id}`, at: f.createdAt, verb: "ADDED", headline: "Recorded a follow-up", detail: f.originalText.slice(0, 90) });
  }

  for (const q of journal.questions ?? []) {
    if (q.status === "REMOVED") continue;
    feed.push({ id: `feed_q_${q.id}`, at: q.createdAt, verb: "ADDED", headline: "Added a question", detail: q.text });
  }

  for (const link of journal.userLinks ?? []) {
    feed.push({ id: `feed_link_${link.id}`, at: link.createdAt, verb: "LINKED", headline: "Linked two items", detail: link.reason });
  }

  return feed
    .sort((a, b) => (a.at < b.at ? -1 : 1))
    .reverse()
    .slice(0, 40);
}

/* ------------------------------------------------------------------ *
 * "What I Have Recorded" inventory + topic clusters for Evidence
 * ------------------------------------------------------------------ */

export interface InventoryItem {
  label: string;
  count: number;
  node?: StoryNode;
}

export function buildInventory(journal: StoryJournal, graph: StoryGraph): InventoryItem[] {
  return [
    {
      label: "Confirmed events",
      count: journal.events.filter((e) => e.status === "CONFIRMED").length,
    },
    {
      label: "Recorded topics",
      count: journal.topics.length,
    },
    {
      label: "Connected documents",
      count: (journal.documents ?? []).filter((d) => d.status !== "REMOVED").length,
    },
    {
      label: "Follow-ups",
      count: (journal.followUps ?? []).length,
    },
    {
      label: "Open questions",
      count: (journal.questions ?? []).filter((q) => q.status === "OPEN").length,
      node: graph.nodes.find((n) => n.type === "QUESTION"),
    },
  ];
}

export interface TopicCluster {
  topicNode: StoryNode;
  events: StoryNode[];
  documents: StoryNode[];
  followUps: StoryNode[];
  questions: StoryNode[];
}

export function buildTopicClusters(graph: StoryGraph): TopicCluster[] {
  const clusters: TopicCluster[] = [];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const neighbors = new Map<string, StoryNode[]>();
  for (const rel of graph.relationships) {
    const a = byId.get(rel.fromNodeId);
    const b = byId.get(rel.toNodeId);
    if (!a || !b) continue;
    if (!neighbors.has(a.id)) neighbors.set(a.id, []);
    if (!neighbors.has(b.id)) neighbors.set(b.id, []);
    neighbors.get(a.id)!.push(b);
    neighbors.get(b.id)!.push(a);
  }

  for (const topic of graph.nodes.filter((n) => n.type === "TOPIC")) {
    const close = neighbors.get(topic.id) ?? [];
    const bucket = (type: string) => close.filter((n) => n.type === type);
    clusters.push({
      topicNode: topic,
      events: bucket("EVENT"),
      documents: bucket("DOCUMENT").filter(
        (d, i, arr) => arr.findIndex((x) => x.id === d.id) === i,
      ),
      followUps: bucket("FOLLOW_UP"),
      questions: bucket("QUESTION"),
    });
  }
  return clusters.sort((a, b) => b.events.length - a.events.length);
}