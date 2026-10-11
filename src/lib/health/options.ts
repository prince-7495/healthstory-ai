/* =============================================================
   HealthStory AI — Stage 2 option lists & fixed copy
   Mirrors the brief's wording so the workspace feels intentional.
   ============================================================= */

export const WORKSPACE = {
  backToSite: "Back to site",
  headerLabel: "Your Health Story",
  /** The four-step product narrative: Tell → Organize → Understand → Prepare. */
  steps: ["Tell your story", "Organize", "Understand", "Prepare"],
} as const;

export const INTRO = {
  heading: "Tell us what you've noticed.",
  supporting:
    "You don't need to organize everything perfectly. Describe your experience naturally. We'll help structure it later.",
} as const;

export const INPUT = {
  heading: "What would you like to remember about your health?",
  placeholder: "Example: “I've been feeling unusually tired for the past two months...”",
  helper: "Write naturally. You don't need medical terminology.",
  charLimit: 5000,
  /** Below this we ask for a bit more before organizing. */
  minLength: 25,
} as const;

export interface QuickPrompt {
  id: string;
  label: string;
  /** Replaces the textarea placeholder when selected. */
  placeholder: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "symptom",
    label: "A symptom I've noticed",
    placeholder: "What have you noticed, and when did it start?",
  },
  {
    id: "changed",
    label: "Something that changed",
    placeholder: "What was different about it compared with before?",
  },
  {
    id: "event",
    label: "A recent health event",
    placeholder: "What happened, and roughly when did it happen?",
  },
  {
    id: "medication",
    label: "A medication or treatment",
    placeholder: "What did you start, stop, or change, and when?",
  },
  {
    id: "appointment",
    label: "A test or appointment",
    placeholder: "What was it, and when did it happen?",
  },
  {
    id: "worry",
    label: "Something I've been worried about",
    placeholder: "What has been on your mind about your health?",
  },
];

export const START_OPTIONS = [
  "Today",
  "This week",
  "This month",
  "A few months ago",
  "More than a year ago",
  "Specific date",
] as const;

export const FREQUENCY_OPTIONS = [
  "Once",
  "Occasionally",
  "Weekly",
  "Several times a week",
  "Daily",
  "Varies",
] as const;

export const CHANGE_OPTIONS = [
  "Getting better",
  "Getting worse",
  "Staying about the same",
  "Comes and goes",
  "Not sure",
] as const;

/**
 * Stage 2 ships English only. The selector is visually complete and the
 * options are listed, but anything other than English is explicitly
 * marked as not yet supported so we never imply live translation.
 */
export const LANGUAGES = [
  { id: "English", code: "en", supported: true },
  { id: "Hindi", code: "hi", supported: false },
  { id: "Spanish", code: "es", supported: false },
  { id: "French", code: "fr", supported: false },
  { id: "Arabic", code: "ar", supported: false },
] as const;

export const VOICE = {
  idle: "Tell your story",
  recording: "Listening…",
  paused: "Paused",
  captured: "Voice captured",
  useRecording: "Use recording",
  tryAgain: "Try again",
  start: "Start recording",
  stop: "Stop",
  pause: "Pause",
  resume: "Resume",
  discard: "Discard",
  /**
   * Shown whenever the browser has no usable SpeechRecognition. We never
   * pretend a microphone captured anything.
   */
  demoNotice:
    "Voice input is a preview in this build. Speech recognition runs only if your browser supports it — otherwise this is a clearly labelled demo waveform and no audio is recorded.",
} as const;

export const DOCUMENT = {
  heading: "Have a document?",
  supporting:
    "You can add a relevant health document to help organize your story.",
  button: "Upload document",
  dropHint: "or drag and drop",
  formats: "PDF, JPG or PNG",
  addedLabel: "Document added",
  notice:
    "Stage 2 stores the file name only. Nothing is read, uploaded, or analyzed yet.",
} as const;

export const PRIVACY_NOTE =
  "Your health information is sensitive. Only provide information you're comfortable using in this prototype.";

export const MAIN_ACTION = {
  label: "Organize My Story",
  notice:
    "HealthStory AI organizes information for understanding and discussion. It does not provide a medical diagnosis.",
} as const;

export const PROCESSING = {
  heading: "Building your health story…",
  subtext: "We're organizing the information you shared.",
  stages: [
    { id: "reading", label: "Reading your story" },
    { id: "dates", label: "Identifying dates and events" },
    { id: "timeline", label: "Organizing your timeline" },
    { id: "changes", label: "Detecting notable changes" },
    { id: "building", label: "Preparing your story" },
  ],
} as const;

