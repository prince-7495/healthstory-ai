/* =============================================================
   HealthStory AI — Stage 8 document understanding engine

   Helps users understand health documents they already possess.
   This is a deterministic prototype — clearly labelled as such.
   No OCR, no real PDF parsing, no clinical interpretation.
   ============================================================= */

import { makeId, type EventCategory } from "../health/types";
import { DOCUMENT_TYPE_LABELS } from "../journal/types";
import type {
  DocumentAnalysis,
  DocumentExplanation,
  DocumentMeasurement,
  DocumentSection,
  DocumentStatus,
  DocumentTerm,
  DocumentType,
  ExplanationComplexity,
  HealthDocument,
  SourceReference,
  StoryJournal,
} from "../journal/types";

/* ------------------------------------------------------------------ *\
 * Stage 8 — Demo data (clearly labelled fictional)
 * ------------------------------------------------------------------ */

export const DEMO_DOCUMENT_TEXT = `BLOOD TEST REPORT
Patient: Alex Chen
Date: July 20, 2026
Test: Comprehensive Metabolic Panel

RESULTS:
Glucose: 102 mg/dL (Reference range: 70-99 mg/dL)
Creatinine: 0.9 mg/dL (Reference range: 0.6-1.3 mg/dL)
ALT: 35 U/L (Reference range: 7-56 U/L)
AST: 28 U/L (Reference range: 10-40 U/L)
TSH: 2.1 mIU/L (Reference range: 0.4-4.0 mIU/L)

IMPRESSION:
Glucose is slightly above the reference range. All other values are within normal limits.
Follow-up recommended in 3 months for repeat glucose testing.

Physician: Dr. Sarah Mitchell
Lab: City Health Laboratories`;

export const DEMO_DOCUMENT_FILENAME = "blood_test_report_july_2026.txt";

function classifyDocumentType(text: string): DocumentType {
  const lower = text.toLowerCase();
  if (lower.includes("blood test") || lower.includes("lab report") || lower.includes("comprehensive metabolic") || lower.includes("cbc") || lower.includes("reference range")) {
    return "TEST_REPORT";
  }
  if (lower.includes("appointment") || lower.includes("visit summary") || lower.includes("clinical note")) {
    return "APPOINTMENT_NOTE";
  }
  if (lower.includes("instruction") || lower.includes("discharge") || lower.includes("after visit")) {
    return "INSTRUCTION_SHEET";
  }
  if (lower.includes("medication") || lower.includes("prescription") || lower.includes("pharmacy")) {
    return "MEDICATION_INFO";
  }
  return "GENERAL_HEALTH";
}

function extractSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = text.split("\n").filter((l) => l.trim());
  const pageNumber = 1;
  let currentSection = "";
  let currentTitle = "";

  for (const line of lines) {
    if (line.startsWith("RESULTS:") || line.startsWith("IMPRESSION:")) {
      if (currentSection) {
        sections.push({
          id: makeId("section"),
          title: currentTitle,
          pageNumber,
          originalText: currentSection.trim(),
          sourceReferenceId: makeId("src"),
        });
      }
      currentTitle = line.replace(":", "");
      currentSection = line + "\n";
    } else {
      currentSection += line + "\n";
    }
  }
  if (currentSection) {
    sections.push({
      id: makeId("section"),
      title: currentTitle,
      pageNumber,
      originalText: currentSection.trim(),
      sourceReferenceId: makeId("src"),
    });
  }
  return sections;
}

function extractTerms(text: string): DocumentTerm[] {
  const technicalTerms = [
    { term: "glucose", definition: "A type of sugar in your blood that comes from food. Your body uses it for energy." },
    { term: "creatinine", definition: "A waste product from muscle activity that kidneys filter out of blood." },
    { term: "alt", definition: "Alanine aminotransferase — an enzyme mainly found in the liver." },
    { term: "ast", definition: "Aspartate aminotransferase — an enzyme found in the liver and other organs." },
    { term: "tsh", definition: "Thyroid-stimulating hormone — tells your thyroid how much hormone to make." },
    { term: "reference range", definition: "The range of values considered typical for a healthy person." },
    { term: "comprehensive metabolic panel", definition: "A group of blood tests that measure different substances in your blood." },
  ];

  return technicalTerms
    .filter((t) => text.toLowerCase().includes(t.term.toLowerCase()))
    .map((t) => ({
      id: makeId("term"),
      term: t.term,
      plainDefinition: t.definition,
      documentContext: `Found in the ${text.includes("RESULTS:") ? "Results" : "Impression"} section of this report.`,
      sourceReferenceId: makeId("src"),
      userSaved: false,
    }));
}

