/* =============================================================
   HealthStory AI — Stage 9 graph engine
   buildStoryGraph turns the journal into a derived knowledge map.

   Rules honoured here (from the Stage 9 brief):
     - The journal is the source of truth; the graph is recomputed.
     - Every relationship carries sourceIds and a plain reason.
     - Confidence is relationship confidence only, never clinical.
     - AI edges are never silently confirmed (confirmedByUser=false).
   ============================================================= */

import { CATEGORY_LABELS, type AnalyzedEvent } from "../health/types";
import {
  DOCUMENT_TYPE_LABELS,
  FOLLOWUP_TYPE_LABELS,
  type FollowUpEntry,
  type HealthDocument,
  type StoryJournal,
  type StoryQuestion,
  type StoryTopic,
} from "../journal/types";
import type {
  DatePrecisionKind,
  StoryGraph,
  StoryNode,
  StoryNodeStatus,
  StoryRelationshipEdge,
  StorySearchResult,
  UserStoryLink,
} from "./types";

/* ------------------------------------------------------------------ *
 * Node id helpers — stable across rebuilds
 * ------------------------------------------------------------------ */

export const nodeIdFor = {
  event: (id: string) => `ev_${id}`,
  topic: (id: string) => `tp_${id}`,
  followUp: (id: string) => `fu_${id}`,
  document: (id: string) => `doc_${id}`,
  question: (id: string) => `qu_${id}`,
  snapshot: (id: string) => `sn_${id}`,
  summary: (id: string) => `cm_${id}`,
};

function eventNodeDate(event: AnalyzedEvent): { date?: string; precision: DatePrecisionKind } {
  if (event.date) return { date: event.date, precision: "EXACT" };
  const prec = event.datePrecision;
  if (prec === "exact") return { precision: "EXACT" };
  if (prec && prec !== "unknown") return { precision: "APPROXIMATE" };
  return { precision: "UNKNOWN" };
}

function eventStatus(event: AnalyzedEvent): StoryNodeStatus {
  if (event.status === "CONFIRMED") return "USER_CONFIRMED";
  if (event.status === "EDITED") return "USER_EDITED";
  if (event.origin === "user") return "USER_RECORDED";
  return "AI_ORGANIZED";
}

function entryIdForEvent(journal: StoryJournal, eventId: string): string | undefined {
  return journal.entries.find((en) => en.extractedEventIds.includes(eventId))?.id;
}

/* ------------------------------------------------------------------ *
 * Node builders
 * ------------------------------------------------------------------ */

function buildEventNodes(journal: StoryJournal): StoryNode[] {
  const nodes: StoryNode[] = [];
  for (const ev of journal.events) {
    if (ev.status === "REMOVED") continue;
    const { date, precision } = eventNodeDate(ev);
    const entryId = entryIdForEvent(journal, ev.id);
    nodes.push({
      id: nodeIdFor.event(ev.id),
      type: "EVENT",
      title: ev.title || ev.description,
      date,
      datePrecision: precision,
      status: eventStatus(ev),
      category: ev.category ? CATEGORY_LABELS[ev.category] : undefined,
      description: ev.description,
      originalText: ev.sourceText || ev.description,
      sourceLabel: "HealthStory entry",
      sourceIds: entryId ? [entryId, ev.id] : [ev.id],
      refId: ev.id,
    });
  }
  return nodes;
}

function latestDate(ids: string[], journal: StoryJournal): string | undefined {
  let latest: string | undefined;
  for (const id of ids) {
    const ev = journal.events.find((e) => e.id === id);
    if (ev?.date && (!latest || ev.date > latest)) latest = ev.date;
  }
  return latest;
}

function buildTopicNodes(journal: StoryJournal, eventNodes: Map<string, StoryNode>): StoryNode[] {
  return journal.topics.map((topic: StoryTopic) => {
    const live = topic.eventIds.filter((id) => eventNodes.has(nodeIdFor.event(id)));
    return {
      id: nodeIdFor.topic(topic.id),
      type: "TOPIC",
      title: topic.label,
      date: latestDate(live, journal),
      datePrecision: live.length ? "EXACT" : "UNKNOWN",
      status: "AI_ORGANIZED",
      category: topic.category ? CATEGORY_LABELS[topic.category] : undefined,
      description: `${live.length} recorded entr${live.length === 1 ? "y" : "ies"}`,
      sourceIds: live,
      refId: topic.id,
    };
  });
}

