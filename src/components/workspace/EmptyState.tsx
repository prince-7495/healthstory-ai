import { EMPTY_STATE } from "@/lib/health/options";
import { TimelineIcon } from "../icons";
import styles from "./workspace.module.css";

/**
 * EmptyState — what the preview column shows before anything is written.
 *
 * It is an invitation rather than an apology: an abstract timeline mark,
 * one sentence about what to do, and a single button that sends focus
 * straight to the text field.
 */
export default function EmptyState({ onWrite }: { onWrite: () => void }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <TimelineIcon size={28} />
      </span>
      <h3 className={styles.emptyTitle}>{EMPTY_STATE.heading}</h3>
      <p className={styles.emptyText}>{EMPTY_STATE.text}</p>
      <button type="button" className={`btn btn--ghost ${styles.emptyBtn}`} onClick={onWrite}>
        {EMPTY_STATE.cta}
      </button>
    </div>
  );
}