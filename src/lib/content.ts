/* =============================================================
   HealthStory AI — Stage 1 content layer
   All page copy and demonstration data lives here, separate from
   the UI components that render it.

   IMPORTANT: every record below is FICTIONAL demonstration data
   for a fictional person ("Alex"). Nothing here is real patient
   information and nothing here is a medical finding.
   ============================================================= */

export const brand = {
  name: "HealthStory AI",
  tagline: "Your health has a story.",
  builtFor: "Built for UnivaBio — AI for Human Health",
} as const;

export const nav = {
  links: [
    { label: "Product", href: "#product" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Why HealthStory", href: "#why-healthstory" },
    { label: "Safety", href: "#safety" },
    { label: "My Story", href: "/my-story" },
  ],
  cta: "Start Your Health Story",
} as const;

export const hero = {
  eyebrow: "AI for Human Health",
  headlineLines: ["Your health has a story.", "We help you make sense of it."],
  supporting:
    "HealthStory AI transforms scattered symptoms, health events, notes, and medical information into a clear, structured story you can understand and discuss with a healthcare professional.",
  ctaPrimary: "Start Your Health Story",
  ctaSecondary: "See How It Works",
  trustLine:
    "Designed to support healthcare conversations — not replace professional care.",
  stat: {
    value: "6 months",
    label: "of health history, read as one story",
  },
} as const;

/* ---------- Hero visualisation: fictional timeline ---------- */
export const timeline = {
  caption: "Product preview · fictional sample person",
  subject: "Alex",
  events: [
    { month: "JAN", text: "Occasional headaches", tone: "neutral" },
    { month: "MAR", text: "Frequency increased", tone: "rise" },
    { month: "APR", text: "Sleep reduced", tone: "fall" },
    { month: "MAY", text: "New symptom reported", tone: "rise" },
    { month: "JUN", text: "Recent health change", tone: "neutral" },
  ],
  insight: {
    headline: "3 notable changes detected",
    sub: "Across a 6-month sample story",
    items: [
      { label: "Increased frequency", direction: "up" as const },
      { label: "Sleep pattern changed", direction: "down" as const },
      { label: "New symptom reported", direction: "new" as const },
    ],
  },
} as const;

/* ---------- Problem ---------- */
export const problem = {
  eyebrow: "The Problem",
  heading: "Healthcare information is scattered.",
  supporting:
    "A person's health history rarely exists in one place. Important details can be buried in notes, memories, test results, medication lists, and conversations.",
  cards: [
    {
      title: "Symptoms",
      description: "Changes can be difficult to remember over weeks or months.",
      icon: "pulse",
    },
    {
      title: "Timeline",
      description:
        "Important events may be separated by days, weeks, or years.",
      icon: "timeline",
    },
    {
      title: "Medical information",
      description:
        "Reports, medications, and test results can be difficult to organize.",
      icon: "document",
    },
    {
      title: "Communication",
      description:
        "People may struggle to explain the complete story during a healthcare conversation.",
      icon: "chat",
    },
  ],
} as const;

/* ---------- WOW: scattered → structured ---------- */
export const transformation = {
  scattered: {
    label: "Scattered health information",
    items: [
      "notes",
      "symptoms",
      "dates",
      "medications",
      "tests",
      "memories",
    ],
  },
  structured: {
    label: "Structured health story",
    items: [
      "timeline",
      "changes",
      "patterns",
      "summary",
      "questions",
    ],
  },
  aiLabel: "AI",
  caption:
    "The whole product in one transformation — fragments in, one readable story out.",
} as const;

/* ---------- Solution ---------- */
export const solution = {
  eyebrow: "The Solution",
  heading: "One story. One timeline. A clearer picture.",
  supporting:
    "HealthStory AI brings fragmented health information together and organizes it into a timeline designed for human understanding.",
  mockup: {
    title: "Health Story",
    subtitle: "6 months of health history",
    badge: "AI-organized",
    caption: "Product preview · fictional sample data",
    streams: [
      { label: "Symptoms", count: 3 },
      { label: "Events", count: 1 },
      { label: "Medications", count: 1 },
      { label: "Tests", count: 1 },
      { label: "Lifestyle changes", count: 2 },
    ],
    /* One chronological stream — every category woven into the same order. */
    entries: [
      {
        date: "12 Jan",
        category: "Symptoms",
        text: "Occasional headaches, mostly in the afternoon",
      },
      {
        date: "03 Feb",
        category: "Lifestyle",
        text: "Sleep shortened to roughly five hours a night",
      },
      {
        date: "18 Mar",
        category: "Symptoms",
        text: "Headaches now several times a week",
      },
      {
        date: "07 Apr",
        category: "Lifestyle",
        text: "Evening walk replaced by later working hours",
      },
      {
        date: "22 Apr",
        category: "Medications",
        text: "Began over-the-counter painkillers as needed",
      },
      {
        date: "09 May",
        category: "Symptoms",
        text: "New symptom noted: light sensitivity",
      },
      {
        date: "14 Jun",
        category: "Tests",
        text: "Blood test results added to the story",
      },
    ],
  },
} as const;

/* ---------- How it works ---------- */
export const howItWorks = {
  eyebrow: "How It Works",
  heading: "From scattered information to a structured story.",
  supporting:
    "Four steps turn what you already know into something you can read.",
  flow: ["Input", "AI", "Timeline", "Understanding"],
  steps: [
    {
      number: "01",
      title: "Tell your story",
      description:
        "Users can enter information naturally through text, notes, or future voice input.",
    },
    {
      number: "02",
      title: "AI organizes it",
      description:
        "AI extracts important dates, symptoms, events, and changes.",
    },
    {
      number: "03",
      title: "See what changed",
      description:
        "The system helps users identify notable changes across their timeline.",
    },
    {
      number: "04",
      title: "Prepare for better conversations",
      description:
        "Users can generate a structured summary and questions to discuss with a healthcare professional.",
    },
  ],
} as const;

/* ---------- Signature feature ---------- */
export const whatChanged = {
  eyebrow: "Signature Feature",
  heading: "Don't just see your history. See what changed.",
  supporting:
    "Health information becomes more useful when changes over time are easy to understand.",
  caption: "Product preview · fictional sample person (Alex)",
  metrics: [
    {
      label: "Sleep",
      before: 80,
      after: 40,
      direction: "down" as const,
      verb: "decreased",
    },
    {
      label: "Headache frequency",
      before: 20,
      after: 60,
      direction: "up" as const,
      verb: "increased",
    },
    {
      label: "Activity",
      before: 70,
      after: 50,
      direction: "down" as const,
      verb: "changed",
    },
  ],
  findingsTitle: "Notable changes",
  findings: [
    "Sleep pattern changed",
    "Symptom frequency increased",
    "Activity pattern changed",
  ],
  disclaimer:
    "HealthStory AI highlights changes for discussion — it does not diagnose them.",
} as const;

/* ---------- Global accessibility ---------- */
export const languages = {
  eyebrow: "Global Accessibility",
  heading: "Healthcare has no single language.",
  supporting:
    "Health experiences should be understandable regardless of the language someone uses to describe them.",
  chips: ["English", "Hindi", "Spanish", "French", "Arabic"],
  statusNote:
    "Product direction for a future release — language support ships only where the underlying model is actually verified.",
  samples: [
    {
      lang: "Hindi",
      code: "hi",
      dir: "ltr",
      text: "पिछले तीन महीनों से सिरदर्द ज़्यादा हो रहा है",
      gloss: "Headaches have increased over the past three months.",
    },
    {
      lang: "Spanish",
      code: "es",
      dir: "ltr",
      text: "Desde hace tres meses me duele la cabeza más seguido",
      gloss: "My head has hurt more often for the past three months.",
    },
    {
      lang: "French",
      code: "fr",
      dir: "ltr",
      text: "Depuis trois mois, j'ai mal à la tête plus souvent",
      gloss: "For three months, I have had headaches more often.",
    },
    {
      lang: "Arabic",
      code: "ar",
      dir: "rtl",
      text: "في الأشهر الثلاثة الماضية أصبحت الصداع أكثر تكراراً",
      gloss: "In the past three months, headaches have become more frequent.",
    },
  ],
  output: {
    lang: "English",
    code: "en",
    items: ["Mar → Jun", "Frequency: increased", "Sleep: reduced"],
    note: "Structured health story",
  },
} as const;

/* ---------- Human centered ---------- */
export const humanCentered = {
  eyebrow: "Human-Centered",
  heading: "Built around the person — not just the data.",
  supporting:
    "The goal is not more data. It is more understanding, and better conversations.",
  cards: [
    {
      title: "Understand",
      description: "Make complex health information easier to follow.",
      icon: "read",
    },
    {
      title: "Remember",
      description: "Keep important events and changes organized.",
      icon: "archive",
    },
    {
      title: "Communicate",
      description:
        "Help users prepare for conversations with healthcare professionals.",
      icon: "chat",
    },
  ],
} as const;

/* ---------- Safety ---------- */
export const safety = {
  eyebrow: "Safety",
  heading: "Built to support — not replace — healthcare professionals.",
  body: "HealthStory AI is designed as an informational and communication tool. It organizes health information and highlights changes for understanding and discussion. It does not provide a medical diagnosis, emergency medical advice, or replace a qualified healthcare professional.",
  points: [
    {
      title: "No diagnosis",
      description:
        "The product surfaces patterns and changes for discussion — it never states what condition you have.",
    },
    {
      title: "No emergency guidance",
      description:
        "HealthStory AI does not provide emergency medical advice. For urgent symptoms, contact local emergency services.",
    },
    {
      title: "AI output is labelled",
      description:
        "Anything the AI generates is visibly marked as AI-organized so you always know what is observation and what is inference.",
    },
  ],
  emergencyNote:
    "If you may be experiencing a medical emergency, contact your local emergency number immediately.",
} as const;

/* ---------- Privacy ---------- */
export const privacy = {
  eyebrow: "Privacy",
  heading: "Your health story deserves privacy.",
  supporting:
    "Three design principles guide how health information is handled in this product.",
  principles: [
    {
      title: "You control your story",
      description: "The user decides what information to provide.",
    },
    {
      title: "Privacy by design",
      description:
        "Health information should be handled with strong privacy principles.",
    },
    {
      title: "Transparency",
      description: "AI-generated insights should be clearly identified.",
    },
  ],
  note: "These are product design principles. HealthStory AI makes no certification or regulatory-compliance claim.",
} as const;

/* ---------- Final CTA ---------- */
export const finalCta = {
  eyebrow: "Get started",
  heading: "Your health story shouldn't live in scattered notes.",
  supporting: "Start turning fragmented information into a clearer timeline.",
  primary: "Start Your Health Story",
  secondary: "Built for understanding. Designed for better conversations.",
  paths: [
    {
      title: "Paste your notes",
      description:
        "Bring text you already have — messages, journals, appointment notes.",
      status: "Planned input",
    },
    {
      title: "Add events by hand",
      description: "Record dates, symptoms and changes as you remember them.",
      status: "Planned input",
    },
    {
      title: "Upload documents",
      description:
        "Reports and test summaries, read and placed into your timeline.",
      status: "Planned input",
    },
  ],
  stageNote:
    "Stage 1 of the build is this public landing page. The interactive HealthStory experience is delivered in the next stage — nothing on this page is pretending to be live AI.",
} as const;

/* ---------- Footer ---------- */
export const footer = {
  tagline: "Your health has a story.",
  links: [
    { label: "Product", href: "#product" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Safety", href: "#safety" },
    { label: "Privacy", href: "#privacy" },
    { label: "Security", href: "/security" },
    { label: "About", href: "#about" },
  ],
  disclaimer:
    "HealthStory AI is an informational and communication tool and is not a substitute for professional medical advice, diagnosis, or treatment.",
} as const;