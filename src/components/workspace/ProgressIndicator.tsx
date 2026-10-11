"use client";

import { WORKSPACE } from "@/lib/health/options";
import { CheckIcon } from "../icons";
import styles from "./workspace.module.css";

type StepState = "done" | "active" | "todo";

/**
 * ProgressIndicator — three honest steps.
 *
 * The steps map to real work in this stage: 1 is writing, 2 is the
 * extraction pass, 3 is the organized story. Nothing here implies
 * stages that have not been built.
 */
export default function ProgressIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const stateFor = (i: number): StepState =>
    i < step ? "done" : i === step ? "active" : "todo";

  return (
    <div className={styles.progress}>
      <div className={`container ${styles.progressInner}`}>
        <span className={styles.stepLabel}>Step {step} of 4</span>

        <ol className={styles.stepTrack}>
          {WORKSPACE.steps.map((name, i) => {
            const n = i + 1;
            const state = stateFor(n);
            return (
              <li key={name} style={{ display: "contents" }}>
                <span
                  className={styles.stepNode}
                  data-state={state}
                  aria-current={state === "active" ? "step" : undefined}
                >
                  <span className={styles.stepDot} aria-hidden="true">
                    {state === "done" ? <CheckIcon size={13} /> : n}
                  </span>
                  <span className={styles.stepText}>{name}</span>
                  <span className="sr-only">
                    {state === "done" ? " (completed)" : state === "active" ? " (current step)" : ""}
                  </span>
                </span>
                {n < WORKSPACE.steps.length ? (
                  <span className={styles.stepSep} data-on={state === "done"} aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}