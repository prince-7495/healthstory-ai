/* =============================================================
   HealthStory AI — Stage 9 analysis layer (part 1)
   Gaps, consistency, duplicates, conflicts, completeness.
   ============================================================= */

import { nodeIdFor, detectDuplicateSuggestions } from "./engine";
import type {
  CompletenessCategory,
  ConflictItem,
  DuplicateCandidate,
  InformationGap,
  StoryCompleteness,
  StoryConsistency,
  StoryGraph,
  UnclearItem,
} from "./types";
import type { StoryJournal } from "../journal/types";

/* ------------------------------------------------------------------ *
 * Unclear items — what the story has but with uncertainty
 * ------------------------------------------------------------------ */

export function detectUnclearItems(journal: StoryJournal): UnclearItem[] {
  const items: UnclearItem[] = [];

  // Approximate dates: events with genuinely approximate precision (not month, which is explicit)
  const approxEvents = journal.events.filter(
    (e) => e.status !== "REMOVED" && e.datePrecision && ["approximate", "relative", "unknown"].includes(e.datePrecision)
  );
  if (approxEvents.length > 0) {
    items.push({
      id: "unclear_date_approx",
      type: "APPROXIMATE_DATE",
      message: approxEvents.length === 1 ? "One date remains approximate." : `${approxEvents.length} dates remain approximate.`,
      count: approxEvents.length,
      action: "review",
    });
  }

  // Conflicts (from detectConflicts)
  const conflicts = detectConflicts(journal).filter((c) => c.status === "OPEN");
  if (conflicts.length > 0) {
    items.push({
      id: "unclear_conflicts",
      type: "CONFLICT",
      message: conflicts.length === 1 ? "Two entries contain different dates." : `${conflicts.length} entries may need review.`,
      count: conflicts.length,
      action: "review",
    });
  }

  // Unconfirmed AI items
  const unconfirmed = journal.events.filter((e) => e.status === "AI_ORGANIZED" && e.needsConfirmation);
  if (unconfirmed.length > 0) {
    items.push({
      id: "unclear_unconfirmed",
      type: "UNCONFIRMED",
      message: unconfirmed.length === 1 ? "One item organized by AI has not been confirmed yet." : `${unconfirmed.length} items organized by AI have not been confirmed yet.`,
      count: unconfirmed.length,
      action: "review",
    });
  }

  // Unlinked documents
  for (const d of journal.documents ?? []) {
    if (d.status === "REMOVED") continue;
    const linkedToFollowUp = journal.followUps?.some((f) => f.id === d.relatedFollowUpId) ?? false;
    const linkedToEvent = journal.events.some((e) => e.status !== "REMOVED" && e.metadata?.documentId === d.id);
    if (!linkedToFollowUp && !linkedToEvent) {
      items.push({
        id: `unclear_doc_${d.id}`,
        type: "UNLINKED_DOCUMENT",
        message: `“${d.title ?? d.filename}” is saved but not connected to an event or follow-up.`,
        count: 1,
        action: "link",
      });
    }
  }

  return items;
}

/* ------------------------------------------------------------------ *
 * Information gaps — what the story does NOT contain
 * ------------------------------------------------------------------ */

