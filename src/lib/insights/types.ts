/* =============================================================
   HealthStory AI — Stage 9 data model
   Personal HealthStory Knowledge Map + Evidence Graph.

   Two architecture rules from the Stage 9 brief are baked into
   these types:

     1. The graph is DERIVED. `StoryGraph` is recomputed from the
        journal (the source of truth). It is never persisted as the
        only record of what the user knows.
     2. Nothing is silently confirmed. AI relationships and insights
        carry a status, a confidence that is only ever relationship /
        extraction confidence, and source ids back to the underlying
        records.
   ============================================================= */

/* ------------------------------------------------------------------ *
 * Nodes — one node per meaningful piece of user-owned information
 * ------------------------------------------------------------------ */

export type StoryNodeType =
  | "EVENT"
  | "TOPIC"
  | "FOLLOW_UP"
  | "DOCUMENT"
  | "QUESTION"
  | "COMMUNICATION"
  | "SOURCE"
  | "SNAPSHOT";

export type StoryNodeStatus =
  | "USER_RECORDED"
  | "AI_ORGANIZED"
  | "USER_CONFIRMED"
  | "USER_EDITED"
  | "NEEDS_REVIEW";

export type DatePrecisionKind = "EXACT" | "APPROXIMATE" | "UNKNOWN";

export interface StoryNode {
  id: string;
  type: StoryNodeType;
  /** Short title for the graph node. Never long. */
  title: string;
  /** ISO date when known with a day, otherwise null. */
  date?: string;
  datePrecision?: DatePrecisionKind;
  status: StoryNodeStatus;
  /** Event category / document type label for search + filtering. */
  category?: string;
  /** One-line detail shown in the detail panel. */
  description?: string;
  /** The user's own words (verbatim when available). */
  originalText?: string;
  /** Human label for where this came from, e.g. "HealthStory entry". */
  sourceLabel?: string;
  /** Ids of the underlying records this node is derived from. */
  sourceIds: string[];
  /** Id of the journal entity this node represents. */
  refId?: string;
  /** Page number for documents (e.g., "Page 2"). */
  pageNumber?: number;
}

/* ------------------------------------------------------------------ *
 * Relationships — every edge must have a reason
 * ------------------------------------------------------------------ */

export type StoryRelationshipType =
  | "SAME_TOPIC"
  | "TEMPORAL_SEQUENCE"
  | "SOURCE_OF"
  | "SUPPORTS"
  | "FOLLOW_UP_TO"
  | "MENTIONED_IN"
  | "DERIVED_FROM"
  | "CORRECTS"
  | "DUPLICATE_OF"
  | "USER_LINKED";

/**
 * Relationship confidence only — how clearly the two records appear to
 * reference the same information. Never a medical probability.
 */
export type RelationshipConfidence = "HIGH" | "MEDIUM" | "LOW";

export type RelationshipOrigin = "USER" | "AI";

export interface StoryRelationshipEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: StoryRelationshipType;
  /** Records that support this connection. */
  sourceIds: string[];
  confidence: RelationshipConfidence;
  createdBy: RelationshipOrigin;
  confirmedByUser: boolean;
  /** Plain-language answer to "Why are these connected?". */
  reason: string;
}

export interface StoryGraph {
  nodes: StoryNode[];
  relationships: StoryRelationshipEdge[];
  generatedAt: string;
  version: number;
}

/** A connection the user made themselves. Kept distinct from AI edges. */
export interface UserStoryLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  reason: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Information gaps — what the story does NOT contain
 * ------------------------------------------------------------------ */

export type InformationGapType =
  | "MISSING_DATE"
  | "MISSING_SOURCE"
  | "UNCONFIRMED_EVENT"
  | "UNLINKED_DOCUMENT"
  | "UNRESOLVED_CONFLICT"
  | "UNRESOLVED_QUESTION"
  | "INCOMPLETE_DESCRIPTION";

export type GapActionId =
  | "add_date"
  | "keep_approximate"
  | "ignore"
  | "leave_as_is"
  | "not_sure"
  | "review"
  | "confirm"
  | "mark_discussed"
  | "link";

