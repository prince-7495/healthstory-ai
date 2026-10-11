"use client";

import { useRef, useState } from "react";
import { FOLLOWUP } from "@/lib/followup/options";
import { FOLLOWUP_STAGES, type FollowUpInput, type FollowUpStage } from "@/lib/followup/engine";
import { DEMO_FOLLOWUP_TEXT } from "@/lib/journal/demo";
import type { FollowUpType } from "@/lib/journal/types";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../icons";
import styles from "./followup.module.css";

type Props = {
  processing: boolean;
  stage: FollowUpStage | null;
  error: string | null;
  hasEntries: boolean;
  onOrganize: (input: FollowUpInput) => void;
  onCancel: () => void;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * FollowUpForm — record what happened after a conversation.
 *
 * Natural language is the primary input; the structured fields are optional
 * and, when used, are folded into the analyzed text so nothing is lost.
 */
export default function FollowUpForm({ processing, stage, error, hasEntries, onOrganize, onCancel }: Props) {
  const [type, setType] = useState<FollowUpType>("CONVERSATION");
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [who, setWho] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [information, setInformation] = useState("");
  const [questions, setQuestions] = useState("");
  const [remember, setRemember] = useState("");
  const [emptyError, setEmptyError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const index = stage ? FOLLOWUP_STAGES.findIndex((s) => s.id === stage) : -1;

  function submit() {
    const combined = [
      text.trim(),
      whatHappened.trim(),
      information.trim() ? `I was told ${information.trim()}` : "",
      questions.trim(),
      remember.trim(),
    ].filter(Boolean).join(". ");

    if (!combined.trim()) {
      setEmptyError(true);
      textareaRef.current?.focus();
      return;
    }
    setEmptyError(false);
    onOrganize({ type, originalText: combined, eventDate: date || undefined, who: who || undefined });
  }

  return (
    <section className={styles.panel} aria-labelledby="followup-form-heading">
      <div className={styles.panelHead}>
        <SparkIcon size={16} />
        <h2 className={styles.panelTitle} id="followup-form-heading">
          {FOLLOWUP.inputHeading}
        </h2>
      </div>
      <div className={styles.panelBody}>
        {processing ? (
          <>
            <p className={styles.sub}>{FOLLOWUP.processingSub}</p>
            <div className={styles.stages} aria-live="polite">
              {FOLLOWUP_STAGES.map((s, i) => {
                const state = i < index ? "done" : i === index ? "active" : "todo";
                return (
                  <div key={s.id} className={styles.stage} data-state={state}>
                    <span className={styles.stageDot} aria-hidden="true">
                      {state === "done" ? <CheckIcon size={12} /> : i + 1}
                    </span>
                    <span className={styles.stageText}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className={styles.key}>{FOLLOWUP.typeHeading}</p>
            <div className={styles.choiceGrid}>
              {FOLLOWUP.typeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={styles.choice}
                  data-active={type === opt.id}
                  aria-pressed={type === opt.id}
                  onClick={() => setType(opt.id)}
                >
                  <span className={styles.choiceLabel}>{opt.label}</span>
                  <span className={styles.choiceHint}>{opt.hint}</span>
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="followup-text">
                {FOLLOWUP.inputHeading}
              </label>
              <textarea
                id="followup-text"
                ref={textareaRef}
                className={styles.textarea}
                placeholder={FOLLOWUP.inputPlaceholder}
                value={text}
                aria-invalid={emptyError || undefined}
                aria-errormessage={emptyError ? "followup-error" : undefined}
                onChange={(e) => {
                  setText(e.target.value);
                  if (emptyError) setEmptyError(false);
                }}
              />
              <p className={styles.note}>{FOLLOWUP.inputMicro}</p>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="followup-date">{FOLLOWUP.dateLabel}</label>
              <input id="followup-date" type="date" className={styles.select} style={{ maxWidth: 220 }} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="followup-who">{FOLLOWUP.whoLabel}</label>
              <select id="followup-who" className={styles.select} style={{ maxWidth: 280 }} value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">{FOLLOWUP.whoOptions[3].label}</option>
                {FOLLOWUP.whoOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="fu-happened">{FOLLOWUP.whatHappened}</label>
              <textarea id="fu-happened" className={styles.textarea} style={{ minHeight: 70 }} value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="fu-info">{FOLLOWUP.informationReceived}</label>
              <textarea id="fu-info" className={styles.textarea} style={{ minHeight: 70 }} value={information} onChange={(e) => setInformation(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="fu-questions">{FOLLOWUP.questionsRemaining}</label>
              <textarea id="fu-questions" className={styles.textarea} style={{ minHeight: 70 }} value={questions} onChange={(e) => setQuestions(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="fu-remember">{FOLLOWUP.whatToRemember}</label>
              <textarea id="fu-remember" className={styles.textarea} style={{ minHeight: 70 }} value={remember} onChange={(e) => setRemember(e.target.value)} />
            </div>
            <p className={styles.note}>{FOLLOWUP.optionalNote}</p>

            {emptyError ? (
              <p id="followup-error" role="alert" className={styles.note} style={{ color: "var(--sig-rise)" }}>
                Tell us what happened before organizing your follow-up.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className={styles.note} style={{ color: "var(--sig-rise)" }}>{error}</p>
            ) : null}

            <div className={styles.row} style={{ marginTop: 18 }}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit}>
                {FOLLOWUP.organizeCta}
                <ArrowRightIcon size={17} className="btn__arrow" />
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setText(DEMO_FOLLOWUP_TEXT);
                  setType("APPOINTMENT");
                  setEmptyError(false);
                  textareaRef.current?.focus();
                }}
              >
                {FOLLOWUP.exampleCta}
              </button>
              {hasEntries ? (
                <button type="button" className={styles.linkBtn} onClick={onCancel}>
                  {FOLLOWUP.cancelCta}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