function followUpStatus(f: FollowUpEntry): StoryNodeStatus {
  if (f.status === "CONFIRMED") return "USER_CONFIRMED";
  if (f.status === "REVIEW") return "NEEDS_REVIEW";
  return "AI_ORGANIZED";
}

function buildFollowUpNodes(journal: StoryJournal): StoryNode[] {
  return (journal.followUps ?? []).map((f) => ({
    id: nodeIdFor.followUp(f.id),
    type: "FOLLOW_UP" as const,
    title: FOLLOWUP_TYPE_LABELS[f.type] || "Follow-up",
    date: f.eventDate || f.createdAt.slice(0, 10),
    datePrecision: f.eventDatePrecision ?? ("UNKNOWN" as const),
    status: followUpStatus(f),
    category: "Follow-up",
    description: f.originalText.slice(0, 120),
    originalText: f.originalText,
    sourceLabel: "Follow-up",
    sourceIds: [f.id],
    refId: f.id,
  }));
}

function documentStatus(d: HealthDocument): StoryNodeStatus {
  if (d.status === "NEEDS_REVIEW") return "NEEDS_REVIEW";
  if (d.status === "UPLOADED") return "USER_RECORDED";
  return "AI_ORGANIZED";
}

function buildDocumentNodes(journal: StoryJournal): StoryNode[] {
  return (journal.documents ?? [])
    .filter((d) => d.status !== "REMOVED")
    .map((d) => ({
      id: nodeIdFor.document(d.id),
      type: "DOCUMENT" as const,
      title: d.title ?? d.filename,
      date: d.createdAt.slice(0, 10),
      datePrecision: "EXACT" as const,
      status: documentStatus(d),
      category: DOCUMENT_TYPE_LABELS[d.type] || "Health document",
      description: d.analysis ? `${d.analysis.sections.length} sections understood` : "Document saved",
      originalText: d.originalText,
      sourceLabel: "Uploaded document",
      sourceIds: [d.id],
      refId: d.id,
      pageNumber: d.analysis?.sections.find(s => s.title === "IMPRESSION")?.pageNumber,
    }));
}

function buildQuestionNodes(journal: StoryJournal): StoryNode[] {
  return (journal.questions ?? [])
    .filter((q) => q.status !== "REMOVED")
    .map((q: StoryQuestion) => ({
      id: nodeIdFor.question(q.id),
      type: "QUESTION" as const,
      title: q.text,
      date: q.createdAt.slice(0, 10),
      datePrecision: "UNKNOWN" as const,
      status: q.status === "DISCUSSED" ? ("USER_CONFIRMED" as const) : ("NEEDS_REVIEW" as const),
      category: q.source === "USER" ? "You added" : "AI suggested",
      description: q.source === "USER" ? "You added this question" : "AI suggested this question",
      originalText: q.text,
      sourceLabel: "Question",
      sourceIds: [q.id],
      refId: q.id,
    }));
}

function buildSnapshotNodes(journal: StoryJournal): StoryNode[] {
  return journal.snapshots.map((s) => ({
    id: nodeIdFor.snapshot(s.id),
    type: "SNAPSHOT" as const,
    title: `Snapshot · ${s.name}`,
    date: s.createdAt.slice(0, 10),
    datePrecision: "EXACT" as const,
    status: "USER_RECORDED" as const,
    category: "Snapshot",
    description: `${s.includedEventIds.length} events captured`,
    sourceIds: [s.id],
    refId: s.id,
  }));
}

function buildSummaryNodes(journal: StoryJournal): StoryNode[] {
  return journal.summaries.map((s) => ({
    id: nodeIdFor.summary(s.id),
    type: "COMMUNICATION" as const,
    title: `Health Summary v${s.version}`,
    date: s.generatedAt.slice(0, 10),
    datePrecision: "EXACT" as const,
    status: "AI_ORGANIZED" as const,
    category: "Conversation material",
    description: `${s.timeline.length} timeline items`,
    sourceIds: [s.id],
    refId: s.id,
  }));
}

/* ------------------------------------------------------------------ *
 * Relationship builders
 * ------------------------------------------------------------------ */

