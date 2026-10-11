/* =============================================================
   HealthStory AI — the lexicon

   Every word the extractor recognises lives here, grouped by what it
   tells us. Adding a language, a symptom or a phrasing means editing
   this file and nothing else.

   The guiding rule: a pattern may only match language in which a person
   is *reporting* something about themselves. Nothing here infers a
   condition, a cause, or an outcome. "Headaches after studying" is
   recognised as two reported things; it is never read as a cause.
   ============================================================= */

import type { EventCategory, ExtractionConfidence } from "./types";

/** Canonical label + the ways a person is likely to phrase it. */
export interface LexiconEntry {
  label: string;
  patterns: RegExp[];
  /**
   * How clearly a match implies the user stated this.
   *
   * "high"   - the phrase is unambiguous on its own ("blood test")
   * "medium" - strong but could describe something else in context
   * "low"    - needs a second signal before we treat it as reported
   */
  confidence: ExtractionConfidence;
}

const entry = (
  label: string,
  confidence: ExtractionConfidence,
  ...patterns: RegExp[]
): LexiconEntry => ({ label, patterns, confidence });

/* ------------------------------------------------------------------ *
 * Symptoms — something the person says they feel or notice
 * ------------------------------------------------------------------ */

export const SYMPTOM_LEXICON: LexiconEntry[] = [
  entry("Headache", "high", /\bheadaches?\b/i, /\bmigraine/i),
  entry("Fatigue", "high", /\bfatigue[d]?\b/i, /\bexhausted\b/i, /\bdrained\b/i),
  entry("Tiredness", "medium", /\btired\b/i, /\blow energy\b/i, /\bsleepy\b/i),
  entry("Blurred vision", "high", /\bblurred? vision\b/i, /\bblurry\b/i, /\bvision (?:is )?(?:blurry|unclear)\b/i),
  entry("Dizziness", "high", /\bdizz(?:y|iness)\b/i, /\blight-?headed\b/i, /\bvertigo\b/i),
  entry("Nausea", "high", /\bnausea\b/i, /\bfeeling sick\b/i, /\bqueasy\b/i),
  entry("Fever", "high", /\bfever\b/i, /\btemperature\b/i),
  entry("Cough", "high", /\bcough(?:ing)?\b/i),
  entry("Sleep difficulty", "high", /\bcan'?t sleep\b/i, /\binsomnia\b/i, /\bpoor sleep\b/i, /\bwaking (?:up )?(?:often|at night)\b/i),
  entry("Back pain", "high", /\bback (?:pain|ache)\b/i),
  entry("Stomach pain", "high", /\bstomach (?:pain|ache)\b/i, /\babdominal (?:pain|ache)\b/i),
  entry("Chest pain", "high", /\bchest (?:pain|tightness)\b/i),
  entry("Heart palpitations", "high", /\bpalpitation/i, /\bheart (?:racing|pounding)\b/i),
  entry("Anxiety", "medium", /\banx(?:iety|ious)\b/i),
  entry("Appetite change", "high", /\bappetite\b/i, /\beating (?:less|more)\b/i),
  entry("Weight change", "high", /\bweight (?:loss|gain|change[d]?)\b/i, /\blost weight\b/i, /\bgained weight\b/i),
  entry("Rash", "high", /\brash\b/i, /\bhives\b/i),
  entry("Sore throat", "high", /\bsore throat\b/i),
  entry("Congestion", "high", /\bcongestion\b/i, /\bstuffy nose\b/i),
  entry("Numbness or tingling", "high", /\bnumb(ness)?\b/i, /\btingling\b/i, /\bpins and needles\b/i),
  entry("Aches", "medium", /\baches\b/i, /\baching\b/i),
];

/* ------------------------------------------------------------------ *
 * Medication — only ever what the person says they took
 * ------------------------------------------------------------------ */

export const MEDICATION_LEXICON: LexiconEntry[] = [
  entry("Medication mentioned", "high", /\b(?:prescription|medication|medicine)\b/i),
  entry("Started a medication", "high", /\b(?:started|begin(?:ning)?|taking) (?:a |the |my )?(?:new )?(?:medication|pill|tablet|medicine|prescription)\b/i, /\bprescribed\b/i, /\bon (?:a |the )?new (?:medication|prescription)\b/i),
  entry("Stopped a medication", "high", /\bstopped (?:taking |my |the )?(?:medication|pill|tablet|medicine)\b/i, /\bno longer taking\b/i, /\bcame off\b/i),
  entry("Changed a dose", "high", /\b(?:increased|decreased|reduced|changed) (?:my |the )?(?:dose|dosage)\b/i),
  // Named drugs people actually mention. Naming one is reporting it.
  entry("Ibuprofen reported", "high", /\bibuprofen\b/i, /\badvil\b/i),
  entry("Paracetamol reported", "high", /\bparacetamol\b/i, /\bacetaminophen\b/i, /\btylenol\b/i),
  entry("Antihistamine reported", "high", /\bantihistamine/i),
  entry("Antibiotics reported", "high", /\bantibiotic/i, /\bpenicillin\b/i),
];

/* ------------------------------------------------------------------ *
 * Treatment — self-care and non-drug actions
 * ------------------------------------------------------------------ */

export const TREATMENT_LEXICON: LexiconEntry[] = [
  entry("Rest and recovery", "high", /\b(?:more )?rest(?:ing)?\b/i, /\btaking it easy\b/i),
  entry("Hydration", "high", /\bdrinking more water\b/i, /\bmore (?:water|fluids?)\b/i, /\bincreased (?:water|hydration|fluids?)\b/i, /\bhydrated?\b/i),
  entry("Taking breaks", "high", /\btaking (?:more )?breaks\b/i, /\bmore breaks\b/i, /\bbrief breaks\b/i),
  entry("Changed routine", "medium", /\bnew routine\b/i, /\bchanged (?:my )?(?:routine|schedule)\b/i),
  entry("Physical activity reported", "high", /\b(?:started |more |less )?(?:exercise|exercising|workout|walking|running)\b/i),
  entry("Stretching or posture work", "medium", /\bstretch(?:ing|ed)?\b/i, /\bposture\b/i),
];

/* ------------------------------------------------------------------ *
 * Tests — recorded, never interpreted
 *
 * A test result is information the person volunteers. We organise it.
 * We do not read it, and no result value is ever extracted or scored.
 * ------------------------------------------------------------------ */

export const TEST_LEXICON: LexiconEntry[] = [
  entry("Blood test reported", "high", /\bblood test/i, /\bbloodwork\b/i, /\blab(?:oratory)? (?:test|results?)\b/i),
  entry("Scan reported", "high", /\b(?:ct| mri| mra| x-?ray|ultrasound|scan)\b/i),
  entry("Test reported", "medium", /\btest(?:s|ing|ed)?\b/i),
  entry("Results mentioned", "medium", /\bresults? (?:came|came back|were|showed)\b/i),
];

/* ------------------------------------------------------------------ *
 * Appointments
 * ------------------------------------------------------------------ */

export const APPOINTMENT_LEXICON: LexiconEntry[] = [
  entry("Doctor's appointment", "high", /\b(?:doctor|gp|physician)'?s? (?:appointment|visit)\b/i, /\bappointment with (?:my |the |a )?(?:doctor|gp)\b/i, /\bsaw my (?:doctor|gp)\b/i),
  entry("Specialist appointment", "high", /\bspecialist (?:consultation|appointment|visit)\b/i, /\bconsultation with\b/i),
  entry("Hospital visit", "high", /\bhospital (?:appointment|visit|admission)\b/i, /\bwent to (?:the )?(?:hospital|er|emergency)\b/i, /\boutpatient (?:visit|appointment)\b/i),
  entry("Appointment reported", "medium", /\bappointment\b/i, /\bconsultation\b/i),
];

/* ------------------------------------------------------------------ *
 * Lifestyle — routine factors the person mentions
 *
 * Deliberately recorded as "Lifestyle factor", never as a cause. The
 * brief is explicit: "reduced sleep was reported", not "reduced sleep
 * caused the headaches".
 * ------------------------------------------------------------------ */

export const LIFESTYLE_LEXICON: LexiconEntry[] = [
  entry("Reduced sleep reported", "high", /\bsleeping less\b/i, /\bless sleep\b/i, /\breduced sleep\b/i, /\bnot sleeping (?:as much|enough)\b/i, /\bsleep(?:ing)? (?:less|has been less)\b/i),
  entry("More sleep reported", "high", /\bsleeping more\b/i, /\bmore sleep\b/i),
  entry("Increased study time", "high", /\bstudy(?:ing)? (?:more|longer|harder)\b/i, /\blong study sessions\b/i, /\bstudy sessions\b/i, /\bstudying for several hours\b/i),
  entry("Exam period reported", "high", /\bexams?\b/i, /\bexam period\b/i, /\bfinals?\b/i),
  entry("Stressful period reported", "medium", /\bstress(?:ful|ed|ing)?\b/i, /\bpressure\b/i, /\bdeadline/i),
  entry("More activity reported", "medium", /\bmore active\b/i, /\bincreased activity\b/i, /\bstarted running\b/i),
  entry("Less activity reported", "medium", /\bless active\b/i, /\breduced activity\b/i, /\bstopped exercising\b/i),
  entry("Diet change reported", "medium", /\bchanged (?:my )?diet\b/i, /\beating better\b/i, /\bcut(?:ting)? out\b/i),
  entry("Travel reported", "medium", /\btravel(?:ling|led)?\b/i, /\bflew to\b/i, /\bflight\b/i),
  entry("Work pattern reported", "medium", /\bwork(?:ing)? (?:more|overtime|late|shifts)\b/i, /\blong hours\b/i),
  entry("College or school reported", "medium", /\bcollege\b/i, /\bschool\b/i, /\buniversity\b/i, /\bsemester\b/i),
];

/* ------------------------------------------------------------------ *
 * Context — the situation someone ties something to
 * ------------------------------------------------------------------ */

/** Marks that a sentence links something to a situation. */
export const CONTEXT_CUES: RegExp[] = [
  /\bafter\b/i,
  /\bwhen (?:i|it)\b/i,
  /\bespecially\b/i,
  /\bfollowing\b/i,
  /\bbecause\b/i,
  /\bwhenever\b/i,
  /\btriggered by\b/i,
  /\bwhile\b/i,
  /\bduring\b/i,
];

/* ------------------------------------------------------------------ *
 * Frequency and change
 * ------------------------------------------------------------------ */

export interface CueEntry extends LexiconEntry {
  direction: "up" | "down" | "neutral";
}

/** A cue entry is a lexicon entry plus the direction it points. */
const cue = (
  label: string,
  confidence: ExtractionConfidence,
  direction: "up" | "down" | "neutral",
  ...patterns: RegExp[]
): CueEntry => ({ label, confidence, direction, patterns });

/** Ordinal hints, so "more often" and "less often" can be ordered. */
export const FREQUENCY_RANK: Record<string, number> = {
  Once: 1,
  Occasionally: 2,
  "From time to time": 2,
  Varies: 3,
  Weekly: 4,
  "Several times a week": 5,
  "Most days": 6,
  Daily: 7,
  "Every day": 7,
};

export const FREQUENCY_CUES: CueEntry[] = [
  cue("Daily", "high", "neutral", /\bevery ?day\b/i, /\bdaily\b/i, /\beach day\b/i, /\ball the time\b/i),
  cue("Most days", "high", "up", /\bmost days\b/i, /\bnearly every day\b/i, /\balmost every day\b/i),
  cue("Several times a week", "high", "up", /\bseveral times a week\b/i, /\bcouple of times a week\b/i, /\bmost weeks\b/i),
  cue("Weekly", "high", "neutral", /\bevery week\b/i, /\bweekly\b/i, /\bonce a week\b/i),
  cue("Occasionally", "high", "down", /\boccasionally\b/i, /\bfrom time to time\b/i, /\bonce in a while\b/i, /\brarely\b/i, /\bonly occasionally\b/i),
  cue("Varies", "medium", "neutral", /\bsometimes\b/i, /\bon and off\b/i, /\bcomes? and goes?\b/i, /\bin bursts\b/i),
  cue("Once", "high", "down", /\bonly once\b/i, /\bone time\b/i, /\bsingle (?:time|episode)\b/i),
];

export const CHANGE_CUES: CueEntry[] = [
  cue(
    "Getting worse",
    "high",
    "up",
    /\bmore (?:often|frequent(?:ly)?)\b/i,
    /\bincreas(?:ing|ed)\b/i,
    /\bgetting worse\b/i,
    /\bworse\b/i,
    /\bescalat/i,
    /\bfrequent(?:ly|ness)\b/i,
    /\bevery day\b/i,
    /\bmore and more\b/i,
  ),
  cue(
    "Getting better",
    "high",
    "down",
    /\bless (?:often|frequent(?:ly)?)\b/i,
    /\bimproving\b/i,
    /\bgetting better\b/i,
    /\bbetter\b/i,
    /\bfewer\b/i,
    /\breduced\b/i,
    /\bsettled down\b/i,
    /\beased off\b/i,
    /\bfewer times\b/i,
  ),
  cue(
    "Staying about the same",
    "high",
    "neutral",
    /\babout the same\b/i,
    /\bunchanged\b/i,
    /\bstayed the same\b/i,
    /\bno real change\b/i,
    /\bconsistently\b/i,
  ),
  cue("Comes and goes", "high", "neutral", /\bcomes? and goes?\b/i, /\bon and off\b/i, /\bin bursts\b/i),
  cue("Started", "high", "neutral", /\bstarted\b/i, /\bbegan\b/i, /\bstarted noticing\b/i, /\bstarted having\b/i),
  cue("Stopped", "high", "neutral", /\bstopped\b/i, /\bno longer\b/i, /\bstopped having\b/i, /\bceased\b/i),
  cue("Not sure", "high", "neutral", /\bnot sure\b/i, /\bno idea\b/i, /\bhard to say\b/i),
];

/**
 * Words that mark a comparison as already established in the text.
 * Used to require corroboration before claiming a change, so a single
 * ambiguous word never becomes a "change" card.
 */
export const COMPARISON_MARKERS: RegExp[] = [
  /\bat first\b/i,
  /\bused to\b/i,
  /\bpreviously\b/i,
  /\bbefore\b/i,
  /\bbut (?:now|recently|lately)\b/i,
  /\bnow\b/i,
  /\bcompared (?:to|with)\b/i,
  /\bsince (?:then|earlier)\b/i,
  /\bwhereas\b/i,
  /\bwhere before\b/i,
  /\bchanged\b/i,
  /\bwhereas before\b/i,
];

/* ------------------------------------------------------------------ *
 * Severity — only what the person said
 * ------------------------------------------------------------------ */

export const SEVERITY_CUES: LexiconEntry[] = [
  entry("Mild", "high", /\bmild(?:ly)?\b/i, /\bslight(?:ly)?\b/i, /\bmild pain\b/i),
  entry("Moderate", "high", /\bmoderate(?:ly)?\b/i),
  entry("Severe", "high", /\bsevere(?:ly)?\b/i, /\bexcruciating\b/i, /\bunbearable\b/i, /\bdebilitating\b/i),
];

/* ------------------------------------------------------------------ *
 * Index by category, so extraction is one lookup rather than nine
 * ------------------------------------------------------------------ */

export const LEXICONS: Record<
  Exclude<EventCategory, "change" | "other">,
  LexiconEntry[]
> = {
  symptom: SYMPTOM_LEXICON,
  medication: MEDICATION_LEXICON,
  treatment: TREATMENT_LEXICON,
  test: TEST_LEXICON,
  appointment: APPOINTMENT_LEXICON,
  lifestyle: LIFESTYLE_LEXICON,
  context: LIFESTYLE_LEXICON,
};

/** Categories searched per sentence, in the order events are emitted. */
export const CATEGORY_ORDER: EventCategory[] = [
  "symptom",
  "medication",
  "treatment",
  "test",
  "appointment",
  "lifestyle",
  "context",
];
