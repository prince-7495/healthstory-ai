"use client";

import { useEffect, useRef } from "react";
import { SUMMARY } from "@/lib/health/options";
import type { ResolvedSource } from "@/lib/health/summary";
import { CloseIcon, QuoteIcon, SparkIcon } from "../../icons";
import styles from "./summary.module.css";

/**
 * SummarySourceDrawer — the transparency layer.
 *
 * Every summary statement can be traced back to the user's own words.
 * The drawer shows the organized statement next to the original phrases
 * it was built from, so the AI is never a black box.
 */
export default function SummarySourceDrawer({
  statement,
  sources,
  onClose,
}: {
  statement: string;
  sources: ResolvedSource[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={SUMMARY.sourceHeading}
      >
        <div className={styles.drawerHead}>
          <h2 className={styles.drawerTitle}>
            <SparkIcon size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "-2px" }} />
            {SUMMARY.sourceHeading}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label={SUMMARY.closeCta}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.drawerGroup}>
            <p className={styles.drawerKey}>{SUMMARY.sourceStatementLabel}</p>
            <p className={styles.drawerStmt}>{statement}</p>
          </div>

          <div className={styles.drawerGroup}>
            <p className={styles.drawerKey}>{SUMMARY.sourceOriginalLabel}</p>
            {sources.length === 0 ? (
              <p className={styles.absent}>{SUMMARY.noSource}</p>
            ) : (
              sources.map((s) => (
                <div key={s.eventId} className={styles.drawerSource}>
                  <div className={styles.drawerSourceMeta}>
                    <QuoteIcon size={14} style={{ color: "var(--brand-500)" }} />
                    <span className={styles.infoTime}>{s.timeLabel}</span>
                  </div>
                  <p className={styles.drawerQuote}>{s.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.drawerFoot}>
          <button type="button" className={`${styles.miniBtn} ${styles.miniBtnPrimary}`} onClick={onClose}>
            {SUMMARY.closeCta}
          </button>
        </div>
      </aside>
    </>
  );
}