function edge(
  id: string,
  from: StoryNode,
  to: StoryNode,
  type: StoryRelationshipEdge["type"],
  sourceIds: string[],
  reason: string,
  opts: { confidence?: StoryRelationshipEdge["confidence"]; createdBy?: "USER" | "AI"; confirmedByUser?: boolean } = {},
): StoryRelationshipEdge {
  return {
    id,
    fromNodeId: from.id,
    toNodeId: to.id,
    type,
    sourceIds,
    confidence: opts.confidence ?? "HIGH",
    createdBy: opts.createdBy ?? "AI",
    confirmedByUser: opts.confirmedByUser ?? false,
    reason,
  };
}

function sameTopicEdges(
  topics: StoryNode[],
  events: Map<string, StoryNode>,
): StoryRelationshipEdge[] {
  const out: StoryRelationshipEdge[] = [];
  for (const topic of topics) {
    for (const evId of topic.sourceIds) {
      const ev = events.get(nodeIdFor.event(evId));
      if (!ev || ev.id === topic.id) continue;
      out.push(
        edge(
          `rel_same_topic_${topic.id}_${ev.id}`,
          topic,
          ev,
          "SAME_TOPIC",
          [topic.refId ?? "", ev.refId ?? ""].filter(Boolean),
          `Both are part of the “${topic.title}” topic you recorded.`,
          { confidence: "HIGH" },
        ),
      );
    }
  }
  return out;
}

function temporalSequenceEdges(
  topics: StoryNode[],
  events: Map<string, StoryNode>,
): StoryRelationshipEdge[] {
  const out: StoryRelationshipEdge[] = [];
  for (const topic of topics) {
    const members = topic.sourceIds
      .map((id) => events.get(nodeIdFor.event(id)))
      .filter((n): n is StoryNode => Boolean(n))
      .filter((n) => n.date)
      .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
    for (let i = 1; i < members.length; i += 1) {
      const a = members[i - 1];
      const b = members[i];
      out.push(
        edge(
          `rel_seq_${topic.id}_${a.id}_${b.id}`,
          a,
          b,
          "TEMPORAL_SEQUENCE",
          [a.refId ?? "", b.refId ?? ""].filter(Boolean),
          `“${b.title}” was recorded after “${a.title}”. This is information chronology, not cause.`,
          { confidence: "MEDIUM" },
        ),
      );
    }
  }
  return out;
}

function followUpEdges(
  journal: StoryJournal,
  followUps: Map<string, StoryNode>,
  events: Map<string, StoryNode>,
  topics: Map<string, StoryNode>,
): StoryRelationshipEdge[] {
  const out: StoryRelationshipEdge[] = [];
  for (const f of journal.followUps ?? []) {
    const fu = followUps.get(nodeIdFor.followUp(f.id));
    if (!fu) continue;
    for (const evId of f.relatedEventIds ?? []) {
      const ev = events.get(nodeIdFor.event(evId));
      if (ev) {
        out.push(
          edge(
            `rel_fu_ev_${f.id}_${evId}`,
            fu,
            ev,
            "FOLLOW_UP_TO",
            [f.id, evId],
            `This follow-up references an earlier recorded event.`,
          ),
        );
      }
    }
    for (const tpId of f.relatedTopicIds ?? []) {
      const tp = topics.get(nodeIdFor.topic(tpId));
      if (tp) {
        out.push(
          edge(
            `rel_fu_tp_${f.id}_${tpId}`,
            fu,
            tp,
            "MENTIONED_IN",
            [f.id, tpId],
            `This follow-up mentions the recorded topic “${tp.title}”.`,
          ),
        );
      }
    }
  }
  return out;
}