export function detectInformationGaps(journal: StoryJournal, graph: StoryGraph): InformationGap[] {
  const gaps: InformationGap[] = [];
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const ev of journal.events) {
    if (ev.status === "REMOVED") continue;
    const node = nodes.get(nodeIdFor.event(ev.id));
    if (!node) continue;
    const title = ev.title || ev.description;

    if (!ev.date && ev.datePrecision !== "exact") {
      gaps.push({
        id: `gap_date_${ev.id}`,
        type: "MISSING_DATE",
        targetNodeId: node.id,
        targetRefId: ev.id,
        title: "Missing date",
        message: `Your entry “${title}” does not contain an exact date.`,
        actions: ["add_date", "keep_approximate", "leave_as_is", "not_sure"],
        status: "OPEN",
      });
    }

    if (ev.status === "AI_ORGANIZED" && ev.needsConfirmation) {
      gaps.push({
        id: `gap_unconf_${ev.id}`,
        type: "UNCONFIRMED_EVENT",
        targetNodeId: node.id,
        targetRefId: ev.id,
        title: "Needs review",
        message: `“${title}” was organized by AI and has not been confirmed by you.`,
        actions: ["review", "leave_as_is", "not_sure"],
        status: "OPEN",
      });
    }
  }

  for (const d of journal.documents ?? []) {
    if (d.status === "REMOVED") continue;
    const linkedToFollowUp = journal.followUps?.some((f) => f.id === d.relatedFollowUpId) ?? false;
    const linkedToEvent = journal.events.some((e) => e.status !== "REMOVED" && e.metadata?.documentId === d.id);
    if (!linkedToFollowUp && !linkedToEvent) {
      gaps.push({
        id: `gap_doc_${d.id}`,
        type: "UNLINKED_DOCUMENT",
        targetNodeId: nodeIdFor.document(d.id),
        targetRefId: d.id,
        title: "Unlinked document",
        message: `“${d.filename}” is saved but is not connected to an event or follow-up.`,
        actions: ["link", "ignore"],
        status: "OPEN",
      });
    }
  }

  for (const conflict of detectConflicts(journal)) {
    if (conflict.status !== "OPEN") continue;
    gaps.push({
      id: `gap_conflict_${conflict.id}`,
      type: "UNRESOLVED_CONFLICT",
      title: "Information may conflict",
      message: conflict.message,
      actions: ["review", "leave_as_is", "not_sure"],
      status: "OPEN",
    });
  }

  const openQuestions = (journal.questions ?? []).filter((q) => q.status === "OPEN");
  if (openQuestions.length > 0) {
    gaps.push({
      id: "gap_questions",
      type: "UNRESOLVED_QUESTION",
      title: "Open question",
      message:
        openQuestions.length === 1
          ? "One question remains open."
          : `${openQuestions.length} questions remain open.`,
      actions: ["mark_discussed", "ignore"],
      status: "OPEN",
    });
  }

  for (const f of journal.followUps ?? []) {
    if (f.type !== "REPORT") continue;
    const linkedDoc = (journal.documents ?? []).some((d) => d.relatedFollowUpId === f.id);
    if (!linkedDoc) {
      gaps.push({
        id: `gap_source_${f.id}`,
        type: "MISSING_SOURCE",
        targetNodeId: nodeIdFor.followUp(f.id),
        targetRefId: f.id,
        title: "Missing source",
        message: "This follow-up mentions a report, but no document is linked to it.",
        actions: ["leave_as_is", "not_sure"],
        status: "OPEN",
      });
    }
  }

  return gaps;
}

/* ------------------------------------------------------------------ *
 * Conflicts
 * ------------------------------------------------------------------ */

export function detectConflicts(journal: StoryJournal): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  for (const evo of journal.evolutions) {
    if (evo.changeType !== "contradiction" || evo.status === "DISMISSED") continue;
    const aId = evo.previousEventId;
    const bId = evo.currentEventId;
    if (!aId || !bId) continue;
    conflicts.push({
      id: `conflict_${evo.id}`,
      title: "Information may need review",
      message: evo.description,
      eventAId: aId,
      eventBId: bId,
      evidenceA: evo.previousSourceText ?? "Earlier entry",
      evidenceB: evo.currentSourceText ?? "Later entry",
      status: evo.status === "CONFIRMED" ? "RESOLVED" : "OPEN",
    });
  }
  return conflicts;
}

/* ------------------------------------------------------------------ *
 * Consistency report
 * ------------------------------------------------------------------ */