export interface InformationGap {
  id: string;
  type: InformationGapType;
  /** The node this gap refers to, when any. */
  targetNodeId?: string;
  /** The journal entity id behind the target node. */
  targetRefId?: string;
  title: string;
  message: string;
  actions: GapActionId[];
  /** Component state: still shown, accepted, or ignored. */
  status: "OPEN" | "ACCEPTED" | "DISMISSED";
}

/* ------------------------------------------------------------------ *
 * Consistency — duplicates, conflicts, unlinked and orphaned items
 * ------------------------------------------------------------------ */

export interface DuplicateCandidate {
  id: string;
  eventAId: string;
  eventBId: string;
  /** Informational similarity only (shared topic label + close dates). */
  degree: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "MERGED" | "KEPT_SEPARATE" | "DISMISSED";
}

export interface ConflictItem {
  id: string;
  title: string;
  message: string;
  eventAId: string;
  eventBId: string;
  evidenceA: string;
  evidenceB: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
}

export interface StoryConsistency {
  duplicates: DuplicateCandidate[];
  conflicts: ConflictItem[];
  unlinkedDocumentIds: string[];
  outdatedSummaries: boolean;
  unconfirmedEventIds: string[];
  orphanedQuestionIds: string[];
}

/* ------------------------------------------------------------------ *
 * Unclear items — "What information is unclear?" summary
 * ------------------------------------------------------------------ */

export type UnclearItemType =
  | "APPROXIMATE_DATE"
  | "CONFLICT"
  | "UNCONFIRMED"
  | "UNLINKED_DOCUMENT";

export interface UnclearItem {
  id: string;
  type: UnclearItemType;
  message: string;
  count: number;
  action: "review" | "link";
}

/* ------------------------------------------------------------------ *
 * Insights — information-level findings, always source-linked
 * ------------------------------------------------------------------ */

export type StoryInsightType =
  | "REPEATED_TOPIC"
  | "TIMELINE_CLUSTER"
  | "NEW_INFORMATION"
  | "CORRECTION"
  | "UNRESOLVED_QUESTION"
  | "DOCUMENT_CONNECTION"
  | "MISSING_INFORMATION"
  | "CONFLICT"
  | "COMMUNICATION_UPDATE";

export type StoryInsightStatus = "CURRENT" | "STALE" | "DISMISSED" | "NEEDS_REVIEW" | "CONFIRMED";

export interface StoryInsight {
  id: string;
  type: StoryInsightType;
  title: string;
  body: string;
  /** Why am I seeing this? — the evidence in one or two sentences. */
  why: string;
  sourceEventIds: string[];
  sourceTopicIds: string[];
  sourceDocumentIds: string[];
  sourceNodeIds: string[];
  createdAt: string;
  /** Derived from the journal at generation time. */
  version: number;
  signature: string;
  status: StoryInsightStatus;
}

/* ------------------------------------------------------------------ *
 * Story completeness — the record's state, never a health score
 * ------------------------------------------------------------------ */

export type CompletenessCategory = "WELL_DOCUMENTED" | "SOME_MISSING" | "NEEDS_REVIEW";

export interface StoryCompleteness {
  category: CompletenessCategory;
  /** "Your story has 8 confirmed events, 2 open questions, 1 unlinked document." */
  line: string;
  confirmedEvents: number;
  openQuestions: number;
  unlinkedDocuments: number;
  unresolvedConflicts: number;
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

export interface StorySearchResult {
  nodeId: string;
  kind: StoryNodeType;
  title: string;
  snippet: string;
}

/* ------------------------------------------------------------------ *
 * Activity feed — synthesized audit trail
 * ------------------------------------------------------------------ */

export type StoryFeedVerb =
  | "ADDED"
  | "UPDATED"
  | "CONFIRMED"
  | "EDITED"
  | "REMOVED"
  | "AI_ORGANIZED"
  | "LINKED"
  | "IMPORTED";

export interface StoryFeedItem {
  id: string;
  at: string;
  verb: StoryFeedVerb;
  /** "Added a document" */
  headline: string;
  detail?: string;
}