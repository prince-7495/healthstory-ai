import { MAIN_ACTION } from "@/lib/health/options";
import { ShieldIcon } from "../icons";
import styles from "./workspace.module.css";

/**
 * SafetyNotice — repeated in the workspace and again in the result so
 * the boundary of the product stays visible at every moment a user
 * might otherwise read output as a medical conclusion.
 *
 * Deliberately says what the product *does not* do, in plain words.
 */
export default function SafetyNotice() {
  return (
    <div className={styles.safety}>
      <span className={styles.safetyIcon}>
        <ShieldIcon size={20} />
      </span>
      <div>
        <p className={styles.safetyTitle}>Not a diagnostic tool</p>
        <p className={styles.safetyText}>{MAIN_ACTION.notice}</p>
      </div>
    </div>
  );
}