export function detectDuplicates(journal: StoryJournal): DuplicateCandidate[] {
  const expected = new Set<string>();
  const out: DuplicateCandidate[] = [];
  let i = 0;
  for (const d of detectDuplicateSuggestions(journal)) {
    const key = d.eventAId < d.eventBId ? `${d.eventAId}_${d.eventBId}` : `${d.eventBId}_${d.eventAId}`;
    if (expected.has(key)) continue;
    expected.add(key);
    out.push({
      id: `dup_${i}_${key}`,
      eventAId: d.eventAId,
      eventBId: d.eventBId,
      degree: d.degree,
      status: "OPEN",
    });
    i += 1;
  }
  return out;
}

export function detectConsistency(journal: StoryJournal): StoryConsistency {
  const unlinkedDocumentIds = (journal.documents ?? [])
    .filter((d) => d.status !== "REMOVED")
    .filter((d) => {
      const linkedToFollowUp = journal.followUps?.some((f) => f.id === d.relatedFollowUpId) ?? false;
      const linkedToEvent = journal.events.some((e) => e.status !== "REMOVED" && e.metadata?.documentId === d.id);
      return !linkedToFollowUp && !linkedToEvent;
    })
    .map((d) => d.id);

  const unconfirmedEventIds = journal.events
    .filter((e) => e.status !== "REMOVED" && e.status === "AI_ORGANIZED")
    .map((e) => e.id);

  const orphanedQuestionIds = (journal.questions ?? [])
    .filter((q) => q.status === "OPEN")
    .map((q) => q.id);

  const latestSummary = [...journal.summaries].sort((a, b) => (a.generatedAt < b.generatedAt ? -1 : 1)).pop();
  const outdatedSummaries = Boolean(latestSummary && journal.updatedAt > latestSummary.generatedAt);

  return {
    duplicates: detectDuplicates(journal),
    conflicts: detectConflicts(journal),
    unlinkedDocumentIds,
    outdatedSummaries,
    unconfirmedEventIds,
    orphanedQuestionIds,
  };
}

/* ------------------------------------------------------------------ *
 * Story completeness — the record's state, never a health score
 * ------------------------------------------------------------------ */

export function computeCompleteness(
  journal: StoryJournal,
  consistency: StoryConsistency,
  gaps: InformationGap[],
): StoryCompleteness {
  const confirmedEvents = journal.events.filter((e) => e.status === "CONFIRMED").length;
  const openQuestions = (journal.questions ?? []).filter((q) => q.status === "OPEN").length;
  const unlinkedDocuments = consistency.unlinkedDocumentIds.length;
  const unresolvedConflicts = consistency.conflicts.filter((c) => c.status === "OPEN").length;
  const openGaps = gaps.filter((g) => g.status === "OPEN").length;

  let category: CompletenessCategory = "WELL_DOCUMENTED";
  if (consistency.unconfirmedEventIds.length > 0 || unresolvedConflicts > 0) {
    category = "NEEDS_REVIEW";
  } else if (openGaps > 0 || openQuestions > 0 || unlinkedDocuments > 0) {
    category = "SOME_MISSING";
  }

  const parts: string[] = [
    `Your story has ${confirmedEvents} confirmed event${confirmedEvents === 1 ? "" : "s"}`,
  ];
  if (openQuestions > 0) parts.push(`${openQuestions} open question${openQuestions === 1 ? "" : "s"}`);
  if (unlinkedDocuments > 0) parts.push(`${unlinkedDocuments} unlinked document${unlinkedDocuments === 1 ? "" : "s"}`);
  if (unresolvedConflicts > 0) parts.push(`${unresolvedConflicts} unresolved conflict${unresolvedConflicts === 1 ? "" : "s"}`);

  return {
    category,
    line: `${parts.slice(0, 2).join(", ")}${parts.length > 2 ? "…" : "."}`,
    confirmedEvents,
    openQuestions,
    unlinkedDocuments,
    unresolvedConflicts,
  };
}