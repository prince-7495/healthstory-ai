/* =============================================================
   HealthStory AI — Stage 7 copy
   ============================================================= */

export const FOLLOWUP = {
  featureName: "Follow-Up",
  homeHeading: "What happened next?",
  homeSupporting:
    "Record what happened after your conversation or appointment. You can write naturally — HealthStory AI will help organize it.",
  addCta: "Add Follow-Up",
  historyCta: "View Previous Follow-Ups",
  promise: "Keep your story moving forward.",

  typeHeading: "What kind of record is this?",
  typeOptions: [
    { id: "CONVERSATION", label: "Conversation", hint: "Something discussed with a professional or another person." },
    { id: "APPOINTMENT", label: "Appointment", hint: "A visit you want to remember." },
    { id: "REPORT", label: "Test or report", hint: "A test, report or result you received." },
    { id: "PERSONAL_UPDATE", label: "New update", hint: "Something you noticed afterward." },
    { id: "OTHER", label: "Other", hint: "Any other health-related event." },
  ] as const,

  inputHeading: "Tell us what happened.",
  inputPlaceholder:
    "After my appointment, I was told to come back in two weeks. I also received a report and want to remember what was discussed.",
  inputMicro: "Write naturally. You don't need medical terminology.",

  dateLabel: "Date",
  whoLabel: "Conversation with:",
  whoOptions: [
    { id: "Healthcare professional", label: "Healthcare professional" },
    { id: "Family member", label: "Family member" },
    { id: "Other", label: "Other" },
    { id: "Prefer not to specify", label: "Prefer not to specify" },
  ] as const,

  whatHappened: "What happened",
  informationReceived: "Information I received",
  questionsRemaining: "Questions that remain",
  whatToRemember: "What I want to remember",
  optionalNote: "All fields after the date are optional.",

  organizeCta: "Organize Follow-Up",
  cancelCta: "Cancel",
  exampleCta: "Use the example follow-up",

  processingHeading: "Organizing your follow-up…",
  processingSub: "We're comparing what happened with your existing story.",

  reviewHeading: "We organized your follow-up",
  reviewSupporting:
    "Nothing becomes part of your confirmed story until you choose to add it.",
  groupNewInfo: "New information",
  groupChanges: "Changes",
  groupQuestions: "Questions",
  groupDates: "Dates mentioned",
  groupReceived: "Information I received",

  confirmCta: "Confirm",
  editCta: "Edit",
  removeCta: "Remove",
  saveCta: "Save",
  groupEmpty: "Nothing was identified in this group.",

  whyAddedCta: "Why was this added?",
  whyAddedBody: "This item was identified from your follow-up on {date}.",
  viewOriginalCta: "View Original",
  hideOriginalCta: "Hide Original",
  originalHeading: "Your original words",

  confidenceLabel: "Extraction confidence",
  confidenceMeaning: {
    HIGH: "The information was clearly stated in your text.",
    MEDIUM: "The information was partly stated in your text.",
    LOW: "The information was unclear in your text.",
  } as Record<string, string>,
  lowConfidenceNote: "We found information that may be incomplete.",
  ignoreCta: "Ignore",
  reviewCta: "Review",

  conflictHeading: "Information may need clarification.",
  conflictBody: "Your entries contain different statements about this topic. We haven't chosen between them.",
  keepEarlierCta: "Keep Earlier",
  keepLaterCta: "Keep Later",
  addClarificationCta: "Add Clarification",

  correctionHeading: "Possible correction",
  correctionBody: "Does this update replace the previous information?",
  applyCorrectionCta: "Apply Correction",
  keepBothCta: "Keep Both",

  topicMatchHeading: "This may relate to your existing topic",
  connectCta: "Connect",
  keepSeparateCta: "Keep Separate",
  newTopicHeading: "New topic detected",
  addToStoryCta: "Add to My Story",
  keepAsNoteCta: "Keep as Note",

  applyCta: "Add to My Story",
  discardCta: "Discard",

  updatedHeading: "Your HealthStory has been updated.",
  storyUpdatedHeading: "Story Updated",
  addedLabel: "Added",
  updatedLabel: "Updated",
  followUpSummaryHeading: "What Happened Since My Last Update",

  summaryStale: "Your previous HealthStory Summary may now be outdated.",
  reviewUpdatedSummaryCta: "Review Updated Summary",

  snapshotCta: "Save Story Snapshot",
  snapshotNamePlaceholder: "e.g. After July appointment",
  compareCta: "Compare Before / After",

  historyHeading: "Follow-Up History",
  searchPlaceholder: "Search My Follow-Ups",
  filterTypesLabel: "Filter by type",
  filterRangeLabel: "Date range",
  rangeOptions: [
    { id: "all", label: "All time" },
    { id: "30d", label: "Last 30 days" },
    { id: "3m", label: "Last 3 months" },
    { id: "6m", label: "Last 6 months" },
  ] as const,
  noResults: "No follow-ups matched your search.",
  noHistory: "No follow-ups yet. Record what happened after a conversation to carry your story forward.",
  viewDetailCta: "View details",

  detailHeading: "Follow-Up",
  detailDate: "Date",
  detailType: "Type",
  detailWho: "Conversation with",
  detailTopic: "Related topics",
  detailTimeline: "Timeline placement",
  detailOriginal: "Original words",

  emptyHeading: "No follow-ups yet.",
  emptyBody: "When you have a conversation, appointment or test, record it here to keep your story up to date.",

  safetyFooter:
    "HealthStory AI organizes information you record. It does not diagnose conditions, interpret results, schedule appointments or provide treatment advice.",
  emergencyNotice:
    "If you believe you may be experiencing a medical emergency, seek immediate help from local emergency services or an appropriate healthcare professional.",
  demoLabel: "Fictional demonstration data",
} as const;
