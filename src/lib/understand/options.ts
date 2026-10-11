/* =============================================================
   HealthStory AI — Stage 8 copy
   ============================================================= */

export const UNDERSTAND = {
  featureName: "Understand",
  homeHeading: "Understand Your Health Information",
  homeSupporting:
    "Have a report, note, medical term, or health information you want explained in simpler language?",

  optionUpload: "Upload a Document",
  optionUploadHint: "PDF, text, or image files you've received",
  optionPaste: "Paste Text",
  optionPasteHint: "Copy and paste text from a document or message",
  optionTerm: "Explain a Term",
  optionTermHint: "Look up a specific medical word or phrase",
  optionStory: "Use My HealthStory",
  optionStoryHint: "Get explanations grounded in your existing story",

  uploadHeading: "Add a Document",
  uploadDropzone: "Drop your file here",
  uploadChoose: "Choose File",
  uploadSupporting: "You control which information you provide.",
  uploadTypes: "This prototype reads plain text (.txt, .md) — no OCR, no PDF parsing",
  uploadPrivacy: "Only analyze the information you choose to provide.",
  uploadProcessing: "Processing runs locally in your browser with a deterministic prototype engine — nothing is uploaded to a server.",
  uploadNotSecure: "This prototype does not claim HIPAA, GDPR, or encryption certifications.",

  processingStages: [
    "Reading document",
    "Finding sections",
    "Identifying important terms",
    "Organizing information",
    "Preparing plain-language explanation",
  ] as const,

  previewHeading: "Review Before Understanding",
  previewFileName: "File name",
  previewPages: "Pages",
  previewLanguage: "Detected language",
  previewType: "Document type",
  understandCta: "Understand This",
  removeCta: "Remove",
  backCta: "Back",

  selectionModes: {
    entire: "Entire document",
    pages: "Selected pages",
    text: "Selected text",
  },

  overviewHeading: "Here's what we found.",
  sectionsLabel: "Document sections",
  termsLabel: "Important terms",
  datesLabel: "Dates",
  measurementsLabel: "Recorded measurements",
  clarificationLabel: "Items that may need clarification",
  clarificationNote: '"Important" means important for understanding the document structure, not medically important.',

  plainLanguageHeading: "In Simple Language",
  sourceHeading: "Source",
  viewSourceCta: "View Source",
  hideSourceCta: "Hide Source",

  sectionNavigation: {
    documentPanel: "Document",
    understandingPanel: "Understanding",
    explanationLabel: "Plain-language explanation",
    termsLabel: "Key terms",
    sourceLabel: "Source evidence",
  },

  termExplainerHeading: "What does this mean?",
  termDefinitionLabel: "Plain-language definition",
  termContextLabel: "How the term is used in this document",
  termSourceLabel: "Source context",
  termNoDiagnosis: "This explanation is for understanding, not diagnosis or treatment.",

  contextFirstPrefix: "In this document, this term refers to…",
  whyIsThisHere: "This term appears in the document on page {page}.",

  questionModeHeading: "Ask About This Information",
  questionPlaceholder: '"What does this section mean?"',
  questionSafetyNote: "Answers are based on the information you provided and are for understanding, not diagnosis or treatment.",
  questionNoAnswer: "The provided document doesn't contain enough information to answer that confidently.",
  noSourceNote: "We only answer from text that is actually in your document — otherwise we say so.",
  questionAskCta: "Ask a Question",
  questionViewSourceCta: "View Source",

  uncertaintyPrefix: "This section may be referring to…",
  uncertaintyNote:
    "Descriptions here explain what the document says, not what it means for you. Where the wording is unclear, we say so instead of guessing.",
  noClinicalInterpretation:
    "HealthStory helps explain and organize information you provide. It does not diagnose conditions or replace professional medical advice.",

  explainThisMode: "Explain This",
  explainThisInstruction: "Select text, then click Explain to get a plain-language explanation with source context.",
  highlightAction: "Explain",

  makeSimplerCta: "Simpler",
  makeSimplerExample: {
    technical: "The document describes an elevated glucose measurement.",
    simpler: "This part says your blood sugar is a little higher than the typical range.",
  },

  languageBridge: {
    heading: "Explain in:",
    languages: [
      { id: "en", label: "English", implemented: true },
      { id: "hi", label: "Hindi", implemented: true },
      { id: "gu", label: "Gujarati", implemented: true },
      { id: "es", label: "Spanish", implemented: false },
      { id: "fr", label: "French", implemented: false },
      { id: "ar", label: "Arabic", implemented: false },
    ],
    onlyImplemented: "Only implemented languages are selectable.",
    termNote:
      "In this prototype, section explanations are translated but term definitions stay in English.",
  },

  originalAndExplanation: {
    originalLabel: "ORIGINAL",
    explanationLabel: "PLAIN LANGUAGE",
    sourceLabel: "SOURCE",
  },

  translateVsExplain: {
    translate: "Translate — changes language while preserving meaning",
    explain: "Explain — makes the meaning easier to understand",
    simplify: "Simplify — uses simpler wording",
    dontCombine: "These are kept separate; they are not combined invisibly.",
  },

  documentQuestions: {
    heading: "Ask About This Information",
    placeholder: '"What does this section mean?"',
    safetyNote: "Answers are based on the information you provided and are for understanding, not diagnosis or treatment.",
    mustCiteSources: true,
    distinguishFactsFromExplanation: true,
    stateWhenMissing: true,
    preserveUncertainty: true,
    avoidDiagnosis: true,
    avoidTreatment: true,
    avoidUnsupportedConclusions: true,
  },

  sourceCitation: {
    pagePrefix: "Source: Page {page}",
    sectionPrefix: 'Source: Section "{section}"',
    viewSourceCta: "View Source",
  },

  questionsToAsk: {
    heading: "Questions to Ask",
    examples: [
      "What does this term mean in my report?",
      "Could you explain this section in simpler language?",
      "What does this measurement refer to?",
    ],
    noDiagnosticQuestions: "Diagnostic questions are not generated automatically.",
  },

  questionOwnership: {
    userSource: "USER",
    aiSuggestedSource: "AI_SUGGESTED",
    aiLabel: "AI suggested",
  },

  connectToStory: {
    heading: "Add Relevant Information to My Story",
    options: {
      documentDate: "Document date",
      reportMentioned: "Report mentioned",
      measurement: "Measurement",
      technicalTerm: "Technical term",
      followUpInfo: "Follow-up information",
    },
    addSelectedCta: "Add Selected Information",
    noAutoImport: "Nothing is automatically added. You choose what becomes part of your story.",
    pipeline: [
      "Document",
      "Understand",
      "Select information",
      "Review",
      "Confirm",
      "Add to HealthStory",
    ],
    sourceAttribution: "Source: Uploaded document",
    pageAttribution: "Page {page}",
  },

  documentMemory: {
    saveDocument: "Save document to My Story",
    keepSourceReference: "Keep source reference",
    addToTimeline: "Add selected information to timeline",
  },

  documentLibrary: {
    heading: "My Health Documents",
    empty: "No documents yet. Upload a document to get started.",
    cardFields: ["date", "type", "filename", "status"],
  },

  documentStatuses: {
    SAVED: "Saved",
    ANALYZED: "Analyzed",
    NEEDS_REVIEW: "Needs review",
    REMOVED: "Removed",
  },

  documentVersioning: {
    newVersionDetected: "New version detected",
    keepBoth: "Keep Both",
    replace: "Replace",
  },

  documentComparison: {
    heading: "Compare Documents",
    categories: ["New", "Removed", "Changed", "Unchanged"],
    evidenceFormat: {
      previous: "Previous: {text}",
      current: "Current: {text}",
      sourcePrevious: "Source: {doc}, Page {page}",
      sourceCurrent: "Source: {doc}, Page {page}",
    },
    noMedicalConclusion: "This value was recorded differently in the {current} document.",
  },

  learnMode: {
    heading: "Learn Mode",
    sections: ["Term", "Simple explanation", "Example", "Source context", "Questions to ask"],
    noMedicalAdvice: "This glossary is not personalized medical advice.",
  },

  glossary: {
    heading: "My Health Vocabulary",
    fields: ["term", "plain-language definition", "source", "date added"],
    noGamification: "No points, streaks, badges, scores, or rankings. Just your saved explanations.",
    savedLabel: "Your saved explanations",
  },

  explainSimplyCta: "Explain this simply",
  explanationLevels: {
    simple: { id: "SIMPLE", label: "Simple", hint: "Everyday language" },
    standard: { id: "STANDARD", label: "Standard", hint: "Moderate detail" },
    detailed: { id: "DETAILED", label: "Detailed", hint: "More context" },
  },
  defaultLevel: "SIMPLE",

  explanationStyle: {
    avoid: "This terminology denotes…",
    prefer: "This means…",
  },

  safetyBanner:
    "HealthStory helps explain and organize information you provide. It does not diagnose conditions or replace professional medical advice.",
  emergencyNotice:
    "If you believe you may be experiencing a medical emergency, seek immediate help from local emergency services or an appropriate healthcare professional.",

  discussThisCta: "Discuss This",
  discussHeading: "Question for a Professional",
  discussExample: '"Could you explain what this section means in my situation?"',
  noProfessionalAnswer: "HealthStory does not provide the professional's answer.",

  conversationBridge: {
    heading: "Add to Conversation",
    description: "Send selected, confirmed information into Conversation Mode.",
    pipeline: ["Document", "Understand", "Select", "Confirm", "Add to Conversation"],
  },

  followUpBridge: {
    heading: "Add to Follow-Up",
    description: "Create a draft follow-up entry from this document.",
    draftTemplate: 'I received a document on {date}…',
    noAutoSave: "Nothing is automatically saved as confirmed. You review it first.",
  },

  demoLabel: "FICTIONAL DEMONSTRATION DATA",
  demoReportHint: "Try the example blood test report to see how it works.",

  explainability: {
    heading: "Where did this come from?",
    exampleChain: "HealthStory Event → July 20 Follow-Up → Uploaded Report → Page 2",
  },

  sourceFirst: {
    principle: "SOURCE is more prominent than AI",
    communication: "AI explains the information — not AI is the authority.",
  },

  fallback: {
    heading: "Your document is still available.",
    viewOriginal: "View Original",
    tryAgain: "Try Again",
    remove: "Remove",
  },

  export: {
    heading: "Export Understanding",
    copyCta: "Copy",
    printCta: "Print",
    savePdfCta: "Save as PDF",
  },

  disclaimer: "HealthStory AI organizes and explains information you provide. It does not diagnose, recommend treatment, predict disease, or replace professional medical advice.",
} as const;