export const RESULT = {
  heading: "Your Health Story",
  badge: "AI-organized",
  timelineHeading: "Timeline",
  structuredHeading: "Structured information",
  changesHeading: "Notable changes",
  questionsHeading: "Questions to discuss with a healthcare professional",
  gapsHeading: "Complete your story",
  continueCta: "Continue to Timeline",
  editCta: "Edit My Story",
  stage3Notice:
    "Stage 3 builds the interactive timeline on top of this organized story. Nothing is lost — you can return and edit any time.",
  provenance: {
    user: "User reported",
    ai: "AI organized",
  },
} as const;

export const EMPTY_STATE = {
  heading: "Your health story starts here.",
  text: "Start with one thing you've noticed. You can add more later.",
  cta: "Write your first note",
  previewHeading: "Your Story",
  previewEmpty: "Your timeline will appear here as you write.",
} as const;

export const ERRORS = {
  empty: "Tell us a little about what you've noticed first.",
  tooShort: "Add a little more detail so we can organize your story.",
  failedHeading: "We couldn't organize that yet.",
  failedBody: "Your information is still here. Try again or edit your story.",
  tryAgain: "Try again",
  editStory: "Edit story",
} as const;

export const DEMO = {
  button: "Try a Demo Story",
  label: "Fictional demo data",
  notice:
    "Fictional demo data for a fictional person. No real health information is used.",
} as const;

/* =============================================================
   Stage 3 — Analysis Dashboard copy
   ============================================================= */

export const ANALYSIS = {
  heading: "We organised your story.",
  supporting:
    "Health information can be difficult to remember and organise. HealthStory AI turns the information you shared into a structured timeline while keeping your original meaning visible.",
  safetyBadge: "AI-organised information — not a medical diagnosis",

  summaryHeading: "Your Story So Far",

  timelineHeading: "Timeline",
  timelineEmpty:
    "Nothing to place on a timeline yet. Try adding more detail to your story.",

  extractedHeading: "Extracted Information",
  extractedEmpty: "No structured events were identified in what you wrote.",

  changesHeading: "What Changed?",
  changesEmpty:
    "No clear change was reported in what you wrote. If something shifted over time, adding that detail usually makes the timeline much more useful.",

  unclearHeading: "Information That May Need Clarification",
  unclearEmpty: "No conflicting or ambiguous information was detected.",

  missingHeading: "Information Not Provided",

  evidenceLabel: "Based on your words",
  evidenceToggle: "View source",
  evidenceClose: "Hide source",

  confirmBtn: "Confirm",
  editBtn: "Edit",
  removeBtn: "Remove",
  restoreBtn: "Restore",
  saveBtn: "Save",
  cancelBtn: "Cancel",

  statusLabels: {
    AI_ORGANIZED: "AI organised",
    CONFIRMED: "Confirmed by you",
    EDITED: "Edited by you",
    REMOVED: "Removed by you",
  } as Record<string, string>,

  confidenceLabels: {
    high: "Clearly stated",
    medium: "Partly stated",
    low: "Unclear from your words",
  } as Record<string, string>,

  categoryLabels: {
    symptom: "Symptom",
    medication: "Medication",
    treatment: "Treatment",
    test: "Test",
    appointment: "Appointment",
    lifestyle: "Lifestyle",
    context: "Context",
    change: "Change",
    other: "Other",
  } as Record<string, string>,

  continueCta: "Continue to Stage 4 →",
  backToStory: "Back to My Story",
  editStoryCta: "Edit My Story",

  humanInLoop:
    "AI organises. You stay in control.",
  humanInLoopSub:
    "Every extracted item shows where it came from. Confirm what's right, edit what needs adjusting, remove anything that doesn't apply.",
} as const;

/* =============================================================
   Stage 4 — Health Summary + Conversation Prep copy
   ============================================================= */

