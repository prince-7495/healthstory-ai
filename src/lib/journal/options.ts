/* =============================================================
   HealthStory AI — Stage 5 copy
   All Stage 5 strings live here, separated from UI so the journal
   can be re-worded without touching a component.
   ============================================================= */

export const JOURNAL = {
  /* identity */
  featureName: "HealthStory Journal",
  dashboardHeading: "My Health Story",
  dashboardSubtitle: "A timeline of the information you've chosen to record.",
  tagline: "Your story evolves over time.",
  promise:
    "Your health story doesn't stop after one appointment. Add new experiences over time and see how your story evolves.",

  /* dashboard */
  overviewHeading: "Story Overview",
  overviewFirstEntry: "First entry",
  overviewLatest: "Latest update",
  overviewUpdates: "Updates recorded",
  overviewTopics: "Topics mentioned",
  overviewLastUpdated: "Last updated",
  timelineHeading: "Your Timeline",
  recentUpdatesHeading: "Recent updates",
  evolutionHeading: "What Changed Since Your Last Update?",
  categoriesHeading: "Topics",
  patternsHeading: "Story Patterns",
  snapshotsHeading: "Story Snapshots",
  activityHeading: "Story Activity",
  summariesHeading: "Your Health Summary",
  quickActionsHeading: "Quick actions",

  /* actions */
  addUpdateCta: "+ Add an Update",
  addUpdateHeading: "What would you like to add?",
  addUpdatePlaceholder: "Tell us what has changed since your last update…",
  addUpdateSupporting:
    "You can write naturally. You don't need medical terminology.",
  organizeCta: "Organize Update",
  demoCta: "Explore a Complete HealthStory",
  viewSummaryCta: "View Summary",
  comparePeriodsCta: "Compare Periods",
  searchStoryCta: "Search Story",
  viewUpdateCta: "View update",

  /* update processing */
  updatingHeading: "Updating Your Story…",
  updatingSub: "We're comparing your update with your previous story.",

  /* result */
  storyUpdatedHeading: "Story Updated",
  noChangeHeading: "No clear change detected",
  noChangeBody:
    "Your latest update added information, but no explicit change from your previous entries was identified.",
  updateRecordedHeading: "Update recorded",
  updateRecordedBody:
    "Your new entry was added to your story. No major change was identified from your previous information.",
  changedSinceHeading: "What Changed Since Your Last Update?",
  previousLabel: "Earlier",
  nowLabel: "Now",
  basedOnEntries: "Based on your entries",
  viewEvidenceCta: "View evidence",
  previousEvidenceLabel: "Previous evidence",
  newEvidenceLabel: "New evidence",
  confirmCta: "Confirm",
  dismissCta: "Dismiss",
  editCta: "Edit",
  saveCta: "Save",
  cancelCta: "Cancel",

  /* contradictions & corrections */
  clarificationHeading: "Information may need clarification",
  clarificationBody:
    "Your entries contain different statements about this topic. We haven't chosen between them.",
  earlierEntryLabel: "Earlier entry",
  laterEntryLabel: "Later entry",
  keepEarlierCta: "Keep Earlier",
  keepLaterCta: "Keep Later",
  addClarificationCta: "Add Clarification",
  correctionHeading: "Possible correction",
  correctionBody: "Does this update replace the previous information?",
  replaceCta: "Replace",
  keepBothCta: "Keep Both",

  /* topic matching safety */
  possibleMatchHeading: "These entries may refer to the same topic.",
  mergeCta: "Merge",
  keepSeparateCta: "Keep Separate",

  /* topic history */
  topicHistoryHeading: "Topic History",
  topicFirstMentioned: "First mentioned",
  topicLastMentioned: "Last mentioned",
  topicEntries: "Entries",
  topicChanges: "Changes reported",
  topicSourceEntries: "Source entries",
  relatedStoryHeading: "Related Story",
  relatedNote: "These topics were mentioned in related entries.",
  coMentionLabel: "Topics mentioned together",

  /* filters & search */
  viewPeriodHeading: "View period",
  timeRanges: [
    { id: "all", label: "All time" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "3m", label: "Last 3 months" },
    { id: "6m", label: "Last 6 months" },
    { id: "custom", label: "Custom range" },
  ] as const,
  customFrom: "From",
  customTo: "To",
  searchHeading: "Search My Story",
  searchPlaceholder: "Search your health story…",
  categoryFilterHeading: "Filter by category",
  clearFiltersCta: "Clear filters",
  resultsCount: "results",

  /* summary status */
  summaryUpToDate: "Up to date",
  summaryUpdateAvailable: "New information available",
  summaryLastUpdated: "Last updated",
  summaryMayBeOutOfDate: "Your Health Summary may be out of date.",
  reviewUpdatedSummaryCta: "Review Updated Summary",
  updateSummaryCta: "Update Summary",
  previousSummariesHeading: "Previous Summaries",
  viewPreviousSummaryCta: "View Previous Summary",
  exportLatestCta: "Export Latest Summary",
  readOnlyVersionNote: "This is a saved, read-only version of your summary.",
  noSummaryYet: "No summary has been created yet.",

  /* snapshots */
  createSnapshotCta: "Create Snapshot",
  snapshotNamePlaceholder: "e.g. After July update",
  compareSnapshotsHeading: "Compare Story Snapshots",
  changesBetweenSnapshots: "Changes Between Snapshots",
  deleteSnapshotCta: "Delete",
  snapshotCreated: "Snapshot saved",
  noSnapshots: "No snapshots yet. Save a point-in-time version of your story.",
  notEnoughForComparison: "Not enough information yet",
  notEnoughBody:
    "Add more updates to see how your recorded story changes over time.",

  /* settings */
  settingsHeading: "My Story Settings",
  memoryHeading: "Story Memory",
  memoryExplanation:
    "Your Story Memory helps HealthStory AI connect new updates with information you previously chose to record.",
  principle: "You choose what becomes part of your story.",
  settingSaveUpdates: "Save updates to My Story",
  settingKeepSummaries: "Keep previous summaries",
  settingSaveEvidence: "Save source evidence",
  settingDemoMode: "Demo mode",
  storageNote: "Stored on this device for this prototype.",
  privacyHeading: "Story Privacy",
  privacyPrivate: "Private",
  privacySharing: "Sharing Preview",
  privacyExporting: "Exporting",
  deleteStoryCta: "Delete My Story",
  deleteWarning:
    "This will remove your stored HealthStory information from this prototype.",
  deleteConfirmHeading: "Are you sure you want to delete your story?",
  deleteConfirmBody: "This removes all entries, events, changes and summaries stored on this device.",
  deleteConfirmCta: "Delete Story",
  deletedNote: "Your stored story was removed from this device.",
  removeUpdateCta: "Remove update",
  removeUpdateConfirm: "Are you sure you want to remove this update?",

  /* empty states */
  emptyHeading: "Your HealthStory is waiting for its first chapter.",
  emptyBody: "Add your first story or update whenever you're ready.",
  emptyTimelineHeading: "Your timeline is empty.",
  emptyTimelineBody:
    "Once you add an update, HealthStory AI will organize it here.",
  emptySearch: "No entries matched your search.",

  /* safety */
  safetyFooter:
    "HealthStory AI helps organize information provided by users for communication and appointment preparation. It does not diagnose conditions, provide treatment recommendations, or replace professional medical advice.",
  notEnoughData: "Not enough information yet",
  demoLabel: "Fictional demonstration data",
  savedLocally: "Stored on this device for this prototype.",

  /* misc */
  today: "Today",
  allTime: "All time",
  upToDate: "Up to date",
  storyRecovered: "Your story is ready to continue.",
} as const;

/** Quick-update chips. Organizational categories only. */
export const UPDATE_CHIPS = [
  "Something changed",
  "A new symptom or event",
  "Something improved",
  "Something became more frequent",
  "Medication or treatment mentioned",
  "Test or appointment",
  "Lifestyle change",
  "Something I want to remember",
] as const;
