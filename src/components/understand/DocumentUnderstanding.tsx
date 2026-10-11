"use client";

import { useState } from "react";
import { UNDERSTAND } from "@/lib/understand/options";
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentSection,
  type DocumentTerm,
  type ExplanationComplexity,
  type HealthDocument,
} from "@/lib/journal/types";
import { UNDERSTAND_LANGUAGES } from "@/lib/understand/engine";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  QuoteIcon,
} from "../icons";
import styles from "./understand.module.css";

type Props = {
  document: HealthDocument;
  complexity: ExplanationComplexity;
  onComplexity: (c: ExplanationComplexity) => void;
  language: string;
  onLanguage: (lang: string) => void;
  onAskAboutDocument: () => void;
  onConnectToStory: () => void;
  savedTerms: string[];
  onSaveTerm: (termId: string) => void;
};

/**
 * DocumentUnderstanding — the Stage 8 "show me where that came from" view.
 *
 * Left: the source document (sections). Right: the plain-language
 * explanation, terms, measurements and source evidence. Nothing on the
 * right can exist without a source reference on the left.
 */
export default function DocumentUnderstanding({
  document,
  complexity,
  onComplexity,
  language,
  onLanguage,
  onAskAboutDocument,
  onConnectToStory,
  savedTerms,
  onSaveTerm,
}: Props) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    document.analysis?.sections[0]?.id ?? null
  );
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);

  const analysis = document.analysis;
  const section = analysis?.sections.find((s) => s.id === activeSectionId) ?? analysis?.sections[0] ?? null;
  const term = analysis?.terms.find((t) => t.id === activeTermId) ?? null;
  const explanation = section ? explainSection(section, complexity) : null;
  const page = section?.pageNumber;

  return (
    <div className={styles.col}>
      <section className={styles.panel} aria-labelledby="doc-overview">
        <div className={styles.panelHead}>
          <DocumentIcon size={16} />
          <h2 className={styles.panelTitle} id="doc-overview">
            {UNDERSTAND.overviewHeading}
          </h2>
          <span className={styles.panelCount}>
            {analysis?.sections.length ?? 0} sections
          </span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.row}>
            <span className={`${styles.tag} ${styles.tagType}`}>
              {DOCUMENT_TYPE_LABELS[document.type]}
            </span>
            <span className={`${styles.tag} ${styles.tagMuted}`}>{document.filename}</span>
            {analysis?.dates.map((d) => (
              <span key={d} className={`${styles.tag} ${styles.tagMuted}`}>
                {d}
              </span>
            ))}
          </div>

          <div className={styles.previewGrid} style={{ marginTop: 14 }}>
            <div className={styles.previewItem}>
              <p className={styles.previewLabel}>{UNDERSTAND.termsLabel}</p>
              <p className={styles.previewValue}>{analysis?.terms.length ?? 0}</p>
            </div>
            <div className={styles.previewItem}>
              <p className={styles.previewLabel}>{UNDERSTAND.measurementsLabel}</p>
              <p className={styles.previewValue}>{analysis?.measurements.length ?? 0}</p>
            </div>
            <div className={styles.previewItem}>
              <p className={styles.previewLabel}>{UNDERSTAND.datesLabel}</p>
              <p className={styles.previewValue}>{analysis?.dates.length ?? 0}</p>
            </div>
            <div className={styles.previewItem}>
              <p className={styles.previewLabel}>Status</p>
              <p className={styles.previewValue}>{analysis?.status === "ANALYZED" ? "Organized" : "Needs review"}</p>
            </div>
          </div>

          <p className={styles.note}>{UNDERSTAND.clarificationNote}</p>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="doc-panels">
        <div className={styles.panelHead}>
          <EyeIcon size={16} />
          <h2 className={styles.panelTitle} id="doc-panels">
            {UNDERSTAND.sectionNavigation.documentPanel} → {UNDERSTAND.sectionNavigation.understandingPanel}
          </h2>
          <span className={styles.panelCount}>{UNDERSTAND.demoLabel}</span>
        </div>

        <div className={styles.viewer}>
          {/* LEFT — SOURCE */}
          <div className={styles.docPane}>
            <p className={styles.paneTitle}>{UNDERSTAND.sectionNavigation.documentPanel}</p>

            {analysis?.sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={styles.sectionCard}
                data-active={s.id === activeSectionId}
                aria-pressed={s.id === activeSectionId}
                onClick={() => setActiveSectionId(s.id)}
              >
                <span className={styles.sectionCardTitle}>
                  {s.title || `Section ${i + 1}`}
                  {s.pageNumber ? ` · p.${s.pageNumber}` : ""}
                </span>
                <span className={styles.sectionCardPreview}>{s.originalText}</span>
              </button>
            ))}

            {analysis?.measurements.length ? (
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  aria-expanded={showMeasurements}
                  onClick={() => setShowMeasurements((v) => !v)}
                >
                  <ChevronDownIcon size={13} style={{ transform: showMeasurements ? "rotate(180deg)" : "none" }} />
                  {UNDERSTAND.measurementsLabel}
                </button>
                {showMeasurements ? (
                  <table className={styles.table} style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Recorded value</th>
                        <th>Date</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.measurements.map((m) => (
                        <tr key={m.id}>
                          <td>{m.label}</td>
                          <td>
                            {m.value} {m.unit}
                          </td>
                          <td>{analysis.dates[0] ?? "—"}</td>
                          <td>Page {sourcePage(document, m.sourceReferenceId) ?? 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* RIGHT — UNDERSTANDING */}
          <div className={styles.underPane}>
            <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <p className={styles.paneTitle} style={{ marginBottom: 0 }}>
                {UNDERSTAND.sectionNavigation.explanationLabel}
              </p>
              <div className={styles.segment} role="group" aria-label="Explanation level">
                {(["SIMPLE", "STANDARD", "DETAILED"] as ExplanationComplexity[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.segBtn}
                    data-active={complexity === c}
                    aria-pressed={complexity === c}
                    onClick={() => onComplexity(c)}
                  >
                    {c.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.row} style={{ marginBottom: 12 }}>
              <GlobeIcon size={14} style={{ color: "var(--brand-600)" }} />
              <span className={styles.sub}>Explain in:</span>
              {UNDERSTAND_LANGUAGES.filter((l) => l.implemented).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${language === l.id ? styles.btnPrimary : styles.btnGhost}`}
                  aria-pressed={language === l.id}
                  onClick={() => onLanguage(l.id)}
                >
                  {l.native}
                </button>
              ))}
            </div>

            {explanation ? (
              <div className={styles.explainCard}>
                <div className={styles.stackOriginal}>
                  <p className={styles.stackLabel}>{UNDERSTAND.originalAndExplanation.originalLabel}</p>
                  <p className={styles.stackBody}>{section?.originalText}</p>
                </div>

                <div className={styles.stackOriginal}>
                  <p className={styles.stackLabel}>{UNDERSTAND.originalAndExplanation.explanationLabel}</p>
                  <p className={`${styles.stackBody} ${styles.stackBodyBright}`}>
                    {renderLocalized(explanation, language)}
                  </p>
                </div>

                <div className={styles.stackOriginal} style={{ marginBottom: 0 }}>
                  <p className={styles.stackLabel}>{UNDERSTAND.originalAndExplanation.sourceLabel}</p>
                  <div className={styles.row}>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      aria-expanded={showOriginal}
                      onClick={() => setShowOriginal((v) => !v)}
                    >
                      <QuoteIcon size={13} />
                      {showOriginal ? UNDERSTAND.hideSourceCta : UNDERSTAND.viewSourceCta}
                    </button>
                    <span className={`${styles.tag} ${styles.tagMuted}`}>
                      Page {page ?? 1}
                      {section?.title ? ` · Section "${section.title}"` : ""}
                    </span>
                    <button type="button" className={styles.linkBtn} onClick={onAskAboutDocument}>
                      <InfoIcon size={13} />
                      {UNDERSTAND.questionModeHeading}
                    </button>
                  </div>
                </div>

                {showOriginal ? (
                  <div className={styles.sourceBox}>
                    <p className={styles.key}>{UNDERSTAND.sourceHeading}</p>
                    <p>
                      Page {page ?? 1}
                      {section?.title ? `, section "${section.title}"` : ""}
                    </p>
                    <p className={styles.sourceQuote}>&ldquo;{section?.originalText}&rdquo;</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className={styles.key} style={{ marginTop: 14 }}>
              {UNDERSTAND.termsLabel}
            </p>
            <div className={styles.termList}>
              {analysis?.terms.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.termChip}
                  data-active={activeTermId === t.id}
                  aria-pressed={activeTermId === t.id}
                  onClick={() => setActiveTermId(activeTermId === t.id ? null : t.id)}
                >
                  {t.term}
                  {savedTerms.includes(t.id) ? <CheckIcon size={12} /> : null}
                </button>
              ))}
            </div>

            {term ? <TermCard term={term} onSave={onSaveTerm} saved={savedTerms.includes(term.id)} /> : null}

            {language !== "en" ? (
              <p className={styles.note}>{UNDERSTAND.languageBridge.termNote}</p>
            ) : null}

            <p className={styles.note}>{UNDERSTAND.termNoDiagnosis}</p>
            <p className={styles.note}>{UNDERSTAND.uncertaintyNote}</p>
          </div>
        </div>
      </section>

      <div className={styles.row}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onConnectToStory}>
          <ArrowRightIcon size={17} />
          {UNDERSTAND.connectToStory.heading}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onAskAboutDocument}>
          {UNDERSTAND.questionAskCta}
        </button>
      </div>
      <div className={styles.safeNote}>{UNDERSTAND.safetyBanner}</div>
      <p className={styles.disclaimer}>{UNDERSTAND.disclaimer}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TermCard({
  term,
  saved,
  onSave,
}: {
  term: DocumentTerm;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <div className={styles.explainCard} style={{ marginTop: 12 }} aria-live="polite">
      <p className={styles.key}>{UNDERSTAND.termExplainerHeading}</p>

      <div className={styles.stackOriginal}>
        <p className={styles.stackLabel}>{UNDERSTAND.termDefinitionLabel}</p>
        <p className={styles.stackBody}>{term.plainDefinition}</p>
      </div>

      <div className={styles.stackOriginal}>
        <p className={styles.stackLabel}>{UNDERSTAND.termContextLabel}</p>
        <p className={`${styles.stackBody} ${styles.stackBodyBright}`}>
          {UNDERSTAND.contextFirstPrefix} {term.documentContext}
        </p>
      </div>

      <div className={styles.stackOriginal} style={{ marginBottom: 0 }}>
        <p className={styles.stackLabel}>{UNDERSTAND.termSourceLabel}</p>
        <p className={styles.stackBody}>{UNDERSTAND.whyIsThisHere.replace("{page}", "1")}</p>
      </div>

      <div className={styles.row} style={{ marginTop: 10 }}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSm} ${saved ? styles.btnGhost : styles.btnPrimary}`}
          onClick={() => onSave(term.id)}
          disabled={saved}
        >
          <CheckIcon size={13} />
          {saved ? "Saved to My Health Vocabulary" : "Save to My Health Vocabulary"}
        </button>
      </div>
      <p className={styles.note}>{UNDERSTAND.termNoDiagnosis}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Localisation helpers (prototype — English full, others dictionary)
 * ------------------------------------------------------------------ */

const LOCALIZED: Record<string, Record<string, string>> = {
  hi: {
    "This is the document header.":
      "यह दस्तावेज़ का शीर्षक है। इसमें रोगी का नाम, तारीख़ और परीक्षण का प्रकार दिखाया गया है।",
    "This header identifies the document":
      "यह शीर्षक दस्तावेज़ को पहचानता है: रोगी, संग्रह तिथि और आदेश दिया गया पैनल।",
    "This section lists the measurements":
      "यह भाग आपके रक्त परीक्षण के माप दर्शाता है।",
    "This section summarizes what the results mean":
      "यह भाग बताता है कि परिणाम का क्या अर्थ है।",
    "The Impression is the summarizing statement":
      "सारांश भाग निष्कर्ष प्रस्तुत करता है। ग्लूकोज़ संदर्भ सीमा से थोड़ा ऊपर है।",
  },
  gu: {
    "This is the document header.":
      "આ દસ્તાવેજનું શીર્ષક છે. તેમાં દર્દીનું નામ, તારીખ અને પરીક્ષણનો પ્રકાર બતાવે છે.",
    "This header identifies the document":
      "આ શીર્ષક દસ્તાવેજને ઓળખાવે છે: દર્દી, સંગ્રહ તારીખ અને ઓર્ડર કરેલું પેનલ.",
    "This section lists the measurements":
      "આ વિભાગ તમારા લોહ પરીક્ષણના માપ દર્શાવે છે.",
    "This section summarizes what the results mean":
      "આ વિભાગ પરિણામોનો અર્થ સમજાવે છે.",
    "The Impression is the summarizing statement":
      "સારાંશ વિભાગ નિષ્કર્ષ આપે છે. ગ્લુકોઝ સંદર્ભ મર્યાદાથી થોડું ઉપર છે.",
  },
};

const LANG_NAMES: Record<string, string> = { hi: "हिन्दी", gu: "ગુજરાતી" };

function renderLocalized(text: string, lang: string): string {
  if (lang === "en") return text;
  const dict = LOCALIZED[lang];
  if (dict) {
    for (const [prefix, value] of Object.entries(dict)) {
      if (text.startsWith(prefix)) return value;
    }
  }
  // Honest fallback: never pretend a translation exists.
  return `${text}\n\n[Prototype translation into ${LANG_NAMES[lang] ?? lang} is not available for this section yet — the English explanation is shown instead.]`;
}

function sourcePage(document: HealthDocument, refId: string): number | undefined {
  return document.analysis?.sourceReferences.find((r) => r.id === refId)?.pageNumber;
}

function explainSection(section: DocumentSection, complexity: ExplanationComplexity): string {
  const lower = section.originalText.toLowerCase();
  const isResults = lower.includes("results:");
  const isImpression = lower.includes("impression:");
  const isHeader = !isResults && !isImpression && section.originalText.split("\n").length <= 4;

  if (isHeader) {
    return complexity === "SIMPLE"
      ? "This is the document header. It shows the patient name, the date and the type of test."
      : "This header identifies the document: patient, collection date and the panel ordered.";
  }

  if (isResults) {
    if (complexity === "SIMPLE")
      return "This section lists the measurements from the test. Each line shows what was measured, the result, and the typical range.";
    if (complexity === "STANDARD")
      return "This Results section shows each measurement. For every item it gives the value, the unit, and the reference range (the range typically seen in healthy people). Values outside that range are noted for follow-up.";
    return "This section presents the full test output. Each analyte is listed with its concentration, units, and the laboratory's reference interval — the central range of values seen in a healthy reference population.";
  }

  if (isImpression) {
    if (complexity === "SIMPLE")
      return "This part says which results are outside the typical range, and suggests a follow-up test in 3 months.";
    if (complexity === "STANDARD")
      return "The Impression is the summarizing statement. It notes that glucose is slightly above the reference range while other values are within typical limits, and recommends repeating glucose testing in 3 months.";
    return "The Impression provides the summarizing statement. The elevated glucose is the only value outside the reference interval. The recommendation for repeat testing in 3 months reflects standard monitoring for borderline glucose values.";
  }

  return complexity === "SIMPLE"
    ? "This part of the document contains health information from your test or visit."
    : "This section contains health information recorded in the document.";
}
