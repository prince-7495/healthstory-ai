/* =============================================================
   HealthStory AI — Stage 6 language bridge

   The brief is explicit: never claim language support that is not
   actually working. This build generates the communication draft
   directly from the structured HealthStory, in the selected language,
   rather than translating a generated English summary (which causes
   drift).

   English is fully implemented. Hindi and Gujarati ship as a clearly
   labelled *prototype*: the structured pieces we can map exactly
   (topic labels, recorded values, dates, section headings) are
   localized from a curated dictionary, and anything we cannot map
   safely — free text the user wrote, or an unlisted topic — stays in
   the original language and is flagged as not localized. The UI always
   shows "Prototype translation · review before use" for these.
   ============================================================= */

import type { CommunicationLanguageId } from "./types";

export interface CommunicationLanguage {
  id: CommunicationLanguageId;
  label: string;
  nativeLabel: string;
  /** Fully implemented generation. */
  supported: boolean;
  /** Dictionary-based prototype — never presented as full support. */
  prototype: boolean;
}

export const COMMUNICATION_LANGUAGES: CommunicationLanguage[] = [
  { id: "en", label: "English", nativeLabel: "English", supported: true, prototype: false },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी", supported: false, prototype: true },
  { id: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", supported: false, prototype: true },
];

/** Languages shown as planned, never as available. */
export const PLANNED_LANGUAGES = ["Spanish", "French", "Arabic"];

interface Dictionary {
  headings: Record<string, string>;
  templates: Record<string, string>;
  labels: Record<string, string>;
  values: Record<string, string>;
  months: Record<string, string>;
}

const MONTH_KEYS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EN_HEADINGS: Record<string, string> = {
  noticed: "What I noticed",
  started: "When it started",
  changed: "How it changed",
  context: "Relevant context I recorded",
  recent: "Recent update",
  questions: "Questions I want to discuss",
  missing: "Information not recorded",
};

const EN_TEMPLATES: Record<string, string> = {
  noticed: "I noticed: {items}.",
  noticedNeutral: "Recorded: {items}.",
  firstRecorded: "First recorded around {date}.",
  firstRecordedExact: "First recorded in {date}.",
  noStartDate: "No start date recorded.",
  changeLine: "{before} → {after}",
  changeDesc: "You recorded a change in {category}: from {before} to {after}.",
  contextLine: "{label} was mentioned.",
  recentLine: "Most recently, {change}.",
  recentNone: "No recent update recorded.",
  missingDate: "Start date not recorded.",
  missingFrequency: "Frequency not recorded.",
  missingSeverity: "Severity not recorded.",
  oneMinute:
    "I first noticed {topic} around {start}. It became {change} over the following months. More recently, {recent}.",
  joinAnd: " and ",
  joinComma: ", ",
};

/** English is the identity dictionary: every lookup returns the key. */
const EN_DICTIONARY: Dictionary = {
  headings: EN_HEADINGS,
  templates: EN_TEMPLATES,
  labels: {},
  values: {},
  months: Object.fromEntries(MONTH_KEYS.map((m) => [m, m])),
};

const HI_DICTIONARY: Dictionary = {
  headings: {
    noticed: "मैंने क्या देखा",
    started: "यह कब शुरू हुआ",
    changed: "यह कैसे बदला",
    context: "मैंने दर्ज किया गया संबंधित संदर्भ",
    recent: "हालिया अपडेट",
    questions: "मैं जिन बातों पर चर्चा करना चाहता/चाहती हूँ",
    missing: "जो जानकारी दर्ज नहीं है",
  },
  templates: {
    noticed: "मैंने {items} देखा।",
    noticedNeutral: "निम्नलिखित दर्ज किए गए: {items}।",
    firstRecorded: "पहली बार लगभग {date} में दर्ज किया गया।",
    firstRecordedExact: "पहली बार {date} में दर्ज किया गया।",
    noStartDate: "शुरू होने की तारीख दर्ज नहीं है।",
    changeLine: "{before} → {after}",
    changeDesc: "आपने {category} में बदलाव दर्ज किया: {before} से {after}।",
    contextLine: "{label} का उल्लेख किया गया।",
    recentLine: "हाल ही में, {change}।",
    recentNone: "कोई हालिया अपडेट दर्ज नहीं है।",
    missingDate: "शुरू होने की तारीख दर्ज नहीं है।",
    missingFrequency: "कितनी बार होता है यह दर्ज नहीं है।",
    missingSeverity: "गंभीरता दर्ज नहीं है।",
    oneMinute:
      "मैंने पहली बार {topic} लगभग {start} में देखा। इसके बाद के महीनों में {change}। हाल ही में, {recent}।",
    joinAnd: " और ",
    joinComma: ", ",
  },
  labels: {
    Headache: "सिरदर्द",
    Fatigue: "थकान",
    Tiredness: "थकान",
    Dizziness: "चक्कर",
    Nausea: "जी मिचलाना",
    Fever: "बुखार",
    Cough: "खांसी",
    "Sleep difficulty": "नींद की समस्या",
    "Back pain": "पीठ दर्द",
    "Stomach pain": "पेट दर्द",
    Anxiety: "घबराहट",
    "Reduced sleep reported": "नींद कम होना दर्ज किया गया",
    "More sleep reported": "नींद अधिक/नियमित होना दर्ज किया गया",
    "Increased study time": "अध्ययन का समय बढ़ना",
    "Exam period reported": "परीक्षा की अवधि का उल्लेख",
    Hydration: "पानी/तरल पदार्थ बढ़ाना",
    "Taking breaks": "ब्रेक लेना",
    "Medication mentioned": "दवा का उल्लेख",
    "Started a medication": "दवा शुरू करना",
    "Stopped a medication": "दवा बंद करना",
    "Blood test reported": "रक्त परीक्षण का उल्लेख",
    "Doctor's appointment": "डॉक्टर से मुलाकात",
    "Stressful period reported": "तनावपूर्ण अवधि का उल्लेख",
  },
  values: {
    Once: "एक बार",
    Occasionally: "कभी-कभी",
    Weekly: "साप्ताहिक",
    "Several times a week": "सप्ताह में कई बार",
    "Most days": "अधिकांश दिन",
    Daily: "प्रतिदिन",
    Varies: "बदलता रहता है",
    "More frequent": "अधिक बार",
    "Less frequent": "कम बार",
    Better: "बेहतर",
    Worse: "खराब",
    Started: "शुरू हुआ",
    Stopped: "बंद हुआ",
    Continued: "जारी रहा",
    Frequency: "आवृत्ति",
    Sleep: "नींद",
    Study: "अध्ययन",
    Context: "संदर्भ",
  },
  months: {
    January: "जनवरी", February: "फ़रवरी", March: "मार्च", April: "अप्रैल",
    May: "मई", June: "जून", July: "जुलाई", August: "अगस्त",
    September: "सितंबर", October: "अक्टूबर", November: "नवंबर", December: "दिसंबर",
  },
};

const GU_DICTIONARY: Dictionary = {
  headings: {
    noticed: "મેં શું જોયું",
    started: "તે ક્યારે શરૂ થયું",
    changed: "તે કેવી રીતે બદલાયું",
    context: "મેં નોંધેલો સંબંધિત સંદર્ભ",
    recent: "તાજેતરનું અપડેટ",
    questions: "હું જે વિશે ચર્ચા કરવા માંગુ છું",
    missing: "જે માહિતી નોંધાયેલી નથી",
  },
  templates: {
    noticed: "મેં {items} જોયું.",
    noticedNeutral: "નીચેની બાબતો નોંધાઈ: {items}.",
    firstRecorded: "પ્રથમ વખત લગભગ {date} માં નોંધાયું.",
    firstRecordedExact: "પ્રથમ વખત {date} માં નોંધાયું.",
    noStartDate: "શરૂ થવાની તારીખ નોંધાયેલી નથી.",
    changeLine: "{before} → {after}",
    changeDesc: "તમે {category} માં ફેરફાર નોંધ્યો: {before} થી {after}.",
    contextLine: "{label} નો ઉલ્લેખ કરવામાં આવ્યો.",
    recentLine: "તાજેતરમાં, {change}.",
    recentNone: "કોઈ તાજેતરનું અપડેટ નોંધાયેલું નથી.",
    missingDate: "શરૂ થવાની તારીખ નોંધાયેલી નથી.",
    missingFrequency: "કેટલી વાર થાય છે તે નોંધાયેલું નથી.",
    missingSeverity: "ગંભીરતા નોંધાયેલી નથી.",
    oneMinute:
      "મેં પ્રથમ વખત {topic} લગભગ {start} માં જોયું. ત્યારપછીના મહિનાઓમાં {change}. તાજેતરમાં, {recent}.",
    joinAnd: " અને ",
    joinComma: ", ",
  },
  labels: {
    Headache: "માથાનો દુખાવો",
    Fatigue: "થાક",
    Tiredness: "થાક",
    Dizziness: "ચક્કર",
    Nausea: "ઉબકા",
    Fever: "તાવ",
    Cough: "ખાંસી",
    "Sleep difficulty": "ઊંઘની સમસ્યા",
    "Back pain": "પીઠનો દુખાવો",
    "Stomach pain": "પેટનો દુખાવો",
    Anxiety: "ચિંતા",
    "Reduced sleep reported": "ઊંઘ ઓછી થવાની નોંધ",
    "More sleep reported": "વધુ/નિયમિત ઊંઘની નોંધ",
    "Increased study time": "અભ્યાસનો સમય વધવો",
    "Exam period reported": "પરીક્ષાના સમયનો ઉલ્લેખ",
    Hydration: "પાણીનું પ્રમાણ વધારવું",
    "Taking breaks": "વિરામ લેવો",
    "Medication mentioned": "દવાનો ઉલ્લેખ",
    "Started a medication": "દવા શરૂ કરવી",
    "Stopped a medication": "દવા બંધ કરવી",
    "Blood test reported": "લોહી પરીક્ષણનો ઉલ્લેખ",
    "Doctor's appointment": "ડૉક્ટરની મુલાકાત",
    "Stressful period reported": "તણાવપૂર્ણ સમયનો ઉલ્લેખ",
  },
  values: {
    Once: "એક વાર",
    Occasionally: "ક્યારેક",
    Weekly: "સાપ્તાહિક",
    "Several times a week": "અઠવાડિયામાં ઘણી વાર",
    "Most days": "મોટાભાગના દિવસો",
    Daily: "દરરોજ",
    Varies: "બદલાય છે",
    "More frequent": "વધુ વારંવાર",
    "Less frequent": "ઓછી વાર",
    Better: "સારું",
    Worse: "ખરાબ",
    Started: "શરૂ થયું",
    Stopped: "બંધ થયું",
    Continued: "ચાલુ રહ્યું",
    Frequency: "આવૃત્તિ",
    Sleep: "ઊંઘ",
    Study: "અભ્યાસ",
    Context: "સંદર્ભ",
  },
  months: {
    January: "જાન્યુઆરી", February: "ફેબ્રુઆરી", March: "માર્ચ", April: "એપ્રિલ",
    May: "મે", June: "જૂન", July: "જુલાઈ", August: "ઓગસ્ટ",
    September: "સપ્ટેમ્બર", October: "ઓક્ટોબર", November: "નવેમ્બર", December: "ડિસેમ્બર",
  },
};

const DICTIONARIES: Record<CommunicationLanguageId, Dictionary> = {
  en: EN_DICTIONARY,
  hi: HI_DICTIONARY,
  gu: GU_DICTIONARY,
};

export function getLanguage(id: CommunicationLanguageId): CommunicationLanguage {
  return COMMUNICATION_LANGUAGES.find((l) => l.id === id) ?? COMMUNICATION_LANGUAGES[0];
}

export function isPrototypeLanguage(id: CommunicationLanguageId): boolean {
  return getLanguage(id).prototype;
}

/** Localizes a topic label. Falls back to the English label, flagged. */
export function localizeLabel(id: CommunicationLanguageId, label: string): { text: string; localized: boolean } {
  if (id === "en") return { text: label, localized: true };
  const hit = DICTIONARIES[id].labels[label];
  return hit ? { text: hit, localized: true } : { text: label, localized: false };
}

export function localizeValue(id: CommunicationLanguageId, value: string): { text: string; localized: boolean } {
  if (id === "en") return { text: value, localized: true };
  const hit = DICTIONARIES[id].values[value];
  return hit ? { text: hit, localized: true } : { text: value, localized: false };
}

export function localizeMonth(id: CommunicationLanguageId, month: string): string {
  return DICTIONARIES[id].months[month] ?? month;
}

export function template(id: CommunicationLanguageId, key: string): string {
  return DICTIONARIES[id].templates[key] ?? EN_TEMPLATES[key] ?? "";
}

export function heading(id: CommunicationLanguageId, key: string): string {
  return DICTIONARIES[id].headings[key] ?? EN_HEADINGS[key] ?? "";
}
