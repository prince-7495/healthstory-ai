"use client";

import { useEffect, useRef } from "react";
import { JOURNAL } from "@/lib/journal/options";
import type { TopicHistory } from "@/lib/journal/engine";
import { CloseIcon, InfoIcon, PlusTrendIcon, QuoteIcon } from "../icons";
import styles from "./journal.module.css";

/**
 * TopicHistoryDrawer — how one topic appears across the whole story.
 *
 * Shows first/last mention, every source entry with its date, the changes
 * the user reported, and the topics that appeared alongside it. Related
 * topics are co-mentioned, never causes.
 */
export default function TopicHistoryDrawer({
  history,
  onClose,
}: {
  history: TopicHistory;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={JOURNAL.topicHistoryHeading}>
        <div className={styles.drawerHead}>
          <h2 className={styles.drawerTitle}>{history.topic.label}</h2>
          <button ref={closeRef} type="button" className={styles.drawerClose} onClick={onClose} aria-label={JOURNAL.cancelCta}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.drawerSection}>
            <div className={styles.overviewGrid}>
              <div className={styles.stat}>
                <p className={styles.statKey}>{JOURNAL.topicFirstMentioned}</p>
                <p className={styles.statVal}>{history.firstMentioned ?? "Not provided"}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statKey}>{JOURNAL.topicLastMentioned}</p>
                <p className={styles.statVal}>{history.lastMentioned ?? "Not provided"}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statKey}>{JOURNAL.topicEntries}</p>
                <p className={styles.statVal}>{history.entries.length}</p>
              </div>
            </div>
          </div>

          {history.changes.length > 0 ? (
            <div className={styles.drawerSection}>
              <p className={styles.drawerKey}>{JOURNAL.topicChanges}</p>
              {history.changes.map((c) => (
                <p key={c.id} className={styles.changeLine}>
                  {c.previousValue ? `${c.previousValue} → ${c.currentValue}` : c.description}
                </p>
              ))}
            </div>
          ) : null}

          <div className={styles.drawerSection}>
            <p className={styles.drawerKey}>{JOURNAL.topicSourceEntries}</p>
            {history.entries.length === 0 ? (
              <p className={styles.sub}>{JOURNAL.notEnoughForComparison}</p>
            ) : (
              history.entries.map((entry) => (
                <div key={entry.eventId} style={{ marginBottom: 12 }}>
                  <p className={styles.evidenceKey}>{entry.dateLabel}</p>
                  <div className={styles.entryQuote}>&ldquo;{entry.text}&rdquo;</div>
                </div>
              ))
            )}
          </div>

          {history.related.length > 0 ? (
            <div className={styles.drawerSection}>
              <p className={styles.drawerKey}>
                <PlusTrendIcon size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                {JOURNAL.relatedStoryHeading}
              </p>
              <div className={styles.patternVals}>
                {history.related.map((r) => (
                  <span key={r} className={styles.patternVal}>
                    {r}
                  </span>
                ))}
              </div>
              <p className={styles.sectionNote}>
                <InfoIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                {JOURNAL.relatedNote}
              </p>
            </div>
          ) : null}
        </div>

        <div className={styles.drawerBody} style={{ borderTop: "1px solid var(--line)", padding: "14px 22px" }}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onClose}>
            <QuoteIcon size={13} />
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
