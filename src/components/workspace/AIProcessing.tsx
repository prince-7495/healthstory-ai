"use client";

import { PROCESSING } from "@/lib/health/options";
import type { PipelineStage } from "@/lib/health/types";
import { CheckIcon, InfoIcon } from "../icons";
import styles from "./workspace.module.css";

const ORDER: PipelineStage[] = ["reading", "dates", "timeline", "changes", "building"];

const FLOW_LABELS: Record<PipelineStage, string> = {
  reading: "Your story",
  events: "Events",
  dates: "Extraction",
  timeline: "Timeline",
  changes: "Change detection",
  building: "Your story",
};

type Props = {
  /** The stage currently running, or null before it starts. */
  current: PipelineStage | null;
  onCancel: () => void;
};

/**
 * AIProcessing — the in-between screen.
 *
 * Every label here maps to a real step in the extractor, and the stages
 * advance because the work advances: the analyzer reports each stage as
 * it runs. The footnote is not optional — it is the difference between
 * a demo of a product and a fake AI.
 */
export default function AIProcessing({ current, onCancel }: Props) {
  const currentIndex = current ? ORDER.indexOf(current) : -1;

  return (
    <section className={`container ${styles.process}`} aria-live="polite">
      <h1 className={styles.processTitle}>{PROCESSING.heading}</h1>
      <p className={styles.processSub}>{PROCESSING.subtext}</p>

      {/* The pipeline as the brief describes it, as a strip. */}
      <div className={styles.flow}>
        {ORDER.map((stage, i) => {
          const state = currentIndex < 0 ? "todo" : i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
          return (
            <span key={stage} style={{ display: "contents" }}>
              <span className={styles.flowNode} data-state={state}>
                {state === "done" ? <CheckIcon size={13} /> : null}
                {FLOW_LABELS[stage]}
              </span>
              {i < ORDER.length - 1 ? (
                <span
                  className={styles.flowArrow}
                  data-on={currentIndex > i}
                  aria-hidden="true"
                />
              ) : null}
            </span>
          );
        })}
      </div>

      {/* The same stages, spelled out, so the work is legible. */}
      <ol className={styles.steps}>
        {PROCESSING.stages.map((stage, i) => {
          const state = currentIndex < 0 ? "todo" : i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
          return (
            <li key={stage.id} className={styles.stepRow} data-state={state}>
              <span className={styles.stepIcon} aria-hidden="true">
                {state === "done" ? <CheckIcon size={14} /> : null}
              </span>
              <span className={styles.stepName}>{stage.label}</span>
              <span className={styles.stepState}>
                {state === "done" ? "Done" : state === "active" ? "Working" : "Waiting"}
              </span>
            </li>
          );
        })}
      </ol>

      <p className={styles.processNote}>
        <InfoIcon size={17} className={styles.processNoteIcon} />
        <span>
          These steps are real work happening in your browser: your text is being
          read for dates, symptoms, frequency and change wording. No external
          service receives your health information.
        </span>
      </p>

      <div className={styles.processActions}>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}