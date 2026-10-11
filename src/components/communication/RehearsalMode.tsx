"use client";

import { useState } from "react";
import { CONVERSATION } from "@/lib/communication/options";
import { COMMUNICATION_LANGUAGES, heading } from "@/lib/communication/languages";
import type { CommunicationDraft, CommunicationLine } from "@/lib/communication/types";
import { ArrowRightIcon } from "../icons";
import styles from "./communication.module.css";

function sectionText(lines: CommunicationLine[]): string {
  return lines.map((l) => l.text).join(" ");
}

/**
 * RehearsalMode — "Practice My Story".
 *
 * Shows one section at a time with a communication coaching prompt. This is
 * communication practice, never medical advice, and it ends with a plain
 * "Conversation Ready" note rather than any kind of readiness score.
 */
export default function RehearsalMode({
  draft,
  onExit,
}: {
  draft: CommunicationDraft;
  onExit: () => void;
}) {
  const lang = draft.language;
  const steps: { label: string; text: string; prompt: string }[] = [];

  if (draft.whatINoticed.length) {
    steps.push({ label: heading(lang, "noticed"), text: sectionText(draft.whatINoticed), prompt: CONVERSATION.rehearsalPrompts[0] });
  }
  if (draft.timeline.length) {
    steps.push({ label: heading(lang, "started"), text: sectionText(draft.timeline), prompt: CONVERSATION.rehearsalPrompts[0] });
  }
  if (draft.reportedChanges.length) {
    steps.push({ label: heading(lang, "changed"), text: sectionText(draft.reportedChanges), prompt: CONVERSATION.rehearsalPrompts[1] });
  }
  if (draft.relevantContext.length) {
    steps.push({ label: heading(lang, "context"), text: sectionText(draft.relevantContext), prompt: CONVERSATION.rehearsalPrompts[2] });
  }
  if (draft.recentUpdate) {
    steps.push({ label: heading(lang, "recent"), text: draft.recentUpdate.text, prompt: CONVERSATION.rehearsalPrompts[3] });
  }
  if (draft.questions.length) {
    steps.push({
      label: heading(lang, "questions"),
      text: draft.questions.map((q, i) => `${i + 1}. ${q.text}`).join(" "),
      prompt: CONVERSATION.rehearsalPrompts[3],
    });
  }

  const [step, setStep] = useState(0);
  const done = step >= steps.length;
  const current = steps[Math.min(step, steps.length - 1)];
  const langLabel = COMMUNICATION_LANGUAGES.find((l) => l.id === lang)?.label ?? "English";

  return (
    <div className={styles.rehearsal}>
      {done || steps.length === 0 ? (
        <div className={styles.rehearsalCard}>
          <p className={styles.rehearsalStep}>{CONVERSATION.rehearsalDone}</p>
          <p className={styles.rehearsalBody}>{CONVERSATION.rehearsalDoneSub}</p>
          <div className={styles.rehearsalNav} style={{ justifyContent: "center" }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(0)}>
              {CONVERSATION.rehearsalPrev}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onExit}>
              {CONVERSATION.viewStoryCta}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.rehearsalCard} aria-live="polite">
          <p className={styles.rehearsalStep}>
            {CONVERSATION.rehearsalStep.replace("{n}", String(step + 1)).replace("{total}", String(steps.length))}
          </p>
          <p className={styles.rehearsalPrompt}>{current.prompt}</p>
          <p className={styles.rehearsalBody}>{current.text}</p>
          <p className={styles.note} style={{ marginTop: 14 }}>
            {current.label} · {langLabel}
          </p>

          <div className={styles.rehearsalNav}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => (step === 0 ? onExit() : setStep((s) => s - 1))}
            >
              {step === 0 ? CONVERSATION.cancelCta : CONVERSATION.rehearsalPrev}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep((s) => s + 1)}>
              {step === steps.length - 1 ? CONVERSATION.rehearsalDone : CONVERSATION.rehearsalNext}
              <ArrowRightIcon size={16} className="btn__arrow" />
            </button>
          </div>
          <p className={styles.disclaimer} style={{ marginTop: 16 }}>
            {CONVERSATION.rehearsalIntro}
          </p>
        </div>
      )}
    </div>
  );
}
