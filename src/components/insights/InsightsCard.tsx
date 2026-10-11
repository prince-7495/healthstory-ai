"use client";

import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import { AlertIcon, GraphIcon, ShieldIcon } from "../icons";
import styles from "./insights.module.css";

type Props = {
  nodeCount: number;
  insightCount: number;
  onOpen: () => void;
};

/**
 * InsightsCard — the Stage 9 entry point on the journal dashboard.
 * Explains the map without implying any clinical power.
 */
export default function InsightsCard({ nodeCount, insightCount, onOpen }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="insights-card">
      <div className={styles.panelHead}>
        <GraphIcon size={16} />
        <h2 className={styles.panelTitle} id="insights-card">
          {INSIGHTS_OPTIONS.featureName}
        </h2>
        {nodeCount > 0 ? <span className={styles.panelCount}>{nodeCount} nodes</span> : null}
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>{INSIGHTS_OPTIONS.strap}</p>
        <div className={styles.row} style={{ marginTop: 14 }}>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={onOpen}>
            <GraphIcon size={13} />
            {insightCount > 0 ? "Explore My HealthStory" : "Explore Connections"}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onOpen}>
            {INSIGHTS_OPTIONS.ctaEvidence}
          </button>
        </div>
        <p className={styles.note}>
          <ShieldIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {INSIGHTS_OPTIONS.trust.finalBody}
        </p>
        <p className={styles.note}>
          <AlertIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4, color: "#8a6414" }} />
          {INSIGHTS_OPTIONS.safety}
        </p>
      </div>
    </section>
  );
}