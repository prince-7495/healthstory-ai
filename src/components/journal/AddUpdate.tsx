"use client";

import { useRef, useState } from "react";
import { JOURNAL, UPDATE_CHIPS } from "@/lib/journal/options";
import { UPDATE_STAGES, type UpdateStage } from "@/lib/journal/engine";
import { DEMO_UPDATE_TEXT } from "@/lib/journal/demo";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../icons";
import styles from "./journal.module.css";

const CHIP_PLACEHOLDERS: Record<string, string> = {
  "Something changed": "What is different since your last update?",
  "A new symptom or event": "What have you noticed, and roughly when?",
  "Something improved": "What feels different in your own words?",
  "Something became more frequent": "What has been happening more often?",
  "Medication or treatment mentioned": "What did you start, stop or change?",
  "Test or appointment": "What was it, and when did it happen?",
  "Lifestyle change": "What changed in your routine?",
  "Something I want to remember": "What would you like to record?",
};

type Props = {
  processing: boolean;
  stage: UpdateStage | null;
  error: string | null;
  hasEntries: boolean;
  onOrganize: (content: string) => void;
  onLoadDemo: () => void;
  onCancel: () => void;
};

/**
 * AddUpdate — the Stage 5 entry point.
 *
 * The quick chips are organizational only: selecting one changes the
 * prompt shown, it never inserts words into the user's story. What is
 * analyzed is exactly what the person typed.
 */
export default function AddUpdate({
  processing,
  stage,
  error,
  hasEntries,
  onOrganize,
  onLoadDemo,
  onCancel,
}: Props) {
  const [content, setContent] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [emptyError, setEmptyError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const index = stage ? UPDATE_STAGES.findIndex((s) => s.id === stage) : -1;

  function toggleChip(chip: string) {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
    textareaRef.current?.focus();
  }

  function submit() {
    if (!content.trim()) {
      setEmptyError(true);
      textareaRef.current?.focus();
      return;
    }
    setEmptyError(false);
    onOrganize(content);
  }

  const placeholder = chips.length > 0 ? CHIP_PLACEHOLDERS[chips[chips.length - 1]] : JOURNAL.addUpdatePlaceholder;

  return (
    <section className={styles.panel} aria-labelledby="add-update-heading">
      <div className={styles.panelHead}>
        <SparkIcon size={17} />
        <h2 className={styles.panelTitle} id="add-update-heading">
          {JOURNAL.addUpdateHeading}
        </h2>
      </div>

      <div className={styles.panelBody}>
        {processing ? (
          <>
            <p className={styles.sub}>{JOURNAL.updatingSub}</p>
            <div className={styles.stages} aria-live="polite">
              {UPDATE_STAGES.map((s, i) => {
                const state = i < index ? "done" : i === index ? "active" : "todo";
                return (
                  <div key={s.id} className={styles.stage} data-state={state}>
                    <span className={styles.stageDot} aria-hidden="true">
                      {state === "done" ? <CheckIcon size={12} /> : state === "active" ? <SparkIcon size={11} /> : i + 1}
                    </span>
                    <span className={styles.stageText}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <p role="status" className="sr-only">
              {stage ? UPDATE_STAGES.find((s) => s.id === stage)?.label : JOURNAL.updatingHeading}
            </p>
          </>
        ) : (
          <>
            <div className={styles.chips} role="group" aria-label="Quick update options">
              {UPDATE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`${styles.chip} ${chips.includes(chip) ? styles.chipActive : ""}`}
                  aria-pressed={chips.includes(chip)}
                  onClick={() => toggleChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <label htmlFor="update-input" className="sr-only">
              {JOURNAL.addUpdateHeading}
            </label>
            <textarea
              id="update-input"
              ref={textareaRef}
              className={styles.textarea}
              placeholder={placeholder}
              value={content}
              aria-invalid={emptyError || undefined}
              aria-errormessage={emptyError ? "update-error" : undefined}
              onChange={(e) => {
                setContent(e.target.value);
                if (emptyError) setEmptyError(false);
              }}
            />
            <p className={styles.fieldHelp}>{JOURNAL.addUpdateSupporting}</p>

            {emptyError ? (
              <p id="update-error" role="alert" className={styles.fieldHelp} style={{ color: "var(--sig-rise)" }}>
                Tell us what has changed before organizing your update.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className={styles.fieldHelp} style={{ color: "var(--sig-rise)" }}>
                {error}
              </p>
            ) : null}

            <div className={styles.btnRow} style={{ marginTop: 16 }}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit} disabled={processing}>
                {JOURNAL.organizeCta}
                <ArrowRightIcon size={17} className="btn__arrow" />
              </button>
              {hasEntries ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => {
                    setContent(DEMO_UPDATE_TEXT);
                    setEmptyError(false);
                    textareaRef.current?.focus();
                  }}
                >
                  Use the example update
                </button>
              ) : (
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onLoadDemo}>
                  {JOURNAL.demoCta}
                </button>
              )}
              {hasEntries ? (
                <button type="button" className={styles.linkBtn} onClick={onCancel}>
                  {JOURNAL.cancelCta}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