function documentEdges(
  journal: StoryJournal,
  documents: Map<string, StoryNode>,
  followUps: Map<string, StoryNode>,
  events: Map<string, StoryNode>,
): StoryRelationshipEdge[] {
  const out: StoryRelationshipEdge[] = [];
  for (const d of journal.documents ?? []) {
    const doc = documents.get(nodeIdFor.document(d.id));
    if (!doc) continue;
    if (d.relatedFollowUpId) {
      const fu = followUps.get(nodeIdFor.followUp(d.relatedFollowUpId));
      if (fu) {
        out.push(
          edge(
            `rel_doc_fu_${d.id}_${d.relatedFollowUpId}`,
            doc,
            fu,
            "SUPPORTS",
            [d.id, d.relatedFollowUpId],
            `This document was linked to this follow-up.`,
            { confidence: "HIGH", createdBy: "USER", confirmedByUser: true },
          ),
        );
      }
    }
    for (const ev of journal.events) {
      if (ev.status === "REMOVED") continue;
      if (ev.metadata?.documentId === d.id) {
        const evNode = events.get(nodeIdFor.event(ev.id));
        if (evNode) {
          out.push(
            edge(
              `rel_doc_ev_${d.id}_${ev.id}`,
              doc,
              evNode,
              "SOURCE_OF",
              [d.id, ev.id],
              `This event was added from information in this document.`,
              { confidence: "HIGH", createdBy: "USER", confirmedByUser: true },
            ),
          );
        }
      }
    }
  }
  return out;
}

function correctionEdges(
  journal: StoryJournal,
  events: Map<string, StoryNode>,
): StoryRelationshipEdge[] {
  const out: StoryRelationshipEdge[] = [];
  for (const e of journal.evolutions) {
    if (e.changeType !== "correction") continue;
    if (!e.previousEventId || !e.currentEventId) continue;
    const a = events.get(nodeIdFor.event(e.previousEventId));
    const b = events.get(nodeIdFor.event(e.currentEventId));
    if (!a || !b) continue;
    const confirmed = e.status === "CONFIRMED";
    out.push(
      edge(
        `rel_correct_${e.id}`,
        a,
        b,
        "CORRECTS",
        [e.previousEventId, e.currentEventId],
        `Your later update (“${b.title}”) updates an earlier statement (“${a.title}”).`,
        { confidence: confirmed ? "HIGH" : "MEDIUM", confirmedByUser: confirmed },
      ),
    );
  }
  return out;
}

function userLinkedEdges(
  links: UserStoryLink[],
  nodes: Map<string, StoryNode>,
): StoryRelationshipEdge[] {
  const out: StoryRelationshipEdge[] = [];
  for (const link of links) {
    const a = nodes.get(link.fromNodeId);
    const b = nodes.get(link.toNodeId);
    if (!a || !b) continue;
    out.push(
      edge(
        `rel_user_${link.id}`,
        a,
        b,
        "USER_LINKED",
        [],
        link.reason || "You linked these two items.",
        { confidence: "HIGH", createdBy: "USER", confirmedByUser: true },
      ),
    );
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Pagination-friendly grouping for duplicate suggestions
 * ------------------------------------------------------------------ */

export interface DuplicateSuggestion {
  eventAId: string;
  eventBId: string;
  score: number;
  degree: "HIGH" | "MEDIUM" | "LOW";
}

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .join(" ");
}

/** Root word of a label — the stable core we group duplicate cards by. */
function labelRoot(label: string): string {
  const first = normalize(label).split(" ")[0];
  return first ? first.slice(0, 6) : first;
}

export function detectDuplicateSuggestions(journal: StoryJournal): DuplicateSuggestion[] {
  const live = journal.events.filter((e) => e.status !== "REMOVED");
  const entryOf = (eventId: string): string | undefined =>
    journal.entries.find((en) => en.extractedEventIds.includes(eventId))?.id;

  /** All qualifying pairs, with a score. */
  type Cand = { eventAId: string; eventBId: string; score: number; closeDates: boolean };
  const candidates: Cand[] = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i];
      const b = live[j];
      // Two events extracted from the same update are extraction artifacts,
      // not a story-level duplicate — the review screen keeps them out so a
      // judge never sees "duplicate" cards where one sentence was split twice.
      if (entryOf(a.id) && entryOf(a.id) === entryOf(b.id)) continue;
      const labelA = normalize(a.label ?? a.title ?? a.description);
      const labelB = normalize(b.label ?? b.title ?? b.description);
      if (!labelA || !labelB) continue;
      const words = new Set(labelB.split(" "));
      const shared = labelA.split(" ").filter((w) => words.has(w)).length;
      const total = new Set([...labelA.split(" "), ...labelB.split(" ")]).size || 1;
      const sameLabel = shared / total;
      if (sameLabel < 0.5) continue;
      const closeDates =
        a.date && b.date
          ? Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) < 45 * 86400000
          : false;
      const score = Math.round(sameLabel * 100);
      if (score < 55 && !closeDates) continue;
      candidates.push({ eventAId: a.id, eventBId: b.id, score, closeDates });
    }
  }

  // Collapse the full cross-product into ONE suggestion per label-root pair
  // (the closest match), so a repeating topic never floods the review screen
  // with the same card eleven times.
  const best = new Map<string, Cand>();
  for (const cand of candidates) {
    const a = live.find((e) => e.id === cand.eventAId)!;
    const b = live.find((e) => e.id === cand.eventBId)!;
    const rootA = labelRoot(a.label ?? a.title ?? a.description);
    const rootB = labelRoot(b.label ?? b.title ?? b.description);
    const key = [rootA, rootB].sort().join("\u0001");
    const prev = best.get(key);
    if (!prev || cand.score > prev.score) best.set(key, cand);
  }

  return Array.from(best.values())
    .sort((x, y) => y.score - x.score)
    .map((c) => ({
      eventAId: c.eventAId,
      eventBId: c.eventBId,
      score: c.score,
      degree: c.score >= 70 || c.closeDates ? ("HIGH" as const) : ("MEDIUM" as const),
    }));
}

