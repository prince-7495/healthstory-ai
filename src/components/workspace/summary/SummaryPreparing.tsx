"use client";

import { SUMMARY } from "@/lib/health/options";
import { SUMMARY_STAGES, type SummaryStage } from "@/lib/health/summary";
import { CheckIcon, SparkIcon } from "../../icons";
import styles from "./summary.module.css";

/**
 * SummaryPreparing — the "assembly" moment.
 *
 * Each line maps to real work the generator does: reading the confirmed
 * timeline, gathering changes, using reviewed information, preparing
 * questions, then writing the summary. Nothing here claims more than the
 * deterministic generator actually does.
 */
export default function SummaryPreparing({
  current,
  isDemo,
}: {
  current: SummaryStage | null;
  isDemo: boolean;
}) {
  const index = current ? SUMMARY_STAGES.findIndex((s) => s.id === current) : -1;

  return (
    <div className={styles.preparing}>
      <div className={styles.spinner} aria-hidden="true" />
      <h1 className={styles.title}>{SUMMARY.preparingHeading}</h1>
      <p className={styles.lead}>{SUMMARY.preparingSub}</p>

      <div className={styles.prepStages}>
        {SUMMARY_STAGES.map((stage, i) => {
          const state = i < index ? "done" : i === index ? "active" : "todo";
          return (
            <div key={stage.id} className={styles.prepStage} data-state={state}>
              <span className={styles.prepStageDot} aria-hidden="true">
                {state === "done" ? <CheckIcon size={12} /> : state === "active" ? <SparkIcon size={11} /> : i + 1}
              </span>
              <span className={styles.prepStageText}>{stage.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }} aria-hidden="true">
        <div className={`${styles.skeleton} ${styles.skTitle}`} />
        <div className={`${styles.skeleton} ${styles.skLine}`} />
        <div className={`${styles.skeleton} ${styles.skLine}`} style={{ width: "88%" }} />
        <div className={`${styles.skeleton} ${styles.skLine}`} style={{ width: "72%" }} />
      </div>

      <p role="status" className="sr-only">
        {current ? SUMMARY_STAGES.find((s) => s.id === current)?.label : SUMMARY.preparingHeading}
      </p>

      {isDemo ? (
        <p className={styles.sectionNote} style={{ marginTop: 20 }}>
          Fictional demonstration data
        </p>
      ) : null}
    </div>
  );
}
