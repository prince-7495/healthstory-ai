"use client";

import { UNDERSTAND } from "@/lib/understand/options";
import { AlertIcon, ArrowRightIcon, ReadIcon, ShieldIcon } from "../icons";
import styles from "./understand.module.css";

type Props = {
  documentCount: number;
  onOpen: () => void;
};

/**
 * UnderstandCard — the Stage 8 entry point on the journal dashboard.
 * Explains what the feature does without implying clinical interpretation.
 */
export default function UnderstandCard({ documentCount, onOpen }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="understand-card">
      <div className={styles.panelHead}>
        <ReadIcon size={16} />
        <h2 className={styles.panelTitle} id="understand-card">
          {UNDERSTAND.featureName}
        </h2>
        {documentCount > 0 ? <span className={styles.panelCount}>{documentCount}</span> : null}
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>{UNDERSTAND.homeSupporting}</p>
        <div className={styles.row} style={{ marginTop: 14 }}>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={onOpen}>
            <ReadIcon size={13} />
            {UNDERSTAND.homeHeading}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onOpen}>
            <ArrowRightIcon size={13} />
            {UNDERSTAND.optionUpload}
          </button>
        </div>
        <p className={styles.note}>
          <AlertIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4, color: "#8a6414" }} />
          {UNDERSTAND.noClinicalInterpretation}
        </p>
        <p className={styles.note}>
          <ShieldIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {UNDERSTAND.safetyBanner}
        </p>
      </div>
    </section>
  );
}