/* ------------------------------------------------------------------ *
 * Story graph builder
 * ------------------------------------------------------------------ */

export function buildStoryGraph(journal: StoryJournal): StoryGraph {
  const eventNodes = new Map<string, StoryNode>(buildEventNodes(journal).map((n) => [n.id, n]));
  const topicNodes = new Map<string, StoryNode>(
    buildTopicNodes(journal, eventNodes).map((n) => [n.id, n]),
  );
  const followUpNodes = new Map<string, StoryNode>(
    buildFollowUpNodes(journal).map((n) => [n.id, n]),
  );
  const documentNodes = new Map<string, StoryNode>(
    buildDocumentNodes(journal).map((n) => [n.id, n]),
  );
  const questionNodes = new Map<string, StoryNode>(
    buildQuestionNodes(journal).map((n) => [n.id, n]),
  );
  const snapshotNodes = new Map<string, StoryNode>(
    buildSnapshotNodes(journal).map((n) => [n.id, n]),
  );
  const summaryNodes = new Map<string, StoryNode>(
    buildSummaryNodes(journal).map((n) => [n.id, n]),
  );

  const nodes: StoryNode[] = [
    ...topicNodes.values(),
    ...eventNodes.values(),
    ...followUpNodes.values(),
    ...questionNodes.values(),
    ...documentNodes.values(),
    ...snapshotNodes.values(),
    ...summaryNodes.values(),
  ];

  const all = new Map(nodes.map((n) => [n.id, n]));

  const relationships: StoryRelationshipEdge[] = [
    ...sameTopicEdges([...topicNodes.values()], eventNodes),
    ...temporalSequenceEdges([...topicNodes.values()], eventNodes),
    ...followUpEdges(journal, followUpNodes, eventNodes, topicNodes),
    ...documentEdges(journal, documentNodes, followUpNodes, eventNodes),
    ...correctionEdges(journal, eventNodes),
    ...userLinkedEdges(journal.userLinks ?? [], all),
  ];

  const version = 1 + journal.snapshots.length + journal.activity.filter((a) => a.type === "update_added").length;

  return { nodes, relationships, generatedAt: new Date().toISOString(), version };
}

/* ------------------------------------------------------------------ *
 * Search — only the user's own stored information
 * ------------------------------------------------------------------ */

export function searchStoryMap(journal: StoryJournal, graph: StoryGraph, query: string): StorySearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: StorySearchResult[] = [];
  for (const node of graph.nodes) {
    const hay = [node.title, node.description ?? "", node.originalText ?? "", node.category ?? ""]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) continue;
    const match = node.originalText && node.originalText.toLowerCase().includes(q)
      ? node.originalText
      : node.title;
    const idx = match.toLowerCase().indexOf(q);
    const start = Math.max(0, (idx >= 0 ? idx : 0) - 28);
    const snippet =
      idx >= 0
        ? `${start > 0 ? "…" : ""}${match.slice(start, start + 90)}${match.length > start + 90 ? "…" : ""}`
        : node.description ?? node.title;
    results.push({ nodeId: node.id, kind: node.type, title: node.title, snippet });
  }
  return results;
}

