"use client";

import { useState } from "react";
import { UNDERSTAND } from "@/lib/understand/options";
import { DOCUMENT_TYPE_LABELS } from "@/lib/journal/types";
import { detectLanguage } from "@/lib/understand/engine";
import { AlertIcon, ArrowRightIcon, CheckIcon, DocumentIcon, TrashIcon } from "../icons";
import styles from "./understand.module.css";

const STAGES = [
  "Reading document",
  "Finding sections",
  "Identifying important terms",
  "Organizing information",
  "Preparing plain-language explanation",
];

type Props = {
  file: { name: string; type: string; size: number; text: string };
  processing: boolean;
  stageIndex: number;
  error: string | null;
  onUnderstand: (selectedText?: string) => void;
  onCancelProcessing: () => void;
  onRemove: () => void;
};

/**
 * DocumentUpload — "Review Before Understanding".
 *
 * Shows only what is genuinely known: filename, byte size, detected language
 * (heuristic), and a keyword-based document type labelled as a guess.
 * No OCR and no page count are claimed for a plain text file.
 */
export default function DocumentUpload({
  file,
  processing,
  stageIndex,
  error,
  onUnderstand,
  onCancelProcessing,
  onRemove,
}: Props) {
  const [selected, setSelected] = useState<"entire" | "text">("entire");
  const [excerpt, setExcerpt] = useState("");

  const guessType = (() => {
    const lower = file.text.toLowerCase();
    if (/reference range|mg\/dl|blood test|cbc|metabolic/.test(lower)) return "TEST_REPORT" as const;
    if (/appointment|visit|consultation/.test(lower)) return "APPOINTMENT_NOTE" as const;
    if (/take|dose|twice daily|instructions/.test(lower)) return "INSTRUCTION_SHEET" as const;
    return "UNKNOWN" as const;
  })();

  if (processing) {
    return (
      <section className={styles.panel} aria-labelledby="doc-processing">
        <div className={styles.panelHead}>
          <DocumentIcon size={16} />
          <h2 className={styles.panelTitle} id="doc-processing">
            {UNDERSTAND.overviewHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.sub}>{file.name}</p>
          <div className={styles.stages} aria-live="polite">
            {STAGES.map((s, i) => {
              const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "todo";
              return (
                <div key={s} className={styles.stage} data-state={state}>
                  <span className={styles.stageDot} aria-hidden="true">
                    {state === "done" ? <CheckIcon size={12} /> : i + 1}
                  </span>
                  <span className={styles.stageText}>{s}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.row} style={{ marginTop: 16 }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={onCancelProcessing}
            >
              Cancel
            </button>
          </div>
          <p className={styles.note}>{UNDERSTAND.demoLabel}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="doc-preview">
      <div className={styles.panelHead}>
        <DocumentIcon size={16} />
        <h2 className={styles.panelTitle} id="doc-preview">
          {UNDERSTAND.previewHeading}
        </h2>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.previewGrid}>
          <div className={styles.previewItem}>
            <p className={styles.previewLabel}>{UNDERSTAND.previewFileName}</p>
            <p className={styles.previewValue}>{file.name}</p>
          </div>
          <div className={styles.previewItem}>
            <p className={styles.previewLabel}>Size</p>
            <p className={styles.previewValue}>
              {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
            </p>
          </div>
          <div className={styles.previewItem}>
            <p className={styles.previewLabel}>{UNDERSTAND.previewLanguage}</p>
            <p className={styles.previewValue}>{detectLanguage(file.text)} (detected)</p>
          </div>
          <div className={styles.previewItem}>
            <p className={styles.previewLabel}>{UNDERSTAND.previewType}</p>
            <p className={styles.previewValue}>{DOCUMENT_TYPE_LABELS[guessType]}</p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <p className={styles.key}>What to understand</p>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${selected === "entire" ? styles.btnPrimary : styles.btnGhost}`}
              aria-pressed={selected === "entire"}
              onClick={() => setSelected("entire")}
            >
              {UNDERSTAND.selectionModes.entire}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${selected === "text" ? styles.btnPrimary : styles.btnGhost}`}
              aria-pressed={selected === "text"}
              onClick={() => setSelected("text")}
            >
              {UNDERSTAND.selectionModes.text}
            </button>
          </div>
          {selected === "text" ? (
            <div style={{ marginTop: 10 }}>
              <label className={styles.fieldLabel} htmlFor="doc-excerpt">
                Paste the part you want understood (data minimization)
              </label>
              <textarea
                id="doc-excerpt"
                className={styles.textarea}
                style={{ minHeight: 80 }}
                placeholder="Only this text will be organized…"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
              <p className={styles.note}>Only the text above is used when you continue.</p>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className={styles.alert} style={{ marginTop: 14 }} role="alert">
            <p className={styles.alertTitle}>
              <AlertIcon size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
              We couldn&rsquo;t read that file
            </p>
            <p className={styles.alertText}>{error}</p>
          </div>
        ) : null}

        <div className={styles.row} style={{ marginTop: 18 }}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={selected === "text" && !excerpt.trim()}
            onClick={() => onUnderstand(selected === "text" ? excerpt.trim() : undefined)}
          >
            {UNDERSTAND.understandCta}
            <ArrowRightIcon size={17} />
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onRemove}>
            <TrashIcon size={14} />
            {UNDERSTAND.removeCta}
          </button>
        </div>

        <div className={styles.safeNote} style={{ marginTop: 16 }}>
          {UNDERSTAND.safetyBanner}
        </div>
        <p className={styles.note}>{UNDERSTAND.uploadPrivacy}</p>
        <p className={styles.note}>{UNDERSTAND.demoLabel} — this prototype organizes plain text only. No OCR or PDF parsing is claimed.</p>
      </div>
    </section>
  );
}
