/* =============================================================
   HealthStory AI — Stage 9 copy
   Personal Health Knowledge Map + Evidence Graph + Story Insights.
   ============================================================= */

import type { StoryNodeType } from "./types";

export const INSIGHTS_OPTIONS = {
  featureName: "Insights",
  pageHeading: "HealthStory Intelligence Map",
  strap: "See how your story connects.",
  supporting:
    "HealthStory brings your recorded events, topics, documents, questions, and conversations together so you can understand how your information relates over time.",

  homeHeading: "Your HealthStory at a glance",
  homeSupporting: "Explore how your recorded information connects over time.",

  ctaExplore: "Explore My HealthStory",
  ctaEvidence: "Review Evidence",

  /* overview tiles */
  tiles: {
    storyMap: "Story Map",
    topics: "Topics",
    evidence: "Evidence",
    openQuestions: "Open Questions",
    informationGaps: "Information Gaps",
    recentChanges: "Recent Changes",
  },

  /* views */
  views: {
    overview: "Overview",
    map: "Story Map",
    evidence: "Evidence",
    review: "Questions & Review",
  },

  /* map */
  map: {
    heading: "Interactive HealthStory Map",
    sub: "Nodes are pieces of information. Lines are explicit relationships you can click to see why they exist.",
    mapView: "Map View",
    timelineView: "Timeline View",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    reset: "Reset",
    center: "Center on My Story",
    searchPlaceholder: "Search My Story",
    searchHint: "Searches only your own stored information — not the internet.",
    filterHeading: "Filter",
    allTime: "All time",
    lastMonth: "Last month",
    last3Months: "Last 3 months",
    typeHeading: "Type",
    statusHeading: "Status",
    exploreConnections: "Explore Connections",
    whyConnected: "Why are these connected?",
    clickEdgeHint: "Click a connection line to see its reason.",
    noSelectionHint: "Select a node or a connection to inspect it.",
    emptyTitle: "Your story map will grow with you.",
    emptyBody:
      "Add a few HealthStory entries, topics, or documents and we'll help you see how they connect.",
    emptyCta: "Add My First Story Entry",
    smallTitle: "Your Story So Far",
    legendLabel: "Node legend",
    statuses: {
      USER_RECORDED: "User recorded",
      AI_ORGANIZED: "AI organized",
      USER_CONFIRMED: "User confirmed",
      USER_EDITED: "User edited",
      NEEDS_REVIEW: "Needs review",
    },
  },

  /* details */
  details: {
    heading: "Details",
    what: "What is this?",
    when: "When?",
    source: "Source",
    relatedTopics: "Related topics",
    connectedEvents: "Connected events",
    confirmation: "User confirmation status",
    originalWording: "Original wording",
    actions: "Actions",
    viewSource: "View Source",
    edit: "Edit",
    confirm: "Confirm",
    remove: "Remove",
    addToConversation: "Add to Conversation",
    confirmed: "Confirmed",
    notConfirmed: "Not confirmed yet",
    hideSource: "Hide Source",
    supportingSource: "Supporting Source",
    pagePrefix: "Page {page}",
  },

  /* evidence explorer */
  evidence: {
    heading: "Evidence Explorer",
    sub: "A list-based view of the same connections — accessible without the graph.",
    invent: "What I Have Recorded",
    perTopicHeading: "By Topic",
    whatUnclear: "Needs Review",
    viewEvidence: "View Evidence",
    counts: {
      events: "recorded events",
      entries: "supporting entries",
      documents: "documents",
      followUps: "follow-ups",
      questions: "questions",
      topics: "topics",
      snapshots: "snapshots",
    },
    noTopics: "No topics recorded yet.",
  },

  /* open questions */
  questions: {
    heading: "Questions Still Open",
    empty: "No questions are open.",
    statuses: {
      OPEN: "Open",
      DISCUSSED: "Discussed",
      ANSWERED: "Answered",
      REMOVED: "Removed",
    },
    markDiscussed: "Mark as Discussed",
    reopen: "Reopen",
    remove: "Remove",
    sourceLabel: "Source",
    dateLabel: "Created",
    topicLabel: "Related topic",
    statusOpen: "Open",
    addedByUser: "You added",
    addedByAi: "AI suggested",
  },

  /* gaps */
  gaps: {
    heading: "Information to Review",
    sub: "Things your story does not currently contain. The system never pressures you to fill these in.",
    leaveAsIs: "Leave as is",
    notSure: "Not sure",
    addDate: "Add Date",
    keepApproximate: "Keep Approximate",
    ignore: "Ignore",
    review: "Review",
    confirm: "Confirm",
    link: "Link Document",
    markDiscussed: "Mark Discussed",
    empty: "No information is waiting for review.",
    types: {
      MISSING_DATE: "Missing date",
      MISSING_SOURCE: "Missing source",
      UNCONFIRMED_EVENT: "Needs review",
      UNLINKED_DOCUMENT: "Unlinked document",
      UNRESOLVED_CONFLICT: "Information may conflict",
      UNRESOLVED_QUESTION: "Open question",
      INCOMPLETE_DESCRIPTION: "Incomplete description",
    },
  },

  /* consistency */
  consistency: {
    heading: "Story Consistency",
    sub: "Information integrity only — this is not medical consistency.",
    possibleDuplicate: "Possible duplicate",
    compare: "Compare",
    merge: "Merge",
    keepBoth: "Keep Both",
    keepSeparate: "Keep Separate",
    dismiss: "Dismiss",
    conflictHeading: "Information may need review",
    emptyDuplicates: "No possible duplicates detected.",
    emptyConflicts: "No conflicting entries detected.",
    unlinkedHeading: "Unlinked documents",
    unlinkedBody: "These documents are saved but not connected to an event or follow-up.",
    outdatedSummary: "Your Health Summary may be out of date. Review it in the Journal.",
    unconfirmedNote: "AI-organized items have not been confirmed yet.",
    orphanNote: "These questions are not linked to a follow-up or conversation.",
  },

  /* insights */
  insights: {
    heading: "Story Insights",
    recentHeading: "Recent Insights",
    whyThis: "Why am I seeing this?",
    viewEvidence: "View Evidence",
    dismiss: "Dismiss",
    review: "Review",
    confirmed: "User Confirmed",
    dirtyHeading: "Needs Refresh",
    dirtyBody:
      "The information behind this insight changed since it was generated. It has been re-checked against your current story.",
    legend: "Insight legend",
    types: {
      REPEATED_TOPIC: "A topic appears repeatedly",
      TIMELINE_CLUSTER: "Information clustered in time",
      NEW_INFORMATION: "New information recorded",
      CORRECTION: "A correction was recorded",
      UNRESOLVED_QUESTION: "A question remains open",
      DOCUMENT_CONNECTION: "Document connected",
      MISSING_INFORMATION: "Information is missing",
      CONFLICT: "Information may need review",
      COMMUNICATION_UPDATE: "Conversation material updated",
    },
  },

  /* completeness */
  completeness: {
    heading: "Story Completeness",
    sub: "How complete the record is — never a health score.",
    levels: {
      WELL_DOCUMENTED: "Well documented",
      SOME_MISSING: "Some information missing",
      NEEDS_REVIEW: "Needs review",
    },
    notHealth: "This describes the record, not your health.",
    noScores: "No health scores, risk percentages, or ratings are ever produced.",
    stats: {
      confirmedEvents: "confirmed events",
      openQuestions: "open questions",
      unlinkedDocuments: "unlinked documents",
      conflicts: "unresolved conflicts",
    },
  },

  /* prepare for conversation */
  prepare: {
    heading: "Prepare for Conversation",
    sub: "Choose the confirmed information that flows into Conversation Mode. Nothing is selected automatically.",
    options: {
      topic: "Topic",
      recentEvents: "Recent events",
      documentInfo: "Document information",
      questions: "Questions",
    },
    reviewSharing: "Review what you're sharing",
    included: "Included",
    excluded: "Excluded",
    confirm: "Confirm",
    back: "Back",
    prepareCta: "Prepare Conversation",
    noAutomatic: "Nothing is ever shared or sent automatically.",
    note: "You recorded recently-added information related to this story.",
  },

  /* activity */
  activity: {
    heading: "Story Activity",
    sub: "A transparent record of what was added, organized, confirmed and edited.",
    today: "Today",
    yesterday: "Yesterday",
    verbs: {
      ADDED: "Added",
      UPDATED: "Updated",
      CONFIRMED: "Confirmed",
      EDITED: "Edited",
      REMOVED: "Removed",
      AI_ORGANIZED: "AI organized",
      LINKED: "Linked",
      IMPORTED: "Imported",
    },
    empty: "No story activity yet.",
  },

  /* trust */
  trust: {
    heading: "How HealthStory Works",
    flow: [
      "YOU PROVIDE INFORMATION",
      "AI ORGANIZES IT",
      "SOURCES REMAIN LINKED",
      "YOU REVIEW IT",
      "YOU CONTROL THE FINAL STORY",
    ],
    principle: "AI organizes information you choose to provide.",
    evidenceExplain: "Important information points back to a source.",
    humansVerify: "You confirm what becomes part of your story.",
    usersControl: "You choose what you save, connect, export, and communicate.",
    sourceFirst: "SOURCE first. GRAPH second. INSIGHTS third.",
    final: "Your information is connected.",
    finalBody:
      "HealthStory helps you see how your recorded experiences, topics, conversations, follow-ups, documents, and questions relate over time — without turning your story into an automated medical judgment.",
  },
  /* unclear */
  unclear: {
    heading: "What Information Is Unclear?",
    trigger: "What information is unclear?",
    dateApproximate: "One date remains approximate.",
    dateApproximatePlural: "{count} dates remain approximate.",
    noUnclear: "No unclear items found.",
    review: "Review",
    confirmed: "User Confirmed",
  },

  /* labels */
  nodeTypes: {
    EVENT: "Event",
    TOPIC: "Topic",
    FOLLOW_UP: "Follow-Up",
    DOCUMENT: "Document",
    QUESTION: "Question",
    COMMUNICATION: "Communication",
    SOURCE: "Source",
    SNAPSHOT: "Snapshot",
  } satisfies Record<StoryNodeType, string>,

  relationshipTypes: {
    SAME_TOPIC: "Same topic",
    TEMPORAL_SEQUENCE: "Timeline relationship",
    SOURCE_OF: "Source",
    SUPPORTS: "Supports",
    FOLLOW_UP_TO: "Follow-up to",
    MENTIONED_IN: "Mentioned in",
    DERIVED_FROM: "Derived from",
    CORRECTS: "Corrects",
    DUPLICATE_OF: "Duplicate of",
    USER_LINKED: "Linked by you",
  },

  confidences: {
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  },

  attribution: {
    USER_REPORTED: "You recorded",
    SOURCE_DOCUMENT: "The source says",
    PROFESSIONAL_REPORTED_BY_USER: "You reported being told",
    AI_ORGANIZED: "AI organized",
    AI_GENERATED: "AI suggested",
  },

  safety:
    "HealthStory AI helps organize information you provide. It does not diagnose conditions, predict disease, provide risk scores, or replace professional medical advice.",
  emergency:
    "If you believe you may be experiencing a medical emergency, seek immediate help from local emergency services or an appropriate healthcare professional.",
  demoLabel: "FICTIONAL DEMONSTRATION DATA",
} as const;