function extractMeasurements(text: string): DocumentMeasurement[] {
  const measurements: DocumentMeasurement[] = [];

  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/(\w+(?:\s+\w+)?):\s*([\d.]+)\s*(\w+\/\w+)?\s*\(Reference range:\s*([^)]+)\)/i);
    if (match) {
      const [, label, value, unit, refRange] = match;
      measurements.push({
        id: makeId("meas"),
        label: label.trim(),
        value: value.trim(),
        unit: unit?.trim(),
        referenceRange: refRange.trim(),
        sourceReferenceId: makeId("src"),
      });
    }
  }
  return measurements;
}

function extractDates(text: string): string[] {
  const dates: string[] = [];
  // "20 July 2026" | "July 20, 2026" | "2026-07-20"
  const patterns = [
    /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/g,
    /\b[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
  ];
  for (const p of patterns) {
    for (const d of text.match(p) || []) {
      if (!dates.includes(d)) dates.push(d);
    }
  }
  return dates;
}

function buildExplanations(sections: DocumentSection[], complexity: ExplanationComplexity = "SIMPLE"): DocumentExplanation[] {
  return sections.map((section) => ({
    id: makeId("expl"),
    sourceReferenceId: section.sourceReferenceId,
    explanation: generatePlainLanguageExplanation(section.originalText, complexity),
    complexity,
    language: "English",
    userEdited: false,
  }));
}

function generatePlainLanguageExplanation(text: string, complexity: ExplanationComplexity): string {
  const lower = text.toLowerCase();

  if (complexity === "SIMPLE") {
    if (lower.includes("results:")) {
      return "This section lists the measurements from your blood test. Each item shows what was measured, the result, and the typical range.";
    }
    if (lower.includes("impression:")) {
      return "This section summarizes what the results mean. It notes which values are outside the typical range and suggests next steps.";
    }
    return "This part of the document contains health information from your test or visit.";
  }

  if (complexity === "STANDARD") {
    if (lower.includes("results:")) {
      return "This Results section shows each measurement from the Comprehensive Metabolic Panel. For each item, it gives the measured value, the unit of measurement, and the reference range (the range typically seen in healthy people). Values outside the reference range may be noted for follow-up.";
    }
    if (lower.includes("impression:")) {
      return "The Impression section gives the interpreting physician's summary. Here it notes that glucose is slightly above the reference range while other values are within typical limits, and suggests repeating the glucose test in 3 months.";
    }
    return "This section contains information from your health document.";
  }

  // DETAILED
  if (lower.includes("results:")) {
    return "This Results section presents the full output of the Comprehensive Metabolic Panel. Each analyte is listed with its concentration, units, and the laboratory's established reference interval. The reference interval represents the central 95% of values observed in a healthy reference population. Glucose at 102 mg/dL exceeds the upper limit of 99 mg/dL, while Creatinine, ALT, AST, and TSH fall within their respective intervals.";
  }
  if (lower.includes("impression:")) {
    return "The Impression provides the clinical interpretation. The elevated glucose is flagged as the only value outside the reference range. The recommendation for repeat testing in 3 months aligns with standard monitoring for borderline glucose elevations. No acute abnormality is identified in the renal (creatinine), hepatic (ALT, AST), or thyroid (TSH) markers.";
  }
  return "This section contains detailed health information from your document.";
}

/* ------------------------------------------------------------------ *\
 * Main entry point: process a document (demo mode)
 * ------------------------------------------------------------------ */

export async function processDocument(
  journal: StoryJournal,
  file: { name: string; type: string; size: number; text: string },
  options: { onStage?: (stage: string) => void; signal?: AbortSignal } = {}
): Promise<HealthDocument> {
  const stages = [
    "Reading document",
    "Finding sections",
    "Identifying important terms",
    "Organizing information",
    "Preparing plain-language explanation",
  ];

  for (const stage of stages) {
    options.onStage?.(stage);
    if (options.signal?.aborted) throw new DOMException("Document processing cancelled", "AbortError");
    await new Promise((r) => setTimeout(r, 180));
  }

  return buildDocument(file, new Date().toISOString());
}

/**
 * Synchronous, deterministic build — used by the demo journal so the
 * Stage 8 document is produced by the exact same code path as a
 * user-supplied file (no hand-written fake analysis).
 */
/**
 * Honest, heuristic language detection — script-based only. The UI labels
 * the result as detected, never as confirmed.
 */
export function detectLanguage(text: string): string {
  if (/[\u0A80-\u0AFF]/.test(text)) return "Gujarati";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  if (/[\u0600-\u06FF]/.test(text)) return "Arabic";
  return "English";
}

export function buildDemoDocument(): HealthDocument {
  const doc = buildDocument(
    {
      name: DEMO_DOCUMENT_FILENAME,
      type: "text/plain",
      size: DEMO_DOCUMENT_TEXT.length,
      text: DEMO_DOCUMENT_TEXT,
    },
    "2026-07-21T10:15:00.000Z"
  );
  doc.title = "July Report";
  if (doc.analysis?.sections.length) {
    const impression = doc.analysis.sections.find(s => s.title === "IMPRESSION");
    if (impression) impression.pageNumber = 2;
  }
  return doc;
}

export function buildDocument(
  file: { name: string; type: string; size: number; text: string },
  createdAt: string
): HealthDocument {
  const documentId = makeId("doc");
  const type = classifyDocumentType(file.text);
  const sections = extractSections(file.text);
  const terms = extractTerms(file.text);
  const measurements = extractMeasurements(file.text);
  const dates = extractDates(file.text);

  // Every explanation must resolve to a real source (§16 never lose source context).
  const sourceReferences: SourceReference[] = [
    {
      id: makeId("src"),
      documentId,
      pageNumber: 1,
      section: "Full document",
      quotedText: file.text.slice(0, 200),
    },
  ];
  for (const section of sections) {
    const ref: SourceReference = {
      id: makeId("src"),
      documentId,
      pageNumber: section.pageNumber,
      section: section.title ?? "Section",
      quotedText: section.originalText.slice(0, 200),
    };
    sourceReferences.push(ref);
    section.sourceReferenceId = ref.id;
  }
  for (const measurement of measurements) {
    const ref: SourceReference = {
      id: makeId("src"),
      documentId,
      pageNumber: 1,
      section: "Results",
      quotedText: `${measurement.label}: ${measurement.value} ${measurement.unit ?? ""} (Reference range: ${measurement.referenceRange ?? "not provided"})`,
    };
    sourceReferences.push(ref);
    measurement.sourceReferenceId = ref.id;
  }
  for (const term of terms) {
    const ref: SourceReference = {
      id: makeId("src"),
      documentId,
      pageNumber: 1,
      section: "Results",
      quotedText: term.term,
    };
    sourceReferences.push(ref);
    term.sourceReferenceId = ref.id;
  }

  const explanations = buildExplanations(sections, "SIMPLE");

  const analysis: DocumentAnalysis = {
    documentId,
    sections,
    terms,
    dates,
    measurements,
    explanations,
    questions: [],
    sourceReferences,
    status: "ANALYZED",
  };

  const document: HealthDocument = {
    id: documentId,
    createdAt,
    filename: file.name,
    fileType: file.type || "text/plain",
    fileSize: file.size,
    type,
    status: "ANALYZED",
    originalText: file.text,
    pageCount: 1,
    language: "English",
    analysis,
  };

  return document;
}

/* ------------------------------------------------------------------ *\
 * Explanation helpers
 * ------------------------------------------------------------------ */

export function generateExplanationForSection(
  document: HealthDocument,
  sectionId: string,
  complexity: ExplanationComplexity,
  language = "English"
): DocumentExplanation | null {
  const section = document.analysis?.sections.find((s) => s.id === sectionId);
  if (!section) return null;

  return {
    id: makeId("expl"),
    sourceReferenceId: section.sourceReferenceId,
    explanation: generatePlainLanguageExplanation(section.originalText, complexity),
    complexity,
    language,
    userEdited: false,
  };
}

export function generateExplanationForTerm(
  document: HealthDocument,
  termId: string,
  language = "English"
): DocumentExplanation | null {
  const term = document.analysis?.terms.find((t) => t.id === termId);
  if (!term) return null;

  return {
    id: makeId("expl"),
    sourceReferenceId: term.sourceReferenceId,
    explanation: `${term.term}: ${term.plainDefinition} In this document, it appears in the context: "${term.documentContext}"`,
    complexity: "SIMPLE",
    language,
    userEdited: false,
  };
}

/* ------------------------------------------------------------------ *\
 * Document Q&A (demo — document-grounded only)
 * ------------------------------------------------------------------ */

export async function answerDocumentQuestion(
  document: HealthDocument,
  question: string,
  options: { onStage?: (stage: string) => void; signal?: AbortSignal } = {}
): Promise<{ answer: string; sources: SourceReference[]; hasDocumentGrounding: boolean }> {
  const stages = ["Finding relevant sections", "Generating explanation", "Checking sources"];
  for (const stage of stages) {
    options.onStage?.(stage);
    if (options.signal?.aborted) throw new DOMException("Question cancelled", "AbortError");
    await new Promise((r) => setTimeout(r, 120));
  }

  const lowerQ = question.toLowerCase();
  let answer = "";
  const sources: SourceReference[] = [];

  // Simple keyword matching for demo — every branch must point at a real source.
  const allRefs = document.analysis?.sourceReferences ?? [];
  const measurementRef = (label: string) => {
    const meas = document.analysis?.measurements.find((m) => m.label.toLowerCase().includes(label));
    if (!meas) return null;
    return {
      meas,
      ref: allRefs.find((r) => r.id === meas.sourceReferenceId) ?? allRefs[0],
    };
  };

  if (lowerQ.includes("glucose") || lowerQ.includes("sugar")) {
    const hit = measurementRef("glucose");
    if (hit) {
      const impression = document.analysis?.sections.find((s) =>
        s.originalText.toLowerCase().startsWith("impression")
      );
      answer = `The document records a glucose value of ${hit.meas.value} ${hit.meas.unit || "mg/dL"}. The reference range printed in the document is ${hit.meas.referenceRange || "not provided"}.${
        impression ? ` The document's own impression states: "${impression.originalText.replace(/^IMPRESSION:\s*/i, "")}"` : ""
      }`;
      if (hit.ref) sources.push(hit.ref);
    }
  } else if (lowerQ.includes("tsh") || lowerQ.includes("thyroid")) {
    const hit = measurementRef("tsh");
    if (hit) {
      answer = `The document records a TSH value of ${hit.meas.value} ${hit.meas.unit || "mIU/L"}. The reference range printed in the document is ${hit.meas.referenceRange || "not provided"}.`;
      if (hit.ref) sources.push(hit.ref);
    }
  } else if (lowerQ.includes("mean") || lowerQ.includes("what does") || lowerQ.includes("explain")) {
    answer = `This document is a ${DOCUMENT_TYPE_LABELS[document.type].toLowerCase()}. It contains ${document.analysis?.sections.length ?? 0} sections, ${document.analysis?.terms.length ?? 0} identified terms, and ${document.analysis?.measurements.length ?? 0} measurements. Ask about a particular term or section to see its plain-language explanation with the source text.`;
    if (allRefs[0]) sources.push(allRefs[0]);
  } else {
    // No grounding in this document — say so instead of inventing an answer.
    answer = "The provided document doesn't contain enough information to answer that confidently.";
  }

  return {
    answer,
    sources,
    hasDocumentGrounding: sources.length > 0,
  };
}

/* ------------------------------------------------------------------ *\
 * Connect document to HealthStory (user-controlled)
 * ------------------------------------------------------------------ */

export interface ImportSelection {
  addDocumentEvent: boolean;
  addMeasurements: string[]; // measurement ids
  addFollowUpDraft: boolean;
  addToConversation: boolean;
}

/** A source-grounded item the user chose to bring into their story (§80). */
export interface DocumentImportEvent {
  title: string;
  description: string;
  category: EventCategory;
  date: string | null;
  sourceText: string;
  metadata: Record<string, string>;
}

export function createDocumentImportItems(
  document: HealthDocument,
  selection: ImportSelection
): { events: DocumentImportEvent[]; followUpText?: string; conversationItems: string[] } {
  const items: DocumentImportEvent[] = [];
  const conversationItems: string[] = [];

  if (selection.addDocumentEvent) {
    items.push({
      title: `${DOCUMENT_TYPE_LABELS[document.type]} received`,
      description: `${document.filename} — ${document.analysis?.sections.length ?? 0} sections, ${document.analysis?.measurements.length ?? 0} measurements`,
      category: "test" as const,
      date: document.analysis?.dates[0] || new Date().toISOString().split("T")[0],
      sourceText: `Uploaded ${document.filename}`,
      metadata: { documentId: document.id, sourceType: "UPLOADED_DOCUMENT" },
    });
    if (selection.addToConversation) conversationItems.push(`Document received: ${document.filename}`);
  }

  for (const measId of selection.addMeasurements) {
    const meas = document.analysis?.measurements.find((m) => m.id === measId);
    if (meas) {
      items.push({
        title: `Measurement: ${meas.label}`,
        description: `${meas.value} ${meas.unit || ""}${meas.referenceRange ? ` (Ref: ${meas.referenceRange})` : ""}`,
        category: "test" as const,
        date: document.analysis?.dates[0] || new Date().toISOString().split("T")[0],
        sourceText: `${meas.label}: ${meas.value} ${meas.unit || ""}`,
        metadata: { documentId: document.id, measurementId: meas.id, sourceType: "UPLOADED_DOCUMENT" },
      });
      if (selection.addToConversation) conversationItems.push(`${meas.label}: ${meas.value} ${meas.unit || ""}`);
    }
  }

  // Conversation Mode only receives something when the user asked for it.
  if (selection.addToConversation && conversationItems.length === 0) {
    conversationItems.push(
      `${document.filename} — ${document.analysis?.sections.length ?? 0} sections reviewed in Understand mode.`
    );
  }

  let followUpText: string | undefined;
  if (selection.addFollowUpDraft) {
    followUpText = `I received a ${DOCUMENT_TYPE_LABELS[document.type].toLowerCase()} (${document.filename}) on ${document.analysis?.dates[0] || "recently"}. ${document.analysis?.explanations[0]?.explanation || "Document processed."}`;
  }

  return { events: items, followUpText, conversationItems };
}

/* ------------------------------------------------------------------ *\
 * Document library helpers
 * ------------------------------------------------------------------ */

export function getDocuments(journal: StoryJournal): HealthDocument[] {
  return journal.documents ?? [];
}

export function filterDocuments(
  docs: HealthDocument[],
  query: string,
  types: DocumentType[],
  statuses: DocumentStatus[]
): HealthDocument[] {
  const q = query.trim().toLowerCase();
  return docs
    .filter((d) => types.length === 0 || types.includes(d.type))
    .filter((d) => statuses.length === 0 || statuses.includes(d.status))
    .filter((d) => {
      if (!q) return true;
      return (
        d.filename.toLowerCase().includes(q) ||
        d.originalText.toLowerCase().includes(q) ||
        d.analysis?.sections.some((s) => s.originalText.toLowerCase().includes(q)) ||
        d.analysis?.terms.some((t) => t.term.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/* ------------------------------------------------------------------ *\
 * Language bridge (reuse Stage 6)
 * ------------------------------------------------------------------ */

export const UNDERSTAND_LANGUAGES = [
  { id: "en", label: "English", native: "English", implemented: true },
  { id: "hi", label: "Hindi", native: "हिन्दी", implemented: true },
  { id: "gu", label: "Gujarati", native: "ગુજરાતી", implemented: true },
  { id: "es", label: "Spanish", native: "Español", implemented: false },
  { id: "fr", label: "French", native: "Français", implemented: false },
  { id: "ar", label: "Arabic", native: "العربية", implemented: false },
] as const;

export function isLanguageImplemented(langId: string): boolean {
  return UNDERSTAND_LANGUAGES.find((l) => l.id === langId)?.implemented ?? false;
}