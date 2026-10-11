/* =============================================================
   HealthStory AI — Stage 6 copy
   All Conversation Mode strings live here.
   ============================================================= */

export const CONVERSATION = {
  featureName: "Conversation Mode",
  entryHeading: "Prepare Your HealthStory",
  entrySupporting: "Choose the information you want to bring into your conversation.",
  principle: "Your words, organized.",
  principleSub:
    "HealthStory AI helps structure the information you choose to record. You can review and edit everything before using it.",

  focusHeading: "What would you like to prepare?",
  focusOptions: [
    { id: "full", label: "Full story", hint: "Everything you have recorded in the selected period." },
    { id: "changes", label: "Recent changes", hint: "Only the changes you have confirmed." },
    { id: "topic", label: "A specific topic", hint: "Focus on one topic from your story." },
    { id: "questions", label: "Questions I want to ask", hint: "Your questions, ready to bring." },
    { id: "recent", label: "Recent timeline", hint: "The most recent entries." },
    { id: "summary", label: "Summary only", hint: "A short spoken-style summary." },
  ] as const,

  shareHeading: "Choose what to include",
  includeTimeline: "Timeline",
  includeChanges: "Recent changes",
  includeContext: "Relevant source notes",
  includeSummary: "Current summary",
  includeQuestions: "Questions",
  includeOlderEntries: "Older entries",
  includeEvidence: "Source evidence",
  includeUnconfirmed: "Include AI-organized items I haven't confirmed yet",
  unconfirmedWarning:
    "Review pending information before including it. Items you have not confirmed are excluded by default.",

  topicHeading: "Choose a topic",
  topicEmpty: "No topics have been recorded yet.",

  periodHeading: "Time period",
  customFrom: "From",
  customTo: "To",

  styleHeading: "Communication Style",
  styleOptions: [
    { id: "QUICK", label: "Quick", hint: "A very short summary for a time-limited conversation." },
    { id: "STANDARD", label: "Standard", hint: "Balanced summary with timeline and important changes." },
    { id: "DETAILED", label: "Detailed", hint: "More complete story with supporting information." },
  ] as const,

  toneHeading: "Conversation tone",
  toneOptions: [
    { id: "CALM", label: "Calm" },
    { id: "DIRECT", label: "Direct" },
    { id: "SIMPLE", label: "Simple" },
    { id: "STRUCTURED", label: "Clear & structured" },
  ] as const,

  personHeading: "Point of view",
  personOptions: [
    { id: "FIRST", label: "First person" },
    { id: "NEUTRAL", label: "Neutral summary" },
  ] as const,

  plainHeading: "Simplify Language",
  plainOn: "Plain Language",
  plainOff: "Standard",

  languageHeading: "Communication Language",
  prototypeNote: "Prototype translation · review before use.",
  plannedNote: "Additional communication languages are planned for a future version.",
  originalLabel: "Original",
  communicationLabel: "Communication version",
  switchLanguage: "Switch Language",
  bridgeHeading: "Side-by-side",
  notLocalizedNote:
    "Some wording could not be mapped in this prototype and remains in the original language.",

  generateCta: "Generate Conversation Summary",
  generatingHeading: "Preparing your communication summary…",
  generatingSub: "We're assembling a draft from the information you reviewed.",
  demoCta: "Explore a Complete HealthStory",
  viewMyStory: "View My Story",
  continueCta: "Continue",

  oneMinuteCta: "One-Minute Story",
  oneMinuteHeading: "One-Minute Story",
  oneMinuteNote: "A short version you can say out loud. Speaking time varies.",
  quickVersionCta: "Quick Version",

  evidenceLabel: "View source",
  evidenceClose: "Hide source",
  whyIncluded: "Why is this included?",
  whyIncludedBody: "This section was generated from {count} confirmed entries in your HealthStory.",
  includedBecause: "Included because this information appeared in your {date} entry.",
  basedOnYourEntries: "Based on your entries",

  editCta: "Edit",
  saveCta: "Save",
  cancelCta: "Cancel",
  regenerateCta: "Regenerate",
  discardCta: "Discard",
  regenerateOptions: [
    { id: "clearer", label: "Clearer" },
    { id: "shorter", label: "Shorter" },
    { id: "simpler", label: "Simpler" },
    { id: "structured", label: "More structured" },
  ] as const,
  userEditedBadge: "User edited",
  aiOrganizedBadge: "AI organized",

  conversationViewCta: "Conversation View",
  summaryViewCta: "Summary View",
  conversationViewNote: "Large text for looking at during a conversation.",

  questionHeading: "My Questions",
  questionAdd: "+ Add Question",
  questionPlaceholder: "Add a question…",
  questionAddBtn: "Add",
  questionEmpty: "No questions added yet.",
  questionEmptySub: "Add anything you want to remember during your conversation.",
  questionEditCta: "Edit",
  questionDeleteCta: "Delete",
  questionDiscussedCta: "Mark discussed",
  questionRemoveCta: "Remove",
  questionAiBadge: "AI suggested",
  questionUserBadge: "Added by you",
  questionSuggestCta: "Suggest questions",

  finalHeading: "Final Review",
  finalSupporting: "Review this information before using or sharing it.",
  finalCheckbox: "I reviewed the generated content.",
  useThisVersionCta: "Use This Version",
  backToEditingCta: "Back to editing",
  finalBanner: "Your story, ready to communicate.",
  finalBannerSub: "This summary is yours. Use it however you need.",

  copyCta: "Copy summary",
  copiedLabel: "Copied",
  printCta: "Print",
  exportPdfCta: "Save as PDF",
  exportNote: "Use Print to save a PDF. Review before sharing.",

  conflictHeading: "Information needs review",
  conflictBody: "Your HealthStory contains conflicting entries related to this topic.",
  conflictReviewCta: "Review Conflict",

  validationHeading: "Wording check",
  validationOk: "No unsafe wording was detected in this draft.",
  validationIssues: "Some wording needs your attention before use.",

  privacyNote:
    "Choose exactly what to include. Review your sharing choices before using or exporting this summary.",
  safetyNotice:
    "HealthStory AI helps organize information you choose to share. It does not diagnose conditions or provide medical treatment advice.",
  exportDisclaimer:
    "Generated from information recorded by the user. It is not a medical diagnosis or clinical assessment.",

  emptyHeading: "Build your HealthStory first.",
  emptyBody: "Once you have recorded some information, you can turn it into a conversation summary.",

  errorHeading: "We couldn't generate the summary.",
  errorBody: "Your HealthStory is still safe. You can review the information manually.",
  tryAgainCta: "Try Again",
  viewStoryCta: "View My Story",

  rehearsalHeading: "Practice My Story",
  rehearsalIntro: "The system displays one section at a time. This is communication practice, not medical advice.",
  rehearsalStep: "Step {n} of {total}",
  rehearsalNext: "Next",
  rehearsalPrev: "Back",
  rehearsalRead: "Read Story",
  rehearsalDone: "Conversation Ready",
  rehearsalDoneSub: "You have practiced what you want to communicate.",
  rehearsalPrompts: [
    "Start with when you first noticed it.",
    "Next, describe how it changed.",
    "Then, mention the context you recorded.",
    "Finally, mention your recent update and your questions.",
  ] as const,

  demoLabel: "Fictional demonstration data",
} as const;
