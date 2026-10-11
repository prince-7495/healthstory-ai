"use client";

import { SUMMARY } from "@/lib/health/options";
import type { SummaryReviewStatus } from "@/lib/health/summary";
import styles from "./summary.module.css";

type Props = {
  checked: boolean[];
  onToggle: (index: number, value: boolean) => void;
  status: SummaryReviewStatus;
  /** Items still AI-organized and not individually confirmed. */
  pendingCount: number;
};

function statusText(status: SummaryReviewStatus): string {
  if (status === "REVIEWED") return SUMMARY.statusReviewed;
  if (status === "REQUIRED") return SUMMARY.statusRequired;
  return SUMMARY.statusDraft;
}

/**
 * SummaryReview — the human-control checkpoint.
 *
 * This is a checklist, not a legal attestation. The wording says "review
 * before sharing", never "I certify this is medically accurate".
 */
export default function SummaryReview({ checked, onToggle, status, pendingCount }: Props) {
  const allChecked = checked.every(Boolean);

  return (
    <div>
      <p className={styles.statusLine}>
        <span className={styles.statusDot} data-state={allChecked ? "REVIEWED" : status} aria-hidden="true" />
        {statusText(allChecked ? "REVIEWED" : status)}
      </p>

      <div className={styles.checklist} style={{ marginTop: 14 }}>
        {SUMMARY.reviewItems.map((label, i) => (
          <label key={label} className={styles.check}>
            <input
              type="checkbox"
              checked={checked[i] ?? false}
              onChange={(e) => onToggle(i, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <p className={styles.reviewNote}>
        {SUMMARY.reviewSupporting}
      </p>

      {pendingCount > 0 ? (
        <p className={styles.warnNote}>
          <span aria-hidden="true">●</span>
          <span>
            {pendingCount} item{pendingCount !== 1 ? "s" : ""} in your story {pendingCount !== 1 ? "are" : "is"} still
            AI-organized and {pendingCount !== 1 ? "were" : "was"} not individually confirmed. {SUMMARY.pendingReview}
          </span>
        </p>
      ) : null}
    </div>
  );
}