/* ------------------------------------------------------------------ *
 * Deterministic layout — keeps the map stable across rebuilds
 * ------------------------------------------------------------------ */

export interface GraphLayout {
  positions: Record<string, { x: number; y: number }>;
  width: number;
  height: number;
}

const COLUMNS: Record<string, number> = {
  TOPIC: 36,
  EVENT: 262,
  FOLLOW_UP: 508,
  QUESTION: 668,
  DOCUMENT: 852,
};

const NODE_W = 176;
const NODE_H = 58;
const ROW_H = 84;

export function computeLayout(graph: StoryGraph): GraphLayout {
  const positions: Record<string, { x: number; y: number }> = {};
  const used = new Set<number>();
  const byType = new Map<string, StoryNode[]>();
  for (const n of graph.nodes) {
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  }

  const nextFreeY = (v: number): number => {
    const rounded = Math.round(v / ROW_H) * ROW_H;
    let y = Math.max(rounded, ROW_H);
    while (used.has(y)) y += ROW_H;
    used.add(y);
    return y;
  };

  const events = (byType.get("EVENT") ?? [])
    .slice()
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : 1) : a.date ? -1 : b.date ? 1 : a.title < b.title ? -1 : 1));

  events.forEach((n, i) => {
    positions[n.id] = { x: COLUMNS.EVENT, y: ROW_H + i * ROW_H };
    used.add(ROW_H + i * ROW_H);
  });

  const avgYOf = (nodeIds: string[]): { ok: boolean; y: number } => {
    let sum = 0;
    let count = 0;
    for (const id of nodeIds) {
      const p = positions[id];
      if (p) {
        sum += p.y;
        count += 1;
      }
    }
    return count ? { ok: true, y: sum / count } : { ok: false, y: 0 };
  };

  const neighbors = new Map<string, string[]>();
  for (const rel of graph.relationships) {
    if (!neighbors.has(rel.fromNodeId)) neighbors.set(rel.fromNodeId, []);
    if (!neighbors.has(rel.toNodeId)) neighbors.set(rel.toNodeId, []);
    neighbors.get(rel.fromNodeId)!.push(rel.toNodeId);
    neighbors.get(rel.toNodeId)!.push(rel.fromNodeId);
  }

  const placeNear = (n: StoryNode, defX: number) => {
    const link = avgYOf(neighbors.get(n.id) ?? []);
    positions[n.id] = { x: defX, y: nextFreeY(link.ok ? link.y : ROW_H) };
  };

  for (const n of byType.get("TOPIC") ?? []) placeNear(n, COLUMNS.TOPIC);
  for (const n of byType.get("FOLLOW_UP") ?? []) placeNear(n, COLUMNS.FOLLOW_UP);
  for (const n of byType.get("QUESTION") ?? []) placeNear(n, COLUMNS.QUESTION);
  for (const n of byType.get("DOCUMENT") ?? []) placeNear(n, COLUMNS.DOCUMENT);

  // Everything else sits in a bottom band so the main flow stays readable.
  const band = ["SNAPSHOT", "COMMUNICATION"];
  const maxY = Math.max(ROW_H, ...Object.values(positions).map((p) => p.y));
  let bandY = maxY + ROW_H * 1.4;
  for (const type of band) {
    for (const n of byType.get(type) ?? []) {
      if (positions[n.id]) continue;
      positions[n.id] = { x: COLUMNS.EVENT, y: bandY };
      used.add(bandY);
      bandY += ROW_H;
    }
  }

  const unplaced = graph.nodes.filter((n) => !positions[n.id]);
  for (const n of unplaced) {
    const x = COLUMNS[n.type] ?? COLUMNS.EVENT;
    positions[n.id] = { x, y: nextFreeY(ROW_H) };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY2 = -Infinity;
  for (const n of graph.nodes) {
    const p = positions[n.id];
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY2 = Math.max(maxY2, p.y + NODE_H);
  }

  return {
    positions,
    width: Math.max(minX === Infinity ? 0 : maxX - minX + 40, 640),
    height: Math.max(minY === Infinity ? 0 : maxY2 - minY + 60, 320),
  };
}

export const GRAPH_NODE_W = NODE_W;
export const GRAPH_NODE_H = NODE_H;