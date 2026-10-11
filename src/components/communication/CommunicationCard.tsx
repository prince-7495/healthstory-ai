"use client";

import { CONVERSATION } from "@/lib/communication/options";
import { CheckIcon, EyeIcon, LockIcon, SparkIcon } from "../icons";
import styles from "./communication.module.css";

type Props = {
  questionsOpen: number;
  onPrepare: () => void;
  onPractice: () => void;
  onViewQuestions: () => void;
};

/**
 * CommunicationCard — the Stage 6 entry point on the journal dashboard.
 * Prepare, practice or review questions; the choice stays with the user.
 */
export default function CommunicationCard({ questionsOpen, onPrepare, onPractice, onViewQuestions }: Props) {
  return (
    <section className={`${styles.panel}`} aria-labelledby="communication-card">
      <div className={styles.panelHead}>
        <SparkIcon size={16} />
        <h2 className={styles.panelTitle} id="communication-card">
          Communication
        </h2>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>Prepare your HealthStory for a conversation.</p>
        <div className={styles.row} style={{ marginTop: 14 }}>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={onPrepare}>
            {CONVERSATION.generateCta}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onPractice}>
            <CheckIcon size={13} />
            {CONVERSATION.rehearsalHeading}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onViewQuestions}>
            <EyeIcon size={13} />
            {CONVERSATION.questionHeading}
            {questionsOpen > 0 ? ` (${questionsOpen})` : ""}
          </button>
        </div>
        <p className={styles.note}>
          <LockIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {CONVERSATION.privacyNote}
        </p>
      </div>
    </section>
  );
}