export const SUMMARY = {
  heading: "Your Health Summary",
  supporting: "A structured summary based on the information you provided.",
  safetyBadge: "AI-organized • Review before sharing",

  prepareHeading: "Prepare for a Healthcare Conversation",
  prepareSupporting:
    "Your story is organized. Now turn it into a clear summary you can review and discuss with a healthcare professional.",
  createCta: "Create My Health Summary",
  editStoryCta: "Edit My Story",

  preparingHeading: "Preparing your health summary…",
  preparingSub: "We're assembling the summary from the story you reviewed.",

  /* section titles */
  mainConcernHeading: "Main concern",
  timelineHeading: "Timeline",
  changesHeading: "Changes reported",
  otherHeading: "Other information mentioned",
  questionsHeading: "Questions to discuss",
  missingHeading: "Information not provided",
  notesHeading: "Notes added by you",
  conversationPrepHeading: "Conversation Prep",
  conversationPrepSub: "A short version you can glance at before an appointment.",

  /* review */
  reviewHeading: "Review Your Summary",
  reviewSupporting:
    "Review the summary before sharing. You stay in control of what you send.",
  reviewItems: [
    "The summary accurately reflects what I entered.",
    "I reviewed the timeline.",
    "I checked the important changes.",
    "I checked the questions.",
    "I removed anything I don't want to share.",
  ],
  reviewReady: "Your summary is ready",
  reviewReadySub: "Review it one more time before sharing.",
  previewCta: "Preview Summary",
  editAgainCta: "Edit Again",
  startOverCta: "Start Over",
  exportCta: "Export Summary",
  reviewSummaryCta: "Review Summary",

  /* editing */
  editSectionCta: "Edit section",
  removeSectionCta: "Remove section",
  restoreSectionCta: "Restore section",
  restoreOriginalCta: "Restore original",
  saveCta: "Save",
  cancelCta: "Cancel",
  makeClearerCta: "Make clearer",
  clearerNotice: "Rewritten for clarity only. No new information was added.",
  editedBadge: "Edited by you",

  /* length control */
  lengthHeading: "Summary length",
  lengthOptions: [
    { id: "brief", label: "Brief", hint: "Useful for quickly showing a healthcare professional." },
    { id: "standard", label: "Standard", hint: "Recommended appointment-preparation summary." },
    { id: "detailed", label: "Detailed", hint: "Includes more timeline and evidence information." },
  ] as const,

  /* sharing */
  shareHeading: "Share Your Summary",
  shareSupporting:
    "Choose what you want to share. Review your summary before sending it to anyone.",
  privacyNote:
    "Health information can be sensitive. Make sure you are comfortable with what you are sharing.",
  copyCta: "Copy summary",
  copiedLabel: "Copied to clipboard",
  downloadCta: "Download summary",
  printCta: "Print",
  shareNativeCta: "Share",
  shareUnsupported: "Sharing isn't available in this browser.",
  selectiveHeading: "Choose what to include",
  createSelectedCta: "Create Selected Summary",
  includeEvidenceLabel: "Include source quotes (evidence-rich summary)",

  previewHeading: "Preview",
  previewSub: "This is exactly what will be shared.",
  previewEmpty: "Select at least one section to preview.",

  /* questions */
  addQuestionCta: "+ Add a question",
  addQuestionPlaceholder: "What would you like to discuss?",
  addQuestionButton: "Add Question",
  aiBadge: "AI suggested",
  userBadge: "Added by you",
  editedQuestionBadge: "Edited",
  removeQuestionCta: "Remove",

  /* source */
  sourceHeading: "Source",
  sourceStatementLabel: "Summary statement",
  sourceOriginalLabel: "Original information",
  viewSourceCta: "View source",
  closeCta: "Close",
  noSource: "No direct source phrase was recorded for this item.",

  /* statuses */
  statusDraft: "Draft",
  statusRequired: "Review required",
  statusReviewed: "Reviewed",
  versionLabel: "Summary",

  /* errors */
  errorHeading: "We couldn't create your summary.",
  errorBody: "Your organized timeline is still available.",
  tryAgainCta: "Try Again",
  viewTimelineCta: "View Timeline",
  createManuallyCta: "Create Manually",

  /* changed-story banner */
  regenerateHeading: "Your story changed.",
  regenerateBody:
    "Your current summary has been kept. Update it to include the changes you made to the timeline.",
  updateSummaryCta: "Update Summary",
  diffHeading: "What changed in your summary?",
  diffPreviousLabel: "Previous",
  diffUpdatedLabel: "Updated",
  diffFromTimeline: "Updated from timeline",
  acceptUpdateCta: "Use updated summary",
  keepCurrentCta: "Keep my edits",

  /* closing */
  finalHeading: "Your story is ready to communicate.",
  finalSupporting:
    "Review your summary, make any changes you want, and choose what information you want to share.",
  finalSafety:
    "HealthStory AI helps organize information provided by users for communication and appointment preparation. It does not diagnose conditions, provide treatment recommendations, or replace professional medical advice.",
  demoGenerated: "Demo-generated summary",
  organisedLabel: "Organized from your story",
  pendingReview:
    "You can confirm, edit or remove them on the timeline so the summary reflects only information you have reviewed.",
} as const;
