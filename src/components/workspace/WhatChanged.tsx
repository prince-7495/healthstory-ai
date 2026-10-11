"use client";

import { useState } from "react";
import { ANALYSIS } from "@/lib/health/options";
import type { HealthChange } from "@/lib/health/types";
import { ArrowRightIcon, PlusTrendIcon } from "../icons";
import styles from "./workspace.module.css";

/* ---------- Single change card ---------- */

function ChangeCard({ change }: { change: HealthChange }) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className={styles.changeCard3}>
      <div className={styles.changeCardHead}>
        <span className={styles.changeCardCategory}>{change.category}</span>
        <span className={styles.confBadge} data-conf={change.confidence}>
          {ANALYSIS.confidenceLabels[change.confidence] ?? change.confidence}
        </span>
      </div>

      <div className={styles.changeCardBody}>
        {/* Before → After visual */}
        <div className={styles.changeBeforeAfter}>
          <span className={`${styles.changePill} ${styles.changePillBefore}`}>
            {change.before}
          </span>
          <span className={styles.changeArrowSep} aria-hidden="true">
            →
          </span>
          <span className={`${styles.changePill} ${styles.changePillAfter}`}>
            {change.after}
          </span>
        </div>

        {/* Plain-language description — reporting language only, never causal */}
        <p className={styles.changeDesc3}>{change.description}</p>

        {/* Expandable evidence */}
        {showEvidence && change.sourceText ? (
          <div className={styles.changeEv3}>
            <p className={styles.changeEv3Label}>{ANALYSIS.evidenceLabel}</p>
            <p className={styles.changeEv3Text}>{change.sourceText}</p>
          </div>
        ) : null}

        {change.sourceText ? (
          <button
            type="button"
            className={styles.tl3EvidenceToggle}
            aria-expanded={showEvidence}
            onClick={() => setShowEvidence((v) => !v)}
            style={{ alignSelf: "flex-start" }}
          >
            <ArrowRightIcon
              size={12}
              style={{ transform: showEvidence ? "rotate(90deg)" : "none", transition: "transform 200ms" }}
            />
            {showEvidence ? ANALYSIS.evidenceClose : ANALYSIS.evidenceToggle}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- WhatChanged ---------- */

type Props = {
  changes: HealthChange[];
};

/**
 * WhatChanged — the Stage 3 differentiator.
 *
 * Every card shows:
 *   BEFORE  →  AFTER
 * plus the sentence from the user's own words that supports it.
 *
 * The system compares. The user confirms the comparison is accurate by
 * reading it — this section is intentionally read-only; corrections
 * happen on the timeline itself.
 */
export default function WhatChanged({ changes }: Props) {
  return (
    <section className={styles.sectionPanel} aria-labelledby="changes-heading">
      <div className={styles.sectionHead}>
        <PlusTrendIcon size={18} className={styles.blockTitleIcon} />
        <h2 className={styles.sectionTitle} id="changes-heading">
          {ANALYSIS.changesHeading}
        </h2>
        <span className={styles.sectionCount}>{changes.length}</span>
      </div>

      <div className={styles.sectionBody}>
        {changes.length === 0 ? (
          <p className={styles.structAbsent}>{ANALYSIS.changesEmpty}</p>
        ) : (
          <div className={styles.changeCards}>
            {changes.map((change) => (
              <ChangeCard key={change.id} change={change} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
