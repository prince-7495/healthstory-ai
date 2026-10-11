"use client";

import { ERRORS } from "@/lib/health/options";
import { AlertIcon } from "../icons";
import styles from "./workspace.module.css";

/**
 * ErrorState — shown when organizing fails.
 *
 * Two rules here: the user's writing is never lost and never discarded
 * silently, and no stack trace, status code, or internal detail is ever
 * surfaced. "Try again" is offered first because failures are usually
 * transient; "Edit story" is always there as the escape hatch.
 */
export default function ErrorState({
  onRetry,
  onEdit,
}: {
  onRetry: () => void;
  onEdit: () => void;
}) {
  return (
    <section className={styles.errorCard}>
      <span className={styles.errorIcon}>
        <AlertIcon size={26} />
      </span>
      <h1 className={styles.errorTitle}>{ERRORS.failedHeading}</h1>
      <p className={styles.errorText}>{ERRORS.failedBody}</p>

      <div className={styles.errorActions}>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          {ERRORS.tryAgain}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onEdit}>
          {ERRORS.editStory}
        </button>
      </div>
    </section>
  );
}