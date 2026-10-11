"use client";

import { FOLLOWUP } from "@/lib/followup/options";
import { AlertIcon, ArrowRightIcon, PlusIcon, ShieldIcon } from "../icons";
import styles from "./followup.module.css";

type Props = {
  followUpCount: number;
  openQuestions: number;
  onAdd: () => void;
  onViewHistory: () => void;
};

/**
 * FollowUpCard — the Stage 7 entry point on the journal dashboard.
 * Records what happened after a conversation and carries it forward.
 */
export default function FollowUpCard({ followUpCount, openQuestions, onAdd, onViewHistory }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="followup-card">
      <div className={styles.panelHead}>
        <PlusIcon size={16} />
        <h2 className={styles.panelTitle} id="followup-card">
          {FOLLOWUP.featureName}
        </h2>
        {followUpCount > 0 ? <span className={styles.panelCount}>{followUpCount}</span> : null}
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>{FOLLOWUP.promise} Record what happened after a conversation or appointment.</p>
        <div className={styles.row} style={{ marginTop: 14 }}>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={onAdd}>
            <PlusIcon size={13} />
            {FOLLOWUP.addCta}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onViewHistory}>
            <ArrowRightIcon size={13} />
            {FOLLOWUP.historyCta}
          </button>
        </div>
        {openQuestions > 0 ? (
          <p className={styles.note}>
            <AlertIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4, color: "var(--sig-rise)" }} />
            {openQuestions} open question{openQuestions === 1 ? "" : "s"} to discuss.
          </p>
        ) : null}
        <p className={styles.note}>
          <ShieldIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {FOLLOWUP.safetyFooter}
        </p>
      </div>
    </section>
  );
}
